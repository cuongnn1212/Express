import fs from 'fs';
import path from 'path';

export type CustomerType = 'PUBLIC_GUEST' | 'AGENT' | 'VIP' | 'REGULAR';
export type PaymentTerm = 'PREPAID' | 'POSTPAID'; // THANH TOÁN TIỀN NGAY (Prepaid) | THANH TOÁN SAU / CÔNG NỢ (Postpaid)

/**
 * 3 Phân loại tài chính nghiệp vụ PandaLex:
 * 1. IMMEDIATE: Khách hàng thanh toán ngay theo đơn (phải thanh toán mới in nhãn/xuất kho)
 * 2. PREPAID_WALLET: Khách hàng trả trước qua ví ký quỹ (nạp tiền trước, tự động trừ số dư ví theo đơn)
 * 3. POSTPAID_CONTRACT: Khách hàng có hợp đồng và trả sau (cấp hạn mức công nợ & chu kỳ chốt sổ)
 */
export type FinancialCategory = 'IMMEDIATE' | 'PREPAID_WALLET' | 'POSTPAID_CONTRACT';

/**
 * Trạng thái phê duyệt tài khoản khách hàng:
 * Bắt buộc xác nhận/phê duyệt trước khi xuất đơn
 */
export type CustomerApprovalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface Customer {
  id: string;
  customerCode: string; // MÃ KHÁCH HÀNG (Ví dụ: PDL-KH001, AG-002, VIP-105)
  customerName: string;
  representative?: string; // Người đại diện
  phone: string;
  email?: string;
  taxId?: string; // MST
  address: string;
  city?: string;
  hub: 'SGN' | 'HAN' | 'DAD'; // Chi nhánh kho quản lý
  bankAccount?: string; // Số tài khoản ngân hàng
  bankName?: string; // Tên ngân hàng
  customerType: CustomerType;
  financialCategory: FinancialCategory; // 3 Phân loại tài chính
  approvalStatus: CustomerApprovalStatus; // Trạng thái phê duyệt (Chờ duyệt / Đã duyệt)
  approvedBy?: string; // Kế toán / Admin duyệt
  approvedAt?: string; // Thời gian duyệt
  rejectedReason?: string; // Lý do từ chối nếu có
  paymentTerm: PaymentTerm; // Thanh toán ngay hay thanh toán sau (backward-compat)
  creditLimit: number; // Hạn mức công nợ tối đa (VNĐ)
  creditDays: number; // Chu kỳ công nợ (ngày)
  currentDebt: number; // Công nợ hiện tại đang nợ PandaLex (VNĐ)
  walletBalance: number; // Số dư ví trả trước (VNĐ)
  marginType: 'PERCENT' | 'FIXED' | 'PERCENT_AND_FIXED';
  marginPercent: number; // % lợi nhuận áp dụng khi tính cước
  marginFixedAmount: number; // Phí cố định cộng thêm (VNĐ)
  isActive: boolean;
  isApiEnabled?: boolean; // Khách hàng có quyền kết nối đẩy đơn qua API
  apiKey?: string; // Khóa API Public (VD: pdl_live_8f3a9b...)
  apiSecret?: string; // Khóa bí mật API Secret Token
  webhookUrl?: string; // Webhook nhận kết quả trạng thái từ PandaLex
  rateLimitRpm?: number; // Hạn mức request/phút (mặc định 60)
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export class CustomerService {
  private static filePath = path.join(process.cwd(), 'data', 'customers.json');
  private static customers: Customer[] = [];

  static init() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.customers = JSON.parse(raw);
        let changed = false;
        this.customers.forEach(c => {
          if (!c.financialCategory) {
            if (c.paymentTerm === 'POSTPAID') {
              c.financialCategory = 'POSTPAID_CONTRACT';
            } else if ((c.walletBalance && c.walletBalance > 0) || c.customerType === 'AGENT') {
              c.financialCategory = 'PREPAID_WALLET';
            } else {
              c.financialCategory = 'IMMEDIATE';
            }
            changed = true;
          }
          if (!c.approvalStatus) {
            c.approvalStatus = 'APPROVED';
            c.approvedBy = 'system';
            c.approvedAt = c.createdAt || new Date().toISOString();
            changed = true;
          }
        });
        if (changed) this.persist();
      } else {
        // Dữ liệu mẫu khởi điểm kế thừa từ hệ thống thực tế PandaLex
        this.customers = [
          {
            id: 'cust_guest',
            customerCode: 'PDL-GUEST',
            customerName: 'Khách vãng lai gửi tại quầy',
            representative: 'Khách lẻ',
            phone: '0976843168',
            email: 'hotro@pandalex.vn',
            address: 'Tân Bình, TP. Hồ Chí Minh',
            hub: 'SGN',
            customerType: 'PUBLIC_GUEST',
            financialCategory: 'IMMEDIATE', // 1. Khách thanh toán ngay theo đơn
            approvalStatus: 'APPROVED',
            approvedBy: 'system',
            approvedAt: '2026-01-01T00:00:00.000Z',
            paymentTerm: 'PREPAID',
            creditLimit: 0,
            creditDays: 0,
            currentDebt: 0,
            walletBalance: 0,
            marginType: 'PERCENT',
            marginPercent: 20.0,
            marginFixedAmount: 0,
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            notes: 'Khách vãng lai thanh toán tiền mặt hoặc chuyển khoản ngay khi gửi hàng'
          },
          {
            id: 'cust_annam',
            customerCode: 'AG-002',
            customerName: 'Đại lý Cấp 2 - An Nam Logistics',
            representative: 'Nguyễn Văn An',
            phone: '0912345678',
            email: 'annam@daily.vn',
            taxId: '0314567890',
            address: '158 Bạch Đằng, P.2, Q. Tân Bình, TP.HCM',
            hub: 'SGN',
            bankAccount: '19034567890123',
            bankName: 'Techcombank - CN Tân Bình',
            customerType: 'AGENT',
            financialCategory: 'PREPAID_WALLET', // 2. Khách trả trước qua ví nạp sẵn
            approvalStatus: 'APPROVED',
            approvedBy: 'admin',
            approvedAt: '2026-01-10T00:00:00.000Z',
            paymentTerm: 'PREPAID',
            creditLimit: 50000000,
            creditDays: 15,
            currentDebt: 0,
            walletBalance: 15500000, // Ví tiền nạp sẵn 15.5 triệu
            marginType: 'PERCENT_AND_FIXED',
            marginPercent: 8.0,
            marginFixedAmount: 50000,
            isActive: true,
            createdAt: '2026-01-10T00:00:00.000Z',
            updatedAt: '2026-01-10T00:00:00.000Z',
            notes: 'Đại lý uy tín nạp tiền trước vào ví, tự động khấu trừ theo đơn'
          },
          {
            id: 'cust_textile',
            customerCode: 'VIP-105',
            customerName: 'Tập đoàn Dệt May Sài Gòn (VIP)',
            representative: 'Phạm Thị Lan',
            phone: '0908765432',
            email: 'logistics@saigontextile.vn',
            taxId: '0301122334',
            address: 'Lô B2, KCN Tân Bình, Tây Thạnh, Tân Phú, TP.HCM',
            hub: 'SGN',
            bankAccount: '0071001234567',
            bankName: 'Vietcombank - CN TP.HCM',
            customerType: 'VIP',
            financialCategory: 'POSTPAID_CONTRACT', // 3. Hợp đồng trả sau / Công nợ
            approvalStatus: 'APPROVED',
            approvedBy: 'admin',
            approvedAt: '2026-02-01T00:00:00.000Z',
            paymentTerm: 'POSTPAID',
            creditLimit: 100000000, // 100 triệu
            creditDays: 30, // Chốt ngày cuối tháng
            currentDebt: 22400000, // Đang nợ 22.4 triệu
            walletBalance: 0,
            marginType: 'PERCENT',
            marginPercent: 10.0,
            marginFixedAmount: 0,
            isActive: true,
            createdAt: '2026-02-01T00:00:00.000Z',
            updatedAt: '2026-02-01T00:00:00.000Z',
            notes: 'Khách hàng VIP Hợp đồng số 26/2026/HD-PDL'
          },
          {
            id: 'cust_fba',
            customerCode: 'FBA-991',
            customerName: 'CrossBorder FBA Express (Amazon / Etsy)',
            representative: 'Đỗ Tuấn Kiệt',
            phone: '0988776655',
            email: 'seller@crossborder.vn',
            taxId: '0108998877',
            address: 'Tòa nhà Detech, Tôn Thất Thuyết, Cầu Giấy, Hà Nội',
            hub: 'HAN',
            customerType: 'AGENT',
            financialCategory: 'PREPAID_WALLET', // 2. Đại lý FBA nạp ví trước
            approvalStatus: 'APPROVED',
            approvedBy: 'admin',
            approvedAt: '2026-02-15T00:00:00.000Z',
            paymentTerm: 'PREPAID',
            creditLimit: 0,
            creditDays: 0,
            currentDebt: 0,
            walletBalance: 3200000,
            marginType: 'PERCENT_AND_FIXED',
            marginPercent: 7.0,
            marginFixedAmount: 100000,
            isActive: true,
            createdAt: '2026-02-15T00:00:00.000Z',
            updatedAt: '2026-02-15T00:00:00.000Z',
            notes: 'Khách chuyên tuyến gửi kho FBA Mỹ/Úc'
          },
          {
            id: 'cust_ret008',
            customerCode: 'RET-008',
            customerName: 'Tiệm Trà & Nông Sản Đặc Sản Việt',
            representative: 'Vũ Minh Thu',
            phone: '0933221100',
            email: 'trahoaviet@gmail.com',
            address: '45 Hàng Gai, Hoàn Kiếm, Hà Nội',
            hub: 'HAN',
            customerType: 'REGULAR',
            financialCategory: 'IMMEDIATE', // 1. Khách sỉ thanh toán ngay theo đơn
            approvalStatus: 'APPROVED',
            approvedBy: 'admin',
            approvedAt: '2026-03-01T00:00:00.000Z',
            paymentTerm: 'PREPAID',
            creditLimit: 0,
            creditDays: 0,
            currentDebt: 0,
            walletBalance: 0,
            marginType: 'PERCENT_AND_FIXED',
            marginPercent: 25.0,
            marginFixedAmount: 30000,
            isActive: true,
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
            notes: 'Gửi quà biếu thực phẩm sấy khô đi Mỹ, Nhật, Đài Loan'
          }
        ];
        this.persist();
      }
    } catch (e) {
      console.error('Lỗi khởi tạo CustomerService:', e);
      this.customers = [];
    }
  }

  private static persist() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.customers, null, 2), 'utf-8');
    } catch (e) {
      console.error('Lỗi ghi customers.json:', e);
    }
  }

  static getAll(): Customer[] {
    return this.customers;
  }

  static getById(id: string): Customer | undefined {
    return this.customers.find(c => c.id === id);
  }

  static getByCode(code: string): Customer | undefined {
    if (!code) return undefined;
    const clean = code.trim().toUpperCase();
    return this.customers.find(c => c.customerCode.toUpperCase() === clean);
  }

  /**
   * Tự động sinh Mã khách hàng kế tiếp theo chuẩn PandaLex (PDL-KH001, PDL-KH002, ...)
   */
  static generateNextCustomerCode(): string {
    const prefix = 'PDL-KH';
    const khList = this.customers.filter(c => c.customerCode.startsWith(prefix));
    let maxNum = 0;
    for (const c of khList) {
      const numPart = parseInt(c.customerCode.replace(prefix, ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
    const nextNum = maxNum + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  }

  /**
   * Thêm mới hoặc cập nhật Khách hàng
   * Quy định: Khách hàng mới tạo luôn ở trạng thái PENDING_APPROVAL trừ khi do Admin phê duyệt trực tiếp.
   */
  static saveCustomer(input: Partial<Customer>): Customer {
    let customerCode = (input.customerCode || '').trim().toUpperCase();
    if (!customerCode) {
      customerCode = this.generateNextCustomerCode();
    }

    const id = input.id || `cust_${Date.now()}`;
    const existingIdx = this.customers.findIndex(c => c.id === id || c.customerCode === customerCode);
    const isNew = existingIdx < 0;

    // Xác định phân loại tài chính (1. IMMEDIATE, 2. PREPAID_WALLET, 3. POSTPAID_CONTRACT)
    let finCat: FinancialCategory = input.financialCategory || 'IMMEDIATE';
    if (!input.financialCategory) {
      if (input.paymentTerm === 'POSTPAID') finCat = 'POSTPAID_CONTRACT';
      else if ((input.walletBalance && input.walletBalance > 0) || input.customerType === 'AGENT') finCat = 'PREPAID_WALLET';
      else finCat = 'IMMEDIATE';
    }

    const term: PaymentTerm = finCat === 'POSTPAID_CONTRACT' ? 'POSTPAID' : 'PREPAID';

    // Trạng thái phê duyệt: Khách tạo mới mặc định PENDING_APPROVAL (trừ khách mẫu guest)
    let appStatus: CustomerApprovalStatus = 'PENDING_APPROVAL';
    if (!isNew && this.customers[existingIdx]?.approvalStatus) {
      appStatus = input.approvalStatus || this.customers[existingIdx].approvalStatus;
    } else if (input.approvalStatus) {
      appStatus = input.approvalStatus;
    } else if (id === 'cust_guest' || customerCode === 'PDL-GUEST') {
      appStatus = 'APPROVED';
    }

    const fullCustomer: Customer = {
      id: existingIdx >= 0 ? this.customers[existingIdx].id : id,
      customerCode,
      customerName: (input.customerName || 'Khách hàng mới').trim(),
      representative: input.representative ? input.representative.trim() : '',
      phone: (input.phone || '').trim(),
      email: (input.email || '').trim(),
      taxId: (input.taxId || '').trim(),
      address: (input.address || '').trim(),
      city: (input.city || '').trim(),
      hub: input.hub || 'SGN',
      bankAccount: (input.bankAccount || '').trim(),
      bankName: (input.bankName || '').trim(),
      customerType: input.customerType || 'REGULAR',
      financialCategory: finCat,
      approvalStatus: appStatus,
      approvedBy: input.approvedBy || (existingIdx >= 0 ? this.customers[existingIdx].approvedBy : undefined),
      approvedAt: input.approvedAt || (existingIdx >= 0 ? this.customers[existingIdx].approvedAt : undefined),
      rejectedReason: input.rejectedReason || (existingIdx >= 0 ? this.customers[existingIdx].rejectedReason : undefined),
      paymentTerm: term,
      creditLimit: typeof input.creditLimit === 'number' ? input.creditLimit : parseFloat(String(input.creditLimit || 0)),
      creditDays: typeof input.creditDays === 'number' ? input.creditDays : parseInt(String(input.creditDays || 0), 10),
      currentDebt: existingIdx >= 0 ? this.customers[existingIdx].currentDebt : (input.currentDebt || 0),
      walletBalance: existingIdx >= 0 ? this.customers[existingIdx].walletBalance : (input.walletBalance || 0),
      marginType: input.marginType || 'PERCENT',
      marginPercent: typeof input.marginPercent === 'number' ? input.marginPercent : parseFloat(String(input.marginPercent || 0)),
      marginFixedAmount: typeof input.marginFixedAmount === 'number' ? input.marginFixedAmount : parseFloat(String(input.marginFixedAmount || 0)),
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
      isApiEnabled: Boolean(input.isApiEnabled),
      apiKey: input.isApiEnabled ? (input.apiKey || (existingIdx >= 0 ? this.customers[existingIdx].apiKey : undefined) || this.generateApiCredentials().apiKey) : undefined,
      apiSecret: input.isApiEnabled ? (input.apiSecret || (existingIdx >= 0 ? this.customers[existingIdx].apiSecret : undefined) || this.generateApiCredentials().apiSecret) : undefined,
      webhookUrl: input.webhookUrl ? input.webhookUrl.trim() : (existingIdx >= 0 ? this.customers[existingIdx].webhookUrl : undefined),
      rateLimitRpm: input.rateLimitRpm || (existingIdx >= 0 ? this.customers[existingIdx].rateLimitRpm : 60),
      createdAt: existingIdx >= 0 ? this.customers[existingIdx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: (input.notes || '').trim()
    };

    if (existingIdx >= 0) {
      this.customers[existingIdx] = fullCustomer;
    } else {
      this.customers.push(fullCustomer);
    }

    this.persist();
    return fullCustomer;
  }

  /**
   * Sinh bộ khóa API Key & Secret Token ngẫu nhiên
   */
  static generateApiCredentials(): { apiKey: string; apiSecret: string } {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return {
      apiKey: `pdl_live_${rand(16)}`,
      apiSecret: `sec_${rand(32)}`
    };
  }

  /**
   * Tìm khách hàng theo API Key
   */
  static getByApiKey(apiKey: string): Customer | undefined {
    if (!apiKey) return undefined;
    return this.customers.find(c => c.isApiEnabled && c.apiKey === apiKey);
  }

  /**
   * Tái tạo / Đổi mới API Key cho khách hàng
   */
  static regenerateApiKey(idOrCode: string): { success: boolean; message: string; apiKey?: string; apiSecret?: string; customer?: Customer } {
    const cust = this.getById(idOrCode) || this.getByCode(idOrCode);
    if (!cust) return { success: false, message: 'Không tìm thấy khách hàng' };
    const creds = this.generateApiCredentials();
    cust.isApiEnabled = true;
    cust.apiKey = creds.apiKey;
    cust.apiSecret = creds.apiSecret;
    cust.updatedAt = new Date().toISOString();
    this.persist();
    return {
      success: true,
      message: `Đã cấp/tái tạo API Key thành công cho ${cust.customerCode}`,
      apiKey: cust.apiKey,
      apiSecret: cust.apiSecret,
      customer: cust
    };
  }

  /**
   * Phê duyệt tài khoản khách hàng (Xác nhận từ Kế toán / Quản lý)
   */
  static approveCustomer(idOrCode: string, operator: string = 'admin'): { success: boolean; message: string; customer?: Customer } {
    const cust = this.getById(idOrCode) || this.getByCode(idOrCode);
    if (!cust) return { success: false, message: 'Không tìm thấy khách hàng' };

    cust.approvalStatus = 'APPROVED';
    cust.approvedBy = operator;
    cust.approvedAt = new Date().toISOString();
    cust.updatedAt = new Date().toISOString();
    this.persist();

    return {
      success: true,
      message: `Đã phê duyệt tài khoản khách hàng ${cust.customerCode} (${cust.customerName})`,
      customer: cust
    };
  }

  /**
   * Từ chối phê duyệt khách hàng
   */
  static rejectCustomer(idOrCode: string, reason: string = 'Hồ sơ chưa đạt yêu cầu', operator: string = 'admin'): { success: boolean; message: string; customer?: Customer } {
    const cust = this.getById(idOrCode) || this.getByCode(idOrCode);
    if (!cust) return { success: false, message: 'Không tìm thấy khách hàng' };

    cust.approvalStatus = 'REJECTED';
    cust.rejectedReason = reason;
    cust.approvedBy = operator;
    cust.approvedAt = new Date().toISOString();
    cust.updatedAt = new Date().toISOString();
    this.persist();

    return {
      success: true,
      message: `Đã từ chối tài khoản khách hàng ${cust.customerCode}: ${reason}`,
      customer: cust
    };
  }

  /**
   * Nạp tiền vào ví trả trước (Top-up Wallet)
   */
  static topupWallet(
    customerCode: string,
    amount: number,
    paymentMethod: string = 'Chuyển khoản',
    reference: string = '',
    note: string = '',
    operator: string = 'ketoan'
  ): { success: boolean; message: string; newBalance: number; customer?: Customer } {
    const cust = this.getById(customerCode) || this.getByCode(customerCode);
    if (!cust) return { success: false, message: 'Không tìm thấy khách hàng với mã/id: ' + customerCode, newBalance: 0 };
    if (amount <= 0) return { success: false, message: 'Số tiền nạp ví phải lớn hơn 0', newBalance: cust.walletBalance };

    cust.walletBalance = (cust.walletBalance || 0) + amount;
    // Nếu trước đó là IMMEDIATE nhưng khách chủ động nạp ví, có thể tự động nâng cấp sang PREPAID_WALLET
    if (cust.financialCategory === 'IMMEDIATE') {
      cust.financialCategory = 'PREPAID_WALLET';
    }
    cust.updatedAt = new Date().toISOString();
    this.persist();

    return {
      success: true,
      message: `Đã nạp thành công ${amount.toLocaleString('vi-VN')} đ vào ví khách hàng ${cust.customerCode}. Số dư mới: ${cust.walletBalance.toLocaleString('vi-VN')} đ`,
      newBalance: cust.walletBalance,
      customer: cust
    };
  }

  /**
   * Khấu trừ tiền ví khi xuất đơn
   */
  static deductWallet(customerCode: string, amount: number): { success: boolean; message: string; newBalance: number } {
    const cust = this.getById(customerCode) || this.getByCode(customerCode);
    if (!cust) return { success: false, message: 'Không tìm thấy khách hàng', newBalance: 0 };
    if (cust.walletBalance < amount) {
      return {
        success: false,
        message: `Số dư ví không đủ! Hiện có: ${cust.walletBalance.toLocaleString('vi-VN')} đ < Cần trừ: ${amount.toLocaleString('vi-VN')} đ`,
        newBalance: cust.walletBalance
      };
    }
    cust.walletBalance -= amount;
    cust.updatedAt = new Date().toISOString();
    this.persist();
    return {
      success: true,
      message: `Đã khấu trừ ${amount.toLocaleString('vi-VN')} đ từ ví ${cust.customerCode}`,
      newBalance: cust.walletBalance
    };
  }

  /**
   * Xóa khách hàng
   */
  static deleteCustomer(id: string): boolean {
    if (id === 'cust_guest' || id === 'PDL-GUEST') return false; // Không xóa khách vãng lai mặc định
    const prevLen = this.customers.length;
    this.customers = this.customers.filter(c => c.id !== id && c.customerCode !== id);
    if (this.customers.length !== prevLen) {
      this.persist();
      return true;
    }
    return false;
  }

  /**
   * Kiểm tra xem khách có được phép tạo đơn hay không theo 3 Phân loại tài chính:
   * 1. IMMEDIATE: Cho phép tạo nhưng đơn UNPAID, bắt buộc thanh toán mới in nhãn/xuất kho.
   * 2. PREPAID_WALLET: Bắt buộc số dư ví >= tiền cước.
   * 3. POSTPAID_CONTRACT: Kiểm tra nợ hiện tại + cước <= hạn mức nợ.
   */
  static checkCreditAvailability(customerCode: string, shipmentAmount: number): {
    allowed: boolean;
    reason?: string;
    financialCategory?: FinancialCategory;
    approvalStatus?: CustomerApprovalStatus;
    currentDebt: number;
    creditLimit: number;
    remainingCredit: number;
    walletBalance: number;
  } {
    const cust = this.getById(customerCode) || this.getByCode(customerCode);
    if (!cust) {
      return {
        allowed: false,
        reason: 'Không tìm thấy thông tin khách hàng trong hệ thống',
        currentDebt: 0,
        creditLimit: 0,
        remainingCredit: 0,
        walletBalance: 0
      };
    }

    // 0. Bắt buộc kiểm tra phê duyệt tài khoản
    if (cust.approvalStatus === 'PENDING_APPROVAL') {
      return {
        allowed: false,
        reason: `Tài khoản khách hàng ${cust.customerCode} (${cust.customerName}) đang ở trạng thái [CHỜ PHÊ DUYỆT]. Vui lòng để Kế toán/Quản lý phê duyệt tài khoản trước khi tiếp tục!`,
        financialCategory: cust.financialCategory,
        approvalStatus: cust.approvalStatus,
        currentDebt: cust.currentDebt,
        creditLimit: cust.creditLimit,
        remainingCredit: 0,
        walletBalance: cust.walletBalance
      };
    }

    if (cust.approvalStatus === 'REJECTED') {
      return {
        allowed: false,
        reason: `Tài khoản khách hàng ${cust.customerCode} đã bị [TỪ CHỐI]: ${cust.rejectedReason || 'Hồ sơ không hợp lệ'}`,
        financialCategory: cust.financialCategory,
        approvalStatus: cust.approvalStatus,
        currentDebt: cust.currentDebt,
        creditLimit: cust.creditLimit,
        remainingCredit: 0,
        walletBalance: cust.walletBalance
      };
    }

    // 1. Phân loại 1: Khách hàng thanh toán ngay (IMMEDIATE)
    if (cust.financialCategory === 'IMMEDIATE') {
      return {
        allowed: true,
        reason: 'Khách hàng thanh toán ngay: Đơn sẽ ở trạng thái CHƯA THANH TOÁN (UNPAID). Bắt buộc thanh toán cước để mở khóa In tem nhãn và Điều phối xuất kho.',
        financialCategory: cust.financialCategory,
        approvalStatus: cust.approvalStatus,
        currentDebt: 0,
        creditLimit: 0,
        remainingCredit: 0,
        walletBalance: cust.walletBalance
      };
    }

    // 2. Phân loại 2: Khách hàng trả trước qua ví ký quỹ (PREPAID_WALLET)
    if (cust.financialCategory === 'PREPAID_WALLET') {
      if (cust.walletBalance < shipmentAmount) {
        return {
          allowed: false,
          reason: `Số dư ví không đủ để thanh toán cước! Số dư hiện tại: ${cust.walletBalance.toLocaleString('vi-VN')} đ < Tiền cước: ${shipmentAmount.toLocaleString('vi-VN')} đ. Vui lòng nạp thêm tối thiểu ${(shipmentAmount - cust.walletBalance).toLocaleString('vi-VN')} đ vào ví trước khi tạo đơn.`,
          financialCategory: cust.financialCategory,
          approvalStatus: cust.approvalStatus,
          currentDebt: 0,
          creditLimit: 0,
          remainingCredit: 0,
          walletBalance: cust.walletBalance
        };
      }
      return {
        allowed: true,
        reason: `Đủ số dư ví (${cust.walletBalance.toLocaleString('vi-VN')} đ). Hệ thống sẽ tự động trừ ${(shipmentAmount).toLocaleString('vi-VN')} đ khi xuất đơn.`,
        financialCategory: cust.financialCategory,
        approvalStatus: cust.approvalStatus,
        currentDebt: 0,
        creditLimit: 0,
        remainingCredit: 0,
        walletBalance: cust.walletBalance
      };
    }

    // 3. Phân loại 3: Khách hàng có hợp đồng và trả sau (POSTPAID_CONTRACT)
    const remainingCredit = (cust.creditLimit || 0) - (cust.currentDebt || 0);
    if ((cust.currentDebt || 0) + shipmentAmount > (cust.creditLimit || 0)) {
      return {
        allowed: false,
        reason: `Vượt quá hạn mức công nợ được cấp! Nợ hiện tại: ${(cust.currentDebt || 0).toLocaleString('vi-VN')} đ + Đơn mới: ${shipmentAmount.toLocaleString('vi-VN')} đ > Hạn mức: ${(cust.creditLimit || 0).toLocaleString('vi-VN')} đ. Vui lòng đối soát thanh toán trước khi tạo thêm đơn.`,
        financialCategory: cust.financialCategory,
        approvalStatus: cust.approvalStatus,
        currentDebt: cust.currentDebt,
        creditLimit: cust.creditLimit,
        remainingCredit,
        walletBalance: cust.walletBalance
      };
    }

    return {
      allowed: true,
      financialCategory: cust.financialCategory,
      approvalStatus: cust.approvalStatus,
      currentDebt: cust.currentDebt,
      creditLimit: cust.creditLimit,
      remainingCredit,
      walletBalance: cust.walletBalance
    };
  }

  /**
   * Ghi nhận công nợ đơn hàng khi xuất vận đơn thanh toán sau
   */
  static recordShipmentDebt(customerCode: string, amount: number, trackingNumber: string): { success: boolean; message: string; currentDebt: number } {
    const cust = this.getByCode(customerCode);
    if (!cust) return { success: false, message: 'Không tìm thấy khách hàng', currentDebt: 0 };

    cust.currentDebt = (cust.currentDebt || 0) + amount;
    cust.updatedAt = new Date().toISOString();
    this.persist();
    return {
      success: true,
      message: `Đã ghi nợ đơn hàng ${trackingNumber} số tiền ${amount.toLocaleString('vi-VN')} đ vào tài khoản ${cust.customerCode}`,
      currentDebt: cust.currentDebt
    };
  }

  /**
   * Thu tiền công nợ khách hàng (Kế toán ghi nhận phiếu thu)
   */
  static recordDebtPayment(customerCode: string, amount: number, note: string, operator: string): { success: boolean; message: string; currentDebt: number } {
    const cust = this.getByCode(customerCode);
    if (!cust) return { success: false, message: 'Không tìm thấy khách hàng', currentDebt: 0 };
    if (amount <= 0) return { success: false, message: 'Số tiền thanh toán phải lớn hơn 0', currentDebt: cust.currentDebt };

    cust.currentDebt = Math.max(0, (cust.currentDebt || 0) - amount);
    cust.updatedAt = new Date().toISOString();
    this.persist();

    return {
      success: true,
      message: `Đã thu công nợ ${amount.toLocaleString('vi-VN')} đ cho khách hàng ${cust.customerCode}. Dư nợ còn lại: ${cust.currentDebt.toLocaleString('vi-VN')} đ`,
      currentDebt: cust.currentDebt
    };
  }
}

// Khởi chạy nạp dữ liệu
CustomerService.init();
