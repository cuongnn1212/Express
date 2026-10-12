import pkg from 'xlsx';
const xlsx = pkg.default || pkg;
// Mapping ISO 2-letter codes to common names in FedEx Zone sheet
const ISO_TO_FEDEX_COUNTRY = {
    US: 'U.S.A.',
    USA: 'U.S.A.',
    JP: 'Japan',
    AU: 'Australia',
    CA: 'Canada',
    KR: 'South Korea',
    CN: 'China (Excluding China South)',
    HK: 'Hong Kong SAR, China',
    SG: 'Singapore',
    TW: 'Taiwan, China',
    GB: 'United Kingdom (Great Britain)',
    UK: 'United Kingdom (Great Britain)',
    DE: 'Germany',
    FR: 'France',
    IT: 'Italy',
    ES: 'Spain',
    NL: 'Netherlands',
    TH: 'Thailand',
    MY: 'Malaysia',
    PH: 'Philippines',
    ID: 'Indonesia',
    IN: 'India',
    NZ: 'New Zealand',
    AE: 'United Arab Emirates',
    SA: 'Saudi Arabia',
    CH: 'Switzerland',
    SE: 'Sweden',
    NO: 'Norway',
    DK: 'Denmark',
    PL: 'Poland',
    BE: 'Belgium',
    AT: 'Austria',
    CZ: 'Czech Republic',
    IE: 'Ireland',
    FI: 'Finland',
    PT: 'Portugal',
    GR: 'Greece',
    HU: 'Hungary',
    RO: 'Romania',
    BR: 'Brazil',
    MX: 'Mexico',
    ZA: 'South Africa',
    RU: 'Russia'
};
export class FedExRateImporter {
    /**
     * Import bảng giá chuẩn FedEx từ file Excel thực tế
     */
    static parseFedExRateFile(filePath, serviceType = 'IP', options) {
        const workbook = xlsx.readFile(filePath);
        // 1. Đọc sheet ZONE
        const zoneMap = {};
        const zoneSheetName = workbook.SheetNames.find((s) => s.toUpperCase().includes('ZONE')) || 'ZONE';
        const zoneSheet = workbook.Sheets[zoneSheetName];
        if (zoneSheet) {
            const zoneRows = xlsx.utils.sheet_to_json(zoneSheet, { header: 1 });
            // Tìm dòng danh sách: Row 7 (index 6) có header [null, null, null, 'IPE', 'IP', 'IE', 'IPF', 'IEF']
            const colIndex = serviceType === 'IE' ? 5 : 4; // IP là cột index 4, IE là cột index 5
            for (let i = 7; i < zoneRows.length; i++) {
                const row = zoneRows[i];
                if (!row || !row[0])
                    continue;
                const countryName = String(row[0]).trim();
                const zoneVal = row[colIndex] ? String(row[colIndex]).trim().toUpperCase() : '';
                if (zoneVal) {
                    // Map theo Tên đầy đủ
                    zoneMap[countryName.toUpperCase()] = zoneVal;
                    // Map theo các từ khóa rút gọn
                    const cleanName = countryName.replace(/[^a-zA-Z0-9 ]/g, '').trim().toUpperCase();
                    zoneMap[cleanName] = zoneVal;
                }
            }
            // Bổ sung mapping ISO codes vào zoneMap
            for (const [iso, targetName] of Object.entries(ISO_TO_FEDEX_COUNTRY)) {
                const foundZone = zoneMap[targetName.toUpperCase()];
                if (foundZone) {
                    zoneMap[iso.toUpperCase()] = foundZone;
                }
            }
        }
        // 2. Đọc sheet biểu cước (IP SELL hoặc IE SELL)
        const targetSheetPattern = serviceType === 'IE' ? 'IE' : 'IP';
        const rateSheetName = workbook.SheetNames.find((s) => s.toUpperCase().includes(targetSheetPattern) && s.toUpperCase().includes('SELL')) || (serviceType === 'IE' ? 'IE SELL' : 'IP  SELL');
        const rateSheet = workbook.Sheets[rateSheetName];
        if (!rateSheet) {
            throw new Error(`Không tìm thấy sheet ${rateSheetName} trong file FedEx.`);
        }
        const rateRows = xlsx.utils.sheet_to_json(rateSheet, { header: 1 });
        // Tìm dòng header Zone (thường là row 10 chứa ['Rates in VND', null, 'A', 'B', 'C', ...])
        let zoneHeaders = [];
        let headerRowIndex = -1;
        for (let i = 0; i < 15; i++) {
            const row = rateRows[i];
            if (row && row.some(cell => String(cell).includes('Rates in VND') || String(cell) === 'A')) {
                headerRowIndex = i;
                zoneHeaders = [];
                for (let col = 2; col < row.length; col++) {
                    if (row[col]) {
                        zoneHeaders[col] = String(row[col]).trim().toUpperCase();
                    }
                }
                break;
            }
        }
        const docRates = [];
        const nonDocRates = [];
        // Duyệt các dòng cước
        for (let i = headerRowIndex + 1; i < rateRows.length; i++) {
            const row = rateRows[i];
            if (!row || row.length === 0)
                continue;
            const firstCell = String(row[0] || '').trim();
            const secondCell = String(row[1] || '').trim();
            // Kiểm tra nấc Envelope / Pak (Document)
            if (firstCell.includes('Envelope') || firstCell.includes('Pak') || (secondCell && parseFloat(secondCell) <= 2.5 && docRates.length < 6 && !firstCell.includes('Priority'))) {
                const wVal = parseFloat(secondCell);
                if (!isNaN(wVal) && wVal > 0) {
                    const ratesByZone = {};
                    for (let col = 2; col < row.length; col++) {
                        const zName = zoneHeaders[col];
                        const price = parseFloat(row[col]);
                        if (zName && !isNaN(price) && price > 0) {
                            ratesByZone[zName] = price;
                        }
                    }
                    if (Object.keys(ratesByZone).length > 0) {
                        docRates.push({
                            weightFrom: wVal <= 0.5 ? 0.01 : wVal - 0.5,
                            weightTo: wVal,
                            ratesByZone,
                            isPerKg: false
                        });
                    }
                }
            }
            // Kiểm tra nấc cố định Non-Doc (0.5kg -> 20.5kg)
            const wVal = parseFloat(secondCell);
            if (!isNaN(wVal) && wVal > 0 && wVal <= 20.5) {
                const ratesByZone = {};
                for (let col = 2; col < row.length; col++) {
                    const zName = zoneHeaders[col];
                    const price = parseFloat(row[col]);
                    if (zName && !isNaN(price) && price > 0) {
                        ratesByZone[zName] = price;
                    }
                }
                if (Object.keys(ratesByZone).length > 0) {
                    nonDocRates.push({
                        weightFrom: wVal <= 0.5 ? 0.01 : wVal - 0.5,
                        weightTo: wVal,
                        ratesByZone,
                        isPerKg: false
                    });
                }
            }
            // Kiểm tra các dải nấc tính theo kg (Rates per kg: 21-44, 45-70, 71-99, 100-299, 300-499, 500-999, 1000+)
            if (secondCell.includes('-') || secondCell.includes('+') || secondCell.includes('1000')) {
                const parts = secondCell.replace(/,/g, '').split('-').map(p => parseFloat(p.trim()));
                let wFrom = parts[0];
                let wTo = parts[1] || 99999;
                if (!isNaN(wFrom)) {
                    const ratesByZone = {};
                    for (let col = 2; col < row.length; col++) {
                        const zName = zoneHeaders[col];
                        const price = parseFloat(row[col]);
                        if (zName && !isNaN(price) && price > 0) {
                            ratesByZone[zName] = price;
                        }
                    }
                    if (Object.keys(ratesByZone).length > 0) {
                        nonDocRates.push({
                            weightFrom: wFrom,
                            weightTo: wTo,
                            ratesByZone,
                            isPerKg: true // ĐƠN GIÁ THEO MỖI KG
                        });
                    }
                }
            }
        }
        return {
            carrier: 'FEDEX',
            serviceName: serviceType === 'IE' ? 'FedEx International Economy' : 'FedEx International Priority',
            contractName: options?.contractName || 'FedEx Export Update Jul 2026',
            currency: 'VND',
            dimDivisor: options?.dimDivisor || 5000,
            defaultFuelPercent: options?.defaultFuelPercent !== undefined ? options.defaultFuelPercent : 23.5,
            documentRates: docRates,
            nonDocumentRates: nonDocRates,
            zones: zoneMap
        };
    }
}
