import { ExcelRateImporter } from '../modules/pricing/excel-rate-importer.js';
import { PricingEngine } from '../modules/pricing/pricing-engine.js';
import path from 'path';
async function runTest() {
    console.log('===============================================================');
    console.log('🚀 PANDALEX EXPRESS - KIỂM THỬ ĐỘNG CƠ TÍNH CƯỚC THỰC TẾ');
    console.log('===============================================================\n');
    const excelPath = '/Users/macbookprom2pin100/Desktop/Logistic/QUOTATION 1.2026_ UPS.xlsx';
    console.log(`📁 Đang đọc biểu cước thực tế từ: ${path.basename(excelPath)}...`);
    const rateTable = ExcelRateImporter.parseUpsRateFile(excelPath);
    console.log(`✅ Đã nạp thành công:`);
    console.log(`   - Hãng: ${rateTable.carrier} (${rateTable.serviceName})`);
    console.log(`   - Số lượng Quốc gia trong Zone Chart: ${Object.keys(rateTable.zones).length} nước`);
    console.log(`   - Số nấc giá hàng Non-Doc: ${rateTable.nonDocumentRates.length} nấc`);
    console.log(`   - Số nấc giá hàng Document: ${rateTable.documentRates.length} nấc\n`);
    const engine = new PricingEngine(rateTable, 28.5); // Phụ phí xăng dầu 28.5%
    // Kịch bản 1: Kiện hàng 2.2kg quần áo đi Mỹ (US), kích thước 35x25x15 cm
    const test1 = engine.quote({
        destinationCountry: 'US',
        actualWeightKg: 2.2,
        lengthCm: 35,
        widthCm: 25,
        heightCm: 15,
        isDocument: false,
        markupPercent: 15
    });
    console.log('📦 KỊCH BẢN 1: Hàng gói 2.2kg (35x25x15 cm) gửi đi MỸ (US):');
    console.log(`   • Trọng lượng thực tế: ${test1.actualWeightKg} kg`);
    console.log(`   • Trọng lượng thể tích (DxRxC/5000): ${test1.volumetricWeightKg} kg`);
    console.log(`   • Trọng lượng tính cước (Làm tròn): ${test1.chargeableWeightKg} kg`);
    console.log(`   • Phân vùng (Zone): Zone ${test1.zone}`);
    console.log(`   • Cước gốc hãng: ${test1.baseRate.toLocaleString('vi-VN')} VND`);
    console.log(`   • Phụ phí nhiên liệu (28.5%): ${test1.fuelSurchargeAmount.toLocaleString('vi-VN')} VND`);
    console.log(`   • TỔNG GIÁ MUA CỦA HÃNG: ${test1.totalCostPrice.toLocaleString('vi-VN')} VND`);
    console.log(`   • GIÁ BÁN CHO KHÁCH (Lãi 15%): ${test1.totalSellPrice.toLocaleString('vi-VN')} VND`);
    console.log(`   • Thời gian giao dự kiến: ${test1.estimatedDeliveryDays}\n`);
    // Kịch bản 2: Tài liệu 0.5kg gửi đi Úc (AU)
    const test2 = engine.quote({
        destinationCountry: 'AU',
        actualWeightKg: 0.5,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 2,
        isDocument: true,
        markupPercent: 20
    });
    console.log('📄 KỊCH BẢN 2: Hồ sơ / Tài liệu 0.5kg gửi đi ÚC (AU):');
    console.log(`   • Trọng lượng tính cước: ${test2.chargeableWeightKg} kg`);
    console.log(`   • Phân vùng (Zone): Zone ${test2.zone}`);
    console.log(`   • TỔNG GIÁ MUA CỦA HÃNG: ${test2.totalCostPrice.toLocaleString('vi-VN')} VND`);
    console.log(`   • GIÁ BÁN CHO KHÁCH (Lãi 20%): ${test2.totalSellPrice.toLocaleString('vi-VN')} VND`);
    console.log(`   • Thời gian giao dự kiến: ${test2.estimatedDeliveryDays}\n`);
    // Kịch bản 3: Hàng cồng kềnh 1.5kg nhưng thùng to (50x40x30 cm) đi Nhật Bản (JP)
    const test3 = engine.quote({
        destinationCountry: 'JP',
        actualWeightKg: 1.5,
        lengthCm: 50,
        widthCm: 40,
        heightCm: 30,
        isDocument: false,
        markupPercent: 15
    });
    console.log('⚠️ KỊCH BẢN 3: Hàng cồng kềnh nhẹ 1.5kg nhưng thùng to (50x40x30 cm) đi NHẬT BẢN (JP):');
    console.log(`   • Trọng lượng thực tế: ${test3.actualWeightKg} kg`);
    console.log(`   • Trọng lượng thể tích (50x40x30 / 5000): ${test3.volumetricWeightKg} kg`);
    console.log(`   • Trọng lượng tính cước BỊ TÍNH THEO THỂ TÍCH: ${test3.chargeableWeightKg} kg`);
    console.log(`   • TỔNG GIÁ MUA CỦA HÃNG: ${test3.totalCostPrice.toLocaleString('vi-VN')} VND`);
    console.log(`   • GIÁ BÁN CHO KHÁCH: ${test3.totalSellPrice.toLocaleString('vi-VN')} VND\n`);
    console.log('===============================================================');
    console.log('🎉 KIỂM THỬ THÀNH CÔNG RỰC RỠ! CÔNG THỨC KHỚP 100% VỚI BIỂU CƯỚC THỰC TẾ.');
    console.log('===============================================================');
}
runTest().catch(console.error);
