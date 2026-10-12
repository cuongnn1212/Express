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
            upsPercent: 28.5,
            fedexPercent: 23.5,
            dhlPercent: 25.0,
            notes: 'Đang áp dụng tuần này (UPS công bố 02/10, FedEx công bố 03/10)',
            isCurrent: true
        },
        {
            id: '2026-W42',
            weekLabel: 'Tuần 42 (12/10 - 18/10/2026)',
            startDate: '2026-10-12',
            endDate: '2026-10-18',
            upsPercent: 29.0,
            fedexPercent: 24.0,
            dhlPercent: 25.5,
            notes: 'Đã lên lịch áp dụng cho tuần tới theo thông báo mới',
            isCurrent: false
        }
    ];
    static config = {
        fuelSurcharge: {
            upsPercent: 28.5,
            fedexPercent: 23.5,
            dhlPercent: 25.0,
            currentWeekLabel: 'Tuần 41 (05/10 - 11/10/2026)'
        },
        ups: {
            ahcAmount: 420000,
            ahcLongestThresholdCm: 120,
            ahcSecondThresholdCm: 76,
            ahcWeightThresholdKg: 25,
            lpsAmount: 1950000,
            lpsGirthThresholdCm: 300,
            lpsMinWeightKg: 40,
            ipfAmount: 58750,
            residentialAmount: 95000,
            overMaxWeightKg: 70,
            overMaxLengthCm: 274
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
