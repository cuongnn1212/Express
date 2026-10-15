import { ExcelRateImporter } from '../dist/modules/pricing/excel-rate-importer.js';
import { UniversalPricingEngine } from '../dist/modules/pricing/universal-pricing-engine.js';

const viettelTable = ExcelRateImporter.parseUpsRateFile('rates/UPS_VIETTEL_2026.xlsx', {
  contractName: 'UPS - Nhà Cung Cấp Viettel (Từ 01.06.2026)'
});
const frankTable = ExcelRateImporter.parseUpsRateFile('rates/UPS_FRANK_CUSTOMER_2026.xlsx', {
  contractName: 'UPS - Bảng Giá Khách Hàng Frank (10.10.2026)'
});

const engineV = new UniversalPricingEngine([viettelTable]);
const engineF = new UniversalPricingEngine([frankTable]);

const testCases = [
  { awb: '1Z84Y8200492184701', weight: 2, country: 'US', isCosmetics: true },
  { awb: '1Z84Y8200492184702', weight: 1.5, country: 'CA', isCosmetics: true },
  { awb: '1Z84Y8200492184703', weight: 3, country: 'DE', isCosmetics: false },
  { awb: '1Z84Y8200492184704', weight: 0.5, country: 'FR', isCosmetics: true },
  { awb: '1Z84Y8200492184705', weight: 4.5, country: 'GB', isCosmetics: false },
  { awb: '1Z84Y8200492184706', weight: 2.5, country: 'AU', isCosmetics: true },
  { awb: '1Z84Y8200492184707', weight: 5, country: 'JP', isCosmetics: false },
  { awb: '1Z84Y8200492184708', weight: 1, country: 'SG', isCosmetics: true },
  { awb: '1Z84Y8200492184709', weight: 8, country: 'KR', isCosmetics: false },
  { awb: '1Z84Y8200492184710', weight: 21, country: 'US', isCosmetics: true },
];

let sumKg = 0;
let sumCost = 0;
let sumSell = 0;
let sumProfit = 0;

console.log('=== KẾT QUẢ TÍNH TOÁN 10 ĐƠN HÀNG TEST ===\n');
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
  
  const costTotal = qV.totalCostPrice + goodsFee;
  const sellTotal = qF.totalCostPrice + goodsFee;
  const profit = sellTotal - costTotal;

  sumKg += kg;
  sumCost += costTotal;
  sumSell += sellTotal;
  sumProfit += profit;

  console.log((idx + 1) + '. AWB: ' + tc.awb + ' | ' + tc.country + ' | ' + kg + 'kg | ' + (tc.isCosmetics ? 'Mỹ Phẩm' : 'Hàng Thường'));
  console.log('   Trả Viettel: ' + costTotal.toLocaleString('vi-VN') + ' đ (Net: ' + qV.baseRate.toLocaleString('vi-VN') + ', HQ: ' + qV.customsFeeAmount.toLocaleString('vi-VN') + ', Hàng: ' + goodsFee.toLocaleString('vi-VN') + ')');
  console.log('   Thu Khách:   ' + sellTotal.toLocaleString('vi-VN') + ' đ (Net: ' + qF.baseRate.toLocaleString('vi-VN') + ', HQ: ' + qF.customsFeeAmount.toLocaleString('vi-VN') + ', Hàng: ' + goodsFee.toLocaleString('vi-VN') + ', AnNinh: 150.000)');
  console.log('   Lợi Nhuận:   +' + profit.toLocaleString('vi-VN') + ' đ\n');
});

console.log('----------------------------------------------------');
console.log('TỔNG CỘNG: 10 AWB | ' + sumKg + ' kg');
console.log('TỔNG CHI TRẢ VIETTEL:   ' + sumCost.toLocaleString('vi-VN') + ' đ');
console.log('TỔNG THU KHÁCH HÀNG:    ' + sumSell.toLocaleString('vi-VN') + ' đ');
console.log('TỔNG LỢI NHUẬN GỘP:     +' + sumProfit.toLocaleString('vi-VN') + ' đ (' + ((sumProfit/sumSell)*100).toFixed(1) + '%)');
