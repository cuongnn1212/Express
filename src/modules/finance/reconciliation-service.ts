import fs from 'fs';
import path from 'path';
import { ShipmentRepository, StoredShipment } from '../shipment/shipment-repository.js';
import { AuthService } from '../auth/auth-service.js';

export interface ReconciliationVoucher {
  voucherId: string; // VD: GN-NCC-20261012-001 hoặc GN-DL-20261012-001
  voucherType: 'VENDOR' | 'CUSTOMER';
  targetCode: string; // Tên Hãng / NCC (UPS, FEDEX...) hoặc Mã Đại lý (DL-HN-001...)
  targetName: string; // Tên hiển thị của đối tác
  settledAmount: number; // Tổng số tiền đã gạch nợ (VNĐ)
  shipmentsCount: number;
  shipmentIds: string[];
  awbNumbers: string[];
  paymentRef: string; // Mã UNC ngân hàng / Phiếu thu / Biên nhận
  notes?: string;
  operator: string;
  createdAt: string;
  createdAtFormatted: string;
}

export interface VendorDebtSummary {
  vendorName: string;
  totalCostPayable: number; // Tổng tiền cước gốc phải trả
  settledAmount: number;    // Đã gạch nợ
  outstandingDebt: number;  // Nợ còn phải trả cho Hãng
  unsettledShipmentsCount: number;
  unsettledShipments: StoredShipment[];
}

export interface CustomerDebtSummary {
  customerCode: string;
  customerName: string;
  totalSellReceivable: number; // Tổng cước bán phải thu
  settledAmount: number;       // Đã thu / đã gạch nợ
  outstandingDebt: number;     // Công nợ đại lý còn nợ PandaLex
  unsettledShipmentsCount: number;
  unsettledShipments: StoredShipment[];
}

export class ReconciliationService {
  private static filePath = path.join(process.cwd(), 'data', 'reconciliations.json');
  private static vouchers: ReconciliationVoucher[] = [];

  static init() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      if (fs.existsSync(this.filePath)) {
        this.vouchers = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      } else {
        this.vouchers = [];
        this.persist();
      }
    } catch (e) {
      console.error('Lỗi khởi tạo ReconciliationService:', e);
      this.vouchers = [];
    }
  }

  private static persist() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.vouchers, null, 2), 'utf-8');
    } catch (e) {
      console.error('Lỗi lưu reconciliations.json:', e);
    }
  }

  static generateVoucherId(type: 'VENDOR' | 'CUSTOMER'): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const prefix = type === 'VENDOR' ? `GN-NCC-${yyyy}${mm}${dd}` : `GN-DL-${yyyy}${mm}${dd}`;

    const countToday = this.vouchers.filter(v => v.voucherId.startsWith(prefix)).length + 1;
    return `${prefix}-${String(countToday).padStart(3, '0')}`;
  }

  /**
   * 1. Tổng hợp nợ phải trả theo Nhà cung cấp / Hãng vận chuyển (Carrier / Vendor Payables)
   * Tính theo cước vốn (costPrice) của các đơn hàng đã xuất kho
   */
  static getVendorDebtSummaries(): VendorDebtSummary[] {
    const all = ShipmentRepository.getAll();
    const vendorMap: Record<string, { totalCost: number; settled: number; unsettledList: StoredShipment[] }> = {
      'UPS': { totalCost: 0, settled: 0, unsettledList: [] },
      'FEDEX': { totalCost: 0, settled: 0, unsettledList: [] },
      'DHL': { totalCost: 0, settled: 0, unsettledList: [] }
    };

    all.forEach(s => {
      // Chỉ tính các đơn đã xuất kho hoặc đã phát
      const isDispatched = s.status === 'OUTBOUND_DISPATCHED' || s.status === 'DELIVERED';
      if (!isDispatched) return;

      const vendor = (s.carrier || 'UPS').toUpperCase();
      if (!vendorMap[vendor]) {
        vendorMap[vendor] = { totalCost: 0, settled: 0, unsettledList: [] };
      }

      const cost = Number(s.costPrice) || Math.round((s.sellPrice || 0) * 0.75); // Fallback ước tính giá vốn 75%
      vendorMap[vendor].totalCost += cost;

      if (s.vendorSettled) {
        vendorMap[vendor].settled += cost;
      } else {
        vendorMap[vendor].unsettledList.push(s);
      }
    });

    const summaries: VendorDebtSummary[] = [];
    for (const [vendorName, data] of Object.entries(vendorMap)) {
      summaries.push({
        vendorName,
        totalCostPayable: data.totalCost,
        settledAmount: data.settled,
        outstandingDebt: data.totalCost - data.settled,
        unsettledShipmentsCount: data.unsettledList.length,
        unsettledShipments: data.unsettledList
      });
    }

    return summaries.sort((a, b) => b.outstandingDebt - a.outstandingDebt);
  }

  /**
   * 2. Tổng hợp công nợ phải thu từ Đại lý / Khách hàng thanh toán sau (Customer Receivables)
   * Tính theo cước bán (sellPrice) của các đơn hàng có financialCategory === 'POSTPAID'
   */
  static getCustomerDebtSummaries(): CustomerDebtSummary[] {
    const all = ShipmentRepository.getAll();
    const custMap: Record<string, { name: string; totalSell: number; settled: number; unsettledList: StoredShipment[] }> = {};

    all.forEach(s => {
      // Đơn hàng thanh toán sau (POSTPAID)
      if (s.financialCategory !== 'POSTPAID') return;

      const code = s.customerCode || 'PDL-POSTPAID';
      const name = s.customerName || s.shipFrom?.companyName || s.shipFrom?.contactName || code;

      if (!custMap[code]) {
        custMap[code] = { name, totalSell: 0, settled: 0, unsettledList: [] };
      }

      const sell = Number(s.sellPrice) || 0;
      custMap[code].totalSell += sell;

      if (s.customerSettled) {
        custMap[code].settled += sell;
      } else {
        custMap[code].unsettledList.push(s);
      }
    });

    const summaries: CustomerDebtSummary[] = [];
    for (const [customerCode, data] of Object.entries(custMap)) {
      summaries.push({
        customerCode,
        customerName: data.name,
        totalSellReceivable: data.totalSell,
        settledAmount: data.settled,
        outstandingDebt: data.totalSell - data.settled,
        unsettledShipmentsCount: data.unsettledList.length,
        unsettledShipments: data.unsettledList
      });
    }

    return summaries.sort((a, b) => b.outstandingDebt - a.outstandingDebt);
  }

  /**
   * 3. Gạch nợ Nhà cung cấp / Hãng vận chuyển (Settlement Payable)
   */
  static settleVendorDebt(params: {
    vendor: string;
    shipmentIds: string[];
    paymentRef: string;
    amount?: number;
    notes?: string;
    operator: string;
  }): { success: boolean; message: string; voucher?: ReconciliationVoucher } {
    if (!params.vendor) return { success: false, message: 'Thiếu tên nhà cung cấp / hãng vận chuyển' };
    if (!params.shipmentIds || params.shipmentIds.length === 0) {
      return { success: false, message: 'Chưa chọn đơn hàng nào để gạch nợ' };
    }
    if (!params.paymentRef) {
      return { success: false, message: 'Vui lòng nhập Mã chứng từ ngân hàng / Ủy nhiệm chi (UNC)' };
    }

    const voucherId = this.generateVoucherId('VENDOR');
    const now = new Date();
    const createdAtFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const awbNumbers: string[] = [];
    let calculatedAmount = 0;

    params.shipmentIds.forEach(id => {
      const s = ShipmentRepository.getById(id);
      if (s) {
        awbNumbers.push(s.masterTrackingNumber || s.shipmentId);
        const cost = Number(s.costPrice) || Math.round((s.sellPrice || 0) * 0.75);
        calculatedAmount += cost;
      }
    });

    const settledAmount = params.amount && params.amount > 0 ? params.amount : calculatedAmount;

    // Cập nhật trạng thái từng vận đơn
    const updatedCount = ShipmentRepository.markVendorSettled(params.shipmentIds, voucherId, params.operator);

    const voucher: ReconciliationVoucher = {
      voucherId,
      voucherType: 'VENDOR',
      targetCode: params.vendor.toUpperCase(),
      targetName: `Hãng vận chuyển ${params.vendor.toUpperCase()}`,
      settledAmount,
      shipmentsCount: updatedCount,
      shipmentIds: params.shipmentIds,
      awbNumbers,
      paymentRef: params.paymentRef,
      notes: params.notes || `Quyết toán cước vận chuyển hãng ${params.vendor}`,
      operator: params.operator,
      createdAt: now.toISOString(),
      createdAtFormatted
    };

    this.vouchers.unshift(voucher);
    this.persist();

    AuthService.logAction({
      userId: params.operator,
      username: params.operator,
      userRole: 'ACCOUNTANT',
      action: 'SETTLE_VENDOR_DEBT',
      targetId: voucherId,
      details: `Đã gạch nợ NCC ${params.vendor} cho ${updatedCount} vận đơn (UNC: ${params.paymentRef}, Số tiền: ${settledAmount.toLocaleString('vi-VN')} đ)`
    });

    return {
      success: true,
      message: `✅ Đã gạch nợ thành công cho Hãng ${params.vendor}! Phiếu đối soát: ${voucherId} (${updatedCount} đơn hàng, ${settledAmount.toLocaleString('vi-VN')} đ)`,
      voucher
    };
  }

  /**
   * 4. Gạch nợ Đại lý / Khách hàng thanh toán sau (Settlement Receivable)
   */
  static settleCustomerDebt(params: {
    customerCode: string;
    customerName?: string;
    shipmentIds: string[];
    paymentRef: string;
    amount?: number;
    notes?: string;
    operator: string;
  }): { success: boolean; message: string; voucher?: ReconciliationVoucher } {
    if (!params.customerCode) return { success: false, message: 'Thiếu mã khách hàng / đại lý' };
    if (!params.shipmentIds || params.shipmentIds.length === 0) {
      return { success: false, message: 'Chưa chọn đơn hàng nào để gạch nợ' };
    }
    if (!params.paymentRef) {
      return { success: false, message: 'Vui lòng nhập Mã phiếu thu / Giấy báo có ngân hàng' };
    }

    const voucherId = this.generateVoucherId('CUSTOMER');
    const now = new Date();
    const createdAtFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const awbNumbers: string[] = [];
    let calculatedAmount = 0;

    params.shipmentIds.forEach(id => {
      const s = ShipmentRepository.getById(id);
      if (s) {
        awbNumbers.push(s.masterTrackingNumber || s.shipmentId);
        calculatedAmount += Number(s.sellPrice) || 0;
      }
    });

    const settledAmount = params.amount && params.amount > 0 ? params.amount : calculatedAmount;

    // Cập nhật trạng thái từng vận đơn
    const updatedCount = ShipmentRepository.markCustomerSettled(params.shipmentIds, voucherId, params.operator);

    const voucher: ReconciliationVoucher = {
      voucherId,
      voucherType: 'CUSTOMER',
      targetCode: params.customerCode.toUpperCase(),
      targetName: params.customerName || `Đại lý ${params.customerCode}`,
      settledAmount,
      shipmentsCount: updatedCount,
      shipmentIds: params.shipmentIds,
      awbNumbers,
      paymentRef: params.paymentRef,
      notes: params.notes || `Thu nợ kỳ đối soát đại lý ${params.customerCode}`,
      operator: params.operator,
      createdAt: now.toISOString(),
      createdAtFormatted
    };

    this.vouchers.unshift(voucher);
    this.persist();

    AuthService.logAction({
      userId: params.operator,
      username: params.operator,
      userRole: 'ACCOUNTANT',
      action: 'SETTLE_CUSTOMER_DEBT',
      targetId: voucherId,
      details: `Đã gạch nợ Đại lý ${params.customerCode} cho ${updatedCount} vận đơn (Chứng từ thu: ${params.paymentRef}, Số tiền: ${settledAmount.toLocaleString('vi-VN')} đ)`
    });

    return {
      success: true,
      message: `✅ Đã gạch nợ thành công cho Đại lý ${params.customerCode}! Phiếu thu nợ: ${voucherId} (${updatedCount} đơn hàng, ${settledAmount.toLocaleString('vi-VN')} đ)`,
      voucher
    };
  }

  static getAllVouchers(): ReconciliationVoucher[] {
    return this.vouchers;
  }

  static getVoucherById(id: string): ReconciliationVoucher | undefined {
    return this.vouchers.find(v => v.voucherId.toUpperCase() === id.trim().toUpperCase());
  }
}

ReconciliationService.init();
