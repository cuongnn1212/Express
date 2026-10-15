export class SurchargeConfigService {
    static weeklyFuelHistory = [
        {
            id: '2026-W39',
            weekLabel: 'Tuần 39 (21/09 - 27/09/2026)',
            startDate: '2026-09-21',
            endDate: '2026-09-27',
            upsPercent: 27.5,
            fedexPercent: 23.0,
            dhlPercent: 24.5,
            notes: 'Đã hoàn tất thanh quyết toán',
            isCurrent: false
        },
        {
            id: '2026-W40',
            weekLabel: 'Tuần 40 (28/09 - 04/10/2026)',
            startDate: '2026-09-28',
            endDate: '2026-10-04',
            upsPercent: 28.0,
            fedexPercent: 23.0,
            dhlPercent: 24.5,
            notes: 'Áp dụng tuần trước',
            isCurrent: false
        },
        {
            id: '2026-W41',
            weekLabel: 'Tuần 41 (05/10 - 11/10/2026)',
            startDate: '2026-10-05',
            endDate: '2026-10-11',
            upsPercent: 52.5,
            fedexPercent: 23.5,
            dhlPercent: 25.0,
            notes: 'Đang áp dụng tuần này (UPS công bố 52.5%)',
            isCurrent: true
        },
        {
            id: '2026-W42',
            weekLabel: 'Tuần 42 (12/10 - 18/10/2026)',
            startDate: '2026-10-12',
            endDate: '2026-10-18',
            upsPercent: 52.5,
            fedexPercent: 24.0,
            dhlPercent: 25.5,
            notes: 'Đã lên lịch áp dụng cho tuần tới theo thông báo mới',
            isCurrent: false
        }
    ];
    static config = {
        fuelSurcharge: {
            upsPercent: 52.5,
            fedexPercent: 23.5,
            dhlPercent: 25.0,
            currentWeekLabel: 'Tuần 41 (05/10 - 11/10/2026)'
        },
        ups: {
            ahcAmount: 420000,
            ahcDemandAmount: 42300,
            ahcLongestThresholdCm: 120,
            ahcSecondThresholdCm: 76,
            ahcWeightThresholdKg: 25,
            lpsAmount: 1950000,
            lpsDemandAmount: 148050,
            lpsGirthThresholdCm: 300,
            lpsMinWeightKg: 40,
            overMaxDemandAmount: 4700000,
            ipfAmount: 58750,
            directDeliveryAmount: 47000,
            declaredValueUnitVnd: 2350000,
            declaredValueFeePerUnitVnd: 47000,
            returnPrintLabelAmount: 23500,
            returnPlusAttempt1Amount: 103400,
            returnPlusAttempt3Amount: 150400,
            residentialAmount: 95000,
            overMaxWeightKg: 70,
            overMaxLengthCm: 274,
            surgeEmergencyFee: {
                enabled: true,
                effectivePeriod: 'Từ 27/09/2026 đến 06/02/2027',
                americasPerKg: 39950,
                europePerKg: 28200,
                ismeaPerKg: 28200,
                apacPerKg: 2350,
                anzPerKg: 2350,
                restOfWorldPerKg: 39950
            }
        },
        fedex: {
            ahsAmount: 450000,
            ahsLongestThresholdCm: 121,
            ahsSecondThresholdCm: 76,
            ahsWeightThresholdKg: 31,
            oversizeAmount: 2100000,
            oversizeGirthThresholdCm: 300,
            oversizeMinWeightKg: 40,
            residentialAmount: 90000,
            overMaxWeightKg: 68,
            overMaxLengthCm: 274
        },
        remoteArea: {
            minAmount: 650000,
            perKgRate: 13000
        }
    };
    static get() {
        return { ...this.config };
    }
    /**
     * Tra cứu mức Phí Biến Động Khẩn Cấp UPS (Surge Emergency Fee - VND/kg)
     * cho lô hàng xuất khẩu từ Việt Nam đi quốc tế theo Bảng B (hiệu lực 27/09/2026 - 06/02/2027)
     * Có hỗ trợ tỷ lệ giảm phí (mặc định giảm 50% theo chính sách hiện hành)
     */
    static getUpsSurgeRatePerKg(destinationCountry, discountPercent = 50) {
        const surge = this.config.ups.surgeEmergencyFee;
        if (!surge || !surge.enabled) {
            return { rawRatePerKg: 0, effectiveRatePerKg: 0, ratePerKg: 0, discountPercent: 0, regionName: 'Không áp dụng' };
        }
        const c = (destinationCountry || 'US').trim().toUpperCase();
        let rawRate = surge.restOfWorldPerKg;
        let region = 'Phần còn lại của thế giới';
        // 1. Úc và New Zealand: 2,350 VND/kg
        const anzCountries = new Set(['AU', 'AUS', 'AUSTRALIA', 'NZ', 'NZL', 'NEW ZEALAND']);
        if (anzCountries.has(c)) {
            rawRate = surge.anzPerKg;
            region = 'Úc & New Zealand';
        }
        else {
            // 2. Châu Á Thái Bình Dương (APAC): 2,350 VND/kg
            const apacCountries = new Set([
                'JP', 'KR', 'SG', 'TW', 'TH', 'MY', 'CN', 'HK', 'MO', 'ID', 'PH', 'IN',
                'BN', 'KH', 'LA', 'MM', 'MN', 'GU', 'AS', 'MP', 'WS', 'NC', 'VN'
            ]);
            if (apacCountries.has(c)) {
                rawRate = surge.apacPerKg;
                region = 'Châu Á Thái Bình Dương';
            }
            else {
                // 3. Châu Âu (Europe): 28,200 VND/kg
                const europeCountries = new Set([
                    'AL', 'AD', 'AM', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK',
                    'EE', 'FI', 'FR', 'GE', 'DE', 'GI', 'GR', 'GG', 'HU', 'IS', 'IE', 'IL',
                    'IT', 'JE', 'XK', 'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 'NL',
                    'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SE',
                    'CH', 'TR', 'UA', 'GB', 'UK'
                ]);
                if (europeCountries.has(c)) {
                    rawRate = surge.europePerKg;
                    region = 'Châu Âu';
                }
                else {
                    // 4. ISMEA (Trung Đông & Châu Phi): 28,200 VND/kg
                    const ismeaCountries = new Set([
                        'AF', 'DZ', 'AO', 'AZ', 'BH', 'BD', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV',
                        'TD', 'KM', 'DJ', 'EG', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'IQ',
                        'JO', 'KZ', 'KE', 'KW', 'KG', 'LB', 'LS', 'LR', 'MG', 'MW', 'MV', 'ML',
                        'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NP', 'NE', 'NG', 'OM', 'PK', 'QA',
                        'CG', 'CD', 'CI', 'TN', 'RE', 'RW', 'SA', 'LK', 'SN', 'SC', 'SL', 'ZA',
                        'SZ', 'TZ', 'TG', 'TM', 'AE', 'UAE', 'UG', 'UZ', 'YE', 'ZM', 'ZW'
                    ]);
                    if (ismeaCountries.has(c)) {
                        rawRate = surge.ismeaPerKg;
                        region = 'ISMEA (Trung Đông & Châu Phi)';
                    }
                    else {
                        // 5. Hoa Kỳ và Châu Mỹ (US, CA, MX, Nam Mỹ, Caribe): 39,950 VND/kg
                        const americasCountries = new Set([
                            'US', 'USA', 'U.S.A.', 'CA', 'MX', 'AR', 'AW', 'BS', 'BB', 'BZ', 'BM',
                            'BO', 'BR', 'KY', 'CL', 'CO', 'CR', 'CW', 'DM', 'DO', 'EC', 'SV', 'GF',
                            'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MS', 'NI', 'PA', 'PY',
                            'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'SX', 'VC', 'SR', 'TT', 'TC', 'VI',
                            'VG', 'UY', 'VE', 'AI', 'AG'
                        ]);
                        if (americasCountries.has(c)) {
                            rawRate = surge.americasPerKg;
                            region = 'Hoa Kỳ & Châu Mỹ';
                        }
                    }
                }
            }
        }
        const disc = Math.max(0, Math.min(100, discountPercent));
        const effectiveRate = Math.round(rawRate * (1 - disc / 100));
        return {
            rawRatePerKg: rawRate,
            effectiveRatePerKg: effectiveRate,
            ratePerKg: effectiveRate,
            discountPercent: disc,
            regionName: region
        };
    }
    static getWeeklyFuelList() {
        return [...this.weeklyFuelHistory].sort((a, b) => b.startDate.localeCompare(a.startDate));
    }
    static getCurrentFuelEntry() {
        const current = this.weeklyFuelHistory.find(w => w.isCurrent);
        return current || this.weeklyFuelHistory[0];
    }
    static addOrUpdateWeeklyFuel(entry) {
        const today = new Date().toISOString().slice(0, 10);
        const existing = this.weeklyFuelHistory.find(w => w.id === entry.id);
        // KIỂM TRA QUY TẮC: Thời gian đã qua (endDate < today) thì KHÔNG CHO PHÉP SỬA
        if (existing && existing.endDate < today) {
            return {
                success: false,
                message: `Thời gian của ${existing.weekLabel} đã kết thúc trong quá khứ (${existing.endDate} < ${today}). Hệ thống đã khóa dữ liệu lịch sử và không cho phép chỉnh sửa!`
            };
        }
        if (entry.isCurrent) {
            // Bỏ cờ isCurrent ở các tuần khác
            this.weeklyFuelHistory.forEach(w => w.isCurrent = false);
            this.config.fuelSurcharge = {
                upsPercent: entry.upsPercent,
                fedexPercent: entry.fedexPercent,
                dhlPercent: entry.dhlPercent || 25.0,
                currentWeekLabel: entry.weekLabel
            };
        }
        const idx = this.weeklyFuelHistory.findIndex(w => w.id === entry.id);
        if (idx >= 0) {
            this.weeklyFuelHistory[idx] = entry;
        }
        else {
            this.weeklyFuelHistory.unshift(entry);
        }
        return {
            success: true,
            message: existing ? `Đã cập nhật phụ phí cho ${entry.weekLabel}` : `Đã lưu phụ phí xăng dầu tuần mới: ${entry.weekLabel}`,
            data: entry
        };
    }
    static setWeekAsCurrent(id) {
        const found = this.weeklyFuelHistory.find(w => w.id === id);
        if (!found)
            return undefined;
        this.weeklyFuelHistory.forEach(w => w.isCurrent = false);
        found.isCurrent = true;
        this.config.fuelSurcharge = {
            upsPercent: found.upsPercent,
            fedexPercent: found.fedexPercent,
            dhlPercent: found.dhlPercent || 25.0,
            currentWeekLabel: found.weekLabel
        };
        return found;
    }
    static deleteWeeklyFuel(id) {
        const today = new Date().toISOString().slice(0, 10);
        const found = this.weeklyFuelHistory.find(w => w.id === id);
        if (!found) {
            return { success: false, message: 'Không tìm thấy tuần này trong hệ thống.' };
        }
        // Thời gian đã qua không cho phép xóa
        if (found.endDate < today) {
            return {
                success: false,
                message: `Thời gian của ${found.weekLabel} đã qua. Không được phép xóa dữ liệu lịch sử để bảo toàn đối soát cước!`
            };
        }
        if (found.isCurrent) {
            return {
                success: false,
                message: `Không thể xóa tuần ${found.weekLabel} đang được kích hoạt áp dụng hiện hành!`
            };
        }
        this.weeklyFuelHistory = this.weeklyFuelHistory.filter(w => w.id !== id);
        return {
            success: true,
            message: `Đã xóa tuần kế hoạch: ${found.weekLabel}`
        };
    }
    static update(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig,
            fuelSurcharge: {
                ...this.config.fuelSurcharge,
                ...(newConfig.fuelSurcharge || {})
            },
            ups: {
                ...this.config.ups,
                ...(newConfig.ups || {})
            },
            fedex: {
                ...this.config.fedex,
                ...(newConfig.fedex || {})
            },
            remoteArea: {
                ...this.config.remoteArea,
                ...(newConfig.remoteArea || {})
            }
        };
        return this.get();
    }
}
