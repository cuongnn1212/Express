import fs from 'fs';
import path from 'path';
import { AuthService, UserAccount } from '../auth/auth-service.js';
import { ShipmentRepository } from '../shipment/shipment-repository.js';
import { CustomerService } from '../customer/customer-service.js';

export interface WalletTransaction {
  id: string;
  userId: string;
  username: string;
  customerCode?: string;
  type: 'TOPUP' | 'DEDUCT_SHIPMENT' | 'REFUND';
  amount: number; // Dương là cộng, âm là trừ
  balanceAfter: number;
  shipmentTracking?: string;
  paymentMethod?: string; // VCB, Techcombank, Tiền mặt, UNC...
  reference?: string; // Mã giao dịch ngân hàng / Số ủy nhiệm chi
  note: string;
  createdAt: string;
  createdBy: string;
}

export interface ReceiptVoucher {
  id: string;
  voucherCode: string; // Mã phiếu thu chuẩn PT-YYYYMMDD-XXXX
  type: 'SHIPMENT_FEE' | 'CUSTOMER_DEBT' | 'WALLET_TOPUP';
  shipmentId?: string;
  trackingNumber?: string;
  customerCode: string;
  customerName: string;
  amount: number;
  paymentChannel: 'CASH' | 'BANK_TRANSFER' | 'WALLET' | 'POSTPAID_CONTRACT';
  paymentChannelName: string; // "Tiền mặt tại quầy", "Chuyển khoản Vietcombank", "Trừ ví điện tử", "Ghi nợ hợp đồng"
  bankAccount?: string;
  referenceCode?: string; // Số GD / UNC / Báo có
  payerName: string;
  payerPhone?: string;
  reason: string;
  hub: 'HAN' | 'SGN' | 'DAD';
  createdAt: string;
  createdBy: string;
}

export interface FinancialSummary {
  totalRevenue: number; // Tổng tiền thu của khách
  totalCarrierCost: number; // Tổng chi phí trả hãng bay
  grossProfit: number; // Lợi nhuận gộp
  profitMarginPercent: number; // Tỷ suất lợi nhuận
  totalPaidRevenue: number; // Doanh thu đã thanh toán tiền ngay
  totalUnpaidDebt: number; // Công nợ chưa thu (Thanh toán sau)
  totalShipmentsCount: number;
  totalWeightKg: number;
  walletBalanceTotal: number; // Tổng tiền các đại lý đang ký gửi trong ví
}

export class FinanceService {
  private static txFile = path.join(process.cwd(), 'data', 'wallet_transactions.json');
  private static voucherFile = path.join(process.cwd(), 'data', 'receipt_vouchers.json');
  private static transactions: WalletTransaction[] = [];
  private static vouchers: ReceiptVoucher[] = [];

  static init() {
    try {
      const dir = path.dirname(this.txFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(this.txFile)) {
        this.transactions = JSON.parse(fs.readFileSync(this.txFile, 'utf-8'));
      } else {
        // Giao dịch mẫu
        this.transactions = [
          {
            id: 'tx_init_annam',
            userId: 'usr_agent_annam',
            username: 'daily_annam',
            customerCode: 'AG-002',
            type: 'TOPUP',
            amount: 20000000,
            balanceAfter: 20000000,
            note: 'Nạp tiền ví đại lý qua Techcombank',
            createdAt: new Date().toISOString(),
            createdBy: 'ketoan'
          }
        ];
        this.persist();
      }

      // Khởi tạo danh sách phiếu thu
      if (fs.existsSync(this.voucherFile)) {
        this.vouchers = JSON.parse(fs.readFileSync(this.voucherFile, 'utf-8'));
      } else {
        this.vouchers = [
          {
            id: 'vch_init_001',
            voucherCode: 'PT-20261008-0001',
            type: 'WALLET_TOPUP',
            customerCode: 'AG-002',
            customerName: 'Đại Lý Cấp 2 - An Nam Logistics',
            amount: 20000000,
            paymentChannel: 'BANK_TRANSFER',
            paymentChannelName: 'Chuyển khoản Techcombank',
            bankAccount: 'Techcombank - 19036888999',
            referenceCode: 'UNC-TCB-88291',
            payerName: 'Nguyễn Văn An',
            payerPhone: '0912345678',
            reason: 'Ký quỹ nạp tiền ví trả trước phục vụ phát hành vận đơn AWB',
            hub: 'SGN',
            createdAt: '2026-10-08T18:17:14.721Z',
            createdBy: 'ketoan'
          }
        ];
        this.persistVouchers();
      }
    } catch (e) {
      console.error('Lỗi khởi tạo FinanceService:', e);
    }
  }

  private static persist() {
    fs.writeFileSync(this.txFile, JSON.stringify(this.transactions, null, 2), 'utf-8');
  }

  private static persistVouchers() {
    fs.writeFileSync(this.voucherFile, JSON.stringify(this.vouchers, null, 2), 'utf-8');
  }

  /**
   * 1. Nạp tiền ví đại lý (Kế toán thao tác)
   */
  static topupWallet(userId: string, amount: number, note: string, accountant: UserAccount): { success: boolean; message: string; tx?: WalletTransaction } {
    if (amount <= 0) return { success: false, message: 'Số tiền nạp phải lớn hơn 0' };
    const user = AuthService.getUserById(userId);
    if (!user) return { success: false, message: 'Không tìm thấy tài khoản người dùng' };

    const updateRes = AuthService.updateUserWallet(userId, amount, note, accountant);
    if (!updateRes.success) return { success: false, message: updateRes.message };

    const tx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      userId: user.id,
      username: user.username,
      customerCode: user.customerCode,
      type: 'TOPUP',
      amount,
      balanceAfter: updateRes.newBalance,
      note,
      createdAt: new Date().toISOString(),
      createdBy: accountant.username
    };

    this.transactions.unshift(tx);
    this.persist();
    return { success: true, message: `Đã nạp thành công ${amount.toLocaleString('vi-VN')} đ vào ví đại lý ${user.username}`, tx };
  }

  /**
   * 1b. Nạp tiền ví trực tiếp theo Mã Khách Hàng (Dành cho Phân Hệ Nạp Tiền & Khách Hàng Trả Trước)
   */
  static recordCustomerTopup(
    customerCode: string,
    amount: number,
    paymentMethod: string = 'Chuyển khoản VCB',
    reference: string = '',
    note: string = '',
    operator: string = 'ketoan'
  ): { success: boolean; message: string; tx?: WalletTransaction; newBalance?: number } {
    if (amount <= 0) return { success: false, message: 'Số tiền nạp ví phải lớn hơn 0' };

    const topupRes = CustomerService.topupWallet(customerCode, amount, paymentMethod, reference, note, operator);
    if (!topupRes.success || !topupRes.customer) {
      return { success: false, message: topupRes.message };
    }

    // Đồng bộ tài khoản User nếu có
    const user = AuthService.getUserByCustomerCode(customerCode);
    if (user) {
      user.walletBalance = topupRes.newBalance;
    }

    const tx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      userId: user?.id || topupRes.customer.id,
      username: user?.username || topupRes.customer.customerCode,
      customerCode: topupRes.customer.customerCode,
      type: 'TOPUP',
      amount,
      balanceAfter: topupRes.newBalance,
      paymentMethod,
      reference,
      note: note || `Nạp tiền ví khách hàng ${topupRes.customer.customerCode} qua ${paymentMethod}`,
      createdAt: new Date().toISOString(),
      createdBy: operator
    };

    this.transactions.unshift(tx);
    this.persist();

    return {
      success: true,
      message: `Đã nạp thành công ${amount.toLocaleString('vi-VN')} đ vào ví khách hàng ${topupRes.customer.customerCode}. Số dư mới: ${topupRes.newBalance.toLocaleString('vi-VN')} đ`,
      tx,
      newBalance: topupRes.newBalance
    };
  }

  /**
   * 2b. Khấu trừ tiền ví khách hàng trả trước khi tạo vận đơn
   */
  static recordCustomerDeduction(
    customerCode: string,
    amount: number,
    trackingNumber: string,
    operator: string = 'system'
  ): { success: boolean; message: string; balanceAfter?: number } {
    const cust = CustomerService.getById(customerCode) || CustomerService.getByCode(customerCode);
    if (!cust) return { success: false, message: 'Không tìm thấy khách hàng: ' + customerCode };

    const deductRes = CustomerService.deductWallet(customerCode, amount);
    if (!deductRes.success) return { success: false, message: deductRes.message };

    const user = AuthService.getUserByCustomerCode(customerCode);
    if (user) {
      user.walletBalance = deductRes.newBalance;
    }

    const tx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      userId: user?.id || cust.id,
      username: user?.username || cust.customerCode,
      customerCode: cust.customerCode,
      type: 'DEDUCT_SHIPMENT',
      amount: -amount,
      balanceAfter: deductRes.newBalance,
      shipmentTracking: trackingNumber,
      paymentMethod: 'Trừ ví trả trước',
      reference: trackingNumber,
      note: `Khấu trừ cước vận đơn quốc tế: ${trackingNumber}`,
      createdAt: new Date().toISOString(),
      createdBy: operator
    };

    this.transactions.unshift(tx);
    this.persist();

    return {
      success: true,
      message: `Đã khấu trừ ${amount.toLocaleString('vi-VN')} đ từ ví ${cust.customerCode}`,
      balanceAfter: deductRes.newBalance
    };
  }

  /**
   * 2. Khấu trừ tiền ví tự động khi tạo/in vận đơn (User-based)
   */
  static deductShipmentFee(userId: string, amount: number, trackingNumber: string, operator: UserAccount): { success: boolean; message: string; balanceAfter?: number } {
    const user = AuthService.getUserById(userId);
    if (!user) return { success: false, message: 'Không tìm thấy tài khoản để trừ tiền' };

    const updateRes = AuthService.updateUserWallet(userId, -amount, `Trừ cước vận đơn ${trackingNumber}`, operator);
    if (!updateRes.success) return { success: false, message: updateRes.message };

    const tx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      userId: user.id,
      username: user.username,
      customerCode: user.customerCode,
      type: 'DEDUCT_SHIPMENT',
      amount: -amount,
      balanceAfter: updateRes.newBalance,
      shipmentTracking: trackingNumber,
      note: `Trừ tiền cước vận đơn quốc tế: ${trackingNumber}`,
      createdAt: new Date().toISOString(),
      createdBy: operator.username
    };

    this.transactions.unshift(tx);
    this.persist();
    return { success: true, message: 'Đã trừ cước vận đơn thành công', balanceAfter: updateRes.newBalance };
  }

  /**
   * 3. Báo cáo Doanh thu, Chi phí trả hãng bay & Lợi nhuận ròng PandaLex
   */
  static getFinancialSummary(): FinancialSummary {
    const shipments = ShipmentRepository.getAll();
    const users = AuthService.getUsers();

    let totalRevenue = 0;
    let totalCarrierCost = 0;
    let totalWeight = 0;
    let totalPaidRevenue = 0;
    let totalUnpaidDebt = 0;

    for (const s of shipments) {
      totalWeight += s.totalWeightKg;
      const sell = s.sellPrice || (s.chargeableWeightKg ? Math.round(s.chargeableWeightKg * 275000) : Math.round(s.totalWeightKg * 275000));
      const cost = s.costPrice || (s.chargeableWeightKg ? Math.round(s.chargeableWeightKg * 220000) : Math.round(s.totalWeightKg * 220000));

      totalCarrierCost += cost;
      totalRevenue += sell;

      if (s.paymentStatus === 'PAID') {
        totalPaidRevenue += sell;
      } else {
        totalUnpaidDebt += sell;
      }
    }

    const grossProfit = totalRevenue - totalCarrierCost;
    const profitMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000) / 10 : 0;
    const walletBalanceTotal = users.reduce((sum, u) => sum + (u.walletBalance > 0 ? u.walletBalance : 0), 0);

    return {
      totalRevenue,
      totalCarrierCost,
      grossProfit,
      profitMarginPercent,
      totalPaidRevenue,
      totalUnpaidDebt,
      totalShipmentsCount: shipments.length,
      totalWeightKg: Math.round(totalWeight * 10) / 10,
      walletBalanceTotal
    };
  }

  static getTransactions(userId?: string): WalletTransaction[] {
    if (userId) {
      return this.transactions.filter(t => t.userId === userId || t.username === userId);
    }
    return this.transactions;
  }

  /**
   * 4. Ghi nhận thanh toán vận đơn (Cổng 1: Đã thanh toán)
   */
  static confirmShipmentPayment(
    shipmentId: string,
    amount: number,
    paymentMethod: string = 'Tiền mặt / Chuyển khoản',
    operator: string = 'ketoan'
  ): { success: boolean; message: string; shipment?: any } {
    const s = ShipmentRepository.getById(shipmentId);
    if (!s) return { success: false, message: 'Không tìm thấy vận đơn: ' + shipmentId };

    const updated = ShipmentRepository.updateFinancialGate(s.shipmentId, {
      isPaid: true,
      paidAt: new Date().toISOString(),
      paidMethod: paymentMethod
    });

    AuthService.logAction({
      userId: operator,
      username: operator,
      userRole: 'ACCOUNTANT',
      action: 'CONFIRM_PAYMENT',
      targetId: s.masterTrackingNumber || s.shipmentId,
      details: `Kế toán xác nhận thu ${amount.toLocaleString('vi-VN')} đ qua ${paymentMethod}`,
      hub: s.hub || 'SGN'
    });

    return {
      success: true,
      message: `✅ Đã xác nhận thanh toán thành công cho vận đơn ${s.masterTrackingNumber || s.shipmentId}!`,
      shipment: updated
    };
  }

  /**
   * 5. Khấu trừ ví / Cấn trừ công nợ vận đơn (Cổng 2: Đã trừ tiền)
   */
  static deductShipmentFeeFromCustomer(
    shipmentId: string,
    operator: string = 'ketoan'
  ): { success: boolean; message: string; balanceAfter?: number; shipment?: any } {
    const s = ShipmentRepository.getById(shipmentId);
    if (!s) return { success: false, message: 'Không tìm thấy vận đơn: ' + shipmentId };

    const costToDeduct = s.sellPrice || (s.chargeableWeightKg ? Math.round(s.chargeableWeightKg * 275000) : 275000);
    const custCode = s.customerCode || 'PDL-GUEST';

    // Thử khấu trừ ví khách hàng
    const deductRes = this.recordCustomerDeduction(custCode, costToDeduct, s.masterTrackingNumber, operator);

    // Cập nhật trạng thái trừ tiền
    const updated = ShipmentRepository.updateFinancialGate(s.shipmentId, {
      isDeducted: true,
      deductedAt: new Date().toISOString(),
      deductedAmount: costToDeduct
    });

    return {
      success: true,
      message: `✅ Đã khấu trừ thành công ${costToDeduct.toLocaleString('vi-VN')} đ cho vận đơn ${s.masterTrackingNumber}!`,
      balanceAfter: deductRes.balanceAfter,
      shipment: updated
    };
  }

  /**
   * 6. Ghi nhận cam kết từ khách hàng (Cổng 3: Cam kết từ khách hàng)
   */
  static recordCustomerCommitment(
    shipmentId: string,
    committedBy: string,
    note?: string
  ): { success: boolean; message: string; shipment?: any } {
    const s = ShipmentRepository.getById(shipmentId);
    if (!s) return { success: false, message: 'Không tìm thấy vận đơn: ' + shipmentId };

    const updated = ShipmentRepository.updateFinancialGate(s.shipmentId, {
      isCustomerCommitted: true,
      committedAt: new Date().toISOString(),
      committedBy: committedBy || s.customerName || 'Khách hàng',
      commitmentNote: note || 'Khách hàng cam kết chịu toàn bộ trách nhiệm về tính chính xác của hàng hóa, biểu thuế và phụ phí hải quan tại nước đến'
    });

    return {
      success: true,
      message: `✅ Đã ghi nhận cam kết trách nhiệm từ khách hàng cho vận đơn ${s.masterTrackingNumber}!`,
      shipment: updated
    };
  }

  /**
   * 7. Duyệt trọn gói tài chính & Cam kết khách hàng (Quick 3-Condition Pass)
   * Kế toán / Điều phối duyệt nhanh một chạm khi đã có bảo lãnh / chứng từ đầy đủ
   */
  static quickApproveFinancialGate(
    shipmentId: string,
    operator: string = 'ketoan',
    reason: string = 'Kế toán xác nhận duyệt tài chính và cam kết khách hàng'
  ): { success: boolean; message: string; shipment?: any } {
    const s = ShipmentRepository.getById(shipmentId);
    if (!s) return { success: false, message: 'Không tìm thấy vận đơn: ' + shipmentId };

    const sell = s.sellPrice || (s.chargeableWeightKg ? Math.round(s.chargeableWeightKg * 275000) : 275000);
    const now = new Date().toISOString();

    const updated = ShipmentRepository.updateFinancialGate(s.shipmentId, {
      isPaid: true,
      paidAt: now,
      paidMethod: 'Duyệt bảo lãnh / Tiền mặt / Ví',
      isDeducted: true,
      deductedAt: now,
      deductedAmount: sell,
      isCustomerCommitted: true,
      committedAt: now,
      committedBy: s.customerName || operator,
      commitmentNote: reason
    });

    AuthService.logAction({
      userId: operator,
      username: operator,
      userRole: 'ACCOUNTANT',
      action: 'QUICK_FINANCE_APPROVE',
      targetId: s.masterTrackingNumber || s.shipmentId,
      details: `Duyệt trọn gói 3 điều kiện tài chính (Đã TT, Đã trừ tiền, Có cam kết) cho vận đơn ${s.masterTrackingNumber}: ${reason}`,
      hub: s.hub || 'SGN'
    });

    return {
      success: true,
      message: `✅ Đã phê duyệt đủ 3 điều kiện tài chính! Vận đơn ${s.masterTrackingNumber} đã chuyển sang KHO CHỜ XUẤT.`,
      shipment: updated
    };
  }

  /**
   * 8. Lập Phiếu Thu Tiền Chính Thức (Receipt Voucher) - Phân hệ Tài Chính
   * Cho phép Kế toán chọn Kênh Thanh Toán (Tiền mặt / Chuyển khoản / Trừ ví / Công nợ) và phát hành phiếu thu
   */
  static createReceiptVoucher(params: {
    type: 'SHIPMENT_FEE' | 'CUSTOMER_DEBT' | 'WALLET_TOPUP';
    shipmentId?: string;
    trackingNumber?: string;
    customerCode: string;
    customerName?: string;
    amount: number;
    paymentChannel: 'CASH' | 'BANK_TRANSFER' | 'WALLET' | 'POSTPAID_CONTRACT';
    paymentChannelName?: string;
    bankAccount?: string;
    referenceCode?: string;
    payerName?: string;
    payerPhone?: string;
    reason?: string;
    hub?: 'HAN' | 'SGN' | 'DAD';
    operator?: string;
  }): { success: boolean; message: string; voucher?: ReceiptVoucher; shipment?: any } {
    if (!params.amount || params.amount <= 0) {
      return { success: false, message: 'Số tiền thu phải lớn hơn 0' };
    }

    const op = params.operator || 'ketoan';
    const hub = params.hub || 'SGN';
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(this.vouchers.length + 1).padStart(4, '0');
    const voucherCode = `PT-${dateStr}-${seq}`;

    // Tên chuẩn kênh thanh toán
    let channelName = params.paymentChannelName;
    if (!channelName) {
      switch (params.paymentChannel) {
        case 'CASH': channelName = 'Tiền mặt tại quầy'; break;
        case 'BANK_TRANSFER': channelName = params.bankAccount ? `Chuyển khoản ${params.bankAccount}` : 'Chuyển khoản ngân hàng'; break;
        case 'WALLET': channelName = 'Khấu trừ ví điện tử ký quỹ'; break;
        case 'POSTPAID_CONTRACT': channelName = 'Ghi nợ hợp đồng trả sau'; break;
        default: channelName = 'Tiền mặt';
      }
    }

    // Tra cứu thông tin khách hàng
    const cust = CustomerService.getById(params.customerCode) || CustomerService.getByCode(params.customerCode);
    const custName = params.customerName || (cust ? (cust.customerName || (cust as any).name || cust.customerCode) : params.customerCode);

    let updatedShipment: any = null;

    // Xử lý theo từng loại phiếu thu:
    if (params.type === 'SHIPMENT_FEE') {
      const cleanId = params.shipmentId || params.trackingNumber;
      if (!cleanId) return { success: false, message: 'Thiếu mã vận đơn (AWB) để lập phiếu thu cước' };
      const s = ShipmentRepository.getById(cleanId);
      if (!s) return { success: false, message: `Không tìm thấy vận đơn: ${cleanId}` };

      // Ánh xạ kênh thanh toán sang Phân loại tài chính của vận đơn
      let mappedFinCat: 'IMMEDIATE' | 'POSTPAID' | 'WALLET' = 'IMMEDIATE';
      if (params.paymentChannel === 'WALLET') mappedFinCat = 'WALLET';
      else if (params.paymentChannel === 'POSTPAID_CONTRACT') mappedFinCat = 'POSTPAID';
      else mappedFinCat = 'IMMEDIATE';

      // Nếu chọn trừ ví điện tử: Thực hiện khấu trừ số dư ví
      if (params.paymentChannel === 'WALLET') {
        const deductRes = this.recordCustomerDeduction(params.customerCode, params.amount, s.masterTrackingNumber, op);
        if (!deductRes.success) {
          return { success: false, message: `Không thể trừ ví: ${deductRes.message}` };
        }
      }

      // Cập nhật trạng thái tài chính vận đơn
      s.financialCategory = mappedFinCat;
      s.paymentStatus = 'PAID';
      s.financialStatus = {
        ...s.financialStatus,
        isPaid: true,
        paidAt: now.toISOString(),
        paidMethod: channelName,
        isDeducted: true,
        deductedAt: now.toISOString(),
        deductedAmount: params.amount,
        isCustomerCommitted: true,
        committedAt: now.toISOString(),
        committedBy: params.payerName || custName,
        commitmentNote: `Lập phiếu thu ${voucherCode}: ${params.reason || 'Kế toán xác nhận nhận cước'}`,
        eligibleForDispatch: true,
        receiptVoucherCode: voucherCode
      };

      // Đơn hàng đủ 3 điều kiện -> chuyển sang Kho Chờ Xuất nếu đang ở trạng thái nhập kho
      if (s.status === 'INBOUND_RECEIVED' || s.status === 'PRINTED' || s.status === 'WAITING_FINANCE_DISPATCH') {
        s.status = 'WAITING_FINANCE_DISPATCH';
      }

      ShipmentRepository.save(s, `Lập phiếu thu ${voucherCode} qua kênh ${channelName}`);
      updatedShipment = s;
    } else if (params.type === 'CUSTOMER_DEBT') {
      // Thu công nợ khách hàng
      CustomerService.recordDebtPayment(params.customerCode, params.amount, `${voucherCode}: ${params.reason || 'Thu công nợ khách hàng'}`, op);
    } else if (params.type === 'WALLET_TOPUP') {
      // Nạp tiền ví trả trước
      this.recordCustomerTopup(params.customerCode, params.amount, channelName, params.referenceCode || voucherCode, params.reason || 'Nạp ví ký quỹ', op);
    }

    const voucher: ReceiptVoucher = {
      id: `vch_${Date.now()}`,
      voucherCode,
      type: params.type,
      shipmentId: params.shipmentId,
      trackingNumber: params.trackingNumber || updatedShipment?.masterTrackingNumber,
      customerCode: params.customerCode,
      customerName: custName,
      amount: params.amount,
      paymentChannel: params.paymentChannel,
      paymentChannelName: channelName,
      bankAccount: params.bankAccount,
      referenceCode: params.referenceCode,
      payerName: params.payerName || custName,
      payerPhone: params.payerPhone,
      reason: params.reason || (params.type === 'SHIPMENT_FEE' ? `Thu tiền cước vận chuyển đơn hàng ${params.trackingNumber || params.shipmentId}` : 'Thu tiền công nợ khách hàng'),
      hub,
      createdAt: now.toISOString(),
      createdBy: op
    };

    this.vouchers.unshift(voucher);
    this.persistVouchers();

    AuthService.logAction({
      userId: op,
      username: op,
      userRole: 'ACCOUNTANT',
      action: 'CREATE_RECEIPT_VOUCHER',
      targetId: voucherCode,
      details: `Lập phiếu thu ${voucherCode} số tiền ${params.amount.toLocaleString('vi-VN')} đ cho ${custName} qua kênh [${channelName}]`,
      hub
    });

    return {
      success: true,
      message: `🎉 Đã lập thành công Phiếu Thu ${voucherCode} (${params.amount.toLocaleString('vi-VN')} đ) qua kênh [${channelName}]!`,
      voucher,
      shipment: updatedShipment
    };
  }

  static getAllReceiptVouchers(filter?: {
    customerCode?: string;
    type?: string;
    channel?: string;
    hub?: string;
    keyword?: string;
  }): ReceiptVoucher[] {
    let list = [...this.vouchers];
    if (filter?.customerCode) {
      list = list.filter(v => v.customerCode.toUpperCase() === filter.customerCode!.toUpperCase());
    }
    if (filter?.type && filter.type !== 'ALL') {
      list = list.filter(v => v.type === filter.type);
    }
    if (filter?.channel && filter.channel !== 'ALL') {
      list = list.filter(v => v.paymentChannel === filter.channel);
    }
    if (filter?.hub && filter.hub !== 'ALL') {
      list = list.filter(v => v.hub === filter.hub);
    }
    if (filter?.keyword) {
      const kw = filter.keyword.trim().toUpperCase();
      list = list.filter(v =>
        v.voucherCode.includes(kw) ||
        (v.trackingNumber && v.trackingNumber.toUpperCase().includes(kw)) ||
        v.customerCode.toUpperCase().includes(kw) ||
        v.customerName.toUpperCase().includes(kw) ||
        (v.referenceCode && v.referenceCode.toUpperCase().includes(kw))
      );
    }
    return list;
  }

  static getReceiptVoucherByCode(code: string): ReceiptVoucher | undefined {
    const clean = code.trim().toUpperCase();
    return this.vouchers.find(v => v.voucherCode.toUpperCase() === clean || v.id === clean);
  }
}

FinanceService.init();
