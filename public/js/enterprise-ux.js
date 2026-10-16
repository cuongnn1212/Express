/**
 * ============================================================================
 * PANDALEX EXPRESS — ENTERPRISE UX, 4-LAYOUT ENGINE & COMMAND PALETTE v4.5
 * Cung cấp 4 Mẫu Giao Diện Điều Hành (chuyển đổi tức thì 0.01s):
 *   - Mẫu 1 (sidebar-erp)    : Sidebar Trái Chuẩn ERP Quốc Tế (Odoo / SAP / MISA)
 *   - Mẫu 2 (workspace-tabs) : Bàn Làm Việc Chia Tab 2 Tầng (Shopee / ViettelPost)
 *   - Mẫu 3 (launchpad-dock) : Lưới App Trung Tâm & Thanh Dock Nổi (macOS / iPadOS)
 *   - Mẫu 4 (classic-topbar) : Thanh Ngang Top-Bar Xổ Xuống Cổ Điển
 * ============================================================================
 */

(function () {
  'use strict';

  // Cấu trúc 5 Phân Nhóm Nghiệp Vụ Chuẩn Logistics dùng chung cho cả 4 Mẫu Giao Diện
  const DEPARTMENT_GROUPS = [
    {
      id: 'ops',
      shortTitle: '1. Vận Đơn & Tính Giá',
      fullTitle: '📦 1. Vận Đơn & Khai Thác',
      icon: 'fa-box-open',
      color: 'amber',
      badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      items: [
        { sec: 'createShipment', label: '1.1 Tạo Đơn & In Tem AWB', icon: 'fa-file-circle-plus text-emerald-400', hot: true },
        { sec: 'shipments', label: '1.2 Danh Sách Đơn Hàng', icon: 'fa-boxes-stacked text-amber-400', hot: true },
        { sec: 'excelPricingTool', label: '1.3 ⚡ Up Excel Tính Giá (AWB+Kg)', icon: 'fa-file-excel text-emerald-400', highlight: true, hot: true },
        { sec: 'awbManagement', label: '1.4 Quản Lý Kho Số AWB', icon: 'fa-barcode text-rose-400' },
        { url: '/invoice.html', label: '1.5 Xuất Commercial Invoice ↗', icon: 'fa-file-invoice text-indigo-400' },
        { url: '/calculator.html', label: '1.6 Cổng Báo Giá Nhanh ↗', icon: 'fa-calculator text-sky-400' }
      ]
    },
    {
      id: 'warehouse',
      shortTitle: '2. Kho Bãi & Ảnh AWB',
      fullTitle: '🏭 2. Kho Bãi & Điều Phối',
      icon: 'fa-warehouse',
      color: 'blue',
      badgeBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      items: [
        { sec: 'warehouse', label: '2.1 Kho Inbound, Đóng Bao & Xuất Hãng', icon: 'fa-warehouse text-blue-400', hot: true },
        { fn: 'openPhotoLookupModal', label: '2.2 📷 Tra Cứu Ảnh Chụp AWB', icon: 'fa-camera text-teal-400', highlight: true, hot: true },
        { url: '/inbound-mobile.html', label: '2.3 📱 App Camera Quét Kho Di Động ↗', icon: 'fa-mobile-screen-button text-emerald-400' },
        { sec: 'airCargo', label: '2.4 Air Cargo & Vận Tải Quốc Tế', icon: 'fa-plane-departure text-sky-400' }
      ]
    },
    {
      id: 'finance',
      shortTitle: '3. Tài Chính & Sổ Quỹ',
      fullTitle: '💰 3. Tài Chính & Sổ Quỹ',
      icon: 'fa-wallet',
      color: 'emerald',
      badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      items: [
        { sec: 'cashBook', label: '3.1 ⭐ Sổ Quỹ Thu - Chi & Phiếu Thu/Chi', icon: 'fa-book-bookmark text-amber-400', highlight: true, hot: true },
        { sec: 'finance', label: '3.2 Công Nợ & Duyệt Xuất Kho', icon: 'fa-file-invoice-dollar text-emerald-400', hot: true },
        { sec: 'reconciliation', label: '3.3 Đối Soát Hai Chiều (AR vs AP)', icon: 'fa-receipt text-rose-400' },
        { sec: 'walletTopup', label: '3.4 Top-Up Ví Đại Lý', icon: 'fa-money-bill-transfer text-indigo-400' },
        { sec: 'carrierPartners', label: '3.5 NCC & Sổ Ký Quỹ Hãng', icon: 'fa-truck-plane text-teal-400' },
        { sec: 'codeVsSell', label: '3.6 So Sánh Giá Code vs Giá Bán', icon: 'fa-scale-balanced text-amber-400' },
        { sec: 'markupConfig', label: '3.7 Cài Đặt Gộp Giá (Markup)', icon: 'fa-arrow-trend-up text-emerald-400' }
      ]
    },
    {
      id: 'crm',
      shortTitle: '4. Khách Hàng & Đại Lý',
      fullTitle: '🤝 4. Khách Hàng & Đại Lý',
      icon: 'fa-users',
      color: 'sky',
      badgeBg: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      items: [
        { sec: 'customers', label: '4.1 Danh Sách Khách Hàng (Master)', icon: 'fa-address-book text-sky-400', hot: true },
        { sec: 'agents', label: '4.2 Quản Lý Đại Lý & Chiết Khấu', icon: 'fa-handshake-angle text-cyan-400' },
        { sec: 'contracts', label: '4.3 Khách Hàng Hợp Đồng', icon: 'fa-file-signature text-indigo-400' },
        { sec: 'approval', label: '4.4 Phê Duyệt Tín Dụng', icon: 'fa-user-check text-emerald-400' },
        { sec: 'commitments', label: '4.5 Cam Kết Sản Lượng VIP', icon: 'fa-award text-amber-400' },
        { sec: 'customerCommunication', label: '4.6 Trung Tâm Hỗ Trợ CSKH', icon: 'fa-headset text-rose-400' }
      ]
    },
    {
      id: 'settings',
      shortTitle: '5. Cấu Hình & Biểu Cước',
      fullTitle: '⚙️ 5. Cấu Hình & Phân Quyền',
      icon: 'fa-sliders',
      color: 'purple',
      badgeBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      items: [
        { sec: 'rateTables', label: '5.1 Bảng Giá Hãng (UPS / FedEx)', icon: 'fa-table-cells text-cyan-400', hot: true },
        { sec: 'surcharges', label: '5.2 Phụ Phí Xăng (FSC) & Vùng Xa', icon: 'fa-gas-pump text-rose-400' },
        { fn: 'openModalCustomsCargoConfig', label: '5.3 Biểu Phí Hải Quan & Hàng Khó', icon: 'fa-sliders text-amber-400' },
        { sec: 'geography', label: '5.4 Ma Trận Địa Lý & Zone', icon: 'fa-earth-americas text-emerald-400' },
        { sec: 'hubs', label: '5.5 Chi Nhánh / Hub (SGN-HAN-DAD)', icon: 'fa-building-columns text-amber-400' },
        { sec: 'audit', label: '5.6 Tài Khoản & Phân Quyền (RBAC)', icon: 'fa-shield-halved text-indigo-400' },
        { sec: 'biAnalytics', label: '5.7 Báo Cáo Lãi Lỗ BI Analytics', icon: 'fa-chart-line text-purple-400' },
        { sec: 'tracking', label: '5.8 Cấu Hình Tracking Đa Hãng', icon: 'fa-satellite-dish text-emerald-400' },
        { sec: 'customerApi', label: '5.9 Open API Gateway', icon: 'fa-code text-cyan-400' }
      ]
    }
  ];

  // Danh sách 4 Mẫu Giao Diện để người dùng lựa chọn trực quan
  const LAYOUT_TEMPLATES = [
    {
      id: 'sidebar-erp',
      badge: 'Mẫu 1 • Khuyên dùng',
      name: 'Sidebar Trái Chuẩn ERP Quốc Tế',
      styleRef: 'Phong cách Odoo / MISA AMIS / SAP',
      desc: 'Thanh menu dọc cố định bên trái (262px), bày sẵn toàn bộ các chức năng theo 5 phòng ban. Không cần rê chuột mở menu xổ xuống, chuyển mục chỉ 1 cú nhấp chuột.',
      icon: 'fa-table-columns text-sky-400'
    },
    {
      id: 'workspace-tabs',
      badge: 'Mẫu 2 • Rất trực quan',
      name: 'Bàn Làm Việc Chia Tab 2 Tầng',
      styleRef: 'Phong cách Shopee Seller / ViettelPost',
      desc: 'Tầng 1 là 6 Tab Phòng Ban lớn. Khi chọn 1 phòng ban, Tầng 2 hiện ngay dãy nút chức năng ngang cố định màu sáng ngay trước mắt — không có menu xổ xuống che bảng tính.',
      icon: 'fa-Window-maximize fa-layer-group text-amber-400'
    },
    {
      id: 'launchpad-dock',
      badge: 'Mẫu 3 • Hiện đại',
      name: 'Lưới App Trung Tâm & Thanh Dock Nổi',
      styleRef: 'Phong cách macOS / iPadOS Launchpad',
      desc: 'Không gian làm việc toàn màn hình siêu thoáng kèm Thanh Dock nổi ở đáy chứa 8 công cụ cốt lõi và Bàn Làm Việc Lưới 34 Ứng Dụng chia màu rõ ràng.',
      icon: 'fa-grip text-emerald-400'
    },
    {
      id: 'classic-topbar',
      badge: 'Mẫu 4 • Truyền thống',
      name: 'Thanh Ngang Top-Bar Xổ Xuống',
      styleRef: 'Phong cách Menu Ngang Cổ Điển',
      desc: 'Giữ nguyên thanh điều hướng ngang với các menu xổ xuống (dropdown) khi rê chuột vào từng nhóm.',
      icon: 'fa-bars text-purple-400'
    }
  ];

  // Danh mục đầy đủ các chức năng điều hành để tìm kiếm nhanh (Ctrl+K)
  const QUICK_COMMANDS = [
    { id: 'dashboard', title: '0.1 Dashboard Tổng Quan & KPI', group: 'Tổng Quan', icon: 'fa-chart-pie text-blue-400', action: () => window.switchAdminSection && window.switchAdminSection('dashboard'), keywords: 'dashboard kpi tong quan bao cao' },
    { id: 'excelPricingTool', title: '1.3 Tool Tính Giá Bằng Excel (AWB + Kg)', group: 'Công Cụ Nổi Bật', icon: 'fa-file-excel text-emerald-400', action: () => window.switchAdminSection && window.switchAdminSection('excelPricingTool'), keywords: 'excel tinh gia awb kg hang loat' },
    { id: 'cashBook', title: '3.1 Sổ Quỹ Thu - Chi & Phiếu Thu/Chi', group: 'Tài Chính & Sổ Quỹ', icon: 'fa-book-bookmark text-amber-400', action: () => window.switchAdminSection && window.switchAdminSection('cashBook'), keywords: 'so quy thu chi phieu thu phieu chi tien mat ngan hang' },
    { id: 'createShipment', title: '1.1 Tạo Đơn Hàng & In Tem AWB', group: 'Vận Đơn & Khai Thác', icon: 'fa-file-circle-plus text-emerald-400', action: () => window.switchAdminSection && window.switchAdminSection('createShipment'), keywords: 'tao don in tem awb ups fedex' },
    { id: 'shipments', title: '1.2 Quản Lý Đơn Hàng Toàn Hệ Thống', group: 'Vận Đơn & Khai Thác', icon: 'fa-boxes-stacked text-amber-400', action: () => window.switchAdminSection && window.switchAdminSection('shipments'), keywords: 'quan ly don hang danh sach van don awb' },
    { id: 'warehouse', title: '2.1 Kho Bãi & Scan Inbound / Đóng Bao', group: 'Kho Bãi & Điều Phối', icon: 'fa-warehouse text-blue-400', action: () => window.switchAdminSection && window.switchAdminSection('warehouse'), keywords: 'kho bai scan inbound dong bao xuat kho manifest' },
    { id: 'awbManagement', title: '1.4 Quản Lý Vận Đơn AWB (UPS/FedEx)', group: 'Vận Đơn & Khai Thác', icon: 'fa-barcode text-rose-400', action: () => window.switchAdminSection && window.switchAdminSection('awbManagement'), keywords: 'awb ups fedex ma van don' },
    { id: 'photoLookup', title: '2.2 Tra Cứu Hình Ảnh AWB (Cloud R2)', group: 'Kho Bãi & Điều Phối', icon: 'fa-camera text-teal-400', action: () => window.openPhotoLookupModal && window.openPhotoLookupModal(), keywords: 'anh chup hinh anh awb camera' },
    { id: 'inboundMobile', title: '2.3 Mở Giao Diện Quét Kho Di Động (Camera OCR)', group: 'Kho Bãi & Điều Phối', icon: 'fa-mobile-screen-button text-sky-400', action: () => window.open('/inbound-mobile.html', '_blank'), keywords: 'mobile app dien thoai camera ocr quet kho' },
    { id: 'rateTables', title: '5.1 Bảng Giá & Biểu Cước Hãng (UPS / FedEx)', group: 'Cấu Hình & Biểu Cước', icon: 'fa-table-cells text-cyan-400', action: () => window.switchAdminSection && window.switchAdminSection('rateTables'), keywords: 'bang gia bieu cuoc ups fedex viettel' },
    { id: 'customers', title: '4.1 Khách Hàng (Master Data & Báo Giá)', group: 'Khách Hàng & Đại Lý', icon: 'fa-address-book text-sky-400', action: () => window.switchAdminSection && window.switchAdminSection('customers'), keywords: 'khach hang master data danh ba' },
    { id: 'hubs', title: '5.5 Văn Phòng / Chi Nhánh / Hub (SGN-HAN-DAD)', group: 'Cấu Hình & Biểu Cước', icon: 'fa-building-columns text-amber-400', action: () => window.switchAdminSection && window.switchAdminSection('hubs'), keywords: 'chi nhanh hub van phong sgn han dad' },
    { id: 'geography', title: '5.4 Vị Trí Địa Lý & Vùng Phủ Sóng (Zones)', group: 'Cấu Hình & Biểu Cước', icon: 'fa-earth-americas text-emerald-400', action: () => window.switchAdminSection && window.switchAdminSection('geography'), keywords: 'dia ly zone quoc gia vung tinh cuoc' },
    { id: 'surcharges', title: '5.2 Phụ Phí Xăng Dầu (FSC) & Vùng Xa', group: 'Cấu Hình & Biểu Cước', icon: 'fa-gas-pump text-rose-400', action: () => window.switchAdminSection && window.switchAdminSection('surcharges'), keywords: 'phu phi xang dau fsc vung xa' },
    { id: 'customsConfig', title: '5.3 Quản Lý Phí Hải Quan & Hàng Khó', group: 'Cấu Hình & Biểu Cước', icon: 'fa-sliders text-purple-400', action: () => window.openModalCustomsCargoConfig && window.openModalCustomsCargoConfig(), keywords: 'hai quan hang kho phu phi' },
    { id: 'audit', title: '5.6 Phân Quyền Tài Khoản & Nhật Ký Audit Logs', group: 'Cấu Hình & Biểu Cước', icon: 'fa-shield-halved text-indigo-400', action: () => window.switchAdminSection && window.switchAdminSection('audit'), keywords: 'phan quyen tai khoan user audit log bao mat' },
    { id: 'codeVsSell', title: '3.6 Quản Lý Giá Code (Cost Hãng) vs Giá Bán', group: 'Tài Chính & Sổ Quỹ', icon: 'fa-scale-balanced text-amber-400', action: () => window.switchAdminSection && window.switchAdminSection('codeVsSell'), keywords: 'gia code gia von gia ban loi nhuan' },
    { id: 'markupConfig', title: '3.7 Quản Lý Giá Bán & Gộp Giá (Markup)', group: 'Tài Chính & Sổ Quỹ', icon: 'fa-arrow-trend-up text-emerald-400', action: () => window.switchAdminSection && window.switchAdminSection('markupConfig'), keywords: 'gop gia markup chiet khau' },
    { id: 'agents', title: '4.2 Quản Lý Đại Lý & Chính Sách Chiết Khấu', group: 'Khách Hàng & Đại Lý', icon: 'fa-handshake-angle text-cyan-400', action: () => window.switchAdminSection && window.switchAdminSection('agents'), keywords: 'dai ly agent chiet khau' },
    { id: 'carrierPartners', title: '3.5 Nhà Cung Cấp & Sổ Ký Quỹ Hãng', group: 'Tài Chính & Sổ Quỹ', icon: 'fa-truck-plane text-teal-400', action: () => window.switchAdminSection && window.switchAdminSection('carrierPartners'), keywords: 'nha cung cap ky quy hang ups fedex' },
    { id: 'finance', title: '3.2 Công Nợ, Thu Cước & Duyệt Tài Chính Xuất Kho', group: 'Tài Chính & Sổ Quỹ', icon: 'fa-file-invoice-dollar text-emerald-400', action: () => window.switchAdminSection && window.switchAdminSection('finance'), keywords: 'cong no thu cuoc duyet xuat kho financial gate' },
    { id: 'walletTopup', title: '3.4 Quản Lý Top-Up Ví Điện Tử Đại Lý', group: 'Tài Chính & Sổ Quỹ', icon: 'fa-money-bill-transfer text-indigo-400', action: () => window.switchAdminSection && window.switchAdminSection('walletTopup'), keywords: 'nap vi topup vi dai ly' },
    { id: 'reconciliation', title: '3.3 Đối Soát Công Nợ Hai Chiều (AR vs AP)', group: 'Tài Chính & Sổ Quỹ', icon: 'fa-receipt text-rose-400', action: () => window.switchAdminSection && window.switchAdminSection('reconciliation'), keywords: 'doi soat cong no ar ap' },
    { id: 'contracts', title: '4.3 Quản Lý Khách Hàng Hợp Đồng', group: 'Khách Hàng & Đại Lý', icon: 'fa-file-signature text-sky-400', action: () => window.switchAdminSection && window.switchAdminSection('contracts'), keywords: 'hop dong khach hang tra sau' },
    { id: 'approval', title: '4.4 Phê Duyệt Tài Khoản & Hạn Mức Tín Dụng', group: 'Khách Hàng & Đại Lý', icon: 'fa-user-check text-emerald-400', action: () => window.switchAdminSection && window.switchAdminSection('approval'), keywords: 'phe duyet han muc tin dung' },
    { id: 'commitments', title: '4.5 Cam Kết Sản Lượng & Khách VIP', group: 'Khách Hàng & Đại Lý', icon: 'fa-award text-amber-400', action: () => window.switchAdminSection && window.switchAdminSection('commitments'), keywords: 'cam ket san luong vip' },
    { id: 'customerCommunication', title: '4.6 Trung Tâm Giao Tiếp & Hỗ Trợ CSKH', group: 'Khách Hàng & Đại Lý', icon: 'fa-headset text-rose-400', action: () => window.switchAdminSection && window.switchAdminSection('customerCommunication'), keywords: 'cskh chat ticket ho tro' },
    { id: 'biAnalytics', title: '5.7 Báo Cáo Phân Tích Lãi Lỗ & BI Analytics', group: 'Cấu Hình & Biểu Cước', icon: 'fa-chart-line text-purple-400', action: () => window.switchAdminSection && window.switchAdminSection('biAnalytics'), keywords: 'bao cao bi analytics phan tich lai lo' },
    { id: 'layoutGallery', title: '🎨 Đổi Mẫu Giao Diện Hệ Thống (4 Mẫu ERP / Tab / Dock)', group: 'Giao Diện', icon: 'fa-palette text-amber-400', action: () => openLayoutGalleryModal(), keywords: 'giao dien layout sidebar tab mẫu' },
    { id: 'systemHealth', title: '⚡ Trung Tâm Hiệu Năng & Sao Lưu Dữ Liệu Tự Động', group: 'Hạ Tầng Hệ Thống', icon: 'fa-server text-emerald-400', action: () => openSystemHealthModal(), keywords: 'backup sao luu hieu nang cache he thong' }
  ];

  let deferredInstallPrompt = null;
  let activeWorkspaceDeptId = 'ops';

  // 1. Đăng ký Service Worker cho PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const btnInstall = document.getElementById('btnPdxInstallApp');
    if (btnInstall) btnInstall.classList.remove('hidden');
  });

  // 2. Hệ thống thông báo Toast góc phải mượt mà
  function pdxNotify(message, type = 'success') {
    let container = document.getElementById('pdxToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pdxToastContainer';
      document.body.appendChild(container);
    }
    const colors = {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#f43f5e',
      info: '#38bdf8'
    };
    const icons = {
      success: 'fa-circle-check text-emerald-400',
      warning: 'fa-triangle-exclamation text-amber-400',
      error: 'fa-circle-xmark text-rose-400',
      info: 'fa-bolt text-sky-400'
    };
    const toast = document.createElement('div');
    toast.className = 'pdx-toast';
    toast.style.borderLeftColor = colors[type] || colors.success;
    toast.innerHTML = `
      <div class="flex items-center space-x-2.5">
        <i class="fa-solid ${icons[type] || icons.success} text-sm"></i>
        <span>${message}</span>
      </div>
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white text-xs ml-2">✕</button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 3500);
  }
  window.pdxNotify = pdxNotify;

  // 3. Thực thi hành động của 1 mục điều hướng
  function triggerNavItem(item) {
    if (!item) return;
    if (item.sec && typeof window.switchAdminSection === 'function') {
      window.switchAdminSection(item.sec);
    } else if (item.fn && typeof window[item.fn] === 'function') {
      window[item.fn]();
    } else if (item.url) {
      window.open(item.url, '_blank');
    }
    closeLaunchpadAppGridModal();
  }
  window.pdxTriggerNavItem = function (sec, fn, url) {
    triggerNavItem({ sec, fn, url });
  };

  // Tìm phòng ban chứa section hiện tại
  function findDeptBySection(sec) {
    if (!sec || sec === 'dashboard') return 'dashboard';
    for (const dept of DEPARTMENT_GROUPS) {
      if (dept.items.some(it => it.sec === sec)) {
        return dept.id;
      }
    }
    return 'ops';
  }

  // 4. Khởi tạo 4 Mẫu Giao Diện (Sidebar ERP, Workspace Tabs 2 Tầng, Launchpad Dock, Classic Top-Bar)
  function injectFourLayoutTemplates() {
    if (document.getElementById('pdxErpSidebar')) return;

    // A. MẪU 1: SIDEBAR TRÁI CHUẨN ERP QUỐC TẾ (Odoo / MISA / SAP)
    const sidebar = document.createElement('aside');
    sidebar.id = 'pdxErpSidebar';
    sidebar.innerHTML = `
      <!-- Logo & Tên Hệ Thống trên đỉnh Sidebar -->
      <div class="px-4 py-3 border-b border-slate-800/90 flex items-center justify-between bg-slate-950/80">
        <div onclick="window.switchAdminSection && window.switchAdminSection('dashboard')" class="flex items-center space-x-2.5 cursor-pointer group">
          <div class="w-9 h-9 bg-gradient-to-tr from-amber-400 to-amber-500 rounded-xl flex items-center justify-center text-slate-950 font-black text-lg shadow">
            🐼
          </div>
          <div>
            <div class="text-xs font-black text-white tracking-tight">PandaLex ERP</div>
            <div class="text-[10px] text-emerald-400 font-bold">Mẫu 1 • Sidebar Quốc Tế</div>
          </div>
        </div>
        <button type="button" onclick="openLayoutGalleryModal()" class="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-lg font-bold transition" title="Đổi sang mẫu giao diện khác">
          🎨 Đổi Mẫu
        </button>
      </div>

      <!-- Ô lọc nhanh menu trên Sidebar -->
      <div class="p-2.5 border-b border-slate-800/80">
        <div class="relative">
          <i class="fa-solid fa-filter text-slate-500 text-[11px] absolute left-3 top-2.5"></i>
          <input id="pdxSidebarFilterInput" type="text" placeholder="Lọc nhanh menu bên trái..." class="w-full bg-slate-900/90 text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-8 pr-3 py-1.5 border border-slate-800 focus:border-sky-500">
        </div>
      </div>

      <!-- Danh sách Menu dọc chia theo 5 Phòng Ban rõ ràng (Không cần rê chuột mở dropdown) -->
      <div id="pdxErpSidebarScroll" class="flex-1 overflow-y-auto px-2.5 py-2 space-y-3">
        <div>
          <button type="button" data-pdx-sec="dashboard" onclick="window.switchAdminSection && window.switchAdminSection('dashboard')" class="pdx-erp-nav-item active">
            <i class="fa-solid fa-chart-pie w-4 text-center text-sky-400"></i>
            <span>📊 Bàn Điều Khiển Tổng Quan</span>
          </button>
        </div>
        ${DEPARTMENT_GROUPS.map(dept => `
          <div class="pdx-erp-group space-y-1" data-dept-group="${dept.id}">
            <div class="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>${dept.fullTitle}</span>
            </div>
            <div class="space-y-0.5">
              ${dept.items.map(it => `
                <button type="button"
                  ${it.sec ? `data-pdx-sec="${it.sec}"` : ''}
                  data-search-label="${it.label}"
                  onclick="pdxTriggerNavItem('${it.sec || ''}', '${it.fn || ''}', '${it.url || ''}')"
                  class="pdx-erp-nav-item ${it.highlight ? 'bg-slate-900/70 border-slate-800 text-amber-300 font-bold' : ''}">
                  <i class="fa-solid ${it.icon} w-4 text-center flex-shrink-0"></i>
                  <span class="truncate">${it.label}</span>
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Chân Sidebar: Đổi mẫu nhanh -->
      <div class="p-2.5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-[11px] text-slate-400">
        <span>Giao diện: <strong class="text-sky-400">Mẫu 1 (ERP)</strong></span>
        <button type="button" onclick="setPdxLayout('workspace-tabs')" class="text-amber-400 hover:underline font-bold">Thử Mẫu 2 →</button>
      </div>
    `;
    document.body.appendChild(sidebar);

    const filterInp = sidebar.querySelector('#pdxSidebarFilterInput');
    if (filterInp) {
      filterInp.addEventListener('input', () => {
        const q = normalizeText(filterInp.value);
        sidebar.querySelectorAll('.pdx-erp-group').forEach(grp => {
          let hasVisible = false;
          grp.querySelectorAll('.pdx-erp-nav-item').forEach(btn => {
            const txt = normalizeText(btn.getAttribute('data-search-label') || btn.textContent);
            const match = !q || txt.includes(q);
            btn.style.display = match ? 'flex' : 'none';
            if (match) hasVisible = true;
          });
          grp.style.display = hasVisible ? 'block' : 'none';
        });
      });
    }

    // B. MẪU 2: BÀN LÀM VIỆC CHIA TAB 2 TẦNG KHÔNG DÙNG DROPDOWN (Shopee / ViettelPost Style)
    const stickyTopContainer = document.querySelector('div.sticky.top-0.z-40');
    if (stickyTopContainer) {
      const wsBar = document.createElement('div');
      wsBar.id = 'pdxWorkspaceTabsBar';
      wsBar.innerHTML = `
        <!-- Tầng 1: Thanh Tab 6 Bộ Phận Lớn -->
        <div class="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 pt-1.5 flex items-center justify-between gap-2 overflow-x-auto">
          <div class="flex items-center space-x-1" id="pdxWsDeptTabs">
            <button type="button" data-ws-dept="dashboard" onclick="selectWorkspaceDepartment('dashboard')" class="pdx-ws-dept-btn">
              <i class="fa-solid fa-chart-pie text-sky-400"></i>
              <span>📊 Tổng Quan</span>
            </button>
            ${DEPARTMENT_GROUPS.map(dept => `
              <button type="button" data-ws-dept="${dept.id}" onclick="selectWorkspaceDepartment('${dept.id}')" class="pdx-ws-dept-btn">
                <span>${dept.fullTitle}</span>
              </button>
            `).join('')}
          </div>
          <div class="hidden lg:flex items-center space-x-2 pb-1.5 flex-shrink-0">
            <span class="text-[10px] text-amber-400 font-bold bg-amber-950/60 border border-amber-700/50 px-2.5 py-1 rounded-lg">
              ✨ Mẫu 2: Tab 2 Tầng (Không Menu Xổ Xuống)
            </span>
          </div>
        </div>
        <!-- Tầng 2: Thanh Sub-Tab Ngang Cố Định (Hiển thị toàn bộ chức năng con của Bộ Phận đang chọn) -->
        <div id="pdxWsSubTabsContainer" class="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 flex items-center flex-wrap gap-2 shadow-sm"></div>
      `;
      stickyTopContainer.appendChild(wsBar);

      // C. MẪU 3: THANH TRÊN + FLOATING DOCK & LAUNCHPAD (macOS / iPadOS Style)
      const lpStrip = document.createElement('div');
      lpStrip.id = 'pdxLaunchpadTopStrip';
      lpStrip.className = 'bg-white/95 backdrop-blur border-b border-slate-200 px-3 sm:px-6 py-2 items-center justify-between flex-wrap gap-2 shadow-sm';
      lpStrip.innerHTML = `
        <div class="flex items-center flex-wrap gap-2">
          <button type="button" onclick="openLaunchpadAppGridModal()" class="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow flex items-center space-x-2">
            <i class="fa-solid fa-grip text-amber-300"></i>
            <span>🚀 MỞ BÀN LÀM VIỆC TRUNG TÂM (34 ỨNG DỤNG)</span>
          </button>
          <button type="button" onclick="window.switchAdminSection && window.switchAdminSection('dashboard')" class="pdx-ws-sub-btn" data-pdx-sec="dashboard">
            <i class="fa-solid fa-chart-pie text-sky-500"></i><span>Tổng Quan</span>
          </button>
          <button type="button" onclick="window.switchAdminSection && window.switchAdminSection('createShipment')" class="pdx-ws-sub-btn" data-pdx-sec="createShipment">
            <i class="fa-solid fa-file-circle-plus text-emerald-600"></i><span>Tạo Đơn AWB</span>
          </button>
          <button type="button" onclick="window.switchAdminSection && window.switchAdminSection('shipments')" class="pdx-ws-sub-btn" data-pdx-sec="shipments">
            <i class="fa-solid fa-boxes-stacked text-amber-600"></i><span>Đơn Hàng</span>
          </button>
          <button type="button" onclick="window.switchAdminSection && window.switchAdminSection('excelPricingTool')" class="pdx-ws-sub-btn" data-pdx-sec="excelPricingTool">
            <i class="fa-solid fa-file-excel text-emerald-600"></i><span>⚡ Up Excel Tính Giá</span>
          </button>
          <button type="button" onclick="window.switchAdminSection && window.switchAdminSection('warehouse')" class="pdx-ws-sub-btn" data-pdx-sec="warehouse">
            <i class="fa-solid fa-warehouse text-blue-600"></i><span>Kho Inbound</span>
          </button>
          <button type="button" onclick="window.switchAdminSection && window.switchAdminSection('cashBook')" class="pdx-ws-sub-btn" data-pdx-sec="cashBook">
            <i class="fa-solid fa-book-bookmark text-amber-600"></i><span>⭐ Sổ Quỹ Thu Chi</span>
          </button>
        </div>
        <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
          🚀 Mẫu 3: Lưới App & Thanh Dock Nổi
        </span>
      `;
      stickyTopContainer.appendChild(lpStrip);

      // D. THANH CHỌN NHANH 4 MẪU GIAO DIỆN TRỰC TIẾP (Giúp anh bấm thử từng mẫu 1 chạm)
      const switcherBanner = document.createElement('div');
      switcherBanner.id = 'pdxQuickLayoutBanner';
      switcherBanner.className = 'bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white px-3 sm:px-6 py-1.5 border-b border-indigo-500/30 flex items-center justify-between flex-wrap gap-2 text-xs';
      switcherBanner.innerHTML = `
        <div class="flex items-center space-x-2">
          <span class="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[10px] uppercase">🎨 Chọn Mẫu Giao Diện</span>
          <span class="text-slate-300 hidden md:inline text-[11px]">Anh bấm chọn thử từng mẫu bên phải để xem bố cục nào hợp mắt nhất:</span>
        </div>
        <div class="flex items-center flex-wrap gap-1.5">
          <button type="button" data-layout-btn="sidebar-erp" onclick="setPdxLayout('sidebar-erp')" class="px-2.5 py-1 rounded-lg font-bold text-[11px] border transition">
            1. Sidebar Trái ERP (Odoo/MISA)
          </button>
          <button type="button" data-layout-btn="workspace-tabs" onclick="setPdxLayout('workspace-tabs')" class="px-2.5 py-1 rounded-lg font-bold text-[11px] border transition">
            2. Tab Bộ Phận 2 Tầng (Không Xổ Xuống)
          </button>
          <button type="button" data-layout-btn="launchpad-dock" onclick="setPdxLayout('launchpad-dock')" class="px-2.5 py-1 rounded-lg font-bold text-[11px] border transition">
            3. Lưới App & Dock (macOS)
          </button>
          <button type="button" data-layout-btn="classic-topbar" onclick="setPdxLayout('classic-topbar')" class="px-2.5 py-1 rounded-lg font-bold text-[11px] border transition">
            4. Menu Ngang Cũ
          </button>
          <button type="button" onclick="openLayoutGalleryModal()" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] font-bold" title="Xem mô tả chi tiết 4 mẫu">
            <i class="fa-solid fa-expand mr-1"></i>So Sánh 4 Mẫu
          </button>
        </div>
      `;
      stickyTopContainer.insertBefore(switcherBanner, stickyTopContainer.firstChild);
    }

    // Floating macOS Dock ở dưới đáy màn hình cho Mẫu 3
    const dock = document.createElement('div');
    dock.id = 'pdxFloatingDock';
    dock.className = 'fixed bottom-3 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl px-3 py-2 shadow-2xl items-center space-x-1.5';
    dock.innerHTML = `
      <button type="button" onclick="openLaunchpadAppGridModal()" class="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center space-x-1.5 shadow">
        <i class="fa-solid fa-grip text-amber-300"></i>
        <span>34 App</span>
      </button>
      <span class="text-slate-700">|</span>
      <button type="button" onclick="window.switchAdminSection && window.switchAdminSection('dashboard')" class="px-2.5 py-1.5 rounded-xl text-slate-200 hover:bg-slate-800 text-xs font-bold flex items-center space-x-1.5">
        <i class="fa-solid fa-chart-pie text-sky-400"></i><span class="hidden sm:inline">Tổng Quan</span>
      </button>
      <button type="button" onclick="window.switchAdminSection && window.switchAdminSection('createShipment')" class="px-2.5 py-1.5 rounded-xl text-slate-200 hover:bg-slate-800 text-xs font-bold flex items-center space-x-1.5">
        <i class="fa-solid fa-file-circle-plus text-emerald-400"></i><span class="hidden sm:inline">Tạo Đơn</span>
      </button>
      <button type="button" onclick="window.switchAdminSection && window.switchAdminSection('excelPricingTool')" class="px-2.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900 text-xs font-extrabold flex items-center space-x-1.5">
        <i class="fa-solid fa-file-excel text-emerald-400"></i><span>Up Excel Giá</span>
      </button>
      <button type="button" onclick="window.switchAdminSection && window.switchAdminSection('warehouse')" class="px-2.5 py-1.5 rounded-xl text-slate-200 hover:bg-slate-800 text-xs font-bold flex items-center space-x-1.5">
        <i class="fa-solid fa-warehouse text-blue-400"></i><span class="hidden md:inline">Kho Bãi</span>
      </button>
      <button type="button" onclick="window.switchAdminSection && window.switchAdminSection('cashBook')" class="px-2.5 py-1.5 rounded-xl bg-amber-950/80 border border-amber-700/60 text-amber-300 hover:bg-amber-900 text-xs font-extrabold flex items-center space-x-1.5">
        <i class="fa-solid fa-book-bookmark text-amber-400"></i><span>Sổ Quỹ</span>
      </button>
      <button type="button" onclick="window.switchAdminSection && window.switchAdminSection('rateTables')" class="px-2.5 py-1.5 rounded-xl text-slate-200 hover:bg-slate-800 text-xs font-bold flex items-center space-x-1.5">
        <i class="fa-solid fa-table-cells text-cyan-400"></i><span class="hidden md:inline">Bảng Giá</span>
      </button>
    `;
    document.body.appendChild(dock);

    // Khởi tạo trạng thái Layout mặc định: 'workspace-tabs' hoặc theo lựa chọn đã lưu
    const savedLayout = localStorage.getItem('pandalex_ui_layout') || 'sidebar-erp';
    setPdxLayout(savedLayout, true);
  }

  // Chuyển đổi Phòng ban trên Mẫu 2 (Workspace Tabs 2 Tầng)
  function selectWorkspaceDepartment(deptId, skipAutoSwitchSection) {
    activeWorkspaceDeptId = deptId;
    document.querySelectorAll('#pdxWsDeptTabs .pdx-ws-dept-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-ws-dept') === deptId);
    });

    const subBox = document.getElementById('pdxWsSubTabsContainer');
    if (!subBox) return;

    if (deptId === 'dashboard') {
      subBox.innerHTML = `
        <button type="button" onclick="window.switchAdminSection && window.switchAdminSection('dashboard')" class="pdx-ws-sub-btn active" data-pdx-sec="dashboard">
          <i class="fa-solid fa-chart-pie"></i>
          <span>0.1 Bàn Điều Khiển Tổng Quan & KPI</span>
        </button>
        <button type="button" onclick="window.switchAdminSection && window.switchAdminSection('excelPricingTool')" class="pdx-ws-sub-btn" data-pdx-sec="excelPricingTool">
          <i class="fa-solid fa-file-excel text-emerald-600"></i>
          <span>⚡ Lối tắt: Up Excel Tính Giá (AWB + Kg)</span>
        </button>
        <button type="button" onclick="window.switchAdminSection && window.switchAdminSection('cashBook')" class="pdx-ws-sub-btn" data-pdx-sec="cashBook">
          <i class="fa-solid fa-book-bookmark text-amber-600"></i>
          <span>⭐ Lối tắt: Sổ Quỹ Thu - Chi</span>
        </button>
        <button type="button" onclick="window.switchAdminSection && window.switchAdminSection('createShipment')" class="pdx-ws-sub-btn" data-pdx-sec="createShipment">
          <i class="fa-solid fa-file-circle-plus text-blue-600"></i>
          <span>📦 Lối tắt: Tạo Đơn & In Tem AWB</span>
        </button>
      `;
      if (!skipAutoSwitchSection && window.switchAdminSection) {
        window.switchAdminSection('dashboard');
      }
      return;
    }

    const dept = DEPARTMENT_GROUPS.find(d => d.id === deptId) || DEPARTMENT_GROUPS[0];
    const currentSec = window.currentAdminSection || 'dashboard';
    subBox.innerHTML = dept.items.map(it => {
      const isAct = it.sec && it.sec === currentSec;
      return `
        <button type="button"
          ${it.sec ? `data-pdx-sec="${it.sec}"` : ''}
          onclick="pdxTriggerNavItem('${it.sec || ''}', '${it.fn || ''}', '${it.url || ''}')"
          class="pdx-ws-sub-btn ${isAct ? 'active' : ''}">
          <i class="fa-solid ${it.icon}"></i>
          <span>${it.label}</span>
        </button>
      `;
    }).join('');

    // Nếu người dùng bấm trực tiếp vào Tab Phòng Ban trên Tầng 1, mở ngay chức năng đầu tiên của Phòng ban đó
    if (!skipAutoSwitchSection) {
      const firstSecItem = dept.items.find(it => it.sec);
      if (firstSecItem && !dept.items.some(it => it.sec === currentSec) && window.switchAdminSection) {
        window.switchAdminSection(firstSecItem.sec);
      }
    }
  }
  window.selectWorkspaceDepartment = selectWorkspaceDepartment;

  // Chuyển đổi giữa 4 Mẫu Giao Diện
  function setPdxLayout(layoutId, silent) {
    const validIds = ['sidebar-erp', 'workspace-tabs', 'launchpad-dock', 'classic-topbar'];
    const target = validIds.includes(layoutId) ? layoutId : 'sidebar-erp';
    document.body.setAttribute('data-pdx-layout', target);
    try {
      localStorage.setItem('pandalex_ui_layout', target);
    } catch (_) {}

    // Highlight nút đang chọn trên thanh Banner
    document.querySelectorAll('[data-layout-btn]').forEach(btn => {
      const isMatch = btn.getAttribute('data-layout-btn') === target;
      btn.className = isMatch
        ? 'px-2.5 py-1 rounded-lg font-black text-[11px] bg-amber-400 text-slate-950 border border-amber-300 shadow transition'
        : 'px-2.5 py-1 rounded-lg font-bold text-[11px] bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition';
    });

    syncActiveNavigationState(window.currentAdminSection || 'dashboard');

    if (!silent) {
      const found = LAYOUT_TEMPLATES.find(t => t.id === target);
      if (found) {
        pdxNotify(`Đã chuyển sang ${found.badge}: ${found.name}`, 'info');
      }
    }
  }
  window.setPdxLayout = setPdxLayout;

  // Đồng bộ trạng thái nút đang mở trên cả 4 Mẫu Giao Diện
  function syncActiveNavigationState(sec) {
    if (!sec) return;
    const deptId = findDeptBySection(sec);
    selectWorkspaceDepartment(deptId, true);

    document.querySelectorAll('[data-pdx-sec]').forEach(btn => {
      const isAct = btn.getAttribute('data-pdx-sec') === sec;
      btn.classList.toggle('active', isAct);
    });
  }

  // Bọc (hook) hàm switchAdminSection để mỗi khi chuyển trang đều cập nhật trạng thái active trên cả 4 mẫu
  function hookSwitchAdminSection() {
    if (typeof window.switchAdminSection === 'function' && !window.switchAdminSection._pdxHooked) {
      const orig = window.switchAdminSection;
      const wrapped = function (sec) {
        const res = orig.apply(this, arguments);
        syncActiveNavigationState(sec);
        return res;
      };
      wrapped._pdxHooked = true;
      window.switchAdminSection = wrapped;
    }
  }

  // 5. Tạo giao diện Modal Command Palette (Ctrl + K), Bộ Sưu Tập 4 Mẫu Giao Diện, Launchpad 34 App & System Health
  function injectEnterpriseModals() {
    if (document.getElementById('pdxCommandPaletteModal')) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <!-- MODAL 1: BỘ SƯU TẬP 4 MẪU GIAO DIỆN ĐIỀU HÀNH (VISUAL TEMPLATE PICKER) -->
      <div id="pdxLayoutGalleryModal" class="hidden fixed inset-0 z-[110] pdx-modal-backdrop flex items-center justify-center p-4" onclick="if(event.target===this) closeLayoutGalleryModal()">
        <div class="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div class="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow">
                <i class="fa-solid fa-palette"></i>
              </div>
              <div>
                <h3 class="text-sm sm:text-base font-black">Chọn Mẫu Bố Cục Giao Diện Quản Trị (4 Mẫu Chuẩn Enterprise)</h3>
                <p class="text-[11px] text-slate-300">Anh bấm chọn bất kỳ mẫu nào bên dưới để áp dụng ngay lập tức trên dữ liệu thật</p>
              </div>
            </div>
            <button onclick="closeLayoutGalleryModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center">✕</button>
          </div>

          <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto bg-slate-50">
            ${LAYOUT_TEMPLATES.map((tpl, idx) => `
              <div onclick="setPdxLayout('${tpl.id}'); closeLayoutGalleryModal();" class="bg-white hover:bg-blue-50/40 rounded-2xl border-2 border-slate-200 hover:border-blue-600 p-5 cursor-pointer transition shadow-sm flex flex-col justify-between group">
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">${tpl.badge}</span>
                    <span class="text-[11px] font-bold text-slate-400">${tpl.styleRef}</span>
                  </div>
                  <h4 class="text-base font-black text-slate-900 group-hover:text-blue-700 flex items-center space-x-2">
                    <i class="fa-solid ${tpl.icon}"></i>
                    <span>${tpl.name}</span>
                  </h4>
                  <p class="text-xs text-slate-600 mt-2 leading-relaxed">${tpl.desc}</p>

                  <!-- Minh họa sơ đồ bố cục trực quan -->
                  <div class="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono">
                    ${idx === 0 ? `
                      <div class="flex gap-2 h-16">
                        <div class="w-1/4 bg-slate-800 rounded p-1.5 border border-sky-500/40 text-sky-300 flex flex-col justify-between">
                          <span>☰ Sidebar</span><span>• Vận đơn</span><span>• Sổ quỹ</span>
                        </div>
                        <div class="flex-1 bg-slate-950 rounded p-2 flex items-center justify-center text-slate-400">Khung Bảng Tính Rộng 100%</div>
                      </div>
                    ` : idx === 1 ? `
                      <div class="flex flex-col gap-1.5 h-16">
                        <div class="bg-slate-800 rounded px-2 py-1 text-amber-300 flex justify-between"><span>[1. Vận Đơn]</span><span>[2. Kho]</span><span>[3. Sổ Quỹ]</span></div>
                        <div class="bg-blue-950/80 border border-blue-500/40 rounded px-2 py-1 text-sky-200 flex justify-between"><span>• Tạo Đơn</span><span>• Up Excel Giá</span><span>• Kho AWB</span></div>
                        <div class="flex-1 bg-slate-950 rounded flex items-center justify-center text-slate-400">Không có menu xổ xuống che khuất</div>
                      </div>
                    ` : idx === 2 ? `
                      <div class="flex flex-col justify-between h-16 bg-slate-950 rounded p-2">
                        <div class="grid grid-cols-4 gap-1 text-center">
                          <span class="bg-slate-800 rounded py-0.5 text-emerald-300">📦 Đơn</span>
                          <span class="bg-slate-800 rounded py-0.5 text-amber-300">⚡ Giá</span>
                          <span class="bg-slate-800 rounded py-0.5 text-sky-300">🏭 Kho</span>
                          <span class="bg-slate-800 rounded py-0.5 text-rose-300">💰 Quỹ</span>
                        </div>
                        <div class="mx-auto bg-indigo-950 border border-indigo-500/50 rounded-full px-4 py-0.5 text-indigo-300">Thanh Dock Nổi (macOS)</div>
                      </div>
                    ` : `
                      <div class="flex flex-col gap-1.5 h-16">
                        <div class="bg-slate-800 rounded px-2 py-1 text-slate-300 flex justify-between"><span>Tổng Quan</span><span>1. Vận Đơn ▾</span><span>2. Kho ▾</span><span>3. Quỹ ▾</span></div>
                        <div class="flex-1 bg-slate-950 rounded flex items-center justify-center text-slate-400">Menu xổ xuống truyền thống</div>
                      </div>
                    `}
                  </div>
                </div>

                <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span class="text-[11px] text-slate-500 font-semibold">Chuyển đổi tức thì (0.01s)</span>
                  <span class="px-3.5 py-1.5 rounded-xl bg-blue-600 group-hover:bg-blue-700 text-white font-black text-xs shadow">
                    Áp Dụng Mẫu ${idx + 1} ➔
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- MODAL 2: BÀN LÀM VIỆC TRUNG TÂM 34 ỨNG DỤNG (LAUNCHPAD APP GRID CHO MẪU 3) -->
      <div id="pdxLaunchpadGridModal" class="hidden fixed inset-0 z-[105] pdx-modal-backdrop flex items-center justify-center p-4" onclick="if(event.target===this) closeLaunchpadAppGridModal()">
        <div class="bg-slate-950/95 text-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <span class="text-2xl">🚀</span>
              <div>
                <h3 class="text-base font-black">Bàn Làm Việc Trung Tâm PandaLex (Tất Cả Chức Năng Theo Phòng Ban)</h3>
                <p class="text-xs text-slate-400">Nhấp chọn bất kỳ ứng dụng nào bên dưới để mở ngay</p>
              </div>
            </div>
            <button onclick="closeLaunchpadAppGridModal()" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300">✕</button>
          </div>
          <div class="p-6 max-h-[80vh] overflow-y-auto space-y-5">
            ${DEPARTMENT_GROUPS.map(dept => `
              <div>
                <h4 class="text-xs font-black uppercase tracking-wider text-amber-400 mb-2.5">${dept.fullTitle}</h4>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  ${dept.items.map(it => `
                    <button type="button" onclick="pdxTriggerNavItem('${it.sec || ''}', '${it.fn || ''}', '${it.url || ''}')" class="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 text-left transition flex items-start space-x-3 group">
                      <div class="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                        <i class="fa-solid ${it.icon} text-sm"></i>
                      </div>
                      <span class="text-xs font-bold text-slate-200 group-hover:text-white leading-snug">${it.label}</span>
                    </button>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- MODAL 3: COMMAND PALETTE MODAL (CTRL + K) -->
      <div id="pdxCommandPaletteModal" class="hidden fixed inset-0 z-[100] pdx-modal-backdrop flex items-start justify-center pt-16 sm:pt-24 px-4" onclick="if(event.target===this) closeCommandPalette()">
        <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div class="p-3.5 bg-slate-900 text-white flex items-center space-x-3 border-b border-slate-800">
            <i class="fa-solid fa-magnifying-glass text-sky-400 text-base ml-1"></i>
            <input id="pdxCommandInput" type="text" placeholder="Gõ tên chức năng (VD: sổ quỹ, bảng giá, phân quyền...) hoặc nhập mã AWB (1Z...)" class="w-full bg-transparent text-white placeholder-slate-400 text-sm font-semibold border-none focus:ring-0 outline-none" autocomplete="off">
            <button onclick="closeCommandPalette()" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg font-mono">ESC</button>
          </div>
          <div id="pdxCommandList" class="max-h-[380px] overflow-y-auto p-2 divide-y divide-slate-100"></div>
          <div class="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <div class="flex items-center space-x-3">
              <span><strong class="text-slate-700">↑↓</strong> Di chuyển</span>
              <span><strong class="text-slate-700">Enter</strong> Mở ngay</span>
            </div>
            <span class="font-bold text-indigo-600">⚡ PandaLex Quick Navigator (34 Phân hệ)</span>
          </div>
        </div>
      </div>

      <!-- MODAL 4: SYSTEM HEALTH, O(1) INDEX & AUTO-BACKUP MODAL -->
      <div id="pdxSystemHealthModal" class="hidden fixed inset-0 z-[100] pdx-modal-backdrop flex items-center justify-center p-4" onclick="if(event.target===this) closeSystemHealthModal()">
        <div class="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 text-lg">
                <i class="fa-solid fa-bolt"></i>
              </div>
              <div>
                <h3 class="text-sm sm:text-base font-black tracking-tight">Trung Tâm Hiệu Năng & Sao Lưu Tự Động (Zero-Bottleneck Engine)</h3>
                <p class="text-[11px] text-slate-300">Kiến trúc Bộ đệm RAM 0ms • Chỉ mục AWB O(1) • Sao lưu Snapshot An toàn</p>
              </div>
            </div>
            <button onclick="closeSystemHealthModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center">✕</button>
          </div>

          <div class="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span class="text-[10px] font-bold uppercase text-emerald-700">Tốc độ Tra cứu AWB</span>
                <div id="sysMetricLookup" class="text-lg font-black text-emerald-900 mt-0.5">0.001 ms</div>
                <span id="sysMetricIndexCount" class="text-[10px] text-emerald-600 font-semibold">O(1) Hash Map Index</span>
              </div>
              <div class="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                <span class="text-[10px] font-bold uppercase text-blue-700">Tỷ lệ Đọc RAM Cache</span>
                <div id="sysMetricCacheHit" class="text-lg font-black text-blue-900 mt-0.5">100%</div>
                <span id="sysMetricReads" class="text-[10px] text-blue-600 font-semibold">Không nghẽn ổ cứng</span>
              </div>
              <div class="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                <span class="text-[10px] font-bold uppercase text-amber-700">Gộp Lệnh Ghi Đĩa</span>
                <div id="sysMetricBatchSaved" class="text-lg font-black text-amber-900 mt-0.5">0</div>
                <span class="text-[10px] text-amber-600 font-semibold">Atomic Debounce Write</span>
              </div>
              <div class="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200">
                <span class="text-[10px] font-bold uppercase text-purple-700">Bộ Nhớ & Phiên</span>
                <div id="sysMetricRam" class="text-lg font-black text-purple-900 mt-0.5">- MB</div>
                <span id="sysMetricSessions" class="text-[10px] text-purple-600 font-semibold">Phiên bền vững 24h</span>
              </div>
            </div>

            <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 class="font-black text-slate-900 text-sm flex items-center space-x-2">
                    <i class="fa-solid fa-cloud-arrow-up text-indigo-600"></i>
                    <span>Sao Lưu An Toàn Toàn Bộ Dữ Liệu (22 Phân Hệ JSON)</span>
                  </h4>
                  <p class="text-[11px] text-slate-500">Bảo vệ 100% dữ liệu đơn hàng, sổ quỹ, khách hàng và phân quyền trước mọi sự cố</p>
                </div>
                <button id="btnCreateBackupNow" onclick="createSystemBackupNow()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-4 py-2 rounded-xl shadow flex items-center space-x-2 cursor-pointer flex-shrink-0">
                  <i class="fa-solid fa-floppy-disk"></i>
                  <span>Tạo Bản Sao Lưu Ngay</span>
                </button>
              </div>

              <div id="sysBackupListContainer" class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                <div class="p-4 text-center text-slate-400">Đang tải danh sách bản sao lưu...</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL 5: PWA INSTALL GUIDE MODAL (0Đ MOBILE APP) -->
      <div id="pdxInstallAppModal" class="hidden fixed inset-0 z-[100] pdx-modal-backdrop flex items-center justify-center p-4" onclick="if(event.target===this) this.classList.add('hidden')">
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div class="bg-slate-950 text-white px-5 py-4 flex items-center justify-between">
            <div class="flex items-center space-x-2.5">
              <span class="text-2xl">🐼</span>
              <div>
                <h3 class="text-sm font-black">Cài Đặt Ứng Dụng PandaLex TMS</h3>
                <p class="text-[10px] text-amber-400 font-bold">Chạy mượt như Native App • Chi phí 0đ</p>
              </div>
            </div>
            <button onclick="document.getElementById('pdxInstallAppModal').classList.add('hidden')" class="text-slate-400 hover:text-white">✕</button>
          </div>
          <div class="p-5 space-y-4 text-xs text-slate-700">
            <div class="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2">
              <div class="font-extrabold text-indigo-950 flex items-center space-x-2">
                <i class="fa-brands fa-apple text-base"></i>
                <span>Trên iPhone / iPad (iOS Safari):</span>
              </div>
              <ol class="list-decimal list-inside space-y-1 text-indigo-900">
                <li>Bấm nút <strong>Chia sẻ (Share)</strong> ở thanh dưới cùng trình duyệt Safari.</li>
                <li>Chọn <strong>"Thêm vào MH chính" (Add to Home Screen)</strong>.</li>
                <li>Bấm <strong>Thêm (Add)</strong> — Icon PandaLex sẽ xuất hiện ngay trên màn hình điện thoại!</li>
              </ol>
            </div>
            <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div class="font-extrabold text-emerald-950 flex items-center space-x-2">
                <i class="fa-brands fa-android text-base text-emerald-600"></i>
                <span>Trên Android / Máy tính (Chrome / Edge):</span>
              </div>
              <p class="text-emerald-900">Bấm nút bên dưới hoặc chọn biểu tượng <strong>"Cài đặt ứng dụng"</strong> trên thanh địa chỉ trình duyệt.</p>
              <button onclick="promptNativeInstall()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl shadow mt-1">
                📲 Cài Đặt Trực Tiếp Ngay
              </button>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-slate-100">
              <a href="/inbound-mobile.html" target="_blank" class="text-blue-600 hover:underline font-bold flex items-center space-x-1">
                <i class="fa-solid fa-camera"></i>
                <span>Mở Giao Diện Quét Kho Di Động ↗</span>
              </a>
              <button onclick="document.getElementById('pdxInstallAppModal').classList.add('hidden')" class="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-1.5 rounded-lg">Đóng</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);

    const input = document.getElementById('pdxCommandInput');
    if (input) {
      input.addEventListener('input', () => renderCommandPaletteList(input.value));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeCommandPalette();
        } else if (e.key === 'Enter') {
          const firstBtn = document.querySelector('#pdxCommandList button');
          if (firstBtn) firstBtn.click();
        }
      });
    }
  }

  function openLayoutGalleryModal() {
    injectEnterpriseModals();
    const modal = document.getElementById('pdxLayoutGalleryModal');
    if (modal) modal.classList.remove('hidden');
  }
  window.openLayoutGalleryModal = openLayoutGalleryModal;

  function closeLayoutGalleryModal() {
    const modal = document.getElementById('pdxLayoutGalleryModal');
    if (modal) modal.classList.add('hidden');
  }
  window.closeLayoutGalleryModal = closeLayoutGalleryModal;

  function openLaunchpadAppGridModal() {
    injectEnterpriseModals();
    const modal = document.getElementById('pdxLaunchpadGridModal');
    if (modal) modal.classList.remove('hidden');
  }
  window.openLaunchpadAppGridModal = openLaunchpadAppGridModal;

  function closeLaunchpadAppGridModal() {
    const modal = document.getElementById('pdxLaunchpadGridModal');
    if (modal) modal.classList.add('hidden');
  }
  window.closeLaunchpadAppGridModal = closeLaunchpadAppGridModal;

  function openCommandPalette() {
    injectEnterpriseModals();
    const modal = document.getElementById('pdxCommandPaletteModal');
    const input = document.getElementById('pdxCommandInput');
    if (!modal || !input) return;
    modal.classList.remove('hidden');
    input.value = '';
    renderCommandPaletteList('');
    setTimeout(() => input.focus(), 50);
  }
  window.openCommandPalette = openCommandPalette;

  function closeCommandPalette() {
    const modal = document.getElementById('pdxCommandPaletteModal');
    if (modal) modal.classList.add('hidden');
  }
  window.closeCommandPalette = closeCommandPalette;

  function normalizeText(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  }

  function renderCommandPaletteList(query) {
    const listEl = document.getElementById('pdxCommandList');
    if (!listEl) return;
    const rawQ = String(query || '').trim();
    const q = normalizeText(rawQ);

    let html = '';

    if (rawQ.length >= 5 && /^[A-Za-z0-9-]+$/.test(rawQ)) {
      const awbUpper = rawQ.toUpperCase();
      html += `
        <button type="button" onclick="closeCommandPalette(); if(window.openPhotoLookupModal) window.openPhotoLookupModal('${awbUpper}');" class="pdx-cmd-item w-full flex items-center justify-between p-3 rounded-xl text-left border border-transparent">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-lg bg-teal-950 text-teal-400 flex items-center justify-center"><i class="fa-solid fa-camera"></i></div>
            <div>
              <div class="text-xs font-black text-slate-900">Tra cứu nhanh Hình ảnh & Vận đơn AWB: <span class="text-teal-600 font-mono">${awbUpper}</span></div>
              <div class="text-[10px] text-slate-500">Mở ngay thông tin kiện hàng, cân nặng & ảnh chụp bằng chứng</div>
            </div>
          </div>
          <span class="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-lg">Enter ↵</span>
        </button>
        <button type="button" onclick="closeCommandPalette(); window.open('/track.html?awb=${encodeURIComponent(awbUpper)}', '_blank');" class="pdx-cmd-item w-full flex items-center justify-between p-3 rounded-xl text-left border border-transparent">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-lg bg-blue-950 text-blue-400 flex items-center justify-center"><i class="fa-solid fa-satellite-dish"></i></div>
            <div>
              <div class="text-xs font-black text-slate-900">Mở Cổng Tracking Hành Trình cho mã: <span class="text-blue-600 font-mono">${awbUpper}</span></div>
              <div class="text-[10px] text-slate-500">Xem tiến trình vận chuyển quốc tế thời gian thực</div>
            </div>
          </div>
          <span class="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-lg">Tracking ↗</span>
        </button>
      `;
    }

    const matched = QUICK_COMMANDS.filter(item => {
      if (!q) return true;
      const hay = normalizeText(`${item.title} ${item.group} ${item.keywords}`);
      return hay.includes(q);
    });

    for (let i = 0; i < matched.length; i++) {
      const cmd = matched[i];
      html += `
        <button type="button" data-cmd-idx="${i}" class="pdx-cmd-item w-full flex items-center justify-between p-2.5 rounded-xl text-left border border-transparent">
          <div class="flex items-center space-x-3 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
              <i class="fa-solid ${cmd.icon} text-xs"></i>
            </div>
            <div class="truncate">
              <div class="text-xs font-extrabold text-slate-800 truncate">${cmd.title}</div>
              <div class="text-[10px] text-slate-400 font-semibold">${cmd.group}</div>
            </div>
          </div>
          <span class="text-[10px] text-slate-400 font-mono ml-2 flex-shrink-0">Mở →</span>
        </button>
      `;
    }

    if (!html) {
      html = `<div class="p-8 text-center text-slate-400 text-xs">Không tìm thấy chức năng phù hợp với từ khóa "${rawQ}"</div>`;
    }

    listEl.innerHTML = html;

    const buttons = listEl.querySelectorAll('button[data-cmd-idx]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-cmd-idx'));
        const target = matched[idx];
        closeCommandPalette();
        if (target && typeof target.action === 'function') {
          target.action();
        }
      });
    });
  }

  // 6. Mở Modal Hiệu năng & Sao lưu tự động
  async function openSystemHealthModal() {
    injectEnterpriseModals();
    const modal = document.getElementById('pdxSystemHealthModal');
    if (modal) modal.classList.remove('hidden');
    await refreshSystemHealthData();
  }
  window.openSystemHealthModal = openSystemHealthModal;

  function closeSystemHealthModal() {
    const modal = document.getElementById('pdxSystemHealthModal');
    if (modal) modal.classList.add('hidden');
  }
  window.closeSystemHealthModal = closeSystemHealthModal;

  async function refreshSystemHealthData() {
    try {
      const t0 = performance.now();
      const res = await fetch('/api/system/health');
      const data = await res.json();
      const latency = Math.max(1, Math.round(performance.now() - t0));

      if (data && data.success) {
        const elLookup = document.getElementById('sysMetricLookup');
        const elIndexCount = document.getElementById('sysMetricIndexCount');
        const elCacheHit = document.getElementById('sysMetricCacheHit');
        const elReads = document.getElementById('sysMetricReads');
        const elBatchSaved = document.getElementById('sysMetricBatchSaved');
        const elRam = document.getElementById('sysMetricRam');
        const elSessions = document.getElementById('sysMetricSessions');

        if (elLookup) elLookup.textContent = `${latency} ms (API)`;
        if (elIndexCount) elIndexCount.textContent = `${data.indexing.awbHashIndexSize} khóa AWB O(1)`;
        if (elCacheHit) elCacheHit.textContent = `${data.storage.cacheHitRatePercent}%`;
        if (elReads) elReads.textContent = `${data.storage.totalReads} lượt đọc (${data.storage.dataFilesSizeKb} KB)`;
        if (elBatchSaved) elBatchSaved.textContent = `${data.storage.batchedWritesSaved} lần ghi`;
        if (elRam) elRam.textContent = `${data.engine.memoryHeapMb} MB`;
        if (elSessions) elSessions.textContent = `${data.indexing.activeSessions} phiên đang hoạt động`;
      }

      const bRes = await fetch('/api/system/backups');
      const bData = await bRes.json();
      renderSystemBackupsList(bData.backups || []);
    } catch (err) {
      console.error('Lỗi tải thông số hệ thống:', err);
    }
  }

  function renderSystemBackupsList(backups) {
    const box = document.getElementById('sysBackupListContainer');
    if (!box) return;
    if (!backups || backups.length === 0) {
      box.innerHTML = `<div class="p-4 text-center text-slate-400">Chưa có bản sao lưu nào. Hãy bấm "Tạo Bản Sao Lưu Ngay".</div>`;
      return;
    }
    box.innerHTML = backups.map((b, i) => `
      <div class="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50">
        <div class="flex items-center space-x-3">
          <span class="w-6 h-6 rounded-lg ${i === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'} font-black flex items-center justify-center text-[10px]">#${i + 1}</span>
          <div>
            <div class="font-bold text-slate-800">${b.label || b.id}</div>
            <div class="text-[10px] text-slate-400 font-mono">${new Date(b.createdAt).toLocaleString('vi-VN')} • Mã: ${b.id}</div>
          </div>
        </div>
        <div class="text-right">
          <span class="bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2 py-0.5 rounded-lg text-[10px]">${b.fileCount} files • ${(b.totalBytes / 1024).toFixed(1)} KB</span>
        </div>
      </div>
    `).join('');
  }

  async function createSystemBackupNow() {
    const btn = document.getElementById('btnCreateBackupNow');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang sao lưu...</span>`;
    }
    try {
      const res = await fetch('/api/system/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Sao lưu chủ động từ Admin Console' })
      });
      const data = await res.json();
      if (data.success) {
        pdxNotify(data.message, 'success');
        renderSystemBackupsList(data.backups || []);
        await refreshSystemHealthData();
      } else {
        pdxNotify(data.message || 'Không thể tạo bản sao lưu', 'error');
      }
    } catch (e) {
      pdxNotify('Lỗi kết nối khi sao lưu dữ liệu', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span>Tạo Bản Sao Lưu Ngay</span>`;
      }
    }
  }
  window.createSystemBackupNow = createSystemBackupNow;

  // 7. Cài đặt PWA Mobile App 0đ
  function triggerInstallPwaModal() {
    injectEnterpriseModals();
    if (deferredInstallPrompt) {
      promptNativeInstall();
      return;
    }
    const modal = document.getElementById('pdxInstallAppModal');
    if (modal) modal.classList.remove('hidden');
  }
  window.triggerInstallPwaModal = triggerInstallPwaModal;

  async function promptNativeInstall() {
    if (!deferredInstallPrompt) {
      pdxNotify('Trình duyệt của anh đã cài App hoặc có thể chọn "Thêm vào Màn hình chính" trong menu trình duyệt!', 'info');
      return;
    }
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      pdxNotify('🎉 Đã cài đặt ứng dụng PandaLex TMS thành công!', 'success');
    }
    deferredInstallPrompt = null;
  }
  window.promptNativeInstall = promptNativeInstall;

  // Phím tắt toàn cục: Ctrl+K hoặc Cmd+K để mở Tìm kiếm nhanh
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
  });

  function initAllEnterpriseUx() {
    injectEnterpriseModals();
    injectFourLayoutTemplates();
    hookSwitchAdminSection();
    setTimeout(hookSwitchAdminSection, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllEnterpriseUx);
  } else {
    initAllEnterpriseUx();
  }
})();
