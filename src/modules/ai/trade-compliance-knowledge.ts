/**
 * BẢN ĐỒ KIẾN THỨC THƯƠNG MẠI, THUẾ SUẤT & PHÁP CHẾ QUỐC TẾ (US, AU, CA, EU)
 * Chuyên sâu cho ngành Chuyển phát nhanh Quốc tế & Cross-Border Logistics
 */

export interface CountryTradePolicy {
  countryCode: 'US' | 'AU' | 'CA' | 'EU' | 'GLOBAL';
  countryNameVi: string;
  currency: string;
  deMinimisThreshold: {
    amount: number;
    currency: string;
    descriptionVi: string;
  };
  taxPolicy: {
    importDuty: string;
    vatOrGst: string;
    brokerageFeeWarning?: string;
    antiDumpingWarning?: string;
  };
  strictlyBannedItems: Array<{
    item: string;
    reasonVi: string;
    regulation: string;
  }>;
  conditionalItems: Array<{
    item: string;
    conditionVi: string;
    requiredDocs: string[];
    agency: string;
  }>;
  commercialInvoiceRules: {
    itemDescriptionRequirement: string;
    undervaluationRisk: string;
    recommendedIncoterms: 'DDP' | 'DAP';
    incotermAdviceVi: string;
  };
}

export const COUNTRY_TRADE_POLICIES: Record<string, CountryTradePolicy> = {
  US: {
    countryCode: 'US',
    countryNameVi: 'Mỹ (Hoa Kỳ)',
    currency: 'USD',
    deMinimisThreshold: {
      amount: 800,
      currency: 'USD',
      descriptionVi: 'Ngưỡng Section 321: Miễn 100% thuế nhập khẩu và thuế bang cho kiện hàng dưới $800 USD/ngày/người nhận đối với hàng cá nhân & thương mại điện tử B2C.'
    },
    taxPolicy: {
      importDuty: 'Từ 0% đến 37.5% tùy theo mã HS Code đối với hàng hóa trên $800 USD.',
      vatOrGst: 'Mỹ không có VAT liên bang, nhưng áp dụng State Sales Tax (thuế bang 0% - 10.25% tùy bang giao hàng).',
      brokerageFeeWarning: 'Hàng trên $800 USD chuyển sang diện Formal Entry (hải quan chính ngạch), phát sinh phí xử lý Merchandise Processing Fee (MPF tối thiểu $31.67 USD) + phí ủy thác của hãng chuyển phát.',
      antiDumpingWarning: 'Cảnh báo thuế chống bán phá giá (AD/CVD) cực cao (lên đến 100% - 300%) đối với: nhôm định hình, đinh thép, mật ong, pin năng lượng mặt trời, túi nilon nhựa PE từ Việt Nam.'
    },
    strictlyBannedItems: [
      {
        item: 'Thịt động vật trên cạn (heo, bò, gà, chim, lạp xưởng, chà bông/ruốc thịt)',
        reasonVi: 'CBP và USDA cấm triệt để mọi sản phẩm từ thịt từ vùng có dịch tả lợn châu Phi (ASF) và cúm gia cầm. Quét X-Ray sân bay LAX/JFK phát hiện sẽ bị tịch thu và phạt nặng.',
        regulation: 'USDA APHIS / 9 CFR 94'
      },
      {
        item: 'Yến sào thô, yến tổ chưa qua tiệt trùng công nghiệp',
        reasonVi: 'Nguy cơ mang mầm bệnh gia cầm. Chỉ được nhập khi có giấy phép USDA APHIS và xử lý nhiệt đạt chuẩn.',
        regulation: 'USDA Veterinary Services'
      },
      {
        item: 'Hàng giả, hàng nhái nhãn hiệu (Nike, Adidas, LV, Gucci, Apple, AirPods fake...)',
        reasonVi: 'Hải quan Mỹ (CBP) áp dụng chính sách Zero Tolerance với hàng xâm phạm sở hữu trí tuệ (IPR). Bị tịch thu tiêu hủy 100%, người gửi & người nhận bị lưu hồ sơ cảnh báo thương mại.',
        regulation: '19 U.S.C. 1595a(c) / CBP Intellectual Property Rights'
      },
      {
        item: 'Thuốc lá, xì gà, thuốc tây không có đơn bác sĩ Mỹ, chất kích thích, cần sa',
        reasonVi: 'Hàng quản lý đặc biệt, cấm gửi qua đường chuyển phát nhanh tiểu ngạch.',
        regulation: 'FDA / DEA Schedule Drugs'
      }
    ],
    conditionalItems: [
      {
        item: 'Thực phẩm thông thường (bánh mứt kẹo, trà, cà phê, mì tôm, hải sản khô cá/mực/tôm)',
        conditionVi: 'Bắt buộc đăng ký cơ sở sản xuất FDA và nộp mã Prior Notice (PN) nộp trước khi chuyến bay hạ cánh. Đóng gói bao bì có nhãn tiếng Anh rõ ràng.',
        requiredDocs: ['Số FDA Registration', 'Mã Prior Notice (PN)', 'Bảng kê thành phần (Ingredients)'],
        agency: 'FDA (Food and Drug Administration)'
      },
      {
        item: 'Sản phẩm từ gỗ mỹ nghệ, mây tre đan',
        conditionVi: 'Phải khai báo nguồn gốc thực vật theo Đạo luật Lacey Act (tên khoa học chi/loài Genus & Species, quốc gia khai thác).',
        requiredDocs: ['Lacey Act Declaration', 'Chứng nhận không chứa mọt/nấm'],
        agency: 'USDA APHIS'
      },
      {
        item: 'Mỹ phẩm, kem bôi da, tinh dầu',
        conditionVi: 'Cần danh sách thành phần chi tiết, nhãn mác thương mại, chứng minh không chứa chất cấm hoặc kim loại nặng.',
        requiredDocs: ['MSDS (Bảng chỉ dẫn an toàn)', 'Cosmetic Ingredient List'],
        agency: 'FDA Cosmetics'
      },
      {
        item: 'Thiết bị chứa Pin Lithium (Điện thoại, laptop, đồng hồ thông minh)',
        conditionVi: 'Pin gắn liền thiết bị (UN3481) được bay tối đa 2 thiết bị/kiện, công suất < 100Wh. Pin rời (UN3480) cấm bay máy bay hành khách thông thường.',
        requiredDocs: ['MSDS', 'Báo cáo kiểm định UN38.3'],
        agency: 'IATA Dangerous Goods Regulations'
      }
    ],
    commercialInvoiceRules: {
      itemDescriptionRequirement: 'Mô tả chi tiết chất liệu, công dụng (VD: không ghi "Clothes" mà phải ghi "Men 100% Cotton Knitted T-Shirt", không ghi "Gift").',
      undervaluationRisk: 'Nếu khai báo điện thoại/máy móc giá $10 - $20 để trốn thuế Section 321, Hải quan sẽ yêu cầu bằng chứng thanh toán ngân hàng (Bank Transfer / PayPal slip) và truy thu phạt gấp 3-5 lần.',
      recommendedIncoterms: 'DDP',
      incotermAdviceVi: 'Khuyến nghị chọn DDP (Delivered Duty Paid) cho hàng bán lẻ, FBA Amazon hoặc quà tặng để tránh phát sinh thuế bất ngờ làm người nhận từ chối nhận hàng.'
    }
  },

  AU: {
    countryCode: 'AU',
    countryNameVi: 'Úc (Australia)',
    currency: 'AUD',
    deMinimisThreshold: {
      amount: 1000,
      currency: 'AUD',
      descriptionVi: 'Hàng hóa dưới 1,000 AUD được miễn thuế nhập khẩu (Customs Duty), TUY NHIÊN vẫn phải chịu thuế GST 10% theo luật Low Value Imported Goods từ 2018.'
    },
    taxPolicy: {
      importDuty: 'Mức thuế nhập khẩu từ 0% đến 5% tùy mã HS Code khi giá trị hàng trên 1,000 AUD.',
      vatOrGst: 'Thuế GST 10% bắt buộc áp dụng từ 0 AUD đối với tất cả hàng hóa tiêu dùng nhập khẩu.',
      brokerageFeeWarning: 'Nếu gửi dạng DAP/DDU mà người gửi không đóng thuế trước, người nhận tại Úc sẽ bị thu 10% GST + phí dịch vụ thu hộ của hãng chuyển phát (~15 đến 25 AUD).',
      antiDumpingWarning: 'Úc kiểm soát chặt nhôm định hình và dây cáp điện từ châu Á.'
    },
    strictlyBannedItems: [
      {
        item: 'Thịt động vật gia súc, gia cầm dưới mọi hình thức (Khô gà, chà bông heo, lạp xưởng, cơm cháy chà bông, phở gói có gói súp thịt)',
        reasonVi: 'Úc là quốc gia có hệ thống kiểm dịch sinh học khắt khe nhất thế giới. Cấm tuyệt đối thịt vì nguy cơ lây dịch tả lợn châu Phi và dịch lở mồm long móng. Bị tiêu hủy 100% ngay tại cửa khẩu.',
        regulation: 'Department of Agriculture, Fisheries and Forestry (DAFF) / Biosecurity Act 2015'
      },
      {
        item: 'Trứng và chế phẩm từ trứng (Bánh pía trứng muối, bánh trung thu nhân trứng)',
        reasonVi: 'Cấm do nguy cơ mầm bệnh gia cầm.',
        regulation: 'DAFF Biosecurity'
      },
      {
        item: 'Yến sào thô và chưa qua chế biến tiệt trùng công nghiệp',
        reasonVi: 'Nguy cơ an toàn sinh học động vật hoang dã.',
        regulation: 'BICON Biosecurity Import Conditions'
      },
      {
        item: 'Hạt giống còn khả năng nảy mầm (hạt sen, hạt đậu, hạt dưa tươi...), đất cát dính ở đế giày/dụng cụ cắm trại',
        reasonVi: 'Nguy cơ mang mầm bệnh xâm lấn hệ sinh thái nông nghiệp Úc. Phạt hành chính lên tới 5,500 AUD.',
        regulation: 'Biosecurity Act 2015 - Section 526'
      }
    ],
    conditionalItems: [
      {
        item: 'Thủy hải sản khô (Tôm khô, cá khô, mực khô) & Thực phẩm khô thực vật (Bánh tráng, bánh mứt, trà, cà phê)',
        conditionVi: 'Bắt buộc đóng gói hút chân không (Vacuum Packed), có nhãn mác thương mại nhà máy rõ ràng (Commercial Packaging). Không nhận hàng đóng túi nilong tự cột dây thun.',
        requiredDocs: ['Commercial Invoice có thành phần rõ ràng', 'Nhãn mác công nghiệp ghi rõ nguồn gốc'],
        agency: 'DAFF (Bộ Nông Nghiệp & Kiểm Dịch Úc)'
      },
      {
        item: 'Đồ gỗ mỹ nghệ, mây tre đan, pallet gỗ',
        conditionVi: 'Bắt buộc phải có Giấy chứng nhận Hun trùng (Fumigation Certificate) đạt chuẩn AFAS (xử lý Methyl Bromide hoặc xử lý nhiệt) do đơn vị được kiểm dịch Úc công nhận cấp.',
        requiredDocs: ['Chứng thư hun trùng AFAS', 'Khai báo gỗ đã xử lý'],
        agency: 'DAFF AFAS Scheme'
      },
      {
        item: 'Mỹ phẩm, dược liệu đông y',
        conditionVi: 'Không chứa thành phần từ động vật được bảo vệ (CITES), không chứa thảo mộc tươi còn rễ/đất.',
        requiredDocs: ['MSDS', 'Danh sách thành phần tiếng Anh'],
        agency: 'TGA (Therapeutic Goods Administration)'
      }
    ],
    commercialInvoiceRules: {
      itemDescriptionRequirement: 'Bắt buộc ghi rõ tên hàng, thành phần và quy cách đóng gói (VD: "Commercial vacuum-packed dried squid", "Manufactured wooden decorative chair").',
      undervaluationRisk: 'Khai báo sai giá trị sẽ bị Hải quan Úc (ABF) tạm giữ kiểm tra và truy cứu thuế GST bổ sung.',
      recommendedIncoterms: 'DDP',
      incotermAdviceVi: 'Khuyên dùng DDP (Bao thuế) để khách nhận tại Úc không phải đóng thêm 10% GST và phí dịch vụ của bưu cục bên Úc.'
    }
  },

  CA: {
    countryCode: 'CA',
    countryNameVi: 'Canada',
    currency: 'CAD',
    deMinimisThreshold: {
      amount: 20,
      currency: 'CAD',
      descriptionVi: 'Ngưỡng miễn thuế cực thấp: Chỉ 20 CAD (khoảng 370.000 VNĐ) đối với hàng thương mại và 60 CAD đối với quà tặng cá nhân biếu tặng phi thương mại.'
    },
    taxPolicy: {
      importDuty: 'Từ 0% đến 18% tùy theo mã HS Code.',
      vatOrGst: 'Hầu hết các lô hàng đều chịu thuế GST liên bang (5%) CỘNG VỚI thuế bang (PST hoặc HST) từ 5% đến 15% (VD: Ontario thuế HST 13%, Quebec thuế kết hợp 14.975%).',
      brokerageFeeWarning: 'RẤT NGUY HIỂM: Các hãng chuyển phát quốc tế thu phí môi giới hải quan (Customs Brokerage Fee) từ $15 đến $45 CAD cho mỗi đơn hàng bị tính thuế nếu không gửi DDP. Khách nhận rất dễ bị sốc phí.',
      antiDumpingWarning: 'Canada giám sát kỹ đồ kim loại và đồ may mặc giá rẻ.'
    },
    strictlyBannedItems: [
      {
        item: 'Thịt tươi và các sản phẩm chế biến từ thịt heo, bò, gà từ vùng dịch',
        reasonVi: 'Cơ quan CFIA cấm nhằm bảo vệ ngành nông nghiệp Canada khỏi dịch bệnh.',
        regulation: 'CFIA (Canadian Food Inspection Agency)'
      },
      {
        item: 'Hàng giả mạo thương hiệu, vi phạm bản quyền',
        reasonVi: 'Hải quan Canada (CBSA) tịch thu và tiêu hủy.',
        regulation: 'CBSA Customs Act'
      },
      {
        item: 'Cần sa, chất kích thích, thuốc lá, hạt giống chưa qua kiểm định',
        reasonVi: 'Quy định cấm nhập khẩu qua đường bưu chính chuyển phát nhanh.',
        regulation: 'Health Canada / Controlled Drugs and Substances Act'
      }
    ],
    conditionalItems: [
      {
        item: 'Thực phẩm khô (cá khô, tôm khô, hạt điều rang, trà, cà phê)',
        conditionVi: 'Phải đóng gói nhà sản xuất, hạn sử dụng rõ ràng. Hàng cá khô phải ghi rõ nguồn gốc xuất xứ không phải loài nguy cấp.',
        requiredDocs: ['Commercial Invoice chi tiết', 'Bảng kê thành phần thực phẩm'],
        agency: 'CFIA'
      },
      {
        item: 'Mỹ phẩm, kem dưỡng, thực phẩm chức năng',
        conditionVi: 'Bắt buộc tuân thủ quy định nhãn mác của Health Canada, không chứa thành phần dược liệu cấm.',
        requiredDocs: ['MSDS', 'Ingredient Breakdown List'],
        agency: 'Health Canada'
      },
      {
        item: 'Đồ gỗ và sản phẩm lâm sản',
        conditionVi: 'Phải đảm bảo không có vỏ cây, không có nấm mốc hoặc dấu vết côn trùng sống.',
        requiredDocs: ['Chứng nhận khử trùng / sấy nhiệt'],
        agency: 'CFIA Plant Health'
      }
    ],
    commercialInvoiceRules: {
      itemDescriptionRequirement: 'Ghi rõ chi tiết mặt hàng, chất liệu, mã nước sản xuất (Country of Origin: Vietnam).',
      undervaluationRisk: 'Do ngưỡng thuế rất thấp (20 CAD), nếu cố tình khai báo $5 - $10 cho kiện hàng lớn sẽ bị CBSA mở kiểm hóa 100% và phạt chậm trễ.',
      recommendedIncoterms: 'DDP',
      incotermAdviceVi: 'BẮT BUỘC KHUYÊN DÙNG DDP khi gửi hàng đi Canada. Tránh tối đa hình thức DAP/DDU vì phí thủ tục thông quan (Brokerage Fee) của hãng vận chuyển cộng với thuế bang sẽ làm người nhận bức xúc.'
    }
  }
};
