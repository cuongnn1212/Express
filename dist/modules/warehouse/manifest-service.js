import fs from 'fs';
import path from 'path';
import * as xlsxModule from 'xlsx';
const XLSX = xlsxModule.default || xlsxModule;
import { ShipmentRepository } from '../shipment/shipment-repository.js';
import { AuthService } from '../auth/auth-service.js';
export class ManifestService {
    static filePath = path.join(process.cwd(), 'data', 'dispatch_manifests.json');
    static manifests = [];
    static init() {
        try {
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            if (fs.existsSync(this.filePath)) {
                this.manifests = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
            }
            else {
                this.manifests = [];
                this.persist();
            }
        }
        catch (e) {
            console.error('Lỗi nạp dispatch_manifests.json:', e);
            this.manifests = [];
        }
    }
    static persist() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.manifests, null, 2), 'utf-8');
        }
        catch (e) {
            console.error('Lỗi lưu trữ dispatch_manifests.json:', e);
        }
    }
    static generateManifestId(hub) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const datePrefix = `BK-${hub}-${yyyy}${mm}${dd}`;
        const countToday = this.manifests.filter(m => m.manifestId.startsWith(datePrefix)).length + 1;
        return `${datePrefix}-${String(countToday).padStart(3, '0')}`;
    }
    /**
     * Tạo Bảng Kê Xuất Kho & Kiểm Tra Chặt Chẽ 3 Điều Kiện Tài Chính
     */
    static createManifest(req) {
        if (!req.trackingOrShipmentIds || req.trackingOrShipmentIds.length === 0) {
            return { success: false, message: 'Danh sách đơn hàng xuất kho trống' };
        }
        const blocked = [];
        const eligibleShipments = [];
        // 1. Kiểm tra từng đơn hàng qua Cổng Tài Chính 3 Điều Kiện
        for (const idOrTrk of req.trackingOrShipmentIds) {
            const s = ShipmentRepository.getById(idOrTrk);
            if (!s) {
                blocked.push({ tracking: idOrTrk, reasons: ['Không tìm thấy vận đơn trong hệ thống'] });
                continue;
            }
            const gateRes = ShipmentRepository.verifyFinancialGate(s.shipmentId);
            if (!gateRes.eligible) {
                blocked.push({
                    tracking: s.masterTrackingNumber || s.shipmentId,
                    reasons: gateRes.missingConditions
                });
            }
            else {
                eligibleShipments.push(s);
            }
        }
        // Nếu có bất kỳ đơn nào vi phạm 3 điều kiện tài chính -> Chặn xuất kho và cảnh báo rõ
        if (blocked.length > 0) {
            const firstBlocked = blocked[0];
            return {
                success: false,
                message: `⛔ Không thể xuất kho! Có ${blocked.length} đơn hàng chưa thỏa mãn đủ 3 điều kiện tài chính: [Vận đơn ${firstBlocked.tracking}: ${firstBlocked.reasons.join(', ')}]`,
                blockedShipments: blocked
            };
        }
        // 2. Tạo Bảng Kê Xuất Kho
        const manifestId = this.generateManifestId(req.hub);
        const now = new Date();
        const manifestDateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const destinationType = req.destinationType || (req.destinationHub ? 'INTERNAL_TRANSFER' : 'CARRIER_VENDOR');
        let destinationName = req.destinationName;
        if (!destinationName) {
            if (destinationType === 'INTERNAL_TRANSFER') {
                destinationName = `Kho PandaLex ${req.destinationHub === 'DAD' ? 'Đà Nẵng' : req.destinationHub === 'SGN' ? 'TP. Hồ Chí Minh' : 'Hà Nội'} (Hub ${req.destinationHub || 'DAD'})`;
            }
            else if (destinationType === 'LOCAL_DELIVERY') {
                destinationName = 'Đại lý vận chuyển / Nhà xe trung chuyển';
            }
            else {
                destinationName = `Đại diện Hãng ${req.carrier} Express`;
            }
        }
        let totalPieces = 0;
        let totalActualWeightKg = 0;
        let totalChargeableWeightKg = 0;
        let totalDeclaredValueUsd = 0;
        let totalCostPrice = 0;
        let totalSellPrice = 0;
        const manifestItems = eligibleShipments.map((s, idx) => {
            const isMps = s.pieces && s.pieces.length > 1;
            const childs = isMps ? s.pieces.map(p => p.trackingNumber).filter(t => t && t !== s.masterTrackingNumber) : [];
            const actWt = Number(s.totalWeightKg) || 0;
            const chgWt = Number(s.chargeableWeightKg) || actWt;
            const val = Number(s.totalCustomsValue) || 0;
            const cost = Number(s.costPrice) || Math.round((s.sellPrice || 0) * 0.75);
            const sell = Number(s.sellPrice) || 0;
            totalPieces += Number(s.totalPieces) || 1;
            totalActualWeightKg += actWt;
            totalChargeableWeightKg += chgWt;
            totalDeclaredValueUsd += val;
            totalCostPrice += cost;
            totalSellPrice += sell;
            return {
                stt: idx + 1,
                shipmentId: s.shipmentId,
                masterTrackingNumber: s.masterTrackingNumber || s.shipmentId,
                childTrackingNumbers: childs,
                customerCode: s.customerCode || 'PDL-GUEST',
                customerName: s.customerName || s.shipFrom?.companyName || s.shipFrom?.contactName || '-',
                recipientName: s.shipTo?.contactName || s.recipient?.name || '-',
                destinationCountry: s.shipTo?.countryCode || s.shipTo?.countryName || 'US',
                serviceName: s.serviceName || `${s.carrier} Express`,
                piecesCount: Number(s.totalPieces) || 1,
                actualWeightKg: Math.round(actWt * 10) / 10,
                volumetricWeightKg: Number(s.volumetricWeightKg) || 0,
                chargeableWeightKg: Math.round(chgWt * 10) / 10,
                declaredValueUsd: Math.round(val * 10) / 10,
                financialCategory: s.financialCategory || 'IMMEDIATE',
                costPrice: cost,
                sellPrice: sell,
                notes: s.notes,
                financialVerified: true
            };
        });
        const manifest = {
            manifestId,
            manifestDate: now.toISOString(),
            manifestDateFormatted,
            hub: req.hub,
            destinationType,
            destinationName,
            destinationHub: req.destinationHub,
            carrier: req.carrier,
            courierDriverName: req.courierDriverName || 'Đại diện Bên nhận',
            courierDriverPhone: req.courierDriverPhone || '',
            vehiclePlate: req.vehiclePlate || '',
            dispatcherStaffName: req.dispatcherStaffName || 'Thủ Kho PandaLex',
            notes: req.notes,
            totalShipments: eligibleShipments.length,
            totalPieces,
            totalActualWeightKg: Math.round(totalActualWeightKg * 10) / 10,
            totalChargeableWeightKg: Math.round(totalChargeableWeightKg * 10) / 10,
            totalDeclaredValueUsd: Math.round(totalDeclaredValueUsd * 10) / 10,
            totalCostPrice,
            totalSellPrice,
            shipments: manifestItems,
            status: 'DISPATCHED',
            createdAt: now.toISOString()
        };
        this.manifests.unshift(manifest);
        this.persist();
        // 3. Cập nhật trạng thái từng đơn hàng sang OUTBOUND_DISPATCHED
        eligibleShipments.forEach(s => {
            const dispatchNote = destinationType === 'INTERNAL_TRANSFER'
                ? `Đã xuất kho chuyển Hub từ ${req.hub} đến ${destinationName} theo Bảng kê ${manifestId}`
                : `Đã xuất kho bàn giao ${destinationName} theo Bảng kê ${manifestId}`;
            ShipmentRepository.updateOperationalStatus(s.shipmentId, 'OUTBOUND_DISPATCHED', {
                operator: req.dispatcherStaffName,
                hub: req.hub,
                manifestId,
                note: dispatchNote
            });
            // Giữ tương thích ngược với status cũ
            ShipmentRepository.updateStatus(s.shipmentId, 'DISPATCHED');
        });
        AuthService.logAction({
            userId: req.dispatcherStaffName,
            username: req.dispatcherStaffName,
            userRole: 'WAREHOUSE',
            action: 'CREATE_DISPATCH_MANIFEST',
            targetId: manifestId,
            details: `Đã lập Bảng kê xuất kho ${manifestId} (${eligibleShipments.length} vận đơn, ${totalPieces} kiện, ${manifest.totalChargeableWeightKg}kg) xuất đến ${destinationName} (Tài xế: ${req.courierDriverName})`,
            hub: req.hub
        });
        return {
            success: true,
            message: `✅ Lập Bảng kê xuất kho ${manifestId} thành công! Đã xuất ${eligibleShipments.length} đơn hàng (${totalPieces} kiện) đến [${destinationName}].`,
            manifest
        };
    }
    static getAll() {
        return this.manifests;
    }
    static getById(manifestId) {
        if (!manifestId)
            return undefined;
        const clean = manifestId.trim().toUpperCase();
        return this.manifests.find(m => m.manifestId.toUpperCase() === clean);
    }
    /**
     * Tạo giao diện HTML In Bảng Kê Xuất Kho khổ A4 chuẩn
     */
    static renderManifestHtml(manifest) {
        const destTypeBadge = manifest.destinationType === 'INTERNAL_TRANSFER'
            ? '<span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Chuyển Kho Nội Bộ</span>'
            : manifest.destinationType === 'LOCAL_DELIVERY'
                ? '<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Đại Lý Trung Chuyển</span>'
                : '<span style="background: #ecfdf5; color: #047857; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Bàn Giao Hãng/NCC</span>';
        const rowsHtml = manifest.shipments.map(it => {
            const hasChilds = it.childTrackingNumbers && it.childTrackingNumbers.length > 0;
            const childBadges = hasChilds
                ? `<div class="child-awbs"><span class="badge-mps">MPS ${it.piecesCount} Kiện:</span> ${it.childTrackingNumbers.join(', ')}</div>`
                : '';
            const finBadge = it.financialCategory === 'WALLET'
                ? '<span style="color: #2563eb; font-weight: bold;">Trừ ví</span>'
                : it.financialCategory === 'POSTPAID'
                    ? '<span style="color: #d97706; font-weight: bold;">Trả sau</span>'
                    : '<span style="color: #16a34a; font-weight: bold;">Tiền ngay</span>';
            return `
        <tr>
          <td style="text-align: center;">${it.stt}</td>
          <td>
            <div class="master-trk">${it.masterTrackingNumber}</div>
            ${childBadges}
          </td>
          <td>
            <div class="cust-code">[${it.customerCode}]</div>
            <div class="cust-name">${it.customerName}</div>
          </td>
          <td>
            <div class="recip-name">${it.recipientName}</div>
            <div class="dest-country">${it.destinationCountry}</div>
          </td>
          <td style="text-align: center; font-size: 7.5pt;">${it.serviceName}</td>
          <td style="text-align: center; font-size: 7.5pt;">${finBadge}</td>
          <td style="text-align: center; font-weight: bold;">${it.piecesCount}</td>
          <td style="text-align: right;">${it.actualWeightKg.toFixed(1)}</td>
          <td style="text-align: right; font-weight: bold; color: #0f172a;">${it.chargeableWeightKg.toFixed(1)}</td>
          <td style="text-align: right; font-size: 7.5pt;">${(it.costPrice || 0).toLocaleString('vi-VN')} đ</td>
          <td style="text-align: right; font-size: 7.5pt; font-weight: bold; color: #1e3a8a;">${(it.sellPrice || 0).toLocaleString('vi-VN')} đ</td>
          <td style="font-size: 7pt; color: #64748b;">${it.notes || '-'}</td>
        </tr>
      `;
        }).join('');
        return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Bảng Kê Xuất Kho - ${manifest.manifestId}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 8.5pt;
      line-height: 1.3;
      color: #0f172a;
      background: #f1f5f9;
      margin: 0;
      padding: 15px;
    }
    .sheet {
      background: #fff;
      max-width: 297mm;
      min-height: 210mm;
      margin: 0 auto;
      padding: 10mm 12mm;
      box-sizing: border-box;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; margin: 0; padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
    .header-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .logo-title h1 {
      margin: 0;
      font-size: 15pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .logo-title p {
      margin: 2px 0 0 0;
      font-size: 8pt;
      color: #64748b;
    }
    .manifest-badge {
      text-align: right;
    }
    .manifest-badge .num {
      font-family: monospace;
      font-size: 13pt;
      font-weight: bold;
      color: #1e3a8a;
    }
    .manifest-badge .date {
      font-size: 8pt;
      color: #475569;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr 1fr;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      font-size: 8pt;
    }
    .meta-item {
      display: flex;
      margin-bottom: 3px;
    }
    .meta-item .label {
      width: 120px;
      color: #64748b;
      font-weight: bold;
    }
    .meta-item .val {
      font-weight: bold;
      color: #0f172a;
    }
    table.manifest-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      margin-bottom: 12px;
    }
    table.manifest-table th {
      background: #0f172a;
      color: #fff;
      padding: 5px 4px;
      border: 1px solid #0f172a;
      font-size: 7pt;
      text-transform: uppercase;
    }
    table.manifest-table td {
      border: 1px solid #cbd5e1;
      padding: 4px 4px;
      vertical-align: middle;
    }
    table.manifest-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .master-trk {
      font-family: monospace;
      font-weight: bold;
      color: #1e3a8a;
      font-size: 8pt;
    }
    .child-awbs {
      font-size: 6.5pt;
      color: #64748b;
      margin-top: 1px;
      font-family: monospace;
    }
    .badge-mps {
      background: #e0e7ff;
      color: #3730a3;
      padding: 1px 3px;
      border-radius: 3px;
      font-weight: bold;
    }
    .cust-code {
      font-family: monospace;
      font-weight: bold;
      color: #2563eb;
      font-size: 7pt;
    }
    .cust-name {
      font-size: 7pt;
      color: #334155;
    }
    .dest-country {
      font-weight: bold;
      color: #dc2626;
      font-size: 7pt;
    }
    .totals-row td {
      background: #e2e8f0 !important;
      font-weight: 900;
      color: #0f172a;
      padding: 5px 4px;
      border-top: 2px solid #0f172a !important;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 15px;
      text-align: center;
    }
    .sig-box {
      border: 1px dashed #94a3b8;
      border-radius: 8px;
      padding: 10px;
      min-height: 100px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .sig-title {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 8pt;
    }
    .sig-sub {
      font-size: 7pt;
      color: #64748b;
      margin-top: 2px;
    }
    .sig-name {
      font-weight: bold;
      font-size: 8.5pt;
      margin-top: 40px;
      border-top: 1px solid #cbd5e1;
      padding-top: 3px;
    }
    .btn {
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 11px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
  </style>
</head>
<body>

  <div class="no-print" style="max-width: 297mm; margin: 0 auto 10px auto; display: flex; justify-content: space-between; align-items: center;">
    <a href="/admin.html" class="btn" style="background: #fff; border: 1px solid #cbd5e1; color: #334155;">← Quay Lại Bảng Quản Trị</a>
    <div style="display: flex; gap: 8px;">
      <a href="/api/warehouse/manifests/${manifest.manifestId}/excel" class="btn" style="background: #107c41; color: #fff;">📥 Tải File Excel (.xlsx)</a>
      <button onclick="window.print()" class="btn" style="background: #0f172a; color: #fff; border: none;">🖨️ In Bảng Kê (Khổ A4 Ngang)</button>
    </div>
  </div>

  <div class="sheet">
    <div class="header-box">
      <div class="logo-title">
        <h1>PANDALEX EXPRESS LOGISTICS</h1>
        <p>HỆ THỐNG VẬN HÀNH KHO BÃI & ĐIỀU PHỐI VẬN CHUYỂN TOÀN CẦU</p>
      </div>
      <div class="manifest-badge">
        <div style="font-size: 8pt; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 2px;">
          BẢNG KÊ XUẤT KHO / HANDOVER MANIFEST
        </div>
        <div class="num">${manifest.manifestId}</div>
        <div class="date">Thời gian: ${manifest.manifestDateFormatted}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div>
        <div class="meta-item">
          <span class="label">Kho/Hub xuất:</span>
          <span class="val">HUB ${manifest.hub} (PandaLex ${manifest.hub === 'HAN' ? 'Hà Nội' : manifest.hub === 'SGN' ? 'TP. Hồ Chí Minh' : 'Đà Nẵng'})</span>
        </div>
        <div class="meta-item">
          <span class="label">Nơi đến (Đích):</span>
          <span class="val" style="color: #b91c1c; font-size: 9pt;">${manifest.destinationName}</span>
        </div>
        <div class="meta-item">
          <span class="label">Phân loại xuất:</span>
          <span class="val">${destTypeBadge}</span>
        </div>
      </div>
      <div>
        <div class="meta-item">
          <span class="label">Hãng / Đối tác:</span>
          <span class="val" style="color: #2563eb;">${manifest.carrier} EXPRESS</span>
        </div>
        <div class="meta-item">
          <span class="label">Thủ kho lập:</span>
          <span class="val">${manifest.dispatcherStaffName}</span>
        </div>
        <div class="meta-item">
          <span class="label">Ghi chú chuyến:</span>
          <span class="val">${manifest.notes || '-'}</span>
        </div>
      </div>
      <div>
        <div class="meta-item">
          <span class="label">Người/Tài xế nhận:</span>
          <span class="val">${manifest.courierDriverName}</span>
        </div>
        <div class="meta-item">
          <span class="label">SĐT liên hệ:</span>
          <span class="val">${manifest.courierDriverPhone || '-'}</span>
        </div>
        <div class="meta-item">
          <span class="label">Biển số phương tiện:</span>
          <span class="val">${manifest.vehiclePlate || 'Xe trung chuyển'}</span>
        </div>
      </div>
    </div>

    <table class="manifest-table">
      <thead>
        <tr>
          <th style="width: 25px;">STT</th>
          <th>Mã Vận Đơn (Master / MPS)</th>
          <th>Khách Hàng</th>
          <th>Người Nhận / Nước</th>
          <th style="width: 70px;">Dịch Vụ</th>
          <th style="width: 50px;">Kênh TT</th>
          <th style="width: 30px;">Kiện</th>
          <th style="width: 45px;">TL Thực</th>
          <th style="width: 45px;">TL Tính Cước</th>
          <th style="width: 65px;">Cước Vốn</th>
          <th style="width: 65px;">Cước Thu KH</th>
          <th style="width: 90px;">Ghi Chú</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="totals-row">
          <td colspan="6" style="text-align: right; text-transform: uppercase;">TỔNG CỘNG (${manifest.totalShipments} LÔ HÀNG):</td>
          <td style="text-align: center;">${manifest.totalPieces}</td>
          <td style="text-align: right;">${manifest.totalActualWeightKg.toFixed(1)}kg</td>
          <td style="text-align: right;">${manifest.totalChargeableWeightKg.toFixed(1)}kg</td>
          <td style="text-align: right;">${(manifest.totalCostPrice || 0).toLocaleString('vi-VN')} đ</td>
          <td style="text-align: right; color: #1e3a8a;">${(manifest.totalSellPrice || 0).toLocaleString('vi-VN')} đ</td>
          <td style="text-align: center; color: #16a34a;">ĐÃ KIỂM SOÁT</td>
        </tr>
      </tbody>
    </table>

    <div style="font-size: 7pt; color: #475569; margin-top: -6px; margin-bottom: 10px;">
      * Cam kết kiểm soát xuất kho: 100% vận đơn đã xác nhận đủ 3 điều kiện (1. Đã thanh toán / duyệt nợ, 2. Đã trừ tiền ví / hạn mức, 3. Khách hàng cam kết trách nhiệm thuế). Bên nhận có trách nhiệm kiểm đếm số kiện và nguyên vẹn niêm phong.
    </div>

    <div class="signatures-grid">
      <div class="sig-box">
        <div>
          <div class="sig-title">ĐẠI DIỆN PANDALEX EXPRESS (BÊN GIAO)</div>
          <div class="sig-sub">(Ký, ghi rõ họ tên và xác nhận xuất kho)</div>
        </div>
        <div class="sig-name">${manifest.dispatcherStaffName}</div>
      </div>
      <div class="sig-box">
        <div>
          <div class="sig-title">ĐẠI DIỆN BÊN NHẬN (${manifest.destinationName})</div>
          <div class="sig-sub">(Ký, ghi rõ họ tên và xác nhận đã nhận đủ hàng)</div>
        </div>
        <div class="sig-name">${manifest.courierDriverName}</div>
      </div>
    </div>
  </div>

</body>
</html>
    `;
    }
    /**
     * Xuất Bảng Kê Xuất Kho ra file Excel (.xlsx)
     */
    static exportManifestExcel(manifest) {
        const rows = manifest.shipments.map(it => ({
            'STT': it.stt,
            'Mã Vận Đơn (Master AWB)': it.masterTrackingNumber,
            'Vận Đơn Phụ (Child AWB MPS)': it.childTrackingNumbers.join(', '),
            'Mã Khách Hàng': it.customerCode,
            'Tên Khách Hàng': it.customerName,
            'Người Nhận': it.recipientName,
            'Quốc Gia Đến': it.destinationCountry,
            'Dịch Vụ': it.serviceName,
            'Kênh Thanh Toán': it.financialCategory === 'WALLET' ? 'Trừ ví điện tử' : it.financialCategory === 'POSTPAID' ? 'Thanh toán sau' : 'Thanh toán ngay',
            'Số Kiện': it.piecesCount,
            'Trọng Lượng Thực (kg)': it.actualWeightKg,
            'Trọng Lượng Tính Cước (kg)': it.chargeableWeightKg,
            'Trị Giá Khai Báo (USD)': it.declaredValueUsd,
            'Cước Vốn Trả Hãng (VNĐ)': it.costPrice || 0,
            'Cước Bán Thu Khách (VNĐ)': it.sellPrice || 0,
            'Nơi Đến Cụ Thể': manifest.destinationName,
            'Ghi Chú': it.notes || ''
        }));
        // Thêm dòng tổng cộng
        rows.push({
            'STT': 'TỔNG CỘNG',
            'Mã Vận Đơn (Master AWB)': `${manifest.totalShipments} Lô hàng`,
            'Vận Đơn Phụ (Child AWB MPS)': '',
            'Mã Khách Hàng': '',
            'Tên Khách Hàng': '',
            'Người Nhận': '',
            'Quốc Gia Đến': '',
            'Dịch Vụ': '',
            'Kênh Thanh Toán': '',
            'Số Kiện': manifest.totalPieces,
            'Trọng Lượng Thực (kg)': manifest.totalActualWeightKg,
            'Trọng Lượng Tính Cước (kg)': manifest.totalChargeableWeightKg,
            'Trị Giá Khai Báo (USD)': manifest.totalDeclaredValueUsd,
            'Cước Vốn Trả Hãng (VNĐ)': manifest.totalCostPrice || 0,
            'Cước Bán Thu Khách (VNĐ)': manifest.totalSellPrice || 0,
            'Nơi Đến Cụ Thể': manifest.destinationName,
            'Ghi Chú': 'Bảng kê xuất kho hợp lệ'
        });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        // Set độ rộng cột
        ws['!cols'] = [
            { wch: 6 }, // STT
            { wch: 22 }, // Master
            { wch: 26 }, // Child
            { wch: 14 }, // Cust Code
            { wch: 22 }, // Cust Name
            { wch: 18 }, // Recipient
            { wch: 12 }, // Country
            { wch: 18 }, // Service
            { wch: 16 }, // Channel
            { wch: 10 }, // Pieces
            { wch: 18 }, // Act Wt
            { wch: 20 }, // Chg Wt
            { wch: 18 }, // Value
            { wch: 22 }, // Cost Price
            { wch: 22 }, // Sell Price
            { wch: 28 }, // Destination
            { wch: 25 } // Notes
        ];
        XLSX.utils.book_append_sheet(wb, ws, manifest.manifestId);
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
}
ManifestService.init();
