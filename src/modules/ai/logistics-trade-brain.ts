import { COUNTRY_TRADE_POLICIES, CountryTradePolicy } from './trade-compliance-knowledge.js';
import { TrackingService } from '../tracking/tracking-service.js';

export interface TradeAnalysisResult {
  detectedCountry?: {
    code: 'US' | 'AU' | 'CA' | 'EU' | 'GLOBAL';
    nameVi: string;
  };
  detectedItems: string[];
  riskLevel: 'RED_BANNED' | 'YELLOW_CONDITIONAL' | 'GREEN_SAFE' | 'UNKNOWN';
  intents: Array<'TAX_DUTY' | 'COMMERCIAL_RULES' | 'COMPLIANCE_CHECK' | 'PRICING' | 'TRACKING' | 'GENERAL'>;
  extractedWeightKg?: number;
  extractedAwb?: string;
  summaryAdviceVi: string;
  detailedPoints: {
    riskWarning?: string;
    taxAndDeMinimis?: string;
    requiredDocuments?: string[];
    packagingRules?: string;
    commercialAdvice?: string;
    pricingEstimate?: string;
    trackingInfo?: string;
  };
}

export class LogisticsTradeBrain {
  /**
   * Phân tích câu hỏi và trích xuất thực thể (Quốc gia, Mặt hàng, Trọng lượng, AWB, Ý định)
   */
  static analyzeQuery(text: string): TradeAnalysisResult {
    const raw = text.toLowerCase();

    // 1. Nhận diện quốc gia đến
    let detectedCountry: { code: 'US' | 'AU' | 'CA' | 'EU' | 'GLOBAL'; nameVi: string } | undefined;
    if (raw.match(/\b(mỹ|hoa kỳ|usa|us|united states|california|texas|new york|houston|los angeles|chicago)\b/)) {
      detectedCountry = { code: 'US', nameVi: 'Mỹ (Hoa Kỳ)' };
    } else if (raw.match(/\b(úc|australia|au|sydney|melbourne|brisbane|perth|adelaide)\b/)) {
      detectedCountry = { code: 'AU', nameVi: 'Úc (Australia)' };
    } else if (raw.match(/\b(canada|ca|toronto|vancouver|montreal|ontario|quebec)\b/)) {
      detectedCountry = { code: 'CA', nameVi: 'Canada' };
    } else if (raw.match(/\b(châu âu|eu|pháp|đức|anh|uk|germany|france)\b/)) {
      detectedCountry = { code: 'EU', nameVi: 'Châu Âu (EU/UK)' };
    }

    // 2. Nhận diện mặt hàng
    const detectedItems: string[] = [];
    const itemMatchers: Array<{ keyword: RegExp; label: string }> = [
      { keyword: /(khô gà|gà khô|chà bông|ruốc thịt|lạp xưởng|thịt heo|thịt bò|nem chua|thịt sấy|phở bò)/, label: 'Thịt động vật gia súc/gia cầm' },
      { keyword: /(tổ yến|yến sào|yến chưng|nước yến)/, label: 'Yến sào' },
      { keyword: /(trứng|trứng muối|bánh pía|bánh trung thu)/, label: 'Trứng và chế phẩm từ trứng' },
      { keyword: /(hạt giống|hạt mầm|hạt sen tươi|đất|cây cảnh|rau củ quả tươi)/, label: 'Hạt giống / Thực vật tươi sống' },
      { keyword: /(cá khô|tôm khô|mực khô|thủy hải sản khô)/, label: 'Thủy hải sản khô' },
      { keyword: /(bánh tráng|bánh mứt|cà phê|trà|hạt điều|hoa quả sấy|mì tôm)/, label: 'Thực phẩm khô thực vật' },
      { keyword: /(đồ gỗ|bàn ghế|mây tre|gỗ mỹ nghệ|tượng gỗ|lục bình)/, label: 'Sản phẩm từ gỗ mỹ nghệ & mây tre đan' },
      { keyword: /(mỹ phẩm|kem trị mụn|kem dưỡng|son|serum|tinh dầu)/, label: 'Mỹ phẩm & Hóa mỹ phẩm' },
      { keyword: /(pin|sạc dự phòng|ắc quy|lithium)/, label: 'Pin và thiết bị chứa pin Lithium' },
      { keyword: /(điện thoại|laptop|máy tính|ipad|tai nghe)/, label: 'Thiết bị điện tử viễn thông' },
      { keyword: /(hàng fake|nhái|super fake|rep 1:1|quảng châu fake|gucci fake|nike fake)/, label: 'Hàng giả mạo nhãn hiệu (Fake/Replica)' },
      { keyword: /(thuốc lá|xì gà|thuốc tây|thuốc nam|dược liệu)/, label: 'Thuốc / Dược liệu' }
    ];

    for (const m of itemMatchers) {
      if (m.keyword.test(raw)) {
        detectedItems.push(m.label);
      }
    }

    // 3. Nhận diện trọng lượng nếu có (VD: 5kg, 12.5 kg, 20 ký)
    let extractedWeightKg: number | undefined;
    const weightMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kí|ký|kilogram)/);
    if (weightMatch) {
      extractedWeightKg = parseFloat(weightMatch[1].replace(',', '.'));
    }

    // 4. Nhận diện mã AWB nếu có (VD: 1Z..., 77..., PDL...)
    let extractedAwb: string | undefined;
    const awbMatch = text.match(/\b(1Z[0-9A-Z]{16}|77[0-9]{10}|PDL-[0-9A-Z]{4,10})\b/i);
    if (awbMatch) {
      extractedAwb = awbMatch[1];
    }

    // 5. Nhận diện ý định (Intents)
    const intents: Array<'TAX_DUTY' | 'COMMERCIAL_RULES' | 'COMPLIANCE_CHECK' | 'PRICING' | 'TRACKING' | 'GENERAL'> = [];
    if (raw.match(/(thuế|duty|tax|de minimis|gst|vat|hải quan|đóng thuế|chịu thuế|tiền thuế|miễn thuế)/)) {
      intents.push('TAX_DUTY');
    }
    if (raw.match(/(hóa đơn|invoice|commercial invoice|giá trị khai|khai thấp|undervaluation|ddp|dap|ddu|fba|incoterms|thương mại|chính ngạch)/)) {
      intents.push('COMMERCIAL_RULES');
    }
    if (raw.match(/(gửi được không|cấm|cho phép|điều kiện|giấy tờ|fda|msds|hun trùng|prior notice|kiểm dịch|rủi ro)/) || detectedItems.length > 0) {
      intents.push('COMPLIANCE_CHECK');
    }
    if (raw.match(/(giá|cước|bao nhiêu|báo giá|tiền gửi|phí)/) || extractedWeightKg !== undefined) {
      intents.push('PRICING');
    }
    if (raw.match(/(tra cứu|vận đơn|đang ở đâu|kiểm tra đơn|tracking)/) || extractedAwb !== undefined) {
      intents.push('TRACKING');
    }
    if (intents.length === 0) {
      intents.push('GENERAL');
    }

    // 6. Đánh giá mức độ rủi ro (Risk Level)
    let riskLevel: 'RED_BANNED' | 'YELLOW_CONDITIONAL' | 'GREEN_SAFE' | 'UNKNOWN' = 'GREEN_SAFE';

    const hasBannedItem = detectedItems.some(item => 
      item.includes('Thịt động vật') || 
      item.includes('Hàng giả mạo') || 
      (detectedCountry?.code === 'AU' && item.includes('Trứng')) ||
      (detectedCountry?.code === 'AU' && item.includes('Hạt giống'))
    );

    const hasConditionalItem = detectedItems.some(item => 
      item.includes('Yến sào') || 
      item.includes('Pin') || 
      item.includes('Mỹ phẩm') || 
      item.includes('gỗ') || 
      item.includes('Thủy hải sản khô') ||
      item.includes('Thực phẩm khô')
    );

    if (hasBannedItem) {
      riskLevel = 'RED_BANNED';
    } else if (hasConditionalItem) {
      riskLevel = 'YELLOW_CONDITIONAL';
    } else if (detectedItems.length === 0 && !detectedCountry) {
      riskLevel = 'UNKNOWN';
    }

    return {
      detectedCountry,
      detectedItems,
      riskLevel,
      intents,
      extractedWeightKg,
      extractedAwb,
      summaryAdviceVi: '',
      detailedPoints: {}
    };
  }

  /**
   * Cung cấp lời tư vấn chuyên sâu từ góc độ Pháp chế, Thương mại, Thuế và Khuyến nghị Incoterms
   */
  static async consult(query: string, customerContext?: { customerName?: string; customerCode?: string }): Promise<string> {
    const analysis = this.analyzeQuery(query);
    const country = analysis.detectedCountry?.code || 'US'; // Mặc định thị trường Mỹ nếu không chỉ định rõ
    const policy = COUNTRY_TRADE_POLICIES[country] || COUNTRY_TRADE_POLICIES.US;

    const sections: string[] = [];

    // Lời chào & Nhận diện
    const greeting = customerContext?.customerName ? `Kính chào Quý khách ${customerContext.customerName}!` : `Kính chào Quý khách!`;
    sections.push(`${greeting} PandaLex Logistics Trade Brain xin gửi đến Quý khách bản tư vấn chuyên môn chi tiết:`);

    // Phân loại cụ thể từng mặt hàng theo chính sách nước đến
    const bannedItems: string[] = [];
    const conditionalItems: string[] = [];
    const safeItems: string[] = [];

    for (const it of analysis.detectedItems) {
      const isBanned = 
        it.includes('Thịt động vật') || 
        it.includes('Hàng giả mạo') || 
        (policy.countryCode === 'AU' && (it.includes('Trứng') || it.includes('Hạt giống'))) ||
        (policy.countryCode === 'US' && it.includes('Yến sào'));

      if (isBanned) {
        bannedItems.push(it);
      } else if (
        it.includes('Thủy hải sản khô') || 
        it.includes('Thực phẩm khô') || 
        it.includes('gỗ') || 
        it.includes('Mỹ phẩm') || 
        it.includes('Pin') || 
        it.includes('Yến sào')
      ) {
        conditionalItems.push(it);
      } else {
        safeItems.push(it);
      }
    }

    // --- PHẦN 1: CẢNH BÁO MẶT HÀNG CẤM (NẾU CÓ) ---
    if (bannedItems.length > 0) {
      sections.push(`\n🚫 **CẢNH BÁO ĐỎ - MẶT HÀNG CẤM TUYỆT ĐỐI VÀO ${policy.countryNameVi.toUpperCase()}:**
Hệ thống phát hiện mặt hàng vi phạm kiểm dịch / sở hữu trí tuệ nghiêm ngặt:
${bannedItems.map(it => {
  if (it.includes('Thịt động vật')) {
    return `• **${it}:** Cấm tuyệt đối do nguy cơ dịch bệnh gia súc/gia cầm (Dịch tả lợn châu Phi, Cúm H5N1). Máy soi chiếu X-Ray và chó nghiệp vụ tại sân bay sẽ tịch thu, tiêu hủy ngay và đưa người nhận vào hồ sơ cảnh báo hải quan.`;
  }
  if (it.includes('Hàng giả mạo')) {
    return `• **${it}:** Hải quan sở tại áp dụng chính sách Không Khoan Nhượng (Zero Tolerance) với hàng nhái thương hiệu quốc tế. Tịch thu tiêu hủy 100% và phạt tiền.`;
  }
  if (it.includes('Trứng')) {
    return `• **${it}:** Kiểm dịch Úc (DAFF) cấm mọi chế phẩm từ trứng chưa qua xử lý công nghiệp tiêu chuẩn.`;
  }
  if (it.includes('Hạt giống')) {
    return `• **${it}:** Cấm tuyệt đối hạt có khả năng nảy mầm hoặc đất dính rễ để bảo vệ hệ sinh thái nông nghiệp.`;
  }
  return `• **${it}:** Cấm nhập khẩu theo quy định hiện hành.`;
}).join('\n')}
⚠️ **Khuyến nghị PandaLex:** Khách hàng cần **LOẠI BỎ HOÀN TOÀN** các mặt hàng này khỏi kiện hàng trước khi gửi để tránh bị giữ hoặc tiêu hủy toàn bộ kiện!`);
    }

    // --- PHẦN 2: MẶT HÀNG GỬI ĐƯỢC CÓ ĐIỀU KIỆN ---
    if (conditionalItems.length > 0) {
      sections.push(`\n⚠️ **MẶT HÀNG GỬI ĐƯỢC CÓ ĐIỀU KIỆN (BẮT BUỘC ĐÁP ỨNG TIÊU CHUẨN):**
${conditionalItems.map(it => {
  if (it.includes('Thủy hải sản khô') || it.includes('Thực phẩm khô')) {
    return `• **${it}:** ĐƯỢC PHÉP GỬI. Bắt buộc hút chân không (Vacuum Packed), nhãn mác thương mại ghi rõ thành phần & hạn sử dụng bằng tiếng Anh.${policy.countryCode === 'US' ? ' Bắt buộc đăng ký cơ sở FDA và tạo mã Prior Notice (PN).' : ''}`;
  }
  if (it.includes('gỗ')) {
    return `• **${it}:** ĐƯỢC PHÉP GỬI. ${policy.countryCode === 'AU' ? 'Bắt buộc phải có Giấy chứng nhận Hun trùng (Fumigation Certificate chuẩn AFAS) xử lý Methyl Bromide.' : policy.countryCode === 'US' ? 'Bắt buộc khai báo Đạo luật Lacey Act (tên khoa học chi/loài Genus & Species theo USDA).' : 'Cần đảm bảo gỗ đã qua xử lý sấy nhiệt chống mối mọt.'}`;
  }
  if (it.includes('Mỹ phẩm')) {
    return `• **${it}:** ĐƯỢC PHÉP GỬI. Cần bảng chỉ dẫn an toàn hóa chất MSDS và danh sách thành phần chi tiết (Ingredients Breakdown). Không chứa chất cấm hoặc kim loại nặng.`;
  }
  if (it.includes('Pin')) {
    return `• **${it}:** Thiết bị có pin đi liền (UN3481) được phép gửi dưới 100Wh có báo cáo thử nghiệm UN38.3. Pin dự phòng rời (UN3480) phải đi chuyên tuyến Air Cargo có MSDS.`;
  }
  return `• **${it}:** Cần xuất trình hóa đơn và hồ sơ chứng từ nguồn gốc rõ ràng.`;
}).join('\n')}`);
    }

    // --- PHẦN 2: CHÍNH SÁCH THUẾ & NGƯỠNG MIỄN THUẾ (DE MINIMIS) ---
    if (analysis.intents.includes('TAX_DUTY') || analysis.intents.includes('COMMERCIAL_RULES') || analysis.riskLevel !== 'RED_BANNED') {
      sections.push(`\n🏛️ **CHÍNH SÁCH THUẾ & NGƯỠNG MIỄN THUẾ TẠI ${policy.countryNameVi.toUpperCase()}:**
• **Ngưỡng miễn thuế (De Minimis):** **${policy.deMinimisThreshold.amount} ${policy.deMinimisThreshold.currency}**. ${policy.deMinimisThreshold.descriptionVi}
• **Thuế nhập khẩu (Customs Duty):** ${policy.taxPolicy.importDuty}
• **Thuế GTGT / Tiêu dùng (VAT / GST):** ${policy.taxPolicy.vatOrGst}
• **Lưu ý phụ phí thủ tục:** ${policy.taxPolicy.brokerageFeeWarning || 'Cần khai báo chuẩn xác tránh phí lưu kho.'}
${policy.taxPolicy.antiDumpingWarning ? `• **Cảnh báo chống bán phá giá:** ${policy.taxPolicy.antiDumpingWarning}` : ''}`);
    }

    // --- PHẦN 3: LỜI KHUYÊN THƯƠNG MẠI & KHAI BÁO INVOICE ---
    sections.push(`\n💼 **LỜI KHUYÊN THƯƠNG MẠI & KHAI BÁO HÓA ĐƠN (COMMERCIAL INVOICE):**
• **Quy tắc mô tả hàng:** ${policy.commercialInvoiceRules.itemDescriptionRequirement}
• **Cảnh báo khai thấp giá trị (Undervaluation):** ${policy.commercialInvoiceRules.undervaluationRisk}
• **Khuyến nghị Incoterms:** Khuyên dùng **${policy.commercialInvoiceRules.recommendedIncoterms}** (${policy.commercialInvoiceRules.incotermAdviceVi})`);

    // --- PHẦN 4: BÁO GIÁ DỰ KIẾN (NẾU CÓ TRỌNG LƯỢNG) ---
    if (analysis.extractedWeightKg && analysis.riskLevel !== 'RED_BANNED') {
      const weight = analysis.extractedWeightKg;
      let estimatedRateVndPerKg = 245000;
      if (weight >= 21) estimatedRateVndPerKg = 205000;
      else if (weight >= 10) estimatedRateVndPerKg = 225000;

      const baseAmount = weight * estimatedRateVndPerKg;
      const fuelSurcharge = baseAmount * 0.22; // 22% phụ phí nhiên liệu tham khảo
      const totalEstimated = Math.round(baseAmount + fuelSurcharge);

      sections.push(`\n💵 **DỰ TOÁN CƯỚC VẬN CHUYỂN DỰ KIẾN (${weight} kg đi ${policy.countryNameVi}):**
• Đơn giá cước tham khảo: ~${estimatedRateVndPerKg.toLocaleString('vi-VN')} đ/kg (Đã ưu đãi theo mức cân nặng)
• Tổng cước ước tính (bao gồm phụ phí nhiên liệu): **~${totalEstimated.toLocaleString('vi-VN')} VNĐ**
• Thời gian vận chuyển dự kiến: **3 - 5 ngày làm việc** (Dịch vụ UPS Worldwide Saver / Express)`);
    }

    // --- PHẦN 5: TRA CỨU AWB NẾU KHÁCH CUNG CẤP MÃ ---
    if (analysis.extractedAwb) {
      try {
        const trackResult = await TrackingService.track(analysis.extractedAwb);
        if (trackResult && trackResult.events && trackResult.events.length > 0) {
          const latest = trackResult.events[0];
          sections.push(`\n📦 **THÔNG TIN TRA CỨU VẬN ĐƠN (${analysis.extractedAwb}):**
• Trạng thái: **${trackResult.status}**
• Vị trí mới nhất: ${latest.location} (${latest.description})
• Thời gian cập nhật: ${latest.timestamp}`);
        } else {
          sections.push(`\n📦 **MÃ VẬN ĐƠN (${analysis.extractedAwb}):** Đơn hàng đang trong quá trình thông quan và chuẩn bị nạp lên chuyến bay quốc tế.`);
        }
      } catch (_) {
        sections.push(`\n📦 **MÃ VẬN ĐƠN (${analysis.extractedAwb}):** Đang được chuyên viên tra soát hành trình thực tế.`);
      }
    }

    sections.push(`\n📞 Quý khách cần hỗ trợ xuất mã Prior Notice FDA, chứng thư Hun trùng hoặc đặt lịch Shipper qua lấy hàng tận nơi miễn phí, vui lòng để lại số điện thoại hoặc gọi trực tiếp Hotline CSKH PandaLex 24/7: **0976 843 168**.`);

    return sections.join('\n');
  }

  /**
   * Lấy cẩm nang xuất nhập khẩu tóm tắt của một quốc gia
   */
  static getCountryHandbook(countryCode: 'US' | 'AU' | 'CA'): CountryTradePolicy | null {
    return COUNTRY_TRADE_POLICIES[countryCode] || null;
  }
}
