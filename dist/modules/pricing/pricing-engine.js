export class PricingEngine {
    rateTable;
    fuelSurchargePercent;
    constructor(rateTable, fuelSurchargePercent = 28.5) {
        this.rateTable = rateTable;
        this.fuelSurchargePercent = fuelSurchargePercent;
    }
    /**
     * Tính toán trọng lượng thể tích và trọng lượng tính cước theo chuẩn quốc tế IATA
     */
    calculateWeights(actualWeightKg, lengthCm, widthCm, heightCm, dimDivisor = 5000) {
        const volumetricWeightKg = (lengthCm * widthCm * heightCm) / dimDivisor;
        const maxWeight = Math.max(actualWeightKg, volumetricWeightKg);
        // Chuẩn làm tròn nấc 0.5kg cho hàng dưới 20kg
        let chargeableWeightKg = maxWeight;
        if (maxWeight <= 20) {
            chargeableWeightKg = Math.ceil(maxWeight * 2) / 2; // Ví dụ 2.1kg -> 2.5kg
        }
        else {
            chargeableWeightKg = Math.ceil(maxWeight); // Trên 20kg làm tròn 1kg
        }
        return {
            actualWeightKg,
            volumetricWeightKg: parseFloat(volumetricWeightKg.toFixed(2)),
            chargeableWeightKg: parseFloat(chargeableWeightKg.toFixed(2))
        };
    }
    /**
     * Báo giá tức thì cho một đơn hàng Express
     */
    quote(request) {
        const weights = this.calculateWeights(request.actualWeightKg, request.lengthCm, request.widthCm, request.heightCm, this.rateTable.dimDivisor);
        // 1. Xác định Zone của nước đến
        const countryCode = request.destinationCountry.toUpperCase();
        const zone = this.rateTable.zones[countryCode] || '1';
        // 2. Chọn bảng giá: Hàng tài liệu (Doc) hay Hàng hóa (Non-Doc)
        const tiers = request.isDocument && this.rateTable.documentRates.length > 0
            ? this.rateTable.documentRates
            : this.rateTable.nonDocumentRates;
        // 3. Khớp nấc cân
        let matchedTier = tiers.find(t => weights.chargeableWeightKg >= t.weightFrom && weights.chargeableWeightKg <= t.weightTo);
        // Nếu quá nấc tối đa, lấy nấc cao nhất
        if (!matchedTier && tiers.length > 0) {
            matchedTier = tiers[tiers.length - 1];
        }
        const baseRate = matchedTier ? (matchedTier.ratesByZone[zone] || 0) : 0;
        // 4. Tính phụ phí xăng dầu (Fuel Surcharge)
        const fuelSurchargeAmount = (baseRate * this.fuelSurchargePercent) / 100;
        const totalCostPrice = baseRate + fuelSurchargeAmount;
        // 5. Áp biên lợi nhuận (Profit Markup)
        const markupPercent = request.markupPercent ?? 15.0; // Mặc định lãi 15%
        const totalSellPrice = totalCostPrice * (1 + markupPercent / 100);
        return {
            carrier: this.rateTable.carrier,
            serviceName: this.rateTable.serviceName,
            destinationCountry: countryCode,
            zone,
            actualWeightKg: weights.actualWeightKg,
            volumetricWeightKg: weights.volumetricWeightKg,
            chargeableWeightKg: weights.chargeableWeightKg,
            baseRate: Math.round(baseRate),
            fuelSurchargePercent: this.fuelSurchargePercent,
            fuelSurchargeAmount: Math.round(fuelSurchargeAmount),
            totalCostPrice: Math.round(totalCostPrice),
            markupPercent,
            totalSellPrice: Math.round(totalSellPrice),
            currency: this.rateTable.currency,
            estimatedDeliveryDays: zone === '1' || zone === '2' ? '2 - 3 ngày' : '3 - 5 ngày'
        };
    }
}
