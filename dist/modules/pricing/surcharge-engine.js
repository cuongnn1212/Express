import { SurchargeConfigService } from './surcharge-config-service.js';
export class SurchargeEngine {
    /**
     * Đánh giá và quét tự động tất cả các phụ phí tiềm ẩn cho kiện hàng
     */
    static evaluate(input) {
        const config = SurchargeConfigService.get();
        const surcharges = [];
        const warnings = [];
        let minimumWeightEnforced = undefined;
        // Sắp xếp các cạnh từ lớn đến nhỏ để xác định: Cạnh dài nhất, Cạnh thứ 2, Cạnh thứ 3
        const dims = [input.lengthCm || 0, input.widthCm || 0, input.heightCm || 0].sort((a, b) => b - a);
        const longest = dims[0];
        const secondLongest = dims[1];
        const shortest = dims[2];
        const girth = 2 * (secondLongest + shortest);
        const lengthAndGirth = longest + girth;
        const destCountry = input.destinationCountry.toUpperCase().trim();
        if (input.carrier === 'UPS') {
            // 1. Kiểm tra Giới hạn tối đa (Over Maximum Limits)
            if (input.actualWeightKg > config.ups.overMaxWeightKg) {
                warnings.push(`⚠️ UPS: Trọng lượng thực tế (${input.actualWeightKg}kg) vượt quá giới hạn tối đa cho phép của UPS (${config.ups.overMaxWeightKg}kg/kiện). Có thể bị từ chối nhận hoặc phạt phí Over Max.`);
            }
            if (longest > config.ups.overMaxLengthCm) {
                warnings.push(`⚠️ UPS: Cạnh dài nhất (${longest}cm) vượt quá giới hạn tối đa của UPS (${config.ups.overMaxLengthCm}cm).`);
            }
            if (lengthAndGirth > 400) {
                warnings.push(`⚠️ UPS: Chiều dài + Chu vi (${lengthAndGirth.toFixed(1)}cm) vượt quá giới hạn tối đa 400cm.`);
            }
            // 2. Phụ phí kiện hàng lớn (Large Package Surcharge - LPS)
            if (lengthAndGirth > config.ups.lpsGirthThresholdCm) {
                surcharges.push({
                    code: 'LPS',
                    name: 'Phụ phí kiện lớn (Large Package Surcharge - LPS)',
                    amount: config.ups.lpsAmount,
                    isFuelSurchargeable: true,
                    triggerReason: `Chiều dài + Chu vi = ${longest} + 2x(${secondLongest}+${shortest}) = ${lengthAndGirth.toFixed(1)}cm (vượt ngưỡng ${config.ups.lpsGirthThresholdCm}cm). Áp cân tối thiểu ${config.ups.lpsMinWeightKg}kg.`
                });
                minimumWeightEnforced = config.ups.lpsMinWeightKg;
            }
            // 3. Phụ phí xử lý hàng quá khổ (Additional Handling Charge - AHC)
            const isAhcLongest = longest > config.ups.ahcLongestThresholdCm;
            const isAhcSecond = secondLongest > config.ups.ahcSecondThresholdCm;
            const isAhcWeight = input.actualWeightKg > config.ups.ahcWeightThresholdKg;
            if ((isAhcLongest || isAhcSecond || isAhcWeight) && lengthAndGirth <= config.ups.lpsGirthThresholdCm) {
                const reasons = [];
                if (isAhcLongest)
                    reasons.push(`Cạnh dài nhất ${longest}cm > ${config.ups.ahcLongestThresholdCm}cm`);
                if (isAhcSecond)
                    reasons.push(`Cạnh thứ hai ${secondLongest}cm > ${config.ups.ahcSecondThresholdCm}cm`);
                if (isAhcWeight)
                    reasons.push(`Trọng lượng thực ${input.actualWeightKg}kg > ${config.ups.ahcWeightThresholdKg}kg`);
                surcharges.push({
                    code: 'AHC',
                    name: 'Phụ phí xử lý bổ sung quá khổ (AHC)',
                    amount: config.ups.ahcAmount,
                    isFuelSurchargeable: true,
                    triggerReason: reasons.join('; ')
                });
            }
            // 4. Phụ phí IPF (International Processing Fee) đối với hàng vào Mỹ
            if (destCountry === 'US' || destCountry === 'USA' || destCountry === 'U.S.A.') {
                surcharges.push({
                    code: 'IPF',
                    name: 'Phí xử lý nhập khẩu vào Mỹ (IPF)',
                    amount: config.ups.ipfAmount,
                    isFuelSurchargeable: false,
                    triggerReason: 'Quy định UPS bắt buộc đối với tất cả vận đơn nhập khẩu vào Hoa Kỳ.'
                });
            }
            // 5. Phụ phí địa chỉ nhà riêng (Residential Surcharge)
            if (input.isResidential) {
                surcharges.push({
                    code: 'RESIDENTIAL',
                    name: 'Phụ phí giao địa chỉ nhà riêng (Residential Delivery)',
                    amount: config.ups.residentialAmount,
                    isFuelSurchargeable: true,
                    triggerReason: 'Địa chỉ nhận hàng là khu dân cư / nhà riêng cá nhân.'
                });
            }
            // 6. Phụ phí vùng sâu vùng xa (Remote Area / ODA)
            if (input.isRemoteArea) {
                const weightForOda = Math.max(input.actualWeightKg, 1);
                const odaAmount = Math.max(config.remoteArea.minAmount, Math.round(weightForOda * config.remoteArea.perKgRate));
                surcharges.push({
                    code: 'ODA',
                    name: 'Phụ phí vùng sâu vùng xa (Out of Delivery Area)',
                    amount: odaAmount,
                    isFuelSurchargeable: true,
                    triggerReason: 'Địa chỉ phát hàng thuộc danh mục vùng sâu vùng xa/hải đảo của UPS.'
                });
            }
        }
        else if (input.carrier === 'FEDEX') {
            // 1. Kiểm tra Giới hạn tối đa FedEx
            if (input.actualWeightKg > config.fedex.overMaxWeightKg) {
                warnings.push(`⚠️ FEDEX: Trọng lượng thực tế (${input.actualWeightKg}kg) vượt quá ${config.fedex.overMaxWeightKg}kg. Vận đơn cần chuyển sang dịch vụ Freight (IPF) hoặc liên hệ đặt tải trước.`);
            }
            if (longest > config.fedex.overMaxLengthCm) {
                warnings.push(`⚠️ FEDEX: Cạnh dài nhất (${longest}cm) vượt quá giới hạn tối đa ${config.fedex.overMaxLengthCm}cm.`);
            }
            if (lengthAndGirth > 420) {
                warnings.push(`⚠️ FEDEX: Chiều dài + Chu vi (${lengthAndGirth.toFixed(1)}cm) vượt quá giới hạn tối đa 420cm của FedEx.`);
            }
            // 2. Phụ phí kiện quá khổ (FedEx Oversize Surcharge)
            if (lengthAndGirth > config.fedex.oversizeGirthThresholdCm && lengthAndGirth <= 420) {
                surcharges.push({
                    code: 'OVERSIZE',
                    name: 'Phụ phí kiện quá khổ (FedEx Oversize Surcharge)',
                    amount: config.fedex.oversizeAmount,
                    isFuelSurchargeable: true,
                    triggerReason: `Chiều dài + Chu vi = ${longest} + 2x(${secondLongest}+${shortest}) = ${lengthAndGirth.toFixed(1)}cm. Áp mức cân tối thiểu ${config.fedex.oversizeMinWeightKg}kg.`
                });
                minimumWeightEnforced = config.fedex.oversizeMinWeightKg;
            }
            // 3. Phụ phí xử lý bổ sung (Additional Handling Surcharge - AHS)
            const isAhsDim = longest > config.fedex.ahsLongestThresholdCm || secondLongest > config.fedex.ahsSecondThresholdCm;
            const isAhsWeight = input.actualWeightKg > config.fedex.ahsWeightThresholdKg;
            if ((isAhsDim || isAhsWeight) && lengthAndGirth <= config.fedex.oversizeGirthThresholdCm) {
                const reasons = [];
                if (longest > config.fedex.ahsLongestThresholdCm)
                    reasons.push(`Cạnh dài nhất ${longest}cm > ${config.fedex.ahsLongestThresholdCm}cm`);
                if (secondLongest > config.fedex.ahsSecondThresholdCm)
                    reasons.push(`Cạnh thứ hai ${secondLongest}cm > ${config.fedex.ahsSecondThresholdCm}cm`);
                if (isAhsWeight)
                    reasons.push(`Trọng lượng thực ${input.actualWeightKg}kg > ${config.fedex.ahsWeightThresholdKg}kg`);
                surcharges.push({
                    code: 'AHS',
                    name: 'Phụ phí xử lý bổ sung FedEx (AHS)',
                    amount: config.fedex.ahsAmount,
                    isFuelSurchargeable: true,
                    triggerReason: reasons.join('; ')
                });
            }
            // 4. Phụ phí giao nhà riêng (Residential)
            if (input.isResidential) {
                surcharges.push({
                    code: 'RESIDENTIAL',
                    name: 'Phụ phí phát hàng tận nhà (Residential Delivery Surcharge)',
                    amount: config.fedex.residentialAmount,
                    isFuelSurchargeable: true,
                    triggerReason: 'Địa chỉ người nhận là địa chỉ tư gia / nhà riêng.'
                });
            }
            // 5. Phụ phí vùng sâu vùng xa (Out of Delivery Area)
            if (input.isRemoteArea) {
                const weightForOda = Math.max(input.actualWeightKg, 1);
                const odaAmount = Math.max(config.remoteArea.minAmount, Math.round(weightForOda * config.remoteArea.perKgRate));
                surcharges.push({
                    code: 'ODA',
                    name: 'Phụ phí vùng ngoài phục vụ (Out of Delivery Area)',
                    amount: odaAmount,
                    isFuelSurchargeable: true,
                    triggerReason: 'Mã bưu chính thuộc danh sách vùng xa của FedEx.'
                });
            }
        }
        return {
            surcharges,
            minimumWeightEnforced,
            warnings
        };
    }
}
