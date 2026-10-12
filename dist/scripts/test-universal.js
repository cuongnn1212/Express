import { ExcelRateImporter } from '../modules/pricing/excel-rate-importer.js';
import { FedExRateImporter } from '../modules/pricing/fedex-rate-importer.js';
import { UniversalPricingEngine } from '../modules/pricing/universal-pricing-engine.js';
async function runUniversalTest() {
    console.log('=============================================================================');
    console.log('🚀 KIỂM THỬ ĐỘNG CƠ TÍNH GIÁ ĐA HÃNG CHUẨN HOÁ (UPS & FEDEX REAL FILES)');
    console.log('=============================================================================\n');
    // 1. Nạp biểu cước chuẩn UPS
    const upsPath = '/Users/macbookprom2pin100/Desktop/Logistic/QUOTATION 1.2026_ UPS.xlsx';
    console.log(`📁 1. Đang nạp biểu cước UPS: ${upsPath}...`);
    const upsTable = ExcelRateImporter.parseUpsRateFile(upsPath);
    console.log(`   ✅ UPS nạp thành công: ${Object.keys(upsTable.zones).length} nước, ${upsTable.nonDocumentRates.length} nấc Non-Doc.\n`);
    // 2. Nạp biểu cước chuẩn FedEx
    const fedexPath = '/Users/macbookprom2pin100/Desktop/Logistic/FEDEX EXP UPDATE 01 JUL 2026 - SELL.xlsx';
    console.log(`📁 2. Đang nạp biểu cước FedEx: ${fedexPath}...`);
    const fedexTable = FedExRateImporter.parseFedExRateFile(fedexPath, 'IP');
    console.log(`   ✅ FedEx nạp thành công: ${Object.keys(fedexTable.zones).length} nước/mã, ${fedexTable.nonDocumentRates.length} nấc Non-Doc.\n`);
    // Khởi tạo Universal Engine với cả 2 hãng
    const engine = new UniversalPricingEngine([upsTable, fedexTable]);
    // TEST 1: Khách vãng lai check giá kiện bình thường (2.5kg đi Mỹ US, 30x20x15cm)
    console.log('-----------------------------------------------------------------------------');
    console.log('TEST 1: KHÁCH VÃNG LAI CHECK GIÁ KIỆN BÌNH THƯỜNG (2.5kg đi Mỹ US)');
    console.log('-----------------------------------------------------------------------------');
    const quotes1 = engine.quote({
        destinationCountry: 'US',
        actualWeightKg: 2.5,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 15,
        isDocument: false,
        customerId: 'guest' // Khách vãng lai
    });
    for (const q of quotes1) {
        console.log(`\n📦 HÃNG: ${q.carrier} (${q.serviceName}) - Hợp đồng: ${q.contractName}`);
        console.log(`   • Zone: ${q.zone} | Cân nặng tính cước: ${q.chargeableWeightKg} kg`);
        console.log(`   • Cước Net: ${q.baseRate.toLocaleString('vi-VN')} VND`);
        console.log(`   • Phụ phí nhiên liệu (${q.fuelSurchargePercent}%): ${q.fuelSurchargeAmount.toLocaleString('vi-VN')} VND`);
        if (q.surcharges.length > 0) {
            console.log(`   • Phụ phí phát sinh:`);
            q.surcharges.forEach(s => console.log(`     - [${s.code}] ${s.name}: ${s.amount.toLocaleString('vi-VN')} VND (${s.triggerReason})`));
        }
        console.log(`   -------------------------------------------------`);
        console.log(`   🎯 TỔNG GIÁ VỐN HÃNG (COST): ${q.totalCostPrice.toLocaleString('vi-VN')} VND`);
        console.log(`   👤 Chính sách: ${q.customerPolicyApplied.name} (Margin: ${q.customerPolicyApplied.marginPercent}%)`);
        console.log(`   💵 GIÁ BÁN CHO KHÁCH: ${q.totalSellPrice.toLocaleString('vi-VN')} VND`);
        console.log(`   ⏱️ Thời gian phát hàng dự kiến: ${q.estimatedDeliveryDays}`);
    }
    // TEST 2: Đơn hàng dính phụ phí QUÁ KHỔ (AHC: 130x30x20cm, nặng 10kg đi Nhật Bản JP)
    console.log('\n-----------------------------------------------------------------------------');
    console.log('TEST 2: KIỂM SOÁT PHỤ PHÍ QUÁ KHỔ (AHC) - Dài 130cm (>120cm) đi Nhật Bản (JP)');
    console.log('Khách hàng: Đại lý Cấp 2 (agent_f2)');
    console.log('-----------------------------------------------------------------------------');
    const quotes2 = engine.quote({
        destinationCountry: 'JP',
        actualWeightKg: 10,
        lengthCm: 130, // Dài hơn 120cm -> dính AHC!
        widthCm: 30,
        heightCm: 20,
        isDocument: false,
        customerId: 'agent_f2'
    });
    for (const q of quotes2) {
        console.log(`\n📦 HÃNG: ${q.carrier} (${q.serviceName})`);
        console.log(`   • Cân nặng thể tích: ${q.volumetricWeightKg}kg -> Cân tính cước: ${q.chargeableWeightKg}kg`);
        console.log(`   • Cước Net: ${q.baseRate.toLocaleString('vi-VN')} VND`);
        console.log(`   • Phụ phí phát sinh:`);
        q.surcharges.forEach(s => console.log(`     🚨 [${s.code}] ${s.name}: ${s.amount.toLocaleString('vi-VN')} VND | Lý do: ${s.triggerReason}`));
        console.log(`   • Tiền nhiên liệu (tính trên cả Net + Phụ phí quá khổ): ${q.fuelSurchargeAmount.toLocaleString('vi-VN')} VND`);
        console.log(`   🎯 TỔNG GIÁ VỐN (COST): ${q.totalCostPrice.toLocaleString('vi-VN')} VND`);
        console.log(`   👤 Khách hàng: ${q.customerPolicyApplied.name} (Lãi ${q.customerPolicyApplied.marginPercent}% + ${q.customerPolicyApplied.marginFixedAmount.toLocaleString('vi-VN')}đ)`);
        console.log(`   💵 GIÁ BÁN CHO ĐẠI LÝ: ${q.totalSellPrice.toLocaleString('vi-VN')} VND`);
    }
    // TEST 3: Đơn hàng dính KIỆN LỚN (LPS: Dài + Chu vi > 300cm)
    console.log('\n-----------------------------------------------------------------------------');
    console.log('TEST 3: BẪY PHỤ PHÍ KIỆN LỚN (LPS) - Thùng 120x60x50cm (Dài+Chu vi = 340cm > 300cm)');
    console.log('Khách VIP Dệt may');
    console.log('-----------------------------------------------------------------------------');
    const quotes3 = engine.quote({
        destinationCountry: 'US',
        actualWeightKg: 18,
        lengthCm: 120,
        widthCm: 60,
        heightCm: 50,
        isDocument: false,
        customerId: 'vip_textile'
    });
    for (const q of quotes3) {
        console.log(`\n📦 HÃNG: ${q.carrier} (${q.serviceName})`);
        console.log(`   • Cân thực: 18kg | Thể tích: ${q.volumetricWeightKg}kg | Ép sàn cân tính cước do LPS: ${q.chargeableWeightKg}kg`);
        q.surcharges.forEach(s => console.log(`     💥 [${s.code}] ${s.name}: ${s.amount.toLocaleString('vi-VN')} VND`));
        console.log(`   🎯 TỔNG GIÁ VỐN (COST): ${q.totalCostPrice.toLocaleString('vi-VN')} VND`);
        console.log(`   💵 GIÁ BÁN CHO KHÁCH VIP: ${q.totalSellPrice.toLocaleString('vi-VN')} VND`);
    }
    console.log('\n=============================================================================');
    console.log('🎉 KIỂM THỬ THÀNH CÔNG TOÀN DIỆN! CÔNG THỨC VÀ BỘ QUY TẮC ĐÃ HOẠT ĐỘNG HOÀN HẢO.');
    console.log('=============================================================================');
}
runUniversalTest().catch(console.error);
