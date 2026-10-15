import {
  CarrierCode,
  CarrierRateTable,
  UniversalQuoteBreakdown,
  UniversalQuoteRequest,
  WeightRateTier
} from '../../types/pricing.types.js';
import { CustomerPolicyService } from '../customer/customer-policy-service.js';
import { SurchargeEngine } from './surcharge-engine.js';
import { SurchargeConfigService } from './surcharge-config-service.js';
import { CustomsCargoConfigService } from './customs-cargo-config.js';

export class UniversalPricingEngine {
  private rateTables: Map<CarrierCode, CarrierRateTable> = new Map();
  private tablesList: (CarrierRateTable & { id?: string })[] = [];

  constructor(tables?: CarrierRateTable[]) {
    if (tables) {
      for (const t of tables) {
        this.registerRateTable(t);
      }
    }
  }

  registerRateTable(table: CarrierRateTable & { id?: string }): void {
    this.tablesList.push(table);
    // Lưu bảng đầu tiên cho carrier nếu chưa có, hoặc ưu tiên bảng Viettel làm mặc định
    if (!this.rateTables.has(table.carrier) || table.contractName.toUpperCase().includes('VIETTEL')) {
      this.rateTables.set(table.carrier, table);
    }
  }

  getRateTable(carrier: CarrierCode): CarrierRateTable | undefined {
    return this.rateTables.get(carrier);
  }

  getAvailableCarriers(): CarrierCode[] {
    return Array.from(new Set(this.tablesList.map(t => t.carrier)));
  }

  /**
   * Tính báo giá hoàn chỉnh cho 1 hãng cụ thể (Cả Giá Cost và Giá Bán)
   */
  quoteSingleCarrier(carrier: CarrierCode, req: UniversalQuoteRequest & { rateTableId?: string }): UniversalQuoteBreakdown {
    let table: (CarrierRateTable & { id?: string }) | undefined = undefined;

    // 1. Nếu có chỉ định cụ thể tableId
    if (req.rateTableId) {
      table = this.tablesList.find(t => t.id === req.rateTableId);
    }

    // 2. Nếu khách hàng là Frank (hoặc mã FRANK / PDL-FRANK), ưu tiên dùng bảng giá khách hàng Frank
    if (!table && req.customerId) {
      const custUpper = req.customerId.toUpperCase();
      if (custUpper.includes('FRANK')) {
        table = this.tablesList.find(t => t.carrier === carrier && (t.contractName.toUpperCase().includes('FRANK') || t.id?.includes('frank')));
      }
    }

    // 3. Nếu chưa chọn, ưu tiên bảng Viettel cho UPS
    if (!table && carrier === 'UPS') {
      table = this.tablesList.find(t => t.carrier === carrier && (t.contractName.toUpperCase().includes('VIETTEL') || t.id?.includes('viettel')));
    }

    // 4. Fallback về bảng mặc định của carrier
    if (!table) {
      table = this.rateTables.get(carrier);
    }
    if (!table && this.tablesList.length > 0) {
      table = this.tablesList.find(t => t.carrier === carrier) || this.tablesList[0];
    }

    if (!table) {
      throw new Error(`Chưa có bảng giá cho hãng ${carrier}. Vui lòng nạp bảng giá trước.`);
    }

    const countryQuery = req.destinationCountry.trim().toUpperCase();
    let zone = table.zones[countryQuery];
    if (!zone) {
      // Thử chuẩn hóa tên nước hoặc fallback
      const normMap: Record<string, string> = {
        'USA': 'US', 'UNITED STATES': 'US', 'MỸ': 'US', 'HOA KỲ': 'US',
        'AUSTRALIA': 'AU', 'ÚC': 'AU', 'SINGAPORE': 'SG', 'HONG KONG': 'HK',
        'TAIWAN': 'TW', 'NEW ZEALAND': 'NZ', 'GERMANY': 'DE', 'ĐỨC': 'DE'
      };
      const altCode = normMap[countryQuery];
      if (altCode && table.zones[altCode]) {
        zone = table.zones[altCode];
      }
    }
    if (!zone) {
      throw new Error(`Quốc gia '${req.destinationCountry}' không tìm thấy trong Zone Chart của ${carrier}.`);
    }

    // 1. Tính trọng lượng thể tích & kiểm tra giới hạn quá khổ ban đầu
    const divisor = req.dimDivisor || table.dimDivisor || 5000;
    const volWeightRaw = (req.lengthCm * req.widthCm * req.heightCm) / divisor;
    const volWeight = parseFloat(volWeightRaw.toFixed(2));
    let rawWeight = Math.max(req.actualWeightKg, volWeight);

    // 2. Chạy bộ quy tắc phụ phí tự động (Surge Emergency Fee, Demand Surcharge, AHC, LPS, IPF, Vùng xa, Giới hạn tối đa...)
    const surchargeResult = SurchargeEngine.evaluate({
      carrier,
      destinationCountry: req.destinationCountry,
      actualWeightKg: req.actualWeightKg,
      chargeableWeightKg: rawWeight,
      lengthCm: req.lengthCm,
      widthCm: req.widthCm,
      heightCm: req.heightCm,
      isResidential: req.isResidential,
      isRemoteArea: false, // Mặc định false nếu chưa tra zipcode vùng xa
      surgeDiscountPercent: req.surgeDiscountPercent !== undefined ? req.surgeDiscountPercent : 50,
      orderProcessingFee: req.orderProcessingFee
    });

    // Nếu dính LPS/Oversize -> áp sàn cân nặng tối thiểu (thường là 40kg)
    if (surchargeResult.minimumWeightEnforced && rawWeight < surchargeResult.minimumWeightEnforced) {
      rawWeight = surchargeResult.minimumWeightEnforced;
    }

    // 3. Quy tắc làm tròn cân nặng tính cước (Chargeable Weight)
    let chargeableWeight = 0;
    if (rawWeight <= 20) {
      // Làm tròn lên nấc 0.5kg
      chargeableWeight = Math.ceil(rawWeight * 2) / 2;
    } else {
      // Làm tròn lên nấc 1.0kg
      chargeableWeight = Math.ceil(rawWeight);
    }

    // 4. Tra cứu Cước Net (Base Rate)
    const isDoc = Boolean(req.isDocument);
    const candidateTiers: WeightRateTier[] = isDoc ? table.documentRates : table.nonDocumentRates;

    let matchedTier: WeightRateTier | undefined = undefined;

    // Tìm nấc cước phù hợp
    for (const tier of candidateTiers) {
      if (chargeableWeight > tier.weightFrom && chargeableWeight <= tier.weightTo) {
        matchedTier = tier;
        break;
      }
    }

    // Nếu hàng Document nhưng vượt quá nấc doc -> chuyển sang tìm bảng non-doc
    if (!matchedTier && isDoc) {
      for (const tier of table.nonDocumentRates) {
        if (chargeableWeight > tier.weightFrom && chargeableWeight <= tier.weightTo) {
          matchedTier = tier;
          break;
        }
      }
    }

    // Nếu vẫn chưa tìm thấy (vượt quá dải tối đa) -> lấy nấc cao nhất
    if (!matchedTier) {
      const allTiers = table.nonDocumentRates;
      if (allTiers.length > 0) {
        matchedTier = allTiers[allTiers.length - 1];
      }
    }

    if (!matchedTier) {
      throw new Error(`Không tìm thấy nấc giá phù hợp cho trọng lượng ${chargeableWeight}kg tại Zone ${zone}.`);
    }

    let rateInTier = matchedTier.ratesByZone[zone];
    if (rateInTier === undefined || rateInTier <= 0) {
      // Fallback 1: Thử bỏ prefix Zone (ví dụ: 'Zone 05' -> '5')
      const cleanZ = zone.replace(/^Zone\s*0?/i, '');
      rateInTier = matchedTier.ratesByZone[cleanZ] ?? matchedTier.ratesByZone[`Zone ${cleanZ}`] ?? matchedTier.ratesByZone[`Zone 0${cleanZ}`];
    }
    if ((rateInTier === undefined || rateInTier <= 0) && (zone === 'US' || zone === 'USA')) {
      rateInTier = matchedTier.ratesByZone['5'] ?? matchedTier.ratesByZone['Zone 05'];
    }
    if (rateInTier === undefined || rateInTier <= 0) {
      throw new Error(`Không có đơn giá tại Zone ${zone} cho mức cân ${chargeableWeight}kg (${carrier}).`);
    }

    // Tính Cước Net
    let baseRate = 0;
    if (matchedTier.isPerKg) {
      baseRate = Math.round(rateInTier * chargeableWeight);
    } else {
      baseRate = Math.round(rateInTier);
    }

    // 5. Kết chuyển GIÁ VỐN HÃNG (CARRIER COST)
    // CÔNG THỨC: (net + phí biến động (giảm 50%)/1kg + phí xử lý đơn/1 đơn) phụ phí xăng dầu X vat + phí hải quan/1kg + phí an ninh trên AWB
    let totalFuelableSurcharges = 0;
    let totalNonFuelSurcharges = 0;
    let surgeEmergencyFee = 0;
    let orderProcessingFee = 0;

    for (const s of surchargeResult.surcharges) {
      if (s.code === 'SURGE_EMERGENCY') {
        surgeEmergencyFee += s.amount;
      } else if (s.code === 'IPF' || s.code === 'ORDER_PROCESSING' || s.code === 'DELIVERY_FEE' || s.code === 'DIRECT_DELIVERY') {
        orderProcessingFee += s.amount;
      }

      if (s.isFuelSurchargeable) {
        totalFuelableSurcharges += s.amount;
      } else {
        totalNonFuelSurcharges += s.amount;
      }
    }

    const totalFuelableAmount = baseRate + totalFuelableSurcharges;
    const config = SurchargeConfigService.get();
    const dynamicCarrierFuel = carrier === 'UPS' 
      ? config.fuelSurcharge.upsPercent 
      : (carrier === 'FEDEX' ? config.fuelSurcharge.fedexPercent : config.fuelSurcharge.dhlPercent);
    const fuelPercent = req.fuelPercentOverride !== undefined 
      ? req.fuelPercentOverride 
      : (dynamicCarrierFuel !== undefined ? dynamicCarrierFuel : table.defaultFuelPercent);
    const fuelSurchargeAmount = Math.round((totalFuelableAmount * fuelPercent) / 100);

    const subtotalWithFuel = totalFuelableAmount + fuelSurchargeAmount;
    const vatPercent = req.vatPercent !== undefined ? req.vatPercent : 8; // Mặc định 8% VAT
    const vatAmount = Math.round((subtotalWithFuel * vatPercent) / 100);
    const totalAfterVat = subtotalWithFuel + vatAmount + totalNonFuelSurcharges;

    // Phí Hải quan / 1 kg: Áp dụng duy nhất 1 loại hàng / 1 AWB (phân biệt Hải quan UPS vs Hải quan FedEx)
    // Quy tắc: Nếu trọng lượng dưới 1 kg thì làm tròn thành 1 kg để tính phí hải quan
    const cargoRate = CustomsCargoConfigService.getCargoRate(req.cargoType || (req.isCosmetics ? 'COSMETICS_FOOD' : undefined), carrier);
    const isSupplier = Boolean(req.customerId && req.customerId.toUpperCase().includes('SUPPLIER'));
    const defaultFeePerKg = isSupplier ? cargoRate.supplierFeePerKg : cargoRate.customerFeePerKg;
    const customsFeePerKg = req.customsFeePerKg !== undefined 
      ? req.customsFeePerKg 
      : defaultFeePerKg;
    const customsWeightKg = chargeableWeight > 0 ? Math.max(1, chargeableWeight) : 0;
    const customsFeeAmount = Math.round(customsWeightKg * customsFeePerKg);
    const isCosmetics = cargoRate.cargoType.code === 'COSMETICS_FOOD' || Boolean(req.isCosmetics);

    // Phí An ninh trên AWB: Mặc định 150.000 đ / 1 đơn hàng thu từ khách hàng
    const securityFeeAmount = req.securityFeePerAwb !== undefined 
      ? Math.round(req.securityFeePerAwb) 
      : 150000;

    // TỔNG GIÁ VỐN NỘI BỘ (CARRIER COST)
    const totalCostPrice = totalAfterVat + customsFeeAmount + securityFeeAmount;

    // 6. Áp dụng chính sách Lợi nhuận để tính GIÁ BÁN CHO KHÁCH (SELLING PRICE)
    const policy = req.customerId
      ? CustomerPolicyService.getById(req.customerId)
      : CustomerPolicyService.getDefaultGuestPolicy();

    const marginPercent = req.customMarginPercent !== undefined ? req.customMarginPercent : policy.marginPercent;
    const marginFixedAmount = req.customMarginFixedAmount !== undefined ? req.customMarginFixedAmount : policy.marginFixedAmount;

    const percentProfit = Math.round((totalCostPrice * marginPercent) / 100);
    const totalMarginAmount = percentProfit + marginFixedAmount;
    const totalSellPrice = totalCostPrice + totalMarginAmount; // GIÁ BÁN CHO KHÁCH

    // Thời gian giao hàng dự kiến
    const deliveryDays = carrier === 'UPS' ? '3 - 5 ngày' : '2 - 4 ngày';

    return {
      carrier,
      serviceName: table.serviceName,
      contractName: table.contractName,
      destinationCountry: req.destinationCountry.toUpperCase(),
      zone,
      actualWeightKg: req.actualWeightKg,
      volumetricWeightKg: volWeight,
      chargeableWeightKg: chargeableWeight,
      baseRate,
      surgeEmergencyFee,
      orderProcessingFee,
      deliveryFee: orderProcessingFee,
      surcharges: surchargeResult.surcharges,
      totalFuelableAmount,
      fuelSurchargePercent: fuelPercent,
      fuelSurchargeAmount,
      totalNonFuelSurcharges,
      subtotalBeforeVat: subtotalWithFuel,
      vatPercent,
      vatAmount,
      totalAfterVat,
      cargoType: req.cargoType || (isCosmetics ? 'COSMETICS' : (isDoc ? 'DOCUMENT' : 'GENERAL')),
      isCosmetics,
      customsFeePerKg,
      customsFeeAmount,
      securityFeeAmount,
      totalCostPrice,
      customerPolicyApplied: {
        id: policy.id,
        name: policy.name,
        customerType: policy.customerType,
        marginPercent,
        marginFixedAmount
      },
      totalMarginAmount,
      totalSellPrice,
      currency: 'VND',
      estimatedDeliveryDays: deliveryDays,
      warnings: surchargeResult.warnings
    };
  }

  /**
   * Báo giá tổng hợp (cho 1 hãng hoặc tất cả các hãng để so sánh)
   */
  quote(req: UniversalQuoteRequest): UniversalQuoteBreakdown[] {
    const targetCarrier = req.carrier;
    if (targetCarrier && targetCarrier !== 'ALL') {
      return [this.quoteSingleCarrier(targetCarrier, req)];
    }

    // Nếu chọn ALL hoặc không chọn hãng -> Tính cho tất cả các hãng có sẵn
    const results: UniversalQuoteBreakdown[] = [];
    for (const carrier of this.rateTables.keys()) {
      try {
        const quote = this.quoteSingleCarrier(carrier, req);
        results.push(quote);
      } catch (err: any) {
        // Nếu nước này hãng không hỗ trợ thì bỏ qua trong danh sách so sánh
        console.warn(`Hãng ${carrier} không hỗ trợ tuyến này:`, err.message);
      }
    }
    return results;
  }

  /**
   * Xuất ma trận so sánh song song GIÁ CODE vs GIÁ BÁN cho 1 tuyến quốc gia
   */
  getComparisonMatrix(params: {
    carrier: CarrierCode;
    destinationCountry: string;
    customerId?: string;
    customMarginPercent?: number;
    customMarginFixedAmount?: number;
    fuelPercentOverride?: number;
    vatPercent?: number;
  }) {
    const table = this.rateTables.get(params.carrier);
    if (!table) {
      throw new Error(`Chưa có bảng giá cho hãng ${params.carrier}`);
    }

    const countryQuery = params.destinationCountry.trim().toUpperCase();
    const zone = table.zones[countryQuery];
    if (!zone) {
      throw new Error(`Quốc gia '${params.destinationCountry}' không tìm thấy trong Zone Chart của ${params.carrier}.`);
    }

    const config = SurchargeConfigService.get();
    const dynamicCarrierFuel = params.carrier === 'UPS'
      ? config.fuelSurcharge.upsPercent
      : (params.carrier === 'FEDEX' ? config.fuelSurcharge.fedexPercent : config.fuelSurcharge.dhlPercent);
    const fuelPercent = params.fuelPercentOverride !== undefined
      ? params.fuelPercentOverride
      : (dynamicCarrierFuel !== undefined ? dynamicCarrierFuel : table.defaultFuelPercent);

    const policy = params.customerId
      ? CustomerPolicyService.getById(params.customerId)
      : CustomerPolicyService.getDefaultGuestPolicy();

    const marginPercent = params.customMarginPercent !== undefined ? params.customMarginPercent : policy.marginPercent;
    const marginFixedAmount = params.customMarginFixedAmount !== undefined ? params.customMarginFixedAmount : policy.marginFixedAmount;
    const vatPercent = params.vatPercent || 0;

    const tiers = table.nonDocumentRates.map(tier => {
      const rawRate = tier.ratesByZone[zone] || 0;
      const weightDisplay = tier.isPerKg
        ? `${tier.weightFrom} - ${tier.weightTo} kg (đơn giá/kg)`
        : `${tier.weightTo} kg`;

      // Cước net (lấy tại mốc weightTo)
      const testWeight = tier.isPerKg ? tier.weightFrom : tier.weightTo;
      const baseNet = tier.isPerKg ? Math.round(rawRate * testWeight) : Math.round(rawRate);
      const fuelFee = Math.round((baseNet * fuelPercent) / 100);
      const subtotal = baseNet + fuelFee;
      const vatFee = Math.round((subtotal * vatPercent) / 100);
      const codePrice = subtotal + vatFee; // GIÁ CODE (COST HÃNG)

      // GUP GIÁ (MARKUP)
      const markupFromPercent = Math.round((codePrice * marginPercent) / 100);
      const markupAmount = markupFromPercent + marginFixedAmount;
      const sellPrice = codePrice + markupAmount; // GIÁ BÁN CHO KHÁCH
      const profit = markupAmount;

      return {
        weightFrom: tier.weightFrom,
        weightTo: tier.weightTo,
        isPerKg: tier.isPerKg,
        weightDisplay,
        rawRate,
        baseNet,
        fuelPercent,
        fuelFee,
        codePrice,
        marginPercent,
        marginFixedAmount,
        markupAmount,
        sellPrice,
        profit
      };
    });

    return {
      carrier: params.carrier,
      serviceName: table.serviceName,
      contractName: table.contractName,
      country: countryQuery,
      zone,
      fuelPercent,
      vatPercent,
      policyApplied: {
        id: policy.id,
        name: policy.name,
        customerType: policy.customerType,
        marginPercent,
        marginFixedAmount
      },
      tiers
    };
  }
}
