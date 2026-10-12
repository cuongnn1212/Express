import fs from 'fs';
import path from 'path';
import { ShipmentRepository, StoredShipment } from '../shipment/shipment-repository.js';
import { AuthService } from '../auth/auth-service.js';

export interface WarehouseBag {
  bagId: string; // VD: BAG_SGN_US_001
  hub: 'SGN' | 'HAN' | 'DAD';
  destinationCountry: string; // US, AU, CA, EU...
  carrier: 'UPS' | 'FEDEX' | 'DHL';
  status: 'OPEN' | 'SEALED' | 'DISPATCHED_AIRPORT';
  sealNumber?: string; // Số seal chì niêm phong
  createdAt: string;
  sealedAt?: string;
  totalPieces: number;
  totalWeightKg: number;
  shipmentIds: string[]; // Danh sách mã đơn trong bao
}

export interface InboundScanResult {
  success: boolean;
  message: string;
  shipment?: StoredShipment;
}

export interface ReweighResult {
  success: boolean;
  message: string;
  shipment?: StoredShipment;
  weightDifferenceKg: number;
  extraFeeEstimated: number; // Tiền cước phát sinh nếu có
}

export class WarehouseService {
  private static bagsFile = path.join(process.cwd(), 'data', 'warehouse_bags.json');
  private static bags: WarehouseBag[] = [];

  static init() {
    try {
      const dir = path.dirname(this.bagsFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(this.bagsFile)) {
        this.bags = JSON.parse(fs.readFileSync(this.bagsFile, 'utf-8'));
      } else {
        this.bags = [];
        this.persistBags();
      }
    } catch (e) {
      console.error('Lỗi khởi tạo WarehouseService:', e);
    }
  }

  private static persistBags() {
    fs.writeFileSync(this.bagsFile, JSON.stringify(this.bags, null, 2), 'utf-8');
  }

  /**
   * 0. Xác nhận nhân viên đã nhận hàng từ người gửi (Pickup Confirm)
   */
  static pickupConfirm(trackingOrId: string, operatorUsername: string, hub: 'SGN' | 'HAN' | 'DAD'): { success: boolean; message: string; shipment?: StoredShipment } {
    const clean = String(trackingOrId || '').trim().toUpperCase();
    const shipment = ShipmentRepository.getById(clean);
    if (!shipment) {
      return { success: false, message: `Không tìm thấy vận đơn '${clean}' trong hệ thống!` };
    }

    ShipmentRepository.updateOperationalStatus(shipment.shipmentId, 'PICKED_UP', {
      operator: operatorUsername,
      hub,
      note: `Nhân viên ${operatorUsername} đã nhận hàng từ khách tại Hub ${hub}`
    });

    AuthService.logAction({
      userId: operatorUsername,
      username: operatorUsername,
      userRole: 'WAREHOUSE',
      action: 'PICKUP_CONFIRM',
      targetId: clean,
      details: `Đã xác nhận nhận hàng từ khách cho vận đơn ${clean} tại Hub ${hub}`,
      hub
    });

    const updated = ShipmentRepository.getById(shipment.shipmentId);
    return {
      success: true,
      message: `✅ Đã xác nhận nhận hàng thành công cho vận đơn ${clean}!`,
      shipment: updated
    };
  }

  /**
   * 1. Quét mã vạch nhập kho (Scan Inbound) - Hỗ trợ cả Master AWB & Child AWB
   * Kiểm tra hàng hóa chuyển về nhập kho & đánh giá cổng tài chính để chuyển vào "Kho Chờ Xuất"
   */
  static scanInbound(trackingOrId: string, hub: 'SGN' | 'HAN' | 'DAD', operatorUsername: string): InboundScanResult {
    const clean = String(trackingOrId || '').trim().toUpperCase();
    const shipment = ShipmentRepository.getById(clean);
    if (!shipment) {
      return { success: false, message: `Không tìm thấy đơn hàng hoặc tracking '${clean}' trong hệ thống!` };
    }

    // Xác định xem đang quét kiện nào (Master hay Child piece)
    const matchingPiece = shipment.pieces.find(p => p.trackingNumber && p.trackingNumber.toUpperCase() === clean);
    const pieceNumber = matchingPiece ? matchingPiece.pieceNumber : 1;

    // Cập nhật trạng thái từng kiện
    if (matchingPiece) {
      (matchingPiece as any).inboundStatus = 'INBOUNDED';
      (matchingPiece as any).inboundAt = new Date().toISOString();
      (matchingPiece as any).inboundHub = hub;
    }

    // Đếm số kiện đã quét nhập kho
    const inboundCount = shipment.pieces.filter((p: any) => p.inboundStatus === 'INBOUNDED').length;
    const isAllInbounded = inboundCount >= shipment.pieces.length;

    // Cập nhật trạng thái nhập kho
    ShipmentRepository.updateOperationalStatus(shipment.shipmentId, 'INBOUND_RECEIVED', {
      operator: operatorUsername,
      hub,
      note: `Nhập kho tại Hub ${hub}`
    });

    // Kiểm tra ngay 3 điều kiện tài chính: Đã thanh toán, Đã trừ tiền, Có cam kết
    const gateRes = ShipmentRepository.verifyFinancialGate(shipment.shipmentId);
    let nextStatusText = '';

    if (gateRes.eligible && isAllInbounded) {
      ShipmentRepository.updateOperationalStatus(shipment.shipmentId, 'WAITING_FINANCE_DISPATCH', {
        operator: operatorUsername,
        hub,
        note: 'Đã hoàn tất đủ 3 điều kiện tài chính -> Chuyển vào Kho Chờ Xuất'
      });
      nextStatusText = ' ⭐ Đã đủ 3 điều kiện tài chính -> Đã chuyển vào KHO CHỜ XUẤT!';
    } else {
      nextStatusText = ` ⚠️ Đơn còn thiếu điều kiện tài chính: [${gateRes.missingConditions.join(', ')}]`;
    }

    const pieceInfoText = shipment.pieces.length > 1
      ? `Kiện ${pieceNumber}/${shipment.pieces.length} (AWB: ${clean}) [Tiến độ lô: ${inboundCount}/${shipment.pieces.length} kiện nhập kho]`
      : `AWB ${clean}`;

    AuthService.logAction({
      userId: operatorUsername,
      username: operatorUsername,
      userRole: 'WAREHOUSE',
      action: 'SCAN_INBOUND',
      targetId: clean,
      details: `Đã quét nhập kho ${pieceInfoText} tại Hub ${hub}. Hãng: ${shipment.carrier}, KL kiện: ${matchingPiece ? matchingPiece.weightKg : shipment.totalWeightKg}kg.${nextStatusText}`,
      hub
    });

    const updatedShipment = ShipmentRepository.getById(shipment.shipmentId);

    return {
      success: true,
      message: `✅ Đã quét nhập kho thành công ${pieceInfoText} tại Hub ${hub}! ${isAllInbounded ? '(Trọn bộ lô hàng đã vào kho đủ)' : ''}${nextStatusText}`,
      shipment: updatedShipment
    };
  }

  /**
   * 1b. Nhập kho bằng hình ảnh chụp AWB Label (UPS / FedEx OCR)
   * Tự động kiểm tra trọng lượng, kích thước, phân loại kênh thanh toán và cập nhật "Đã nhập vào kho"
   */
  static inboundFromOcr(
    ocrData: {
      trackingNumber: string;
      carrier?: 'UPS' | 'FEDEX';
      actualWeightKg?: number;
      dims?: { length: number; width: number; height: number };
      serviceName?: string;
      itemDescription?: string;
      sender?: any;
      recipient?: any;
      financialCategory?: 'IMMEDIATE' | 'POSTPAID' | 'WALLET';
    },
    hub: 'SGN' | 'HAN' | 'DAD',
    operatorUsername: string
  ): InboundScanResult {
    const clean = String(ocrData.trackingNumber || '').trim().toUpperCase();
    if (!clean) {
      return { success: false, message: 'Thiếu mã AWB nhận diện từ ảnh nhãn!' };
    }

    let shipment = ShipmentRepository.getById(clean);

    if (!shipment) {
      // Đơn hàng chưa có trên hệ thống -> Tạo mới đơn hàng nhập từ Hãng (UPS / FedEx)
      const weight = ocrData.actualWeightKg || 1.0;
      const dims = ocrData.dims || { length: 25, width: 20, height: 10 };
      const volWeight = Math.round(((dims.length * dims.width * dims.height) / 5000) * 10) / 10;
      const chgWeight = Math.max(weight, volWeight);
      const estPrice = Math.round(chgWeight * 250000);

      const newShipmentData: any = {
        shipmentId: `OCR-${Date.now().toString().slice(-6)}`,
        masterTrackingNumber: clean,
        carrier: ocrData.carrier || (clean.startsWith('1Z') ? 'UPS' : 'FEDEX'),
        serviceCode: ocrData.carrier === 'FEDEX' ? 'FEDEX_PRIORITY' : 'UPS_SAVER',
        serviceName: ocrData.serviceName || (ocrData.carrier === 'FEDEX' ? 'FedEx International Priority' : 'UPS Worldwide Saver'),
        status: 'INBOUND_RECEIVED',
        financialCategory: ocrData.financialCategory || 'IMMEDIATE',
        currentWarehouseHub: hub,
        inboundHub: hub,
        inboundedAt: new Date().toISOString(),
        inboundedBy: operatorUsername,
        totalPieces: 1,
        totalWeightKg: weight,
        volumetricWeightKg: volWeight,
        chargeableWeightKg: chgWeight,
        totalCustomsValue: 50,
        currency: 'USD',
        paymentStatus: 'UNPAID',
        sellPrice: estPrice,
        costPrice: Math.round(estPrice * 0.75),
        pieces: [
          {
            pieceNumber: 1,
            trackingNumber: clean,
            weightKg: weight,
            lengthCm: dims.length,
            widthCm: dims.width,
            heightCm: dims.height,
            dimsText: `${dims.length},${dims.width},${dims.height}`,
            inboundStatus: 'INBOUNDED',
            inboundAt: new Date().toISOString(),
            inboundHub: hub
          }
        ],
        shipFrom: ocrData.sender || {
          companyName: 'Shipper via Label OCR',
          contactName: 'Người gửi từ nhãn AWB',
          phone: '0900000000',
          address1: 'Việt Nam',
          city: hub === 'HAN' ? 'Hà Nội' : hub === 'DAD' ? 'Đà Nẵng' : 'Hồ Chí Minh',
          countryCode: 'VN'
        },
        shipTo: ocrData.recipient || {
          companyName: 'Consignee',
          contactName: 'Người nhận quốc tế',
          phone: '+1 555 0199',
          address1: 'Destination Address',
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90001',
          countryCode: 'US'
        },
        customsItems: [
          {
            description: ocrData.itemDescription || 'Hàng mẫu thương mại (Nhận từ nhãn OCR)',
            quantity: 1,
            unitValue: 50,
            totalValue: 50,
            currency: 'USD'
          }
        ],
        notes: `Đơn hàng tự động nạp từ chụp nhãn AWB OCR (${ocrData.carrier || 'CARRIER'}) tại Hub ${hub}`
      };

      shipment = ShipmentRepository.save(newShipmentData);
    } else {
      // Cập nhật thông tin cân đo nếu quét được từ nhãn
      if (ocrData.actualWeightKg && ocrData.actualWeightKg > 0) {
        shipment.totalWeightKg = ocrData.actualWeightKg;
        if (shipment.pieces && shipment.pieces.length > 0) {
          shipment.pieces[0].weightKg = ocrData.actualWeightKg;
        }
      }
      // Bảo toàn phân loại tài chính hiện tại do Tài chính / Khách hàng thiết lập (Kho không can thiệp sửa kênh thanh toán)
      if (!shipment.financialCategory && ocrData.financialCategory) {
        shipment.financialCategory = ocrData.financialCategory;
      }
      shipment.inboundHub = hub;
      shipment.currentWarehouseHub = hub;
      shipment.status = 'INBOUND_RECEIVED';
      shipment.inboundedAt = new Date().toISOString();
      shipment.inboundedBy = operatorUsername;
      ShipmentRepository.save(shipment, `Đã kiểm tra AWB OCR và nhập kho tại ${hub}`);
    }

    // Đánh giá cổng tài chính
    const gateRes = ShipmentRepository.verifyFinancialGate(shipment.shipmentId);
    let nextStatusText = '';
    if (gateRes.eligible) {
      ShipmentRepository.updateOperationalStatus(shipment.shipmentId, 'WAITING_FINANCE_DISPATCH', {
        operator: operatorUsername,
        hub,
        note: 'Đã hoàn tất đủ 3 điều kiện tài chính -> Chuyển vào Kho Chờ Xuất'
      });
      nextStatusText = ' ⭐ Đã đủ 3 điều kiện tài chính -> Chuyển vào KHO CHỜ XUẤT!';
    } else {
      nextStatusText = ` ⚠️ Đơn còn thiếu điều kiện: [${gateRes.missingConditions.join(', ')}]`;
    }

    AuthService.logAction({
      userId: operatorUsername,
      username: operatorUsername,
      userRole: 'WAREHOUSE',
      action: 'INBOUND_OCR',
      targetId: clean,
      details: `Đã chụp/OCR nhập kho AWB ${clean} tại Hub ${hub}. TL: ${shipment.totalWeightKg}kg. Kênh: ${shipment.financialCategory}.${nextStatusText}`,
      hub
    });

    const updated = ShipmentRepository.getById(shipment.shipmentId);
    return {
      success: true,
      message: `📸 Đã chụp/nhận diện nhãn AWB ${clean} thành công và nhập vào Kho Hub ${hub}! (TL: ${shipment.totalWeightKg}kg, Phân loại: ${shipment.financialCategory === 'WALLET' ? 'Trừ ví điện tử' : shipment.financialCategory === 'POSTPAID' ? 'Thanh toán sau' : 'Thanh toán ngay'})${nextStatusText}`,
      shipment: updated
    };
  }

  /**
   * 2. Cân đo lại thực tế (Reweigh & Measure) - Hỗ trợ cập nhật chính xác từng kiện AWB
   */
  static reweighShipment(
    trackingOrId: string,
    actualWeightKg: number,
    dims: { length: number; width: number; height: number },
    operatorUsername: string,
    hub: 'SGN' | 'HAN' | 'DAD'
  ): ReweighResult {
    const clean = String(trackingOrId || '').trim().toUpperCase();
    const shipment = ShipmentRepository.getById(clean);
    if (!shipment) {
      return { success: false, message: 'Không tìm thấy kiện hàng cần cân đo lại', weightDifferenceKg: 0, extraFeeEstimated: 0 };
    }

    const oldTotalWeight = shipment.totalWeightKg;

    // Tìm kiện tương ứng với AWB được quét cân đo
    let targetPiece = shipment.pieces.find(p => p.trackingNumber && p.trackingNumber.toUpperCase() === clean);
    if (!targetPiece && shipment.pieces.length > 0) {
      targetPiece = shipment.pieces[0]; // Mặc định kiện đầu nếu quét mã mẹ
    }

    if (targetPiece) {
      targetPiece.weightKg = actualWeightKg;
      targetPiece.lengthCm = dims.length;
      targetPiece.widthCm = dims.width;
      targetPiece.heightCm = dims.height;
      targetPiece.dimsText = `${dims.length},${dims.width},${dims.height}`;
      (targetPiece as any).reweighedAt = new Date().toISOString();
    }

    // Tính lại tổng trọng lượng thực tế và trọng lượng thể tích toàn lô hàng
    let sumActual = 0;
    let sumVol = 0;
    shipment.pieces.forEach(p => {
      sumActual += Number(p.weightKg) || 0;
      const v = (Number(p.lengthCm || 0) * Number(p.widthCm || 0) * Number(p.heightCm || 0)) / 5000;
      sumVol += v;
    });

    const newChargeableWeight = Math.round(Math.max(sumActual, sumVol) * 10) / 10;
    const weightDiff = Math.round((newChargeableWeight - oldTotalWeight) * 100) / 100;
    const extraFee = weightDiff > 0 ? Math.round(weightDiff * 220000) : 0;

    shipment.totalWeightKg = sumActual;
    shipment.volumetricWeightKg = Math.round(sumVol * 10) / 10;
    shipment.chargeableWeightKg = newChargeableWeight;
    if (extraFee > 0) {
      shipment.sellPrice = (shipment.sellPrice || 0) + extraFee;
    }

    ShipmentRepository.save(shipment, `Đã cân đo lại kiện ${targetPiece?.pieceNumber || 1} (AWB: ${clean}): Trọng lượng mới ${actualWeightKg}kg -> Toàn lô tính cước ${newChargeableWeight}kg (+${extraFee.toLocaleString('vi-VN')}đ)`);

    AuthService.logAction({
      userId: operatorUsername,
      username: operatorUsername,
      userRole: 'WAREHOUSE',
      action: 'UPDATE_WEIGHT',
      targetId: clean,
      details: `Cân đo lại kiện ${targetPiece?.pieceNumber || 1} (AWB: ${clean}) tại ${hub}: Lô trước ${oldTotalWeight}kg, Lô sau ${newChargeableWeight}kg (Lệch ${weightDiff > 0 ? '+' : ''}${weightDiff}kg). Phụ trội: ${extraFee.toLocaleString('vi-VN')} đ`,
      hub
    });

    return {
      success: true,
      message: weightDiff > 0 
        ? `Kiện ${targetPiece?.pieceNumber || 1} cân lại khiến toàn lô tăng ${weightDiff}kg. Cần thu thêm ~${extraFee.toLocaleString('vi-VN')} đ.` 
        : `Kiện ${targetPiece?.pieceNumber || 1} đạt chuẩn cân nặng (toàn lô ${newChargeableWeight}kg).`,
      shipment,
      weightDifferenceKg: weightDiff,
      extraFeeEstimated: extraFee
    };
  }

  /**
   * 3. Đóng bao gom hàng (Consolidation & Bagging)
   */
  static createOrGetOpenBag(hub: 'SGN' | 'HAN' | 'DAD', destinationCountry: string, carrier: 'UPS' | 'FEDEX' | 'DHL'): WarehouseBag {
    let bag = this.bags.find(b => b.hub === hub && b.destinationCountry === destinationCountry && b.carrier === carrier && b.status === 'OPEN');
    if (!bag) {
      bag = {
        bagId: `BAG_${hub}_${destinationCountry}_${Date.now().toString().slice(-6)}`,
        hub,
        destinationCountry,
        carrier,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        totalPieces: 0,
        totalWeightKg: 0,
        shipmentIds: []
      };
      this.bags.unshift(bag);
      this.persistBags();
    }
    return bag;
  }

  static addShipmentToBag(bagId: string, trackingOrId: string, operatorUsername: string): { success: boolean; message: string; bag?: WarehouseBag } {
    const bag = this.bags.find(b => b.bagId === bagId);
    if (!bag) return { success: false, message: 'Không tìm thấy bao hàng' };
    if (bag.status !== 'OPEN') return { success: false, message: 'Bao hàng này đã niêm phong seal, không thể bỏ thêm kiện' };

    const shipment = ShipmentRepository.getById(trackingOrId);
    if (!shipment) return { success: false, message: 'Không tìm thấy kiện hàng' };

    if (bag.shipmentIds.includes(shipment.masterTrackingNumber)) {
      return { success: false, message: 'Kiện hàng này đã có trong bao!' };
    }

    bag.shipmentIds.push(shipment.masterTrackingNumber);
    bag.totalPieces += shipment.totalPieces;
    bag.totalWeightKg = Math.round((bag.totalWeightKg + shipment.totalWeightKg) * 10) / 10;
    this.persistBags();

    AuthService.logAction({
      userId: operatorUsername,
      username: operatorUsername,
      userRole: 'WAREHOUSE',
      action: 'BAGGING',
      targetId: bagId,
      details: `Đã gom kiện ${shipment.masterTrackingNumber} (${shipment.totalWeightKg}kg) vào bao ${bagId}`,
      hub: bag.hub
    });

    return { success: true, message: `Đã gom kiện ${shipment.masterTrackingNumber} vào bao ${bagId} thành công!`, bag };
  }

  static sealBag(bagId: string, sealNumber: string, operatorUsername: string): { success: boolean; message: string; bag?: WarehouseBag } {
    const bag = this.bags.find(b => b.bagId === bagId);
    if (!bag) return { success: false, message: 'Không tìm thấy bao hàng' };
    bag.status = 'SEALED';
    bag.sealNumber = sealNumber || `SEAL-${Date.now().toString().slice(-6)}`;
    bag.sealedAt = new Date().toISOString();
    this.persistBags();

    return { success: true, message: `Bao ${bagId} đã được niêm phong với số chì ${bag.sealNumber}. Sẵn sàng xuất kho sân bay!`, bag };
  }

  static getAllBags(): WarehouseBag[] {
    return this.bags;
  }
}

WarehouseService.init();
