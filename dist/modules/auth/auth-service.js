import fs from 'fs';
import path from 'path';
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
        code: 'AGENT',
        positionCode: 'DLY',
        name: 'Đại Lý Vận Chuyển Cấp 2',
        description: 'Tạo đơn AWB, in nhãn, in Commercial Invoice, nạp ví trả trước và quản lý đơn hàng của riêng đại lý',
        isSystemRole: true,
        status: 1,
        hierarchyLevel: 5
    },
    {
        code: 'CUSTOMER',
        positionCode: 'KHLE',
        name: 'Khách Hàng Gửi Hàng (End Customer)',
        description: 'Tạo đơn lẻ, tra cứu vận trình kiện hàng theo mã tracking, thanh toán cước trực tiếp',
        isSystemRole: true,
        status: 1,
        hierarchyLevel: 6
    }
];
export const SYSTEM_MENUS = [
    // Nhóm 1: Cấu hình
    { id: 'rates', name: '1.1 Bảng Giá & Biểu Cước Hãng', group: '1. Cấu Hình & Biểu Cước', description: 'Quản lý bảng cước UPS/FedEx và cấu trúc vùng tính cước' },
    { id: 'customers', name: '1.2 Khách Hàng (Master Data)', group: '1. Cấu Hình & Biểu Cước', description: 'Danh bạ đối tác khách hàng và phân loại tài khoản' },
    { id: 'hubs', name: '1.3 Văn Phòng / Chi Nhánh / Hub', group: '1. Cấu Hình & Biểu Cước', description: 'Quản lý các Hub kho SGN, HAN, DAD' },
    { id: 'geography', name: '1.4 Vị Trí Địa Lý & Vùng Phủ Sóng', group: '1. Cấu Hình & Biểu Cước', description: 'Cấu hình quốc gia, mã bưu chính và phân vùng hãng' },
    { id: 'surcharges', name: '1.5 Phụ Phí Xăng (FSC) & Vùng Xa', group: '1. Cấu Hình & Biểu Cước', description: 'Tỷ lệ phụ phí nhiên liệu hàng tuần và cước vùng sâu vùng xa' },
    { id: 'audit', name: '1.6 Phân Quyền & Audit Logs', group: '1. Cấu Hình & Biểu Cước', description: 'Phân quyền chức vụ theo menu (PermissionPage) và vết thao tác' },
    // Nhóm 2: Vận hành
    { id: 'shipments', name: '2.1 Tạo Đơn Hàng & In Tem AWB', group: '2. Vận Hành Kho & Vận Đơn', description: 'Tạo đơn mới, sinh nhãn barcode AWB chuẩn nhiệt 4x6' },
    { id: 'warehouse', name: '2.2 Kho Bãi & Scan Inbound / Bao', group: '2. Vận Hành Kho & Vận Đơn', description: 'Trạm nhập kho AI OCR, cân đo lại, gom bao và bảng kê xuất kho' },
    { id: 'awbManagement', name: '2.4 Quản Lý Vận Đơn AWB', group: '2. Vận Hành Kho & Vận Đơn', description: 'Tra cứu, lọc trạng thái vận hành và quản lý AWB' },
    // Nhóm 3: Tài chính
    { id: 'codeVsSell', name: '3.1 Quản Lý Giá Code (Cost Hãng)', group: '3. Tài Chính & Đối Soát', description: 'Quản lý giá vốn mua từ Hãng - TỐI MẬT' },
    { id: 'markupConfig', name: '3.2 Quản Lý Giá Bán & Gup Giá', group: '3. Tài Chính & Đối Soát', description: 'Chính sách tỷ lệ lãi gộp và cộng giá bán' },
    { id: 'agents', name: '3.3 Quản Lý Đại Lý & Chiết Khấu', group: '3. Tài Chính & Đối Soát', description: 'Bảng giá riêng và chiết khấu cho từng đại lý cấp 2' },
    { id: 'carrierPartners', name: '3.4 Quản Lý Đối Tác Hãng Cước', group: '3. Tài Chính & Đối Soát', description: 'Thông tin hợp đồng đại lý cấp 1 với UPS, FedEx, DHL' },
    { id: 'finance', name: '3.5 Công Nợ, Thu Cước & Đối Soát', group: '3. Tài Chính & Đối Soát', description: 'Kiểm soát 3 điều kiện thanh toán mở khóa xuất kho' },
    { id: 'walletTopup', name: '3.6 Quản Lý Ví & Nạp Ký Quỹ', group: '3. Tài Chính & Đối Soát', description: 'Cộng/trừ số dư ví trả trước và hạn mức nợ' },
    { id: 'reconciliation', name: '3.7 Đối Soát & Gạch Nợ (NCC & Đại Lý)', group: '3. Tài Chính & Đối Soát', description: 'Gạch nợ chi phí mua hãng và quyết toán công nợ đại lý' },
    // Nhóm 4: CRM
    { id: 'contracts', name: '4.1 Quản Lý Khách Hàng Hợp Đồng', group: '4. CRM & Hợp Đồng', description: 'Theo dõi hợp đồng pháp lý và hạn ngạch công nợ' },
    { id: 'approval', name: '4.2 Phê Duyệt Tài Khoản & Tín Dụng', group: '4. CRM & Hợp Đồng', description: 'Xét duyệt hạn mức nợ trả sau cho khách hàng mới' },
    { id: 'commitments', name: '4.3 Cam Kết Sản Lượng & Khách VIP', group: '4. CRM & Hợp Đồng', description: 'Chính sách thưởng doanh số theo sản lượng tháng' },
    { id: 'customerCommunication', name: '4.4 Trung Tâm Giao Tiếp CSKH & Khách Hàng', group: '4. CRM & Hợp Đồng', description: 'Tiếp nhận yêu cầu lấy hàng, khiếu nại và chat hỗ trợ 24/7' },
    // Nhóm 5: Mở rộng
    { id: 'customerApi', name: '5.1 Quản Lý Kết Nối API Khách Hàng', group: '5. Mở Rộng (Dự Phòng)', description: 'Cấp API Key cho đối tác tích hợp phần mềm bán hàng' },
    { id: 'airCargo', name: '5.4 Air Cargo & Vận Tải Quốc Tế', group: '5. Mở Rộng (Dự Phòng)', description: 'Linehaul hàng không MAWB / HAWB kiện lớn' },
    { id: 'seaFreight', name: '5.5 Vận Tải Đường Biển (Sea Freight)', group: '5. Mở Rộng (Dự Phòng)', description: 'Container FCL và hàng gom LCL' }
];
export class AuthService {
    static userFile = path.join(process.cwd(), 'data', 'users.json');
    static auditFile = path.join(process.cwd(), 'data', 'audit_logs.json');
    static permissionsFile = path.join(process.cwd(), 'data', 'role_permissions.json');
    static users = [];
    static auditLogs = [];
    static rolePermissions = {};
    static currentUsername = 'admin';
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
            // Khởi tạo ma trận phân quyền Role-Menu
            this.rolePermissions = this.buildDefaultPermissionMatrix();
            if (fs.existsSync(this.permissionsFile)) {
                const loaded = JSON.parse(fs.readFileSync(this.permissionsFile, 'utf-8'));
                this.rolePermissions = { ...this.rolePermissions, ...loaded };
                // Đảm bảo SUPER_ADMIN và DIRECTOR luôn đầy đủ cấu hình
                if (!this.rolePermissions['DIRECTOR']) {
                    this.rolePermissions['DIRECTOR'] = this.buildDirectorPermissions();
                }
            }
            this.persistPermissions();
        }
        catch (e) {
            console.error('Lỗi nạp auth data:', e);
        }
    }
    static buildDirectorPermissions() {
        const directorPerms = {};
        for (const menu of SYSTEM_MENUS) {
            const isCoreSystemConfig = menu.id === 'customerApi';
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
        const roles = ['SUPER_ADMIN', 'DIRECTOR', 'ACCOUNTANT', 'WAREHOUSE', 'AGENT', 'CUSTOMER'];
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
                    const isCoreSystemConfig = menu.id === 'customerApi';
                    matrix[role][menu.id] = {
                        canView: true,
                        canCreate: !isCoreSystemConfig,
                        canEdit: true,
                        canDelete: menu.id !== 'audit' && !isCoreSystemConfig,
                        canApprove: true
                    };
                }
                else if (role === 'ACCOUNTANT') {
                    // CẤP 3: ACCOUNTANT (Kế Toán Trưởng) - Tài chính, công nợ, gạch nợ, nạp ví, hợp đồng
                    const isFinanceOrCrm = ['codeVsSell', 'markupConfig', 'agents', 'carrierPartners', 'finance', 'walletTopup', 'reconciliation', 'contracts', 'approval', 'commitments', 'audit'].includes(menu.id);
                    const isOperationalView = ['rates', 'customers', 'hubs', 'shipments', 'warehouse', 'awbManagement', 'airCargo', 'seaFreight'].includes(menu.id);
                    matrix[role][menu.id] = {
                        canView: isFinanceOrCrm || isOperationalView,
                        canCreate: isFinanceOrCrm,
                        canEdit: isFinanceOrCrm,
                        canDelete: false,
                        canApprove: isFinanceOrCrm
                    };
                }
                else if (role === 'WAREHOUSE') {
                    // CẤP 4: WAREHOUSE (Thủ Kho) - Kho bãi, Inbound, Cân đo, Bảng kê xuất kho
                    const isWarehouseOps = ['warehouse', 'shipments', 'awbManagement'].includes(menu.id);
                    const isInfoView = ['rates', 'customers', 'hubs', 'geography', 'surcharges', 'airCargo', 'seaFreight'].includes(menu.id);
                    matrix[role][menu.id] = {
                        canView: isWarehouseOps || isInfoView,
                        canCreate: isWarehouseOps,
                        canEdit: isWarehouseOps,
                        canDelete: false,
                        canApprove: isWarehouseOps
                    };
                }
                else if (role === 'AGENT') {
                    // CẤP 5: AGENT (Đại Lý) - Chỉ tạo đơn, in AWB, xem đơn của mình, xem ví
                    const isAgentAllowed = ['shipments', 'awbManagement', 'walletTopup'].includes(menu.id);
                    matrix[role][menu.id] = {
                        canView: isAgentAllowed,
                        canCreate: menu.id === 'shipments',
                        canEdit: false,
                        canDelete: false,
                        canApprove: false
                    };
                }
                else {
                    // CẤP 6: CUSTOMER (Khách Hàng) - Chỉ tạo đơn và xem tracking
                    const isCustomerAllowed = ['shipments', 'awbManagement'].includes(menu.id);
                    matrix[role][menu.id] = {
                        canView: isCustomerAllowed,
                        canCreate: menu.id === 'shipments',
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
    static switchCurrentUser(username) {
        const user = this.getUserById(username);
        if (!user) {
            return { success: false, user: this.users[0], message: `Không tìm thấy tài khoản ${username}` };
        }
        this.currentUsername = user.username;
        this.logAction({
            userId: user.id,
            username: user.username,
            userRole: user.role,
            action: 'SWITCH_USER',
            targetId: user.username,
            details: `Chuyển phiên làm việc sang tài khoản ${user.fullName} (${user.role} @ Hub ${user.hub})`,
            hub: user.hub
        });
        return { success: true, user, message: `Đã chuyển sang tài khoản ${user.fullName} (${user.role})` };
    }
    /**
     * Bảo mật cấp độ trường (Field-Level Security):
     * Khi trả dữ liệu đơn hàng về cho AGENT hoặc WAREHOUSE, tuyệt đối xóa bỏ giá vốn hãng (costPrice) và lợi nhuận!
     */
    static sanitizeShipmentForRole(shipment, role) {
        if (!shipment)
            return shipment;
        const clone = { ...shipment };
        if (role !== 'SUPER_ADMIN' && role !== 'DIRECTOR' && role !== 'ACCOUNTANT') {
            delete clone.costPrice;
            delete clone.totalCostPrice;
            delete clone.grossProfit;
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
        return this.users;
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
