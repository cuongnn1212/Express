import { ROOT_DIR } from './bootstrap.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { ExcelRateImporter } from './modules/pricing/excel-rate-importer.js';
import { FedExRateImporter } from './modules/pricing/fedex-rate-importer.js';
import { UniversalPricingEngine } from './modules/pricing/universal-pricing-engine.js';
import { RateRegistryService } from './modules/pricing/rate-registry-service.js';
import { CustomerPolicyService } from './modules/customer/customer-policy-service.js';
import { SurchargeConfigService } from './modules/pricing/surcharge-config-service.js';
import { ShipmentService, ShipmentValidationError } from './modules/shipment/shipment-service.js';
import { ShipmentRepository } from './modules/shipment/shipment-repository.js';
import { AddressBookService } from './modules/customer/address-book-service.js';
import { TrackingService } from './modules/tracking/tracking-service.js';
import { AuthService, HUBS_LIST } from './modules/auth/auth-service.js';
import { AviationComplianceChecker } from './modules/shipment/compliance-checker.js';
import { WarehouseService } from './modules/warehouse/warehouse-service.js';
import { FinanceService } from './modules/finance/finance-service.js';
import { FreightService } from './modules/freight/freight-service.js';
import { CustomerService } from './modules/customer/customer-service.js';
import { ExcelExportService } from './modules/export/excel-export-service.js';
import { CommercialInvoiceService } from './modules/export/commercial-invoice-service.js';
import { InvoiceRepository } from './modules/export/invoice-repository.js';
import { AwbOcrService } from './modules/shipment/awb-ocr-service.js';
import { AwbManagerService } from './modules/shipment/awb-manager-service.js';
import { ManifestService } from './modules/warehouse/manifest-service.js';
import { ReconciliationService } from './modules/finance/reconciliation-service.js';
import { CommunicationService } from './modules/customer/communication-service.js';
import compression from 'compression';
dotenv.config();
const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
// Trang chủ chuẩn quốc tế (UPS Style) cho Khách hàng & Giao tiếp CSKH
app.get('/', (req, res) => {
    res.sendFile(path.resolve('public', 'index.html'));
});
app.get('/home', (req, res) => {
    res.sendFile(path.resolve('public', 'index.html'));
});
app.get('/calculator', (req, res) => {
    res.sendFile(path.resolve('public', 'calculator.html'));
});
app.get('/quote', (req, res) => {
    res.sendFile(path.resolve('public', 'calculator.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.resolve('public', 'login.html'));
});
app.get('/login.html', (req, res) => {
    res.sendFile(path.resolve('public', 'login.html'));
});
app.use(express.static('public'));
app.use('/uploads', express.static(path.resolve('uploads')));
// Khởi tạo thư mục upload
const awbPdfDir = path.resolve('uploads/awb_pdfs');
if (!fs.existsSync(awbPdfDir)) {
    fs.mkdirSync(awbPdfDir, { recursive: true });
}
RateRegistryService.init();
const uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.resolve('uploads/rates');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
const upload = multer({ storage: uploadStorage });
// Biểu cước mặc định được đóng gói trong thư mục rates/ của dự án (không phụ thuộc máy tính cá nhân)
const upsExcelPath = path.join(ROOT_DIR, 'rates', 'UPS_QUOTATION_2026.xlsx');
const fedexExcelPath = path.join(ROOT_DIR, 'rates', 'FEDEX_SELL_JUL_2026.xlsx');
// Nạp an toàn: nếu thiếu/lỗi file biểu cước thì ghi log và tiếp tục chạy, không làm sập server
function safeLoad(label, loader) {
    try {
        console.log(`📦 Đang nạp biểu cước ${label} khởi điểm...`);
        return loader();
    }
    catch (err) {
        console.error(`⚠️ Không nạp được biểu cước ${label}: ${err?.message || err}. Có thể tải lên lại trong trang Admin.`);
        return undefined;
    }
}
const upsRateTable = safeLoad('UPS', () => ExcelRateImporter.parseUpsRateFile(upsExcelPath));
if (upsRateTable) {
    RateRegistryService.registerTable(upsRateTable, {
        id: 'ups_default_2026',
        carrier: 'UPS',
        contractName: upsRateTable.contractName,
        serviceName: upsRateTable.serviceName,
        fileName: 'QUOTATION 1.2026_ UPS.xlsx',
        filePath: upsExcelPath,
        uploadedAt: new Date().toISOString(),
        isActive: true
    });
}
const fedexRateTable = safeLoad('FedEx', () => FedExRateImporter.parseFedExRateFile(fedexExcelPath, 'IP'));
if (fedexRateTable) {
    RateRegistryService.registerTable(fedexRateTable, {
        id: 'fedex_default_2026',
        carrier: 'FEDEX',
        contractName: fedexRateTable.contractName,
        serviceName: fedexRateTable.serviceName,
        fileName: 'FEDEX EXP UPDATE 01 JUL 2026 - SELL.xlsx',
        filePath: fedexExcelPath,
        uploadedAt: new Date().toISOString(),
        isActive: true
    });
}
const universalEngine = new UniversalPricingEngine([upsRateTable, fedexRateTable].filter((t) => !!t));
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        system: 'PandaLex Express Universal Gateway',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        activeCarriers: universalEngine.getAvailableCarriers(),
        rateTables: RateRegistryService.getAllMetas()
    });
});
/**
 * API: Tải file mẫu biểu cước Excel chuẩn UPS
 * GET /api/templates/ups
 */
app.get('/api/templates/ups', (req, res) => {
    const filePath = path.resolve('templates/MAU_BANG_GIA_CHUAN_UPS.xlsx');
    res.download(filePath, 'MAU_BANG_GIA_CHUAN_UPS.xlsx');
});
/**
 * API: Tải file mẫu biểu cước Excel chuẩn FEDEX
 * GET /api/templates/fedex
 */
app.get('/api/templates/fedex', (req, res) => {
    const filePath = path.resolve('templates/MAU_BANG_GIA_CHUAN_FEDEX.xlsx');
    res.download(filePath, 'MAU_BANG_GIA_CHUAN_FEDEX.xlsx');
});
/**
 * API: Lấy danh sách toàn bộ các bảng giá đã tải lên
 * GET /api/rates/tables
 */
app.get('/api/rates/tables', (req, res) => {
    res.json({
        success: true,
        data: RateRegistryService.getAllMetas()
    });
});
/**
 * API: Tải lên file bảng giá Excel mới (Form chuẩn UPS hoặc FedEx)
 * POST /api/rates/upload
 */
app.post('/api/rates/upload', upload.single('rateFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn file Excel để tải lên.' });
        }
        const { carrier, contractName, dimDivisor, defaultFuelPercent, fedexServiceType } = req.body;
        if (!carrier || !contractName) {
            return res.status(400).json({ success: false, message: 'Hãng (carrier) và Tên hợp đồng (contractName) là bắt buộc.' });
        }
        const upperCarrier = String(carrier).toUpperCase();
        if (upperCarrier !== 'UPS' && upperCarrier !== 'FEDEX') {
            return res.status(400).json({ success: false, message: 'Hiện chỉ hỗ trợ Form chuẩn UPS hoặc FEDEX.' });
        }
        // Xử lý nạp & bóc tách biểu cước
        const meta = RateRegistryService.processUploadedFile(req.file, {
            carrier: upperCarrier,
            contractName: String(contractName).trim(),
            dimDivisor: dimDivisor ? parseFloat(dimDivisor) : 5000,
            defaultFuelPercent: defaultFuelPercent ? parseFloat(defaultFuelPercent) : (upperCarrier === 'UPS' ? 28.5 : 23.5),
            fedexServiceType: fedexServiceType === 'IE' ? 'IE' : 'IP'
        });
        // Cập nhật vào Universal Engine
        const table = RateRegistryService.getTable(meta.id);
        if (table) {
            universalEngine.registerRateTable(table);
        }
        return res.json({
            success: true,
            message: `Đã nạp thành công bảng giá ${upperCarrier}: ${meta.contractName}`,
            data: meta
        });
    }
    catch (error) {
        console.error('Lỗi khi tải file bảng giá:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi bóc tách bảng giá: ' + error.message
        });
    }
});
/**
 * API: Danh sách khách hàng đầy đủ (Mã KH, Loại, HTTT, Công nợ, Số dư ví)
 * GET /api/customers
 */
app.get('/api/customers', (req, res) => {
    res.json({
        success: true,
        data: CustomerService.getAll()
    });
});
/**
 * API: Tự động sinh Mã khách hàng mới kế tiếp (PDL-KH001, ...)
 * GET /api/customers/next-code
 */
app.get('/api/customers/next-code', (req, res) => {
    res.json({
        success: true,
        nextCode: CustomerService.generateNextCustomerCode()
    });
});
/**
 * API: Sinh ngẫu nhiên bộ API Key & Secret mới
 * GET /api/customers/generate-key
 */
app.get('/api/customers/generate-key', (req, res) => {
    const creds = CustomerService.generateApiCredentials();
    res.json({ success: true, ...creds });
});
/**
 * API: Chi tiết 1 khách hàng theo ID hoặc Mã khách hàng
 * GET /api/customers/:id
 */
app.get('/api/customers/:id', (req, res) => {
    const cust = CustomerService.getById(req.params.id) || CustomerService.getByCode(req.params.id);
    if (!cust)
        return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    res.json({ success: true, data: cust });
});
/**
 * API: Thu tiền công nợ khách hàng (Kế toán ghi nhận phiếu thu)
 * POST /api/customers/debt-payment
 */
app.post('/api/customers/debt-payment', (req, res) => {
    const { customerCode, amount, note, operator } = req.body;
    if (!customerCode || !amount) {
        return res.status(400).json({ success: false, message: 'Thiếu mã khách hàng hoặc số tiền thanh toán' });
    }
    const result = CustomerService.recordDebtPayment(customerCode, parseFloat(amount), note || 'Thu công nợ khách hàng', operator || 'ketoan');
    res.json(result);
});
/**
 * API: Phê duyệt tài khoản khách hàng mới (Xác nhận từ Kế toán / Quản lý)
 * PUT /api/customers/:id/approve
 */
app.put('/api/customers/:id/approve', (req, res) => {
    const { operator } = req.body || {};
    const result = CustomerService.approveCustomer(req.params.id, operator || 'ketoan');
    if (!result.success)
        return res.status(400).json(result);
    AuthService.logAction({
        userId: operator || 'ketoan',
        username: operator || 'ketoan',
        userRole: 'ACCOUNTANT',
        action: 'APPROVE_CUSTOMER',
        targetId: result.customer?.customerCode || req.params.id,
        details: `Phê duyệt tài khoản khách hàng: ${result.customer?.customerCode} (${result.customer?.customerName}) - Phân loại: ${result.customer?.financialCategory}`,
        hub: result.customer?.hub || 'SGN'
    });
    res.json(result);
});
/**
 * API: Từ chối phê duyệt tài khoản khách hàng
 * PUT /api/customers/:id/reject
 */
app.put('/api/customers/:id/reject', (req, res) => {
    const { reason, operator } = req.body || {};
    const result = CustomerService.rejectCustomer(req.params.id, reason, operator || 'ketoan');
    if (!result.success)
        return res.status(400).json(result);
    AuthService.logAction({
        userId: operator || 'ketoan',
        username: operator || 'ketoan',
        userRole: 'ACCOUNTANT',
        action: 'REJECT_CUSTOMER',
        targetId: result.customer?.customerCode || req.params.id,
        details: `Từ chối tài khoản khách hàng: ${result.customer?.customerCode} - Lý do: ${reason}`,
        hub: result.customer?.hub || 'SGN'
    });
    res.json(result);
});
/**
 * API: Tái tạo hoặc cấp mới API Key cho khách hàng
 * POST /api/customers/:id/regenerate-api-key
 */
app.post('/api/customers/:id/regenerate-api-key', (req, res) => {
    const result = CustomerService.regenerateApiKey(req.params.id);
    if (!result.success)
        return res.status(404).json(result);
    AuthService.logAction({
        userId: 'admin',
        username: 'admin',
        userRole: 'SUPER_ADMIN',
        action: 'REGENERATE_API_KEY',
        targetId: result.customer?.customerCode || req.params.id,
        details: `Tái tạo API Key cho khách hàng: ${result.customer?.customerCode} (${result.customer?.customerName})`,
        hub: result.customer?.hub || 'SGN'
    });
    res.json(result);
});
/**
 * API: Bật/Tắt quyền kết nối API của khách hàng
 * PUT /api/customers/:id/toggle-api
 */
app.put('/api/customers/:id/toggle-api', (req, res) => {
    const { enabled, webhookUrl } = req.body || {};
    const cust = CustomerService.getById(req.params.id) || CustomerService.getByCode(req.params.id);
    if (!cust)
        return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    cust.isApiEnabled = Boolean(enabled);
    if (cust.isApiEnabled && !cust.apiKey) {
        const creds = CustomerService.generateApiCredentials();
        cust.apiKey = creds.apiKey;
        cust.apiSecret = creds.apiSecret;
    }
    if (webhookUrl !== undefined) {
        cust.webhookUrl = (webhookUrl || '').trim();
    }
    cust.updatedAt = new Date().toISOString();
    CustomerService.saveCustomer(cust);
    res.json({
        success: true,
        message: cust.isApiEnabled ? `Đã kích hoạt quyền API cho ${cust.customerCode}` : `Đã tạm dừng quyền API của ${cust.customerCode}`,
        data: cust
    });
});
/**
 * API: Phân hệ Nạp tiền / Top-up Ví khách hàng (Ký quỹ trả trước)
 * POST /api/customers/topup
 */
app.post('/api/customers/topup', (req, res) => {
    const customerCode = req.body.customerCode || req.body.customerId;
    const amount = req.body.amount;
    const { paymentMethod, reference, note, operator } = req.body;
    if (!customerCode || !amount) {
        return res.status(400).json({ success: false, message: 'Thiếu mã khách hàng hoặc số tiền nạp ví' });
    }
    const result = FinanceService.recordCustomerTopup(customerCode, parseFloat(amount), paymentMethod || 'Chuyển khoản VCB', reference || '', note || '', operator || 'ketoan');
    if (result.success) {
        AuthService.logAction({
            userId: operator || 'ketoan',
            username: operator || 'ketoan',
            userRole: 'ACCOUNTANT',
            action: 'TOPUP_WALLET',
            targetId: customerCode,
            details: `Nạp tiền ví ${parseFloat(amount).toLocaleString('vi-VN')} đ cho KH ${customerCode} qua ${paymentMethod || 'Ngân hàng'} (Ref: ${reference || '-'})`,
            hub: 'SGN'
        });
    }
    res.json(result);
});
/**
 * API: Lấy danh sách lịch sử nạp tiền & biến động ví
 * GET /api/finance/wallet-transactions
 */
app.get('/api/finance/wallet-transactions', (req, res) => {
    const { customerCode } = req.query;
    const list = FinanceService.getTransactions(customerCode ? String(customerCode) : undefined);
    res.json({ success: true, data: list });
});
/**
 * ========================================================
 * PHÂN HỆ GIAO TIẾP & DỊCH VỤ KHÁCH HÀNG (CUSTOMER PORTAL)
 * ========================================================
 */
// 1. Lấy danh sách Ticket (Có thể lọc theo keyword hoặc customerPhone/awb)
app.get('/api/customer/tickets', (req, res) => {
    const { keyword, status, hub } = req.query;
    let tickets = CommunicationService.getAllTickets();
    if (keyword) {
        tickets = CommunicationService.findTicketsByKeyword(String(keyword));
    }
    if (status) {
        tickets = tickets.filter(t => t.status === status);
    }
    if (hub) {
        tickets = tickets.filter(t => t.hub === hub);
    }
    res.json({ success: true, count: tickets.length, data: tickets });
});
// 2. Chi tiết 1 Ticket
app.get('/api/customer/tickets/:code', (req, res) => {
    const ticket = CommunicationService.getTicketByCode(req.params.code);
    if (!ticket)
        return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
    res.json({ success: true, data: ticket });
});
// 3. Khách hàng gửi yêu cầu / ticket mới (Lấy hàng, Báo giá, Khiếu nại, Hỗ trợ)
app.post('/api/customer/tickets', (req, res) => {
    const { type, title, customerName, customerPhone, customerEmail, customerCode, awbNumber, hub, priority, initialMessage, pickupDetails } = req.body;
    if (!customerName || !customerPhone || !initialMessage) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ Tên, Số điện thoại và Nội dung yêu cầu' });
    }
    const newTicket = CommunicationService.createTicket({
        type,
        title,
        customerName,
        customerPhone,
        customerEmail,
        customerCode,
        awbNumber,
        hub,
        priority,
        initialMessage,
        pickupDetails
    });
    AuthService.logAction({
        userId: 'customer_portal',
        username: customerName,
        userRole: 'CUSTOMER',
        action: 'CREATE_COMMUNICATION_TICKET',
        targetId: newTicket.ticketCode,
        details: `Khách hàng ${customerName} (${customerPhone}) gửi yêu cầu ${newTicket.type}: ${newTicket.title}`,
        hub: newTicket.hub
    });
    res.json({ success: true, message: 'Đã tiếp nhận yêu cầu của Quý khách thành công', data: newTicket });
});
// 4. Phản hồi tin nhắn vào Ticket (Giao tiếp 2 chiều Khách hàng <-> CSKH / Kho)
app.post('/api/customer/tickets/:code/reply', (req, res) => {
    const { senderRole, senderName, message } = req.body;
    if (!senderName || !message) {
        return res.status(400).json({ success: false, message: 'Thiếu người gửi hoặc nội dung tin nhắn' });
    }
    const updatedTicket = CommunicationService.replyTicket(req.params.code, {
        senderRole: senderRole || 'CUSTOMER',
        senderName,
        message
    });
    if (!updatedTicket)
        return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
    res.json({ success: true, message: 'Đã gửi phản hồi thành công', data: updatedTicket });
});
// 5. Cập nhật trạng thái Ticket (Dành cho Quản trị viên / CSKH)
app.put('/api/customer/tickets/:code/status', (req, res) => {
    const { status, notes, assignedTo, operator } = req.body;
    const updatedTicket = CommunicationService.updateTicketStatus(req.params.code, status, notes, assignedTo);
    if (!updatedTicket)
        return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
    AuthService.logAction({
        userId: operator || 'admin',
        username: operator || 'admin',
        userRole: 'SUPER_ADMIN',
        action: 'UPDATE_TICKET_STATUS',
        targetId: req.params.code,
        details: `Cập nhật trạng thái Ticket ${req.params.code} sang ${status} - Ghi chú: ${notes || '-'}`,
        hub: updatedTicket.hub
    });
    res.json({ success: true, data: updatedTicket });
});
// 6. Lấy lịch sử Live Chat
app.get('/api/customer/chat/messages', (req, res) => {
    const sessionId = req.query.sessionId ? String(req.query.sessionId) : 'default_session';
    const messages = CommunicationService.getChatMessages(sessionId);
    res.json({ success: true, count: messages.length, data: messages });
});
// 7. Gửi tin nhắn Live Chat
app.post('/api/customer/chat/send', (req, res) => {
    const { sessionId, customerName, customerPhone, message, sender, senderName, awbNumber } = req.body;
    if (!message) {
        return res.status(400).json({ success: false, message: 'Tin nhắn không được để trống' });
    }
    const result = CommunicationService.postChatMessage({
        sessionId: sessionId || 'default_session',
        customerName: customerName || 'Khách hàng',
        customerPhone,
        sender: sender || 'CUSTOMER',
        senderName: senderName || customerName || 'Khách hàng',
        message,
        awbNumber
    });
    res.json({ success: true, data: result });
});
/**
 * API: Thống kê tổng quan hệ thống cho Admin Dashboard
 * GET /api/admin/stats
 */
app.get('/api/admin/stats', (req, res) => {
    const metas = RateRegistryService.getAllMetas();
    res.json({
        success: true,
        data: {
            totalRateTables: metas.length,
            activeRateTables: metas.filter(m => m.isActive).length,
            totalCustomers: CustomerPolicyService.getAll().length,
            supportedCountries: {
                ups: Object.keys(upsRateTable?.zones || {}).length,
                fedex: Object.keys(fedexRateTable?.zones || {}).length
            },
            fuelSurcharge: SurchargeConfigService.get().fuelSurcharge
        }
    });
});
/**
 * API: Lấy danh sách lịch sử & kế hoạch phụ phí xăng dầu theo tuần
 * GET /api/admin/fuel/weekly
 */
app.get('/api/admin/fuel/weekly', (req, res) => {
    res.json({
        success: true,
        data: {
            current: SurchargeConfigService.getCurrentFuelEntry(),
            history: SurchargeConfigService.getWeeklyFuelList()
        }
    });
});
/**
 * API: Thêm hoặc cập nhật phụ phí xăng dầu cho một tuần
 * POST /api/admin/fuel/weekly
 */
app.post('/api/admin/fuel/weekly', (req, res) => {
    try {
        const { id, weekLabel, startDate, endDate, upsPercent, fedexPercent, dhlPercent, notes, isCurrent } = req.body;
        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'startDate và endDate là bắt buộc.' });
        }
        const entry = {
            id: id || `week_${startDate}`,
            weekLabel: weekLabel || `Tuần (${startDate} - ${endDate})`,
            startDate,
            endDate,
            upsPercent: parseFloat(upsPercent || 0),
            fedexPercent: parseFloat(fedexPercent || 0),
            dhlPercent: parseFloat(dhlPercent || 25.0),
            notes: notes || '',
            isCurrent: Boolean(isCurrent)
        };
        const result = SurchargeConfigService.addOrUpdateWeeklyFuel(entry);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * API: Kích hoạt một tuần làm tuần hiện tại đang áp dụng
 * PUT /api/admin/fuel/weekly/:id/set-current
 */
app.put('/api/admin/fuel/weekly/:id/set-current', (req, res) => {
    const updated = SurchargeConfigService.setWeekAsCurrent(req.params.id);
    if (!updated)
        return res.status(404).json({ success: false, message: 'Không tìm thấy tuần này.' });
    res.json({ success: true, message: `Đã kích hoạt áp dụng phụ phí cho ${updated.weekLabel}`, data: updated });
});
/**
 * API: Xóa bản ghi tuần xăng dầu
 * DELETE /api/admin/fuel/weekly/:id
 */
app.delete('/api/admin/fuel/weekly/:id', (req, res) => {
    const result = SurchargeConfigService.deleteWeeklyFuel(req.params.id);
    if (!result.success) {
        return res.status(400).json(result);
    }
    res.json(result);
});
/**
 * API: Lấy cấu hình phụ phí và xăng dầu hiện hành
 * GET /api/admin/surcharges
 */
app.get('/api/admin/surcharges', (req, res) => {
    res.json({
        success: true,
        data: SurchargeConfigService.get()
    });
});
/**
 * API: Cập nhật cấu hình phụ phí và xăng dầu động
 * PUT /api/admin/surcharges
 */
app.put('/api/admin/surcharges', (req, res) => {
    try {
        const updated = SurchargeConfigService.update(req.body);
        res.json({
            success: true,
            message: 'Cập nhật định mức phụ phí & xăng dầu thành công!',
            data: updated
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * API: Xem chi tiết 1 bảng giá (Zone Chart + Ma trận giá)
 * GET /api/rates/tables/:id
 */
app.get('/api/rates/tables/:id', (req, res) => {
    const meta = RateRegistryService.getMeta(req.params.id);
    const table = RateRegistryService.getTable(req.params.id);
    if (!meta || !table) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bảng giá.' });
    }
    res.json({
        success: true,
        data: {
            meta,
            zones: table.zones,
            documentRates: table.documentRates,
            nonDocumentRatesPreview: table.nonDocumentRates.slice(0, 30),
            totalNonDocTiers: table.nonDocumentRates.length
        }
    });
});
/**
 * API: Bật / Tắt trạng thái bảng giá
 * PUT /api/rates/tables/:id/toggle
 */
app.put('/api/rates/tables/:id/toggle', (req, res) => {
    const toggled = RateRegistryService.toggleTable(req.params.id);
    if (!toggled) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bảng giá.' });
    }
    res.json({
        success: true,
        message: `Bảng giá ${toggled.contractName} hiện ${toggled.isActive ? 'ĐANG BẬT' : 'ĐÃ TẮT'}`,
        data: toggled
    });
});
/**
 * API: Xóa bảng giá
 * DELETE /api/rates/tables/:id
 */
app.delete('/api/rates/tables/:id', (req, res) => {
    const deleted = RateRegistryService.deleteTable(req.params.id);
    res.json({
        success: deleted,
        message: deleted ? 'Đã xóa bảng giá thành công' : 'Không tìm thấy bảng giá cần xóa'
    });
});
/**
 * API: Xóa khách hàng
 * DELETE /api/customers/:id
 */
app.delete('/api/customers/:id', (req, res) => {
    const deleted = CustomerService.deleteCustomer(req.params.id);
    res.json({
        success: deleted,
        message: deleted ? 'Đã xóa khách hàng thành công' : 'Không thể xóa khách hàng này (hoặc khách mặc định)'
    });
});
/**
 * API: Cập nhật hoặc thêm mới khách hàng (Mã KH, HTTT, Công nợ, Ví tiền)
 * POST /api/customers
 */
app.post('/api/customers', (req, res) => {
    try {
        const { customerName, name } = req.body;
        const finalName = (customerName || name || '').trim();
        if (!finalName) {
            return res.status(400).json({ success: false, message: 'Tên khách hàng là bắt buộc' });
        }
        const saved = CustomerService.saveCustomer({
            ...req.body,
            customerName: finalName
        });
        // Nếu là đại lý, tự động tạo tài khoản đăng nhập nếu chưa có
        if (saved.customerType === 'AGENT') {
            const existingUser = AuthService.getUserByCustomerCode(saved.customerCode);
            if (!existingUser) {
                AuthService.createUser({
                    id: `usr_${saved.customerCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
                    username: saved.customerCode.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                    fullName: saved.customerName,
                    email: saved.email || `${saved.customerCode.toLowerCase()}@pandalex.vn`,
                    role: 'AGENT',
                    hub: saved.hub,
                    customerCode: saved.customerCode,
                    walletBalance: saved.walletBalance,
                    creditLimit: saved.creditLimit,
                    isActive: saved.isActive,
                    createdAt: new Date().toISOString()
                });
            }
        }
        return res.json({ success: true, message: 'Lưu thông tin khách hàng thành công', data: saved });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * API: Báo giá cước Universal (Cả Giá Cost Hãng & Giá Bán Khách, Quét Phụ Phí Quá Khổ)
 * POST /api/v1/rates/quote
 */
app.post('/api/v1/rates/quote', (req, res) => {
    try {
        const { carrier, destinationCountry, actualWeightKg, lengthCm, widthCm, heightCm, isDocument, customerId, customMarginPercent, customMarginFixedAmount, isResidential, vatPercent } = req.body;
        if (!destinationCountry || !actualWeightKg) {
            return res.status(400).json({
                success: false,
                message: 'destinationCountry và actualWeightKg là bắt buộc.'
            });
        }
        const quoteReq = {
            carrier: carrier || 'ALL',
            destinationCountry: String(destinationCountry).toUpperCase().trim(),
            actualWeightKg: parseFloat(actualWeightKg),
            lengthCm: parseFloat(lengthCm || 0),
            widthCm: parseFloat(widthCm || 0),
            heightCm: parseFloat(heightCm || 0),
            isDocument: Boolean(isDocument),
            customerId: customerId || 'guest',
            customMarginPercent: customMarginPercent !== undefined && customMarginPercent !== '' ? parseFloat(customMarginPercent) : undefined,
            customMarginFixedAmount: customMarginFixedAmount !== undefined && customMarginFixedAmount !== '' ? parseFloat(customMarginFixedAmount) : undefined,
            isResidential: Boolean(isResidential),
            vatPercent: vatPercent !== undefined ? parseFloat(vatPercent) : 0
        };
        const results = universalEngine.quote(quoteReq);
        return res.json({
            success: true,
            destinationCountry: quoteReq.destinationCountry,
            chargeableWeightKg: results.length > 0 ? results[0].chargeableWeightKg : 0,
            quotes: results
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
/**
 * API: So sánh giá đa hãng
 * POST /api/v1/rates/compare
 */
app.post('/api/v1/rates/compare', (req, res) => {
    try {
        const quoteReq = {
            ...req.body,
            carrier: 'ALL',
            destinationCountry: String(req.body.destinationCountry || '').toUpperCase().trim(),
            actualWeightKg: parseFloat(req.body.actualWeightKg || 0),
            lengthCm: parseFloat(req.body.lengthCm || 0),
            widthCm: parseFloat(req.body.widthCm || 0),
            heightCm: parseFloat(req.body.heightCm || 0)
        };
        const results = universalEngine.quote(quoteReq);
        return res.json({
            success: true,
            destinationCountry: quoteReq.destinationCountry,
            quotes: results
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * API: Ma trận so sánh song song GIÁ CODE vs GIÁ BÁN
 * GET /api/rates/matrix-compare?carrier=UPS&country=US&customerId=...
 */
app.get('/api/rates/matrix-compare', (req, res) => {
    try {
        const carrier = req.query.carrier || 'UPS';
        const country = req.query.country || 'US';
        const customerId = req.query.customerId || undefined;
        const customMarginPercent = req.query.marginPercent !== undefined && req.query.marginPercent !== '' ? parseFloat(req.query.marginPercent) : undefined;
        const customMarginFixedAmount = req.query.marginFixed !== undefined && req.query.marginFixed !== '' ? parseFloat(req.query.marginFixed) : undefined;
        const vatPercent = req.query.vatPercent !== undefined ? parseFloat(req.query.vatPercent) : 0;
        const data = universalEngine.getComparisonMatrix({
            carrier,
            destinationCountry: country,
            customerId,
            customMarginPercent,
            customMarginFixedAmount,
            vatPercent
        });
        res.json({ success: true, data });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});
/**
 * API: Thiết lập Gup Giá (Markup Setup) theo % hoặc Cố định (cho cá nhân, nhóm khách hoặc toàn hệ thống)
 * POST /api/pricing/markup/setup
 */
app.post('/api/pricing/markup/setup', (req, res) => {
    try {
        const { scope, targetCode, customerType, marginType, marginPercent, marginFixedAmount } = req.body;
        const pct = parseFloat(marginPercent || 0);
        const fixed = parseFloat(marginFixedAmount || 0);
        const mType = marginType || (pct > 0 && fixed > 0 ? 'PERCENT_AND_FIXED' : (fixed > 0 ? 'FIXED' : 'PERCENT'));
        if (scope === 'CUSTOMER' && targetCode) {
            const cust = CustomerService.getByCode(targetCode) || CustomerService.getById(targetCode);
            if (!cust)
                return res.status(404).json({ success: false, message: `Không tìm thấy khách hàng ${targetCode}` });
            cust.marginType = mType;
            cust.marginPercent = pct;
            cust.marginFixedAmount = fixed;
            CustomerService.saveCustomer(cust);
            return res.json({ success: true, message: `Đã cập nhật Gup Giá cho khách hàng ${cust.customerCode} (${cust.customerName}): +${pct}% và +${fixed.toLocaleString('vi-VN')} đ` });
        }
        if (scope === 'GROUP' && customerType) {
            const all = CustomerService.getAll();
            let count = 0;
            for (const c of all) {
                if (c.customerType === customerType) {
                    c.marginType = mType;
                    c.marginPercent = pct;
                    c.marginFixedAmount = fixed;
                    CustomerService.saveCustomer(c);
                    count++;
                }
            }
            return res.json({ success: true, message: `Đã cập nhật Gup Giá cho ${count} khách hàng thuộc nhóm ${customerType}: +${pct}% và +${fixed.toLocaleString('vi-VN')} đ` });
        }
        if (scope === 'ALL') {
            const all = CustomerService.getAll();
            for (const c of all) {
                c.marginType = mType;
                c.marginPercent = pct;
                c.marginFixedAmount = fixed;
                CustomerService.saveCustomer(c);
            }
            return res.json({ success: true, message: `Đã cập nhật Gup Giá toàn hệ thống (+${pct}% & +${fixed.toLocaleString('vi-VN')} đ) cho toàn bộ ${all.length} khách hàng` });
        }
        res.status(400).json({ success: false, message: 'Phạm vi cấu hình không hợp lệ' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * API: Quét nhận diện ảnh / mã nhãn AWB (FedEx / UPS) qua AI OCR
 * POST /api/shipments/scan-awb
 */
app.post('/api/shipments/scan-awb', async (req, res) => {
    try {
        const { imageBase64, ocrText, sample, autoSave, customerCode, hub, operator, pdfBase64, labels, carrier, trackingNumber, detectedBarcode, weightKg } = req.body;
        // 1. Nhận diện & bóc tách trường thông tin từ nhãn AWB
        const parsed = await AwbOcrService.processScan({ imageBase64, ocrText, sample, labels, carrier, trackingNumber, detectedBarcode, weightKg });
        // Nếu chỉ quét xem trước (preview) và chưa bấm lưu CSDL:
        if (!autoSave) {
            return res.json({
                success: true,
                message: `Đã nhận diện thành công nhãn ${parsed.carrier} ${parsed.trackingNumber} (Độ tin cậy: ${parsed.confidenceScore}%)`,
                autoSaved: false,
                data: parsed
            });
        }
        // Nếu chọn tự động lưu trực tiếp vào CSDL:
        const custLookup = (customerCode || 'PDL-GUEST').toString().trim();
        const foundCust = CustomerService.getById(custLookup) || CustomerService.getByCode(custLookup);
        const custCode = foundCust ? foundCust.customerCode : custLookup.toUpperCase();
        const opHub = (hub || 'SGN');
        const opUser = operator || 'system';
        const estSellPrice = Math.round(parsed.weightKg * 275000);
        const creditCheck = CustomerService.checkCreditAvailability(custCode, estSellPrice);
        if (!creditCheck.allowed) {
            return res.status(400).json({
                success: false,
                message: `Khách hàng ${custCode} không đủ điều kiện tài chính: ${creditCheck.reason}`,
                parsed,
                creditDetails: creditCheck
            });
        }
        const finCat = creditCheck.financialCategory || 'IMMEDIATE';
        let pTerm = 'PREPAID';
        let pStatus = 'UNPAID';
        let pMethod = 'Thanh toán tiền ngay theo đơn';
        if (finCat === 'POSTPAID_CONTRACT') {
            pTerm = 'POSTPAID';
            pStatus = 'UNPAID';
            pMethod = 'Hợp đồng công nợ (Trả sau)';
        }
        else if (finCat === 'PREPAID_WALLET') {
            pTerm = 'PREPAID';
            pStatus = 'PAID';
            pMethod = 'Trừ ví ký quỹ trả trước';
        }
        else {
            pTerm = 'PREPAID';
            pStatus = 'UNPAID';
            pMethod = 'Chờ thu tiền mặt/chuyển khoản';
        }
        // 2. Tạo đơn với mã tracking quét được trực tiếp từ AWB
        const shipmentData = ShipmentService.createShipment({
            carrier: parsed.carrier,
            serviceCode: parsed.serviceCode,
            serviceName: parsed.serviceName,
            accountNumber: parsed.accountNumber,
            masterTrackingNumber: parsed.trackingNumber,
            existingTrackingNumber: parsed.trackingNumber,
            shipFrom: parsed.shipFrom,
            shipTo: parsed.shipTo,
            pieces: parsed.pieces.map((p, i) => ({
                ...p,
                trackingNumber: p.trackingNumber || (i === 0 ? parsed.trackingNumber : undefined)
            })),
            contentsType: 'NON_DOCUMENT',
            items: [{
                    description: parsed.itemDescription || 'General Merchandise (AWB Scanned)',
                    quantity: 1,
                    unitValue: 30,
                    hsCode: '850440',
                    unit: 'PCS'
                }],
            itemDescription: parsed.itemDescription || 'Hàng gửi quốc tế (Quét ảnh nhãn AWB)',
            reference1: parsed.reference1 || `SCAN-${parsed.carrier}`,
            customerCode: custCode,
            customerName: foundCust ? foundCust.customerName : undefined,
            hub: opHub,
            paymentTerm: pTerm,
            paymentStatus: pStatus,
            paymentMethod: pMethod,
            sellPrice: estSellPrice,
            costPrice: Math.round(parsed.weightKg * 220000)
        });
        // 3. Lưu vào kho dữ liệu
        const stored = ShipmentRepository.save(shipmentData, `Tự động tạo từ ảnh chụp nhãn AWB ${parsed.carrier} (${parsed.detectionMethods.join(', ')})`);
        // Lưu file PDF AWB (từ camera đóng gói bằng jsPDF hoặc tải lên file PDF)
        if (pdfBase64) {
            try {
                const cleanB64 = pdfBase64.replace(/^data:application\/pdf.*?;base64,/, '').replace(/^data:image\/.*?;base64,/, '');
                const pdfFileName = `AWB_${stored.masterTrackingNumber}.pdf`;
                const destPath = path.resolve('uploads/awb_pdfs', pdfFileName);
                fs.writeFileSync(destPath, Buffer.from(cleanB64, 'base64'));
                stored.awbPdfUrl = `/uploads/awb_pdfs/${pdfFileName}`;
                ShipmentRepository.save(stored);
            }
            catch (pdfErr) {
                console.error('Lỗi lưu file PDF AWB:', pdfErr);
            }
        }
        // 4. Xử lý tài chính
        if (finCat === 'POSTPAID_CONTRACT') {
            CustomerService.recordShipmentDebt(stored.customerCode, stored.sellPrice, stored.masterTrackingNumber);
        }
        else if (finCat === 'PREPAID_WALLET') {
            FinanceService.recordCustomerDeduction(stored.customerCode, stored.sellPrice, stored.masterTrackingNumber, opUser);
        }
        // 5. Tự động quét Inbound nhập kho
        WarehouseService.scanInbound(stored.masterTrackingNumber, opHub, opUser);
        // 6. Ghi Audit Log
        AuthService.logAction({
            userId: opUser,
            username: opUser,
            userRole: 'SUPER_ADMIN',
            action: 'SCAN_AWB_LABEL',
            targetId: stored.masterTrackingNumber,
            details: `Quét ảnh nhãn AWB ${stored.carrier} ${stored.masterTrackingNumber} cho KH ${stored.customerCode} - Đã tự động lưu vào CSDL và quét Inbound Hub ${opHub}`,
            hub: opHub
        });
        res.json({
            success: true,
            message: `Đã nhận diện nhãn AWB ${stored.carrier} ${stored.masterTrackingNumber} và lưu thành công vào CSDL!`,
            autoSaved: true,
            data: stored,
            parsed,
            awbPdfUrl: stored.awbPdfUrl
        });
    }
    catch (error) {
        console.error('Lỗi nhận diện nhãn AWB:', error);
        res.status(500).json({ success: false, message: 'Lỗi nhận diện nhãn AWB: ' + (error.message || error) });
    }
});
/**
 * API: Đính kèm file PDF AWB (từ camera hoặc tải file trực tiếp) cho vận đơn đã có
 * POST /api/shipments/:id/upload-pdf
 */
app.post('/api/shipments/:id/upload-pdf', (req, res) => {
    try {
        const { id } = req.params;
        const { pdfBase64, operator } = req.body;
        if (!pdfBase64) {
            return res.status(400).json({ success: false, message: 'Thiếu dữ liệu file PDF (pdfBase64)' });
        }
        const shipment = ShipmentRepository.getById(id);
        if (!shipment) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy vận đơn: ' + id });
        }
        const cleanB64 = pdfBase64.replace(/^data:application\/pdf.*?;base64,/, '').replace(/^data:image\/.*?;base64,/, '');
        const pdfFileName = `AWB_${shipment.masterTrackingNumber}.pdf`;
        const destPath = path.resolve('uploads/awb_pdfs', pdfFileName);
        fs.writeFileSync(destPath, Buffer.from(cleanB64, 'base64'));
        shipment.awbPdfUrl = `/uploads/awb_pdfs/${pdfFileName}`;
        ShipmentRepository.save(shipment);
        AuthService.logAction({
            userId: operator || 'system',
            username: operator || 'system',
            userRole: 'SUPER_ADMIN',
            action: 'UPDATE_STATUS',
            targetId: shipment.masterTrackingNumber,
            details: `Đính kèm file PDF nhãn AWB cho vận đơn ${shipment.masterTrackingNumber}`,
            hub: shipment.hub
        });
        res.json({
            success: true,
            message: 'Đính kèm file PDF AWB thành công!',
            awbPdfUrl: shipment.awbPdfUrl,
            data: shipment
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
/**
 * ============================================================
 * PHÂN HỆ QUẢN LÝ VẬN ĐƠN AWB (UPS & FEDEX MANAGEMENT CORE)
 * ============================================================
 */
/**
 * API: Kiểm tra tính hợp lệ & giải mã thuật toán Check Digit của AWB
 * GET /api/awb/validate/:tracking
 */
app.get('/api/awb/validate/:tracking', (req, res) => {
    const result = AwbManagerService.validateAwb(req.params.tracking);
    res.json({ success: true, data: result });
});
/**
 * API: Báo cáo Kho số AWB (AWB Pool & Accounts) của UPS & FedEx
 * GET /api/awb/pools
 */
app.get('/api/awb/pools', (req, res) => {
    const pools = AwbManagerService.getAwbPoolSummary();
    res.json({ success: true, data: pools });
});
/**
 * API: Tra cứu toàn diện Master / Child AWB & File PDF nhãn gốc
 * GET /api/awb/lookup/:tracking
 */
app.get('/api/awb/lookup/:tracking', (req, res) => {
    const lookup = AwbManagerService.lookupAwbDetails(req.params.tracking);
    if (!lookup.found) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy vận đơn AWB này trong hệ thống', data: lookup });
    }
    res.json({ success: true, data: lookup });
});
/**
 * API: Hủy / Void vận đơn AWB để tránh bị hãng xuất hóa đơn (EDI Billing)
 * POST /api/awb/void
 */
app.post('/api/awb/void', (req, res) => {
    const { trackingNumber, reason, operator } = req.body;
    if (!trackingNumber) {
        return res.status(400).json({ success: false, message: 'Thiếu trackingNumber cần hủy' });
    }
    const result = AwbManagerService.voidAwb(trackingNumber, reason || 'Khách hàng hủy gửi hàng trước giờ bay', operator || 'admin');
    if (!result.success) {
        return res.status(400).json(result);
    }
    res.json(result);
});
/**
 * API: Đối soát AWB, kiểm tra phụ phí phát sinh hãng (Reconciliation & Audit)
 * GET /api/awb/reconciliation/:tracking
 */
app.get('/api/awb/reconciliation/:tracking', (req, res) => {
    const recon = AwbManagerService.getReconciliation(req.params.tracking);
    if (!recon) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu đối soát cho AWB này' });
    }
    res.json({ success: true, data: recon });
});
/**
 * API: Tạo Vận Đơn & Xuất Nhãn In AWB (Chuẩn UPS / FedEx)
 * Kiểm soát công nợ / trừ ví và phê duyệt tài khoản khách hàng theo chuẩn PandaLex
 * POST /api/shipments/create
 */
app.post('/api/shipments/create', (req, res) => {
    try {
        // Kiểm tra xác thực qua X-API-KEY (nếu khách hàng gọi trực tiếp qua REST API)
        const headerApiKey = (req.headers['x-api-key'] || req.query.apiKey || '').toString().trim();
        let apiCustomer = undefined;
        if (headerApiKey) {
            apiCustomer = CustomerService.getByApiKey(headerApiKey);
            if (!apiCustomer) {
                return res.status(401).json({
                    success: false,
                    message: 'Khóa API Key không hợp lệ hoặc tài khoản khách hàng chưa kích hoạt quyền tích hợp API.'
                });
            }
        }
        const custLookup = apiCustomer ? apiCustomer.customerCode : (req.body.customerCode || req.body.customerId || 'PDL-GUEST').toString().trim();
        const foundCust = apiCustomer || CustomerService.getById(custLookup) || CustomerService.getByCode(custLookup);
        const custCode = foundCust ? foundCust.customerCode : custLookup.toUpperCase();
        const estWeight = (req.body.pieces || []).reduce((s, p) => s + (Number(p.weightKg) || 0), 0);
        const estSellPrice = req.body.sellPrice ? Number(req.body.sellPrice) : Math.round(estWeight * 275000);
        // 1. Kiểm tra điều kiện tài chính & trạng thái phê duyệt của khách hàng
        const creditCheck = CustomerService.checkCreditAvailability(custCode, estSellPrice);
        if (!creditCheck.allowed) {
            return res.status(400).json({
                success: false,
                message: creditCheck.reason || 'Khách hàng không đủ điều kiện tài chính để tạo đơn',
                creditDetails: creditCheck
            });
        }
        const finCat = creditCheck.financialCategory || 'IMMEDIATE';
        let pTerm = 'PREPAID';
        let pStatus = 'UNPAID';
        let pMethod = 'Thanh toán tiền ngay theo đơn';
        if (finCat === 'POSTPAID_CONTRACT') {
            pTerm = 'POSTPAID';
            pStatus = 'UNPAID';
            pMethod = 'Hợp đồng công nợ (Trả sau)';
        }
        else if (finCat === 'PREPAID_WALLET') {
            pTerm = 'PREPAID';
            pStatus = 'PAID';
            pMethod = 'Trừ ví ký quỹ trả trước';
        }
        else {
            // IMMEDIATE: Thanh toán ngay theo đơn
            pTerm = 'PREPAID';
            pStatus = 'UNPAID'; // Khách thanh toán ngay: Đơn tạo xong phải thanh toán mới in tem/xuất kho
            pMethod = req.body.paymentMethod || 'Chờ thu tiền mặt/chuyển khoản';
        }
        // 2. Sinh AWB chuẩn hãng (Check digit UPS 1Z... / FedEx 12 số)
        const awbData = ShipmentService.createShipment({
            ...req.body,
            customerCode: custCode,
            paymentTerm: pTerm,
            paymentStatus: pStatus,
            paymentMethod: pMethod
        });
        // 3. Tự động lưu vào Repository
        const stored = ShipmentRepository.save(awbData, req.body.notes);
        // Lưu file PDF AWB nếu được truyền lên từ camera/file
        if (req.body.pdfBase64) {
            try {
                const cleanB64 = req.body.pdfBase64.replace(/^data:application\/pdf.*?;base64,/, '').replace(/^data:image\/.*?;base64,/, '');
                const pdfFileName = `AWB_${stored.masterTrackingNumber}.pdf`;
                const destPath = path.resolve('uploads/awb_pdfs', pdfFileName);
                fs.writeFileSync(destPath, Buffer.from(cleanB64, 'base64'));
                stored.awbPdfUrl = `/uploads/awb_pdfs/${pdfFileName}`;
                ShipmentRepository.save(stored);
            }
            catch (pdfErr) {
                console.error('Lỗi lưu file PDF AWB:', pdfErr);
            }
        }
        // 4. Xử lý tài chính thực thi:
        if (finCat === 'POSTPAID_CONTRACT') {
            // Hợp đồng trả sau: Ghi nhận công nợ
            CustomerService.recordShipmentDebt(stored.customerCode, stored.sellPrice, stored.masterTrackingNumber);
        }
        else if (finCat === 'PREPAID_WALLET') {
            // Trả trước qua ví: Khấu trừ số dư ví tự động
            FinanceService.recordCustomerDeduction(stored.customerCode, stored.sellPrice, stored.masterTrackingNumber, req.body.operator || 'system');
        }
        // IMMEDIATE: Đơn lưu ở trạng thái UNPAID, chờ xác nhận thanh toán
        // 5. Ghi Audit Log lịch sử thao tác
        AuthService.logAction({
            userId: req.body.operator || 'system',
            username: req.body.operator || 'system',
            userRole: 'SUPER_ADMIN',
            action: 'CREATE_SHIPMENT',
            targetId: stored.masterTrackingNumber,
            details: `Tạo vận đơn ${stored.carrier} ${stored.masterTrackingNumber} cho KH ${stored.customerCode} (${stored.customerName}) - Phân loại TC: ${finCat} - HTTT: ${pMethod} - Cước: ${stored.sellPrice.toLocaleString('vi-VN')} đ (Trạng thái thu: ${pStatus})`,
            hub: stored.hub
        });
        res.json({
            success: true,
            message: 'Tạo vận đơn và sinh nhãn in AWB thành công!',
            data: stored,
            financialInfo: {
                category: finCat,
                paymentStatus: pStatus,
                paymentMethod: pMethod,
                requiresPaymentConfirmation: finCat === 'IMMEDIATE' && pStatus === 'UNPAID'
            }
        });
    }
    catch (error) {
        if (error instanceof ShipmentValidationError) {
            return res.status(400).json({ success: false, message: 'Dữ liệu vận đơn chưa đạt chuẩn hãng', errors: error.errors });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * API: Xác nhận thanh toán tiền ngay cho đơn hàng (Kế toán / Thủ kho thu tiền)
 * Dành riêng cho khách hàng IMMEDIATE (Thanh toán ngay theo đơn) để mở khóa hành động in tem/xuất kho
 * POST /api/shipments/:id/confirm-payment
 */
app.post('/api/shipments/:id/confirm-payment', (req, res) => {
    try {
        const shipment = ShipmentRepository.getById(req.params.id);
        if (!shipment) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy vận đơn: ' + req.params.id });
        }
        const { paymentMethod, reference, operator } = req.body || {};
        const result = FinanceService.confirmShipmentPayment(shipment.shipmentId, shipment.sellPrice || 0, paymentMethod || 'Tiền mặt / Chuyển khoản', operator || 'ketoan');
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
/**
 * API: Khấu trừ tiền ví / cấn trừ công nợ cho vận đơn (Cổng 2: Đã trừ tiền)
 * POST /api/shipments/:id/deduct-wallet
 */
app.post('/api/shipments/:id/deduct-wallet', (req, res) => {
    try {
        const { operator } = req.body || {};
        const result = FinanceService.deductShipmentFeeFromCustomer(req.params.id, operator || 'ketoan');
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
/**
 * API: Xác nhận cam kết từ khách hàng (Cổng 3: Cam kết từ khách hàng)
 * POST /api/shipments/:id/customer-commit
 */
app.post('/api/shipments/:id/customer-commit', (req, res) => {
    try {
        const { committedBy, note } = req.body || {};
        const result = FinanceService.recordCustomerCommitment(req.params.id, committedBy, note);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
/**
 * API: Duyệt nhanh trọn gói 3 điều kiện tài chính (Quick 3-Condition Pass)
 * POST /api/shipments/:id/finance-approve
 */
app.post('/api/shipments/:id/finance-approve', (req, res) => {
    try {
        const { operator, reason } = req.body || {};
        const result = FinanceService.quickApproveFinancialGate(req.params.id, operator || 'ketoan', reason);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
/**
 * API: Kiểm tra trạng thái cổng tài chính của vận đơn
 * GET /api/shipments/:id/financial-gate
 */
app.get('/api/shipments/:id/financial-gate', (req, res) => {
    const result = ShipmentRepository.verifyFinancialGate(req.params.id);
    res.json({ success: true, ...result });
});
/**
 * API: Xuất Danh sách Vận đơn ra file Excel (.xlsx) chuẩn nghiệp vụ PandaLex
 * Kế thừa từ BookingManager.ascx.cs
 * GET /api/shipments/export-excel
 */
app.get('/api/shipments/export-excel', (req, res) => {
    try {
        const shipments = ShipmentRepository.getAll();
        const buffer = ExcelExportService.exportShipmentsToExcel(shipments);
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="danhsachbill_PandaLex_${dateStr}.xlsx"`);
        res.send(buffer);
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi xuất file Excel: ' + err.message });
    }
});
/**
 * API: Danh sách toàn bộ vận đơn đã tạo
 * GET /api/shipments
 */
app.get('/api/shipments', (req, res) => {
    const currentUser = AuthService.getCurrentUser();
    let list = ShipmentRepository.getAll();
    // Nếu là AGENT hoặc CUSTOMER thì chỉ xem đơn của chính mình
    if (currentUser.role === 'AGENT' || currentUser.role === 'CUSTOMER') {
        const cCode = currentUser.customerCode;
        if (cCode) {
            list = list.filter(s => s.accountNumber === cCode || (s.notes && s.notes.includes(cCode)) || (s.sender && s.sender.name && s.sender.name.includes(cCode)));
        }
    }
    // Bảo mật cấp độ trường: loại bỏ costPrice đối với WAREHOUSE, AGENT, CUSTOMER
    const sanitized = AuthService.sanitizeShipmentsForRole(list, currentUser.role);
    res.json({
        success: true,
        data: sanitized
    });
});
/**
 * API: Chi tiết 1 vận đơn
 * GET /api/shipments/:id
 */
app.get('/api/shipments/:id', (req, res) => {
    const currentUser = AuthService.getCurrentUser();
    const s = ShipmentRepository.getById(req.params.id);
    if (!s)
        return res.status(404).json({ success: false, message: 'Không tìm thấy vận đơn' });
    const sanitized = AuthService.sanitizeShipmentForRole(s, currentUser.role);
    res.json({ success: true, data: sanitized });
});
/**
 * API: Xuất Hóa Đơn Thương Mại Commercial Invoice HTML (khổ A4 chuẩn Hải Quan)
 * GET /api/shipments/:id/invoice.html
 */
app.get('/api/shipments/:id/invoice.html', (req, res) => {
    const s = ShipmentRepository.getById(req.params.id);
    if (!s)
        return res.status(404).send('<h3>Không tìm thấy vận đơn để xuất Commercial Invoice</h3>');
    const html = CommercialInvoiceService.renderInvoiceHtml(s);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
});
/**
 * API: Tải file Excel Commercial Invoice (.xlsx) chuẩn mẫu dự án
 * GET /api/shipments/:id/invoice.xlsx
 */
app.get('/api/shipments/:id/invoice.xlsx', (req, res) => {
    const s = ShipmentRepository.getById(req.params.id);
    if (!s)
        return res.status(404).send('Không tìm thấy vận đơn');
    try {
        const buffer = CommercialInvoiceService.exportInvoiceToExcel(s);
        const filename = `Commercial_Invoice_${s.masterTrackingNumber || s.shipmentId}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }
    catch (err) {
        res.status(500).send('Lỗi xuất file Excel Commercial Invoice: ' + err.message);
    }
});
/**
 * API: Lấy danh sách tất cả Commercial Invoices
 * GET /api/invoices
 */
app.get('/api/invoices', (req, res) => {
    res.json({ success: true, data: InvoiceRepository.getAll() });
});
/**
 * API: Lấy chi tiết 1 Commercial Invoice theo ID
 * GET /api/invoices/:id
 */
app.get('/api/invoices/:id', (req, res) => {
    const inv = InvoiceRepository.getById(req.params.id);
    if (!inv)
        return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
    res.json({ success: true, data: inv });
});
/**
 * API: Lưu hoặc cập nhật Commercial Invoice
 * POST /api/invoices
 */
app.post('/api/invoices', (req, res) => {
    try {
        const saved = InvoiceRepository.save(req.body);
        res.json({ success: true, message: 'Đã lưu Commercial Invoice thành công', data: saved });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi lưu hóa đơn: ' + err.message });
    }
});
/**
 * API: Xóa Commercial Invoice
 * DELETE /api/invoices/:id
 */
app.delete('/api/invoices/:id', (req, res) => {
    const ok = InvoiceRepository.delete(req.params.id);
    if (!ok)
        return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn cần xóa' });
    res.json({ success: true, message: 'Đã xóa hóa đơn' });
});
/**
 * API: Xuất Excel trực tiếp từ dữ liệu Form gửi lên (theo đúng mẫu định sẵn)
 * POST /api/invoices/export-excel
 */
app.post('/api/invoices/export-excel', (req, res) => {
    try {
        const data = req.body;
        const buffer = CommercialInvoiceService.exportToExcel(data);
        const filename = `Commercial_Invoice_${data.invoiceNumber || data.airWaybillNo || 'Custom'}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }
    catch (err) {
        res.status(500).send('Lỗi xuất file Excel: ' + err.message);
    }
});
/**
 * API: Xem HTML Preview trực tiếp từ dữ liệu Form gửi lên
 * POST /api/invoices/preview-html
 */
app.post('/api/invoices/preview-html', (req, res) => {
    try {
        const data = req.body;
        const html = CommercialInvoiceService.renderHtml(data);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    }
    catch (err) {
        res.status(500).send('Lỗi hiển thị hóa đơn: ' + err.message);
    }
});
/**
 * API: Tải file Excel của invoice đã lưu
 * GET /api/invoices/:id/excel
 */
app.get('/api/invoices/:id/excel', (req, res) => {
    const inv = InvoiceRepository.getById(req.params.id);
    if (!inv)
        return res.status(404).send('Không tìm thấy hóa đơn');
    try {
        const buffer = CommercialInvoiceService.exportToExcel(inv);
        const filename = `Commercial_Invoice_${inv.invoiceNumber || inv.id}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }
    catch (err) {
        res.status(500).send('Lỗi xuất file Excel: ' + err.message);
    }
});
/**
 * API: Xem HTML A4 của invoice đã lưu
 * GET /api/invoices/:id/html
 */
app.get('/api/invoices/:id/html', (req, res) => {
    const inv = InvoiceRepository.getById(req.params.id);
    if (!inv)
        return res.status(404).send('<h3>Không tìm thấy hóa đơn Commercial Invoice</h3>');
    const html = CommercialInvoiceService.renderHtml(inv);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
});
/**
 * API: Lấy dữ liệu Commercial Invoice dạng JSON (Phục vụ truyền EDI Paperless Invoice)
 * GET /api/shipments/:id/invoice
 */
app.get('/api/shipments/:id/invoice', (req, res) => {
    const s = ShipmentRepository.getById(req.params.id);
    if (!s)
        return res.status(404).json({ success: false, message: 'Không tìm thấy vận đơn' });
    res.json({
        success: true,
        data: {
            invoiceNumber: CommercialInvoiceService.generateInvoiceNumber(s),
            shipment: s,
            items: s.items || [],
            totalCustomsValue: s.totalCustomsValue || 30
        }
    });
});
/**
 * API: Cập nhật trạng thái vận chuyển (DISPATCHED / PRINTED / DELIVERED / CANCELLED)
 * PUT /api/shipments/:id/status
 */
app.put('/api/shipments/:id/status', (req, res) => {
    const { status } = req.body;
    const updated = ShipmentRepository.updateStatus(req.params.id, status);
    if (!updated)
        return res.status(404).json({ success: false, message: 'Không tìm thấy vận đơn' });
    res.json({ success: true, message: 'Đã cập nhật trạng thái vận đơn', data: updated });
});
/**
 * API: Cập nhật trạng thái thanh toán (PAID: Đã thu tiền / UNPAID: Ghi nợ)
 * PUT /api/shipments/:id/payment
 */
app.put('/api/shipments/:id/payment', (req, res) => {
    const { paymentStatus } = req.body;
    if (paymentStatus !== 'PAID' && paymentStatus !== 'UNPAID') {
        return res.status(400).json({ success: false, message: 'paymentStatus phải là PAID hoặc UNPAID' });
    }
    const updated = ShipmentRepository.updatePaymentStatus(req.params.id, paymentStatus);
    if (!updated)
        return res.status(404).json({ success: false, message: 'Không tìm thấy vận đơn' });
    res.json({
        success: true,
        message: `Đã cập nhật trạng thái thanh toán: ${paymentStatus === 'PAID' ? 'Đã thu tiền' : 'Chưa thu (Ghi nợ)'}`,
        data: updated
    });
});
/**
 * API: Xóa vận đơn
 * DELETE /api/shipments/:id
 */
app.delete('/api/shipments/:id', (req, res) => {
    const ok = ShipmentRepository.delete(req.params.id);
    res.json({ success: ok, message: ok ? 'Đã xóa vận đơn' : 'Không tìm thấy vận đơn' });
});
/**
 * API: Danh sách Sổ Địa Chỉ (Shipper & Recipient)
 * GET /api/address-book
 */
app.get('/api/address-book', (req, res) => {
    const type = req.query.type;
    res.json({ success: true, data: AddressBookService.getAll(type) });
});
/**
 * API: Thêm / Cập nhật Sổ Địa Chỉ
 * POST /api/address-book
 */
app.post('/api/address-book', (req, res) => {
    try {
        const saved = AddressBookService.save(req.body);
        res.json({ success: true, message: 'Đã lưu danh bạ địa chỉ', data: saved });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
/**
 * API: Xóa địa chỉ khỏi Sổ Địa Chỉ
 * DELETE /api/address-book/:id
 */
app.delete('/api/address-book/:id', (req, res) => {
    const ok = AddressBookService.delete(req.params.id);
    res.json({ success: ok, message: ok ? 'Đã xóa địa chỉ' : 'Không tìm thấy địa chỉ' });
});
/**
 * API: Tra cứu hành trình vận đơn (Tracking)
 * GET /api/tracking/:trackingNumber
 */
app.get('/api/tracking/:trackingNumber', async (req, res) => {
    try {
        const { trackingNumber } = req.params;
        if (!trackingNumber || trackingNumber.trim() === '') {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp số tracking.' });
        }
        const trackResult = await TrackingService.track(trackingNumber.trim());
        return res.json({
            success: true,
            data: trackResult
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi tra cứu tracking: ' + error.message
        });
    }
});
/**
 * API: Lấy cấu hình Tracking API
 * GET /api/admin/tracking/config
 */
app.get('/api/admin/tracking/config', (req, res) => {
    res.json({
        success: true,
        data: TrackingService.getConfig()
    });
});
/**
 * API: Cập nhật cấu hình Tracking API (17TRACK / TrackingMore)
 * POST /api/admin/tracking/config
 */
app.post('/api/admin/tracking/config', (req, res) => {
    try {
        const { provider, apiKey17Track, apiKeyTrackingMore } = req.body;
        const updated = TrackingService.updateConfig({
            provider,
            ...(apiKey17Track !== undefined ? { apiKey17Track } : {}),
            ...(apiKeyTrackingMore !== undefined ? { apiKeyTrackingMore } : {})
        });
        res.json({
            success: true,
            message: 'Cập nhật cấu hình Tracking API thành công!',
            data: TrackingService.getConfig()
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * =========================================================================
 * MODULE 1: RBAC & TÀI KHOẢN & MULTI-HUB & AUDIT LOGS
 * =========================================================================
 */
app.get('/api/auth/users', (req, res) => {
    res.json({ success: true, data: AuthService.getUsers() });
});
app.get('/api/auth/hubs', (req, res) => {
    res.json({ success: true, data: HUBS_LIST });
});
app.get('/api/auth/roles', (req, res) => {
    res.json({ success: true, data: AuthService.getRoles() });
});
app.get('/api/auth/menus', (req, res) => {
    res.json({ success: true, data: AuthService.getMenus() });
});
app.get('/api/auth/role-permissions', (req, res) => {
    const role = req.query.role;
    if (role) {
        res.json({ success: true, role, data: AuthService.getPermissionsByRole(role) });
    }
    else {
        res.json({ success: true, data: AuthService.getRolePermissions() });
    }
});
app.post('/api/auth/role-permissions/update', (req, res) => {
    const { role, menuId, actions } = req.body;
    if (!role || !menuId || !actions) {
        return res.status(400).json({ success: false, message: 'Thiếu tham số role, menuId hoặc actions' });
    }
    const operator = AuthService.getCurrentUser();
    const result = AuthService.updateMenuPermission(role, menuId, actions, operator);
    res.json(result);
});
app.post('/api/auth/role-permissions/bulk-update', (req, res) => {
    const { role, matrix } = req.body;
    if (!role || !matrix) {
        return res.status(400).json({ success: false, message: 'Thiếu tham số role hoặc matrix' });
    }
    const operator = AuthService.getCurrentUser();
    const result = AuthService.bulkUpdateRolePermissions(role, matrix, operator);
    res.json(result);
});
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu' });
    }
    const result = AuthService.login(username, password);
    if (!result.success) {
        return res.status(401).json(result);
    }
    const permissions = AuthService.getPermissionsByRole(result.user.role);
    res.json({
        success: true,
        token: result.token,
        data: {
            ...result.user,
            permissions
        },
        message: result.message
    });
});
app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.body?.token || undefined);
    if (token) {
        AuthService.logout(token);
    }
    res.json({ success: true, message: 'Đã đăng xuất thành công khỏi hệ thống' });
});
app.post('/api/auth/change-password', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const user = token ? AuthService.getUserByToken(token) : null;
    if (!user) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để đổi mật khẩu' });
    }
    const { oldPassword, newPassword } = req.body;
    const result = AuthService.changePassword(user.username, oldPassword, newPassword);
    res.json(result);
});
app.get('/api/auth/current-user', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token || undefined);
    const user = token ? AuthService.getUserByToken(token) : null;
    if (!user) {
        return res.status(401).json({
            success: false,
            authenticated: false,
            message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập để tiếp tục.'
        });
    }
    const permissions = AuthService.getPermissionsByRole(user.role);
    res.json({
        success: true,
        authenticated: true,
        data: {
            ...AuthService.sanitizeUserForClient(user),
            permissions
        }
    });
});
app.post('/api/auth/switch-user', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const currentUser = token ? AuthService.getUserByToken(token) : null;
    // Chỉ SUPER_ADMIN mới có quyền chuyển đổi tài khoản
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: 'Chỉ Quản Trị Viên Tối Cao (Root Admin) mới có quyền chuyển đổi tài khoản kiểm tra' });
    }
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ success: false, message: 'Thiếu username cần chuyển' });
    }
    const result = AuthService.switchCurrentUser(username);
    if (!result.success) {
        return res.status(404).json(result);
    }
    const permissions = AuthService.getPermissionsByRole(result.user.role);
    res.json({
        success: true,
        data: {
            ...AuthService.sanitizeUserForClient(result.user),
            permissions
        },
        message: result.message
    });
});
app.post('/api/auth/users/update', (req, res) => {
    const { id, updates } = req.body;
    if (!id || !updates) {
        return res.status(400).json({ success: false, message: 'Thiếu id hoặc updates' });
    }
    const operator = AuthService.getCurrentUser();
    const result = AuthService.updateUserAccount(id, updates, operator);
    res.json(result);
});
app.post('/api/auth/users/create', (req, res) => {
    const { username, fullName, email, phone, role, hub, customerCode, creditLimit } = req.body;
    if (!username || !fullName || !role || !hub) {
        return res.status(400).json({ success: false, message: 'Vui lòng điền đủ: username, fullName, role, hub' });
    }
    if (AuthService.getUserById(username)) {
        return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
    }
    const newUser = AuthService.createUser({
        id: `usr_${Date.now()}`,
        username,
        fullName,
        email: email || `${username}@pandalex.vn`,
        phone: phone || '',
        role,
        hub,
        customerCode: customerCode || undefined,
        walletBalance: 0,
        creditLimit: creditLimit || 0,
        isActive: true,
        createdAt: new Date().toISOString()
    });
    const operator = AuthService.getCurrentUser();
    AuthService.logAction({
        userId: operator.id,
        username: operator.username,
        userRole: operator.role,
        action: 'UPDATE_PERMISSIONS',
        targetId: newUser.username,
        details: `Tạo mới tài khoản người dùng: ${newUser.fullName} (${newUser.role} @ Hub ${newUser.hub})`,
        hub: operator.hub
    });
    res.json({ success: true, user: newUser, message: 'Tạo tài khoản thành công' });
});
app.get('/api/auth/audit-logs', (req, res) => {
    const limit = parseInt(req.query.limit || '50', 10);
    res.json({ success: true, data: AuthService.getAuditLogs(limit) });
});
// API: Danh sách Văn phòng / Chi nhánh / Hub
app.get('/api/hubs', (req, res) => {
    res.json({ success: true, data: HUBS_LIST });
});
// API: Vị trí địa lý & Phân vùng cước (Zones & Countries)
app.get('/api/geo/countries-and-zones', (req, res) => {
    const upsZones = upsRateTable ? upsRateTable.zones : {};
    const fedexZones = fedexRateTable ? fedexRateTable.zones : {};
    const allCountries = Array.from(new Set([...Object.keys(upsZones), ...Object.keys(fedexZones)])).sort();
    const data = allCountries.map(codeOrName => ({
        country: codeOrName,
        upsZone: upsZones[codeOrName] || '—',
        fedexZone: fedexZones[codeOrName] || '—'
    }));
    res.json({ success: true, total: data.length, data });
});
// API: CRM - Danh sách Khách hàng Hợp đồng
app.get('/api/crm/contracts', (req, res) => {
    const customers = CustomerService.getAll();
    const contractList = customers.filter(c => c.financialCategory === 'POSTPAID_CONTRACT' || c.customerType === 'VIP' || (c.creditLimit && c.creditLimit > 0));
    const data = contractList.map((c, i) => ({
        id: c.id,
        customerCode: c.customerCode,
        customerName: c.customerName,
        representative: c.representative || 'Chưa cập nhật',
        phone: c.phone,
        taxId: c.taxId || 'Chưa có MST',
        address: c.address || '',
        hub: c.hub,
        contractNumber: `HD-PDL/2026/${c.customerCode.replace(/[^0-9]/g, '').padStart(3, '0') || (101 + i)}`,
        signDate: c.createdAt ? c.createdAt.slice(0, 10) : '2026-01-01',
        expireDate: '2026-12-31',
        creditLimit: c.creditLimit || 0,
        creditDays: c.creditDays || 30,
        currentDebt: c.currentDebt || 0,
        approvalStatus: c.approvalStatus || 'APPROVED',
        notes: c.notes || 'Hợp đồng vận chuyển chuyển phát nhanh quốc tế PandaLex Express'
    }));
    res.json({ success: true, total: data.length, data });
});
// API: Tài chính - Danh sách Đại lý & Chính sách
app.get('/api/finance/agents', (req, res) => {
    const customers = CustomerService.getAll();
    const agents = customers.filter(c => c.customerType === 'AGENT');
    const allShipments = ShipmentRepository.getAll();
    const data = agents.map(a => {
        const agentShipments = allShipments.filter(s => s.customerCode === a.customerCode);
        const totalSpent = agentShipments.reduce((sum, s) => sum + (s.sellPrice || 0), 0);
        return {
            id: a.id,
            customerCode: a.customerCode,
            customerName: a.customerName,
            representative: a.representative || 'Chưa cập nhật',
            phone: a.phone,
            hub: a.hub,
            financialCategory: a.financialCategory,
            walletBalance: a.walletBalance || 0,
            currentDebt: a.currentDebt || 0,
            marginPercent: a.marginPercent || 0,
            marginFixedAmount: a.marginFixedAmount || 0,
            totalShipmentsCount: agentShipments.length,
            totalSpent
        };
    });
    res.json({ success: true, total: data.length, data });
});
/**
 * =========================================================================
 * MODULE 3: BỘ LỌC CẢNH BÁO HÀNG CẤM BAY (COMPLIANCE CHECK)
 * =========================================================================
 */
app.post('/api/compliance/check', (req, res) => {
    const { descriptions } = req.body;
    if (!Array.isArray(descriptions)) {
        return res.status(400).json({ success: false, message: 'descriptions phải là mảng chuỗi' });
    }
    const result = AviationComplianceChecker.check(descriptions);
    res.json({ success: true, data: result });
});
/**
 * =========================================================================
 * MODULE 5: KHO BÃI & VẬN HÀNH (PICKUP, SCAN INBOUND, REWEIGH, BAGGING, MANIFEST)
 * =========================================================================
 */
// 1. Xác nhận nhân viên đến nhận hàng từ khách (PICKUP_CONFIRM)
app.post('/api/warehouse/pickup-confirm', (req, res) => {
    const { trackingNumber, hub, operator } = req.body;
    if (!trackingNumber)
        return res.status(400).json({ success: false, message: 'Thiếu số tracking' });
    const result = WarehouseService.pickupConfirm(trackingNumber, operator || 'khosgn', hub || 'SGN');
    res.json(result);
});
// 2. Quét nhập kho & Đánh giá Cổng Tài Chính (SCAN INBOUND -> WAITING_FINANCE_DISPATCH)
app.post('/api/warehouse/scan-inbound', (req, res) => {
    const { trackingNumber, hub, operator } = req.body;
    if (!trackingNumber)
        return res.status(400).json({ success: false, message: 'Thiếu số tracking' });
    const result = WarehouseService.scanInbound(trackingNumber, hub || 'SGN', operator || 'khosgn');
    res.json(result);
});
// 3. Danh sách đơn trong Kho Chờ Xuất (đã nhập kho & đủ 3 điều kiện tài chính)
app.get('/api/warehouse/waiting-dispatch', (req, res) => {
    const hub = req.query.hub;
    const list = ShipmentRepository.getWaitingDispatch(hub);
    res.json({ success: true, data: list, count: list.length });
});
// 4. Bảng Kê Xuất Kho (Dispatch Manifests)
app.get('/api/warehouse/manifests', (req, res) => {
    res.json({ success: true, data: ManifestService.getAll() });
});
app.get('/api/warehouse/manifests/:id', (req, res) => {
    const m = ManifestService.getById(req.params.id);
    if (!m)
        return res.status(404).json({ success: false, message: 'Không tìm thấy Bảng kê: ' + req.params.id });
    res.json({ success: true, data: m });
});
app.post('/api/warehouse/manifests', (req, res) => {
    try {
        const result = ManifestService.createManifest(req.body);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
app.get('/api/warehouse/manifests/:id/print', (req, res) => {
    const m = ManifestService.getById(req.params.id);
    if (!m)
        return res.status(404).send('Không tìm thấy Bảng kê: ' + req.params.id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(ManifestService.renderManifestHtml(m));
});
app.get('/api/warehouse/manifests/:id/excel', (req, res) => {
    const m = ManifestService.getById(req.params.id);
    if (!m)
        return res.status(404).send('Không tìm thấy Bảng kê: ' + req.params.id);
    const buf = ManifestService.exportManifestExcel(m);
    res.setHeader('Content-Disposition', `attachment; filename="${m.manifestId}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
});
app.post('/api/warehouse/reweigh', (req, res) => {
    const { trackingNumber, actualWeightKg, length, width, height, operator, hub } = req.body;
    if (!trackingNumber || !actualWeightKg) {
        return res.status(400).json({ success: false, message: 'Thiếu thông số cân nặng thực tế' });
    }
    const result = WarehouseService.reweighShipment(trackingNumber, parseFloat(actualWeightKg), {
        length: parseFloat(length || 0),
        width: parseFloat(width || 0),
        height: parseFloat(height || 0)
    }, operator || 'khosgn', hub || 'SGN');
    res.json(result);
});
app.get('/api/warehouse/bags', (req, res) => {
    res.json({ success: true, data: WarehouseService.getAllBags() });
});
app.post('/api/warehouse/bags/add', (req, res) => {
    const { bagId, trackingNumber, operator } = req.body;
    const result = WarehouseService.addShipmentToBag(bagId, trackingNumber, operator || 'khosgn');
    res.json(result);
});
app.post('/api/warehouse/bags/create', (req, res) => {
    const { hub, destinationCountry, carrier } = req.body;
    const bag = WarehouseService.createOrGetOpenBag(hub || 'SGN', destinationCountry || 'US', carrier || 'UPS');
    res.json({ success: true, data: bag });
});
app.post('/api/warehouse/bags/seal', (req, res) => {
    const { bagId, sealNumber, operator } = req.body;
    const result = WarehouseService.sealBag(bagId, sealNumber, operator || 'khosgn');
    res.json(result);
});
// 5. Quét / Chụp ảnh AWB nhập kho bằng AI OCR (Hỗ trợ UPS, FedEx...)
app.post('/api/warehouse/inbound-ocr', (req, res) => {
    try {
        const { trackingNumber, carrier, actualWeightKg, length, width, height, serviceName, itemDescription, sender, recipient, financialCategory, hub, operator, rawText } = req.body;
        let targetTrk = trackingNumber;
        let targetCarrier = carrier;
        let targetWeight = parseFloat(actualWeightKg) || 1.0;
        let targetDims = {
            length: parseFloat(length) || 25,
            width: parseFloat(width) || 20,
            height: parseFloat(height) || 10
        };
        // Nếu người dùng gửi văn bản OCR thô
        if (rawText && (!targetTrk || !targetCarrier)) {
            const parsed = AwbOcrService.parseText(rawText);
            if (parsed) {
                targetTrk = targetTrk || parsed.trackingNumber;
                targetCarrier = targetCarrier || parsed.carrier;
                if (parsed.weightKg)
                    targetWeight = parsed.weightKg;
                if (parsed.pieces && parsed.pieces.length > 0) {
                    targetDims.length = parsed.pieces[0].lengthCm || targetDims.length;
                    targetDims.width = parsed.pieces[0].widthCm || targetDims.width;
                    targetDims.height = parsed.pieces[0].heightCm || targetDims.height;
                }
            }
        }
        if (!targetTrk) {
            return res.status(400).json({ success: false, message: 'Không thể nhận diện mã AWB từ ảnh/dữ liệu quét!' });
        }
        const result = WarehouseService.inboundFromOcr({
            trackingNumber: targetTrk,
            carrier: targetCarrier,
            actualWeightKg: targetWeight,
            dims: targetDims,
            serviceName,
            itemDescription,
            sender,
            recipient,
            financialCategory: financialCategory || 'IMMEDIATE'
        }, hub || 'HAN', operator || 'thukho');
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// 6. Danh sách vận đơn theo Hub chi nhánh làm việc & phân loại 3 kênh tài chính
app.get('/api/warehouse/hub-shipments', (req, res) => {
    const hub = req.query.hub || 'HAN';
    const tab = req.query.tab || 'all';
    const category = req.query.category;
    let list = ShipmentRepository.getAll().filter(s => {
        return !hub || s.currentWarehouseHub === hub || s.inboundHub === hub || s.hub === hub;
    });
    if (tab === 'pending_inbound') {
        list = list.filter(s => s.status === 'PENDING_INBOUND' || s.status === 'PENDING_PICKUP' || s.status === 'PICKED_UP');
    }
    else if (tab === 'inbound_received') {
        list = list.filter(s => s.status === 'INBOUND_RECEIVED' || s.status === 'WAITING_FINANCE_DISPATCH');
        if (category) {
            list = list.filter(s => s.financialCategory === category);
        }
    }
    else if (tab === 'waiting_dispatch') {
        list = list.filter(s => s.status === 'WAITING_FINANCE_DISPATCH' || (s.status === 'INBOUND_RECEIVED' && s.financialStatus.eligibleForDispatch));
    }
    else if (tab === 'dispatched') {
        list = list.filter(s => s.status === 'OUTBOUND_DISPATCHED' || s.status === 'DELIVERED');
    }
    // Thống kê nhanh
    const allHubShipments = ShipmentRepository.getAll().filter(s => !hub || s.currentWarehouseHub === hub || s.inboundHub === hub || s.hub === hub);
    const pendingCount = allHubShipments.filter(s => s.status === 'PENDING_INBOUND' || s.status === 'PENDING_PICKUP' || s.status === 'PICKED_UP').length;
    const inboundedList = allHubShipments.filter(s => s.status === 'INBOUND_RECEIVED' || s.status === 'WAITING_FINANCE_DISPATCH');
    const waitingDispatchCount = allHubShipments.filter(s => s.status === 'WAITING_FINANCE_DISPATCH' || (s.status === 'INBOUND_RECEIVED' && s.financialStatus.eligibleForDispatch)).length;
    const dispatchedCount = allHubShipments.filter(s => s.status === 'OUTBOUND_DISPATCHED' || s.status === 'DELIVERED').length;
    const immediateCount = inboundedList.filter(s => s.financialCategory === 'IMMEDIATE').length;
    const postpaidCount = inboundedList.filter(s => s.financialCategory === 'POSTPAID').length;
    const walletCount = inboundedList.filter(s => s.financialCategory === 'WALLET').length;
    const currentUser = AuthService.getCurrentUser();
    const sanitizedList = AuthService.sanitizeShipmentsForRole(list, currentUser.role);
    res.json({
        success: true,
        data: sanitizedList,
        stats: {
            hub,
            pendingCount,
            inboundedTotal: inboundedList.length,
            immediateCount,
            postpaidCount,
            walletCount,
            waitingDispatchCount,
            dispatchedCount,
            totalCount: allHubShipments.length
        }
    });
});
/**
 * =========================================================================
 * MODULE 5.5: ĐỐI SOÁT & GẠCH NỢ (RECONCILIATION & DEBT CLEARING)
 * =========================================================================
 */
// 1. Tổng hợp nợ phải trả Nhà cung cấp / Hãng vận chuyển (Cost Price settlement)
app.get('/api/reconciliation/vendors', (req, res) => {
    try {
        const data = ReconciliationService.getVendorDebtSummaries();
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// 2. Gạch nợ Nhà cung cấp / Hãng vận chuyển
app.post('/api/reconciliation/vendors/settle', (req, res) => {
    try {
        const { vendor, shipmentIds, paymentRef, amount, notes, operator } = req.body;
        const result = ReconciliationService.settleVendorDebt({
            vendor,
            shipmentIds,
            paymentRef,
            amount: parseFloat(amount || 0),
            notes,
            operator: operator || 'ketoan'
        });
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// 3. Tổng hợp công nợ phải thu Đại lý / Khách hàng thanh toán sau (Sell Price settlement)
app.get('/api/reconciliation/customers', (req, res) => {
    try {
        const data = ReconciliationService.getCustomerDebtSummaries();
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// 4. Gạch nợ công nợ Đại lý / Khách hàng thanh toán sau
app.post('/api/reconciliation/customers/settle', (req, res) => {
    try {
        const { customerCode, customerName, shipmentIds, paymentRef, amount, notes, operator } = req.body;
        const result = ReconciliationService.settleCustomerDebt({
            customerCode,
            customerName,
            shipmentIds,
            paymentRef,
            amount: parseFloat(amount || 0),
            notes,
            operator: operator || 'ketoan'
        });
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// 5. Danh sách chứng từ gạch nợ / quyết toán
app.get('/api/reconciliation/vouchers', (req, res) => {
    res.json({ success: true, data: ReconciliationService.getAllVouchers() });
});
app.get('/api/reconciliation/vouchers/:id', (req, res) => {
    const v = ReconciliationService.getVoucherById(req.params.id);
    if (!v)
        return res.status(404).json({ success: false, message: 'Không tìm thấy chứng từ ' + req.params.id });
    res.json({ success: true, data: v });
});
/**
 * =========================================================================
 * MODULE 6: TÀI CHÍNH, VÍ ĐẠI LÝ TRẢ TRƯỚC & BÁO CÁO LỢI NHUẬN
 * =========================================================================
 */
app.get('/api/finance/summary', (req, res) => {
    res.json({ success: true, data: FinanceService.getFinancialSummary() });
});
app.get('/api/finance/transactions', (req, res) => {
    const userId = req.query.userId;
    res.json({ success: true, data: FinanceService.getTransactions(userId) });
});
app.post('/api/finance/wallet/topup', (req, res) => {
    const { userId, amount, note, operatorUsername } = req.body;
    const accountant = AuthService.getUserById(operatorUsername || 'ketoan') || {
        id: 'usr_accountant', username: 'ketoan', fullName: 'Kế Toán', email: '', role: 'ACCOUNTANT', hub: 'SGN', walletBalance: 0, creditLimit: 0, isActive: true, createdAt: ''
    };
    const result = FinanceService.topupWallet(userId, parseFloat(amount), note || 'Nạp tiền ví', accountant);
    res.json(result);
});
// 4. Lập Phiếu Thu Tiền (Receipt Voucher) - Kế toán chọn kênh thanh toán & phát hành phiếu thu
app.post('/api/finance/receipt-vouchers', (req, res) => {
    try {
        const { type, shipmentId, trackingNumber, customerCode, customerName, amount, paymentChannel, paymentChannelName, bankAccount, referenceCode, payerName, payerPhone, reason, hub, operator } = req.body;
        if (!customerCode || !amount || !paymentChannel) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc: Mã khách hàng, Số tiền, hoặc Kênh thanh toán' });
        }
        const result = FinanceService.createReceiptVoucher({
            type: type || 'SHIPMENT_FEE',
            shipmentId,
            trackingNumber,
            customerCode,
            customerName,
            amount: parseFloat(amount),
            paymentChannel,
            paymentChannelName,
            bankAccount,
            referenceCode,
            payerName,
            payerPhone,
            reason,
            hub: (hub || 'SGN'),
            operator: operator || 'ketoan'
        });
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// 5. Danh sách Sổ Quỹ & Phiếu Thu
app.get('/api/finance/receipt-vouchers', (req, res) => {
    const { customerCode, type, channel, hub, keyword } = req.query;
    const list = FinanceService.getAllReceiptVouchers({
        customerCode,
        type,
        channel,
        hub,
        keyword
    });
    res.json({ success: true, count: list.length, data: list });
});
// 6. Chi tiết Phiếu Thu
app.get('/api/finance/receipt-vouchers/:code', (req, res) => {
    const voucher = FinanceService.getReceiptVoucherByCode(req.params.code);
    if (!voucher)
        return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu thu: ' + req.params.code });
    res.json({ success: true, data: voucher });
});
/**
 * =========================================================================
 * GIAI ĐOẠN 2: NỀN TẢNG LOGISTICS QUỐC TẾ (AIR CARGO & SEA FREIGHT)
 * =========================================================================
 */
// 1. Air Cargo (MAWB / HAWB)
app.get('/api/freight/air/bookings', (req, res) => {
    res.json({ success: true, data: FreightService.getAllAirBookings() });
});
app.get('/api/freight/air/bookings/:id', (req, res) => {
    const b = FreightService.getAirBookingById(req.params.id);
    if (!b)
        return res.status(404).json({ success: false, message: 'Không tìm thấy Booking MAWB' });
    res.json({ success: true, data: b });
});
app.post('/api/freight/air/bookings', (req, res) => {
    try {
        const booking = FreightService.createAirBooking(req.body, req.body.operator || 'admin');
        res.json({ success: true, message: 'Tạo Booking Air Cargo thành công', data: booking });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
app.post('/api/freight/air/bookings/:id/hawb', (req, res) => {
    try {
        const result = FreightService.addHawbToBooking(req.params.id, req.body, req.body.operator || 'admin');
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// 2. Sea Freight (FCL / LCL)
app.get('/api/freight/sea/shipments', (req, res) => {
    res.json({ success: true, data: FreightService.getAllSeaShipments() });
});
app.get('/api/freight/sea/shipments/:id', (req, res) => {
    const s = FreightService.getSeaShipmentById(req.params.id);
    if (!s)
        return res.status(404).json({ success: false, message: 'Không tìm thấy Vận đơn đường biển' });
    res.json({ success: true, data: s });
});
app.post('/api/freight/sea/shipments', (req, res) => {
    try {
        const shipment = FreightService.createSeaShipment(req.body, req.body.operator || 'admin');
        res.json({ success: true, message: 'Tạo Vận đơn đường biển thành công', data: shipment });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
app.put('/api/freight/sea/shipments/:id/status', (req, res) => {
    const s = FreightService.updateSeaStatus(req.params.id, req.body.status);
    if (!s)
        return res.status(404).json({ success: false, message: 'Không tìm thấy lô hàng' });
    res.json({ success: true, message: `Đã cập nhật trạng thái lô hàng thành công: ${req.body.status}`, data: s });
});
if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 PandaLex Express Universal Gateway running on port ${PORT}`);
        console.log(`📊 Health check: http://0.0.0.0:${PORT}/api/health`);
    });
}
export default app;
export { app };
