import fs from 'fs';
import path from 'path';
import { ExcelRateImporter } from './excel-rate-importer.js';
import { FedExRateImporter } from './fedex-rate-importer.js';
export class RateRegistryService {
    static uploadDir = path.resolve('uploads/rates');
    static rateMetas = new Map();
    static rateTables = new Map();
    static init() {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }
    static registerTable(table, meta) {
        const fullMeta = {
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
    static getAllMetas() {
        return Array.from(this.rateMetas.values());
    }
    static getTable(id) {
        return this.rateTables.get(id);
    }
    static getMeta(id) {
        return this.rateMetas.get(id);
    }
    static toggleTable(id) {
        const meta = this.rateMetas.get(id);
        if (!meta)
            return undefined;
        meta.isActive = !meta.isActive;
        return meta;
    }
    /**
     * Xử lý file tải lên từ người dùng
     */
    static processUploadedFile(file, options) {
        const carrier = options.carrier;
        let rateTable;
        if (carrier === 'UPS') {
            rateTable = ExcelRateImporter.parseUpsRateFile(file.path, {
                contractName: options.contractName,
                dimDivisor: options.dimDivisor || 5000,
                defaultFuelPercent: options.defaultFuelPercent !== undefined ? options.defaultFuelPercent : 28.5
            });
        }
        else if (carrier === 'FEDEX') {
            rateTable = FedExRateImporter.parseFedExRateFile(file.path, options.fedexServiceType || 'IP', {
                contractName: options.contractName,
                dimDivisor: options.dimDivisor || 5000,
                defaultFuelPercent: options.defaultFuelPercent !== undefined ? options.defaultFuelPercent : 23.5
            });
        }
        else {
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
    static deleteTable(id) {
        return this.rateMetas.delete(id) && this.rateTables.delete(id);
    }
}
