/**
 * Commercial Invoice Service (Dịch vụ Tạo & Xuất Hóa Đơn Thương Mại Chuẩn Theo Mẫu Dự Án)
 * Hỗ trợ:
 * 1. Xuất file Excel (.xlsx) chuẩn 100% theo đúng mẫu có sẵn của dự án:
 *    - INV FEDEX SPOT. MAU.xlsx
 *    - INV UPS SAVER C Vy HCM 2105... K56 2.xlsx
 *    - templates/MAU_COMMERCIAL_INVOICE_CHUAN.xlsx
 *    (Sử dụng openpyxl giữ trọn vẹn fonts, borders, alignments, column widths và formulas gốc)
 * 2. Xuất giao diện HTML A4 hiển thị chuẩn 100% y hệt bảng Excel mẫu của anh
 * 3. Hỗ trợ đầy đủ lô 1 kiện và nhiều kiện (Multi-Piece Shipment MPS)
 */
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import * as xlsxModule from 'xlsx';
const XLSX = xlsxModule.default || xlsxModule;
export class CommercialInvoiceService {
    static defaultTemplatePath = path.resolve('templates/MAU_COMMERCIAL_INVOICE_CHUAN.xlsx');
    /**
     * Sinh mã số hóa đơn tự động nếu chưa có
     */
    static generateInvoiceNumber(shipment) {
        if (!shipment)
            return `INV-${Date.now().toString().slice(-6)}`;
        if (shipment.reference1 && shipment.reference1.startsWith('INV-')) {
            return shipment.reference1;
        }
        if (shipment.invoiceNumber) {
            return shipment.invoiceNumber;
        }
        const cleanTrk = shipment.masterTrackingNumber ? shipment.masterTrackingNumber.slice(-8) : Date.now().toString().slice(-8);
        return `INV-${cleanTrk}`;
    }
    /**
     * Chuyển đổi dữ liệu vận đơn StoredShipment sang chuẩn InvoiceData
     */
    static normalizeFromShipment(s) {
        const isMps = s.pieces && s.pieces.length > 1;
        const allTrackings = isMps
            ? s.pieces.map(p => p.trackingNumber).filter(Boolean).join(' / ')
            : (s.masterTrackingNumber || '');
        const dimsSummary = isMps
            ? s.pieces.map(p => p.dimsText || `${p.lengthCm}x${p.widthCm}x${p.heightCm}`).join('; ')
            : (s.pieces && s.pieces[0] ? `${s.pieces[0].dimsText || `${s.pieces[0].lengthCm}x${s.pieces[0].widthCm}x${s.pieces[0].heightCm}`} cm` : 'Standard');
        const f = s.shipFrom || {
            contactName: s.sender?.name || 'Shipper Contact',
            companyName: 'EXPORTER COMPANY',
            phone: s.sender?.phone || '',
            email: '',
            address1: s.sender?.address || '',
            city: s.sender?.city || 'HANOI',
            postalCode: s.sender?.postalCode || '100000',
            countryName: s.sender?.country || 'VIET NAM'
        };
        const t = s.shipTo || {
            contactName: s.recipient?.name || 'Consignee Contact',
            companyName: 'IMPORTER COMPANY',
            phone: s.recipient?.phone || '',
            email: '',
            address1: s.recipient?.address || '',
            city: s.recipient?.city || 'JOLIET',
            state: s.recipient?.state || 'IL',
            postalCode: s.recipient?.postalCode || '60433',
            countryName: s.recipient?.country || 'USA'
        };
        const items = s.items && s.items.length > 0 ? s.items.map((it, idx) => ({
            itemNumber: idx + 1,
            description: it.description || 'Commodity Items',
            hsCode: it.hsCode || '4202.92.10',
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'pcs',
            originCountry: it.originCountry || 'Vietnam',
            unitValue: Number(it.unitValue) || 30,
            lineTotal: Number(it.lineTotal) || ((Number(it.quantity) || 1) * (Number(it.unitValue) || 30))
        })) : [{
                itemNumber: 1,
                description: s.itemDescription || 'Cloth Bags / Merchandise',
                hsCode: '4202.92.10',
                quantity: 1,
                unit: 'pcs',
                originCountry: 'Vietnam',
                unitValue: 30,
                lineTotal: 30
            }];
        const dateFormatted = s.dateFormatted || new Date().toLocaleDateString('en-GB');
        let subtotal = 0;
        items.forEach(it => { subtotal += Number(it.lineTotal) || 0; });
        return {
            id: `CI_${s.shipmentId || Date.now()}`,
            invoiceNumber: this.generateInvoiceNumber(s),
            invoiceDate: s.shipDate || new Date().toISOString().slice(0, 10),
            dateFormatted,
            templateType: s.carrier === 'FEDEX' ? 'FEDEX' : 'UPS',
            airWaybillNo: allTrackings,
            masterTrackingNumber: s.masterTrackingNumber,
            carrier: s.carrier || 'UPS',
            serviceName: s.carrier === 'FEDEX' ? 'FedEx Spot IP' : 'UPS Saver',
            shipperCompanyName: f.companyName || f.contactName || '',
            shipperAddress: f.address1 + (f.address2 ? ', ' + f.address2 : ''),
            shipperTownArea: f.postalCode || '100000',
            shipperStateCountry: f.countryName || 'VIET NAM',
            shipperContactName: f.contactName || f.companyName || '',
            shipperPhone: f.phone || '',
            shipperEmail: f.email || '',
            consigneeCompanyName: t.companyName || t.contactName || '',
            consigneeAddress: t.address1 + (t.address2 ? ', ' + t.address2 : '') + (t.city ? `, ${t.city}` : ''),
            consigneeCity: t.city || '',
            consigneeState: t.state || '',
            consigneePostalCode: t.postalCode || '',
            consigneeStateCountry: `${t.state ? t.state + ', ' : ''}${t.countryName || 'USA'}`,
            consigneeContactName: t.contactName || '',
            consigneePhone: t.phone || '',
            consigneeEmail: t.email || '',
            totalPackages: Number(s.totalPieces) || 1,
            totalActualWeightKg: Number(s.totalWeightKg) || 0,
            totalDimensionalWeightKg: Number(s.volumetricWeightKg) || 0,
            dimensionsSummary: dimsSummary,
            reasonForExport: s.exportReason || 'Sample / Commercial Sale',
            termsOfSale: s.incoterm || 'DAP',
            currency: s.currency || 'USD',
            shippingCharge: 0,
            insuranceCharge: 0,
            subtotal,
            totalValue: subtotal,
            items,
            signatoryName: f.contactName || f.companyName || '',
            signatoryTitle: 'Export Manager / Shipper',
            shipmentId: s.shipmentId,
            createdAt: s.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
    /**
     * Xuất Hóa Đơn Thương Mại ra file Excel (.xlsx) chuẩn 100% phôi mẫu gốc bằng openpyxl
     */
    static exportToExcel(data) {
        const tempDir = path.resolve('tmp_export');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const jsonPath = path.join(tempDir, `inv_input_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.json`);
        const xlsxPath = path.join(tempDir, `inv_out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.xlsx`);
        try {
            fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
            const scriptPath = path.resolve('scripts/fill_commercial_invoice.py');
            execSync(`python3 "${scriptPath}" "${jsonPath}" "${xlsxPath}"`, { timeout: 15000 });
            if (fs.existsSync(xlsxPath)) {
                const buffer = fs.readFileSync(xlsxPath);
                // Dọn dẹp file tạm
                try {
                    fs.unlinkSync(jsonPath);
                    fs.unlinkSync(xlsxPath);
                }
                catch (e) { }
                return buffer;
            }
        }
        catch (err) {
            console.error('Lỗi chạy fill_commercial_invoice.py, fallback về SheetJS:', err);
        }
        // Fallback nếu python lỗi:
        let templateFile = this.defaultTemplatePath;
        if (data.templateType === 'FEDEX' && fs.existsSync(path.resolve('INV FEDEX SPOT. MAU.xlsx'))) {
            templateFile = path.resolve('INV FEDEX SPOT. MAU.xlsx');
        }
        else if (data.templateType === 'UPS' && fs.existsSync(path.resolve('INV UPS SAVER C Vy HCM 2105... K56 2.xlsx'))) {
            templateFile = path.resolve('INV UPS SAVER C Vy HCM 2105... K56 2.xlsx');
        }
        const wb = XLSX.readFile(templateFile);
        const ws = wb.Sheets[wb.SheetNames[0] || 'OTHER'];
        ws['H2'] = { t: 's', v: data.dateFormatted || data.invoiceDate || '' };
        ws['H3'] = { t: 's', v: data.airWaybillNo || data.masterTrackingNumber || '' };
        ws['C4'] = { t: 's', v: data.shipperCompanyName || '' };
        ws['C5'] = { t: 's', v: data.shipperAddress || '' };
        ws['C6'] = { t: 's', v: data.shipperTownArea || '100000' };
        ws['H6'] = { t: 'n', v: Number(data.totalPackages) || 1 };
        ws['C7'] = { t: 's', v: data.shipperStateCountry || 'VIET NAM' };
        ws['C8'] = { t: 's', v: data.shipperContactName || '' };
        ws['H8'] = { t: 'n', v: Number(data.totalActualWeightKg) || 0 };
        ws['C9'] = { t: 's', v: data.shipperPhone || '' };
        ws['H10'] = { t: 's', v: data.dimensionsSummary || 'Standard' };
        if (data.templateType === 'FEDEX') {
            ws['C14'] = { t: 's', v: data.consigneeCompanyName || '' };
            ws['C15'] = { t: 's', v: data.consigneeAddress || '' };
            ws['H15'] = { t: 's', v: data.serviceName || 'FedEx Spot IP' };
            ws['C17'] = { t: 's', v: data.consigneePostalCode || '' };
            ws['C18'] = { t: 's', v: data.consigneeStateCountry || 'USA' };
            ws['C19'] = { t: 's', v: data.consigneeContactName || '' };
            ws['C20'] = { t: 's', v: data.consigneePhone || '' };
        }
        else {
            ws['C15'] = { t: 's', v: data.consigneeCompanyName || '' };
            ws['C16'] = { t: 's', v: data.consigneeAddress || '' };
            ws['H16'] = { t: 's', v: data.serviceName || 'UPS Saver' };
            ws['C18'] = { t: 's', v: data.consigneePostalCode || '' };
            ws['C19'] = { t: 's', v: data.consigneeStateCountry || 'USA' };
            ws['C20'] = { t: 's', v: data.consigneeContactName || '' };
            ws['C21'] = { t: 's', v: data.consigneePhone || '' };
            if (ws['C22'])
                ws['C22'] = { t: 's', v: data.consigneeEmail || '' };
        }
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
    /**
     * Sinh trang HTML hiển thị & In chuẩn 100% Y HỆT BẢN EXCEL MẪU CỦA ANH
     */
    static renderHtml(data) {
        const d = data;
        const dateFormatted = d.dateFormatted || d.invoiceDate || new Date().toLocaleDateString('en-GB');
        const items = d.items && d.items.length > 0 ? d.items : [{
                description: 'Used polyester wedding dress - hàng váy cưới đã qua sử dụng\n100% Polyester\nHS Code: 6309.00.00',
                quantity: 1,
                unit: 'pcs',
                originCountry: 'Vietnam',
                unitValue: 50,
                lineTotal: 50
            }];
        let subtotalCalc = 0;
        const itemRows = items.map((it) => {
            const q = Number(it.quantity) || 1;
            const u = Number(it.unitValue) || 0;
            const total = Number(it.lineTotal) || (q * u);
            subtotalCalc += total;
            const descLines = [];
            if (it.description)
                descLines.push(`<b>${it.description}</b>`);
            if (it.material && !it.description.includes(it.material))
                descLines.push(`<span>${it.material}</span>`);
            if (it.hsCode && !it.description.includes(it.hsCode))
                descLines.push(`<span style="font-size: 7.5pt; color: #1e293b;">HTS code: <b>${it.hsCode}</b></span>`);
            if (it.midCode && !it.description.includes(it.midCode))
                descLines.push(`<span style="font-size: 7.5pt; color: #1e293b;">MID code: <b>${it.midCode}</b></span>`);
            if (it.manufacturer && !it.description.includes(it.manufacturer))
                descLines.push(`<span style="font-size: 7.5pt; color: #334155;">Mnf: ${it.manufacturer}</span>`);
            if (it.factoryAddress && !it.description.includes(it.factoryAddress))
                descLines.push(`<span style="font-size: 7.5pt; color: #334155;">Add: ${it.factoryAddress}</span>`);
            const descFormatted = descLines.length > 0 ? descLines.join('<br>') : (it.description || 'Goods');
            return `
        <tr>
          <td colspan="2" style="border: 1px solid #000; border-left: 1.5px solid #000; padding: 4px 6px; font-size: 8pt; vertical-align: top; line-height: 1.35;">
            ${descFormatted}
          </td>
          <td style="border: 1px solid #000; text-align: center; font-size: 8pt; font-weight: bold; vertical-align: middle;">${q}</td>
          <td style="border: 1px solid #000; text-align: center; font-size: 8pt; vertical-align: middle;">${it.unit || 'pcs'}</td>
          <td style="border: 1px solid #000; text-align: center; font-size: 8pt; vertical-align: middle;">${it.originCountry || 'Vietnam'}</td>
          <td style="border: 1px solid #000; text-align: right; font-size: 8pt; font-family: Arial, monospace; vertical-align: middle; padding-right: 4px;">${u}</td>
          <td style="border: 1px solid #000; border-right: 1.5px solid #000; text-align: right; font-size: 8pt; font-weight: bold; font-family: Arial, monospace; vertical-align: middle; padding-right: 6px;">${total}</td>
        </tr>
      `;
        }).join('');
        const finalSubtotal = d.subtotal || subtotalCalc;
        const finalTotal = d.totalValue || (finalSubtotal + (d.shippingCharge || 0) + (d.insuranceCharge || 0));
        return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Commercial Invoice - ${d.invoiceNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    body {
      font-family: Arial, sans-serif;
      color: #000;
      background: #e2e8f0;
      margin: 0;
      padding: 15px;
      font-size: 8.5pt;
      line-height: 1.25;
    }
    .sheet {
      background: #fff;
      max-width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 8mm 12mm;
      box-sizing: border-box;
      box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; margin: 0; padding: 0; }
      .no-print { display: none !important; }
    }
    table.excel-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    table.excel-table td {
      vertical-align: middle;
      padding: 2px 3px;
    }
    .btn {
      padding: 7px 14px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 12px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  </style>
</head>
<body>

  <div class="no-print" style="max-width: 210mm; margin: 0 auto 12px auto; display: flex; justify-content: space-between; align-items: center;">
    <a href="/invoice.html" class="btn" style="background: #fff; border: 1px solid #cbd5e1; color: #334155;">← Quay Lại Trình Tạo Invoice</a>
    <div style="display: flex; gap: 8px;">
      <a href="/api/invoices/${d.id}/excel" class="btn" style="background: #107c41; color: #fff;">📥 Tải File Excel Mẫu Gốc (.xlsx)</a>
      <button onclick="window.print()" class="btn" style="background: #0f172a; color: #fff; border: none;">🖨️ In Hóa Đơn A4 (Chuẩn Hải Quan)</button>
    </div>
  </div>

  <div class="sheet">
    <table class="excel-table">
      <!-- CẤU TRÚC 7 CỘT CHUẨN THEO BẢNG EXCEL GỐC (B, C, D, E, F, G, H) -->
      <colgroup>
        <col style="width: 17%;">
        <col style="width: 27%;">
        <col style="width: 10%;">
        <col style="width: 11%;">
        <col style="width: 13%;">
        <col style="width: 11%;">
        <col style="width: 11%;">
      </colgroup>

      <!-- ROW 1: HEADER INVOICE -->
      <tr>
        <td colspan="7" style="border-top: 1.5px solid #000; border-left: 1.5px solid #000; border-right: 1.5px solid #000; text-align: center; font-size: 16pt; font-weight: bold; padding: 6px 0; letter-spacing: 1px;">
          INVOICE
        </td>
      </tr>

      <!-- ROW 2: DATE -->
      <tr>
        <td style="border-left: 1.5px solid #000;"></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td style="text-align: right; font-weight: bold; font-size: 8pt; padding-right: 4px;">Date:</td>
        <td style="border-bottom: 1px solid #000; border-right: 1.5px solid #000; font-weight: bold; font-size: 8pt; text-align: center;">${dateFormatted}</td>
      </tr>

      <!-- ROW 3: SHIPPER & AIR WAYBILL NO -->
      <tr>
        <td style="border-left: 1.5px solid #000; font-weight: bold; font-family: 'Arial Narrow', Arial; font-size: 11pt; padding: 2px 4px;">SHIPPER</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td style="text-align: right; font-weight: bold; font-size: 8pt; padding-right: 4px;">Air waybill No.</td>
        <td style="border-bottom: 1px solid #000; border-right: 1.5px solid #000; font-size: 8pt; font-weight: bold; text-align: center; color: #1e3a8a;">${d.airWaybillNo || d.masterTrackingNumber || ''}</td>
      </tr>

      <!-- ROW 4: SHIPPER COMPANY -->
      <tr>
        <td style="border-left: 1.5px solid #000; font-size: 8pt; padding: 2px 4px;">Company Name</td>
        <td colspan="4" style="border-bottom: 1px solid #000; font-weight: bold; font-size: 8pt; padding: 2px 4px;">${d.shipperCompanyName}</td>
        <td></td>
        <td style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 5: SHIPPER ADDRESS -->
      <tr>
        <td style="border-left: 1.5px solid #000; font-size: 8pt; padding: 2px 4px;">Address</td>
        <td colspan="4" style="border-bottom: 1px solid #000; font-size: 8pt; padding: 2px 4px;">${d.shipperAddress}</td>
        <td></td>
        <td style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 6: TOWN / AREA CODE & NO. OF PKGS -->
      <tr>
        <td style="border-left: 1.5px solid #000; font-size: 8pt; padding: 2px 4px;">Town/ Area Code</td>
        <td colspan="4" style="border-bottom: 1px solid #000; font-size: 8pt; padding: 2px 4px;">${d.shipperTownArea || '100000'}</td>
        <td style="text-align: right; font-weight: bold; font-size: 8pt; padding-right: 4px;">No. of pkgs </td>
        <td style="border-bottom: 1px solid #000; border-right: 1.5px solid #000; text-align: center; font-weight: bold; font-size: 8pt;">${d.totalPackages}</td>
      </tr>

      <!-- ROW 7: STATE / COUNTRY -->
      <tr>
        <td style="border-left: 1.5px solid #000; font-size: 8pt; padding: 2px 4px;">State/ Country</td>
        <td colspan="4" style="border-bottom: 1px solid #000; font-size: 8pt; padding: 2px 4px;">${d.shipperStateCountry}</td>
        <td></td>
        <td style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 8: CONTACT NAME & WEIGHT -->
      <tr>
        <td style="border-left: 1.5px solid #000; font-size: 8pt; padding: 2px 4px;">Contact Name</td>
        <td colspan="4" style="border-bottom: 1px solid #000; font-size: 8pt; padding: 2px 4px;">${d.shipperContactName}</td>
        <td style="text-align: right; font-weight: bold; font-size: 8pt; padding-right: 4px;">Weight </td>
        <td style="border-bottom: 1px solid #000; border-right: 1.5px solid #000; text-align: center; font-weight: bold; font-size: 8pt;">${d.totalActualWeightKg}</td>
      </tr>

      <!-- ROW 9: PHONE/FAX NO -->
      <tr>
        <td style="border-left: 1.5px solid #000; font-size: 8pt; padding: 2px 4px;">Phone/Fax No. </td>
        <td colspan="4" style="border-bottom: 1px solid #000; font-size: 8pt; padding: 2px 4px;">${d.shipperPhone}</td>
        <td></td>
        <td style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 10: DIMENSIONS -->
      <tr>
        <td style="border-left: 1.5px solid #000;"></td>
        <td colspan="4"></td>
        <td style="text-align: right; font-weight: bold; font-size: 8pt; padding-right: 4px;">Dimensions </td>
        <td style="border: 1px solid #000; border-right: 1.5px solid #000; font-size: 7.5pt; text-align: center; padding: 2px 4px;">${d.dimensionsSummary || 'Standard'}</td>
      </tr>

      <!-- KHOẢNG CÁCH DÒNG 11-13 -->
      <tr style="height: 6px;">
        <td style="border-left: 1.5px solid #000;"></td>
        <td colspan="5"></td>
        <td style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 14: CONSIGNEE -->
      <tr>
        <td style="border-left: 1.5px solid #000; font-weight: bold; font-family: 'Arial Narrow', Arial; font-size: 11pt; padding: 2px 4px;">CONSIGNEE</td>
        <td colspan="5"></td>
        <td style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 15: COMPANY NAME -->
      <tr>
        <td style="border-left: 1.5px solid #000; font-size: 8pt; padding: 2px 4px;">Company Name</td>
        <td colspan="4" style="border-bottom: 1px solid #000; font-weight: bold; font-size: 8pt; padding: 2px 4px;">${d.consigneeCompanyName}</td>
        <td></td>
        <td style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 16: ADDRESS & SERVICES -->
      <tr>
        <td style="border-left: 1.5px solid #000; font-size: 8pt; padding: 2px 4px; vertical-align: top;">Address</td>
        <td colspan="4" rowspan="2" style="border-bottom: 1px solid #000; font-size: 8pt; padding: 2px 4px; vertical-align: top;">${d.consigneeAddress}</td>
        <td style="text-align: right; font-weight: bold; font-size: 8pt; padding-right: 4px;">Services</td>
        <td style="border: 1px solid #000; border-right: 1.5px solid #000; text-align: center; font-weight: bold; font-size: 8pt; color: #1e3a8a;">${d.serviceName || 'UPS Saver'}</td>
      </tr>
      <tr>
        <td style="border-left: 1.5px solid #000;"></td>
        <td></td>
        <td style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 18: POSTAL CODE -->
      <tr>
        <td style="border-left: 1.5px solid #000; font-size: 8pt; padding: 2px 4px;">Postal code</td>
        <td colspan="4" style="border-bottom: 1px solid #000; font-size: 8pt; padding: 2px 4px;">${d.consigneePostalCode}</td>
        <td></td>
        <td style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 19: STATE / COUNTRY -->
      <tr>
        <td style="border-left: 1.5px solid #000; font-size: 8pt; padding: 2px 4px;">State/ Country </td>
        <td colspan="4" style="border-bottom: 1px solid #000; font-size: 8pt; padding: 2px 4px;">${d.consigneeStateCountry}</td>
        <td></td>
        <td style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 20: CONTACT NAME -->
      <tr>
        <td style="border-left: 1.5px solid #000; font-size: 8pt; padding: 2px 4px;">Contact Name</td>
        <td colspan="4" style="border-bottom: 1px solid #000; font-size: 8pt; padding: 2px 4px;">${d.consigneeContactName}</td>
        <td></td>
        <td style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 21: PHONE/FAX NO -->
      <tr>
        <td style="border-left: 1.5px solid #000; font-size: 8pt; padding: 2px 4px;">Phone/Fax No. </td>
        <td colspan="4" style="border-bottom: 1px solid #000; font-size: 8pt; padding: 2px 4px;">${d.consigneePhone}</td>
        <td></td>
        <td style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 22: GMAIL -->
      <tr>
        <td style="border-left: 1.5px solid #000; font-size: 8pt; padding: 2px 4px;">Gmail:</td>
        <td colspan="4" style="border-bottom: 1px solid #000; font-size: 8pt; padding: 2px 4px;">${d.consigneeEmail || ''}</td>
        <td></td>
        <td style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- KHOẢNG CÁCH DÒNG TRƯỚC BẢNG HÀNG -->
      <tr style="height: 4px;">
        <td style="border-left: 1.5px solid #000;"></td>
        <td colspan="5"></td>
        <td style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 23: TABLE HEADER HÀNG HÓA -->
      <tr style="text-align: center; font-size: 7.5pt; background: #fff;">
        <td colspan="2" style="border: 1px solid #000; border-left: 1.5px solid #000; padding: 4px; line-height: 1.25;">
          Description of goods (Mô tả hàng)<br>
          Harmonized System tariff Number <br>
          ( If known)
        </td>
        <td style="border: 1px solid #000; padding: 4px; line-height: 1.25;">
          No<br>Units<br>(Số lượng)
        </td>
        <td style="border: 1px solid #000; padding: 4px;">
          Unit (pcs/sets/box)
        </td>
        <td style="border: 1px solid #000; padding: 4px; line-height: 1.25;">
          Country<br>of Origin<br>(Xuất xứ)
        </td>
        <td style="border: 1px solid #000; padding: 4px; line-height: 1.25;">
          Unit Value<br>(Giá trị của 1 đơn vị hàng)
        </td>
        <td style="border: 1px solid #000; border-right: 1.5px solid #000; padding: 4px; line-height: 1.25;">
          Total<br>Value<br>(Tổng giá trị)
        </td>
      </tr>

      <!-- COMMODITY ROWS -->
      ${itemRows}

      <!-- ROW 25: REASON FOR EXPORT & SUBTOTAL -->
      <tr>
        <td colspan="5" style="border: 1px solid #000; border-left: 1.5px solid #000; padding: 4px 6px; font-size: 8.5pt;">
          REASON FOR EXPORT : ${d.reasonForExport}
        </td>
        <td style="border: 1px solid #000; text-align: center; font-weight: bold; font-size: 8pt;">Subtotal</td>
        <td style="border: 1px solid #000; border-right: 1.5px solid #000; text-align: right; font-weight: bold; font-size: 8pt; padding-right: 6px;">
          ${finalSubtotal}
        </td>
      </tr>

      <!-- ROW 26: BLANK -->
      <tr style="height: 4px;">
        <td style="border-left: 1.5px solid #000;"></td>
        <td colspan="5"></td>
        <td style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 27: TERMS OF SALE -->
      <tr>
        <td colspan="5" style="border: 1px solid #000; border-left: 1.5px solid #000; padding: 2px 6px; font-size: 8.5pt;">
          Terms of Sale (Incoterm) : ${d.termsOfSale}
        </td>
        <td colspan="2" style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 28: NO. OF PACKAGES -->
      <tr>
        <td colspan="5" style="border: 1px solid #000; border-left: 1.5px solid #000; padding: 2px 6px; font-size: 8.5pt;">
          No.of packages (Số kiện)             :      ${d.totalPackages}
        </td>
        <td colspan="2" style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 29: TOTAL ACTUAL WEIGHT & SHIPPING CHARGE -->
      <tr>
        <td colspan="4" style="border: 1px solid #000; border-left: 1.5px solid #000; padding: 2px 6px; font-size: 8.5pt;">
          Total Actual weight (Trọng lượng thực)          :     ${d.totalActualWeightKg} KG
        </td>
        <td style="border: 1px solid #000; text-align: right; font-size: 8pt; padding-right: 4px;">Shipping charge</td>
        <td colspan="2" style="border: 1px solid #000; border-right: 1.5px solid #000; text-align: right; font-size: 8pt; padding-right: 6px;">
          ${d.shippingCharge ? d.shippingCharge : ''}
        </td>
      </tr>

      <!-- ROW 30: TOTAL DIMENSIONAL WEIGHT & INSUARANCE -->
      <tr>
        <td colspan="4" style="border: 1px solid #000; border-left: 1.5px solid #000; padding: 2px 6px; font-size: 8.5pt;">
          Total Dimensional weight (Trọng lượng khối) :  ${d.totalDimensionalWeightKg || 0} KG
        </td>
        <td style="border: 1px solid #000; text-align: right; font-size: 8pt; padding-right: 4px;">Insuarance</td>
        <td colspan="2" style="border: 1px solid #000; border-right: 1.5px solid #000; text-align: right; font-size: 8pt; padding-right: 6px;">
          ${d.insuranceCharge ? d.insuranceCharge : ''}
        </td>
      </tr>

      <!-- ROW 31: TOTAL VALUE OF SHIPMENT -->
      <tr>
        <td colspan="4" style="border-left: 1.5px solid #000;"></td>
        <td style="border: 1px solid #000; text-align: right; font-weight: bold; font-size: 8pt; padding-right: 4px;">
          Total Value of shipment (Tổng giá trị)
        </td>
        <td colspan="2" style="border: 1.5px solid #000; border-right: 1.5px solid #000; text-align: right; font-weight: bold; font-size: 9pt; padding-right: 6px;">
          ${finalTotal}
        </td>
      </tr>

      <!-- ROW 32: CLEARANCE DECLARATION -->
      <tr>
        <td colspan="4" style="border-left: 1.5px solid #000; padding: 2px 6px; font-size: 8pt;">
          clearance for export out of Vietnam.
        </td>
        <td colspan="3" style="border-right: 1.5px solid #000;"></td>
      </tr>

      <!-- ROW 33: SIGNATORY -->
      <tr>
        <td colspan="4" style="border-left: 1.5px solid #000;"></td>
        <td colspan="3" style="border-right: 1.5px solid #000; text-align: center; font-size: 8pt; padding-top: 10px;">
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Designation of Authorised Signatory
        </td>
      </tr>

      <!-- ROW 34: SIGNATURE / STAMP -->
      <tr>
        <td colspan="4" style="border-left: 1.5px solid #000; border-bottom: 1.5px solid #000;"></td>
        <td colspan="3" style="border-right: 1.5px solid #000; border-bottom: 1.5px solid #000; text-align: center; padding-bottom: 35px; font-size: 8pt; color: #333;">
          Người khai (Ký tên/ đóng dấu)<br><br>
          <div style="font-weight: bold; margin-top: 20px;">${d.signatoryName || d.shipperContactName}</div>
        </td>
      </tr>
    </table>
  </div>

</body>
</html>
    `;
    }
    /**
     * Tương thích ngược: Xuất Excel từ StoredShipment
     */
    static exportInvoiceToExcel(shipment) {
        return this.exportToExcel(this.normalizeFromShipment(shipment));
    }
    /**
     * Tương thích ngược: Sinh HTML từ StoredShipment
     */
    static renderInvoiceHtml(shipment) {
        return this.renderHtml(this.normalizeFromShipment(shipment));
    }
}
