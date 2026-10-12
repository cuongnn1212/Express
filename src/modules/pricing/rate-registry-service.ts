import fs from 'fs';
import path from 'path';
import { CarrierCode, CarrierRateTable } from '../../types/pricing.types.js';
import { ExcelRateImporter } from './excel-rate-importer.js';
import { FedExRateImporter } from './fedex-rate-importer.js';

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

  static deleteTable(id: string): boolean {
    return this.rateMetas.delete(id) && this.rateTables.delete(id);
  }
}
