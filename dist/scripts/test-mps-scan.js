import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { execSync } from 'child_process';
const img1Path = '/Users/macbookprom2pin100/.gemini/antigravity/brain/8b98e04f-d904-4f5c-b77f-4912b7379a2c/.user_uploaded/media_1791644581308_23028559.png';
const img2Path = '/Users/macbookprom2pin100/.gemini/antigravity/brain/8b98e04f-d904-4f5c-b77f-4912b7379a2c/.user_uploaded/media_1791644581301_f72d8350.png';
async function main() {
    console.log('=== TEST QUÉT & LƯU TRỮ VẬN ĐƠN AWB TỪ ẢNH CHỤP THỰC TẾ CỦA KHÁCH ===');
    // 1. Kiểm tra ảnh tồn tại
    if (!fs.existsSync(img1Path) || !fs.existsSync(img2Path)) {
        console.error('Không tìm thấy file ảnh nhãn AWB!');
        process.exit(1);
    }
    console.log('✅ Tìm thấy 2 ảnh nhãn UPS thật do người dùng gửi:');
    console.log('   - Kiện 1:', img1Path);
    console.log('   - Kiện 2:', img2Path);
    // 2. Chuyển đổi 2 ảnh thành PDF chuẩn 4x6" dùng Python Pillow
    const outputDir = path.resolve('uploads/awb_pdfs');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const masterTracking = '1Z861R320493609873';
    const childTracking = '1Z861R320491786882';
    const pdfMasterPath = path.join(outputDir, `AWB_${masterTracking}.pdf`);
    const pdfChildPath = path.join(outputDir, `AWB_${childTracking}.pdf`);
    const pdfCombinedPath = path.join(outputDir, `AWB_${masterTracking}_FULL_MPS.pdf`);
    console.log('\n📄 Đang chuyển đổi ảnh chụp sang file PDF lưu trữ...');
    const pyScript = `
from PIL import Image
img1 = Image.open("${img1Path}").convert("RGB")
img2 = Image.open("${img2Path}").convert("RGB")

# Lưu từng file PDF
img1.save("${pdfMasterPath}", "PDF", resolution=150.0)
img2.save("${pdfChildPath}", "PDF", resolution=150.0)

# Lưu cả 2 kiện vào 1 file PDF liên hoàn
img1.save("${pdfCombinedPath}", "PDF", resolution=150.0, save_all=True, append_images=[img2])
print("PDF_GENERATED_SUCCESS")
`;
    execSync(`python3 -c '${pyScript}'`);
    console.log('✅ Đã tạo thành công các file PDF lưu trữ vĩnh viễn:');
    console.log('   - PDF Kiện 1:', pdfMasterPath, `(${fs.statSync(pdfMasterPath).size} bytes)`);
    console.log('   - PDF Kiện 2:', pdfChildPath, `(${fs.statSync(pdfChildPath).size} bytes)`);
    console.log('   - PDF Trọn bộ MPS (2 trang):', pdfCombinedPath, `(${fs.statSync(pdfCombinedPath).size} bytes)`);
    // 3. Đọc dữ liệu text từ 2 nhãn AWB thực tế
    const label1OcrText = `
MR. TRONG - 0333759825
CONG TY TNHH NHAP KHAU VA THUO
SO 883 NGO GIA TU, PHUONG DUC
100000 HA NOI
VIETNAM

8 KG
1 OF 2
SHP WT: 17 KG
SHP DWT: 16.5 KG
DWT: 50,32,25
DATE: 24 SEP 2024

SHIP TO:
AMAZON - 0000000000
250 EMERALD DR
JOLIET IL 60433
UNITED STATES

IL 604 9-02
UPS SAVER
TRACKING #: 1Z 861 R32 04 9360 9873
BILLING: P/P
DESC: Cloth Bags
INV: ANDA09241767561
`;
    const label2OcrText = `
MR. TRONG - 0333759825
CONG TY TNHH NHAP KHAU VA THUO
SO 883 NGO GIA TU, PHUONG DUC
100000 HA NOI
VIETNAM

9 KG
2 OF 2
SHP WT: 17 KG
SHP DWT: 16.5 KG
DWT: 50,34,25
DATE: 24 SEP 2024

SHIP TO:
AMAZON - 0000000000
250 EMERALD DR
JOLIET IL 60433
UNITED STATES

IL 604 9-02
UPS SAVER
TRACKING #: 1Z 861 R32 04 9178 6882
BILLING: P/P
DESC: Cloth Bags
INV: ANDA09241767561
`;
    // 4. Gửi yêu cầu quét & lưu vào CSDL PandaLex Express qua API POST /api/shipments/scan-awb
    const pdfB64 = fs.readFileSync(pdfCombinedPath).toString('base64');
    console.log('\n🚀 Đang gửi dữ liệu nhận diện và lưu vào CSDL PandaLex...');
    const payload = {
        autoSave: true,
        customerCode: 'PDL-KH001',
        hub: 'HAN',
        operator: 'admin',
        pdfBase64: `data:application/pdf;base64,${pdfB64}`,
        labels: [
            { ocrText: label1OcrText },
            { ocrText: label2OcrText }
        ]
    };
    const response = await axios.post('http://localhost:4000/api/shipments/scan-awb', payload);
    console.log('✅ Kết quả API scan-awb:', response.data.message);
    console.log('📦 Chi tiết vận đơn trong CSDL:');
    const d = response.data.data;
    console.log('   - ID Đơn hàng:', d.shipmentId);
    console.log('   - Hãng vận chuyển:', d.carrier);
    console.log('   - Master Tracking:', d.masterTrackingNumber);
    console.log('   - Số kiện (Pieces):', d.pieces.length);
    d.pieces.forEach((p, i) => {
        console.log(`     * Kiện ${p.pieceNumber}: Trọng lượng ${p.weightKg}kg | Kích thước ${p.dimsText} | Tracking: ${p.trackingNumber}`);
    });
    console.log('   - Tổng trọng lượng:', d.totalWeightKg, 'KG');
    console.log('   - Người gửi:', d.shipFrom.contactName, `(${d.shipFrom.phone}) - ${d.shipFrom.companyName}, ${d.shipFrom.address1}, ${d.shipFrom.city}`);
    console.log('   - Người nhận:', d.shipTo.contactName, `- ${d.shipTo.address1}, ${d.shipTo.city} ${d.shipTo.state} ${d.shipTo.postalCode}, ${d.shipTo.countryCode}`);
    console.log('   - Mặt hàng:', d.itemDescription);
    console.log('   - Số Invoice/Ref:', d.reference1);
    console.log('   - File PDF lưu trữ:', d.awbPdfUrl);
    console.log('   - Trạng thái kho:', d.status, '| Hub:', d.hub);
    console.log('   - Cước phí bán:', d.sellPrice.toLocaleString('vi-VN'), 'VNĐ');
    // 5. Kiểm tra truy vấn trực tiếp từ API Get Shipment
    console.log('\n🔍 Kiểm tra truy vấn lại từ API hệ thống:');
    const verifyRes = await axios.get(`http://localhost:4000/api/shipments/${d.shipmentId}`);
    console.log('✅ Truy vấn thành công! Vận đơn đã tồn tại an toàn trong CSDL.');
}
main().catch(err => {
    console.error('Lỗi kiểm tra:', err.response?.data || err.message);
    process.exit(1);
});
