/**
 * Bộ kiểm tra & cảnh báo hàng cấm bay chuẩn IATA / Hải quan hàng không quốc tế
 */
export const RESTRICTED_RULES = [
    {
        category: 'PIN & THIẾT BỊ ĐIỆN TỬ (LITHIUM BATTERY)',
        keywords: ['PIN', 'BATTERY', 'POWER BANK', 'PIN DUPHONG', 'LITHIUM', 'SAC DU PHONG', 'PIN ROI'],
        severity: 'RESTRICTED',
        messageVi: 'Hàng chứa Pin / Pin sạc dự phòng thuộc danh mục hàng nguy hiểm (DGR Class 9).',
        solutionVi: 'Yêu cầu bảng chỉ dẫn an toàn hóa chất MSDS, chứng chỉ UN38.3 và đóng gói nhãn Pin theo tiêu chuẩn IATA Section II.'
    },
    {
        category: 'CHẤT LỎNG, CỒN & MỸ PHẨM DỄ CHÁY',
        keywords: ['NUOC HOA', 'PERFUME', 'ALCOHOL', 'CON', 'SONG PHUN', 'AEROSOL', 'SERUM', 'CHAT LONG', 'TINH DAU'],
        severity: 'RESTRICTED',
        messageVi: 'Nước hoa, chất lỏng có cồn và bình xịt áp suất có nguy cơ cháy nổ ở áp suất khoang máy bay.',
        solutionVi: 'Chỉ nhận chất lỏng thể tích nhỏ, không bắt lửa, có đóng gói chống tràn và tem nhãn phụ tiếng Anh.'
    },
    {
        category: 'THUỐC TÂY, DƯỢC PHẨM & THỰC PHẨM CHỨC NĂNG',
        keywords: ['THUOC TAY', 'MEDICINE', 'PHARMACEUTICAL', 'ANTIBIOTIC', 'THUOC BAC', 'THUOC NAM', 'KHAM BENH'],
        severity: 'RESTRICTED',
        messageVi: 'Dược phẩm xuất đi Mỹ/Châu Âu yêu cầu đơn thuốc bác sĩ và đăng ký FDA Hoa Kỳ.',
        solutionVi: 'Cần toa thuốc chỉ định người nhận hoặc giấy phép phân phối hợp pháp.'
    },
    {
        category: 'HÀNG CẤM TUYỆT ĐỐI (PROHIBITED GOODS)',
        keywords: ['VU KHI', 'WEAPON', 'DAO', 'KIEM', 'SUNG', 'GUN', 'DAN', 'MA TUY', 'DRUG', 'CANNABIS', 'TIEN MAT', 'CASH', 'VANG', 'GOLD'],
        severity: 'PROHIBITED',
        messageVi: 'Hàng cấm bay tuyệt đối theo luật Hàng không dân dụng Việt Nam và Quốc tế.',
        solutionVi: 'Từ chối nhận hàng và thông báo cơ quan chức năng nếu phát hiện gian lận.'
    },
    {
        category: 'HÀNG NHÁI / THƯƠNG HIỆU FAKE',
        keywords: ['FAKE', 'NHAI', 'REPLICA', 'SUPER FAKE', 'GUCCI', 'CHANEL', 'NIKE', 'ADIDAS', 'LOUIS VUITTON', 'LV'],
        severity: 'RESTRICTED',
        messageVi: 'Hàng giả thương hiệu bảo hộ sở hữu trí tuệ có nguy cơ bị Hải quan Mỹ (CBP) / Châu Âu tịch thu tiêu hủy.',
        solutionVi: 'Yêu cầu khách ký cam kết trách nhiệm xuất xứ hoặc có hóa đơn mua hàng chính hãng.'
    }
];
export class AviationComplianceChecker {
    /**
     * Quét toàn bộ mô tả dòng hàng, tên hàng, ghi chú để tìm từ khóa hàng nguy hiểm
     */
    static check(descriptions) {
        const textToCheck = descriptions.join(' ').toUpperCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D');
        const warnings = [];
        let hasProhibited = false;
        let hasRestricted = false;
        for (const rule of RESTRICTED_RULES) {
            for (const kw of rule.keywords) {
                const normalizedKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D');
                // Tìm từ khóa
                if (textToCheck.includes(normalizedKw)) {
                    warnings.push({
                        category: rule.category,
                        keywordMatched: kw,
                        severity: rule.severity,
                        messageVi: rule.messageVi,
                        solutionVi: rule.solutionVi
                    });
                    if (rule.severity === 'PROHIBITED')
                        hasProhibited = true;
                    if (rule.severity === 'RESTRICTED')
                        hasRestricted = true;
                    break; // Đã match danh mục này thì chuyển sang danh mục tiếp theo
                }
            }
        }
        return {
            hasProhibited,
            hasRestricted,
            warnings
        };
    }
}
