/**
 * ============================================================================
 * PANDALEX EXPRESS — ENTERPRISE UX, COMMAND PALETTE & SYSTEM MONITOR v4.0
 * Tối ưu trải nghiệm điều hành, tìm kiếm tức thì (Ctrl+K), cài đặt PWA 0đ
 * và giám sát bộ đệm Atomic Storage + Sao lưu tự động.
 * ============================================================================
 */

(function () {
  'use strict';

  // Danh mục đầy đủ các chức năng điều hành để tìm kiếm nhanh (Ctrl+K)
  const QUICK_COMMANDS = [
    { id: 'dashboard', title: '0.1 Dashboard Tổng Quan & KPI', group: 'Tổng Quan', icon: 'fa-chart-pie text-blue-400', action: () => window.switchAdminSection && window.switchAdminSection('dashboard'), keywords: 'dashboard kpi tong quan bao cao' },
    { id: 'excelPricingTool', title: '2.3 Tool Tính Giá Bằng Excel (AWB + Kg)', group: 'Công Cụ Nổi Bật', icon: 'fa-file-excel text-emerald-400', action: () => window.switchAdminSection && window.switchAdminSection('excelPricingTool'), keywords: 'excel tinh gia awb kg hang loat' },
    { id: 'cashBook', title: '3.8 Sổ Quỹ Thu - Chi & Phiếu Thu/Chi', group: 'Tài Chính & Sổ Quỹ', icon: 'fa-book-bookmark text-amber-400', action: () => window.switchAdminSection && window.switchAdminSection('cashBook'), keywords: 'so quy thu chi phieu thu phieu chi tien mat ngan hang' },
    { id: 'createShipment', title: '2.1 Tạo Đơn Hàng & In Tem AWB', group: 'Vận Hành & Kho', icon: 'fa-file-circle-plus text-emerald-400', action: () => window.switchAdminSection && window.switchAdminSection('createShipment'), keywords: 'tao don in tem awb ups fedex' },
    { id: 'shipments', title: '2.2 Quản Lý Đơn Hàng Toàn Hệ Thống', group: 'Vận Hành & Kho', icon: 'fa-boxes-stacked text-amber-400', action: () => window.switchAdminSection && window.switchAdminSection('shipments'), keywords: 'quan ly don hang danh sach van don awb' },
    { id: 'warehouse', title: '2.4 Kho Bãi & Scan Inbound / Đóng Bao', group: 'Vận Hành & Kho', icon: 'fa-warehouse text-blue-400', action: () => window.switchAdminSection && window.switchAdminSection('warehouse'), keywords: 'kho bai scan inbound dong bao xuat kho manifest' },
    { id: 'awbManagement', title: '2.6 Quản Lý Vận Đơn AWB (UPS/FedEx)', group: 'Vận Hành & Kho', icon: 'fa-barcode text-rose-400', action: () => window.switchAdminSection && window.switchAdminSection('awbManagement'), keywords: 'awb ups fedex ma van don' },
    { id: 'photoLookup', title: '2.8 Tra Cứu Hình Ảnh AWB (Cloud R2)', group: 'Vận Hành & Kho', icon: 'fa-camera text-teal-400', action: () => window.openPhotoLookupModal && window.openPhotoLookupModal(), keywords: 'anh chup hinh anh awb camera' },
    { id: 'inboundMobile', title: '2.9 Mở Giao Diện Quét Kho Di Động (Camera OCR)', group: 'Vận Hành & Kho', icon: 'fa-mobile-screen-button text-sky-400', action: () => window.open('/inbound-mobile.html', '_blank'), keywords: 'mobile app dien thoai camera ocr quet kho' },
    { id: 'rateTables', title: '1.1 Bảng Giá & Biểu Cước Hãng (UPS / FedEx)', group: 'Cài Đặt & Biểu Cước', icon: 'fa-table-cells text-cyan-400', action: () => window.switchAdminSection && window.switchAdminSection('rateTables'), keywords: 'bang gia bieu cuoc ups fedex viettel' },
    { id: 'customers', title: '1.2 Khách Hàng (Master Data & Báo Giá)', group: 'Cài Đặt & Biểu Cước', icon: 'fa-address-book text-sky-400', action: () => window.switchAdminSection && window.switchAdminSection('customers'), keywords: 'khach hang master data danh ba' },
    { id: 'hubs', title: '1.3 Văn Phòng / Chi Nhánh / Hub (SGN-HAN-DAD)', group: 'Cài Đặt & Biểu Cước', icon: 'fa-building-columns text-amber-400', action: () => window.switchAdminSection && window.switchAdminSection('hubs'), keywords: 'chi nhanh hub van phong sgn han dad' },
    { id: 'geography', title: '1.4 Vị Trí Địa Lý & Vùng Phủ Sóng (Zones)', group: 'Cài Đặt & Biểu Cước', icon: 'fa-earth-americas text-emerald-400', action: () => window.switchAdminSection && window.switchAdminSection('geography'), keywords: 'dia ly zone quoc gia vung tinh cuoc' },
    { id: 'surcharges', title: '1.5 Phụ Phí Xăng Dầu (FSC) & Vùng Xa', group: 'Cài Đặt & Biểu Cước', icon: 'fa-gas-pump text-rose-400', action: () => window.switchAdminSection && window.switchAdminSection('surcharges'), keywords: 'phu phi xang dau fsc vung xa' },
    { id: 'customsConfig', title: '1.6 Quản Lý Phí Hải Quan & Hàng Khó', group: 'Cài Đặt & Biểu Cước', icon: 'fa-sliders text-purple-400', action: () => window.openModalCustomsCargoConfig && window.openModalCustomsCargoConfig(), keywords: 'hai quan hang kho phu phi' },
    { id: 'audit', title: '1.7 Phân Quyền Tài Khoản & Nhật Ký Audit Logs', group: 'Quản Trị & Bảo Mật', icon: 'fa-shield-halved text-indigo-400', action: () => window.switchAdminSection && window.switchAdminSection('audit'), keywords: 'phan quyen tai khoan user audit log bao mat' },
    { id: 'permissionsPage', title: '1.8 Mở Ma Trận Phân Quyền Đầy Đủ (7 Roles x 34 Menus)', group: 'Quản Trị & Bảo Mật', icon: 'fa-key text-purple-400', action: () => window.open('/permissions.html', '_blank'), keywords: 'ma tran phan quyen rbac roles' },
    { id: 'codeVsSell', title: '3.1 Quản Lý Giá Code (Cost Hãng) vs Giá Bán', group: 'Tài Chính & Sổ Quỹ', icon: 'fa-scale-balanced text-amber-400', action: () => window.switchAdminSection && window.switchAdminSection('codeVsSell'), keywords: 'gia code gia von gia ban loi nhuan' },
    { id: 'markupConfig', title: '3.2 Quản Lý Giá Bán & Gộp Giá (Markup)', group: 'Tài Chính & Sổ Quỹ', icon: 'fa-arrow-trend-up text-emerald-400', action: () => window.switchAdminSection && window.switchAdminSection('markupConfig'), keywords: 'gop gia markup chiet khau' },
    { id: 'agents', title: '3.3 Quản Lý Đại Lý & Chính Sách Chiết Khấu', group: 'Tài Chính & Sổ Quỹ', icon: 'fa-handshake-angle text-cyan-400', action: () => window.switchAdminSection && window.switchAdminSection('agents'), keywords: 'dai ly agent chiet khau' },
    { id: 'carrierPartners', title: '3.4 Nhà Cung Cấp & Sổ Ký Quỹ Hãng', group: 'Tài Chính & Sổ Quỹ', icon: 'fa-truck-plane text-teal-400', action: () => window.switchAdminSection && window.switchAdminSection('carrierPartners'), keywords: 'nha cung cap ky quy hang ups fedex' },
    { id: 'finance', title: '3.5 Công Nợ, Thu Cước & Duyệt Tài Chính Xuất Kho', group: 'Tài Chính & Sổ Quỹ', icon: 'fa-file-invoice-dollar text-emerald-400', action: () => window.switchAdminSection && window.switchAdminSection('finance'), keywords: 'cong no thu cuoc duyet xuat kho financial gate' },
    { id: 'walletTopup', title: '3.6 Quản Lý Top-Up Ví Điện Tử Đại Lý', group: 'Tài Chính & Sổ Quỹ', icon: 'fa-money-bill-transfer text-indigo-400', action: () => window.switchAdminSection && window.switchAdminSection('walletTopup'), keywords: 'nap vi topup vi dai ly' },
    { id: 'reconciliation', title: '3.7 Đối Soát Công Nợ Hai Chiều (AR vs AP)', group: 'Tài Chính & Sổ Quỹ', icon: 'fa-receipt text-rose-400', action: () => window.switchAdminSection && window.switchAdminSection('reconciliation'), keywords: 'doi soat cong no ar ap' },
    { id: 'contracts', title: '4.1 Quản Lý Khách Hàng Hợp Đồng', group: 'CRM & Hợp Đồng', icon: 'fa-file-signature text-sky-400', action: () => window.switchAdminSection && window.switchAdminSection('contracts'), keywords: 'hop dong khach hang tra sau' },
    { id: 'approval', title: '4.2 Phê Duyệt Tài Khoản & Hạn Mức Tín Dụng', group: 'CRM & Hợp Đồng', icon: 'fa-user-check text-emerald-400', action: () => window.switchAdminSection && window.switchAdminSection('approval'), keywords: 'phe duyet han muc tin dung' },
    { id: 'commitments', title: '4.3 Cam Kết Sản Lượng & Khách VIP', group: 'CRM & Hợp Đồng', icon: 'fa-award text-amber-400', action: () => window.switchAdminSection && window.switchAdminSection('commitments'), keywords: 'cam ket san luong vip' },
    { id: 'customerCommunication', title: '4.4 Trung Tâm Giao Tiếp & Hỗ Trợ CSKH', group: 'CRM & Hợp Đồng', icon: 'fa-headset text-rose-400', action: () => window.switchAdminSection && window.switchAdminSection('customerCommunication'), keywords: 'cskh chat ticket ho tro' },
    { id: 'biAnalytics', title: '5.3 Báo Cáo Phân Tích Lãi Lỗ & BI Analytics', group: 'Mở Rộng & BI', icon: 'fa-chart-line text-purple-400', action: () => window.switchAdminSection && window.switchAdminSection('biAnalytics'), keywords: 'bao cao bi analytics phan tich lai lo' },
    { id: 'systemHealth', title: '⚡ Trung Tâm Hiệu Năng & Sao Lưu Dữ Liệu Tự Động', group: 'Hạ Tầng Hệ Thống', icon: 'fa-server text-emerald-400', action: () => openSystemHealthModal(), keywords: 'backup sao luu hieu nang cache he thong' }
  ];

  let deferredInstallPrompt = null;

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
    }, 4000);
  }
  window.pdxNotify = pdxNotify;

  // 3. Khởi tạo Thanh Tìm Nhanh (Ctrl+K) & Nút Trạng Thái Hệ Thống trên Header
  function injectEnterpriseHeaderTools() {
    const header = document.querySelector('header.bg-slate-950');
    if (!header || document.getElementById('pdxQuickSearchTrigger')) return;

    const rightBox = header.querySelector('div.flex.items-center.space-x-2.text-xs');
    if (!rightBox) return;

    // Nút Tìm Nhanh Chức Năng & AWB (Ctrl + K)
    const searchBtn = document.createElement('button');
    searchBtn.id = 'pdxQuickSearchTrigger';
    searchBtn.type = 'button';
    searchBtn.onclick = openCommandPalette;
    searchBtn.className = 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 px-2.5 py-1.5 rounded-xl transition flex items-center space-x-2 shadow-sm cursor-pointer';
    searchBtn.title = 'Tìm nhanh mọi chức năng hoặc tra cứu mã AWB (Phím tắt: Ctrl+K hoặc ⌘K)';
    searchBtn.innerHTML = `
      <i class="fa-solid fa-magnifying-glass text-sky-400"></i>
      <span class="hidden md:inline font-semibold text-slate-300">Tìm nhanh...</span>
      <kbd class="hidden sm:inline-block text-[9px] bg-slate-800 text-amber-400 border border-slate-700 px-1.5 py-0.5 rounded font-mono font-black">⌘K</kbd>
    `;

    // Nút Hiệu Năng & Sao Lưu Tự Động
    const healthBtn = document.createElement('button');
    healthBtn.id = 'pdxSystemHealthTrigger';
    healthBtn.type = 'button';
    healthBtn.onclick = openSystemHealthModal;
    healthBtn.className = 'bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/70 px-2.5 py-1.5 rounded-xl transition flex items-center space-x-1.5 shadow-sm cursor-pointer';
    healthBtn.title = 'Kiểm tra Hiệu năng Hệ thống, Chỉ mục O(1) & Sao lưu Dữ liệu Tự động';
    healthBtn.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      <span class="hidden lg:inline font-extrabold text-[11px]">Engine 0ms</span>
      <i class="fa-solid fa-shield-heart text-emerald-400"></i>
    `;

    // Nút Cài Đặt App Di Động 0đ (PWA)
    const installBtn = document.createElement('button');
    installBtn.id = 'btnPdxInstallApp';
    installBtn.type = 'button';
    installBtn.onclick = triggerInstallPwaModal;
    installBtn.className = 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2.5 py-1.5 rounded-xl transition flex items-center space-x-1 shadow-sm cursor-pointer';
    installBtn.title = 'Cài đặt Phần mềm ra Màn hình chính Điện thoại / Máy tính (Chi phí 0đ)';
    installBtn.innerHTML = `
      <i class="fa-solid fa-mobile-screen-button"></i>
      <span class="hidden xl:inline">Cài App</span>
    `;

    rightBox.insertBefore(installBtn, rightBox.firstChild);
    rightBox.insertBefore(healthBtn, rightBox.firstChild);
    rightBox.insertBefore(searchBtn, rightBox.firstChild);
  }

  // 4. Tạo giao diện Modal Command Palette (Ctrl + K) và System Health & Backup
  function injectEnterpriseModals() {
    if (document.getElementById('pdxCommandPaletteModal')) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <!-- COMMAND PALETTE MODAL (CTRL + K) -->
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

      <!-- SYSTEM HEALTH, O(1) INDEX & AUTO-BACKUP MODAL -->
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
            <!-- 4 Chỉ số Hiệu năng Lõi -->
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

            <!-- Khu vực Sao lưu Dữ liệu (Auto-Backup) -->
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

      <!-- PWA INSTALL GUIDE MODAL (0Đ MOBILE APP) -->
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

    // Nếu người dùng nhập mã giống AWB (VD: 1Z... hoặc số >= 6 ký tự), hiển thị lối tắt tra cứu AWB tức thì
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

    // Gắn sự kiện click cho các lệnh
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

  // 5. Mở Modal Hiệu năng & Sao lưu tự động
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

  // 6. Cài đặt PWA Mobile App 0đ
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

  // Khởi tạo ngay khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectEnterpriseHeaderTools();
      injectEnterpriseModals();
    });
  } else {
    injectEnterpriseHeaderTools();
    injectEnterpriseModals();
  }
})();
