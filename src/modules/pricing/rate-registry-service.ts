import fs from 'fs';
import path from 'path';
import { CarrierCode, CarrierRateTable, UniversalQuoteBreakdown } from '../../types/pricing.types.js';
import { ExcelRateImporter } from './excel-rate-importer.js';
import { FedExRateImporter } from './fedex-rate-importer.js';
import { UniversalPricingEngine } from './universal-pricing-engine.js';

export interface RateTableMeta {
  id: string;
  carrier: CarrierCode;
  contractName: string;
  serviceName: string;
  fileName: string;
  filePath: string;
  supportedCountries: number;
  docTiersCount: number;
  nonDocTiersCount: number;
  dimDivisor: number;
  defaultFuelPercent: number;
  uploadedAt: string;
  isActive: boolean;
}

export class RateRegistryService {
  private static uploadDir = path.resolve('uploads/rates');
  private static rateMetas: Map<string, RateTableMeta> = new Map();
  private static rateTables: Map<string, CarrierRateTable> = new Map();

  static init() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  static registerTable(table: CarrierRateTable, meta: Omit<RateTableMeta, 'supportedCountries' | 'docTiersCount' | 'nonDocTiersCount' | 'dimDivisor' | 'defaultFuelPercent'>): RateTableMeta {
    const fullMeta: RateTableMeta = {
      ...meta,
      supportedCountries: Object.keys(table.zones).length,
      docTiersCount: table.documentRates.length,
      nonDocTiersCount: table.nonDocumentRates.length,
      dimDivisor: table.dimDivisor,
      defaultFuelPercent: table.defaultFuelPercent
    };

    (table as any).id = fullMeta.id;
    this.rateMetas.set(fullMeta.id, fullMeta);
    this.rateTables.set(fullMeta.id, table);
    return fullMeta;
  }

  static getAllMetas(): RateTableMeta[] {
    return Array.from(this.rateMetas.values());
  }

  static getTable(id: string): CarrierRateTable | undefined {
    return this.rateTables.get(id);
  }

  static getMeta(id: string): RateTableMeta | undefined {
    return this.rateMetas.get(id);
  }

  static toggleTable(id: string): RateTableMeta | undefined {
    const meta = this.rateMetas.get(id);
    if (!meta) return undefined;
    meta.isActive = !meta.isActive;
    return meta;
  }

  static getActiveTables(): CarrierRateTable[] {
    const active: CarrierRateTable[] = [];
    for (const [id, meta] of this.rateMetas.entries()) {
      if (meta.isActive) {
        const tbl = this.rateTables.get(id);
        if (tbl) active.push(tbl);
      }
    }
    if (active.length === 0) {
      return Array.from(this.rateTables.values());
    }
    return active;
  }

  static normalizeCountryCode(rawCountry?: string): string {
    if (!rawCountry) return 'US';
    const clean = rawCountry.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(clean)) return clean;
    const map: Record<string, string> = {
      'USA': 'US', 'UNITED STATES': 'US', 'MỸ': 'US', 'MY': 'US', 'HOA KỲ': 'US',
      'AUSTRALIA': 'AU', 'ÚC': 'AU', 'UC': 'AU',
      'JAPAN': 'JP', 'NHẬT': 'JP', 'NHẬT BẢN': 'JP', 'NHAT BAN': 'JP',
      'CANADA': 'CA',
      'SOUTH KOREA': 'KR', 'KOREA': 'KR', 'HÀN QUỐC': 'KR', 'HAN QUOC': 'KR',
      'SINGAPORE': 'SG',
      'TAIWAN': 'TW', 'ĐÀI LOAN': 'TW', 'DAI LOAN': 'TW',
      'UK': 'GB', 'UNITED KINGDOM': 'GB', 'ANH': 'GB',
      'GERMANY': 'DE', 'ĐỨC': 'DE', 'DUC': 'DE',
      'FRANCE': 'FR', 'PHÁP': 'FR', 'PHAP': 'FR',
      'CHINA': 'CN', 'TRUNG QUỐC': 'CN',
      'HONG KONG': 'HK',
      'THAILAND': 'TH', 'THÁI LAN': 'TH'
    };
    return map[clean] || 'US';
  }

  /**
   * Tự động tính cước (Cả Giá Bán Thu Khách & Giá Gốc Chi Hãng) từ thông tin AWB + Trọng Lượng (Kg)
   */
  static calculateRateForAwb(params: {
    carrier: string;
    destinationCountry?: string;
    weightKg: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    isDocument?: boolean;
    customerCode?: string;
    cargoType?: 'GENERAL' | 'COSMETICS' | 'COSMETICS_FOOD' | 'BRANDED' | 'EYELASHES' | 'AGARWOOD' | 'HAIR' | 'DOCUMENT' | string;
    isCosmetics?: boolean;
    customsFeePerKg?: number;
    securityFeePerAwb?: number;
    vatPercent?: number;
    surgeDiscountPercent?: number;
    orderProcessingFee?: number;
    deliveryFee?: number;
    fuelPercentOverride?: number;
    rateTableId?: string;
  }): UniversalQuoteBreakdown | null {
    try {
      const tables = this.getActiveTables();
      if (tables.length === 0) return null;

      const engine = new UniversalPricingEngine(tables);
      const rawCarrier = String(params.carrier || 'UPS').trim().toUpperCase();
      const carrier: CarrierCode = (rawCarrier === 'FEDEX' ? 'FEDEX' : 'UPS');
      const countryCode = this.normalizeCountryCode(params.destinationCountry);
      const weight = Math.max(0.5, Number(params.weightKg) || 0.5);
      const effectiveDelivery = params.deliveryFee !== undefined ? params.deliveryFee : params.orderProcessingFee;

      return engine.quoteSingleCarrier(carrier, {
        carrier,
        destinationCountry: countryCode,
        actualWeightKg: weight,
        lengthCm: params.lengthCm || 10,
        widthCm: params.widthCm || 10,
        heightCm: params.heightCm || 10,
        isDocument: Boolean(params.isDocument),
        customerId: params.customerCode || 'PDL-GUEST',
        cargoType: params.cargoType,
        isCosmetics: params.isCosmetics,
        customsFeePerKg: params.customsFeePerKg,
        securityFeePerAwb: params.securityFeePerAwb,
        vatPercent: params.vatPercent,
        surgeDiscountPercent: params.surgeDiscountPercent,
        orderProcessingFee: effectiveDelivery,
        deliveryFee: effectiveDelivery,
        fuelPercentOverride: params.fuelPercentOverride,
        rateTableId: params.rateTableId
      });
    } catch (err) {
      return null;
    }
  }

  /**
   * Xử lý file tải lên từ người dùng
   */
  static processUploadedFile(file: Express.Multer.File, options: {
    carrier: CarrierCode;
    contractName: string;
    dimDivisor?: number;
    defaultFuelPercent?: number;
    fedexServiceType?: 'IP' | 'IE';
  }): RateTableMeta {
    const carrier = options.carrier;
    let rateTable: CarrierRateTable;

    if (carrier === 'UPS') {
      rateTable = ExcelRateImporter.parseUpsRateFile(file.path, {
        contractName: options.contractName,
        dimDivisor: options.dimDivisor || 5000,
        defaultFuelPercent: options.defaultFuelPercent !== undefined ? options.defaultFuelPercent : 28.5
      });
    } else if (carrier === 'FEDEX') {
      rateTable = FedExRateImporter.parseFedExRateFile(file.path, options.fedexServiceType || 'IP', {
        contractName: options.contractName,
        dimDivisor: options.dimDivisor || 5000,
        defaultFuelPercent: options.defaultFuelPercent !== undefined ? options.defaultFuelPercent : 23.5
      });
    } else {
      throw new Error(`Chưa hỗ trợ hãng ${carrier}`);
    }

    const tableId = `rate_${carrier.toLowerCase()}_${Date.now()}`;
    return this.registerTable(rateTable, {
      id: tableId,
      carrier,
      contractName: options.contractName,
      serviceName: rateTable.serviceName,
      fileName: file.originalname,
      filePath: file.path,
      uploadedAt: new Date().toISOString(),
      isActive: true
    });
  }

  private static stateFile = path.resolve('data/rate_registry_state.json');

  static isDefaultsCleared(): boolean {
    try {
      if (fs.existsSync(this.stateFile)) {
        const raw = fs.readFileSync(this.stateFile, 'utf-8');
        const parsed = JSON.parse(raw);
        return Boolean(parsed.defaultsCleared);
      }
    } catch (_) {}
    return false;
  }

  static setDefaultsCleared(cleared: boolean) {
    try {
      const dir = path.dirname(this.stateFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.stateFile, JSON.stringify({ defaultsCleared: cleared, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
    } catch (_) {}
  }

  static deleteTable(id: string): boolean {
    const deleted = this.rateMetas.delete(id) && this.rateTables.delete(id);
    if (this.rateMetas.size === 0) {
      this.setDefaultsCleared(true);
    }
    return deleted;
  }

  static clearAllTables(): number {
    const count = this.rateMetas.size;
    this.rateMetas.clear();
    this.rateTables.clear();
    this.setDefaultsCleared(true);
    return count;
  }
}
