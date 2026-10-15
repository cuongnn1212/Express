import fs from 'fs';
import path from 'path';
import { ShipmentAWBData } from './shipment-service.js';

export type OperationalStatus =
  | 'PENDING_PICKUP'           // Chờ nhân viên đến nhận (Đơn vừa tạo)
  | 'PICKED_UP'                 // Đã nhận (Nhân viên lấy hàng từ khách)
  | 'PENDING_INBOUND'           // Lưu trữ chờ nhập kho tại Hub (đơn về kho đang chờ quét)
  | 'INBOUND_RECEIVED'          // Đã nhập kho (Đã về hub, kiểm tra, cân đo)
  | 'WAITING_FINANCE_DISPATCH'  // Kho chờ xuất (Đã đủ 3 điều kiện tài chính)
  | 'OUTBOUND_DISPATCHED'       // Đã xuất kho (Đã bàn giao hãng cùng Bảng kê xuất kho)
  | 'DELIVERED'                 // Đã phát thành công
  | 'CANCELLED'                 // Đã hủy đơn
  // Tương thích ngược:
  | 'CREATED'
  | 'PRINTED'
  | 'DISPATCHED';

export type FinancialCategory = 'IMMEDIATE' | 'POSTPAID' | 'WALLET';

export interface FinancialGateStatus {
  isPaid: boolean;                   // 1. Đã thanh toán (Tiền mặt, CK, hoặc duyệt công nợ)
  paidAt?: string;
  paidMethod?: string;               // VCB, Techcombank, Tiền mặt, Ví, Hạn mức công nợ
  isDeducted: boolean;               // 2. Đã trừ tiền (Đã khấu trừ ví hoặc cấn trừ hạn mức)
  deductedAt?: string;
  deductedAmount?: number;
  isCustomerCommitted: boolean;      // 3. Có sự cam kết từ khách hàng (Cam kết trách nhiệm thuế, phụ phí hải quan)
  committedAt?: string;
  committedBy?: string;
  commitmentNote?: string;
  eligibleForDispatch: boolean;      // Đủ cả 3 điều kiện: isPaid && isDeducted && isCustomerCommitted
  receiptVoucherCode?: string;       // Mã Phiếu Thu chính thức (PT-YYYYMMDD-XXXX)
}

export interface StoredShipment extends ShipmentAWBData {
  createdAt: string;
  status: OperationalStatus;
  notes?: string;
  awbPdfUrl?: string;

  // Ảnh chụp bằng chứng nhập kho (Lưu trữ Cloudflare R2)
  awbLabelPhotoUrl?: string;       // Ảnh chụp nhãn tem AWB từ camera điện thoại
  packageBoxPhotoUrl?: string;     // Ảnh chụp ngoại quan kiện hàng trên bàn cân
  inboundPhotos?: Array<{
    url: string;
    type: 'AWB_LABEL' | 'PACKAGE_BOX' | 'OTHER';
    capturedAt: string;
    storageProvider?: 'CLOUDFLARE_R2' | 'LOCAL_FALLBACK';
  }>;

  // Phân loại luồng thanh toán khi nhập kho: Thanh toán ngay / Thanh toán sau / Trừ ví điện tử
  financialCategory: FinancialCategory;

  // Cổng kiểm soát tài chính & cam kết
  financialStatus: FinancialGateStatus;

  // Kho chi nhánh hiện tại đang lưu trữ / xử lý
  currentWarehouseHub?: 'HAN' | 'SGN' | 'DAD';

  // Gạch nợ & Quyết toán Nhà cung cấp / Hãng vận chuyển (Cost Price settlement)
  vendorSettled?: boolean;
  vendorSettledAt?: string;
  vendorSettlementRef?: string;

  // Gạch nợ & Quyết toán Đại lý / Khách hàng thanh toán sau (Sell Price settlement)
  customerSettled?: boolean;
  customerSettledAt?: string;
  customerSettlementRef?: string;

  // Lịch sử chi phí & điểm đến vận đơn
  destinationCountry?: string;
  expenseHistory?: Array<{
    voucherCode: string;
    categoryCode: string;
    categoryName?: string;
    amount: number;
    recipientName: string;
    reason?: string;
    paidAt?: string;
    operator?: string;
    paymentMethod?: string;
    createdAt?: string;
    createdBy?: string;
  }>;

  // Nhật ký vận hành kho
  pickedUpAt?: string;
  pickedUpBy?: string;
  inboundedAt?: string;
  inboundedBy?: string;
  inboundHub?: 'HAN' | 'SGN' | 'DAD';
  dispatchedAt?: string;
  dispatchedBy?: string;
  dispatchManifestId?: string; // Mã Bảng kê xuất kho (VD: BK-HAN-20261011-001)
}

export class ShipmentRepository {
  private static filePath = path.join(process.cwd(), 'data', 'shipments.json');
  private static shipments: StoredShipment[] = [];

  static init() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const loaded: any[] = JSON.parse(raw);
        // Chuẩn hóa dữ liệu cũ nếu thiếu financialStatus
        this.shipments = loaded.map(s => this.ensureFinancialStatus(s));
      } else {
        this.shipments = [];
        this.persist();
      }
    } catch (e) {
      console.error('Không thể nạp dữ liệu shipments.json, khởi tạo rỗng:', e);
      this.shipments = [];
    }
  }

  private static ensureFinancialStatus(s: any): StoredShipment {
    const isPaid = s.paymentStatus === 'PAID';
    const isDeducted = Boolean(s.financialStatus?.isDeducted || (isPaid && (s.paymentMethod?.toLowerCase().includes('ví') || s.paymentMethod?.toLowerCase().includes('công nợ'))));
    const isCommitted = Boolean(s.financialStatus?.isCustomerCommitted || false);
    const eligible = Boolean(isPaid && isDeducted && isCommitted);

    let financialCategory: FinancialCategory = s.financialCategory;
    if (!financialCategory) {
      const pm = String(s.paymentMethod || s.financialStatus?.paidMethod || '').toLowerCase();
      if (pm.includes('ví') || s.paymentChannel === 'WALLET') {
        financialCategory = 'WALLET';
      } else if (pm.includes('công nợ') || pm.includes('sau') || s.paymentTerm === 'POSTPAID' || (s.customerCode && s.customerCode.startsWith('DL'))) {
        financialCategory = 'POSTPAID';
      } else {
        financialCategory = 'IMMEDIATE';
      }
    }

    const fStatus: FinancialGateStatus = {
      isPaid: s.financialStatus?.isPaid !== undefined ? s.financialStatus.isPaid : isPaid,
      paidAt: s.financialStatus?.paidAt || (isPaid ? s.createdAt : undefined),
      paidMethod: s.financialStatus?.paidMethod || s.paymentMethod || (isPaid ? (financialCategory === 'WALLET' ? 'Ví PandaLex' : financialCategory === 'POSTPAID' ? 'Hạn mức công nợ' : 'Tiền ngay') : undefined),
      isDeducted: s.financialStatus?.isDeducted !== undefined ? s.financialStatus.isDeducted : isDeducted,
      deductedAt: s.financialStatus?.deductedAt,
      deductedAmount: s.financialStatus?.deductedAmount || (isDeducted ? s.sellPrice : 0),
      isCustomerCommitted: s.financialStatus?.isCustomerCommitted !== undefined ? s.financialStatus.isCustomerCommitted : isCommitted,
      committedAt: s.financialStatus?.committedAt,
      committedBy: s.financialStatus?.committedBy,
      commitmentNote: s.financialStatus?.commitmentNote || 'Khách hàng cam kết chịu trách nhiệm biểu thuế & phụ phí hải quan',
      eligibleForDispatch: s.financialStatus?.eligibleForDispatch !== undefined ? s.financialStatus.eligibleForDispatch : eligible
    };

    let status = s.status || 'PENDING_PICKUP';
    if (status === 'CREATED') status = 'PENDING_PICKUP';

    const currentWarehouseHub = s.currentWarehouseHub || s.inboundHub || s.hub || 'HAN';
    const vendorSettled = Boolean(s.vendorSettled || false);
    const customerSettled = s.customerSettled !== undefined 
      ? Boolean(s.customerSettled) 
      : (financialCategory === 'IMMEDIATE' && isPaid);

    return {
      ...s,
      status,
      financialCategory,
      currentWarehouseHub,
      vendorSettled,
      vendorSettledAt: s.vendorSettledAt,
      vendorSettlementRef: s.vendorSettlementRef,
      customerSettled,
      customerSettledAt: s.customerSettledAt,
      customerSettlementRef: s.customerSettlementRef,
      financialStatus: fStatus
    };
  }

  private static persist() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.shipments, null, 2), 'utf-8');
    } catch (e) {
      console.error('Lỗi lưu trữ shipments.json:', e);
    }
  }

  static save(shipment: ShipmentAWBData | StoredShipment, notes?: string): StoredShipment {
    const existingIdx = this.shipments.findIndex(s => s.shipmentId === shipment.shipmentId || (s.masterTrackingNumber && s.masterTrackingNumber === shipment.masterTrackingNumber));
    const prev = existingIdx >= 0 ? this.shipments[existingIdx] : undefined;

    const baseObj = {
      ...shipment,
      createdAt: prev ? prev.createdAt : new Date().toISOString(),
      status: (shipment as any).status || (prev ? prev.status : 'PENDING_PICKUP'),
      notes: notes || (prev ? prev.notes : undefined),
      awbPdfUrl: (shipment as any).awbPdfUrl || (prev ? prev.awbPdfUrl : undefined),
      financialCategory: (shipment as any).financialCategory || prev?.financialCategory,
      currentWarehouseHub: (shipment as any).currentWarehouseHub || prev?.currentWarehouseHub || (shipment as any).hub || 'HAN',
      vendorSettled: (shipment as any).vendorSettled !== undefined ? (shipment as any).vendorSettled : prev?.vendorSettled,
      vendorSettledAt: (shipment as any).vendorSettledAt || prev?.vendorSettledAt,
      vendorSettlementRef: (shipment as any).vendorSettlementRef || prev?.vendorSettlementRef,
      customerSettled: (shipment as any).customerSettled !== undefined ? (shipment as any).customerSettled : prev?.customerSettled,
      customerSettledAt: (shipment as any).customerSettledAt || prev?.customerSettledAt,
      customerSettlementRef: (shipment as any).customerSettlementRef || prev?.customerSettlementRef,
      pickedUpAt: (shipment as any).pickedUpAt || prev?.pickedUpAt,
      pickedUpBy: (shipment as any).pickedUpBy || prev?.pickedUpBy,
      inboundedAt: (shipment as any).inboundedAt || prev?.inboundedAt,
      inboundedBy: (shipment as any).inboundedBy || prev?.inboundedBy,
      inboundHub: (shipment as any).inboundHub || prev?.inboundHub,
      dispatchedAt: (shipment as any).dispatchedAt || prev?.dispatchedAt,
      dispatchedBy: (shipment as any).dispatchedBy || prev?.dispatchedBy,
      dispatchManifestId: (shipment as any).dispatchManifestId || prev?.dispatchManifestId,
      financialStatus: (shipment as any).financialStatus || prev?.financialStatus
    };

    const stored: StoredShipment = this.ensureFinancialStatus(baseObj);

    if (existingIdx >= 0) {
      this.shipments[existingIdx] = stored;
    } else {
      this.shipments.unshift(stored); // Đưa lên đầu
    }
    this.persist();
    return stored;
  }

  static getAll(): StoredShipment[] {
    return this.shipments;
  }

  static getById(id: string): StoredShipment | undefined {
    if (!id) return undefined;
    const clean = String(id).trim().toUpperCase();
    return this.shipments.find(s => 
      (s.shipmentId && s.shipmentId.trim().toUpperCase() === clean) || 
      (s.masterTrackingNumber && s.masterTrackingNumber.trim().toUpperCase() === clean) ||
      (s.pieces && s.pieces.some(p => p.trackingNumber && p.trackingNumber.trim().toUpperCase() === clean))
    );
  }

  static existsAwb(awb: string): boolean {
    return Boolean(this.getById(awb));
  }

  /**
   * Cập nhật trạng thái vận hành theo quy trình kho
   */
  static updateStatus(id: string, status: OperationalStatus): StoredShipment | null {
    const s = this.getById(id);
    if (!s) return null;
    s.status = status;
    this.persist();
    return s;
  }

  static updateOperationalStatus(id: string, status: OperationalStatus, meta?: { operator?: string; hub?: 'HAN' | 'SGN' | 'DAD'; manifestId?: string; note?: string }): StoredShipment | null {
    const s = this.getById(id);
    if (!s) return null;
    s.status = status;
    const now = new Date().toISOString();
    if (status === 'PICKED_UP') {
      s.pickedUpAt = now;
      if (meta?.operator) s.pickedUpBy = meta.operator;
    } else if (status === 'INBOUND_RECEIVED') {
      s.inboundedAt = now;
      if (meta?.operator) s.inboundedBy = meta.operator;
      if (meta?.hub) s.inboundHub = meta.hub;
    } else if (status === 'OUTBOUND_DISPATCHED') {
      s.dispatchedAt = now;
      if (meta?.operator) s.dispatchedBy = meta.operator;
      if (meta?.manifestId) s.dispatchManifestId = meta.manifestId;
    }
    if (meta?.note) {
      s.notes = s.notes ? `${s.notes} | ${meta.note}` : meta.note;
    }
    this.persist();
    return s;
  }

  /**
   * Kiểm tra 3 điều kiện tài chính bắt buộc để được xuất kho:
   * 1. Đã thanh toán (isPaid)
   * 2. Đã trừ tiền (isDeducted)
   * 3. Có sự cam kết từ khách hàng (isCustomerCommitted)
   */
  static verifyFinancialGate(id: string): { eligible: boolean; status: FinancialGateStatus; missingConditions: string[]; shipment?: StoredShipment } {
    const s = this.getById(id);
    if (!s) {
      return {
        eligible: false,
        status: { isPaid: false, isDeducted: false, isCustomerCommitted: false, eligibleForDispatch: false },
        missingConditions: ['Không tìm thấy vận đơn']
      };
    }

    const missing: string[] = [];
    if (!s.financialStatus.isPaid) {
      missing.push('Chưa thanh toán (Cần thanh toán tiền cước)');
    }
    if (!s.financialStatus.isDeducted) {
      missing.push('Chưa trừ tiền (Cần khấu trừ ví hoặc cấn trừ công nợ)');
    }
    if (!s.financialStatus.isCustomerCommitted) {
      missing.push('Chưa có sự cam kết từ khách hàng (Cam kết nghĩa vụ thuế/phụ phí)');
    }

    const eligible = missing.length === 0;
    s.financialStatus.eligibleForDispatch = eligible;
    this.persist();

    return {
      eligible,
      status: s.financialStatus,
      missingConditions: missing,
      shipment: s
    };
  }

  /**
   * Cập nhật cổng tài chính & cam kết cho vận đơn
   */
  static updateFinancialGate(id: string, update: Partial<FinancialGateStatus>): StoredShipment | null {
    const s = this.getById(id);
    if (!s) return null;

    s.financialStatus = {
      ...s.financialStatus,
      ...update
    };

    s.financialStatus.eligibleForDispatch = Boolean(
      s.financialStatus.isPaid &&
      s.financialStatus.isDeducted &&
      s.financialStatus.isCustomerCommitted
    );

    if (s.financialStatus.isPaid) {
      s.paymentStatus = 'PAID';
    }

    // Nếu đơn đã nhập kho và nay hoàn thành đủ 3 điều kiện -> Tự động chuyển sang Kho Chờ Xuất
    if (s.financialStatus.eligibleForDispatch && (s.status === 'INBOUND_RECEIVED' || s.status === 'PRINTED')) {
      s.status = 'WAITING_FINANCE_DISPATCH';
    }

    this.persist();
    return s;
  }

  static updatePaymentStatus(id: string, paymentStatus: 'PAID' | 'UNPAID'): StoredShipment | null {
    const s = this.getById(id);
    if (!s) return null;
    s.paymentStatus = paymentStatus;
    s.financialStatus.isPaid = (paymentStatus === 'PAID');
    s.financialStatus.eligibleForDispatch = Boolean(
      s.financialStatus.isPaid &&
      s.financialStatus.isDeducted &&
      s.financialStatus.isCustomerCommitted
    );
    this.persist();
    return s;
  }

  static getByCustomerCode(customerCode: string): StoredShipment[] {
    const clean = customerCode.trim().toUpperCase();
    return this.shipments.filter(s => s.customerCode?.toUpperCase() === clean);
  }

  static getWaitingDispatch(hub?: string): StoredShipment[] {
    return this.shipments.filter(s => {
      const matchHub = !hub || s.hub === hub || s.inboundHub === hub || s.currentWarehouseHub === hub;
      const matchStatus = s.status === 'WAITING_FINANCE_DISPATCH' || (s.status === 'INBOUND_RECEIVED' && s.financialStatus.eligibleForDispatch);
      return matchHub && matchStatus;
    });
  }

  /**
   * Lấy danh sách vận đơn theo Hub chi nhánh làm việc (HAN, SGN, DAD) và trạng thái
   */
  static getByWarehouseHub(hub?: 'HAN' | 'SGN' | 'DAD', status?: OperationalStatus): StoredShipment[] {
    return this.shipments.filter(s => {
      const matchHub = !hub || s.currentWarehouseHub === hub || s.inboundHub === hub || s.hub === hub;
      const matchStatus = !status || s.status === status;
      return matchHub && matchStatus;
    });
  }

  /**
   * Đơn lưu trữ chờ nhập kho tại Hub (được tạo hoặc chuyển đến chi nhánh nhưng chưa quét vào kho)
   */
  static getPendingInbound(hub?: 'HAN' | 'SGN' | 'DAD'): StoredShipment[] {
    return this.shipments.filter(s => {
      const matchHub = !hub || s.currentWarehouseHub === hub || s.hub === hub;
      const isPending = s.status === 'PENDING_INBOUND' || s.status === 'PENDING_PICKUP' || s.status === 'PICKED_UP';
      return matchHub && isPending;
    });
  }

  /**
   * Đơn đã nhập vào kho tại Hub, phân loại theo 3 luồng tài chính: IMMEDIATE, POSTPAID, WALLET
   */
  static getInboundReceived(hub?: 'HAN' | 'SGN' | 'DAD', category?: FinancialCategory): StoredShipment[] {
    return this.shipments.filter(s => {
      const matchHub = !hub || s.currentWarehouseHub === hub || s.inboundHub === hub || s.hub === hub;
      const isReceived = s.status === 'INBOUND_RECEIVED' || s.status === 'WAITING_FINANCE_DISPATCH';
      const matchCategory = !category || s.financialCategory === category;
      return matchHub && isReceived && matchCategory;
    });
  }

  /**
   * Lấy các đơn hàng xuất giao Hãng/Nhà cung cấp chưa gạch nợ (costPrice)
   */
  static getUnsettledVendors(vendor?: string): StoredShipment[] {
    return this.shipments.filter(s => {
      const isDispatched = s.status === 'OUTBOUND_DISPATCHED' || s.status === 'DELIVERED';
      const notSettled = !s.vendorSettled;
      const matchVendor = !vendor || (s.carrier && s.carrier.toUpperCase() === vendor.toUpperCase());
      return isDispatched && notSettled && matchVendor;
    });
  }

  /**
   * Lấy các đơn hàng của Đại lý/Khách hàng thanh toán sau (POSTPAID) chưa gạch nợ (sellPrice)
   */
  static getUnsettledCustomers(customerCode?: string): StoredShipment[] {
    return this.shipments.filter(s => {
      const isPostpaid = s.financialCategory === 'POSTPAID';
      const notSettled = !s.customerSettled;
      const matchCust = !customerCode || (s.customerCode && s.customerCode.toUpperCase() === customerCode.toUpperCase());
      return isPostpaid && notSettled && matchCust;
    });
  }

  /**
   * Gạch nợ cho danh sách vận đơn theo Nhà cung cấp
   */
  static markVendorSettled(shipmentIds: string[], ref: string, operator: string): number {
    let count = 0;
    const now = new Date().toISOString();
    for (const id of shipmentIds) {
      const s = this.getById(id);
      if (s) {
        s.vendorSettled = true;
        s.vendorSettledAt = now;
        s.vendorSettlementRef = ref;
        count++;
      }
    }
    if (count > 0) this.persist();
    return count;
  }

  /**
   * Gạch nợ cho danh sách vận đơn của Đại lý / Khách hàng thanh toán sau
   */
  static markCustomerSettled(shipmentIds: string[], ref: string, operator: string): number {
    let count = 0;
    const now = new Date().toISOString();
    for (const id of shipmentIds) {
      const s = this.getById(id);
      if (s) {
        s.customerSettled = true;
        s.customerSettledAt = now;
        s.customerSettlementRef = ref;
        s.paymentStatus = 'PAID';
        s.financialStatus.isPaid = true;
        s.financialStatus.paidAt = now;
        s.financialStatus.paidMethod = 'Đối soát gạch nợ định kỳ';
        count++;
      }
    }
    if (count > 0) this.persist();
    return count;
  }

  static delete(id: string): boolean {
    const initLen = this.shipments.length;
    this.shipments = this.shipments.filter(s => s.shipmentId !== id && s.masterTrackingNumber !== id);
    if (this.shipments.length !== initLen) {
      this.persist();
      return true;
    }
    return false;
  }

  static deleteAll(): number {
    const count = this.shipments.length;
    this.shipments = [];
    this.persist();
    return count;
  }
}

// Khởi chạy
ShipmentRepository.init();
