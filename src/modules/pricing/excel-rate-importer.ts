import pkg from 'xlsx';
const xlsx = (pkg as any).default || pkg;
import { CarrierRateTable, WeightRateTier } from '../../types/pricing.types.js';

export class ExcelRateImporter {
  /**
   * Import bảng giá chuẩn UPS từ file Excel báo giá thực tế
   */
  static parseUpsRateFile(
    filePath: string,
    options?: { contractName?: string; dimDivisor?: number; defaultFuelPercent?: number }
  ): CarrierRateTable {
    const workbook = xlsx.readFile(filePath);

    // 1. Đọc Zone Chart
    const zoneMap: Record<string, string> = {};
    const zoneSheetName = workbook.SheetNames.find((s: string) => s.toLowerCase().includes('zone')) || 'Zone chart';
    if (workbook.Sheets[zoneSheetName]) {
      const zoneRows: any[][] = xlsx.utils.sheet_to_json(workbook.Sheets[zoneSheetName], { header: 1 });
      // Tìm dòng bắt đầu danh sách nước (cột 0 là Country Code 2 ký tự)
      for (const row of zoneRows) {
        if (!row || !row[0]) continue;
        const code = String(row[0]).trim().toUpperCase();
        if (code.length === 2 && /^[A-Z]{2}$/.test(code)) {
          // Cột 4 hoặc 5 thường là Zone của Express Saver
          const zoneVal = row[4] !== undefined && row[4] !== 0 ? row[4] : (row[2] || row[3] || '1');
          zoneMap[code] = String(zoneVal).trim();
        }
      }
    }

    // 2. Đọc Bảng giá EXPORT
    const exportSheetName = workbook.SheetNames.find((s: string) => s.toLowerCase().includes('export') || s.toLowerCase() === 'vn') || 'EXPORT';
    const exportSheet = workbook.Sheets[exportSheetName];
    const exportRows: any[][] = xlsx.utils.sheet_to_json(exportSheet, { header: 1 });

    const docRates: WeightRateTier[] = [];
    const nonDocRates: WeightRateTier[] = [];

    let currentSection: 'NONE' | 'DOC' | 'NON_DOC' = 'NONE';
    let zoneHeaders: string[] = [];

    for (let i = 0; i < exportRows.length; i++) {
      const row = exportRows[i];
      if (!row || row.length === 0) continue;

      const rowText = row.join(' ').toLowerCase();

      if (rowText.includes('non-document rates:')) {
        currentSection = 'NON_DOC';
        continue;
      } else if (rowText.includes('document rates:')) {
        currentSection = 'DOC';
        continue;
      }

      // Nhận diện dòng tiêu đề Zone: [0, '(kg)', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10...]
      if (row.some(cell => String(cell).toLowerCase().includes('(kg)') || String(cell).toLowerCase() === 'weight')) {
        zoneHeaders = [];
        for (let colIdx = 2; colIdx < row.length; colIdx++) {
          const val = row[colIdx];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            zoneHeaders[colIdx] = String(val).trim();
          }
        }
        continue;
      }

      // Đọc các dòng nấc cân: cột 0 là weightFrom, cột 1 là weightTo
      const wFrom = parseFloat(row[0]);
      const wTo = parseFloat(row[1]);

      if (!isNaN(wFrom) && !isNaN(wTo) && wTo > 0) {
        const ratesByZone: Record<string, number> = {};
        for (let colIdx = 2; colIdx < row.length; colIdx++) {
          const zoneName = zoneHeaders[colIdx] || String(colIdx - 1);
          const price = parseFloat(row[colIdx]);
          if (!isNaN(price) && price > 0) {
            ratesByZone[zoneName] = price;
          }
        }

        const tier: WeightRateTier = {
          weightFrom: wFrom,
          weightTo: wTo,
          ratesByZone,
          isPerKg: wFrom >= 20.01
        };

        if (currentSection === 'DOC') {
          docRates.push(tier);
        } else if (currentSection === 'NON_DOC') {
          nonDocRates.push(tier);
        }
      }
    }

    return {
      carrier: 'UPS',
      serviceName: 'UPS Express Saver',
      contractName: options?.contractName || 'UPS Official Quotation 2026',
      currency: 'VND',
      dimDivisor: options?.dimDivisor || 5000,
      defaultFuelPercent: options?.defaultFuelPercent !== undefined ? options.defaultFuelPercent : 28.5,
      documentRates: docRates,
      nonDocumentRates: nonDocRates,
      zones: zoneMap
    };
  }
}
