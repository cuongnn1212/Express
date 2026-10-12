import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { AuthService } from '../auth/auth-service.js';
import { ShipmentRepository } from '../shipment/shipment-repository.js';
import { CustomerService } from '../customer/customer-service.js';
export class FinanceService {
    static txFile = path.join(process.cwd(), 'data', 'wallet_transactions.json');
    static voucherFile = path.join(process.cwd(), 'data', 'receipt_vouchers.json');
    static vendorDepositFile = path.join(process.cwd(), 'data', 'vendor_deposits.json');
    static categoryFile = path.join(process.cwd(), 'data', 'finance_categories.json');
    static paymentVoucherFile = path.join(process.cwd(), 'data', 'payment_vouchers.json');
    static transactions = [];
    static vouchers = [];
    static vendorDeposits = [];
    static categories = [];
    static paymentVouchers = [];
    static defaultCategories = [
        // Khoản Thu (REVENUE)
        { id: 'cat_rev_01', code: 'REV_AWB_CASH', name: 'Cước vận chuyển AWB (Tiền mặt / Tiền ngay)', type: 'REVENUE', description: 'Thu tiền cước AWB khách thanh toán tiền mặt tại quầy hoặc tài khoản', isDefault: true, isActive: true, order: 1 },
        { id: 'cat_rev_02', code: 'REV_CONTRACT_DEBT', name: 'Thu công nợ cước hợp đồng trả sau', type: 'REVENUE', description: 'Thu tiền quyết toán công nợ khách hàng hợp đồng theo kỳ', isDefault: true, isActive: true, order: 2 },
        { id: 'cat_rev_03', code: 'REV_WALLET_TOPUP', name: 'Nạp tiền ví đại lý trả trước (Top-Up)', type: 'REVENUE', description: 'Đại lý nạp tiền vào ví điện tử để trừ dần cước khi xuất kho', isDefault: true, isActive: true, order: 3 },
        { id: 'cat_rev_04', code: 'REV_VAS_FEE', name: 'Thu phí dịch vụ gia tăng (VAS)', type: 'REVENUE', description: 'Thu phí bốc xếp, đóng gỗ, hun trùng, kiểm dịch, bảo hiểm hàng hóa', isDefault: true, isActive: true, order: 4 },
        { id: 'cat_rev_05', code: 'REV_REWEIGH_DIFF', name: 'Thu chênh lệch tái cân (Reweigh surcharge)', type: 'REVENUE', description: 'Thu phụ phí do kích thước, cân nặng tăng sau khi cân đo thực tế', isDefault: true, isActive: true, order: 5 },
        { id: 'cat_rev_06', code: 'REV_REFUND_ADVANCE', name: 'Thu hoàn ứng / Thu hồi tạm ứng nhân viên', type: 'REVENUE', description: 'Hoàn trả tiền tạm ứng nghiệp vụ hoặc thu hồi công nợ', isDefault: true, isActive: true, order: 6 },
        { id: 'cat_rev_07', code: 'REV_OTHER', name: 'Thu các khoản thu nhập khác', type: 'REVENUE', description: 'Thu thanh lý tài sản, chênh lệch tỷ giá hoặc thu ngoài nghiệp vụ', isDefault: true, isActive: true, order: 7 },
        // Khoản Chi (EXPENSE)
        { id: 'cat_exp_01', code: 'EXP_CARRIER_COST', name: 'Chi cước gốc Nhà cung cấp / Hãng bay (Cost)', type: 'EXPENSE', description: 'Chi trả tiền cước gốc cho UPS, FedEx, DHL, SF Express theo AWB', isDefault: true, isActive: true, order: 1 },
        { id: 'cat_exp_02', code: 'EXP_CUSTOMS_CLEARANCE', name: 'Chi phí Hải quan, kiểm tra chuyên ngành & hun trùng', type: 'EXPENSE', description: 'Chi phí mở tờ khai hải quan, kiểm tra chất lượng, chứng thư kiểm dịch', isDefault: true, isActive: true, order: 2 },
        { id: 'cat_exp_03', code: 'EXP_FIRST_MILE_TRUCKING', name: 'Chi phí vận chuyển nội địa & xe trung chuyển sân bay', type: 'EXPENSE', description: 'Chi phí xe tải gom hàng first-mile, trung chuyển ra sân bay Nội Bài/Tân Sơn Nhất', isDefault: true, isActive: true, order: 3 },
        { id: 'cat_exp_04', code: 'EXP_PACKAGING_SUPPLIES', name: 'Chi mua bao bì, thùng carton, màng PE & tem nhãn', type: 'EXPENSE', description: 'Chi phí mua vật tư phục vụ đóng gói và in ấn mã vạch AWB', isDefault: true, isActive: true, order: 4 },
        { id: 'cat_exp_05', code: 'EXP_WAREHOUSE_RENTAL', name: 'Chi thuê mặt bằng, điện nước & bến bãi kho', type: 'EXPENSE', description: 'Chi phí tiền thuê kho bãi, điện 3 pha, internet, bảo vệ kho', isDefault: true, isActive: true, order: 5 },
        { id: 'cat_exp_06', code: 'EXP_SALARY_ALLOWANCE', name: 'Chi lương, thưởng & phụ cấp nhân viên', type: 'EXPENSE', description: 'Chi trả lương định kỳ, phụ cấp trực ca đêm, công tác phí', isDefault: true, isActive: true, order: 6 },
        { id: 'cat_exp_07', code: 'EXP_SHIPMENT_COMPENSATION', name: 'Chi bồi thường mất mát, hư hỏng bưu gửi AWB', type: 'EXPENSE', description: 'Chi bồi hoàn cho khách hàng khi hàng hóa gặp sự cố theo chính sách', isDefault: true, isActive: true, order: 7 },
        { id: 'cat_exp_08', code: 'EXP_ADMIN_OFFICE', name: 'Chi văn phòng phẩm & phần mềm quản lý', type: 'EXPENSE', description: 'Chi phí giấy in nhiệt, văn phòng phẩm, server cloud, bảo trì', isDefault: true, isActive: true, order: 8 },
        { id: 'cat_exp_09', code: 'EXP_MARKETING_CLIENT', name: 'Chi tiếp khách & phát triển khách hàng', type: 'EXPENSE', description: 'Chi phí tiếp khách đối tác hãng bay, đại lý cấp 1 và khách hàng VIP', isDefault: true, isActive: true, order: 9 },
        { id: 'cat_exp_10', code: 'EXP_OTHER', name: 'Chi các khoản chi phí hoạt động khác', type: 'EXPENSE', description: 'Chi sửa chữa phương tiện, trang thiết bị kho và chi phí vãng lai', isDefault: true, isActive: true, order: 10 }
    ];
    static init() {
        try {
            const dir = path.dirname(this.txFile);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            if (fs.existsSync(this.txFile)) {
                this.transactions = JSON.parse(fs.readFileSync(this.txFile, 'utf-8'));
            }
            else {
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
            }
            else {
                this.vouchers = [
                    {
                        id: 'vch_init_001',
                        voucherCode: 'PT-20261008-0001',
                        type: 'WALLET_TOPUP',
                        categoryCode: 'REV_WALLET_TOPUP',
                        categoryName: 'Nạp tiền ví đại lý trả trước (Top-Up)',
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
            // Khởi tạo danh mục thu - chi có sẵn
            if (fs.existsSync(this.categoryFile)) {
                this.categories = JSON.parse(fs.readFileSync(this.categoryFile, 'utf-8'));
            }
            else {
                this.categories = [...this.defaultCategories];
                this.persistCategories();
            }
            // Khởi tạo danh sách phiếu chi
            if (fs.existsSync(this.paymentVoucherFile)) {
                this.paymentVouchers = JSON.parse(fs.readFileSync(this.paymentVoucherFile, 'utf-8'));
            }
            else {
                this.paymentVouchers = [
                    {
                        id: 'pc_init_001',
                        voucherCode: 'PC-20261005-0001',
                        type: 'AWB_EXPENSE',
                        categoryCode: 'EXP_CARRIER_COST',
                        categoryName: 'Chi cước gốc Nhà cung cấp / Hãng bay (Cost)',
                        trackingNumber: '1Z999AA10123456784',
                        vendorCode: 'UPS',
                        recipientName: 'UPS Express Worldwide',
                        amount: 1850000,
                        paymentMethod: 'BANK_TRANSFER',
                        paymentMethodName: 'Chuyển khoản Vietcombank',
                        bankAccount: 'Vietcombank - 00110049281',
                        referenceCode: 'UNC-VCB-99120',
                        reason: 'Thanh toán cước gốc vận đơn AWB 1Z999AA10123456784 tuyến HAN-JFK',
                        attachedDocCount: 1,
                        hub: 'HAN',
                        createdAt: '2026-10-05T09:30:00.000Z',
                        createdBy: 'ketoan'
                    },
                    {
                        id: 'pc_init_002',
                        voucherCode: 'PC-20261007-0002',
                        type: 'GENERAL_EXPENSE',
                        categoryCode: 'EXP_PACKAGING_SUPPLIES',
                        categoryName: 'Chi mua bao bì, thùng carton, màng PE & tem nhãn',
                        recipientName: 'Công ty Bao Bì Song Long',
                        recipientPhone: '0988112233',
                        amount: 4500000,
                        paymentMethod: 'CASH',
                        paymentMethodName: 'Tiền mặt tại quỹ',
                        referenceCode: 'HD-SL-88192',
                        reason: 'Mua 500 thùng carton 5 lớp xuất khẩu và 20 cuộn màng quấn PE',
                        attachedDocCount: 2,
                        hub: 'SGN',
                        createdAt: '2026-10-07T14:15:00.000Z',
                        createdBy: 'ketoan'
                    }
                ];
                this.persistPaymentVouchers();
            }
            // Khởi tạo danh sách nạp tiền ký quỹ Nhà Cung Cấp (PandaLex nạp vào Hãng)
            if (fs.existsSync(this.vendorDepositFile)) {
                this.vendorDeposits = JSON.parse(fs.readFileSync(this.vendorDepositFile, 'utf-8'));
            }
            else {
                this.vendorDeposits = [
                    {
                        id: 'vd_init_ups',
                        depositCode: 'VD-20261001-0001',
                        vendorCode: 'UPS',
                        vendorName: 'UPS Express Worldwide',
                        amount: 200000000,
                        paymentMethod: 'Ủy nhiệm chi Vietcombank',
                        referenceCode: 'UNC-VCB-992182',
                        depositPurpose: 'PandaLex nạp ký quỹ duy trì tài khoản cước UPS đầu tháng 10/2026',
                        balanceAfter: 200000000,
                        operator: 'ketoan',
                        createdAt: '2026-10-01T08:30:00.000Z',
                        notes: 'Hợp đồng PDL-UPS-849102'
                    },
                    {
                        id: 'vd_init_fdx',
                        depositCode: 'VD-20261001-0002',
                        vendorCode: 'FEDEX',
                        vendorName: 'FedEx Express',
                        amount: 150000000,
                        paymentMethod: 'Ủy nhiệm chi Techcombank',
                        referenceCode: 'UNC-TCB-551029',
                        depositPurpose: 'PandaLex nạp ký quỹ cước bay FedEx International Priority',
                        balanceAfter: 150000000,
                        operator: 'ketoan',
                        createdAt: '2026-10-02T09:15:00.000Z',
                        notes: 'Hợp đồng PDL-FDX-774201'
                    },
                    {
                        id: 'vd_init_dhl',
                        depositCode: 'VD-20261001-0003',
                        vendorCode: 'DHL',
                        vendorName: 'DHL Express',
                        amount: 100000000,
                        paymentMethod: 'Ủy nhiệm chi Vietcombank',
                        referenceCode: 'UNC-VCB-331049',
                        depositPurpose: 'PandaLex nạp ký quỹ duy trì code DHL Express',
                        balanceAfter: 100000000,
                        operator: 'ketoan',
                        createdAt: '2026-10-03T10:00:00.000Z',
                        notes: 'Hợp đồng PDL-DHL-552190'
                    }
                ];
                this.persistVendorDeposits();
            }
        }
        catch (e) {
            console.error('Lỗi khởi tạo FinanceService:', e);
        }
    }
    static persist() {
        fs.writeFileSync(this.txFile, JSON.stringify(this.transactions, null, 2), 'utf-8');
    }
    static persistVouchers() {
        fs.writeFileSync(this.voucherFile, JSON.stringify(this.vouchers, null, 2), 'utf-8');
    }
    static persistVendorDeposits() {
        fs.writeFileSync(this.vendorDepositFile, JSON.stringify(this.vendorDeposits, null, 2), 'utf-8');
    }
    static persistCategories() {
        fs.writeFileSync(this.categoryFile, JSON.stringify(this.categories, null, 2), 'utf-8');
    }
    static persistPaymentVouchers() {
        fs.writeFileSync(this.paymentVoucherFile, JSON.stringify(this.paymentVouchers, null, 2), 'utf-8');
    }
    // =========================================================================
    // 🏢 PHÂN HỆ 1: NHÀ CUNG CẤP (NCC / CARRIERS - UPS, FEDEX, DHL...)
    // Đơn vị cung cấp giá gốc (Cost). PandaLex nạp tiền ký quỹ để cùng theo dõi với Hãng.
    // =========================================================================
    /**
     * Lấy danh sách tài khoản Nhà Cung Cấp kèm số dư ký quỹ thời gian thực
     */
    static getVendorAccounts() {
        const allShipments = ShipmentRepository.getAll();
        const vendorsConfig = [
            {
                code: 'UPS',
                name: 'UPS Express Worldwide',
                contract: 'PDL-UPS-849102',
                accountNumber: 'A849102',
                serviceType: 'UPS Express Saver / Expedited',
                creditLimit: 500000000,
                creditTermDays: 30,
                safeThreshold: 50000000
            },
            {
                code: 'FEDEX',
                name: 'FedEx Express',
                contract: 'PDL-FDX-774201',
                accountNumber: 'FX774201',
                serviceType: 'FedEx International Priority / Economy',
                creditLimit: 400000000,
                creditTermDays: 30,
                safeThreshold: 40000000
            },
            {
                code: 'DHL',
                name: 'DHL Express',
                contract: 'PDL-DHL-552190',
                accountNumber: 'DH552190',
                serviceType: 'DHL Express Worldwide',
                creditLimit: 300000000,
                creditTermDays: 30,
                safeThreshold: 30000000
            },
            {
                code: 'SF_EXPRESS',
                name: 'SF Express International',
                contract: 'PDL-SF-119283',
                accountNumber: 'SF119283',
                serviceType: 'SF International Standard',
                creditLimit: 200000000,
                creditTermDays: 15,
                safeThreshold: 20000000
            }
        ];
        return vendorsConfig.map(cfg => {
            // 1. Tổng tiền PandaLex đã nạp ký quỹ cho Hãng
            const deposits = this.vendorDeposits.filter(d => d.vendorCode.toUpperCase() === cfg.code);
            const totalDeposited = deposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);
            const lastDeposit = deposits[0];
            // 2. Tổng chi phí cước gốc (Cost) phát sinh thực tế từ các đơn xuất qua Hãng
            let totalCostIncurred = 0;
            let settledAmount = 0;
            allShipments.forEach(s => {
                const isDispatched = s.status === 'OUTBOUND_DISPATCHED' || s.status === 'DELIVERED';
                if (!isDispatched)
                    return;
                const carrierCode = (s.carrier || 'UPS').toUpperCase();
                if (carrierCode === cfg.code) {
                    const cost = Number(s.costPrice) || Math.round((s.sellPrice || 0) * 0.75);
                    totalCostIncurred += cost;
                    if (s.vendorSettled) {
                        settledAmount += cost;
                    }
                }
            });
            // Số dư ký quỹ khả dụng hiện tại với Hãng = Tiền nạp - (Cost đã bay - Cost đã quyết toán gạch nợ)
            const unsettledCost = Math.max(0, totalCostIncurred - settledAmount);
            const availableDeposit = Math.max(0, totalDeposited - unsettledCost);
            const isDepositLow = availableDeposit < cfg.safeThreshold;
            return {
                vendorCode: cfg.code,
                vendorName: cfg.name,
                contractCode: cfg.contract,
                accountNumber: cfg.accountNumber,
                serviceType: cfg.serviceType,
                creditLimit: cfg.creditLimit,
                creditTermDays: cfg.creditTermDays,
                totalDeposited,
                totalCostIncurred,
                settledAmount,
                availableDeposit,
                safeDepositThreshold: cfg.safeThreshold,
                isDepositLow,
                lastDepositAt: lastDeposit?.createdAt
            };
        });
    }
    /**
     * Ghi nhận phiếu PandaLex nạp tiền ký quỹ vào Nhà Cung Cấp (Hãng)
     */
    static recordVendorDeposit(params) {
        if (!params.vendorCode)
            return { success: false, message: 'Thiếu mã Nhà Cung Cấp / Hãng' };
        if (!params.amount || params.amount <= 0)
            return { success: false, message: 'Số tiền nạp ký quỹ phải lớn hơn 0' };
        const vendorUpper = params.vendorCode.toUpperCase();
        const vendorNames = {
            'UPS': 'UPS Express Worldwide',
            'FEDEX': 'FedEx Express',
            'DHL': 'DHL Express',
            'SF_EXPRESS': 'SF Express International'
        };
        const vName = vendorNames[vendorUpper] || `Nhà cung cấp ${vendorUpper}`;
        // Tính số dư khả dụng mới
        const currentAccounts = this.getVendorAccounts();
        const currentAcc = currentAccounts.find(a => a.vendorCode === vendorUpper);
        const balanceAfter = (currentAcc?.availableDeposit || 0) + params.amount;
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const depositCode = `VD-${dateStr}-${randomSuffix}`;
        const tx = {
            id: `vd_${Date.now()}`,
            depositCode,
            vendorCode: vendorUpper,
            vendorName: vName,
            amount: params.amount,
            paymentMethod: params.paymentMethod || 'Ủy nhiệm chi ngân hàng',
            referenceCode: params.referenceCode || `UNC-${Date.now().toString().slice(-6)}`,
            depositPurpose: params.depositPurpose || `PandaLex nạp ký quỹ cước Hãng ${vName}`,
            balanceAfter,
            operator: params.operator,
            createdAt: now.toISOString(),
            notes: params.notes
        };
        this.vendorDeposits.unshift(tx);
        this.persistVendorDeposits();
        AuthService.logAction({
            userId: params.operator,
            username: params.operator,
            userRole: 'ACCOUNTANT',
            action: 'RECORD_VENDOR_DEPOSIT',
            targetId: depositCode,
            details: `Đã nạp ký quỹ ${params.amount.toLocaleString('vi-VN')} đ cho NCC ${vName} (Số UNC: ${tx.referenceCode})`
        });
        return {
            success: true,
            message: `✅ Đã ghi nhận nạp ký quỹ ${params.amount.toLocaleString('vi-VN')} đ cho ${vName}! Mã phiếu: ${depositCode}`,
            tx
        };
    }
    /**
     * Lấy lịch sử nạp tiền ký quỹ Nhà Cung Cấp
     */
    static getVendorDepositHistory(vendorCode) {
        if (vendorCode && vendorCode !== 'ALL') {
            return this.vendorDeposits.filter(d => d.vendorCode.toUpperCase() === vendorCode.toUpperCase());
        }
        return [...this.vendorDeposits];
    }
    // =========================================================================
    // 🤝 PHÂN HỆ 2: ĐẠI LÝ (AGENTS / CLIENTS)
    // Khách hàng mua dịch vụ từ PandaLex. Đại lý nạp tiền (Top-up) vào ví để TRỪ DẦN.
    // =========================================================================
    /**
     * Lấy danh sách ví Đại lý kèm số dư Top-Up và cảnh báo cạn ví
     */
    static getAgentWalletSummaries() {
        const allCustomers = CustomerService.getAll();
        const allShipments = ShipmentRepository.getAll();
        // Lọc các khách hàng là Đại lý hoặc dùng ví trả trước
        const agentList = allCustomers.filter(c => c.customerType === 'AGENT' ||
            c.customerType === 'VIP' ||
            c.financialCategory === 'PREPAID_WALLET' ||
            (c.walletBalance && c.walletBalance > 0));
        return agentList.map(cust => {
            // Tính tổng tiền nạp và tổng tiền đã trừ theo bill
            const custTxs = this.transactions.filter(t => t.customerCode === cust.customerCode);
            const totalTopup = custTxs
                .filter(t => t.type === 'TOPUP')
                .reduce((sum, t) => sum + (t.amount || 0), 0);
            const totalDeducted = custTxs
                .filter(t => t.type === 'DEDUCT_SHIPMENT')
                .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
            const custShipments = allShipments.filter(s => s.customerCode === cust.customerCode);
            const safeThreshold = 5000000; // Ngưỡng an toàn 5.000.000 VNĐ
            const balance = cust.walletBalance || 0;
            const isLow = balance < safeThreshold;
            const lastTopup = custTxs.find(t => t.type === 'TOPUP');
            return {
                customerCode: cust.customerCode,
                customerName: cust.customerName,
                representative: cust.representative,
                phone: cust.phone,
                customerType: cust.customerType,
                walletBalance: balance,
                creditLimit: cust.creditLimit || 0,
                totalTopupAmount: totalTopup,
                totalDeductedAmount: totalDeducted,
                shipmentCount: custShipments.length,
                safeWalletThreshold: safeThreshold,
                isWalletLow: isLow,
                lastTopupAt: lastTopup?.createdAt
            };
        });
    }
    /**
     * 1. Nạp tiền ví đại lý (Kế toán thao tác)
     */
    static topupWallet(userId, amount, note, accountant) {
        if (amount <= 0)
            return { success: false, message: 'Số tiền nạp phải lớn hơn 0' };
        const user = AuthService.getUserById(userId);
        if (!user)
            return { success: false, message: 'Không tìm thấy tài khoản người dùng' };
        const updateRes = AuthService.updateUserWallet(userId, amount, note, accountant);
        if (!updateRes.success)
            return { success: false, message: updateRes.message };
        const tx = {
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
    static recordCustomerTopup(customerCode, amount, paymentMethod = 'Chuyển khoản VCB', reference = '', note = '', operator = 'ketoan') {
        if (amount <= 0)
            return { success: false, message: 'Số tiền nạp ví phải lớn hơn 0' };
        const topupRes = CustomerService.topupWallet(customerCode, amount, paymentMethod, reference, note, operator);
        if (!topupRes.success || !topupRes.customer) {
            return { success: false, message: topupRes.message };
        }
        // Đồng bộ tài khoản User nếu có
        const user = AuthService.getUserByCustomerCode(customerCode);
        if (user) {
            user.walletBalance = topupRes.newBalance;
        }
        const tx = {
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
    static recordCustomerDeduction(customerCode, amount, trackingNumber, operator = 'system') {
        const cust = CustomerService.getById(customerCode) || CustomerService.getByCode(customerCode);
        if (!cust)
            return { success: false, message: 'Không tìm thấy khách hàng: ' + customerCode };
        const deductRes = CustomerService.deductWallet(customerCode, amount);
        if (!deductRes.success)
            return { success: false, message: deductRes.message };
        const user = AuthService.getUserByCustomerCode(customerCode);
        if (user) {
            user.walletBalance = deductRes.newBalance;
        }
        const tx = {
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
    static deductShipmentFee(userId, amount, trackingNumber, operator) {
        const user = AuthService.getUserById(userId);
        if (!user)
            return { success: false, message: 'Không tìm thấy tài khoản để trừ tiền' };
        const updateRes = AuthService.updateUserWallet(userId, -amount, `Trừ cước vận đơn ${trackingNumber}`, operator);
        if (!updateRes.success)
            return { success: false, message: updateRes.message };
        const tx = {
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
    static getFinancialSummary() {
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
            }
            else {
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
    static getTransactions(userId) {
        if (userId) {
            return this.transactions.filter(t => t.userId === userId || t.username === userId);
        }
        return this.transactions;
    }
    /**
     * 4. Ghi nhận thanh toán vận đơn (Cổng 1: Đã thanh toán)
     */
    static confirmShipmentPayment(shipmentId, amount, paymentMethod = 'Tiền mặt / Chuyển khoản', operator = 'ketoan') {
        const s = ShipmentRepository.getById(shipmentId);
        if (!s)
            return { success: false, message: 'Không tìm thấy vận đơn: ' + shipmentId };
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
    static deductShipmentFeeFromCustomer(shipmentId, operator = 'ketoan') {
        const s = ShipmentRepository.getById(shipmentId);
        if (!s)
            return { success: false, message: 'Không tìm thấy vận đơn: ' + shipmentId };
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
    static recordCustomerCommitment(shipmentId, committedBy, note) {
        const s = ShipmentRepository.getById(shipmentId);
        if (!s)
            return { success: false, message: 'Không tìm thấy vận đơn: ' + shipmentId };
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
    static quickApproveFinancialGate(shipmentId, operator = 'ketoan', reason = 'Kế toán xác nhận duyệt tài chính và cam kết khách hàng') {
        const s = ShipmentRepository.getById(shipmentId);
        if (!s)
            return { success: false, message: 'Không tìm thấy vận đơn: ' + shipmentId };
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
    static createReceiptVoucher(params) {
        if (!params.amount || params.amount <= 0) {
            return { success: false, message: 'Số tiền thu phải lớn hơn 0 VNĐ' };
        }
        // BẮT BUỘC PHẢI CÓ SỐ AWB: Mọi khoản thu chi đều xoay quanh vận đơn AWB
        const cleanAwb = (params.trackingNumber || params.shipmentId)?.trim().toUpperCase();
        if (!cleanAwb) {
            return { success: false, message: 'Việc thu chi xoay quanh chi phí liên quan đến AWB vì vậy bắt buộc phải có số AWB' };
        }
        const s = ShipmentRepository.getById(cleanAwb);
        if (!s) {
            return { success: false, message: `Không tìm thấy vận đơn: ${cleanAwb}. Bắt buộc phải có số AWB hợp lệ trong hệ thống.` };
        }
        const op = params.operator || 'ketoan';
        const hub = (params.hub || s.currentWarehouseHub || s.hub || 'SGN');
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const seq = String(this.vouchers.length + 1).padStart(4, '0');
        const voucherCode = `PT-${dateStr}-${seq}`;
        // Tên chuẩn kênh thanh toán
        let channelName = params.paymentChannelName;
        if (!channelName) {
            switch (params.paymentChannel) {
                case 'CASH':
                    channelName = 'Tiền mặt tại quầy';
                    break;
                case 'BANK_TRANSFER':
                    channelName = params.bankAccount ? `Chuyển khoản ${params.bankAccount}` : 'Chuyển khoản ngân hàng';
                    break;
                case 'WALLET':
                    channelName = 'Khấu trừ ví điện tử ký quỹ';
                    break;
                case 'POSTPAID_CONTRACT':
                    channelName = 'Ghi nợ hợp đồng trả sau';
                    break;
                default: channelName = 'Tiền mặt tại quầy';
            }
        }
        // Tên danh mục thu
        let catCode = params.categoryCode;
        let catName = params.categoryName;
        if (!catCode) {
            if (s.financialCategory === 'POSTPAID' || params.type === 'CUSTOMER_DEBT')
                catCode = 'REV_CONTRACT_DEBT';
            else if (s.financialCategory === 'WALLET' || params.type === 'WALLET_TOPUP')
                catCode = 'REV_WALLET_TOPUP';
            else
                catCode = 'REV_AWB_CASH';
        }
        if (!catName) {
            const foundCat = this.categories.find(c => c.code === catCode);
            catName = foundCat ? foundCat.name : 'Thu cước vận chuyển AWB';
        }
        // Tra cứu thông tin khách hàng từ AWB
        const finalCustCode = s.customerCode || params.customerCode || 'PDL-GUEST';
        const cust = CustomerService.getById(finalCustCode) || CustomerService.getByCode(finalCustCode);
        const custName = params.customerName || s.customerName || (cust ? (cust.customerName || cust.name) : finalCustCode);
        // Cập nhật trạng thái tài chính vận đơn xoay quanh AWB:
        let mappedFinCat = s.financialCategory || 'IMMEDIATE';
        if (params.paymentChannel === 'WALLET')
            mappedFinCat = 'WALLET';
        else if (params.paymentChannel === 'POSTPAID_CONTRACT')
            mappedFinCat = 'POSTPAID';
        else if (params.paymentChannel === 'CASH' || params.paymentChannel === 'BANK_TRANSFER')
            mappedFinCat = 'IMMEDIATE';
        // 1. Nếu là đơn trả tiền mặt (CASH / IMMEDIATE) -> Mở khóa xuất kho
        if (mappedFinCat === 'IMMEDIATE' || s.financialCategory === 'IMMEDIATE' || params.type === 'SHIPMENT_FEE') {
            s.financialCategory = 'IMMEDIATE';
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
            if (s.status === 'INBOUND_RECEIVED' || s.status === 'PRINTED' || s.status === 'WAITING_FINANCE_DISPATCH') {
                s.status = 'WAITING_FINANCE_DISPATCH';
            }
        }
        // 2. Nếu là khách hàng hợp đồng (POSTPAID) -> Giảm trừ công nợ & gạch nợ AWB
        if (s.financialCategory === 'POSTPAID' || params.type === 'CUSTOMER_DEBT') {
            s.customerSettled = true;
            s.customerSettledAt = now.toISOString();
            s.customerSettlementRef = voucherCode;
            s.paymentStatus = 'PAID';
            s.financialStatus = {
                ...s.financialStatus,
                isPaid: true,
                paidAt: now.toISOString(),
                receiptVoucherCode: voucherCode
            };
            CustomerService.recordDebtPayment(finalCustCode, params.amount, `Thu cước AWB ${s.masterTrackingNumber} theo phiếu thu ${voucherCode}`, op);
        }
        // 3. Nếu là trừ ví đại lý
        if (params.paymentChannel === 'WALLET' || s.financialCategory === 'WALLET') {
            const deductRes = this.recordCustomerDeduction(finalCustCode, params.amount, s.masterTrackingNumber, op);
            if (!deductRes.success) {
                return { success: false, message: `Không thể trừ ví đại lý: ${deductRes.message}` };
            }
            s.paymentStatus = 'PAID';
            s.financialStatus = {
                ...s.financialStatus,
                isPaid: true,
                receiptVoucherCode: voucherCode
            };
        }
        ShipmentRepository.save(s, `Lập phiếu thu ${voucherCode} cho AWB qua kênh ${channelName}`);
        const voucher = {
            id: `vch_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            voucherCode,
            type: params.type || (s.financialCategory === 'POSTPAID' ? 'CUSTOMER_DEBT' : 'SHIPMENT_FEE'),
            categoryCode: catCode,
            categoryName: catName,
            shipmentId: s.shipmentId,
            trackingNumber: s.masterTrackingNumber,
            customerCode: finalCustCode,
            customerName: custName,
            amount: params.amount,
            paymentChannel: params.paymentChannel,
            paymentChannelName: channelName,
            bankAccount: params.bankAccount,
            referenceCode: params.referenceCode,
            payerName: params.payerName || custName,
            payerPhone: params.payerPhone,
            reason: params.reason || `Thu tiền cước AWB ${s.masterTrackingNumber} (${s.carrier} - ${s.destinationCountry || ''})`,
            attachedDocCount: params.attachedDocCount || 1,
            hub,
            createdAt: now.toISOString(),
            createdBy: op,
            notes: params.notes
        };
        this.vouchers.unshift(voucher);
        this.persistVouchers();
        AuthService.logAction({
            userId: op,
            username: op,
            userRole: 'ACCOUNTANT',
            action: 'CREATE_RECEIPT_VOUCHER',
            targetId: voucherCode,
            details: `Lập phiếu thu ${voucherCode} số tiền ${params.amount.toLocaleString('vi-VN')} đ cho AWB ${s.masterTrackingNumber} (${custName}) qua kênh [${channelName}]`,
            hub
        });
        return {
            success: true,
            message: `🎉 Đã lập thành công Phiếu Thu ${voucherCode} (${params.amount.toLocaleString('vi-VN')} đ) cho AWB ${s.masterTrackingNumber}!`,
            voucher,
            shipment: s
        };
    }
    /**
     * 8.1 Thu tiền hàng loạt theo danh sách / file Excel (Batch Receipts)
     * Yêu cầu bắt buộc: Mỗi dòng phải có số AWB hợp lệ trong hệ thống
     */
    static createBatchReceiptVouchers(items, operator = 'ketoan') {
        if (!items || items.length === 0) {
            return { success: false, count: 0, totalAmount: 0, vouchers: [], errors: ['Danh sách nạp rỗng'] };
        }
        const createdVouchers = [];
        const errors = [];
        let totalAmt = 0;
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const rowIdx = i + 1;
            const cleanAwb = (it.awbOrCust || it.awb || it.trackingNumber)?.trim().toUpperCase();
            if (!cleanAwb) {
                errors.push(`Dòng ${rowIdx}: Thiếu số AWB. Việc thu chi bắt buộc phải có số AWB.`);
                continue;
            }
            const foundShipment = ShipmentRepository.getById(cleanAwb);
            if (!foundShipment) {
                errors.push(`Dòng ${rowIdx}: Vận đơn AWB [${cleanAwb}] không tồn tại trên hệ thống.`);
                continue;
            }
            let amount = it.amount;
            if (!amount || amount <= 0) {
                amount = foundShipment.sellPrice || (foundShipment.chargeableWeightKg ? Math.round(foundShipment.chargeableWeightKg * 275000) : 275000);
            }
            const res = this.createReceiptVoucher({
                type: foundShipment.financialCategory === 'POSTPAID' ? 'CUSTOMER_DEBT' : 'SHIPMENT_FEE',
                shipmentId: foundShipment.shipmentId,
                trackingNumber: foundShipment.masterTrackingNumber,
                customerCode: foundShipment.customerCode || 'PDL-GUEST',
                customerName: foundShipment.customerName,
                amount,
                paymentChannel: it.channel || 'CASH',
                paymentChannelName: it.channelName,
                categoryCode: it.categoryCode,
                bankAccount: it.bankAccount,
                referenceCode: it.referenceCode,
                payerName: it.payerName || foundShipment.customerName,
                payerPhone: it.payerPhone,
                reason: it.reason || `Thu tiền cước AWB ${foundShipment.masterTrackingNumber} từ file Excel`,
                hub: (foundShipment.currentWarehouseHub || foundShipment.hub || 'SGN'),
                operator
            });
            if (res.success && res.voucher) {
                createdVouchers.push(res.voucher);
                totalAmt += amount;
            }
            else {
                errors.push(`Dòng ${rowIdx} (${cleanAwb}): ${res.message}`);
            }
        }
        return {
            success: createdVouchers.length > 0,
            count: createdVouchers.length,
            totalAmount: totalAmt,
            vouchers: createdVouchers,
            errors
        };
    }
    /**
     * Tạo File Mẫu Excel Thu Tiền Vận Đơn AWB (.xlsx)
     */
    static generateReceiptExcelTemplate() {
        const wb = XLSX.utils.book_new();
        const data = [
            ['STT', 'Mã Vận Đơn (AWB) *', 'Số Tiền Thu (VNĐ) *', 'Hình Thức Thanh Toán', 'Người Nộp Tiền', 'Lý Do Thu / Ghi Chú'],
            [1, '1Z861R320493609873', 4785000, 'TIEN_MAT', 'Công ty TNHH XNK Đông Dương', 'Thu tiền cước AWB tiền mặt tại quầy'],
            [2, '1Z999AA10123456784', 5200000, 'CHUYEN_KHOAN', 'Đại Lý An Nam Logistics', 'Thu tiền cước AWB khách hợp đồng'],
            [3, '1Z84Y8200443069921', 3150000, 'TIEN_MAT', 'Nguyễn Văn An', 'Thu tiền cước vận chuyển bưu cục']
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { wch: 6 },
            { wch: 26 },
            { wch: 20 },
            { wch: 22 },
            { wch: 32 },
            { wch: 40 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Thu_Tien_AWB');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
    /**
     * Tạo File Mẫu Excel Chi Phí Vận Đơn AWB (.xlsx)
     */
    static generatePaymentExcelTemplate() {
        const wb = XLSX.utils.book_new();
        const data = [
            ['STT', 'Mã Vận Đơn (AWB) *', 'Mã Khoản Mục Chi *', 'Số Tiền Chi (VNĐ) *', 'Người / Đơn Vị Nhận *', 'Hình Thức Chi', 'Lý Do Chi Phí'],
            [1, '1Z861R320493609873', 'EXP_CARRIER_COST', 3740000, 'UPS Express Worldwide', 'CHUYEN_KHOAN', 'Chi cước gốc mua hãng bay'],
            [2, '1Z861R320493609873', 'EXP_CUSTOMS_CLEARANCE', 450000, 'Hải Quan Nội Bài', 'TIEN_MAT', 'Phí kiểm hóa và thông quan hải quan'],
            [3, '1Z999AA10123456784', 'EXP_FIRST_MILE_TRUCKING', 250000, 'Đội Xe Tải PandaLex', 'TIEN_MAT', 'Phí xe tải lấy hàng từ kho đại lý'],
            [4, '1Z84Y8200443069921', 'EXP_PACKAGING_SUPPLIES', 120000, 'Công ty Bao Bì Nam Long', 'TIEN_MAT', 'Mua thùng carton 5 lớp và màng PE']
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { wch: 6 },
            { wch: 26 },
            { wch: 26 },
            { wch: 20 },
            { wch: 32 },
            { wch: 18 },
            { wch: 40 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Chi_Phi_AWB');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
    /**
     * Đọc và phân tích file Excel Thu Tiền AWB
     */
    static parseExcelFileForReceipts(buffer) {
        try {
            const wb = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = wb.SheetNames[0];
            const ws = wb.Sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (!rawRows || rawRows.length < 2) {
                return { success: false, rows: [], validCount: 0, errorCount: 0, totalAmount: 0, errors: ['File Excel rỗng hoặc không có dữ liệu'] };
            }
            let headerIdx = -1;
            let colAwb = -1;
            let colAmount = -1;
            let colChannel = -1;
            let colPayer = -1;
            let colReason = -1;
            for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
                const row = rawRows[r].map(c => String(c).toLowerCase().trim());
                const awbIdx = row.findIndex(c => c.includes('awb') || c.includes('vận đơn') || c.includes('tracking'));
                if (awbIdx !== -1) {
                    headerIdx = r;
                    colAwb = awbIdx;
                    colAmount = row.findIndex(c => c.includes('tiền') || c.includes('cước') || c.includes('amount'));
                    colChannel = row.findIndex(c => c.includes('kênh') || c.includes('hình thức') || c.includes('channel') || c.includes('method'));
                    colPayer = row.findIndex(c => c.includes('người nộp') || c.includes('khách') || c.includes('payer'));
                    colReason = row.findIndex(c => c.includes('lý do') || c.includes('ghi chú') || c.includes('reason') || c.includes('note'));
                    break;
                }
            }
            if (headerIdx === -1 || colAwb === -1) {
                headerIdx = 0;
                colAwb = 1;
                colAmount = 2;
                colChannel = 3;
                colPayer = 4;
                colReason = 5;
            }
            const rows = [];
            const errors = [];
            let totalAmount = 0;
            let validCount = 0;
            for (let r = headerIdx + 1; r < rawRows.length; r++) {
                const row = rawRows[r];
                if (!row || row.every((c) => !String(c).trim()))
                    continue;
                const rowNum = r + 1;
                const rawAwb = String(row[colAwb] || '').trim().toUpperCase();
                if (!rawAwb) {
                    errors.push(`Dòng ${rowNum}: Bắt buộc phải có mã vận đơn AWB.`);
                    rows.push({ rowNum, rawAwb: '', valid: false, error: 'Thiếu mã vận đơn AWB' });
                    continue;
                }
                const shipment = ShipmentRepository.getById(rawAwb);
                if (!shipment) {
                    errors.push(`Dòng ${rowNum}: Vận đơn AWB [${rawAwb}] không tồn tại trên hệ thống.`);
                    rows.push({ rowNum, rawAwb, valid: false, error: `AWB [${rawAwb}] không tồn tại trên hệ thống` });
                    continue;
                }
                let amount = 0;
                if (colAmount !== -1 && row[colAmount]) {
                    amount = parseFloat(String(row[colAmount]).replace(/[^0-9.]/g, '')) || 0;
                }
                if (amount <= 0) {
                    amount = shipment.sellPrice || (shipment.chargeableWeightKg ? Math.round(shipment.chargeableWeightKg * 275000) : 275000);
                }
                const channelRaw = colChannel !== -1 ? String(row[colChannel] || '').toUpperCase() : '';
                const channel = (channelRaw.includes('BANK') || channelRaw.includes('CHUYEN_KHOAN') || channelRaw.includes('CK')) ? 'BANK_TRANSFER' : 'CASH';
                const payerName = (colPayer !== -1 && row[colPayer]) ? String(row[colPayer]).trim() : (shipment.customerName || shipment.customerCode || 'Khách hàng');
                const reason = (colReason !== -1 && row[colReason]) ? String(row[colReason]).trim() : `Thu tiền cước AWB ${shipment.masterTrackingNumber} từ file Excel`;
                totalAmount += amount;
                validCount++;
                rows.push({
                    rowNum,
                    awb: shipment.masterTrackingNumber,
                    shipmentId: shipment.shipmentId,
                    customerCode: shipment.customerCode || 'PDL-GUEST',
                    customerName: shipment.customerName,
                    carrier: shipment.carrier,
                    financialCategory: shipment.financialCategory,
                    amount,
                    channel,
                    payerName,
                    reason,
                    valid: true
                });
            }
            return {
                success: validCount > 0,
                rows,
                validCount,
                errorCount: errors.length,
                totalAmount,
                errors
            };
        }
        catch (err) {
            return { success: false, rows: [], validCount: 0, errorCount: 0, totalAmount: 0, errors: ['Lỗi phân tích file Excel: ' + err.message] };
        }
    }
    /**
     * Đọc và phân tích file Excel Chi Phí AWB
     */
    static parseExcelFileForPayments(buffer) {
        try {
            const wb = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = wb.SheetNames[0];
            const ws = wb.Sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (!rawRows || rawRows.length < 2) {
                return { success: false, rows: [], validCount: 0, errorCount: 0, totalAmount: 0, errors: ['File Excel rỗng hoặc không có dữ liệu'] };
            }
            let headerIdx = -1;
            let colAwb = -1;
            let colCategory = -1;
            let colAmount = -1;
            let colRecipient = -1;
            let colMethod = -1;
            let colReason = -1;
            for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
                const row = rawRows[r].map(c => String(c).toLowerCase().trim());
                const awbIdx = row.findIndex(c => c.includes('awb') || c.includes('vận đơn') || c.includes('tracking'));
                if (awbIdx !== -1) {
                    headerIdx = r;
                    colAwb = awbIdx;
                    colCategory = row.findIndex(c => c.includes('khoản mục') || c.includes('mục') || c.includes('danh mục') || c.includes('category'));
                    colAmount = row.findIndex(c => c.includes('tiền') || c.includes('chi') || c.includes('amount'));
                    colRecipient = row.findIndex(c => c.includes('người nhận') || c.includes('đơn vị') || c.includes('recipient'));
                    colMethod = row.findIndex(c => c.includes('hình thức') || c.includes('phương thức') || c.includes('kênh'));
                    colReason = row.findIndex(c => c.includes('lý do') || c.includes('ghi chú') || c.includes('reason') || c.includes('note'));
                    break;
                }
            }
            if (headerIdx === -1 || colAwb === -1) {
                headerIdx = 0;
                colAwb = 1;
                colCategory = 2;
                colAmount = 3;
                colRecipient = 4;
                colMethod = 5;
                colReason = 6;
            }
            const rows = [];
            const errors = [];
            let totalAmount = 0;
            let validCount = 0;
            for (let r = headerIdx + 1; r < rawRows.length; r++) {
                const row = rawRows[r];
                if (!row || row.every((c) => !String(c).trim()))
                    continue;
                const rowNum = r + 1;
                const rawAwb = String(row[colAwb] || '').trim().toUpperCase();
                if (!rawAwb) {
                    errors.push(`Dòng ${rowNum}: Bắt buộc phải có mã vận đơn AWB.`);
                    rows.push({ rowNum, rawAwb: '', valid: false, error: 'Thiếu mã vận đơn AWB' });
                    continue;
                }
                const shipment = ShipmentRepository.getById(rawAwb);
                if (!shipment) {
                    errors.push(`Dòng ${rowNum}: Vận đơn AWB [${rawAwb}] không tồn tại trên hệ thống.`);
                    rows.push({ rowNum, rawAwb, valid: false, error: `AWB [${rawAwb}] không tồn tại trên hệ thống` });
                    continue;
                }
                let catCode = colCategory !== -1 ? String(row[colCategory] || '').trim().toUpperCase() : 'EXP_CARRIER_COST';
                if (!catCode || catCode === 'EXP_OTHER')
                    catCode = 'EXP_CARRIER_COST';
                if (catCode.includes('CUOC') || catCode.includes('HANG'))
                    catCode = 'EXP_CARRIER_COST';
                else if (catCode.includes('HAI_QUAN') || catCode.includes('HQ'))
                    catCode = 'EXP_CUSTOMS_CLEARANCE';
                else if (catCode.includes('XE') || catCode.includes('TRUCK'))
                    catCode = 'EXP_FIRST_MILE_TRUCKING';
                else if (catCode.includes('BAO_BI') || catCode.includes('CARTON'))
                    catCode = 'EXP_PACKAGING_SUPPLIES';
                else if (catCode.includes('BOI_THUONG'))
                    catCode = 'EXP_SHIPMENT_COMPENSATION';
                let amount = 0;
                if (colAmount !== -1 && row[colAmount]) {
                    amount = parseFloat(String(row[colAmount]).replace(/[^0-9.]/g, '')) || 0;
                }
                if (amount <= 0) {
                    amount = shipment.costPrice || Math.round((shipment.sellPrice || 275000) * 0.75);
                }
                let recipientName = colRecipient !== -1 ? String(row[colRecipient] || '').trim() : '';
                if (!recipientName) {
                    recipientName = shipment.carrier === 'FEDEX' ? 'FedEx Express VN' : 'UPS Express Worldwide';
                }
                const methodRaw = colMethod !== -1 ? String(row[colMethod] || '').toUpperCase() : '';
                const method = (methodRaw.includes('BANK') || methodRaw.includes('CHUYEN_KHOAN') || methodRaw.includes('CK')) ? 'BANK_TRANSFER' : 'CASH';
                const reason = colReason !== -1 && row[colReason] ? String(row[colReason]).trim() : `Chi phí ${catCode} theo AWB ${shipment.masterTrackingNumber} từ file Excel`;
                totalAmount += amount;
                validCount++;
                rows.push({
                    rowNum,
                    awb: shipment.masterTrackingNumber,
                    shipmentId: shipment.shipmentId,
                    carrier: shipment.carrier,
                    categoryCode: catCode,
                    amount,
                    recipientName,
                    method,
                    reason,
                    valid: true
                });
            }
            return {
                success: validCount > 0,
                rows,
                validCount,
                errorCount: errors.length,
                totalAmount,
                errors
            };
        }
        catch (err) {
            return { success: false, rows: [], validCount: 0, errorCount: 0, totalAmount: 0, errors: ['Lỗi phân tích file Excel: ' + err.message] };
        }
    }
    static getAllReceiptVouchers(filter) {
        let list = [...this.vouchers];
        if (filter?.customerCode) {
            list = list.filter(v => v.customerCode.toUpperCase() === filter.customerCode.toUpperCase());
        }
        if (filter?.type && filter.type !== 'ALL') {
            list = list.filter(v => v.type === filter.type);
        }
        if (filter?.channel && filter.channel !== 'ALL') {
            list = list.filter(v => v.paymentChannel === filter.channel);
        }
        if (filter?.categoryCode && filter.categoryCode !== 'ALL') {
            list = list.filter(v => v.categoryCode === filter.categoryCode);
        }
        if (filter?.hub && filter.hub !== 'ALL') {
            list = list.filter(v => v.hub === filter.hub);
        }
        if (filter?.fromDate) {
            const from = new Date(filter.fromDate).getTime();
            list = list.filter(v => new Date(v.createdAt).getTime() >= from);
        }
        if (filter?.toDate) {
            const to = new Date(filter.toDate).getTime() + 86400000;
            list = list.filter(v => new Date(v.createdAt).getTime() <= to);
        }
        if (filter?.keyword) {
            const kw = filter.keyword.trim().toUpperCase();
            list = list.filter(v => v.voucherCode.includes(kw) ||
                (v.trackingNumber && v.trackingNumber.toUpperCase().includes(kw)) ||
                v.customerCode.toUpperCase().includes(kw) ||
                v.customerName.toUpperCase().includes(kw) ||
                (v.referenceCode && v.referenceCode.toUpperCase().includes(kw)) ||
                (v.reason && v.reason.toUpperCase().includes(kw)));
        }
        return list;
    }
    static getReceiptVoucherByCode(code) {
        const clean = code.trim().toUpperCase();
        return this.vouchers.find(v => v.voucherCode.toUpperCase() === clean || v.id === clean);
    }
    // =========================================================================
    // 💸 PHÂN HỆ 9: LẬP PHIẾU CHI TIỀN (PAYMENT VOUCHERS) & CHI PHÍ KHÁC
    // Chi theo AWB, Chi cước gốc Hãng, Chi hải quan, Chi nội địa, Chi theo Excel...
    // =========================================================================
    /**
     * 9. Lập Phiếu Chi Tiền Chính Thức (Payment Voucher)
     */
    static createPaymentVoucher(params) {
        if (!params.amount || params.amount <= 0) {
            return { success: false, message: 'Số tiền chi phải lớn hơn 0 VNĐ' };
        }
        if (!params.recipientName || !params.recipientName.trim()) {
            return { success: false, message: 'Vui lòng nhập họ tên hoặc đơn vị nhận tiền' };
        }
        // BẮT BUỘC PHẢI CÓ SỐ AWB: Mọi khoản thu chi đều xoay quanh vận đơn AWB
        const cleanAwb = (params.trackingNumber || params.shipmentId)?.trim().toUpperCase();
        if (!cleanAwb) {
            return { success: false, message: 'Việc thu chi xoay quanh chi phí liên quan đến AWB vì vậy bắt buộc phải có số AWB' };
        }
        const linkedShipment = ShipmentRepository.getById(cleanAwb);
        if (!linkedShipment) {
            return { success: false, message: `Không tìm thấy vận đơn: ${cleanAwb}. Bắt buộc phải có số AWB hợp lệ trong hệ thống.` };
        }
        const op = params.operator || 'ketoan';
        const hub = (params.hub || linkedShipment.currentWarehouseHub || linkedShipment.hub || 'SGN');
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const seq = String(this.paymentVouchers.length + 1).padStart(4, '0');
        const voucherCode = `PC-${dateStr}-${seq}`;
        // Tên danh mục chi
        const catCode = params.categoryCode || 'EXP_CARRIER_COST';
        let catName = params.categoryName;
        if (!catName) {
            const foundCat = this.categories.find(c => c.code === catCode);
            catName = foundCat ? foundCat.name : 'Chi phí theo AWB';
        }
        // Tên phương thức chi
        let methodName = params.paymentMethodName;
        if (!methodName) {
            switch (params.paymentMethod) {
                case 'CASH':
                    methodName = 'Tiền mặt tại quỹ';
                    break;
                case 'BANK_TRANSFER':
                    methodName = params.bankAccount ? `Ủy nhiệm chi ngân hàng (${params.bankAccount})` : 'Ủy nhiệm chi ngân hàng';
                    break;
                default: methodName = 'Tiền mặt tại quỹ';
            }
        }
        // Ghi nhận trực tiếp vào lịch sử chi phí của vận đơn AWB
        if (!linkedShipment.expenseHistory)
            linkedShipment.expenseHistory = [];
        linkedShipment.expenseHistory.push({
            voucherCode,
            categoryCode: catCode,
            categoryName: catName,
            amount: params.amount,
            recipientName: params.recipientName.trim(),
            paidAt: now.toISOString(),
            operator: op,
            reason: params.reason || `Chi phí ${catName} theo AWB ${cleanAwb}`
        });
        // Nếu chi cước gốc Hãng bay (EXP_CARRIER_COST) -> Đánh dấu quyết toán nợ hãng
        if (catCode === 'EXP_CARRIER_COST') {
            linkedShipment.vendorSettled = true;
            linkedShipment.vendorSettledAt = now.toISOString();
            linkedShipment.vendorSettlementRef = voucherCode;
        }
        ShipmentRepository.save(linkedShipment, `Ghi nhận phiếu chi ${voucherCode} (${params.amount.toLocaleString('vi-VN')} đ) cho AWB`);
        const voucher = {
            id: `pc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            voucherCode,
            type: params.type || 'AWB_EXPENSE',
            categoryCode: catCode,
            categoryName: catName,
            shipmentId: linkedShipment.shipmentId,
            trackingNumber: linkedShipment.masterTrackingNumber,
            vendorCode: params.vendorCode || linkedShipment.carrier,
            recipientName: params.recipientName.trim(),
            recipientPhone: params.recipientPhone,
            amount: params.amount,
            paymentMethod: params.paymentMethod || 'CASH',
            paymentMethodName: methodName,
            bankAccount: params.bankAccount,
            referenceCode: params.referenceCode,
            reason: params.reason || `Chi phí ${catName} theo AWB ${linkedShipment.masterTrackingNumber}`,
            attachedDocCount: params.attachedDocCount || 1,
            hub,
            createdAt: now.toISOString(),
            createdBy: op,
            notes: params.notes
        };
        this.paymentVouchers.unshift(voucher);
        this.persistPaymentVouchers();
        AuthService.logAction({
            userId: op,
            username: op,
            userRole: 'ACCOUNTANT',
            action: 'CREATE_PAYMENT_VOUCHER',
            targetId: voucherCode,
            details: `Lập phiếu chi ${voucherCode} số tiền ${params.amount.toLocaleString('vi-VN')} đ cho AWB ${cleanAwb} (${params.recipientName} - ${catName})`,
            hub
        });
        return {
            success: true,
            message: `🎉 Đã lập thành công Phiếu Chi ${voucherCode} (${params.amount.toLocaleString('vi-VN')} đ) cho AWB ${cleanAwb}!`,
            voucher,
            shipment: linkedShipment
        };
    }
    /**
     * 9.1 Chi tiền hàng loạt theo danh sách / file Excel (Batch Payments)
     * Yêu cầu bắt buộc: Mỗi dòng phải có số AWB hợp lệ trong hệ thống
     */
    static createBatchPaymentVouchers(items, operator = 'ketoan') {
        if (!items || items.length === 0) {
            return { success: false, count: 0, totalAmount: 0, vouchers: [], errors: ['Danh sách chi rỗng'] };
        }
        const createdVouchers = [];
        const errors = [];
        let totalAmt = 0;
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const rowIdx = i + 1;
            const cleanAwb = (it.awb || it.trackingNumber)?.trim().toUpperCase();
            if (!cleanAwb) {
                errors.push(`Dòng ${rowIdx}: Thiếu số AWB. Việc thu chi bắt buộc phải có số AWB.`);
                continue;
            }
            const foundShipment = ShipmentRepository.getById(cleanAwb);
            if (!foundShipment) {
                errors.push(`Dòng ${rowIdx}: Vận đơn AWB [${cleanAwb}] không tồn tại trên hệ thống.`);
                continue;
            }
            let recipient = it.recipientName ? it.recipientName.trim() : '';
            if (!recipient) {
                recipient = foundShipment.carrier === 'FEDEX' ? 'FedEx Express VN' : 'UPS Express Worldwide';
            }
            let amount = it.amount;
            if (!amount || amount <= 0) {
                amount = foundShipment.costPrice || Math.round((foundShipment.sellPrice || 275000) * 0.75);
            }
            const res = this.createPaymentVoucher({
                type: 'AWB_EXPENSE',
                categoryCode: it.categoryCode || 'EXP_CARRIER_COST',
                trackingNumber: foundShipment.masterTrackingNumber,
                shipmentId: foundShipment.shipmentId,
                recipientName: recipient,
                recipientPhone: it.recipientPhone,
                amount,
                paymentMethod: it.method || 'CASH',
                paymentMethodName: it.methodName,
                bankAccount: it.bankAccount,
                referenceCode: it.referenceCode,
                reason: it.reason || `Chi chi phí theo AWB ${foundShipment.masterTrackingNumber} từ file Excel`,
                hub: (foundShipment.currentWarehouseHub || foundShipment.hub || 'SGN'),
                operator
            });
            if (res.success && res.voucher) {
                createdVouchers.push(res.voucher);
                totalAmt += amount;
            }
            else {
                errors.push(`Dòng ${rowIdx} (${cleanAwb}): ${res.message}`);
            }
        }
        return {
            success: createdVouchers.length > 0,
            count: createdVouchers.length,
            totalAmount: totalAmt,
            vouchers: createdVouchers,
            errors
        };
    }
    static getAllPaymentVouchers(filter) {
        let list = [...this.paymentVouchers];
        if (filter?.categoryCode && filter.categoryCode !== 'ALL') {
            list = list.filter(v => v.categoryCode === filter.categoryCode);
        }
        if (filter?.type && filter.type !== 'ALL') {
            list = list.filter(v => v.type === filter.type);
        }
        if (filter?.paymentMethod && filter.paymentMethod !== 'ALL') {
            list = list.filter(v => v.paymentMethod === filter.paymentMethod);
        }
        if (filter?.hub && filter.hub !== 'ALL') {
            list = list.filter(v => v.hub === filter.hub);
        }
        if (filter?.fromDate) {
            const from = new Date(filter.fromDate).getTime();
            list = list.filter(v => new Date(v.createdAt).getTime() >= from);
        }
        if (filter?.toDate) {
            const to = new Date(filter.toDate).getTime() + 86400000;
            list = list.filter(v => new Date(v.createdAt).getTime() <= to);
        }
        if (filter?.keyword) {
            const kw = filter.keyword.trim().toUpperCase();
            list = list.filter(v => v.voucherCode.includes(kw) ||
                (v.trackingNumber && v.trackingNumber.toUpperCase().includes(kw)) ||
                v.recipientName.toUpperCase().includes(kw) ||
                (v.referenceCode && v.referenceCode.toUpperCase().includes(kw)) ||
                (v.reason && v.reason.toUpperCase().includes(kw)));
        }
        return list;
    }
    static getPaymentVoucherByCode(code) {
        const clean = code.trim().toUpperCase();
        return this.paymentVouchers.find(v => v.voucherCode.toUpperCase() === clean || v.id === clean);
    }
    // =========================================================================
    // 📚 PHÂN HỆ 10: QUẢN LÝ DANH MỤC CÁC KHOẢN THU & KHOẢN CHI
    // =========================================================================
    static getAllCategories(type) {
        let list = [...this.categories].sort((a, b) => a.order - b.order);
        if (type) {
            list = list.filter(c => c.type === type);
        }
        return list;
    }
    static getCategoryByCode(code) {
        const clean = code.trim().toUpperCase();
        return this.categories.find(c => c.code.toUpperCase() === clean || c.id === clean);
    }
    static addCategory(params) {
        if (!params.code || !params.name || !params.type) {
            return { success: false, message: 'Thiếu mã, tên danh mục hoặc phân loại' };
        }
        const cleanCode = params.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        if (this.categories.some(c => c.code === cleanCode)) {
            return { success: false, message: `Mã danh mục ${cleanCode} đã tồn tại` };
        }
        const cat = {
            id: `cat_${Date.now()}`,
            code: cleanCode,
            name: params.name.trim(),
            type: params.type,
            description: params.description?.trim(),
            isDefault: false,
            isActive: true,
            order: params.order || (this.categories.length + 1)
        };
        this.categories.push(cat);
        this.persistCategories();
        return { success: true, message: `Thêm danh mục ${cat.name} thành công`, category: cat };
    }
    static updateCategory(id, updates) {
        const cat = this.categories.find(c => c.id === id || c.code === id);
        if (!cat)
            return { success: false, message: 'Không tìm thấy danh mục' };
        if (updates.name)
            cat.name = updates.name.trim();
        if (updates.description !== undefined)
            cat.description = updates.description?.trim();
        if (updates.isActive !== undefined)
            cat.isActive = updates.isActive;
        if (updates.order !== undefined)
            cat.order = Number(updates.order);
        this.persistCategories();
        return { success: true, message: 'Cập nhật danh mục thành công', category: cat };
    }
    static deleteCategory(id) {
        const idx = this.categories.findIndex(c => c.id === id || c.code === id);
        if (idx === -1)
            return { success: false, message: 'Không tìm thấy danh mục' };
        if (this.categories[idx].isDefault) {
            return { success: false, message: 'Không thể xóa danh mục chuẩn của hệ thống (bạn có thể tắt trạng thái hoạt động)' };
        }
        const removed = this.categories.splice(idx, 1)[0];
        this.persistCategories();
        return { success: true, message: `Đã xóa danh mục ${removed.name}` };
    }
    // =========================================================================
    // 📖 PHÂN HỆ 11: SỔ QUỸ HỢP NHẤT & BÁO CÁO DÒNG TIỀN (CASH BOOK LEDGER)
    // =========================================================================
    static getCashBookLedger(filter) {
        // 1. Chuyển đổi toàn bộ Phiếu Thu sang dòng sổ cái
        const receiptsMapped = this.vouchers.map(v => ({
            id: v.id,
            voucherCode: v.voucherCode,
            voucherType: 'RECEIPT',
            subType: v.type,
            categoryCode: v.categoryCode,
            categoryName: v.categoryName || 'Thu cước / công nợ',
            trackingNumber: v.trackingNumber,
            partnerCode: v.customerCode,
            partnerName: v.payerName || v.customerName,
            amountIn: v.amount,
            amountOut: 0,
            runningBalance: 0,
            paymentMethod: v.paymentChannelName,
            referenceCode: v.referenceCode,
            reason: v.reason,
            hub: v.hub,
            createdAt: v.createdAt,
            createdBy: v.createdBy
        }));
        // 2. Chuyển đổi toàn bộ Phiếu Chi sang dòng sổ cái
        const paymentsMapped = this.paymentVouchers.map(v => ({
            id: v.id,
            voucherCode: v.voucherCode,
            voucherType: 'PAYMENT',
            subType: v.type,
            categoryCode: v.categoryCode,
            categoryName: v.categoryName,
            trackingNumber: v.trackingNumber,
            partnerCode: v.vendorCode,
            partnerName: v.recipientName,
            amountIn: 0,
            amountOut: v.amount,
            runningBalance: 0,
            paymentMethod: v.paymentMethodName,
            referenceCode: v.referenceCode,
            reason: v.reason,
            hub: v.hub,
            createdAt: v.createdAt,
            createdBy: v.createdBy
        }));
        // 3. Gom chung và sắp xếp tăng dần theo thời gian để tính số dư lũy kế
        let allMerged = [...receiptsMapped, ...paymentsMapped];
        allMerged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        let running = 0;
        allMerged.forEach(item => {
            running += (item.amountIn - item.amountOut);
            item.runningBalance = running;
        });
        // 4. Tính toán số liệu thống kê toàn bộ
        let totalIn = 0;
        let totalOut = 0;
        let cashIn = 0;
        let cashOut = 0;
        let bankIn = 0;
        let bankOut = 0;
        allMerged.forEach(item => {
            totalIn += item.amountIn;
            totalOut += item.amountOut;
            const isCash = item.paymentMethod.toLowerCase().includes('tiền mặt');
            if (isCash) {
                cashIn += item.amountIn;
                cashOut += item.amountOut;
            }
            else {
                bankIn += item.amountIn;
                bankOut += item.amountOut;
            }
        });
        const summary = {
            totalReceipts: totalIn,
            totalPayments: totalOut,
            netCashFlow: totalIn - totalOut,
            cashInHand: cashIn - cashOut,
            bankBalance: bankIn - bankOut,
            receiptCount: this.vouchers.length,
            paymentCount: this.paymentVouchers.length
        };
        // 5. Đảo ngược để dòng mới nhất lên đầu
        allMerged.reverse();
        // 6. Áp dụng các bộ lọc tìm kiếm
        let filtered = allMerged;
        if (filter?.voucherType && filter.voucherType !== 'ALL') {
            filtered = filtered.filter(i => i.voucherType === filter.voucherType);
        }
        if (filter?.paymentMethod && filter.paymentMethod !== 'ALL') {
            if (filter.paymentMethod === 'CASH') {
                filtered = filtered.filter(i => i.paymentMethod.toLowerCase().includes('tiền mặt'));
            }
            else if (filter.paymentMethod === 'BANK') {
                filtered = filtered.filter(i => !i.paymentMethod.toLowerCase().includes('tiền mặt'));
            }
        }
        if (filter?.categoryCode && filter.categoryCode !== 'ALL') {
            filtered = filtered.filter(i => i.categoryCode === filter.categoryCode);
        }
        if (filter?.hub && filter.hub !== 'ALL') {
            filtered = filtered.filter(i => i.hub === filter.hub);
        }
        if (filter?.fromDate) {
            const from = new Date(filter.fromDate).getTime();
            filtered = filtered.filter(i => new Date(i.createdAt).getTime() >= from);
        }
        if (filter?.toDate) {
            const to = new Date(filter.toDate).getTime() + 86400000;
            filtered = filtered.filter(i => new Date(i.createdAt).getTime() <= to);
        }
        if (filter?.keyword) {
            const kw = filter.keyword.trim().toUpperCase();
            filtered = filtered.filter(i => i.voucherCode.includes(kw) ||
                (i.trackingNumber && i.trackingNumber.toUpperCase().includes(kw)) ||
                (i.partnerName && i.partnerName.toUpperCase().includes(kw)) ||
                (i.referenceCode && i.referenceCode.toUpperCase().includes(kw)) ||
                (i.reason && i.reason.toUpperCase().includes(kw)));
        }
        return {
            summary,
            ledger: filtered
        };
    }
    /**
     * 12. Tra cứu nhanh thông tin AWB phục vụ điền form Lập Phiếu Thu / Phiếu Chi
     */
    static lookupAwbForVoucher(awb) {
        if (!awb || !awb.trim()) {
            return { success: false, message: 'Vui lòng cung cấp mã vận đơn' };
        }
        const clean = awb.trim().toUpperCase();
        const s = ShipmentRepository.getById(clean);
        if (!s) {
            return { success: false, message: `Không tìm thấy thông tin vận đơn: ${clean}` };
        }
        const cust = s.customerCode ? CustomerService.getByCode(s.customerCode) : null;
        const isPaid = s.paymentStatus === 'PAID' || !!s.financialStatus?.isPaid;
        return {
            success: true,
            message: 'Tra cứu vận đơn thành công',
            data: {
                shipmentId: s.shipmentId,
                trackingNumber: s.masterTrackingNumber,
                customerCode: s.customerCode || 'PDL-GUEST',
                customerName: s.customerName || cust?.customerName || cust?.name || 'Khách lẻ',
                payerPhone: s.sender?.phone || cust?.phone || '',
                carrier: s.carrier,
                serviceType: s.serviceType || s.serviceCode || s.serviceName,
                destinationCountry: s.destinationCountry || s.shipTo?.countryCode || s.recipientCountry || '',
                chargeableWeightKg: s.chargeableWeightKg,
                sellPrice: s.sellPrice || (s.chargeableWeightKg ? Math.round(s.chargeableWeightKg * 275000) : 275000),
                costPrice: s.costPrice || Math.round((s.sellPrice || 275000) * 0.75),
                paymentTerm: s.paymentTerm || (s.financialCategory === 'POSTPAID' ? 'POSTPAID' : 'IMMEDIATE'),
                financialCategory: s.financialCategory || 'IMMEDIATE',
                paymentStatus: s.paymentStatus || (isPaid ? 'PAID' : 'UNPAID'),
                isPaid,
                receiptVoucherCode: s.financialStatus?.receiptVoucherCode || s.receiptVoucherCode,
                originHub: s.currentWarehouseHub || s.hub || 'SGN',
                status: s.status
            }
        };
    }
}
FinanceService.init();
