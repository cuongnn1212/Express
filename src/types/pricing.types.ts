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
  vatPercent?: number; // Default 0%
  fuelPercentOverride?: number; // Override fuel surcharge % nếu cần
  dimDivisor?: number; // Hệ số chia thể tích: 5000 (IATA Express) hoặc 6000 (Cargo / Tuyến riêng)
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
  surcharges: SurchargeItem[];
  totalFuelableAmount: number; // BaseRate + Phụ phí chịu xăng
  fuelSurchargePercent: number;
  fuelSurchargeAmount: number;
  totalNonFuelSurcharges: number;
  subtotalBeforeVat: number;
  vatPercent: number;
  vatAmount: number;
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
