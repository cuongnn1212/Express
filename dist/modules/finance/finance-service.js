import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { AtomicStorageEngine } from '../../core/storage-engine.js';
import { AuthService } from '../auth/auth-service.js';
import { ShipmentRepository } from '../shipment/shipment-repository.js';
import { CustomerService } from '../customer/customer-service.js';
import { RateRegistryService } from '../pricing/rate-registry-service.js';
import { CustomsCargoConfigService } from '../pricing/customs-cargo-config.js';
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
        AtomicStorageEngine.writeJson(this.txFile, this.transactions);
    }
    static persistVouchers() {
        AtomicStorageEngine.writeJson(this.voucherFile, this.vouchers);
    }
    static persistVendorDeposits() {
        AtomicStorageEngine.writeJson(this.vendorDepositFile, this.vendorDeposits);
    }
    static persistCategories() {
        AtomicStorageEngine.writeJson(this.categoryFile, this.categories);
    }
    static persistPaymentVouchers() {
        AtomicStorageEngine.writeJson(this.paymentVoucherFile, this.paymentVouchers);
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
     * Yêu cầu bắt buộc: Mỗi dòng phải có số AWB hợp lệ trong hệ thống.
     * Tự động tính cước từ Bảng giá Hãng + Quốc gia + Trọng lượng (Kg) nếu chưa nhập số tiền.
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
            const destCountry = foundShipment.destinationCountry || foundShipment.shipTo?.countryCode || foundShipment.recipientCountry || 'US';
            const inputWeight = Number(it.weightKg || it.chargeableWeightKg || 0);
            const effectiveWeight = inputWeight > 0 ? inputWeight : (foundShipment.chargeableWeightKg || foundShipment.totalWeightKg || 1);
            let amount = Number(it.amount || 0);
            const quote = RateRegistryService.calculateRateForAwb({
                carrier: foundShipment.carrier,
                destinationCountry: destCountry,
                weightKg: effectiveWeight,
                isDocument: foundShipment.contentsType === 'DOCUMENT',
                customerCode: foundShipment.customerCode
            });
            // Nếu người dùng truyền trọng lượng mới hoặc chưa điền số tiền -> tự động tính cước từ biểu giá
            if (!amount || amount <= 0) {
                amount = quote ? quote.totalSellPrice : (foundShipment.sellPrice || Math.round(effectiveWeight * 275000));
            }
            // Cập nhật lại trọng lượng và giá cước trên vận đơn nếu có thay đổi trọng lượng từ file Excel
            if (inputWeight > 0 && quote) {
                foundShipment.totalWeightKg = inputWeight;
                foundShipment.chargeableWeightKg = quote.chargeableWeightKg;
                foundShipment.sellPrice = amount;
                foundShipment.costPrice = quote.totalCostPrice;
                foundShipment.profit = amount - quote.totalCostPrice;
                ShipmentRepository.save(foundShipment, `Cập nhật trọng lượng (${quote.chargeableWeightKg} kg) & tự động tính cước từ Excel`);
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
                reason: it.reason || `Thu tiền cước AWB ${foundShipment.masterTrackingNumber} (${effectiveWeight} kg) từ file Excel`,
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
     * Tạo File Mẫu Excel Thu Tiền Vận Đơn AWB (.xlsx) - Hỗ trợ cột Trọng Lượng (Kg) để tự động tính cước
     */
    static generateReceiptExcelTemplate() {
        const wb = XLSX.utils.book_new();
        const data = [
            ['STT', 'Mã Vận Đơn (AWB) *', 'Trọng Lượng (Kg) *', 'Số Tiền Thu (VNĐ) (Để trống = Tự tính cước)', 'Hình Thức Thanh Toán', 'Người Nộp Tiền', 'Lý Do Thu / Ghi Chú'],
            [1, '1Z861R320493609873', 17.5, '', 'TIEN_MAT', 'Công ty TNHH XNK Đông Dương', 'Để trống Số Tiền -> Hệ thống tự động tính cước theo Kg'],
            [2, '779988776655', 5.0, '', 'CHUYEN_KHOAN', 'Đại Lý An Nam Logistics', 'Tự động tính cước FedEx theo trọng lượng 5.0 Kg'],
            [3, '1Z84Y8200443069921', 2.5, '', 'TIEN_MAT', 'Nguyễn Văn An', 'Tự động tính cước UPS theo trọng lượng 2.5 Kg']
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { wch: 6 },
            { wch: 24 },
            { wch: 20 },
            { wch: 38 },
            { wch: 22 },
            { wch: 30 },
            { wch: 46 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Thu_Tien_AWB');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
    /**
     * Tạo File Mẫu Excel Chi Phí Vận Đơn AWB (.xlsx) - Hỗ trợ cột Trọng Lượng (Kg) để tự động tính cước gốc
     */
    static generatePaymentExcelTemplate() {
        const wb = XLSX.utils.book_new();
        const data = [
            ['STT', 'Mã Vận Đơn (AWB) *', 'Trọng Lượng (Kg) *', 'Mã Khoản Mục Chi *', 'Số Tiền Chi (VNĐ) (Để trống = Tự tính cước gốc)', 'Người / Đơn Vị Nhận', 'Hình Thức Chi', 'Lý Do Chi Phí'],
            [1, '1Z861R320493609873', 17.5, 'EXP_CARRIER_COST', '', 'UPS Express Worldwide', 'CHUYEN_KHOAN', 'Để trống Số Tiền -> Tự tính cước gốc UPS 17.5 Kg'],
            [2, '779988776655', 5.0, 'EXP_CARRIER_COST', '', 'FedEx Express VN', 'CHUYEN_KHOAN', 'Để trống Số Tiền -> Tự tính cước gốc FedEx 5.0 Kg'],
            [3, '1Z861R320493609873', 17.5, 'EXP_CUSTOMS_CLEARANCE', 450000, 'Hải Quan Nội Bài', 'TIEN_MAT', 'Phí kiểm hóa và thông quan hải quan'],
            [4, '1Z84Y8200443069921', 2.5, 'EXP_PACKAGING_SUPPLIES', 120000, 'Công ty Bao Bì Nam Long', 'TIEN_MAT', 'Mua thùng carton 5 lớp và màng PE']
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { wch: 6 },
            { wch: 24 },
            { wch: 20 },
            { wch: 26 },
            { wch: 40 },
            { wch: 28 },
            { wch: 18 },
            { wch: 44 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Chi_Phi_AWB');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
    /**
     * Đọc và phân tích file Excel Thu Tiền AWB (Tự động tính cước khi up Số AWB + Trọng lượng)
     */
    static parseExcelFileForReceipts(buffer) {
        try {
            const wb = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = wb.SheetNames[0];
            const ws = wb.Sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (!rawRows || rawRows.length < 1) {
                return { success: false, rows: [], validCount: 0, errorCount: 0, totalAmount: 0, errors: ['File Excel rỗng hoặc không có dữ liệu'] };
            }
            let headerIdx = -1;
            let colAwb = -1;
            let colWeight = -1;
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
                    colWeight = row.findIndex(c => c.includes('trọng lượng') || c.includes('cân nặng') || c.includes('weight') || c.includes('(kg)') || c === 'kg' || c.includes('số kg'));
                    colAmount = row.findIndex((c, idx) => idx !== colWeight && (c.includes('tiền') || c.includes('cước') || c.includes('amount') || c.includes('vnđ') || c.includes('vnd')));
                    colChannel = row.findIndex(c => c.includes('kênh') || c.includes('hình thức') || c.includes('channel') || c.includes('method'));
                    colPayer = row.findIndex(c => c.includes('người nộp') || c.includes('khách') || c.includes('payer'));
                    colReason = row.findIndex(c => c.includes('lý do') || c.includes('ghi chú') || c.includes('reason') || c.includes('note'));
                    break;
                }
            }
            if (headerIdx === -1 || colAwb === -1) {
                // Hỗ trợ cả trường hợp file chỉ có 2 cột [AWB, Trọng lượng] không có tiêu đề chuẩn
                const firstRowStr = String(rawRows[0]?.[0] || '').trim().toUpperCase();
                const looksLikeAwbFirstCol = firstRowStr.startsWith('1Z') || /^\d{10,15}$/.test(firstRowStr);
                if (looksLikeAwbFirstCol) {
                    headerIdx = -1; // Đọc từ dòng 0
                    colAwb = 0;
                    colWeight = 1;
                    colAmount = 2;
                }
                else {
                    headerIdx = 0;
                    colAwb = 1;
                    colWeight = 2;
                    colAmount = 3;
                    colChannel = 4;
                    colPayer = 5;
                    colReason = 6;
                }
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
                // Đọc Trọng lượng (Kg) từ cột Trọng lượng (hoặc nhận diện thông minh nếu gõ số Kg < 5000 vào cột Số tiền)
                let inputWeightKg = 0;
                if (colWeight !== -1 && row[colWeight] !== undefined && String(row[colWeight]).trim() !== '') {
                    inputWeightKg = parseFloat(String(row[colWeight]).replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
                }
                let amount = 0;
                if (colAmount !== -1 && row[colAmount] !== undefined && String(row[colAmount]).trim() !== '') {
                    const parsedVal = parseFloat(String(row[colAmount]).replace(/,/g, '').replace(/[^0-9.]/g, '')) || 0;
                    if (parsedVal > 0 && parsedVal < 5000 && inputWeightKg === 0) {
                        // Người dùng nhập số Kg vào cột thứ 3 của file mẫu cũ
                        inputWeightKg = parsedVal;
                    }
                    else {
                        amount = parsedVal;
                    }
                }
                const effectiveWeightKg = inputWeightKg > 0 ? inputWeightKg : (shipment.chargeableWeightKg || shipment.totalWeightKg || 1);
                const destCountry = shipment.destinationCountry || shipment.shipTo?.countryCode || shipment.recipientCountry || 'US';
                // Gọi Engine tự động tính cước từ Bảng giá Hãng + Quốc gia + Trọng lượng + Chính sách Khách hàng
                const quote = RateRegistryService.calculateRateForAwb({
                    carrier: shipment.carrier,
                    destinationCountry: destCountry,
                    weightKg: effectiveWeightKg,
                    isDocument: shipment.contentsType === 'DOCUMENT',
                    customerCode: shipment.customerCode
                });
                let autoCalculated = false;
                if (amount <= 0) {
                    autoCalculated = true;
                    if (quote) {
                        amount = quote.totalSellPrice;
                    }
                    else {
                        amount = shipment.sellPrice || Math.round(effectiveWeightKg * 275000);
                    }
                }
                const chargeableWeightKg = quote ? quote.chargeableWeightKg : effectiveWeightKg;
                const channelRaw = colChannel !== -1 ? String(row[colChannel] || '').toUpperCase() : '';
                const channel = (channelRaw.includes('BANK') || channelRaw.includes('CHUYEN_KHOAN') || channelRaw.includes('CK')) ? 'BANK_TRANSFER' : 'CASH';
                const payerName = (colPayer !== -1 && row[colPayer]) ? String(row[colPayer]).trim() : (shipment.customerName || shipment.customerCode || 'Khách hàng');
                const defaultReason = autoCalculated
                    ? `Thu cước AWB ${shipment.masterTrackingNumber} (${chargeableWeightKg} kg - Zone ${quote?.zone || destCountry} - Tự động tính cước)`
                    : `Thu tiền cước AWB ${shipment.masterTrackingNumber} từ file Excel`;
                const reason = (colReason !== -1 && row[colReason]) ? String(row[colReason]).trim() : defaultReason;
                totalAmount += amount;
                validCount++;
                rows.push({
                    rowNum,
                    awb: shipment.masterTrackingNumber,
                    shipmentId: shipment.shipmentId,
                    customerCode: shipment.customerCode || 'PDL-GUEST',
                    customerName: shipment.customerName,
                    carrier: shipment.carrier,
                    destinationCountry: destCountry,
                    zone: quote?.zone || '',
                    weightKg: chargeableWeightKg,
                    inputWeightKg: effectiveWeightKg,
                    autoCalculated,
                    baseRate: quote?.baseRate || 0,
                    fuelPercent: quote?.fuelSurchargePercent || 0,
                    costPrice: quote?.totalCostPrice || shipment.costPrice || Math.round(amount * 0.75),
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
     * Đọc và phân tích file Excel Chi Phí AWB (Tự động tính cước gốc Hãng khi up Số AWB + Trọng lượng)
     */
    static parseExcelFileForPayments(buffer) {
        try {
            const wb = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = wb.SheetNames[0];
            const ws = wb.Sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (!rawRows || rawRows.length < 1) {
                return { success: false, rows: [], validCount: 0, errorCount: 0, totalAmount: 0, errors: ['File Excel rỗng hoặc không có dữ liệu'] };
            }
            let headerIdx = -1;
            let colAwb = -1;
            let colWeight = -1;
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
                    colWeight = row.findIndex(c => c.includes('trọng lượng') || c.includes('cân nặng') || c.includes('weight') || c.includes('(kg)') || c === 'kg' || c.includes('số kg'));
                    colCategory = row.findIndex(c => c.includes('khoản mục') || c.includes('mục') || c.includes('danh mục') || c.includes('category'));
                    colAmount = row.findIndex((c, idx) => idx !== colWeight && idx !== colCategory && (c.includes('tiền') || c.includes('chi') || c.includes('cước') || c.includes('amount')));
                    colRecipient = row.findIndex(c => c.includes('người nhận') || c.includes('đơn vị') || c.includes('recipient'));
                    colMethod = row.findIndex((c, idx) => idx !== colAmount && (c.includes('hình thức') || c.includes('phương thức') || c.includes('kênh')));
                    colReason = row.findIndex((c, idx) => idx !== colAmount && (c.includes('lý do') || c.includes('ghi chú') || c.includes('reason') || c.includes('note')));
                    break;
                }
            }
            if (headerIdx === -1 || colAwb === -1) {
                const firstRowStr = String(rawRows[0]?.[0] || '').trim().toUpperCase();
                const looksLikeAwbFirstCol = firstRowStr.startsWith('1Z') || /^\d{10,15}$/.test(firstRowStr);
                if (looksLikeAwbFirstCol) {
                    headerIdx = -1;
                    colAwb = 0;
                    colWeight = 1;
                    colAmount = 2;
                }
                else {
                    headerIdx = 0;
                    colAwb = 1;
                    colWeight = 2;
                    colCategory = 3;
                    colAmount = 4;
                    colRecipient = 5;
                    colMethod = 6;
                    colReason = 7;
                }
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
                let inputWeightKg = 0;
                if (colWeight !== -1 && row[colWeight] !== undefined && String(row[colWeight]).trim() !== '') {
                    inputWeightKg = parseFloat(String(row[colWeight]).replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
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
                if (colAmount !== -1 && row[colAmount] !== undefined && String(row[colAmount]).trim() !== '') {
                    const parsedVal = parseFloat(String(row[colAmount]).replace(/,/g, '').replace(/[^0-9.]/g, '')) || 0;
                    if (parsedVal > 0 && parsedVal < 5000 && inputWeightKg === 0) {
                        inputWeightKg = parsedVal;
                    }
                    else {
                        amount = parsedVal;
                    }
                }
                const effectiveWeightKg = inputWeightKg > 0 ? inputWeightKg : (shipment.chargeableWeightKg || shipment.totalWeightKg || 1);
                const destCountry = shipment.destinationCountry || shipment.shipTo?.countryCode || shipment.recipientCountry || 'US';
                const quote = RateRegistryService.calculateRateForAwb({
                    carrier: shipment.carrier,
                    destinationCountry: destCountry,
                    weightKg: effectiveWeightKg,
                    isDocument: shipment.contentsType === 'DOCUMENT',
                    customerCode: shipment.customerCode
                });
                let autoCalculated = false;
                if (amount <= 0) {
                    autoCalculated = true;
                    if (quote) {
                        amount = quote.totalCostPrice;
                    }
                    else {
                        amount = shipment.costPrice || Math.round((shipment.sellPrice || 275000) * 0.75);
                    }
                }
                const chargeableWeightKg = quote ? quote.chargeableWeightKg : effectiveWeightKg;
                let recipientName = colRecipient !== -1 ? String(row[colRecipient] || '').trim() : '';
                if (!recipientName) {
                    recipientName = shipment.carrier === 'FEDEX' ? 'FedEx Express VN' : 'UPS Express Worldwide';
                }
                const methodRaw = colMethod !== -1 ? String(row[colMethod] || '').toUpperCase() : '';
                const method = (methodRaw.includes('BANK') || methodRaw.includes('CHUYEN_KHOAN') || methodRaw.includes('CK')) ? 'BANK_TRANSFER' : 'CASH';
                const defaultReason = autoCalculated
                    ? `Chi cước gốc ${shipment.carrier} theo AWB ${shipment.masterTrackingNumber} (${chargeableWeightKg} kg - Zone ${quote?.zone || destCountry} - Tự tính cước)`
                    : `Chi phí ${catCode} theo AWB ${shipment.masterTrackingNumber} từ file Excel`;
                const reason = colReason !== -1 && row[colReason] ? String(row[colReason]).trim() : defaultReason;
                totalAmount += amount;
                validCount++;
                rows.push({
                    rowNum,
                    awb: shipment.masterTrackingNumber,
                    shipmentId: shipment.shipmentId,
                    carrier: shipment.carrier,
                    destinationCountry: destCountry,
                    zone: quote?.zone || '',
                    weightKg: chargeableWeightKg,
                    autoCalculated,
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
     * Yêu cầu bắt buộc: Mỗi dòng phải có số AWB hợp lệ trong hệ thống.
     * Tự động tính cước gốc mua hãng từ Bảng giá + Quốc gia + Trọng lượng (Kg) nếu chưa nhập số tiền.
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
            const destCountry = foundShipment.destinationCountry || foundShipment.shipTo?.countryCode || foundShipment.recipientCountry || 'US';
            const inputWeight = Number(it.weightKg || it.chargeableWeightKg || 0);
            const effectiveWeight = inputWeight > 0 ? inputWeight : (foundShipment.chargeableWeightKg || foundShipment.totalWeightKg || 1);
            const quote = RateRegistryService.calculateRateForAwb({
                carrier: foundShipment.carrier,
                destinationCountry: destCountry,
                weightKg: effectiveWeight,
                isDocument: foundShipment.contentsType === 'DOCUMENT',
                customerCode: foundShipment.customerCode
            });
            let amount = Number(it.amount || 0);
            if (!amount || amount <= 0) {
                amount = quote ? quote.totalCostPrice : (foundShipment.costPrice || Math.round((foundShipment.sellPrice || 275000) * 0.75));
            }
            if (inputWeight > 0 && quote) {
                foundShipment.totalWeightKg = inputWeight;
                foundShipment.chargeableWeightKg = quote.chargeableWeightKg;
                foundShipment.costPrice = amount;
                if (!foundShipment.sellPrice)
                    foundShipment.sellPrice = quote.totalSellPrice;
                foundShipment.profit = (foundShipment.sellPrice || quote.totalSellPrice) - amount;
                ShipmentRepository.save(foundShipment, `Cập nhật trọng lượng (${quote.chargeableWeightKg} kg) & tự động tính cước gốc từ Excel`);
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
                reason: it.reason || `Chi chi phí theo AWB ${foundShipment.masterTrackingNumber} (${effectiveWeight} kg) từ file Excel`,
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
     * 12. Tra cứu nhanh thông tin AWB phục vụ điền form Lập Phiếu Thu / Phiếu Chi (Hỗ trợ truyền Trọng Lượng mới để tự tính cước)
     */
    static lookupAwbForVoucher(awb, overrideWeightKg) {
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
        const destCountry = s.destinationCountry || s.shipTo?.countryCode || s.recipientCountry || 'US';
        const inputWeight = (overrideWeightKg !== undefined && overrideWeightKg > 0) ? Number(overrideWeightKg) : 0;
        const effectiveWeight = inputWeight > 0 ? inputWeight : (s.chargeableWeightKg || s.totalWeightKg || 1);
        const quote = RateRegistryService.calculateRateForAwb({
            carrier: s.carrier,
            destinationCountry: destCountry,
            weightKg: effectiveWeight,
            isDocument: s.contentsType === 'DOCUMENT',
            customerCode: s.customerCode
        });
        // Nếu người dùng truyền trọng lượng mới -> lấy ngay giá tự tính từ biểu cước
        const finalWeight = quote ? quote.chargeableWeightKg : effectiveWeight;
        const finalSellPrice = inputWeight > 0 && quote
            ? quote.totalSellPrice
            : (s.sellPrice || (quote ? quote.totalSellPrice : Math.round(finalWeight * 275000)));
        const finalCostPrice = inputWeight > 0 && quote
            ? quote.totalCostPrice
            : (s.costPrice || (quote ? quote.totalCostPrice : Math.round(finalSellPrice * 0.75)));
        return {
            success: true,
            message: inputWeight > 0 && quote
                ? `Đã tự động tính cước theo trọng lượng ${finalWeight} kg (Zone ${quote.zone})`
                : 'Tra cứu vận đơn thành công',
            data: {
                shipmentId: s.shipmentId,
                trackingNumber: s.masterTrackingNumber,
                customerCode: s.customerCode || 'PDL-GUEST',
                customerName: s.customerName || cust?.customerName || cust?.name || 'Khách lẻ',
                payerPhone: s.sender?.phone || cust?.phone || '',
                carrier: s.carrier,
                serviceType: s.serviceType || s.serviceCode || s.serviceName,
                destinationCountry: destCountry,
                zone: quote?.zone || '',
                chargeableWeightKg: finalWeight,
                baseRate: quote?.baseRate || 0,
                fuelSurchargePercent: quote?.fuelSurchargePercent || 0,
                fuelSurchargeAmount: quote?.fuelSurchargeAmount || 0,
                marginPercent: quote?.customerPolicyApplied?.marginPercent || 0,
                sellPrice: finalSellPrice,
                costPrice: finalCostPrice,
                autoCalculated: Boolean(quote),
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
    /**
     * 13. Tạo File Mẫu Excel Up Số AWB + Trọng Lượng (Kg) Tự Động Tính Giá Cước (.xlsx)
     * Biểu phí Hải quan áp dụng: 1 loại hàng / 1 AWB (Không cộng dồn phí hàng 8k)
     * - Hàng thông thường: Phí Hải quan 8.000 đ/kg (thay cho phí hàng thường)
     * - Thực phẩm, mỹ phẩm: Trả Hải quan UPS/FedEx 32.000 đ/kg | Thu khách 40.000 đ/kg
     * - Hàng thương hiệu: FedEx 35.000 đ/kg (thu khách 45k) | UPS: Chưa có giá (0đ)
     * - Mi giả, Trầm hương, Tóc: Chưa có giá (0đ)
     */
    static generateAwbPricingExcelTemplate() {
        const wb = XLSX.utils.book_new();
        const data = [
            [
                'STT',
                'Mã Vận Đơn (AWB) *',
                'Trọng Lượng (Kg) *',
                'Quốc Gia Đến (Mã ISO: US, CA, DE, FR, GB, AU, JP, SG, KR...)',
                'Hãng Bay (UPS / FEDEX)',
                'Loại Hàng Hóa (HANG_THONG_THUONG / THUC_PHAM_MY_PHAM / HANG_THUONG_HIEU / MI_GIA / TRAM / TOC / TAI_LIEU)',
                'Mã Khách Hàng (Tùy chọn: PDL-FRANK / PDL-GUEST)',
                'Ghi Chú Nghiệp Vụ'
            ],
            [1, '1Z84Y8200492184701', 2.0, 'US', 'UPS', 'THUC_PHAM_MY_PHAM', 'PDL-FRANK', 'Mỹ phẩm đi Mỹ qua UPS: Trả Hải quan UPS 32k/kg | Thu khách 40k/kg | An ninh 150k'],
            [2, '1Z84Y8200492184702', 1.5, 'CA', 'UPS', 'HANG_THONG_THUONG', 'PDL-FRANK', 'Hàng thông thường đi Canada qua UPS: Trả Hải quan UPS 8k/kg | Thu khách 8k/kg | An ninh 150k'],
            [3, '771234567890', 3.0, 'DE', 'FEDEX', 'HANG_THUONG_HIEU', 'PDL-FRANK', 'Hàng thương hiệu đi Đức qua FedEx: Trả Hải quan FedEx 35k/kg | Thu khách 45k/kg | An ninh 150k'],
            [4, '1Z84Y8200492184704', 0.5, 'FR', 'UPS', 'MI_GIA', 'PDL-FRANK', 'Hàng mi giả đi Pháp qua UPS: Trả HQ 25k/kg | Thu khách 35k/kg | An ninh 150k'],
            [5, '1Z84Y8200492184705', 4.5, 'GB', 'UPS', 'TRAM', 'PDL-FRANK', 'Hàng trầm hương đi Anh qua UPS: Trả HQ 40k/kg | Thu khách 50k/kg | An ninh 150k'],
            [6, '771234567891', 2.5, 'AU', 'FEDEX', 'TOC', 'PDL-FRANK', 'Hàng tóc đi Úc qua FedEx: Trả HQ 30k/kg | Thu khách 42k/kg | An ninh 150k'],
            [7, '1Z84Y8200492184707', 5.0, 'JP', 'UPS', 'HANG_THONG_THUONG', 'PDL-FRANK', 'Hàng thông thường đi Nhật qua UPS: Trả Hải quan UPS 8k/kg | Thu khách 8k/kg | An ninh 150k'],
            [8, '771234567892', 1.0, 'SG', 'FEDEX', 'HANG_THONG_THUONG', 'PDL-FRANK', 'Hàng thông thường đi Singapore qua FedEx: Trả Hải quan FedEx 8k/kg | Thu khách 8k/kg | An ninh 150k'],
            [9, '1Z84Y8200492184709', 8.0, 'KR', 'UPS', 'HANG_THONG_THUONG', 'PDL-FRANK', 'Hàng thông thường đi Hàn Quốc qua UPS: Trả Hải quan UPS 8k/kg | Thu khách 8k/kg | An ninh 150k'],
            [10, '1Z84Y8200492184710', 21.0, 'US', 'UPS', 'THUC_PHAM_MY_PHAM', 'PDL-FRANK', 'Mỹ phẩm 21kg đi Mỹ qua UPS: Nấc 21-44kg | Trả Hải quan UPS 32k/kg | Thu khách 40k/kg | An ninh 150k']
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { wch: 6 },
            { wch: 24 },
            { wch: 18 },
            { wch: 28 },
            { wch: 16 },
            { wch: 32 },
            { wch: 20 },
            { wch: 75 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Mau_10_Don_Hang_Test');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
    /**
     * 14. Đọc File Excel (Số AWB + Trọng Lượng Kg) và Tự Động Tính Giá Gốc (Cost) + Giá Bán (Sell)
     * Theo công thức: (Net + Phí biến động [giảm 50%] + Phí xử lý đơn) * FSC * VAT + Phí Hải quan (theo loại hàng) + Phí An ninh/AWB
     */
    static parseAndCalculateAwbPricingExcel(fileBuffer, applyToShipments = false, options) {
        const wb = XLSX.read(fileBuffer, { type: 'buffer' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!rawRows || rawRows.length === 0) {
            return {
                success: false,
                totalRows: 0,
                validCount: 0,
                totalWeightKg: 0,
                totalBaseRate: 0,
                totalSurgeEmergencyFee: 0,
                totalOrderProcessingFee: 0,
                totalFuelSurchargeAmount: 0,
                totalVatAmount: 0,
                totalCustomsFeeAmount: 0,
                totalSecurityFeeAmount: 0,
                totalCostPrice: 0,
                totalSellPrice: 0,
                totalProfit: 0,
                rows: [],
                errors: ['File Excel rỗng hoặc không đúng định dạng']
            };
        }
        let startIdx = 0;
        let colAwb = 0;
        let colWeight = 1;
        let colCountry = 2;
        let colCarrier = 3;
        let colCargoType = -1;
        let colGeneralGoodsFee = -1;
        let colDeliveryFee = -1;
        let colCustomer = 4;
        let colSupplierSecurityFee = -1;
        const firstRowStr = rawRows[0].map((c) => String(c || '').toLowerCase()).join('|');
        if (firstRowStr.includes('awb') || firstRowStr.includes('vận đơn') || firstRowStr.includes('tracking') || firstRowStr.includes('stt')) {
            startIdx = 1;
            const headers = rawRows[0].map((c) => String(c || '').toLowerCase().trim());
            const findCol = (keywords, fallback) => {
                const idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
                return idx >= 0 ? idx : fallback;
            };
            colAwb = findCol(['awb', 'vận đơn', 'tracking', 'mã đơn'], 1);
            colWeight = findCol(['trọng lượng', 'weight', 'số kg', 'kg', 'kl'], 2);
            colCountry = findCol(['quốc gia', 'country', 'nước', 'iso', 'zone'], 3);
            colCarrier = findCol(['hãng', 'carrier', 'ups', 'fedex'], 4);
            colCargoType = findCol(['loại hàng', 'mỹ phẩm', 'cosmetics', 'hàng hóa', 'cargo'], -1);
            colGeneralGoodsFee = findCol(['phí hàng thường', 'phí hàng', 'hàng thường', 'goods fee', '8.000', '8k'], -1);
            colDeliveryFee = findCol(['phí phát', 'phát hàng', 'giao hàng', 'delivery', 'xử lý', 'processing', 'ipf'], -1);
            colCustomer = findCol(['khách hàng', 'customer', 'mã kh', 'đại lý'], 5);
            colSupplierSecurityFee = findCol(['an ninh ncc', 'an ninh trả ncc', 'an ninh ncc', 'security ncc', 'phí an ninh ncc', 'an ninh viettel'], -1);
        }
        const parsedRows = [];
        const errors = [];
        let totalWeightKg = 0;
        let totalBaseRate = 0;
        let totalSurgeEmergencyFee = 0;
        let totalOrderProcessingFee = 0;
        let totalFuelSurchargeAmount = 0;
        let totalVatAmount = 0;
        let totalCustomsFeeAmount = 0;
        let totalSecurityFeeAmount = 0;
        let totalGeneralGoodsFeeAmount = 0;
        let totalCostPrice = 0;
        let totalSellPrice = 0;
        let totalProfit = 0;
        let updatedShipmentsCount = 0;
        const defCountry = (options?.defaultCountry || 'US').trim().toUpperCase();
        const defCarrier = (options?.defaultCarrier || 'AUTO').trim().toUpperCase();
        const defCust = (options?.defaultCustomerCode || 'PDL-GUEST').trim().toUpperCase();
        const defIsDoc = Boolean(options?.isDocument);
        const defIsCosmetics = Boolean(options?.isCosmetics || options?.defaultCargoType === 'COSMETICS' || options?.defaultCargoType === 'COSMETICS_FOOD');
        const defSecurityFeePerAwb = options?.securityFeePerAwb !== undefined
            ? Number(options.securityFeePerAwb)
            : 150000;
        const defVatPercent = options?.vatPercent !== undefined ? Number(options.vatPercent) : 8;
        const defSurgeDiscount = options?.surgeDiscountPercent !== undefined ? Number(options.surgeDiscountPercent) : 50;
        for (let i = startIdx; i < rawRows.length; i++) {
            const r = rawRows[i];
            if (!r || r.length === 0)
                continue;
            const rawAwb = String(r[colAwb] ?? '').trim().toUpperCase();
            const rawWeightStr = String(r[colWeight] ?? '').replace(/,/g, '').replace(/[^0-9.]/g, '').trim();
            const rawCountry = colCountry >= 0 && colCountry < r.length ? String(r[colCountry] ?? '').trim().toUpperCase() : '';
            const rawCarrier = colCarrier >= 0 && colCarrier < r.length ? String(r[colCarrier] ?? '').trim().toUpperCase() : '';
            const rawCargoTypeStr = colCargoType >= 0 && colCargoType < r.length ? String(r[colCargoType] ?? '').trim().toUpperCase() : '';
            const rawCustomer = colCustomer >= 0 && colCustomer < r.length ? String(r[colCustomer] ?? '').trim().toUpperCase() : '';
            if (!rawAwb && !rawWeightStr)
                continue;
            const rowNum = i + 1;
            if (!rawAwb) {
                parsedRows.push({
                    rowNum,
                    awb: '',
                    valid: false,
                    error: 'Thiếu số AWB'
                });
                errors.push(`Dòng ${rowNum}: Thiếu số AWB`);
                continue;
            }
            const existingShipment = ShipmentRepository.getById(rawAwb);
            const inputWeight = parseFloat(rawWeightStr) || 0;
            const effectiveWeight = inputWeight > 0
                ? inputWeight
                : (existingShipment?.chargeableWeightKg || existingShipment?.totalWeightKg || 1);
            const detectedCarrier = existingShipment?.carrier
                || (rawCarrier.includes('FEDEX') ? 'FEDEX' : rawCarrier.includes('UPS') ? 'UPS' : '')
                || (defCarrier === 'UPS' || defCarrier === 'FEDEX' ? defCarrier : '')
                || (rawAwb.startsWith('1Z') ? 'UPS' : 'FEDEX');
            const destCountry = rawCountry
                || existingShipment?.destinationCountry
                || existingShipment?.shipTo?.countryCode
                || existingShipment?.recipientCountry
                || defCountry
                || 'US';
            const custCode = rawCustomer || existingShipment?.customerCode || defCust || 'PDL-GUEST';
            const custObj = CustomerService.getByCode(custCode);
            const custName = existingShipment?.customerName || custObj?.customerName || custObj?.name || 'Khách vãng lai';
            // Nhận diện loại hàng hóa theo Danh mục Biểu phí Hải quan:
            // Quy tắc: Phí chỉ áp dụng cho 1 loại / 1 AWB duy nhất (Hải quan UPS vs Hải quan FedEx)
            const cargoRate = CustomsCargoConfigService.getCargoRate(rawCargoTypeStr || options?.defaultCargoType || (defIsCosmetics ? 'COSMETICS_FOOD' : (defIsDoc ? 'DOCUMENT' : 'GENERAL')), detectedCarrier);
            const cargoInfo = cargoRate.cargoType;
            const isCosmeticsRow = cargoInfo.code === 'COSMETICS_FOOD';
            const cargoTypeLabel = cargoInfo.code;
            const cargoTypeDisplayName = cargoInfo.displayName;
            const customsBeneficiary = detectedCarrier === 'FEDEX' ? 'Hải quan FedEx' : 'Hải quan UPS';
            let rowDeliveryVal = NaN;
            if (colDeliveryFee >= 0 && colDeliveryFee < r.length) {
                const dStr = String(r[colDeliveryFee] ?? '').replace(/,/g, '').replace(/[^0-9.]/g, '').trim();
                if (dStr)
                    rowDeliveryVal = Number(dStr);
            }
            const isUsDest = destCountry === 'US' || destCountry === 'USA';
            const baseUsDeliveryFee = 58750;
            const viettelDeliveryDiscountPercent = options?.viettelDeliveryDiscountPercent !== undefined
                ? Number(options.viettelDeliveryDiscountPercent)
                : 40;
            // Phí phát hàng Viettel Cost (giảm 40% còn 35.250 đ)
            const supplierOrderProcFee = !isNaN(rowDeliveryVal) && rowDeliveryVal >= 0
                ? rowDeliveryVal
                : (detectedCarrier === 'UPS' && isUsDest ? Math.round(baseUsDeliveryFee * (1 - viettelDeliveryDiscountPercent / 100)) : (options?.supplierDeliveryFee || 0));
            // Phí phát hàng Thu Khách (mặc định 58.750 đ nếu đi US)
            const customerOrderProcFee = !isNaN(rowDeliveryVal) && rowDeliveryVal >= 0
                ? rowDeliveryVal
                : (detectedCarrier === 'UPS' && isUsDest ? (options?.customerDeliveryFee || baseUsDeliveryFee) : (options?.deliveryFee || options?.orderProcessingFee || 0));
            // Đơn giá Hải quan (đ/kg) theo Biểu phí Hải quan UPS / FedEx
            const supplierCustomsFeePerKg = cargoRate.supplierFeePerKg;
            const customerCustomsFeePerKg = cargoRate.customerFeePerKg;
            // Phí an ninh trả NCC (nếu có phát sinh)
            let rowSuppSecurityVal = NaN;
            if (colSupplierSecurityFee >= 0 && colSupplierSecurityFee < r.length) {
                const sStr = String(r[colSupplierSecurityFee] ?? '').replace(/,/g, '').replace(/[^0-9.]/g, '').trim();
                if (sStr)
                    rowSuppSecurityVal = Number(sStr);
            }
            const supplierSecurityFeeAmount = !isNaN(rowSuppSecurityVal) && rowSuppSecurityVal >= 0
                ? rowSuppSecurityVal
                : (options?.supplierSecurityFeePerAwb !== undefined ? Number(options.supplierSecurityFeePerAwb) : 0);
            // Tỷ lệ Phụ Phí Xăng Dầu (FSC %) do người dùng cấu hình cho từng lần up
            const fscRaw = detectedCarrier === 'FEDEX'
                ? (options?.fedexFuelPercent !== undefined ? options.fedexFuelPercent : options?.fuelPercentOverride)
                : (options?.upsFuelPercent !== undefined ? options.upsFuelPercent : options?.fuelPercentOverride);
            const fscOverride = fscRaw !== undefined && !isNaN(Number(fscRaw)) ? Number(fscRaw) : undefined;
            // 1. Tính Cước Chi Trả Nhà Cung Cấp Viettel (Cost):
            // - Biểu cước Viettel (ups_viettel_2026)
            // - Phí Phát Hàng Tại Mỹ được giảm 40% (35.250 đ)
            // - Phí Hải quan: Đơn giá theo loại hàng & hãng (Hải quan UPS / FedEx)
            // - Phí An ninh: Phí an ninh trả NCC nếu có phát sinh
            const supplierQuote = RateRegistryService.calculateRateForAwb({
                carrier: detectedCarrier,
                destinationCountry: destCountry,
                weightKg: effectiveWeight,
                isDocument: existingShipment ? existingShipment.contentsType === 'DOCUMENT' : (cargoInfo.code === 'DOCUMENT'),
                customerCode: 'PDL-SUPPLIER-VIETTEL',
                isCosmetics: isCosmeticsRow,
                cargoType: cargoInfo.code,
                customsFeePerKg: supplierCustomsFeePerKg,
                securityFeePerAwb: supplierSecurityFeeAmount,
                vatPercent: defVatPercent,
                surgeDiscountPercent: defSurgeDiscount,
                orderProcessingFee: supplierOrderProcFee,
                deliveryFee: supplierOrderProcFee,
                fuelPercentOverride: fscOverride,
                rateTableId: detectedCarrier === 'UPS' ? 'ups_viettel_2026' : undefined
            });
            // 2. Tính Cước Thu Khách Hàng (Sell):
            // - Biểu cước Khách Frank (ups_frank_2026) hoặc bảng giá khách
            // - Phí Hải quan Khách: Đơn giá theo loại hàng & hãng
            // - Phí An ninh: 150.000 đ / 1 đơn hàng (AWB)
            const customerQuote = RateRegistryService.calculateRateForAwb({
                carrier: detectedCarrier,
                destinationCountry: destCountry,
                weightKg: effectiveWeight,
                isDocument: existingShipment ? existingShipment.contentsType === 'DOCUMENT' : (cargoInfo.code === 'DOCUMENT'),
                customerCode: custCode,
                isCosmetics: isCosmeticsRow,
                cargoType: cargoInfo.code,
                customsFeePerKg: customerCustomsFeePerKg,
                securityFeePerAwb: defSecurityFeePerAwb,
                vatPercent: defVatPercent,
                surgeDiscountPercent: defSurgeDiscount,
                orderProcessingFee: customerOrderProcFee,
                deliveryFee: customerOrderProcFee,
                fuelPercentOverride: fscOverride,
                rateTableId: (detectedCarrier === 'UPS' && (custCode.toUpperCase().includes('FRANK') || custCode.toUpperCase().includes('GUEST') || defCust.toUpperCase().includes('FRANK'))) ? 'ups_frank_2026' : undefined
            });
            const chargeableWeightKg = customerQuote ? customerQuote.chargeableWeightKg : (supplierQuote ? supplierQuote.chargeableWeightKg : effectiveWeight);
            // Quy tắc tính phí hải quan: Nếu dưới 1 kg thì làm tròn thành 1 kg để tính
            const customsWeightKg = chargeableWeightKg > 0 ? Math.max(1, chargeableWeightKg) : 0;
            // (A) CƯỚC TRẢ HÃNG VIETTEL: Net + Biến Động + Phát Hàng + FSC + VAT 8%
            const supplierCarrierFreight = supplierQuote?.totalAfterVat ?? (supplierQuote ? ((supplierQuote.subtotalBeforeVat || 0) + (supplierQuote.vatAmount || 0)) : 0);
            // (B) PHÍ TRẢ HẢI QUAN (UPS/FEDEX): Áp dụng 1 loại hàng duy nhất / 1 AWB (Không cộng dồn, dưới 1kg tính 1kg)
            const supplierCustomsFeeAmount = supplierQuote?.customsFeeAmount !== undefined ? supplierQuote.customsFeeAmount : Math.round(customsWeightKg * supplierCustomsFeePerKg);
            // (C) TỔNG CHI TRẢ CHI PHÍ = Cước Trả Hãng Viettel + Phí Trả Hải Quan + Phí An Ninh Trả NCC
            const supplierCostPrice = supplierCarrierFreight + supplierCustomsFeeAmount + supplierSecurityFeeAmount;
            // (D) CƯỚC HÃNG THU KHÁCH: Net Frank/Khách + Biến Động + Phát Hàng + FSC + VAT 8%
            const customerCarrierFreight = customerQuote?.totalAfterVat ?? (customerQuote ? ((customerQuote.subtotalBeforeVat || 0) + (customerQuote.vatAmount || 0)) : 0);
            // (E) PHÍ BIẾN ĐỘNG THỊ TRƯỜNG (% tự setup): Tính theo % trên cước vận chuyển hãng
            const marketMarkupPercent = options?.marketMarkupPercent !== undefined ? Number(options.marketMarkupPercent) : 0;
            const marketMarkupAmount = Math.round((customerCarrierFreight * marketMarkupPercent) / 100);
            // (F) PHÍ HẢI QUAN THU KHÁCH: Áp dụng 1 loại hàng duy nhất / 1 AWB (Dưới 1kg tính 1kg)
            const customerCustomsFeeAmount = customerQuote?.customsFeeAmount !== undefined ? customerQuote.customsFeeAmount : Math.round(customsWeightKg * customerCustomsFeePerKg);
            // (G) PHÍ AN NINH THU KHÁCH: 150.000 đ / 1 AWB
            const customerSecurityFeeAmount = customerQuote?.securityFeeAmount !== undefined ? customerQuote.securityFeeAmount : defSecurityFeePerAwb;
            // (H) TỔNG THU KHÁCH HÀNG = Cước Hãng + Phí Biến Động Thị Trường + Phí Hải Quan + Phí An Ninh
            const customerSellPrice = customerCarrierFreight + marketMarkupAmount + customerCustomsFeeAmount + customerSecurityFeeAmount;
            // (I) LỢI NHUẬN GỘP = Tổng Thu Khách - Tổng Chi Trả Chi Phí
            const profit = customerSellPrice - supplierCostPrice;
            const zone = customerQuote?.zone || supplierQuote?.zone || '10';
            const baseRate = customerQuote ? customerQuote.baseRate : Math.round(chargeableWeightKg * 150000);
            const surgeEmergencyFee = customerQuote?.surgeEmergencyFee || 0;
            const ipfFee = customerQuote?.deliveryFee !== undefined ? customerQuote.deliveryFee : (customerQuote?.orderProcessingFee !== undefined ? customerQuote.orderProcessingFee : customerOrderProcFee);
            const fuelSurchargePercent = customerQuote?.fuelSurchargePercent || 52.5;
            const fuelSurchargeAmount = customerQuote?.fuelSurchargeAmount || 0;
            const vatPercent = customerQuote?.vatPercent !== undefined ? customerQuote.vatPercent : defVatPercent;
            const vatAmount = customerQuote?.vatAmount || 0;
            const customsFeeAmount = customerCustomsFeeAmount;
            const securityFeeAmount = customerSecurityFeeAmount;
            totalWeightKg += chargeableWeightKg;
            totalBaseRate += baseRate;
            totalSurgeEmergencyFee += surgeEmergencyFee;
            totalOrderProcessingFee += ipfFee;
            totalFuelSurchargeAmount += fuelSurchargeAmount;
            totalVatAmount += vatAmount;
            totalCustomsFeeAmount += (customsFeeAmount || 0);
            totalSecurityFeeAmount += (securityFeeAmount || 0);
            totalCostPrice += supplierCostPrice;
            totalSellPrice += customerSellPrice;
            totalProfit += profit;
            let statusNote = existingShipment ? '⚠️ Đã có trên hệ thống (Không lưu lại)' : 'AWB mới (Tự tính cước)';
            if (applyToShipments) {
                if (existingShipment) {
                    statusNote = '⚠️ AWB đã tồn tại trên hệ thống (Bỏ qua, không lưu đè)';
                }
                else {
                    const nowIso = new Date().toISOString();
                    const newShp = {
                        id: `SHP-${Date.now()}-${rowNum}`,
                        shipmentId: `SHP-${Date.now()}-${rowNum}`,
                        shipmentNumber: `PDL-${Date.now().toString().slice(-6)}-${rowNum}`,
                        masterTrackingNumber: rawAwb,
                        carrier: detectedCarrier,
                        serviceCode: detectedCarrier === 'UPS' ? 'SAVER' : 'IP',
                        serviceName: customerQuote?.serviceName || (detectedCarrier === 'UPS' ? 'UPS Worldwide Saver' : 'FedEx Intl Priority'),
                        customerCode: custCode,
                        customerName: custName,
                        financialCategory: custObj?.financialCategory === 'POSTPAID_CONTRACT' ? 'POSTPAID' : custObj?.financialCategory === 'PREPAID_WALLET' ? 'WALLET' : 'IMMEDIATE',
                        paymentTerm: custObj?.financialCategory === 'POSTPAID_CONTRACT' ? 'POSTPAID' : 'PREPAID',
                        paymentStatus: 'UNPAID',
                        status: 'INBOUND_RECEIVED',
                        hub: 'SGN',
                        currentWarehouseHub: 'SGN',
                        totalPieces: 1,
                        totalWeightKg: effectiveWeight,
                        volumetricWeightKg: effectiveWeight,
                        chargeableWeightKg,
                        costPrice: supplierCostPrice,
                        sellPrice: customerSellPrice,
                        profit,
                        destinationCountry: destCountry,
                        shipFrom: {
                            contactName: custName,
                            companyName: custName,
                            city: 'HO CHI MINH',
                            countryCode: 'VN',
                            phone: custObj?.phone || '0909000111'
                        },
                        shipTo: {
                            contactName: 'CONSIGNEE ' + destCountry,
                            city: destCountry,
                            countryCode: destCountry,
                            phone: '0000000000'
                        },
                        pieces: [
                            {
                                pieceNumber: 1,
                                trackingNumber: rawAwb,
                                weightKg: effectiveWeight,
                                lengthCm: 25,
                                widthCm: 20,
                                heightCm: 15,
                                inboundStatus: 'INBOUNDED'
                            }
                        ],
                        createdAt: nowIso
                    };
                    ShipmentRepository.save(newShp, `Khởi tạo tự động từ Tool Tính Giá Excel (${chargeableWeightKg}kg)`);
                    statusNote = 'Đã tạo đơn & lưu giá mới';
                    updatedShipmentsCount++;
                }
            }
            parsedRows.push({
                rowNum,
                awb: rawAwb,
                carrier: detectedCarrier,
                destinationCountry: destCountry,
                zone,
                cargoType: cargoTypeLabel,
                cargoTypeDisplayName,
                customsBeneficiary,
                isCosmetics: isCosmeticsRow,
                customerCode: custCode,
                customerName: custName,
                inputWeightKg: effectiveWeight,
                weightKg: effectiveWeight,
                chargeableWeightKg,
                // Cước và Phí Chi Trả (Supplier - Viettel & Hải Quan)
                supplierCarrierFreight,
                supplierBaseRate: supplierQuote?.baseRate || 0,
                supplierSurgeEmergencyFee: supplierQuote?.surgeEmergencyFee || 0,
                supplierDeliveryFee: supplierQuote?.deliveryFee || 0,
                supplierFuelSurchargeAmount: supplierQuote?.fuelSurchargeAmount || 0,
                supplierVatAmount: supplierQuote?.vatAmount || 0,
                supplierCustomsFeePerKg,
                supplierCustomsFeeAmount,
                supplierSecurityFeeAmount,
                supplierSecurityFeePerAwb: supplierSecurityFeeAmount,
                supplierCostPrice,
                // Cước và Phí Thu Khách Hàng (Customer - Frank)
                customerCarrierFreight,
                customerBaseRate: customerQuote?.baseRate || 0,
                customerSurgeEmergencyFee: customerQuote?.surgeEmergencyFee || 0,
                customerDeliveryFee: customerQuote?.deliveryFee || 0,
                customerFuelSurchargeAmount: customerQuote?.fuelSurchargeAmount || 0,
                customerVatAmount: customerQuote?.vatAmount || 0,
                marketMarkupPercent,
                marketMarkupAmount,
                customerCustomsFeePerKg,
                customerCustomsFeeAmount,
                customerSecurityFeePerAwb: defSecurityFeePerAwb,
                customerSecurityFeeAmount,
                customerSellPrice,
                // Tương thích ngược cho các bảng và form cũ
                baseRate,
                surgeEmergencyFee,
                orderProcessingFee: ipfFee,
                deliveryFee: ipfFee,
                ipfFee,
                fuelSurchargePercent,
                fuelSurchargeAmount,
                vatPercent,
                vatAmount,
                customsFeePerKg: customerCustomsFeePerKg,
                customsFeeAmount,
                generalGoodsFeePerKg: supplierCustomsFeePerKg,
                generalGoodsFeeAmount: supplierCustomsFeeAmount,
                airFeeAmount: 0,
                securityFeePerAwb: defSecurityFeePerAwb,
                securityFeeAmount,
                costPrice: supplierCostPrice,
                sellPrice: customerSellPrice,
                profit,
                marginPercent: customerQuote?.customerPolicyApplied?.marginPercent || 0,
                existedInSystem: Boolean(existingShipment),
                statusNote,
                valid: true
            });
        }
        return {
            success: parsedRows.some(r => r.valid),
            appliedToShipments: applyToShipments,
            updatedShipmentsCount,
            totalRows: parsedRows.length,
            validCount: parsedRows.filter(r => r.valid).length,
            errorCount: errors.length,
            totalWeightKg: Math.round(totalWeightKg * 100) / 100,
            totalBaseRate,
            totalSurgeEmergencyFee,
            totalOrderProcessingFee,
            totalDeliveryFee: totalOrderProcessingFee,
            totalFuelSurchargeAmount,
            totalVatAmount,
            totalCustomsFeeAmount,
            totalSecurityFeeAmount,
            totalGeneralGoodsFeeAmount,
            totalCostPrice,
            totalSellPrice,
            totalProfit,
            rows: parsedRows,
            errors
        };
    }
    /**
     * 15. Tính lại giá cước tức thì cho 1 dòng AWB trong Tool Tính Giá Excel khi người dùng chỉnh sửa Số Kg / Quốc gia / Hãng / Mã KH / Loại Hàng / Phí Hàng
     */
    static recalculateSingleAwbRow(params) {
        const cleanAwb = String(params.awb || '').trim().toUpperCase();
        const existingShipment = cleanAwb ? ShipmentRepository.getById(cleanAwb) : undefined;
        const effectiveWeight = Number(params.weightKg) > 0 ? Number(params.weightKg) : 1;
        const detectedCarrier = (params.carrier || existingShipment?.carrier || (cleanAwb.startsWith('1Z') ? 'UPS' : 'FEDEX')).toUpperCase();
        const destCountry = (params.destinationCountry || params.countryCode || existingShipment?.destinationCountry || existingShipment?.shipTo?.countryCode || 'US').toUpperCase();
        const custCode = (params.customerCode || existingShipment?.customerCode || 'PDL-GUEST').toUpperCase();
        const custObj = CustomerService.getByCode(custCode);
        const custName = existingShipment?.customerName || custObj?.customerName || custObj?.name || 'Khách vãng lai';
        // Tỷ lệ Phụ Phí Xăng Dầu (FSC %)
        const fscRaw = params.fuelPercentOverride !== undefined ? params.fuelPercentOverride : params.fuelSurchargePercent;
        const fscOverride = fscRaw !== undefined && !isNaN(Number(fscRaw)) ? Number(fscRaw) : undefined;
        // Nhận diện loại hàng theo Biểu phí Hải quan UPS / FedEx
        const cargoRate = CustomsCargoConfigService.getCargoRate(params.cargoType || (params.isCosmetics ? 'COSMETICS_FOOD' : (params.isDocument ? 'DOCUMENT' : 'GENERAL')), detectedCarrier);
        const cargoInfo = cargoRate.cargoType;
        const isCosmetics = cargoInfo.code === 'COSMETICS_FOOD' || Boolean(params.isCosmetics);
        const customsBeneficiary = detectedCarrier === 'FEDEX' ? 'Hải quan FedEx' : 'Hải quan UPS';
        const isUsDest = destCountry === 'US' || destCountry === 'USA';
        const baseUsDeliveryFee = 58750;
        // Phí phát hàng tại Mỹ: Viettel Post đang được áp dụng giảm 40% (58.750 đ * 0.6 = 35.250 đ)
        const viettelDeliveryDiscountPercent = params.viettelDeliveryDiscountPercent !== undefined
            ? Number(params.viettelDeliveryDiscountPercent)
            : 40;
        const supplierDeliveryFee = params.supplierDeliveryFee !== undefined
            ? Number(params.supplierDeliveryFee)
            : (detectedCarrier === 'UPS' && isUsDest ? Math.round(baseUsDeliveryFee * (1 - viettelDeliveryDiscountPercent / 100)) : 0);
        const deliveryInput = params.deliveryFee !== undefined ? Number(params.deliveryFee) : (params.orderProcessingFee !== undefined ? Number(params.orderProcessingFee) : undefined);
        const customerDeliveryFee = deliveryInput !== undefined
            ? deliveryInput
            : (params.customerDeliveryFee !== undefined
                ? Number(params.customerDeliveryFee)
                : (detectedCarrier === 'UPS' && isUsDest ? baseUsDeliveryFee : 0));
        const vatPercent = params.vatPercent !== undefined ? Number(params.vatPercent) : 8;
        const surgeDiscountPercent = params.surgeDiscountPercent !== undefined ? Number(params.surgeDiscountPercent) : 50;
        // Đơn giá Hải quan (đ/kg)
        const supplierCustomsFeePerKg = params.supplierCustomsFeePerKg !== undefined
            ? Number(params.supplierCustomsFeePerKg)
            : cargoRate.supplierFeePerKg;
        const customerCustomsFeePerKg = params.customsFeePerKg !== undefined
            ? Number(params.customsFeePerKg)
            : cargoRate.customerFeePerKg;
        // 1. Tính Cước Chi Trả Nhà Cung Cấp Viettel (Cost):
        // Phí phát hàng tại Mỹ trả Viettel được giảm 40% (35.250 đ)
        const supplierQuote = RateRegistryService.calculateRateForAwb({
            carrier: detectedCarrier,
            destinationCountry: destCountry,
            weightKg: effectiveWeight,
            isDocument: Boolean(params.isDocument || cargoInfo.code === 'DOCUMENT'),
            customerCode: 'PDL-SUPPLIER-VIETTEL',
            isCosmetics,
            cargoType: cargoInfo.code,
            customsFeePerKg: supplierCustomsFeePerKg,
            securityFeePerAwb: 0,
            vatPercent,
            surgeDiscountPercent,
            orderProcessingFee: supplierDeliveryFee,
            deliveryFee: supplierDeliveryFee,
            fuelPercentOverride: fscOverride,
            rateTableId: detectedCarrier === 'UPS' ? 'ups_viettel_2026' : undefined
        });
        // 2. Tính Cước Thu Khách Hàng (Sell):
        const customerQuote = RateRegistryService.calculateRateForAwb({
            carrier: detectedCarrier,
            destinationCountry: destCountry,
            weightKg: effectiveWeight,
            isDocument: Boolean(params.isDocument || cargoInfo.code === 'DOCUMENT'),
            customerCode: custCode,
            isCosmetics,
            cargoType: cargoInfo.code,
            customsFeePerKg: customerCustomsFeePerKg,
            securityFeePerAwb: params.securityFeePerAwb !== undefined ? Number(params.securityFeePerAwb) : 150000,
            vatPercent,
            surgeDiscountPercent,
            orderProcessingFee: customerDeliveryFee,
            deliveryFee: customerDeliveryFee,
            fuelPercentOverride: fscOverride,
            rateTableId: (detectedCarrier === 'UPS' && (custCode.toUpperCase().includes('FRANK') || custCode.toUpperCase().includes('GUEST'))) ? 'ups_frank_2026' : undefined
        });
        const chargeableWeightKg = customerQuote ? customerQuote.chargeableWeightKg : (supplierQuote ? supplierQuote.chargeableWeightKg : effectiveWeight);
        // Quy tắc tính phí hải quan: Nếu dưới 1 kg thì làm tròn thành 1 kg để tính
        const customsWeightKg = chargeableWeightKg > 0 ? Math.max(1, chargeableWeightKg) : 0;
        const inputSuppSecurity = params.supplierSecurityFeeAmount !== undefined
            ? Number(params.supplierSecurityFeeAmount)
            : (params.supplierSecurityFeePerAwb !== undefined ? Number(params.supplierSecurityFeePerAwb) : 0);
        const supplierSecurityFeeAmount = !isNaN(inputSuppSecurity) && inputSuppSecurity >= 0 ? inputSuppSecurity : 0;
        // (A) CƯỚC TRẢ HÃNG VIETTEL: Net + Biến Động + Phát Hàng + FSC + VAT 8%
        const supplierCarrierFreight = supplierQuote?.totalAfterVat ?? (supplierQuote ? ((supplierQuote.subtotalBeforeVat || 0) + (supplierQuote.vatAmount || 0)) : 0);
        // (B) PHÍ TRẢ HẢI QUAN (UPS/FEDEX): Áp dụng 1 loại hàng duy nhất / 1 AWB (Không cộng dồn, dưới 1kg tính 1kg)
        const supplierCustomsFeeAmount = supplierQuote?.customsFeeAmount !== undefined ? supplierQuote.customsFeeAmount : Math.round(customsWeightKg * supplierCustomsFeePerKg);
        // (C) TỔNG CHI TRẢ CHI PHÍ = Cước Trả Hãng Viettel + Phí Trả Hải Quan + Phí An Ninh Trả NCC
        const supplierCostPrice = supplierCarrierFreight + supplierCustomsFeeAmount + supplierSecurityFeeAmount;
        // (D) CƯỚC HÃNG THU KHÁCH: Net Frank/Khách + Biến Động + Phát Hàng + FSC + VAT 8%
        const customerCarrierFreight = customerQuote?.totalAfterVat ?? (customerQuote ? ((customerQuote.subtotalBeforeVat || 0) + (customerQuote.vatAmount || 0)) : 0);
        // (E) PHÍ BIẾN ĐỘNG THỊ TRƯỜNG (% tự setup): Tính theo % trên cước vận chuyển hãng
        const marketMarkupPercent = params.marketMarkupPercent !== undefined
            ? Number(params.marketMarkupPercent)
            : (params.marginPercent !== undefined ? Number(params.marginPercent) : 0);
        const marketMarkupAmount = Math.round((customerCarrierFreight * marketMarkupPercent) / 100);
        // (F) PHÍ HẢI QUAN THU KHÁCH: Áp dụng 1 loại hàng duy nhất / 1 AWB (Dưới 1kg tính 1kg)
        const customerCustomsFeeAmount = customerQuote?.customsFeeAmount !== undefined ? customerQuote.customsFeeAmount : Math.round(customsWeightKg * customerCustomsFeePerKg);
        // (G) PHÍ AN NINH THU KHÁCH: 150.000 đ / 1 AWB
        const customerSecurityFeeAmount = customerQuote?.securityFeeAmount !== undefined ? customerQuote.securityFeeAmount : 150000;
        // (H) TỔNG THU KHÁCH HÀNG = Cước Hãng + Phí Biến Động Thị Trường + Phí Hải Quan + Phí An Ninh
        const customerSellPrice = customerCarrierFreight + marketMarkupAmount + customerCustomsFeeAmount + customerSecurityFeeAmount;
        // (I) LỢI NHUẬN GỘP = Tổng Thu Khách - Tổng Chi Trả Chi Phí
        const profit = customerSellPrice - supplierCostPrice;
        const cargoTypeDisplayName = cargoInfo.displayName;
        const baseRate = customerQuote ? customerQuote.baseRate : Math.round(chargeableWeightKg * 150000);
        const surgeEmergencyFee = customerQuote?.surgeEmergencyFee || 0;
        const ipfFee = customerQuote?.deliveryFee !== undefined ? customerQuote.deliveryFee : (customerQuote?.orderProcessingFee !== undefined ? customerQuote.orderProcessingFee : customerDeliveryFee);
        const fuelSurchargePercent = customerQuote?.fuelSurchargePercent || 52.5;
        const fuelSurchargeAmount = customerQuote?.fuelSurchargeAmount || 0;
        const vatAmount = customerQuote?.vatAmount || 0;
        const customsFeeAmount = customerCustomsFeeAmount;
        const securityFeeAmount = customerSecurityFeeAmount;
        return {
            success: true,
            row: {
                awb: cleanAwb || 'AWB-MOI',
                carrier: detectedCarrier,
                destinationCountry: destCountry,
                zone: customerQuote?.zone || supplierQuote?.zone || '10',
                cargoType: cargoInfo.code,
                cargoTypeDisplayName,
                customsBeneficiary,
                isCosmetics,
                customerCode: custCode,
                customerName: custName,
                inputWeightKg: effectiveWeight,
                weightKg: effectiveWeight,
                chargeableWeightKg,
                // Cước và Phí Chi Trả (Supplier - Viettel & Hải Quan)
                supplierCarrierFreight,
                supplierBaseRate: supplierQuote?.baseRate || 0,
                supplierSurgeEmergencyFee: supplierQuote?.surgeEmergencyFee || 0,
                supplierDeliveryFee: supplierQuote?.deliveryFee || 0,
                supplierFuelSurchargeAmount: supplierQuote?.fuelSurchargeAmount || 0,
                supplierVatAmount: supplierQuote?.vatAmount || 0,
                supplierCustomsFeePerKg,
                supplierCustomsFeeAmount,
                supplierSecurityFeeAmount,
                supplierSecurityFeePerAwb: supplierSecurityFeeAmount,
                supplierCostPrice,
                // Cước và Phí Thu Khách Hàng (Customer - Frank)
                customerCarrierFreight,
                customerBaseRate: customerQuote?.baseRate || 0,
                customerSurgeEmergencyFee: customerQuote?.surgeEmergencyFee || 0,
                customerDeliveryFee: customerQuote?.deliveryFee || 0,
                customerFuelSurchargeAmount: customerQuote?.fuelSurchargeAmount || 0,
                customerVatAmount: customerQuote?.vatAmount || 0,
                marketMarkupPercent,
                marketMarkupAmount,
                customerCustomsFeePerKg,
                customerCustomsFeeAmount,
                customerSecurityFeePerAwb: 150000,
                customerSecurityFeeAmount,
                customerSellPrice,
                // Tương thích ngược
                baseRate,
                surgeEmergencyFee,
                orderProcessingFee: ipfFee,
                deliveryFee: ipfFee,
                ipfFee,
                fuelSurchargePercent,
                fuelSurchargeAmount,
                vatPercent,
                vatAmount,
                customsFeePerKg: customerCustomsFeePerKg,
                customsFeeAmount,
                generalGoodsFeePerKg: supplierCustomsFeePerKg,
                generalGoodsFeeAmount: supplierCustomsFeeAmount,
                airFeeAmount: 0,
                securityFeePerAwb: 150000,
                securityFeeAmount,
                costPrice: supplierCostPrice,
                sellPrice: customerSellPrice,
                profit,
                marginPercent: customerQuote?.customerPolicyApplied?.marginPercent || 0,
                existedInSystem: Boolean(existingShipment),
                statusNote: existingShipment ? '⚠️ Đã có trên hệ thống (Không lưu lại)' : 'Tự tính cước theo biểu giá',
                valid: true
            }
        };
    }
    /**
     * 16. Xuất Danh Sách Kết Quả Tính Giá AWB Ra File Excel (.xlsx) Chuẩn Đẹp:
     * Bóc tách riêng Cước Hãng, Phí Hải Quan, Phí An Ninh, Tổng Cost, Tổng Sell, Lợi Nhuận Gộp
     */
    static exportAwbPricingResultToExcel(rows) {
        const validRows = (rows || []).filter(r => r && r.valid !== false);
        const aoa = [
            ['PANDALEX EXPRESS - BẢNG TỔNG HỢP ĐỐI SOÁT & TÍNH GIÁ CƯỚC VẬN ĐƠN AWB HÀNG LOẠT'],
            [`Ngày kết xuất: ${new Date().toLocaleDateString('vi-VN')} | Đơn vị tiền tệ: VNĐ | Phí chỉ áp dụng 1 loại hàng / 1 AWB`],
            [],
            [
                'STT',
                'Mã Vận Đơn (AWB)',
                'Hãng Bay',
                'Quốc Gia Đến',
                'Vùng (Zone)',
                'Loại Hàng Hóa',
                'Mã Khách Hàng',
                'Trọng Lượng (Kg)',
                'Cước Net Khách (VNĐ)',
                'Phí Biến Động Khẩn Cấp - Hãng UPS (VNĐ)',
                'Phí Phát Hàng (VNĐ)',
                'Phụ Phí Xăng FSC (VNĐ)',
                'Thuế VAT 8% (VNĐ)',
                'TỔNG CƯỚC HÃNG KHÁCH (VNĐ)',
                'Tỷ Lệ Phí Biến Động Thị Trường (%)',
                'Tiền Phí Biến Động Thị Trường (VNĐ)',
                'Đơn Vị Thụ Hưởng Hải Quan',
                'PHÍ HẢI QUAN (VNĐ)',
                'PHÍ AN NINH THU KHÁCH (VNĐ)',
                'PHÍ AN NINH TRẢ NCC (VNĐ)',
                'TỔNG CHI TRẢ - COST (VNĐ)',
                'TỔNG THU KHÁCH - SELL (VNĐ)',
                'LỢI NHUẬN GỘP (VNĐ)',
                'Ghi Chú / Trạng Thái'
            ]
        ];
        let sumWeight = 0, sumBase = 0, sumSurge = 0, sumDelivery = 0, sumFsc = 0, sumVat = 0;
        let sumCarrierKhach = 0, sumMarketMarkup = 0, sumCustoms = 0, sumSecurity = 0, sumSuppSecurity = 0, sumCost = 0, sumSell = 0, sumProfit = 0;
        validRows.forEach((r, idx) => {
            const w = Number(r.chargeableWeightKg || r.weightKg || 0);
            const base = Number(r.customerBaseRate !== undefined ? r.customerBaseRate : (r.baseRate || 0));
            const surge = Number(r.customerSurgeEmergencyFee !== undefined ? r.customerSurgeEmergencyFee : (r.surgeEmergencyFee || 0));
            const delivery = Number(r.customerDeliveryFee !== undefined ? r.customerDeliveryFee : (r.deliveryFee || r.orderProcessingFee || r.ipfFee || 0));
            const fsc = Number(r.customerFuelSurchargeAmount !== undefined ? r.customerFuelSurchargeAmount : (r.fuelSurchargeAmount || 0));
            const vat = Number(r.customerVatAmount !== undefined ? r.customerVatAmount : (r.vatAmount || 0));
            const carrierKhach = Number(r.customerCarrierFreight !== undefined ? r.customerCarrierFreight : (base + surge + delivery + fsc + vat));
            const marketMarkupPct = Number(r.marketMarkupPercent || 0);
            const marketMarkupAmount = Number(r.marketMarkupAmount !== undefined ? r.marketMarkupAmount : Math.round(carrierKhach * (marketMarkupPct / 100)));
            const customs = Number(r.customerCustomsFeeAmount !== undefined ? r.customerCustomsFeeAmount : (r.customsFeeAmount || 0));
            const security = Number(r.customerSecurityFeeAmount !== undefined ? r.customerSecurityFeeAmount : (r.securityFeeAmount || 150000));
            const suppSecurity = Number(r.supplierSecurityFeeAmount !== undefined ? r.supplierSecurityFeeAmount : (r.supplierSecurityFeePerAwb || 0));
            const cost = Number(r.supplierCostPrice !== undefined ? r.supplierCostPrice : (r.costPrice || 0));
            const sell = Number(r.customerSellPrice !== undefined ? r.customerSellPrice : (carrierKhach + marketMarkupAmount + customs + security));
            const profit = Number(r.profit !== undefined ? r.profit : (sell - cost));
            sumWeight += w;
            sumBase += base;
            sumSurge += surge;
            sumDelivery += delivery;
            sumFsc += fsc;
            sumVat += vat;
            sumCarrierKhach += carrierKhach;
            sumMarketMarkup += marketMarkupAmount;
            sumCustoms += customs;
            sumSecurity += security;
            sumSuppSecurity += suppSecurity;
            sumCost += cost;
            sumSell += sell;
            sumProfit += profit;
            aoa.push([
                idx + 1,
                r.awb || '',
                r.carrier || 'UPS',
                r.destinationCountry || 'US',
                r.zone || '',
                r.cargoTypeDisplayName || (r.isCosmetics ? 'Thực Phẩm, Mỹ Phẩm' : 'Hàng Thông Thường'),
                r.customerCode || 'PDL-GUEST',
                w,
                base,
                surge,
                delivery,
                fsc,
                vat,
                carrierKhach,
                `${marketMarkupPct}%`,
                marketMarkupAmount,
                r.customsBeneficiary || (r.carrier === 'FEDEX' ? 'Hải quan FedEx' : 'Hải quan UPS'),
                customs,
                security,
                suppSecurity,
                cost,
                sell,
                profit,
                r.statusNote || 'Đã tính giá'
            ]);
        });
        const totalRowIdx = aoa.length + 1;
        aoa.push([
            'TỔNG CỘNG',
            `${validRows.length} vận đơn AWB`,
            '', '', '', '', '',
            Math.round(sumWeight * 100) / 100,
            sumBase, sumSurge, sumDelivery, sumFsc, sumVat,
            sumCarrierKhach,
            '',
            sumMarketMarkup,
            '',
            sumCustoms,
            sumSecurity,
            sumSuppSecurity,
            sumCost,
            sumSell,
            sumProfit,
            ''
        ]);
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        // Gắn công thức Excel chuẩn vào các dòng:
        // N: TỔNG CƯỚC HÃNG KHÁCH = I# + J# + K# + L# + M#
        // P: TIỀN PHÍ BIẾN ĐỘNG THỊ TRƯỜNG = ROUND(N# * O#, 0)
        // V: TỔNG THU KHÁCH = N# + P# + R# + S#
        // W: LỢI NHUẬN GỘP = V# - U#
        validRows.forEach((r, idx) => {
            const rowIdx = idx + 5;
            const carrierKhach = Number(r.customerCarrierFreight || 0);
            const marketMarkupAmount = Number(r.marketMarkupAmount || 0);
            const sell = Number(r.customerSellPrice || r.sellPrice || 0);
            const cost = Number(r.supplierCostPrice || r.costPrice || 0);
            const profit = Number(r.profit !== undefined ? r.profit : (sell - cost));
            ws[`N${rowIdx}`] = { t: 'n', f: `I${rowIdx}+J${rowIdx}+K${rowIdx}+L${rowIdx}+M${rowIdx}`, v: carrierKhach };
            ws[`P${rowIdx}`] = { t: 'n', f: `ROUND(N${rowIdx}*O${rowIdx},0)`, v: marketMarkupAmount };
            ws[`V${rowIdx}`] = { t: 'n', f: `N${rowIdx}+P${rowIdx}+R${rowIdx}+S${rowIdx}`, v: sell };
            ws[`W${rowIdx}`] = { t: 'n', f: `V${rowIdx}-U${rowIdx}`, v: profit };
        });
        if (validRows.length > 0) {
            const fCols = {
                H: Math.round(sumWeight * 100) / 100,
                I: sumBase, J: sumSurge, K: sumDelivery, L: sumFsc, M: sumVat,
                N: sumCarrierKhach, P: sumMarketMarkup, R: sumCustoms, S: sumSecurity,
                T: sumSuppSecurity, U: sumCost, V: sumSell, W: sumProfit
            };
            for (const [colLetter, val] of Object.entries(fCols)) {
                ws[`${colLetter}${totalRowIdx}`] = { t: 'n', f: `SUM(${colLetter}5:${colLetter}${totalRowIdx - 1})`, v: val };
            }
        }
        ws['!cols'] = [
            { wch: 6 }, // A: STT
            { wch: 22 }, // B: AWB
            { wch: 10 }, // C: Carrier
            { wch: 14 }, // D: Dest Country
            { wch: 12 }, // E: Zone
            { wch: 28 }, // F: Cargo Type
            { wch: 15 }, // G: Cust Code
            { wch: 16 }, // H: Weight
            { wch: 18 }, // I: Base Rate
            { wch: 20 }, // J: Phí Biến Động Hãng UPS
            { wch: 18 }, // K: Delivery
            { wch: 18 }, // L: FSC
            { wch: 16 }, // M: VAT
            { wch: 22 }, // N: Tổng Cước Hãng
            { wch: 16 }, // O: % Biến Động Thị Trường
            { wch: 20 }, // P: Tiền Biến Động Thị Trường
            { wch: 22 }, // Q: Đơn vị Hải Quan
            { wch: 18 }, // R: Customs Fee
            { wch: 18 }, // S: Security Fee Thu Khách
            { wch: 18 }, // T: Security Fee Trả NCC
            { wch: 22 }, // U: Cost Trả NCC
            { wch: 22 }, // V: Sell Thu Khách
            { wch: 18 }, // W: LỢI NHUẬN GỘP
            { wch: 24 } // X: Note
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Bang_Tong_Hop_Chi_Phi_AWB');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
    /**
     * 17. Xuất Bảng Kê Cước Thu Khách Hàng (.xlsx) - Đầy đủ tất cả các loại phí (Không lộ giá vốn Viettel/Hải quan)
     * Tách bạch rõ: Cước Hãng Khách + Phí Hải Quan Thu Khách + Phí An Ninh Hàng Không
     */
    static exportCustomerPricingExcel(rows) {
        const validRows = (rows || []).filter(r => r && r.valid !== false);
        const wb = XLSX.utils.book_new();
        const aoa = [
            ['PANDALEX EXPRESS - BẢNG KÊ CƯỚC VẬN CHUYỂN QUỐC TẾ THU KHÁCH HÀNG'],
            [`Khách hàng: FRANK | Biểu cước: UPS FRANK 2026 | Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} | Đơn vị tiền tệ: VNĐ`],
            [],
            [
                'STT',
                'Mã Vận Đơn (AWB)',
                'Hãng Bay',
                'Nước Đến',
                'Vùng (Zone)',
                'Loại Hàng Hóa',
                'Trọng Lượng (Kg)',
                'Cước Net Khách (VNĐ)',
                'Phí Biến Động Khẩn Cấp - Hãng UPS (VNĐ)',
                'Phí Phát Hàng (VNĐ)',
                'Tỷ Lệ Xăng FSC (%)',
                'Phụ Phí Xăng FSC (VNĐ)',
                'Thuế VAT 8% (VNĐ)',
                'CƯỚC VẬN CHUYỂN HÃNG (VNĐ)',
                'Tỷ Lệ Phí Biến Động Thị Trường (%)',
                'Tiền Phí Biến Động Thị Trường (VNĐ)',
                'Đơn Giá Hải Quan (đ/kg)',
                'PHÍ HẢI QUAN THU KHÁCH (VNĐ)',
                'PHÍ AN NINH (150k/AWB)',
                'TỔNG TIỀN THANH TOÁN (VNĐ)',
                'Ghi Chú'
            ]
        ];
        let sumKg = 0, sumBase = 0, sumSur = 0, sumDel = 0, sumFsc = 0, sumVat = 0;
        let sumCarrierKhach = 0, sumMarketMarkup = 0, sumHq = 0, sumSec = 0, sumTot = 0;
        validRows.forEach((r, idx) => {
            const w = Number(r.chargeableWeightKg || r.weightKg || 0);
            const base = Number(r.customerBaseRate !== undefined ? r.customerBaseRate : (r.baseRate || 0));
            const sur = Number(r.customerSurgeEmergencyFee !== undefined ? r.customerSurgeEmergencyFee : (r.surgeEmergencyFee || 0));
            const del = Number(r.customerDeliveryFee !== undefined ? r.customerDeliveryFee : (r.deliveryFee || r.orderProcessingFee || r.ipfFee || 0));
            const fscPct = Number(r.fuelSurchargePercent !== undefined ? r.fuelSurchargePercent : (r.carrier === 'FEDEX' ? 23.5 : 52.5));
            const fsc = Number(r.customerFuelSurchargeAmount !== undefined ? r.customerFuelSurchargeAmount : (r.fuelSurchargeAmount || 0));
            const vat = Number(r.customerVatAmount !== undefined ? r.customerVatAmount : (r.vatAmount || 0));
            const carrierKhach = Number(r.customerCarrierFreight !== undefined ? r.customerCarrierFreight : (base + sur + del + fsc + vat));
            const marketMarkupPct = Number(r.marketMarkupPercent || 0);
            const marketMarkupAmount = Number(r.marketMarkupAmount !== undefined ? r.marketMarkupAmount : Math.round(carrierKhach * (marketMarkupPct / 100)));
            const cargoRate = CustomsCargoConfigService.getCargoRate(r.cargoType || (r.isCosmetics ? 'COSMETICS_FOOD' : undefined), r.carrier || 'UPS');
            const hqPerKg = Number(r.customerCustomsFeePerKg !== undefined ? r.customerCustomsFeePerKg : cargoRate.customerFeePerKg);
            const customsWeight = w > 0 ? Math.max(1, w) : 0;
            const hq = Number(r.customerCustomsFeeAmount !== undefined ? r.customerCustomsFeeAmount : Math.round(customsWeight * hqPerKg));
            const sec = Number(r.customerSecurityFeeAmount !== undefined ? r.customerSecurityFeeAmount : (r.securityFeeAmount !== undefined ? r.securityFeeAmount : 150000));
            const tot = Number(r.customerSellPrice !== undefined ? r.customerSellPrice : (carrierKhach + marketMarkupAmount + hq + sec));
            sumKg += w;
            sumBase += base;
            sumSur += sur;
            sumDel += del;
            sumFsc += fsc;
            sumVat += vat;
            sumCarrierKhach += carrierKhach;
            sumMarketMarkup += marketMarkupAmount;
            sumHq += hq;
            sumSec += sec;
            sumTot += tot;
            aoa.push([
                idx + 1,
                r.awb || '',
                r.carrier || 'UPS',
                r.destinationCountry || 'US',
                r.zone || '',
                r.cargoTypeDisplayName || cargoRate.cargoType.displayName,
                w,
                base,
                sur,
                del,
                `${fscPct}%`,
                fsc,
                vat,
                carrierKhach,
                `${marketMarkupPct}%`,
                marketMarkupAmount,
                hqPerKg,
                hq,
                sec,
                tot,
                r.statusNote || r.note || ''
            ]);
        });
        const totalRowIdx = aoa.length + 1;
        aoa.push([
            'TỔNG CỘNG',
            `${validRows.length} vận đơn AWB`,
            '', '', '', '',
            Math.round(sumKg * 100) / 100,
            sumBase, sumSur, sumDel,
            '', // Tỷ lệ FSC
            sumFsc, sumVat,
            sumCarrierKhach,
            '', // % Biến động TT
            sumMarketMarkup,
            '', // Đơn giá HQ
            sumHq, sumSec, sumTot,
            ''
        ]);
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        // Gắn công thức Excel:
        // Cột N (Cước Vận Chuyển Hãng) = H# + I# + J# + L# + M#
        // Cột P (Tiền Phí Biến Động Thị Trường) = ROUND(N# * O#, 0)
        // Cột R (Phí Hải Quan) = IF(G#<1, 1, G#) * Q# (Dưới 1kg làm tròn 1kg)
        // Cột T (Tổng Tiền Thanh Toán) = N# + P# + R# + S#
        validRows.forEach((r, idx) => {
            const rowNum = idx + 5;
            const carrierKhach = Number(r.customerCarrierFreight || 0);
            const marketMarkupAmount = Number(r.marketMarkupAmount || 0);
            const hq = Number(r.customerCustomsFeeAmount || 0);
            const tot = Number(r.customerSellPrice || r.sellPrice || 0);
            ws[`N${rowNum}`] = { t: 'n', f: `H${rowNum}+I${rowNum}+J${rowNum}+L${rowNum}+M${rowNum}`, v: carrierKhach };
            ws[`P${rowNum}`] = { t: 'n', f: `ROUND(N${rowNum}*O${rowNum},0)`, v: marketMarkupAmount };
            ws[`R${rowNum}`] = { t: 'n', f: `IF(G${rowNum}<1,1,G${rowNum})*Q${rowNum}`, v: hq };
            ws[`T${rowNum}`] = { t: 'n', f: `N${rowNum}+P${rowNum}+R${rowNum}+S${rowNum}`, v: tot };
        });
        if (validRows.length > 0) {
            const fCols = {
                G: Math.round(sumKg * 100) / 100,
                H: sumBase, I: sumSur, J: sumDel, L: sumFsc, M: sumVat,
                N: sumCarrierKhach, P: sumMarketMarkup, R: sumHq, S: sumSec, T: sumTot
            };
            for (const [col, val] of Object.entries(fCols)) {
                ws[`${col}${totalRowIdx}`] = { t: 'n', f: `SUM(${col}5:${col}${totalRowIdx - 1})`, v: val };
            }
        }
        ws['!cols'] = [
            { wch: 6 }, // STT (A)
            { wch: 22 }, // AWB (B)
            { wch: 10 }, // Carrier (C)
            { wch: 12 }, // Dest (D)
            { wch: 12 }, // Zone (E)
            { wch: 28 }, // Cargo Type (F)
            { wch: 16 }, // Weight (G)
            { wch: 20 }, // Base Rate (H)
            { wch: 20 }, // Phí Biến Động Hãng UPS (I)
            { wch: 18 }, // Delivery (J)
            { wch: 18 }, // Tỷ Lệ FSC (%) (K)
            { wch: 20 }, // Tiền Phụ Phí FSC (L)
            { wch: 16 }, // VAT (M)
            { wch: 24 }, // CƯỚC VẬN CHUYỂN HÃNG (N)
            { wch: 16 }, // % Biến Động Thị Trường (O)
            { wch: 20 }, // Tiền Biến Động Thị Trường (P)
            { wch: 18 }, // Đơn giá HQ (Q)
            { wch: 22 }, // PHÍ HẢI QUAN (R)
            { wch: 20 }, // PHÍ AN NINH (S)
            { wch: 26 }, // TỔNG TIỀN THANH TOÁN (T)
            { wch: 30 } // Ghi Chú (U)
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Bang_Ke_Thu_Tien_Khach_Hang');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
    /**
     * 18. Xuất Bảng Kê Chi Trả Cước Cho Nhà Cung Cấp & Hải Quan (.xlsx)
     * Phân định rõ 2 khoản chi trả:
     * (1) Cước Vận Chuyển Hãng (Viettel Post): Net + Biến Động + Phát Hàng + FSC + VAT 8%
     * (2) Phí Hải Quan Thông Quan (Hải quan UPS / Hải quan FedEx): Áp dụng đúng 1 loại hàng / 1 AWB
     */
    static exportSupplierPricingExcel(rows) {
        const validRows = (rows || []).filter(r => r && r.valid !== false);
        const wb = XLSX.utils.book_new();
        const aoa = [
            ['PANDALEX EXPRESS - BẢNG KÊ CHI TRẢ CHI PHÍ ĐỐI SOÁT (CƯỚC HÃNG VIETTEL & PHÍ HẢI QUAN)'],
            [`Đối tác: VIETTEL POST (Dịch vụ UPS/FedEx) & HẢI QUAN UPS / HẢI QUAN FEDEX | Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} | Đơn vị tiền tệ: VNĐ`],
            [],
            [
                'STT',
                'Mã Vận Đơn (AWB)',
                'Hãng Vận Chuyển',
                'Nước Đến',
                'Vùng (Zone)',
                'Loại Hàng Hóa',
                'Trọng Lượng (Kg)',
                'Cước Net Viettel (VNĐ)',
                'Phí Biến Động - Giảm 50% (VNĐ)',
                'Phí Phát Hàng (VNĐ)',
                'Tỷ Lệ Xăng FSC (%)',
                'Phụ Phí Xăng FSC (VNĐ)',
                'Thuế VAT 8% (VNĐ)',
                'TỔNG CƯỚC TRẢ HÃNG VIETTEL (VNĐ)',
                'Đơn Vị Thụ Hưởng Hải Quan',
                'Đơn Giá Hải Quan (đ/kg)',
                'THÀNH TIỀN PHÍ HẢI QUAN (VNĐ)',
                'PHÍ AN NINH TRẢ NCC (VNĐ)',
                'TỔNG CHI TRẢ NCC - COST (VNĐ)',
                'TỔNG THU KHÁCH - SELL (VNĐ)',
                'LỢI NHUẬN GỘP (VNĐ)',
                'Ghi Chú Đối Soát'
            ]
        ];
        let sumKg = 0, sumBase = 0, sumSur = 0, sumDel = 0, sumFsc = 0, sumVat = 0;
        let sumCarrierViettel = 0, sumHq = 0, sumSuppSecurity = 0, sumTot = 0, sumSell = 0, sumProfit = 0;
        validRows.forEach((r, idx) => {
            const w = Number(r.chargeableWeightKg || r.weightKg || 0);
            const base = Number(r.supplierBaseRate !== undefined ? r.supplierBaseRate : (r.baseRate || 0));
            const sur = Number(r.supplierSurgeEmergencyFee !== undefined ? r.supplierSurgeEmergencyFee : (r.surgeEmergencyFee || 0));
            const del = Number(r.supplierDeliveryFee !== undefined ? r.supplierDeliveryFee : (r.deliveryFee || r.orderProcessingFee || r.ipfFee || 0));
            const fscPct = Number(r.fuelSurchargePercent !== undefined ? r.fuelSurchargePercent : (r.carrier === 'FEDEX' ? 23.5 : 52.5));
            const fsc = Number(r.supplierFuelSurchargeAmount !== undefined ? r.supplierFuelSurchargeAmount : (r.fuelSurchargeAmount || 0));
            const vat = Number(r.supplierVatAmount !== undefined ? r.supplierVatAmount : (r.vatAmount || 0));
            const carrierViettel = Number(r.supplierCarrierFreight !== undefined ? r.supplierCarrierFreight : (base + sur + del + fsc + vat));
            const cargoRate = CustomsCargoConfigService.getCargoRate(r.cargoType || (r.isCosmetics ? 'COSMETICS_FOOD' : undefined), r.carrier || 'UPS');
            const hqPerKg = Number(r.supplierCustomsFeePerKg !== undefined ? r.supplierCustomsFeePerKg : cargoRate.supplierFeePerKg);
            const customsWeight = w > 0 ? Math.max(1, w) : 0;
            const hq = Number(r.supplierCustomsFeeAmount !== undefined ? r.supplierCustomsFeeAmount : Math.round(customsWeight * hqPerKg));
            const suppSecurity = Number(r.supplierSecurityFeeAmount !== undefined ? r.supplierSecurityFeeAmount : (r.supplierSecurityFeePerAwb || 0));
            const tot = Number(r.supplierCostPrice !== undefined ? r.supplierCostPrice : (carrierViettel + hq + suppSecurity));
            const sell = Number(r.customerSellPrice !== undefined ? r.customerSellPrice : (r.sellPrice || 0));
            const profit = Number(r.profit !== undefined ? r.profit : (sell - tot));
            const beneficiary = r.customsBeneficiary || (r.carrier === 'FEDEX' ? 'Hải quan FedEx' : 'Hải quan UPS');
            sumKg += w;
            sumBase += base;
            sumSur += sur;
            sumDel += del;
            sumFsc += fsc;
            sumVat += vat;
            sumCarrierViettel += carrierViettel;
            sumHq += hq;
            sumSuppSecurity += suppSecurity;
            sumTot += tot;
            sumSell += sell;
            sumProfit += profit;
            aoa.push([
                idx + 1,
                r.awb || '',
                r.carrier || 'UPS',
                r.destinationCountry || 'US',
                r.zone || '',
                r.cargoTypeDisplayName || cargoRate.cargoType.displayName,
                w,
                base,
                sur,
                del,
                `${fscPct}%`,
                fsc,
                vat,
                carrierViettel,
                beneficiary,
                hqPerKg,
                hq,
                suppSecurity,
                tot,
                sell,
                profit,
                r.statusNote || r.note || ''
            ]);
        });
        const totalRowIdx = aoa.length + 1;
        aoa.push([
            'TỔNG CỘNG',
            `${validRows.length} vận đơn AWB`,
            '', '', '', '',
            Math.round(sumKg * 100) / 100,
            sumBase, sumSur, sumDel,
            '', // Tỷ lệ FSC
            sumFsc, sumVat,
            sumCarrierViettel,
            '', '',
            sumHq,
            sumSuppSecurity,
            sumTot,
            sumSell,
            sumProfit,
            ''
        ]);
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        // Gắn công thức Excel:
        // Cột N (Tổng Cước Trả Hãng Viettel) = SUM(H#:J#) + L# + M#
        // Cột Q (Thành Tiền Phí Hải Quan) = IF(G#<1, 1, G#) * P# (Dưới 1kg tính tròn 1kg)
        // Cột S (Tổng Chi Trả Chi Phí) = N# + Q# + R#
        // Cột U (Lợi Nhuận Gộp) = T# - S#
        validRows.forEach((r, idx) => {
            const rowNum = idx + 5;
            const carrierViettel = Number(r.supplierCarrierFreight || 0);
            const hq = Number(r.supplierCustomsFeeAmount || 0);
            const tot = Number(r.supplierCostPrice || r.costPrice || 0);
            const sell = Number(r.customerSellPrice || r.sellPrice || 0);
            const profit = Number(r.profit !== undefined ? r.profit : (sell - tot));
            ws[`N${rowNum}`] = { t: 'n', f: `SUM(H${rowNum}:J${rowNum})+L${rowNum}+M${rowNum}`, v: carrierViettel };
            ws[`Q${rowNum}`] = { t: 'n', f: `IF(G${rowNum}<1,1,G${rowNum})*P${rowNum}`, v: hq };
            ws[`S${rowNum}`] = { t: 'n', f: `N${rowNum}+Q${rowNum}+R${rowNum}`, v: tot };
            ws[`U${rowNum}`] = { t: 'n', f: `T${rowNum}-S${rowNum}`, v: profit };
        });
        if (validRows.length > 0) {
            const fCols = {
                G: Math.round(sumKg * 100) / 100,
                H: sumBase, I: sumSur, J: sumDel, L: sumFsc, M: sumVat,
                N: sumCarrierViettel, Q: sumHq, R: sumSuppSecurity, S: sumTot,
                T: sumSell, U: sumProfit
            };
            for (const [col, val] of Object.entries(fCols)) {
                ws[`${col}${totalRowIdx}`] = { t: 'n', f: `SUM(${col}5:${col}${totalRowIdx - 1})`, v: val };
            }
        }
        ws['!cols'] = [
            { wch: 6 }, // A: STT
            { wch: 22 }, // B: AWB
            { wch: 10 }, // C: Carrier
            { wch: 12 }, // D: Dest
            { wch: 12 }, // E: Zone
            { wch: 28 }, // F: Cargo Type
            { wch: 16 }, // G: Weight
            { wch: 20 }, // H: Base Rate
            { wch: 18 }, // I: Surge
            { wch: 18 }, // J: Delivery
            { wch: 18 }, // K: Tỷ Lệ FSC (%)
            { wch: 20 }, // L: Tiền FSC
            { wch: 16 }, // M: VAT
            { wch: 24 }, // N: TỔNG CƯỚC TRẢ HÃNG VIETTEL
            { wch: 24 }, // O: ĐƠN VỊ THỤ HƯỞNG HẢI QUAN
            { wch: 18 }, // P: Đơn giá HQ
            { wch: 22 }, // Q: THÀNH TIỀN PHÍ HẢI QUAN
            { wch: 20 }, // R: PHÍ AN NINH TRẢ NCC
            { wch: 24 }, // S: TỔNG CHI TRẢ NCC (COST)
            { wch: 24 }, // T: TỔNG THU KHÁCH (SELL)
            { wch: 20 }, // U: LỢI NHUẬN GỘP
            { wch: 30 } // V: Ghi Chú
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Bang_Ke_Chi_Tra_NCC_Va_HQ');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
}
FinanceService.init();
