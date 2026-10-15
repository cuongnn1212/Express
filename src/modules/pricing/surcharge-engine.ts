import { CarrierCode, SurchargeItem } from '../../types/pricing.types.js';
import { SurchargeConfigService } from './surcharge-config-service.js';

export interface SurchargeEvaluationInput {
  carrier: CarrierCode;
  destinationCountry: string;
  actualWeightKg: number;
  chargeableWeightKg?: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  isResidential?: boolean;
  isRemoteArea?: boolean;
  isDirectDeliveryOnly?: boolean;
  declaredValueVnd?: number;
  upsReturnType?: 'NONE' | 'PRINT_LABEL' | 'PLUS_1' | 'PLUS_3';
  includeUpsSurgeFee?: boolean;
  surgeDiscountPercent?: number; // % giảm phí biến động (mặc định 50%)
  orderProcessingFee?: number; // Phí xử lý đơn hàng/1 đơn hàng
  deliveryFee?: number; // Phí phát hàng (chịu phụ phí nhiên liệu)
}

export interface SurchargeEvaluationResult {
  surcharges: SurchargeItem[];
  minimumWeightEnforced?: number; // e.g. 40kg if LPS
  warnings: string[];
}

export class SurchargeEngine {
  /**
   * Đánh giá và quét tự động tất cả các phụ phí cho kiện hàng (bao gồm UPS Surge Emergency Fee, Phụ phí Nhu cầu & Phụ phí Ngoài hợp đồng)
   */
  static evaluate(input: SurchargeEvaluationInput): SurchargeEvaluationResult {
    const config = SurchargeConfigService.get();
    const surcharges: SurchargeItem[] = [];
    const warnings: string[] = [];
    let minimumWeightEnforced: number | undefined = undefined;

    // Sắp xếp các cạnh từ lớn đến nhỏ để xác định: Cạnh dài nhất, Cạnh thứ 2, Cạnh thứ 3
    const dims = [input.lengthCm || 0, input.widthCm || 0, input.heightCm || 0].sort((a, b) => b - a);
    const longest = dims[0];
    const secondLongest = dims[1];
    const shortest = dims[2];

    const girth = 2 * (secondLongest + shortest);
    const lengthAndGirth = longest + girth;
    const destCountry = input.destinationCountry.toUpperCase().trim();

    if (input.carrier === 'UPS') {
      // 1. Kiểm tra Giới hạn tối đa (Over Maximum Limits) + Phụ phí Nhu cầu Vượt quá giới hạn tối đa (Bảng C: 4,700,000 VND/gói)
      const isOverWeight = input.actualWeightKg > config.ups.overMaxWeightKg;
      const isOverLength = longest > config.ups.overMaxLengthCm;
      const isOverGirth = lengthAndGirth > 400;

      if (isOverWeight) {
        warnings.push(`⚠️ UPS: Trọng lượng thực tế (${input.actualWeightKg}kg) vượt quá giới hạn tối đa cho phép của UPS (${config.ups.overMaxWeightKg}kg/kiện).`);
      }
      if (isOverLength) {
        warnings.push(`⚠️ UPS: Cạnh dài nhất (${longest}cm) vượt quá giới hạn tối đa của UPS (${config.ups.overMaxLengthCm}cm).`);
      }
      if (isOverGirth) {
        warnings.push(`⚠️ UPS: Chiều dài + Chu vi (${lengthAndGirth.toFixed(1)}cm) vượt quá giới hạn tối đa 400cm.`);
      }
      if (isOverWeight || isOverLength || isOverGirth) {
        surcharges.push({
          code: 'DEMAND_OML',
          name: 'Phụ phí Nhu cầu - Vượt quá giới hạn tối đa (Over Maximum Limits)',
          amount: config.ups.overMaxDemandAmount || 4700000,
          isFuelSurchargeable: true,
          triggerReason: 'Vượt giới hạn tối đa UPS (>70kg hoặc dài >274cm hoặc Dài+Chu vi >400cm) - Bảng C UPS (4,700,000 VND/gói).'
        });
      }

      // 2. Phụ phí kiện hàng lớn (Large Package Surcharge - LPS) + Phụ phí Nhu cầu Gói hàng lớn (Bảng C: 148,050 VND/gói)
      if (lengthAndGirth > config.ups.lpsGirthThresholdCm) {
        surcharges.push({
          code: 'LPS',
          name: 'Phụ phí kiện lớn (Large Package Surcharge - LPS)',
          amount: config.ups.lpsAmount,
          isFuelSurchargeable: true,
          triggerReason: `Chiều dài + Chu vi = ${longest} + 2x(${secondLongest}+${shortest}) = ${lengthAndGirth.toFixed(1)}cm (vượt ngưỡng ${config.ups.lpsGirthThresholdCm}cm). Áp cân tối thiểu ${config.ups.lpsMinWeightKg}kg.`
        });
        if (config.ups.lpsDemandAmount > 0) {
          surcharges.push({
            code: 'DEMAND_LPS',
            name: 'Phụ phí Nhu cầu - Gói hàng lớn (Demand LPS)',
            amount: config.ups.lpsDemandAmount,
            isFuelSurchargeable: true,
            triggerReason: 'Phụ phí Nhu cầu UPS áp dụng cho Gói hàng lớn (Bảng C: 148,050 VND/gói).'
          });
        }
        minimumWeightEnforced = config.ups.lpsMinWeightKg;
      }

      // 3. Phụ phí xử lý hàng quá khổ (Additional Handling Charge - AHC) + Phụ phí Nhu cầu Xử lý (Bảng C: 42,300 VND/gói)
      const isAhcLongest = longest > config.ups.ahcLongestThresholdCm;
      const isAhcSecond = secondLongest > config.ups.ahcSecondThresholdCm;
      const isAhcWeight = input.actualWeightKg > config.ups.ahcWeightThresholdKg;

      if ((isAhcLongest || isAhcSecond || isAhcWeight) && lengthAndGirth <= config.ups.lpsGirthThresholdCm) {
        const reasons: string[] = [];
        if (isAhcLongest) reasons.push(`Cạnh dài nhất ${longest}cm > ${config.ups.ahcLongestThresholdCm}cm`);
        if (isAhcSecond) reasons.push(`Cạnh thứ hai ${secondLongest}cm > ${config.ups.ahcSecondThresholdCm}cm`);
        if (isAhcWeight) reasons.push(`Trọng lượng thực ${input.actualWeightKg}kg > ${config.ups.ahcWeightThresholdKg}kg`);

        surcharges.push({
          code: 'AHC',
          name: 'Phụ phí xử lý bổ sung quá khổ (AHC)',
          amount: config.ups.ahcAmount,
          isFuelSurchargeable: true,
          triggerReason: reasons.join('; ')
        });
        if (config.ups.ahcDemandAmount > 0) {
          surcharges.push({
            code: 'DEMAND_AHC',
            name: 'Phụ phí Nhu cầu - Phụ phí Xử lý (Demand AHC)',
            amount: config.ups.ahcDemandAmount,
            isFuelSurchargeable: true,
            triggerReason: 'Phụ phí Nhu cầu UPS áp dụng cho kiện hàng chịu Phụ phí Xử lý (Bảng C: 42,300 VND/gói).'
          });
        }
      }

      // 4. Phí Biến Động Khẩn Cấp UPS (Surge Emergency Fee - Bảng B, tính theo Kg tính phí & chịu Phụ phí nhiên liệu)
      // Theo chính sách: Phí biến động đang được giảm 50%
      if (input.includeUpsSurgeFee !== false) {
        const discPercent = input.surgeDiscountPercent !== undefined ? input.surgeDiscountPercent : 50;
        const surgeInfo = SurchargeConfigService.getUpsSurgeRatePerKg(destCountry, discPercent);
        if (surgeInfo.effectiveRatePerKg > 0) {
          let wt = input.chargeableWeightKg || input.actualWeightKg || 0.5;
          if (minimumWeightEnforced && wt < minimumWeightEnforced) {
            wt = minimumWeightEnforced;
          }
          // Làm tròn cân nặng tính phí chuẩn UPS (<=20kg nấc 0.5kg, >20kg nấc 1.0kg)
          const chgWt = wt <= 20 ? Math.ceil(wt * 2) / 2 : Math.ceil(wt);
          const surgeAmount = Math.round(chgWt * surgeInfo.effectiveRatePerKg);
          surcharges.push({
            code: 'SURGE_EMERGENCY',
            name: `Phí Biến Động Khẩn Cấp UPS (Giảm ${surgeInfo.discountPercent}%: ${surgeInfo.effectiveRatePerKg.toLocaleString('vi-VN')} đ/kg - ${surgeInfo.regionName})`,
            amount: surgeAmount,
            isFuelSurchargeable: true,
            triggerReason: `Bảng B UPS Surge Emergency Fee xuất khẩu từ VN đi ${surgeInfo.regionName}: ${chgWt}kg × ${surgeInfo.effectiveRatePerKg.toLocaleString('vi-VN')} đ/kg (Gốc: ${surgeInfo.rawRatePerKg.toLocaleString('vi-VN')} đ/kg, giảm ${surgeInfo.discountPercent}%). Chịu phụ phí nhiên liệu FSC.`
          });
        }
      }

      // 5. Phí Phát Hàng / Phí Xử Lý Đơn Hàng (IPF: 58,750 VND/đơn hàng đến Hoa Kỳ)
      // Theo yêu cầu: Toàn bộ giá net / phí biến động / phí phát hàng đều chịu phụ phí nhiên liệu
      const effectiveDeliveryFee = input.deliveryFee !== undefined 
        ? input.deliveryFee 
        : input.orderProcessingFee;
      const isUsDest = destCountry === 'US' || destCountry === 'USA' || destCountry === 'U.S.A.';

      if (effectiveDeliveryFee !== undefined) {
        surcharges.push({
          code: 'DELIVERY_FEE',
          name: `Phí Phát Hàng (${effectiveDeliveryFee.toLocaleString('vi-VN')} đ/đơn)`,
          amount: effectiveDeliveryFee,
          isFuelSurchargeable: true,
          triggerReason: `Phí phát hàng / xử lý giao hàng ${effectiveDeliveryFee.toLocaleString('vi-VN')} VND/đơn (Chịu phụ phí nhiên liệu FSC).`
        });
      } else if (isUsDest) {
        const ipfAmt = config.ups.ipfAmount || 58750;
        surcharges.push({
          code: 'IPF',
          name: `Phí Phát Hàng / Xử Lý Đơn đi Hoa Kỳ (IPF - ${ipfAmt.toLocaleString('vi-VN')} đ/đơn)`,
          amount: ipfAmt,
          isFuelSurchargeable: true,
          triggerReason: `Phí phát hàng đến Hoa Kỳ ${ipfAmt.toLocaleString('vi-VN')} VND/đơn (Chịu phụ phí nhiên liệu FSC).`
        });
      }

      // 6. Dịch vụ Chỉ Phát Hàng Trực Tiếp (Direct Delivery Only: 47,000 VND/gói)
      if (input.isDirectDeliveryOnly) {
        surcharges.push({
          code: 'DIRECT_DELIVERY',
          name: 'Phí Chỉ Phát Hàng Trực Tiếp (Direct Delivery Only)',
          amount: config.ups.directDeliveryAmount || 47000,
          isFuelSurchargeable: true, // Chịu phụ phí nhiên liệu theo chính sách UPS
          triggerReason: 'Đảm bảo gói hàng chỉ được giao đến địa chỉ trên nhãn (47,000 VND/gói). Chịu phụ phí nhiên liệu FSC.'
        });
      }

      // 7. Phí Dịch vụ Bảo hiểm cho Giá trị khai báo (> 2,350,000 VND: 47,000 VND cho mỗi 2,350,000 VND)
      if (input.declaredValueVnd && input.declaredValueVnd > (config.ups.declaredValueUnitVnd || 2350000)) {
        const unit = config.ups.declaredValueUnitVnd || 2350000;
        const rate = config.ups.declaredValueFeePerUnitVnd || 47000;
        const unitsCount = Math.ceil(input.declaredValueVnd / unit);
        const insFee = unitsCount * rate;
        surcharges.push({
          code: 'DECLARED_VALUE_INS',
          name: 'Phí Dịch vụ Bảo hiểm Giá trị khai báo UPS',
          amount: insFee,
          isFuelSurchargeable: false,
          triggerReason: `Giá trị khai báo ${input.declaredValueVnd.toLocaleString('vi-VN')} VND > 2,350,000 VND (47,000 VND cho mỗi 2,350,000 VND).`
        });
      }

      // 8. Dịch vụ UPS Returns (Nhãn trả hàng tự in 23,500đ / Returns Plus lần 1: 103,400đ / lần 3: 150,400đ)
      if (input.upsReturnType && input.upsReturnType !== 'NONE') {
        const retMap = {
          PRINT_LABEL: { amount: config.ups.returnPrintLabelAmount || 23500, label: 'UPS Returns - Nhãn trả hàng tự in (23,500 đ)' },
          PLUS_1: { amount: config.ups.returnPlusAttempt1Amount || 103400, label: 'UPS Returns Plus - Nỗ lực nhận hàng lần 1 (103,400 đ)' },
          PLUS_3: { amount: config.ups.returnPlusAttempt3Amount || 150400, label: 'UPS Returns Plus - Nỗ lực nhận hàng lần 3 (150,400 đ)' }
        };
        const chosen = retMap[input.upsReturnType];
        if (chosen) {
          surcharges.push({
            code: `UPS_RETURN_${input.upsReturnType}`,
            name: chosen.label,
            amount: chosen.amount,
            isFuelSurchargeable: false,
            triggerReason: 'Dịch vụ có phụ phí Ngoài hợp đồng UPS Returns.'
          });
        }
      }

      // 9. Phụ phí địa chỉ nhà riêng (Residential Surcharge)
      if (input.isResidential) {
        surcharges.push({
          code: 'RESIDENTIAL',
          name: 'Phụ phí giao địa chỉ nhà riêng (Residential Delivery)',
          amount: config.ups.residentialAmount,
          isFuelSurchargeable: true,
          triggerReason: 'Địa chỉ nhận hàng là khu dân cư / nhà riêng cá nhân.'
        });
      }

      // 10. Phụ phí vùng sâu vùng xa (Remote Area / ODA)
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
    } else if (input.carrier === 'FEDEX') {
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
        const reasons: string[] = [];
        if (longest > config.fedex.ahsLongestThresholdCm) reasons.push(`Cạnh dài nhất ${longest}cm > ${config.fedex.ahsLongestThresholdCm}cm`);
        if (secondLongest > config.fedex.ahsSecondThresholdCm) reasons.push(`Cạnh thứ hai ${secondLongest}cm > ${config.fedex.ahsSecondThresholdCm}cm`);
        if (isAhsWeight) reasons.push(`Trọng lượng thực ${input.actualWeightKg}kg > ${config.fedex.ahsWeightThresholdKg}kg`);

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
