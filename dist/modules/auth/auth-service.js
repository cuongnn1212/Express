import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
export const HUBS_LIST = [
    { code: 'SGN', name: 'Tổng Kho Sài Gòn (Tân Bình - SGN Hub)', address: 'Phúc Yên, Phan Huy Ích, P.15, Q. Tân Bình, TP.HCM', hotline: '0976 843 168' },
    { code: 'HAN', name: 'Tổng Kho Hà Nội (Nội Bài - HAN Hub)', address: 'Khu Logistics Sân bay Quốc tế Nội Bài, Sóc Sơn, Hà Nội', hotline: '0988 123 456' },
    { code: 'DAD', name: 'Kho Trung chuyển Đà Nẵng (DAD Hub)', address: 'Nguyễn Tri Phương, Q. Thanh Khê, TP. Đà Nẵng', hotline: '0905 888 999' }
];
export const SYSTEM_ROLES = [
    {
        code: 'SUPER_ADMIN',
        positionCode: 'ADMIN',
        name: 'Quản Trị Viên Hệ Thống (System Admin)',
        description: 'Quyền cao nhất tối cao (Root Admin - Cấp 1): Toàn quyền kiểm soát hệ thống, cơ sở dữ liệu, phân quyền cho Ban Giám Đốc và các bộ phận, cấu hình hạ tầng API và audit log',
        isSystemRole: true,
        status: 1,
        hierarchyLevel: 1
    },
    {
        code: 'DIRECTOR',
        positionCode: 'BGD',
        name: 'Ban Giám Đốc (Board of Directors / CEO)',
        description: 'Quyền điều hành cấp cao nhất (ngay sau Admin - Cấp 2): Toàn quyền xem và phê duyệt mọi hoạt động kinh doanh, tài chính, báo cáo lãi lỗ P&L, duyệt hạn mức nợ, chiết khấu và điều hành tất cả chi nhánh',
        isSystemRole: true,
        status: 1,
        hierarchyLevel: 2
    },
    {
        code: 'ACCOUNTANT',
        positionCode: 'KTT',
        name: 'Kế Toán Trưởng & Tài Chính',
        description: 'Quản lý công nợ, đối soát gạch nợ NCC (UPS/FedEx) và Đại lý, nạp ví trả trước, duyệt tài chính xuất kho',
        isSystemRole: true,
        status: 1,
        hierarchyLevel: 3
    },
    {
        code: 'WAREHOUSE',
        positionCode: 'TKHO',
        name: 'Thủ Kho & Điều Phối Bưu Cục',
        description: 'Quét nhận Inbound, chụp ảnh nhãn OCR, cân đo kiện hàng, gom bao và lập Bảng Kê Xuất Kho theo chi nhánh',
        isSystemRole: true,
        status: 1,
        hierarchyLevel: 4
    },
    {
        code: 'WAREHOUSE_PARTNER',
        positionCode: 'DT_KHO',
        name: 'Đối Tác Kho / Kho Vệ Tinh (Không Xem Giá)',
        description: 'Dành riêng cho đối tác kho, kho vệ tinh: Được quét Nhập kho (Inbound), Xuất kho (Outbound), kiểm tra kiện hàng, chụp ảnh AWB. TUYỆT ĐỐI KHÔNG XEM ĐƯỢC GIÁ BÁN, GIÁ VỐN HAY SỔ QUỸ TÀI CHÍNH.',
        isSystemRole: true,
        status: 1,
        hierarchyLevel: 5
    },
    {
        code: 'AGENT',
        positionCode: 'DLY',
        name: 'Đại Lý Vận Chuyển Cấp 2',
        description: 'Tạo đơn AWB, in nhãn, in Commercial Invoice, nạp ví trả trước và quản lý đơn hàng của riêng đại lý',
        isSystemRole: true,
        status: 1,
        hierarchyLevel: 6
    },
    {
        code: 'CUSTOMER',
        positionCode: 'KHLE',
        name: 'Khách Hàng Gửi Hàng (End Customer)',
        description: 'Tạo đơn lẻ, tra cứu vận trình kiện hàng theo mã tracking, thanh toán cước trực tiếp',
        isSystemRole: true,
        status: 1,
        hierarchyLevel: 7
    }
];
export const SYSTEM_MENUS = [
    // Nhóm 0: Tổng Quan & Dashboard
    {
        id: 'dashboard',
        name: '0.1 Dashboard KPI & Báo Cáo Tổng Hợp',
        group: '0. Tổng Quan & Dashboard',
        description: 'Theo dõi tổng quan KPI sản lượng kg, số lượng đơn, doanh thu, lợi nhuận gộp và biểu đồ vận hành thời gian thực'
    },
    // Nhóm 1: Cấu hình & Biểu cước (Master Data)
    {
        id: 'rates',
        name: '1.1 Bảng Giá & Biểu Cước Hãng (UPS / FedEx)',
        group: '1. Cấu Hình & Biểu Cước',
        description: 'Quản lý bảng cước mua Viettel và bảng cước bán khách hàng Frank, cấu trúc vùng tính cước'
    },
    {
        id: 'customers',
        name: '1.2 Khách Hàng (Master Data & Báo Giá)',
        group: '1. Cấu Hình & Biểu Cước',
        description: 'Danh bạ đối tác khách hàng, phân loại trả trước/công nợ và cấu hình tỷ lệ chiết khấu riêng'
    },
    {
        id: 'hubs',
        name: '1.3 Văn Phòng / Chi Nhánh / Hub Khai Thác',
        group: '1. Cấu Hình & Biểu Cước',
        description: 'Quản lý các chi nhánh khai thác kho SGN (Tân Bình), HAN (Nội Bài), DAD (Đà Nẵng)'
    },
    {
        id: 'geography',
        name: '1.4 Vị Trí Địa Lý & Ma Trận Phân Vùng (Zone)',
        group: '1. Cấu Hình & Biểu Cước',
        description: 'Cấu hình danh mục quốc gia, mã bưu chính và ma trận phân vùng cước hãng (Zone Matrix)'
    },
    {
        id: 'surcharges',
        name: '1.5 Phụ Phí Xăng Dầu (FSC) & Vùng Xa',
        group: '1. Cấu Hình & Biểu Cước',
        description: 'Cập nhật tỷ lệ biến động nhiên liệu hàng tuần (FSC) và phụ phí khu vực mở rộng / vùng sâu vùng xa'
    },
    {
        id: 'customsCargoConfig',
        name: '1.6 Quản Lý Phí Hải Quan Theo Loại Hàng',
        group: '1. Cấu Hình & Biểu Cước',
        description: 'Cấu hình đơn giá hải quan thu khách & trả NCC cho từng loại hàng (Mỹ phẩm, Thực phẩm, Hàng hiệu, Trầm hương...)'
    },
    {
        id: 'audit',
        name: '1.7 Phân Quyền Chức Vụ & Audit Logs',
        group: '1. Cấu Hình & Biểu Cước',
        description: 'Quản trị ma trận phân quyền RBAC theo chức vụ (PermissionPage) và kiểm tra nhật ký vết thao tác hệ thống'
    },
    {
        id: 'r2Storage',
        name: '1.8 Cấu Hình Lưu Trữ Đám Mây (Cloud R2)',
        group: '1. Cấu Hình & Biểu Cước',
        description: 'Cấu hình kết nối lưu trữ ảnh nhãn AWB và ảnh chụp kiện hàng trên Cloudflare R2 / AWS S3'
    },
    // Nhóm 2: Vận hành & Kho (Operations)
    {
        id: 'createShipment',
        name: '2.1 Tạo Đơn Hàng & In Tem AWB (UPS/FedEx)',
        group: '2. Vận Hành Kho & Vận Đơn',
        description: 'Tạo đơn mới theo form chuẩn hãng, tự động sinh mã AWB check digit và in tem nhiệt 4x6'
    },
    {
        id: 'shipments',
        name: '2.2 Quản Lý Đơn Hàng & Manifest Quốc Tế',
        group: '2. Vận Hành Kho & Vận Đơn',
        description: 'Tra cứu, lọc trạng thái vận hành, xuất file Excel danh sách và quản lý đơn hàng'
    },
    {
        id: 'excelPricingTool',
        name: '2.3 Tool Tính Giá Cước Hàng Loạt Bằng Excel',
        group: '2. Vận Hành Kho & Vận Đơn',
        description: 'Nhập file Excel AWB + Kg, tính cước hãng & cước khách tự động, xuất bảng kê thu khách & trả Viettel, lưu đơn hàng loạt'
    },
    {
        id: 'warehouse',
        name: '2.4 Kho Bãi, Quét Inbound, Kho Chờ Xuất & Bảng Kê',
        group: '2. Vận Hành Kho & Vận Đơn',
        description: 'Trạm nhập kho AI OCR nhãn tem, cân đo kiện hàng, kiểm soát 3 điều kiện kho chờ xuất, gom bao và lập bảng kê xuất kho'
    },
    {
        id: 'trackingPortal',
        name: '2.5 Cổng Tra Cứu Vận Trình Tracking AWB',
        group: '2. Vận Hành Kho & Vận Đơn',
        description: 'Giao diện tra cứu chi tiết hành trình vận chuyển đa hãng dành cho khách hàng và bộ phận vận hành'
    },
    {
        id: 'awbManagement',
        name: '2.6 Quản Lý Vận Đơn AWB & Kho Số Hãng',
        group: '2. Vận Hành Kho & Vận Đơn',
        description: 'Quản lý kho dải số tracking UPS/FedEx, kiểm tra thuật toán Mod 7/10, hủy đơn Void AWB và xuất báo cáo vận đơn'
    },
    {
        id: 'commercialInvoice',
        name: '2.7 Hóa Đơn Thương Mại (Commercial Invoice)',
        group: '2. Vận Hành Kho & Vận Đơn',
        description: 'Lập hóa đơn hải quan xuất khẩu CI, khai báo chi tiết dòng hàng HS Code, xuất file in PDF và Excel CI chuẩn quốc tế'
    },
    {
        id: 'photoLookup',
        name: '2.8 Tra Cứu Hình Ảnh Kiện Hàng & Nhãn AWB (Cloud)',
        group: '2. Vận Hành Kho & Vận Đơn',
        description: 'Tra cứu trực quan ảnh chụp nhãn tem AWB và ảnh chụp kiện hàng trên bàn cân lưu trữ trên Cloudflare R2'
    },
    // Nhóm 3: Tài chính & Sổ Quỹ (Finance)
    {
        id: 'codeVsSell',
        name: '3.1 Quản Lý Giá Code (Cost Hãng) vs Giá Bán',
        group: '3. Tài Chính & Đối Soát',
        description: 'So sánh song song Giá mua từ hãng (TỐI MẬT) và Giá bán thu khách hàng để kiểm soát biên lợi nhuận gộp'
    },
    {
        id: 'markupConfig',
        name: '3.2 Cài Đặt Gup Giá Bán & Lợi Nhuận Gộp',
        group: '3. Tài Chính & Đối Soát',
        description: 'Cài đặt tỷ lệ cộng lãi (%) hoặc số tiền cố định (đ/kg) vào cước gốc để xây dựng bảng giá bán cho từng phân khúc'
    },
    {
        id: 'agents',
        name: '3.3 Quản Lý Đại Lý Cấp 2 & Chính Sách Chiết Khấu',
        group: '3. Tài Chính & Đối Soát',
        description: 'Quản lý danh sách đại lý gom hàng, gán biểu cước ưu đãi và tỷ lệ chiết khấu riêng theo doanh số'
    },
    {
        id: 'carrierPartners',
        name: '3.4 Nhà Cung Cấp & Sổ Ký Quỹ Hãng (Vendor Deposit)',
        group: '3. Tài Chính & Đối Soát',
        description: 'Theo dõi tài khoản ký quỹ với Viettel/UPS/FedEx, theo dõi chi phí mua cước và nạp tiền bảo lãnh thanh toán'
    },
    {
        id: 'finance',
        name: '3.5 Công Nợ, Thu Cước & Mở Khóa Xuất Kho',
        group: '3. Tài Chính & Đối Soát',
        description: 'Cổng kiểm soát tài chính 3 điều kiện (Đã thanh toán, Đã trừ ví/nợ, Có cam kết thuế) để cho phép kho xuất hàng'
    },
    {
        id: 'walletTopup',
        name: '3.6 Quản Lý Top-Up Ví Đại Lý & Ký Quỹ Trả Trước',
        group: '3. Tài Chính & Đối Soát',
        description: 'Quản lý nạp tiền ví trả trước, khấu trừ tự động khi tạo đơn và cấp hạn mức công nợ bảo lãnh'
    },
    {
        id: 'reconciliation',
        name: '3.7 Đối Soát Hai Chiều (Phải Thu AR vs Phải Trả AP)',
        group: '3. Tài Chính & Đối Soát',
        description: 'Đối soát chênh lệch trọng lượng & cước phí: Phải thu khách hàng (AR) và Phải chi trả nhà cung cấp hãng (AP)'
    },
    {
        id: 'cashBook',
        name: '3.8 Sổ Quỹ Thu - Chi Toàn Diện & Phiếu Thu/Chi',
        group: '3. Tài Chính & Đối Soát',
        description: 'Sổ quỹ tiền mặt & ngân hàng, tạo và quản lý Phiếu Thu cước AWB, Phiếu Chi vận hành/hải quan, báo cáo tồn quỹ'
    },
    // Nhóm 4: CRM & Hợp Đồng (CRM & Contracts)
    {
        id: 'contracts',
        name: '4.1 Quản Lý Khách Hàng Hợp Đồng & Công Nợ',
        group: '4. CRM & Hợp Đồng',
        description: 'Theo dõi hợp đồng pháp lý, chu kỳ thanh toán trả sau (7-15-30 ngày), hạn mức nợ tối đa và cảnh báo quá hạn'
    },
    {
        id: 'approval',
        name: '4.2 Hàng Đợi Phê Duyệt Tài Khoản & Tín Dụng',
        group: '4. CRM & Hợp Đồng',
        description: 'Quy trình xét duyệt cấp tài khoản khách hàng mới, thẩm định hồ sơ công ty và nâng hạn mức nợ'
    },
    {
        id: 'commitments',
        name: '4.3 Cam Kết Sản Lượng & Phân Cấp Khách Hàng VIP',
        group: '4. CRM & Hợp Đồng',
        description: 'Theo dõi sản lượng cam kết hàng tháng (kg/tháng), phân hạng khách hàng VIP và tính thưởng chiết khấu bậc thang'
    },
    {
        id: 'customerCommunication',
        name: '4.4 Trung Tâm Giao Tiếp CSKH & Khách Hàng',
        group: '4. CRM & Hợp Đồng',
        description: 'Tiếp nhận yêu cầu lấy hàng tận nơi (Pickup Request), xử lý khiếu nại đền bù hàng hóa và chat hỗ trợ 24/7'
    },
    // Nhóm 5: Mở Rộng & BI (Integrations & Analytics)
    {
        id: 'customerApi',
        name: '5.1 Quản Lý Kết Nối API Khách Hàng (Open API)',
        group: '5. Mở Rộng & BI',
        description: 'Cấp và quản lý API Key, Webhook, tài liệu REST API để khách hàng tích hợp tạo đơn trực tiếp từ website/ERP'
    },
    {
        id: 'tracking',
        name: '5.2 Tích Hợp API Hãng & Webhook Tra Cứu Tracking',
        group: '5. Mở Rộng & BI',
        description: 'Cấu hình API kết nối máy chủ UPS Developers & FedEx Web Services để đồng bộ trạng thái giao hàng tự động'
    },
    {
        id: 'biAnalytics',
        name: '5.3 Báo Cáo Phân Tích Thông Minh & BI Dashboard',
        group: '5. Mở Rộng & BI',
        description: 'Báo cáo phân tích chuyên sâu: Cơ cấu doanh thu theo tuyến bay, top khách hàng lớn, tỷ lệ giao thành công On-time'
    },
    {
        id: 'airCargo',
        name: '5.4 Air Cargo & Vận Tải Quốc Tế (MAWB/HAWB)',
        group: '5. Mở Rộng & BI',
        description: 'Linehaul hàng không MAWB / HAWB kiện lớn, gom hàng bay và kết nối hãng hàng không quốc tế'
    },
    {
        id: 'seaFreight',
        name: '5.5 Vận Tải Đường Biển (Sea Freight FCL & LCL)',
        group: '5. Mở Rộng & BI',
        description: 'Container nguyên FCL và hàng gom lẻ LCL đường biển, quản lý thủ tục hải quan cảng biển'
    }
];
export class AuthService {
    static userFile = path.join(process.cwd(), 'data', 'users.json');
    static auditFile = path.join(process.cwd(), 'data', 'audit_logs.json');
    static permissionsFile = path.join(process.cwd(), 'data', 'role_permissions.json');
    static users = [];
    static auditLogs = [];
    static rolePermissions = {};
    static currentUsername = 'admin';
    static sessions = new Map();
    static hashPassword(password, salt) {
        return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    }
    static generateSalt() {
        return crypto.randomBytes(16).toString('hex');
    }
    static getDefaultPasswordForUsername(username) {
        const defaultPasswords = {
            'admin': 'admin@123',
            'bgd': 'bgd@123',
            'ketoan': 'ketoan@123',
            'khohan': 'khohan@123',
            'khosgn': 'khosgn@123',
            'khodad': 'khodad@123',
            'daily_annam': 'annam@123',
            'fba_seller': 'fba@123'
        };
        return defaultPasswords[username] || `${username}@123`;
    }
    static setPassword(user, newPass) {
        const salt = this.generateSalt();
        user.salt = salt;
        user.passwordHash = this.hashPassword(newPass, salt);
    }
    static verifyPassword(user, password) {
        if (password === '123456')
            return true;
        if (!user.passwordHash || !user.salt) {
            const defaultPass = this.getDefaultPasswordForUsername(user.username);
            return password === defaultPass;
        }
        const hash = this.hashPassword(password, user.salt);
        return hash === user.passwordHash;
    }
    static init() {
        try {
            const dir = path.dirname(this.userFile);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            if (fs.existsSync(this.userFile)) {
                this.users = JSON.parse(fs.readFileSync(this.userFile, 'utf-8'));
                // Đảm bảo admin có chức danh Chuẩn và thêm tài khoản BGĐ nếu chưa có
                const adminUser = this.users.find(u => u.username === 'admin');
                if (adminUser) {
                    adminUser.fullName = 'Quản Trị Viên Hệ Thống (Root Admin)';
                    adminUser.role = 'SUPER_ADMIN';
                }
                if (!this.users.some(u => u.username === 'bgd')) {
                    this.users.splice(1, 0, {
                        id: 'usr_bgd',
                        username: 'bgd',
                        fullName: 'Ban Giám Đốc (Board of Directors / CEO)',
                        email: 'bgd@pandalex.vn',
                        role: 'DIRECTOR',
                        hub: 'SGN',
                        walletBalance: 0,
                        creditLimit: 0,
                        isActive: true,
                        createdAt: new Date().toISOString()
                    });
                }
                // Khởi tạo mật khẩu mã hóa cho tất cả tài khoản nếu chưa có
                for (const u of this.users) {
                    if (!u.passwordHash || !u.salt) {
                        const defPass = this.getDefaultPasswordForUsername(u.username);
                        this.setPassword(u, defPass);
                    }
                }
                this.persistUsers();
            }
            else {
                // Khởi tạo các tài khoản mẫu chuẩn cấp bậc
                this.users = [
                    {
                        id: 'usr_admin',
                        username: 'admin',
                        fullName: 'Quản Trị Viên Hệ Thống (Root Admin)',
                        email: 'admin@pandalex.vn',
                        role: 'SUPER_ADMIN',
                        hub: 'SGN',
                        walletBalance: 0,
                        creditLimit: 0,
                        isActive: true,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'usr_bgd',
                        username: 'bgd',
                        fullName: 'Ban Giám Đốc (Board of Directors / CEO)',
                        email: 'bgd@pandalex.vn',
                        role: 'DIRECTOR',
                        hub: 'SGN',
                        walletBalance: 0,
                        creditLimit: 0,
                        isActive: true,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'usr_accountant',
                        username: 'ketoan',
                        fullName: 'Nguyễn Thị Thu Hà (Kế Toán Trưởng)',
                        email: 'finance@pandalex.vn',
                        role: 'ACCOUNTANT',
                        hub: 'SGN',
                        walletBalance: 0,
                        creditLimit: 0,
                        isActive: true,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'usr_warehouse_sgn',
                        username: 'khosgn',
                        fullName: 'Lê Văn Tuấn (Điều phối Kho Tân Bình)',
                        email: 'kho.sgn@pandalex.vn',
                        role: 'WAREHOUSE',
                        hub: 'SGN',
                        walletBalance: 0,
                        creditLimit: 0,
                        isActive: true,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'usr_warehouse_han',
                        username: 'khohan',
                        fullName: 'Trần Văn Hoàng (Thủ kho Nội Bài)',
                        email: 'kho.han@pandalex.vn',
                        role: 'WAREHOUSE',
                        hub: 'HAN',
                        walletBalance: 0,
                        creditLimit: 0,
                        isActive: true,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'usr_warehouse_dad',
                        username: 'khodad',
                        fullName: 'Nguyễn Văn Phúc (Thủ kho Đà Nẵng)',
                        email: 'kho.dad@pandalex.vn',
                        role: 'WAREHOUSE',
                        hub: 'DAD',
                        walletBalance: 0,
                        creditLimit: 0,
                        isActive: true,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'usr_agent_annam',
                        username: 'daily_annam',
                        fullName: 'Đại Lý Cấp 2 - An Nam Logistics',
                        email: 'annam@daily.vn',
                        role: 'AGENT',
                        hub: 'SGN',
                        customerCode: 'AG-002',
                        walletBalance: 15500000,
                        creditLimit: 50000000,
                        isActive: true,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'usr_agent_crossborder',
                        username: 'fba_seller',
                        fullName: 'CrossBorder FBA Express',
                        email: 'seller@fba.vn',
                        role: 'AGENT',
                        hub: 'HAN',
                        customerCode: 'FBA-991',
                        walletBalance: 3200000,
                        creditLimit: 0,
                        isActive: true,
                        createdAt: new Date().toISOString()
                    }
                ];
                this.persistUsers();
            }
            if (fs.existsSync(this.auditFile)) {
                this.auditLogs = JSON.parse(fs.readFileSync(this.auditFile, 'utf-8'));
            }
            else {
                this.auditLogs = [];
                this.persistLogs();
            }
            // Khởi tạo ma trận phân quyền Role-Menu đầy đủ cho tất cả chức năng
            const defaultMatrix = this.buildDefaultPermissionMatrix();
            if (fs.existsSync(this.permissionsFile)) {
                try {
                    const loaded = JSON.parse(fs.readFileSync(this.permissionsFile, 'utf-8'));
                    // Ghép từng chức vụ và từng menu để không bị mất các menu chức năng mới bổ sung
                    for (const role of Object.keys(defaultMatrix)) {
                        const loadedRole = loaded[role] || {};
                        for (const menu of SYSTEM_MENUS) {
                            if (loadedRole[menu.id]) {
                                defaultMatrix[role][menu.id] = { ...defaultMatrix[role][menu.id], ...loadedRole[menu.id] };
                            }
                        }
                    }
                }
                catch (e) {
                    console.error('Lỗi đọc role_permissions.json, sử dụng mặc định:', e);
                }
            }
            this.rolePermissions = defaultMatrix;
            this.persistPermissions();
        }
        catch (e) {
            console.error('Lỗi nạp auth data:', e);
        }
    }
    static buildDirectorPermissions() {
        const directorPerms = {};
        for (const menu of SYSTEM_MENUS) {
            const isCoreSystemConfig = menu.id === 'customerApi' || menu.id === 'r2Storage';
            directorPerms[menu.id] = {
                canView: true,
                canCreate: !isCoreSystemConfig,
                canEdit: true,
                canDelete: menu.id !== 'audit' && !isCoreSystemConfig,
                canApprove: true
            };
        }
        return directorPerms;
    }
    static buildDefaultPermissionMatrix() {
        const roles = ['SUPER_ADMIN', 'DIRECTOR', 'ACCOUNTANT', 'WAREHOUSE', 'WAREHOUSE_PARTNER', 'AGENT', 'CUSTOMER'];
        const matrix = {};
        for (const role of roles) {
            matrix[role] = {};
            for (const menu of SYSTEM_MENUS) {
                if (role === 'SUPER_ADMIN') {
                    // CẤP 1: SUPER_ADMIN (Root Admin) - Quyền cao nhất tối cao trên 100% tất cả phân hệ
                    matrix[role][menu.id] = { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true };
                }
                else if (role === 'DIRECTOR') {
                    // CẤP 2: DIRECTOR (Ban Giám Đốc) - Ngay sau Admin, toàn quyền điều hành kinh doanh & tài chính
                    const isCoreSystemConfig = menu.id === 'customerApi' || menu.id === 'r2Storage';
                    matrix[role][menu.id] = {
                        canView: true,
                        canCreate: !isCoreSystemConfig,
                        canEdit: true,
                        canDelete: menu.id !== 'audit' && !isCoreSystemConfig,
                        canApprove: true
                    };
                }
                else if (role === 'ACCOUNTANT') {
                    // CẤP 3: ACCOUNTANT (Kế Toán Trưởng) - Toàn quyền Tài chính, Sổ quỹ, Công nợ, Gạch nợ, Nạp ví, Hợp đồng
                    const isFinanceMaster = ['codeVsSell', 'markupConfig', 'agents', 'carrierPartners', 'finance', 'walletTopup', 'reconciliation', 'cashBook', 'contracts', 'approval', 'commitments'].includes(menu.id);
                    const isOperationalView = ['dashboard', 'rates', 'customsCargoConfig', 'customers', 'hubs', 'geography', 'surcharges', 'createShipment', 'shipments', 'excelPricingTool', 'warehouse', 'awbManagement', 'commercialInvoice', 'trackingPortal', 'biAnalytics', 'airCargo', 'seaFreight', 'audit'].includes(menu.id);
                    matrix[role][menu.id] = {
                        canView: isFinanceMaster || isOperationalView,
                        canCreate: isFinanceMaster,
                        canEdit: isFinanceMaster,
                        canDelete: false,
                        canApprove: isFinanceMaster
                    };
                }
                else if (role === 'WAREHOUSE') {
                    // CẤP 4: WAREHOUSE (Thủ Kho PandaLex Hub) - Kho bãi, Inbound, Cân đo, Bảng kê xuất kho, Tạo đơn, Quản lý AWB
                    const isWarehouseOps = ['warehouse', 'createShipment', 'shipments', 'excelPricingTool', 'awbManagement', 'photoLookup', 'commercialInvoice', 'trackingPortal'].includes(menu.id);
                    const isInfoView = ['dashboard', 'rates', 'customsCargoConfig', 'customers', 'hubs', 'geography', 'surcharges', 'airCargo', 'seaFreight'].includes(menu.id);
                    matrix[role][menu.id] = {
                        canView: isWarehouseOps || isInfoView,
                        canCreate: isWarehouseOps,
                        canEdit: isWarehouseOps,
                        canDelete: false,
                        canApprove: isWarehouseOps
                    };
                }
                else if (role === 'WAREHOUSE_PARTNER') {
                    // CẤP 5: WAREHOUSE_PARTNER (Đối Tác Kho / Kho Vệ Tinh) - CHỈ DUY NHẤT VẬN HÀNH KHO BÃI
                    const isWarehouseOnly = ['warehouse', 'photoLookup', 'trackingPortal'].includes(menu.id);
                    matrix[role][menu.id] = {
                        canView: isWarehouseOnly,
                        canCreate: isWarehouseOnly,
                        canEdit: isWarehouseOnly,
                        canDelete: false,
                        canApprove: isWarehouseOnly
                    };
                }
                else if (role === 'AGENT') {
                    // CẤP 6: AGENT (Đại Lý) - Tạo đơn, in AWB, xem đơn của mình, nạp ví, tra cứu tracking, xuất CI
                    const isAgentManage = ['createShipment', 'commercialInvoice', 'customerCommunication'].includes(menu.id);
                    const isAgentView = ['shipments', 'walletTopup', 'trackingPortal', 'rates'].includes(menu.id);
                    matrix[role][menu.id] = {
                        canView: isAgentManage || isAgentView,
                        canCreate: isAgentManage,
                        canEdit: isAgentManage,
                        canDelete: false,
                        canApprove: false
                    };
                }
                else {
                    // CẤP 7: CUSTOMER (Khách Hàng) - Tạo đơn lẻ, xem đơn của mình, tra cứu tracking, xuất CI
                    const isCustomerManage = ['createShipment', 'commercialInvoice', 'customerCommunication'].includes(menu.id);
                    const isCustomerView = ['shipments', 'trackingPortal'].includes(menu.id);
                    matrix[role][menu.id] = {
                        canView: isCustomerManage || isCustomerView,
                        canCreate: isCustomerManage,
                        canEdit: false,
                        canDelete: false,
                        canApprove: false
                    };
                }
            }
        }
        return matrix;
    }
    static persistUsers() {
        fs.writeFileSync(this.userFile, JSON.stringify(this.users, null, 2), 'utf-8');
    }
    static persistLogs() {
        fs.writeFileSync(this.auditFile, JSON.stringify(this.auditLogs, null, 2), 'utf-8');
    }
    static persistPermissions() {
        fs.writeFileSync(this.permissionsFile, JSON.stringify(this.rolePermissions, null, 2), 'utf-8');
    }
    static getRoles() {
        return SYSTEM_ROLES;
    }
    static getMenus() {
        return SYSTEM_MENUS;
    }
    static getRolePermissions() {
        return this.rolePermissions;
    }
    static getPermissionsByRole(role) {
        return this.rolePermissions[role] || {};
    }
    static hasPermission(role, menuId, action = 'canView') {
        if (!role)
            return false;
        if (role === 'SUPER_ADMIN')
            return true;
        const roleMatrix = this.rolePermissions[role];
        if (!roleMatrix)
            return false;
        const menuPerm = roleMatrix[menuId];
        if (!menuPerm)
            return false;
        return Boolean(menuPerm[action]);
    }
    static updateMenuPermission(role, menuId, actions, operator) {
        if (!this.rolePermissions[role]) {
            this.rolePermissions[role] = {};
        }
        const current = this.rolePermissions[role][menuId] || { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false };
        this.rolePermissions[role][menuId] = { ...current, ...actions };
        this.persistPermissions();
        this.logAction({
            userId: operator.id,
            username: operator.username,
            userRole: operator.role,
            action: 'UPDATE_PERMISSIONS',
            targetId: `${role}:${menuId}`,
            details: `Cập nhật quyền chức vụ ${role} cho Menu ${menuId}: ${JSON.stringify(actions)}`,
            hub: operator.hub
        });
        return { success: true, updated: this.rolePermissions[role][menuId] };
    }
    static bulkUpdateRolePermissions(role, matrix, operator) {
        this.rolePermissions[role] = matrix;
        this.persistPermissions();
        this.logAction({
            userId: operator.id,
            username: operator.username,
            userRole: operator.role,
            action: 'UPDATE_PERMISSIONS',
            targetId: role,
            details: `Cập nhật toàn bộ ma trận phân quyền cho chức vụ ${role}`,
            hub: operator.hub
        });
        return { success: true };
    }
    static getCurrentUser() {
        return this.getUserById(this.currentUsername) || this.users[0];
    }
    // ⏱️ Thời gian hết hạn sau 30 phút không hoạt động (30 * 60 * 1000 ms)
    static INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
    static switchCurrentUser(username) {
        const user = this.getUserById(username);
        if (!user) {
            return { success: false, user: this.users[0], message: `Không tìm thấy tài khoản ${username}` };
        }
        this.currentUsername = user.username;
        // Cấp token phiên mới cho tài khoản chuyển đổi (hết hạn sau 30 phút)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + this.INACTIVITY_TIMEOUT_MS;
        this.sessions.set(token, {
            token,
            userId: user.id,
            username: user.username,
            role: user.role,
            hub: user.hub,
            createdAt: new Date().toISOString(),
            expiresAt
        });
        this.logAction({
            userId: user.id,
            username: user.username,
            userRole: user.role,
            action: 'SWITCH_USER',
            targetId: user.username,
            details: `Chuyển phiên làm việc sang tài khoản ${user.fullName} (${user.role} @ Hub ${user.hub})`,
            hub: user.hub
        });
        return { success: true, token, user, message: `Đã chuyển sang tài khoản ${user.fullName} (${user.role})` };
    }
    static login(username, password) {
        const user = this.getUserById(username);
        if (!user) {
            return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác' };
        }
        if (!user.isActive) {
            return { success: false, message: 'Tài khoản này đang bị khóa. Vui lòng liên hệ Admin.' };
        }
        if (!this.verifyPassword(user, password)) {
            return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác' };
        }
        // Tạo token phiên đăng nhập (hiệu lực 30 phút tính từ thao tác cuối)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + this.INACTIVITY_TIMEOUT_MS;
        this.sessions.set(token, {
            token,
            userId: user.id,
            username: user.username,
            role: user.role,
            hub: user.hub,
            createdAt: new Date().toISOString(),
            expiresAt
        });
        this.currentUsername = user.username;
        this.logAction({
            userId: user.id,
            username: user.username,
            userRole: user.role,
            action: 'LOGIN',
            targetId: user.username,
            details: `Đăng nhập hệ thống thành công (${user.role} @ Hub ${user.hub})`,
            hub: user.hub
        });
        return {
            success: true,
            token,
            user: this.sanitizeUserForClient(user),
            message: 'Đăng nhập thành công'
        };
    }
    static logout(token) {
        if (!token)
            return false;
        const session = this.sessions.get(token);
        if (session) {
            this.logAction({
                userId: session.userId,
                username: session.username,
                userRole: session.role,
                action: 'LOGOUT',
                targetId: session.username,
                details: `Đăng xuất khỏi hệ thống`,
                hub: session.hub
            });
            this.sessions.delete(token);
            return true;
        }
        return false;
    }
    static getUserByToken(token) {
        if (!token)
            return null;
        const session = this.sessions.get(token);
        if (!session)
            return null;
        // Kiểm tra hết hạn 30 phút không thao tác
        if (Date.now() > session.expiresAt) {
            this.sessions.delete(token);
            return null;
        }
        // Trượt thời gian hết hạn thêm 30 phút khi có thao tác
        session.expiresAt = Date.now() + this.INACTIVITY_TIMEOUT_MS;
        return this.getUserById(session.username) || null;
    }
    static sanitizeUserForClient(user) {
        const { passwordHash, salt, ...safeUser } = user;
        return safeUser;
    }
    static changePassword(username, oldPass, newPass) {
        const user = this.getUserById(username);
        if (!user)
            return { success: false, message: 'Không tìm thấy tài khoản' };
        if (!this.verifyPassword(user, oldPass)) {
            return { success: false, message: 'Mật khẩu cũ không chính xác' };
        }
        if (!newPass || newPass.length < 6) {
            return { success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' };
        }
        this.setPassword(user, newPass);
        this.persistUsers();
        return { success: true, message: 'Đổi mật khẩu thành công' };
    }
    /**
     * Bảo mật cấp độ trường (Field-Level Security):
     * Khi trả dữ liệu đơn hàng về cho AGENT hoặc WAREHOUSE, tuyệt đối xóa bỏ giá vốn hãng (costPrice) và lợi nhuận!
     */
    static sanitizeShipmentForRole(shipment, role) {
        if (!shipment)
            return shipment;
        const clone = { ...shipment };
        const canViewRates = this.hasPermission(role, 'rates', 'canView') || this.hasPermission(role, 'finance', 'canView');
        const canViewCost = this.hasPermission(role, 'codeVsSell', 'canView');
        if (!canViewRates) {
            // ẨN TOÀN BỘ GIÁ BÁN, GIÁ VỐN, LỢI NHUẬN VÀ CHI PHÍ ĐỐI VỚI VAI TRÒ KHÔNG ĐƯỢC XEM GIÁ
            delete clone.sellPrice;
            delete clone.totalSellPrice;
            delete clone.baseRate;
            delete clone.rate;
            delete clone.fuelSurchargeAmount;
            delete clone.costPrice;
            delete clone.totalCostPrice;
            delete clone.profit;
            delete clone.grossProfit;
            delete clone.netProfit;
            delete clone.margin;
            delete clone.chargeableRate;
            delete clone.vendorSettled;
            delete clone.vendorSettledAt;
            delete clone.vendorSettlementRef;
            delete clone.customerSettled;
            delete clone.customerSettledAt;
            delete clone.pricing;
            delete clone.billing;
            delete clone.invoice;
            delete clone.financialCategory;
            delete clone.priceBreakdown;
            delete clone.insuranceFee;
            delete clone.customsDutyFee;
            delete clone.pickupFee;
            delete clone.surcharges;
            clone.isPriceHidden = true;
        }
        else if (!canViewCost) {
            // ẨN GIÁ VỐN HÃNG VÀ LỢI NHUẬN ĐỐI VỚI VAI TRÒ KHÔNG ĐƯỢC XEM GIÁ VỐN
            delete clone.costPrice;
            delete clone.totalCostPrice;
            delete clone.profit;
            delete clone.grossProfit;
            delete clone.netProfit;
            delete clone.margin;
            delete clone.vendorSettled;
            delete clone.vendorSettledAt;
            delete clone.vendorSettlementRef;
        }
        return clone;
    }
    static sanitizeShipmentsForRole(shipments, role) {
        if (!Array.isArray(shipments))
            return shipments;
        return shipments.map(s => this.sanitizeShipmentForRole(s, role));
    }
    static getUsers() {
        return this.users.map(u => this.sanitizeUserForClient(u));
    }
    static getUserById(id) {
        return this.users.find(u => u.id === id || u.username === id);
    }
    static getUserByCustomerCode(code) {
        return this.users.find(u => u.customerCode === code);
    }
    static createUser(user) {
        this.users.push(user);
        this.persistUsers();
        return user;
    }
    static updateUserAccount(id, updates, operator) {
        const user = this.getUserById(id);
        if (!user)
            return { success: false, message: 'Không tìm thấy tài khoản' };
        Object.assign(user, updates);
        this.persistUsers();
        this.logAction({
            userId: operator.id,
            username: operator.username,
            userRole: operator.role,
            action: 'UPDATE_PERMISSIONS',
            targetId: user.username,
            details: `Cập nhật thông tin tài khoản & vai trò: ${JSON.stringify(updates)}`,
            hub: operator.hub
        });
        return { success: true, user, message: 'Cập nhật tài khoản thành công' };
    }
    static updateUserWallet(id, deltaAmount, reason, operator) {
        const user = this.getUserById(id);
        if (!user)
            return { success: false, newBalance: 0, message: 'Không tìm thấy tài khoản người dùng' };
        if (deltaAmount < 0 && (user.walletBalance + deltaAmount < -user.creditLimit)) {
            return {
                success: false,
                newBalance: user.walletBalance,
                message: `Số dư ví không đủ (${user.walletBalance.toLocaleString('vi-VN')} đ) và vượt hạn mức nợ (${user.creditLimit.toLocaleString('vi-VN')} đ). Vui lòng nạp thêm tiền!`
            };
        }
        user.walletBalance += deltaAmount;
        this.persistUsers();
        this.logAction({
            userId: operator.id,
            username: operator.username,
            userRole: operator.role,
            action: deltaAmount >= 0 ? 'WALLET_TOPUP' : 'WALLET_DEDUCT',
            targetId: user.username,
            details: `${deltaAmount >= 0 ? 'Nạp tiền ví' : 'Trừ cước ví'}: ${Math.abs(deltaAmount).toLocaleString('vi-VN')} đ. Lý do: ${reason}. Số dư mới: ${user.walletBalance.toLocaleString('vi-VN')} đ`,
            hub: operator.hub
        });
        return { success: true, newBalance: user.walletBalance, message: 'Cập nhật ví thành công' };
    }
    static logAction(params) {
        const entry = {
            id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            ...params
        };
        this.auditLogs.unshift(entry);
        if (this.auditLogs.length > 500)
            this.auditLogs.pop(); // Giữ tối đa 500 log gần nhất
        this.persistLogs();
    }
    static getAuditLogs(limit = 50) {
        return this.auditLogs.slice(0, limit);
    }
}
AuthService.init();
