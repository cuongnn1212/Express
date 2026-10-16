export type CarrierCode = 'UPS' | 'FEDEX' | 'DHL';

export interface CountryZone {
  countryCode: string;
  countryName: string;
  zone: string;
}

export interface WeightRateTier {
  weightFrom: number;
  weightTo: number;
  ratesByZone: Record<string, number>; // zone -> price (VND)
  isPerKg?: boolean; // true if price is rate-per-kg instead of flat amount
}

export interface CarrierRateTable {
  carrier: CarrierCode;
  serviceName: string;
  contractName: string; // e.g. "UPS Official 2026", "FedEx Export Jul 2026"
  currency: 'VND' | 'USD';
  dimDivisor: number; // 5000 or 6000
  defaultFuelPercent: number; // e.g. 28.5%
  documentRates: WeightRateTier[];
  nonDocumentRates: WeightRateTier[];
  zones: Record<string, string>; // CountryCode / CountryName -> Zone
}

export interface SurchargeItem {
  code: string; // AHC, LPS, ODA, IPF, RESIDENTIAL
  name: string; // Tên phụ phí tiếng Việt & Anh
  amount: number;
  isFuelSurchargeable: boolean; // Có phải nhân với phí xăng dầu không
  triggerReason: string; // Lý do phát sinh (VD: Cạnh dài 130cm > 120cm)
}

export interface CustomerPolicy {
  id: string; // ID hệ thống (VD: cty_abc)
  customerCode?: string; // MÃ KHÁCH HÀNG (VD: CUST-8821, AG-002, VIP-105)
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  customerType: 'PUBLIC_GUEST' | 'AGENT' | 'VIP' | 'REGULAR';
  paymentTerm: 'PREPAID' | 'POSTPAID'; // THANH TOÁN TIỀN NGAY (Prepaid) HOẶC THANH TOÁN SAU / CÔNG NỢ (Postpaid)
  creditLimit?: number; // Hạn mức công nợ (VND) nếu thanh toán sau
  creditDays?: number; // Số ngày cho nợ (VD: 7, 15, 30 ngày)
  marginType: 'PERCENT' | 'FIXED' | 'PERCENT_AND_FIXED';
  marginPercent: number; // e.g. 20 (20%)
  marginFixedAmount: number; // e.g. 50000 VND
  assignedCarrier?: CarrierCode;
  note?: string;
}


export interface UniversalQuoteBreakdown {
  carrier: CarrierCode;
  serviceName: string;
  contractName: string;
  destinationCountry: string;
  zone: string;
  actualWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  
  // Chi tiết giá COST (Giá vốn)
  baseRate: number; // Cước Net
  surgeEmergencyFee?: number; // Phí biến động (đã giảm 50%)
  orderProcessingFee?: number; // Phí xử lý đơn hàng / 1 đơn hàng (IPF 58,750 đ đi US)
  surcharges: SurchargeItem[];
  totalFuelableAmount: number; // BaseRate + Phụ phí chịu xăng (Net + Biến động 50% + Xử lý đơn)
  fuelSurchargePercent: number;
  fuelSurchargeAmount: number;
  totalNonFuelSurcharges: number;
  subtotalBeforeVat: number;
  vatPercent: number;
  vatAmount: number;
  totalAfterVat?: number; // Cước Hãng đã bao gồm FSC và VAT (trước khi cộng Hải quan và An ninh)
  cargoType?: string;
  cargoTypeDisplayName?: string;
  isCosmetics?: boolean;
  deliveryFee?: number; // Phí phát hàng (chịu phụ phí nhiên liệu)
  customsFeePerKg?: number;
  customsFeeAmount?: number; // Phí Hải quan / 1 kg (theo loại hàng)
  supplierCustomsFeePerKg?: number;
  supplierCustomsFeeAmount?: number;
  customerCustomsFeePerKg?: number;
  customerCustomsFeeAmount?: number;
  securityFeeAmount?: number; // Phí An ninh trên AWB
  totalCostPrice: number; // TỔNG GIÁ VỐN NỘI BỘ

  // Chi tiết GIÁ BÁN CHO KHÁCH
  customerPolicyApplied: {
    id: string;
    name: string;
    customerType: string;
    marginPercent: number;
    marginFixedAmount: number;
  };
  totalMarginAmount: number;
  totalSellPrice: number; // TỔNG GIÁ BÁN CHO KHÁCH

  currency: 'VND' | 'USD';
  estimatedDeliveryDays: string;
  warnings: string[];
}

export interface UniversalQuoteRequest {
  carrier?: CarrierCode | 'ALL'; // UPS, FEDEX, or ALL (compare)
  destinationCountry: string; // 'US', 'JP', 'Australia', etc.
  postalCode?: string;
  actualWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  isDocument?: boolean;
  customerId?: string; // ID của khách hàng đã setup (nếu có)
  customMarginPercent?: number; // Override % lợi nhuận
  customMarginFixedAmount?: number; // Override số tiền lợi nhuận cố định
  isResidential?: boolean;
  vatPercent?: number; // Default 8%
  fuelPercentOverride?: number; // Override fuel surcharge % nếu cần
  dimDivisor?: number; // Hệ số chia thể tích: 5000 (IATA Express) hoặc 6000 (Cargo / Tuyến riêng)
  cargoType?: 'GENERAL' | 'COSMETICS' | 'COSMETICS_FOOD' | 'BRANDED' | 'EYELASHES' | 'AGARWOOD' | 'HAIR' | 'DOCUMENT' | string;
  isCosmetics?: boolean;
  customsFeePerKg?: number; // Mặc định 40,000 đ/kg nếu là Hàng mỹ phẩm
  securityFeePerAwb?: number; // Phí An ninh trên AWB
  surgeDiscountPercent?: number; // Mặc định giảm 50% phí biến động
  orderProcessingFee?: number; // Phí xử lý đơn hàng/1 đơn hàng
  deliveryFee?: number; // Phí phát hàng/1 đơn (chịu phụ phí nhiên liệu)
}

export interface QuoteRequest {
  destinationCountry: string;
  actualWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  isDocument?: boolean;
  markupPercent?: number;
}

export interface QuoteBreakdown {
  carrier: CarrierCode;
  serviceName: string;
  destinationCountry: string;
  zone: string;
  actualWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  baseRate: number;
  fuelSurchargePercent: number;
  fuelSurchargeAmount: number;
  totalCostPrice: number;
  markupPercent: number;
  totalSellPrice: number;
  currency: 'VND' | 'USD';
  estimatedDeliveryDays: string;
}
