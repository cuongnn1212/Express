import pkg from 'xlsx';
const xlsx = pkg.default || pkg;
export class ExcelRateImporter {
    /**
     * Import bảng giá chuẩn UPS từ file Excel báo giá thực tế
     * Hỗ trợ đầy đủ:
     * 1. Sheet ZONE chuẩn mới (cột A: Country Name, B: IATA, C: WXS Zone) và chuẩn cũ (cột A: IATA, E: WXS Zone)
     * 2. Sheet EXPORT cước chuẩn mới (Export - Doc & Saver: 1 cột kg, nấc đơn 0.5-20kg, dải kg 21-44, 45-70, 71-99, 100+)
     * 3. Hỗ trợ các cột cước By Lane đặc thù cho các thị trường trọng điểm (Hong Kong, Singapore, Taiwan, Australia, New Zealand, United States)
     */
    static parseUpsRateFile(filePath, options) {
        const workbook = xlsx.readFile(filePath);
        // 1. Đọc Zone Chart (ưu tiên sheet ZONE chính xác, tránh nhầm các sheet phụ như '21kg+ zone 567')
        const zoneMap = {};
        const zoneSheetName = workbook.SheetNames.find((s) => s.trim().toUpperCase() === 'ZONE')
            || workbook.SheetNames.find((s) => s.trim().toLowerCase() === 'zone chart')
            || workbook.SheetNames.find((s) => s.toLowerCase().includes('zone chart'))
            || workbook.SheetNames.find((s) => s.toLowerCase().includes('zone'))
            || 'ZONE';
        if (workbook.Sheets[zoneSheetName]) {
            const zoneRows = xlsx.utils.sheet_to_json(workbook.Sheets[zoneSheetName], { header: 1 });
            let iataCol = -1;
            let wxsCol = -1;
            let startRow = 0;
            // Tìm dòng header chứa IATA và WXS
            for (let r = 0; r < Math.min(zoneRows.length, 10); r++) {
                const row = zoneRows[r];
                if (!row)
                    continue;
                const iataIdx = row.findIndex((c) => String(c || '').trim().toUpperCase() === 'IATA');
                const wxsIdx = row.findIndex((c) => String(c || '').trim().toUpperCase() === 'WXS');
                if (iataIdx !== -1 && wxsIdx !== -1) {
                    iataCol = iataIdx;
                    wxsCol = wxsIdx;
                    startRow = r + 1;
                    break;
                }
            }
            if (iataCol === -1) {
                // Định dạng cũ: cột 0 là IATA, cột 4 hoặc 2 là Zone
                for (const row of zoneRows) {
                    if (!row || !row[0])
                        continue;
                    const code = String(row[0]).trim().toUpperCase();
                    if (code.length === 2 && /^[A-Z]{2}$/.test(code)) {
                        const zoneVal = row[4] !== undefined && row[4] !== 0 ? row[4] : (row[2] || row[3] || '1');
                        zoneMap[code] = String(zoneVal).trim();
                    }
                }
            }
            else {
                // Định dạng mới 2026: cột iataCol là IATA, cột wxsCol là WXS Zone
                for (let r = startRow; r < zoneRows.length; r++) {
                    const row = zoneRows[r];
                    if (!row || !row[iataCol])
                        continue;
                    const countryName = String(row[0] || '').trim();
                    const code = String(row[iataCol]).trim().toUpperCase();
                    const zoneVal = String(row[wxsCol] || '').trim();
                    if (code.length === 2 && /^[A-Z]{2}$/.test(code) && zoneVal && zoneVal !== '0') {
                        zoneMap[code] = zoneVal;
                        if (countryName) {
                            zoneMap[countryName.toUpperCase()] = zoneVal;
                        }
                    }
                }
            }
        }
        // 2. Đọc Bảng giá EXPORT
        const exportSheetName = workbook.SheetNames.find((s) => s.trim().toUpperCase() === 'EXPORT - DOC & SAVER')
            || workbook.SheetNames.find((s) => s.toLowerCase().includes('export - doc'))
            || workbook.SheetNames.find((s) => s.toLowerCase().includes('export') || s.toLowerCase() === 'vn')
            || 'EXPORT';
        const exportSheet = workbook.Sheets[exportSheetName];
        const exportRows = xlsx.utils.sheet_to_json(exportSheet, { header: 1 });
        const docRates = [];
        const nonDocRates = [];
        let currentSection = 'NONE';
        let zoneHeaders = [];
        let isTwoColWeight = false;
        for (let i = 0; i < exportRows.length; i++) {
            const row = exportRows[i];
            if (!row || row.length === 0)
                continue;
            const rowText = row.map(c => String(c || '')).join(' ').toLowerCase();
            if (rowText.includes('package rates:') || rowText.includes('non-document rates:')) {
                currentSection = 'NON_DOC';
                continue;
            }
            else if (rowText.includes('document rates:')) {
                currentSection = 'DOC';
                continue;
            }
            // Nhận diện dòng tiêu đề Zone
            if (row.some(cell => String(cell).toLowerCase().includes('(kg)') || String(cell).toLowerCase().includes('weight'))) {
                zoneHeaders = [];
                // Kiểm tra xem có 2 cột cân nặng (cột 0 và cột 1) hay chỉ 1 cột
                if (row[0] !== undefined && row[1] !== undefined && String(row[1]).toLowerCase().includes('(kg)')) {
                    isTwoColWeight = true;
                }
                else {
                    isTwoColWeight = false;
                }
                const startCol = isTwoColWeight ? 2 : 1;
                for (let colIdx = startCol; colIdx < row.length; colIdx++) {
                    const val = row[colIdx];
                    if (val !== undefined && val !== null && String(val).trim() !== '') {
                        zoneHeaders[colIdx] = String(val).trim();
                    }
                }
                continue;
            }
            if (currentSection === 'NONE')
                continue;
            let wFrom = 0;
            let wTo = 0;
            let isPerKg = false;
            let startCol = 1;
            if (isTwoColWeight) {
                // Cũ: cột 0 là weightFrom, cột 1 là weightTo
                wFrom = parseFloat(row[0]);
                wTo = parseFloat(row[1]);
                if (isNaN(wFrom) || isNaN(wTo) || wTo <= 0)
                    continue;
                isPerKg = wFrom >= 20.01;
                startCol = 2;
            }
            else {
                // Mới 2026: cột 0 là Weight (kg), có thể là số đơn lẻ (0.5, 1, 1.5...) hoặc dải (21-44, 45-70, 71-99, 100+)
                const firstCell = String(row[0] || '').trim();
                if (!firstCell)
                    continue;
                if (firstCell.includes('-')) {
                    const parts = firstCell.split('-').map(p => parseFloat(p.trim()));
                    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1]))
                        continue;
                    wFrom = parts[0] - 0.99; // để khớp chargeableWeight (ví dụ 21 nằm trong (20.01, 44])
                    wTo = parts[1];
                    isPerKg = true;
                }
                else if (firstCell.includes('+')) {
                    const val = parseFloat(firstCell.replace('+', '').trim());
                    if (isNaN(val))
                        continue;
                    wFrom = val - 0.99;
                    wTo = 9999;
                    isPerKg = true;
                }
                else {
                    const singleW = parseFloat(firstCell);
                    if (isNaN(singleW) || singleW <= 0)
                        continue;
                    wTo = singleW;
                    wFrom = Math.max(0, singleW - 0.5);
                    isPerKg = singleW > 20;
                }
                startCol = 1;
            }
            const ratesByZone = {};
            for (let colIdx = startCol; colIdx < row.length; colIdx++) {
                const headerName = zoneHeaders[colIdx];
                if (!headerName)
                    continue;
                const price = parseFloat(row[colIdx]);
                if (!isNaN(price) && price > 0) {
                    ratesByZone[headerName] = price;
                    // Chuẩn hóa key theo số Zone: Zone 01 -> 1, Zone 1 -> 1
                    const matchZone = headerName.match(/Zone\s*0?(\d+)/i);
                    if (matchZone) {
                        const zNum = matchZone[1];
                        ratesByZone[zNum] = price;
                        ratesByZone['Zone ' + zNum] = price;
                        ratesByZone['Zone 0' + zNum] = price;
                    }
                    else if (/^\d+$/.test(headerName)) {
                        ratesByZone[headerName] = price;
                        ratesByZone['Zone ' + headerName] = price;
                        ratesByZone['Zone 0' + headerName] = price;
                    }
                    // Nhận diện cột By Lane chuyên biệt cho từng quốc gia
                    const lowerH = headerName.toLowerCase();
                    if (lowerH.includes('hong kong'))
                        ratesByZone['HK'] = price;
                    if (lowerH.includes('singapore'))
                        ratesByZone['SG'] = price;
                    if (lowerH.includes('taiwan'))
                        ratesByZone['TW'] = price;
                    if (lowerH.includes('australia'))
                        ratesByZone['AU'] = price;
                    if (lowerH.includes('new zealand'))
                        ratesByZone['NZ'] = price;
                    if (lowerH.includes('united states') || lowerH.includes('usa'))
                        ratesByZone['US'] = price;
                }
            }
            if (Object.keys(ratesByZone).length === 0)
                continue;
            const tier = {
                weightFrom: wFrom,
                weightTo: wTo,
                ratesByZone,
                isPerKg
            };
            if (currentSection === 'DOC') {
                docRates.push(tier);
            }
            else if (currentSection === 'NON_DOC') {
                nonDocRates.push(tier);
            }
        }
        // Nếu có cột giá Lane riêng biệt, ưu tiên map quốc gia đó vào Lane đó
        const priorityLanes = ['HK', 'SG', 'TW', 'AU', 'NZ', 'US'];
        for (const code of priorityLanes) {
            if (nonDocRates.some(t => t.ratesByZone[code] !== undefined)) {
                zoneMap[code] = code;
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
