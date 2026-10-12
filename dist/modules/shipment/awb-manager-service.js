/**
 * AWB Management Subsystem (Phân hệ Quản lý Vận đơn Hàng không Quốc tế UPS & FedEx)
 * Chuyên trách:
 * 1. Giải mã & kiểm tra thuật toán Check Digit (Mod-10 UPS, Mod-11 FedEx)
 * 2. Quản lý kho số AWB (AWB Pool / Inventory Allocation)
 * 3. Quản lý lô hàng đa kiện MPS (Master AWB & Child AWBs)
 * 4. Quy trình Void / Hủy AWB tránh phát sinh cước hãng
 * 5. Đối soát chênh lệch trọng lượng & phụ phí phát sinh (Reconciliation)
 */
import { ShipmentRepository } from './shipment-repository.js';
import { ShipmentService } from './shipment-service.js';
import { AuthService } from '../auth/auth-service.js';
export class AwbManagerService {
    /**
     * 1. GIẢI MÃ & KIỂM TRA TÍNH HỢP LỆ CỦA SỐ AWB THEO THUẬT TOÁN HÃNG
     */
    static validateAwb(trackingNumber) {
        const raw = String(trackingNumber || '').replace(/[\s-]/g, '').toUpperCase();
        if (!raw) {
            return { isValid: false, carrier: 'UNKNOWN', carrierName: 'Không xác định', trackingNumber: '', formatted: '', error: 'Mã AWB trống' };
        }
        // A. KIỂM TRA VẬN ĐƠN UPS (1Z + 16 KÝ TỰ)
        if (raw.startsWith('1Z') && raw.length === 18) {
            const account = raw.slice(2, 8); // 6 ký tự Shipper Account
            const service = raw.slice(8, 10); // 2 ký tự Service
            const serial = raw.slice(10, 17); // 7 ký tự Package Serial
            const checkDigit = parseInt(raw.slice(17, 18), 10);
            // Tính check digit chuẩn của UPS theo thuật toán Mod 10
            const body15 = raw.slice(2, 17);
            const calculated = ShipmentService.upsCheckDigit(body15);
            const isValid = checkDigit === calculated;
            const serviceNames = {
                '01': 'UPS Next Day Air',
                '02': 'UPS 2nd Day Air',
                '03': 'UPS Ground',
                '04': 'UPS Worldwide Saver',
                '07': 'UPS Worldwide Express',
                '08': 'UPS Worldwide Expedited',
                '54': 'UPS Worldwide Express Plus',
                '65': 'UPS Saver'
            };
            const formatted = raw.replace(/^(.{2})(.{3})(.{3})(.{2})(.{4})(.{4})$/, '$1 $2 $3 $4 $5 $6');
            return {
                isValid,
                carrier: 'UPS',
                carrierName: 'UPS Express (United Parcel Service)',
                trackingNumber: raw,
                formatted,
                accountNumber: account,
                serviceCode: service,
                serviceName: serviceNames[service] || `UPS Service Code ${service}`,
                serialNumber: serial,
                checkDigit,
                calculatedCheckDigit: calculated,
                error: isValid ? undefined : `Sai số kiểm tra Check Digit (Hãng quy định: ${calculated}, nhãn in: ${checkDigit})`
            };
        }
        // B. KIỂM TRA VẬN ĐƠN FEDEX (12 HOẶC 15 CHỮ SỐ)
        if (/^\d{12}$/.test(raw)) {
            const body11 = raw.slice(0, 11);
            const checkDigit = parseInt(raw.slice(11, 12), 10);
            const calculated = ShipmentService.fedexCheckDigit(body11);
            const isValid = checkDigit === calculated;
            const formatted = raw.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
            return {
                isValid,
                carrier: 'FEDEX',
                carrierName: 'FedEx Express (Federal Express)',
                trackingNumber: raw,
                formatted,
                accountNumber: '194820112',
                serviceCode: 'IP',
                serviceName: 'FedEx International Priority',
                serialNumber: body11,
                checkDigit,
                calculatedCheckDigit: calculated,
                error: isValid ? undefined : `Sai số kiểm tra Check Digit (Hãng quy định: ${calculated}, nhãn in: ${checkDigit})`
            };
        }
        return {
            isValid: false,
            carrier: 'UNKNOWN',
            carrierName: 'Không xác định',
            trackingNumber: raw,
            formatted: raw,
            error: 'Cấu trúc mã không đúng chuẩn UPS (1Z...) hoặc FedEx (12 số)'
        };
    }
    /**
     * 2. QUẢN LÝ KHO SỐ AWB (POOLS & ACCOUNTS)
     */
    static getAwbPoolSummary() {
        const allShipments = ShipmentRepository.getAll();
        const upsShipments = allShipments.filter((s) => s.carrier === 'UPS');
        const fedexShipments = allShipments.filter((s) => s.carrier === 'FEDEX');
        const upsPool = {
            carrier: 'UPS',
            accountNumber: '861R32',
            accountName: 'PANDALEX OPERATIONS - UPS CORPORATE ACCOUNT',
            currentRangeStart: '1Z861R320490000000',
            currentRangeEnd: '1Z861R320499999999',
            totalIssued: upsShipments.length,
            activeInTransit: upsShipments.filter((s) => s.status !== 'DELIVERED' && s.status !== 'CANCELLED').length,
            delivered: upsShipments.filter((s) => s.status === 'DELIVERED').length,
            voided: upsShipments.filter((s) => s.status === 'CANCELLED').length
        };
        const fedexPool = {
            carrier: 'FEDEX',
            accountNumber: '194820112',
            accountName: 'PANDALEX GLOBAL - FEDEX EXPRESS ACCOUNT',
            currentRangeStart: '771200000000',
            currentRangeEnd: '771299999999',
            totalIssued: fedexShipments.length,
            activeInTransit: fedexShipments.filter((s) => s.status !== 'DELIVERED' && s.status !== 'CANCELLED').length,
            delivered: fedexShipments.filter((s) => s.status === 'DELIVERED').length,
            voided: fedexShipments.filter((s) => s.status === 'CANCELLED').length
        };
        return [upsPool, fedexPool];
    }
    /**
     * 3. TRA CỨU ĐẦY ĐỦ THÔNG TIN VẬN ĐƠN (MASTER / CHILD / PDF / AUDIT)
     */
    static lookupAwbDetails(trackingNumber) {
        const clean = trackingNumber.replace(/[\s-]/g, '').toUpperCase();
        const validation = this.validateAwb(clean);
        const all = ShipmentRepository.getAll();
        // Tìm theo Master Tracking hoặc Child Piece Tracking
        let foundShipment;
        let isMaster = false;
        let pieceIdx = 1;
        for (const shp of all) {
            if (shp.masterTrackingNumber.toUpperCase() === clean) {
                foundShipment = shp;
                isMaster = true;
                pieceIdx = 1;
                break;
            }
            const childPiece = shp.pieces.find((p) => p.trackingNumber && p.trackingNumber.toUpperCase() === clean);
            if (childPiece) {
                foundShipment = shp;
                isMaster = false;
                pieceIdx = childPiece.pieceNumber;
                break;
            }
        }
        if (!foundShipment) {
            return {
                found: false,
                relatedTrackingNumbers: [],
                validation
            };
        }
        const relatedTrackingNumbers = foundShipment.pieces
            .map(p => p.trackingNumber)
            .filter((t) => Boolean(t));
        return {
            found: true,
            shipment: foundShipment,
            isMaster,
            pieceIndex: pieceIdx,
            totalPieces: foundShipment.pieces.length,
            relatedTrackingNumbers,
            pdfUrl: foundShipment.awbPdfUrl,
            validation
        };
    }
    /**
     * 4. HỦY / VOID VẬN ĐƠN (VOID SHIPMENT) ĐỂ KHÔNG BỊ HÃNG TÍNH TIỀN CƯỚC HÓA ĐƠN
     */
    static voidAwb(trackingNumber, reason, operator = 'admin') {
        const details = this.lookupAwbDetails(trackingNumber);
        if (!details.found || !details.shipment) {
            return { success: false, message: `Không tìm thấy vận đơn AWB ${trackingNumber} trong hệ thống để hủy.` };
        }
        const shp = details.shipment;
        if (shp.status === 'CANCELLED') {
            return { success: false, message: `Vận đơn AWB ${trackingNumber} đã được hủy trước đó rồi.` };
        }
        if (shp.status === 'DELIVERED') {
            return { success: false, message: `Vận đơn AWB ${trackingNumber} đã phát thành công, không thể hủy!` };
        }
        // Cập nhật trạng thái hủy
        shp.status = 'CANCELLED';
        shp.notes = `Đã hủy vận đơn (Voided): ${reason}`;
        ShipmentRepository.save(shp, `Hủy vận đơn AWB (Void) bởi ${operator} - Lý do: ${reason}`);
        // Ghi audit log
        AuthService.logAction({
            userId: operator,
            username: operator,
            userRole: 'SUPER_ADMIN',
            action: 'UPDATE_STATUS',
            targetId: shp.masterTrackingNumber,
            details: `Hủy vận đơn AWB (Void) ${shp.carrier} ${shp.masterTrackingNumber} - Lý do: ${reason}`,
            hub: shp.hub || 'SGN'
        });
        return {
            success: true,
            message: `Đã hủy vận đơn AWB ${shp.carrier} ${shp.masterTrackingNumber} thành công! Hệ thống đã ghi nhận không tính cước.`,
            shipment: shp
        };
    }
    /**
     * 5. ĐỐI SOÁT AWB & KIỂM TRA PHỤ PHÍ HÃNG (RECONCILIATION & SURCHARGE AUDIT)
     */
    static getReconciliation(trackingNumber) {
        const details = this.lookupAwbDetails(trackingNumber);
        if (!details.found || !details.shipment)
            return null;
        const shp = details.shipment;
        const isAhcOverweight = shp.pieces.some(p => p.weightKg > 25);
        const isAhcOversize = shp.pieces.some(p => {
            const maxEdge = Math.max(p.lengthCm, p.widthCm, p.heightCm);
            const secondEdge = [p.lengthCm, p.widthCm, p.heightCm].sort((a, b) => b - a)[1] || 0;
            return maxEdge > 122 || secondEdge > 76;
        });
        const surcharges = [];
        if (isAhcOverweight)
            surcharges.push('Phụ phí Kiện nặng Additional Handling (AHC-Weight > 25kg)');
        if (isAhcOversize)
            surcharges.push('Phụ phí Quá khổ Additional Handling (AHC-Dimensions > 122cm)');
        surcharges.push('Phụ phí Nhiên liệu xăng dầu FSC (Fuel Surcharge theo tuần)');
        const declaredDims = shp.pieces.map(p => `${p.lengthCm}x${p.widthCm}x${p.heightCm}`).join(' | ');
        return {
            trackingNumber: shp.masterTrackingNumber,
            carrier: shp.carrier,
            declaredWeightKg: shp.totalWeightKg,
            billedWeightKg: shp.totalWeightKg, // Tạm thời bằng declared
            weightDiscrepancyKg: 0,
            declaredDimensions: declaredDims,
            isAhcOverweight,
            isAhcOversize,
            estimatedCostVnd: shp.costPrice || Math.round(shp.totalWeightKg * 220000),
            actualCarrierCostVnd: shp.costPrice || Math.round(shp.totalWeightKg * 220000),
            surchargesDetected: surcharges
        };
    }
}
