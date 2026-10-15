import XLSX from 'xlsx';
import { ExcelRateImporter } from '../dist/modules/pricing/excel-rate-importer.js';
import { UniversalPricingEngine } from '../dist/modules/pricing/universal-pricing-engine.js';
import fs from 'fs';
import path from 'path';

const viettelTable = ExcelRateImporter.parseUpsRateFile('rates/UPS_VIETTEL_2026.xlsx', {
  contractName: 'UPS - Nhà Cung Cấp Viettel (Từ 01.06.2026)'
});
const frankTable = ExcelRateImporter.parseUpsRateFile('rates/UPS_FRANK_CUSTOMER_2026.xlsx', {
  contractName: 'UPS - Bảng Giá Khách Hàng Frank (10.10.2026)'
});

const engineV = new UniversalPricingEngine([viettelTable]);
const engineF = new UniversalPricingEngine([frankTable]);

const testCases = [
  { awb: '1Z84Y8200492184701', weight: 2, country: 'US', isCosmetics: true, note: 'Mỹ phẩm đi Mỹ (HQ 40k, Vốn 32k)' },
  { awb: '1Z84Y8200492184702', weight: 1.5, country: 'CA', isCosmetics: true, note: 'Mỹ phẩm đi Canada' },
  { awb: '1Z84Y8200492184703', weight: 3, country: 'DE', isCosmetics: false, note: 'Hàng thường đi Đức' },
  { awb: '1Z84Y8200492184704', weight: 0.5, country: 'FR', isCosmetics: true, note: 'Mỹ phẩm đi Pháp' },
  { awb: '1Z84Y8200492184705', weight: 4.5, country: 'GB', isCosmetics: false, note: 'Hàng thường đi Anh' },
  { awb: '1Z84Y8200492184706', weight: 2.5, country: 'AU', isCosmetics: true, note: 'Mỹ phẩm đi Úc' },
  { awb: '1Z84Y8200492184707', weight: 5, country: 'JP', isCosmetics: false, note: 'Hàng thường đi Nhật' },
  { awb: '1Z84Y8200492184708', weight: 1, country: 'SG', isCosmetics: true, note: 'Mỹ phẩm đi Singapore' },
  { awb: '1Z84Y8200492184709', weight: 8, country: 'KR', isCosmetics: false, note: 'Hàng thường đi Hàn Quốc' },
  { awb: '1Z84Y8200492184710', weight: 21, country: 'US', isCosmetics: true, note: 'Mỹ phẩm lô nặng 21kg đi Mỹ' },
];

const customerRows = [];
const supplierRows = [];

testCases.forEach((tc, idx) => {
  const qV = engineV.quoteSingleCarrier('UPS', {
    carrier: 'UPS', destinationCountry: tc.country, actualWeightKg: tc.weight,
    lengthCm: 10, widthCm: 10, heightCm: 10,
    cargoType: tc.isCosmetics ? 'COSMETICS' : 'GENERAL', isCosmetics: tc.isCosmetics,
    customsFeePerKg: tc.isCosmetics ? 32000 : 0, securityFeePerAwb: 0
  });

  const qF = engineF.quoteSingleCarrier('UPS', {
    carrier: 'UPS', destinationCountry: tc.country, actualWeightKg: tc.weight,
    lengthCm: 10, widthCm: 10, heightCm: 10,
    cargoType: tc.isCosmetics ? 'COSMETICS' : 'GENERAL', isCosmetics: tc.isCosmetics,
    customsFeePerKg: tc.isCosmetics ? 40000 : 0, securityFeePerAwb: 150000
  });

  const kg = qF.chargeableWeightKg;
  const goodsFee = 8000 * kg;
  const airFee = 0;

  // 1. Dòng Khách Hàng (Frank)
  const custBase = qF.baseRate;
  const custSurge = qF.surgeEmergencyFee;
  const custDelivery = qF.deliveryFee || 0;
  const custFsc = qF.fuelSurchargeAmount;
  const custVat = qF.vatAmount;
  const custHq = qF.customsFeeAmount;
  const custSec = 150000;
  const custTotal = qF.totalCostPrice + goodsFee + airFee;

  customerRows.push({
    stt: idx + 1,
    awb: tc.awb,
    carrier: 'UPS',
    country: tc.country,
    zone: qF.zone,
    cargoType: tc.isCosmetics ? '💄 Mỹ phẩm' : '📦 Hàng thường',
    kg,
    baseRate: custBase,
    surge: custSurge,
    delivery: custDelivery,
    fsc: custFsc,
    vat: custVat,
    hq: custHq,
    goodsFee,
    airFee,
    sec: custSec,
    total: custTotal,
    note: tc.note
  });

  // 2. Dòng Nhà Cung Cấp (Viettel Post)
  const supBase = qV.baseRate;
  const supSurge = qV.surgeEmergencyFee;
  const supDelivery = qV.deliveryFee || 0;
  const supFsc = qV.fuelSurchargeAmount;
  const supVat = qV.vatAmount;
  const supHq = qV.customsFeeAmount;
  const supSec = 0;
  const supTotal = qV.totalCostPrice + goodsFee + airFee;

  supplierRows.push({
    stt: idx + 1,
    awb: tc.awb,
    carrier: 'UPS',
    country: tc.country,
    zone: qV.zone,
    cargoType: tc.isCosmetics ? '💄 Mỹ phẩm' : '📦 Hàng thường',
    kg,
    baseRate: supBase,
    surge: supSurge,
    delivery: supDelivery,
    fsc: supFsc,
    vat: supVat,
    hq: supHq,
    goodsFee,
    airFee,
    sec: supSec,
    total: supTotal,
    note: tc.note
  });
});

// Hàm tạo bảng Excel Khách Hàng
function createCustomerWorkbook(rows) {
  const wb = XLSX.utils.book_new();
  const aoa = [
    ['PANDALEX EXPRESS - BẢNG KÊ CƯỚC VẬN CHUYỂN QUỐC TẾ THU KHÁCH HÀNG'],
    [`Khách hàng: FRANK | Biểu cước: UPS FRANK 2026 | Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
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
      'Phí Biến Động (VNĐ)',
      'Phí Phát Hàng (VNĐ)',
      'Phụ Phí Xăng FSC (VNĐ)',
      'Thuế VAT 8% (VNĐ)',
      'Phí Hải Quan (40k/kg)',
      'Phí Hàng Thường (8k/kg)',
      'Phí Hàng Không (VNĐ)',
      'Phí An Ninh (150k/AWB)',
      'TỔNG TIỀN THANH TOÁN (VNĐ)',
      'Ghi Chú'
    ]
  ];

  let sumKg = 0, sumBase = 0, sumSur = 0, sumDel = 0, sumFsc = 0, sumVat = 0, sumHq = 0, sumG = 0, sumAir = 0, sumSec = 0, sumTot = 0;

  rows.forEach(r => {
    sumKg += r.kg;
    sumBase += r.baseRate;
    sumSur += r.surge;
    sumDel += r.delivery;
    sumFsc += r.fsc;
    sumVat += r.vat;
    sumHq += r.hq;
    sumG += r.goodsFee;
    sumAir += r.airFee;
    sumSec += r.sec;
    sumTot += r.total;

    aoa.push([
      r.stt,
      r.awb,
      r.carrier,
      r.country,
      r.zone,
      r.cargoType,
      r.kg,
      r.baseRate,
      r.surge,
      r.delivery,
      r.fsc,
      r.vat,
      r.hq,
      r.goodsFee,
      r.airFee,
      r.sec,
      r.total,
      r.note
    ]);
  });

  const totalRowIdx = aoa.length + 1;
  aoa.push([
    'TỔNG CỘNG',
    `${rows.length} vận đơn AWB`,
    '', '', '', '',
    Math.round(sumKg * 100) / 100,
    sumBase, sumSur, sumDel, sumFsc, sumVat, sumHq, sumG, sumAir, sumSec, sumTot,
    ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Đặt công thức SUM cho từng dòng và dòng tổng cộng
  rows.forEach((r, idx) => {
    const rowNum = idx + 5; // Dòng 5 trở đi
    // Cột Q = SUM(H#:P#)
    ws[`Q${rowNum}`] = { t: 'n', f: `SUM(H${rowNum}:P${rowNum})`, v: r.total };
  });

  const fCols = { G: sumKg, H: sumBase, I: sumSur, J: sumDel, K: sumFsc, L: sumVat, M: sumHq, N: sumG, O: sumAir, P: sumSec, Q: sumTot };
  for (const [col, val] of Object.entries(fCols)) {
    ws[`${col}${totalRowIdx}`] = { t: 'n', f: `SUM(${col}5:${col}${totalRowIdx - 1})`, v: val };
  }

  ws['!cols'] = [
    { wch: 6 }, { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
    { wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 16 },
    { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 24 }, { wch: 30 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Bang_Ke_Thu_Tien_Khach_Hang');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// Hàm tạo bảng Excel Nhà Cung Cấp Viettel
function createSupplierWorkbook(rows) {
  const wb = XLSX.utils.book_new();
  const aoa = [
    ['PANDALEX EXPRESS - BẢNG KÊ CHI TRẢ CƯỚC CHO NHÀ CUNG CẤP VIETTEL POST'],
    [`Nhà cung cấp: VIETTEL POST (Dịch vụ UPS) | Hợp đồng: UPS VIETTEL 2026 | Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
    [],
    [
      'STT',
      'Mã Vận Đơn (AWB)',
      'Hãng Bay',
      'Nước Đến',
      'Vùng (Zone)',
      'Loại Hàng Hóa',
      'Trọng Lượng (Kg)',
      'Cước Net Viettel (VNĐ)',
      'Phí Biến Động (VNĐ)',
      'Phí Phát Hàng (VNĐ)',
      'Phụ Phí Xăng FSC (VNĐ)',
      'Thuế VAT 8% (VNĐ)',
      'Phí Hải Quan (32k/kg)',
      'Phí Hàng Thường (8k/kg)',
      'Phí Hàng Không (0 đ)',
      'Phí An Ninh (0 đ)',
      'TỔNG TIỀN CHI TRẢ VIETTEL (VNĐ)',
      'Ghi Chú Đối Soát'
    ]
  ];

  let sumKg = 0, sumBase = 0, sumSur = 0, sumDel = 0, sumFsc = 0, sumVat = 0, sumHq = 0, sumG = 0, sumAir = 0, sumSec = 0, sumTot = 0;

  rows.forEach(r => {
    sumKg += r.kg;
    sumBase += r.baseRate;
    sumSur += r.surge;
    sumDel += r.delivery;
    sumFsc += r.fsc;
    sumVat += r.vat;
    sumHq += r.hq;
    sumG += r.goodsFee;
    sumAir += r.airFee;
    sumSec += r.sec;
    sumTot += r.total;

    aoa.push([
      r.stt,
      r.awb,
      r.carrier,
      r.country,
      r.zone,
      r.cargoType,
      r.kg,
      r.baseRate,
      r.surge,
      r.delivery,
      r.fsc,
      r.vat,
      r.hq,
      r.goodsFee,
      r.airFee,
      r.sec,
      r.total,
      r.note
    ]);
  });

  const totalRowIdx = aoa.length + 1;
  aoa.push([
    'TỔNG CỘNG',
    `${rows.length} vận đơn AWB`,
    '', '', '', '',
    Math.round(sumKg * 100) / 100,
    sumBase, sumSur, sumDel, sumFsc, sumVat, sumHq, sumG, sumAir, sumSec, sumTot,
    ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Đặt công thức SUM cho từng dòng và dòng tổng cộng
  rows.forEach((r, idx) => {
    const rowNum = idx + 5;
    ws[`Q${rowNum}`] = { t: 'n', f: `SUM(H${rowNum}:P${rowNum})`, v: r.total };
  });

  const fCols = { G: sumKg, H: sumBase, I: sumSur, J: sumDel, K: sumFsc, L: sumVat, M: sumHq, N: sumG, O: sumAir, P: sumSec, Q: sumTot };
  for (const [col, val] of Object.entries(fCols)) {
    ws[`${col}${totalRowIdx}`] = { t: 'n', f: `SUM(${col}5:${col}${totalRowIdx - 1})`, v: val };
  }

  ws['!cols'] = [
    { wch: 6 }, { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
    { wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 16 },
    { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 24 }, { wch: 30 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Bang_Ke_Chi_Tra_NCC_Viettel');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

const custBuf = createCustomerWorkbook(customerRows);
const supBuf = createSupplierWorkbook(supplierRows);

// Ghi file ra thư mục gốc và thư mục public
fs.writeFileSync('Bang_Ke_Thu_Tien_Khach_Hang_10_Don.xlsx', custBuf);
fs.writeFileSync('public/Bang_Ke_Thu_Tien_Khach_Hang_10_Don.xlsx', custBuf);

fs.writeFileSync('Bang_Ke_Thanh_Toan_NCC_Viettel_10_Don.xlsx', supBuf);
fs.writeFileSync('public/Bang_Ke_Thanh_Toan_NCC_Viettel_10_Don.xlsx', supBuf);

console.log('✅ Đã tạo thành công 2 file Excel xuất:');
console.log('  1. public/Bang_Ke_Thu_Tien_Khach_Hang_10_Don.xlsx (Size: ' + custBuf.length + ' bytes)');
console.log('  2. public/Bang_Ke_Thanh_Toan_NCC_Viettel_10_Don.xlsx (Size: ' + supBuf.length + ' bytes)');
