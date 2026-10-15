import fs from 'fs';
import path from 'path';
const DEFAULT_CARGO_TYPES = [
    {
        code: 'GENERAL',
        name: 'Hàng thông thường',
        displayName: 'Hàng thông thường',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        description: 'Quần áo thông thường, giày dép, phụ kiện... (Trả Hải quan 8.000 đ/kg / Thu khách 40.000 đ/kg)',
        keywords: ['THONG THUONG', 'THƯỜNG', 'THUONG', 'GENERAL', 'PARCEL', 'HANG THUONG', 'QUAN AO', 'GIAY DEP', 'GOM'],
        rates: {
            UPS: { supplierFeePerKg: 8000, customerFeePerKg: 40000, hasPrice: true, note: 'Trả Hải quan UPS 8.000 đ/kg / Thu khách 40.000 đ/kg' },
            FEDEX: { supplierFeePerKg: 8000, customerFeePerKg: 8000, hasPrice: true, note: '8.000 đ/kg' }
        },
        supplierFeePerKg: 8000,
        customerFeePerKg: 40000
    },
    {
        code: 'COSMETICS_FOOD',
        name: 'Thực phẩm, mỹ phẩm',
        displayName: 'Thực phẩm, mỹ phẩm',
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
        description: 'Mỹ phẩm, kem, son, serum, thực phẩm khô, bánh kẹo, gia vị, đồ ăn...',
        keywords: ['MY PHAM', 'MỸ PHẨM', 'COSMETIC', 'COSMETICS', 'THUC PHAM', 'THỰC PHẨM', 'FOOD', 'BANH KEO', 'DO AN'],
        rates: {
            UPS: { supplierFeePerKg: 32000, customerFeePerKg: 40000, hasPrice: true, note: 'Trả Hải quan 32k / Thu khách 40k' },
            FEDEX: { supplierFeePerKg: 32000, customerFeePerKg: 40000, hasPrice: true, note: 'Trả Hải quan 32k / Thu khách 40k' }
        },
        supplierFeePerKg: 32000,
        customerFeePerKg: 40000
    },
    {
        code: 'BRANDED',
        name: 'Hàng thương hiệu',
        displayName: 'Hàng thương hiệu',
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
        description: 'Hàng có nhãn mác thương hiệu quốc tế, thời trang brand (Nike, Adidas, Gucci, LV, Chanel...)',
        keywords: ['THUONG HIEU', 'THƯƠNG HIỆU', 'BRAND', 'BRANDED', 'HANG HIEU', 'HÀNG HIỆU', 'FAKE', 'REPLICA', 'GUCCI', 'NIKE', 'ADIDAS', 'LV', 'CHANEL', 'ZARA'],
        rates: {
            UPS: { supplierFeePerKg: 0, customerFeePerKg: 40000, hasPrice: true, note: 'Thu khách 40.000 đ/kg' },
            FEDEX: { supplierFeePerKg: 35000, customerFeePerKg: 45000, hasPrice: true, note: 'Trả Hải quan FedEx 35.000 đ/kg (Thu khách 45k)' }
        },
        supplierFeePerKg: 0,
        customerFeePerKg: 40000
    },
    {
        code: 'EYELASHES',
        name: 'Hàng mi giả',
        displayName: 'Hàng mi giả',
        badgeClass: 'bg-pink-100 text-pink-900 border-pink-300',
        description: 'Mi nối, mi giả, dụng cụ làm mi, keo nối mi, khay mi...',
        keywords: ['MI GIA', 'MI GIẢ', 'EYELASH', 'EYELASHES', 'LONG MI', 'LÔNG MI', 'NOI MI', 'NỐI MI'],
        rates: {
            UPS: { supplierFeePerKg: 0, customerFeePerKg: 40000, hasPrice: true, note: 'Thu khách 40.000 đ/kg' },
            FEDEX: { supplierFeePerKg: 0, customerFeePerKg: 0, hasPrice: false, note: 'Chưa có giá' }
        },
        supplierFeePerKg: 0,
        customerFeePerKg: 40000
    },
    {
        code: 'AGARWOOD',
        name: 'Hàng trầm hương',
        displayName: 'Hàng trầm hương',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        description: 'Trầm hương, nhang trầm, nụ trầm, vòng tay gỗ trầm, tinh dầu trầm...',
        keywords: ['TRAM', 'TRẦM', 'AGARWOOD', 'TRAM HUONG', 'TRẦM HƯƠNG', 'NHANG TRAM', 'VONG TRAM', 'INCENSE'],
        rates: {
            UPS: { supplierFeePerKg: 0, customerFeePerKg: 40000, hasPrice: true, note: 'Thu khách 40.000 đ/kg' },
            FEDEX: { supplierFeePerKg: 0, customerFeePerKg: 0, hasPrice: false, note: 'Chưa có giá' }
        },
        supplierFeePerKg: 0,
        customerFeePerKg: 40000
    },
    {
        code: 'HAIR',
        name: 'Tóc',
        displayName: 'Tóc',
        badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        description: 'Tóc người xuất khẩu, tóc nối, tóc giả (wigs), phím tóc, tóc dệt...',
        keywords: ['TOC', 'TÓC', 'HAIR', 'TOC GIA', 'TÓC GIẢ', 'TOC NOI', 'TÓC NỐI', 'WIG', 'WIGS', 'EXTENSIONS'],
        rates: {
            UPS: { supplierFeePerKg: 0, customerFeePerKg: 40000, hasPrice: true, note: 'Thu khách 40.000 đ/kg' },
            FEDEX: { supplierFeePerKg: 0, customerFeePerKg: 0, hasPrice: false, note: 'Chưa có giá' }
        },
        supplierFeePerKg: 0,
        customerFeePerKg: 40000
    },
    {
        code: 'DOCUMENT',
        name: 'Tài liệu',
        displayName: 'Tài liệu',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
        description: 'Thư từ, hợp đồng, chứng từ xuất khẩu, hồ sơ...',
        keywords: ['DOCUMENT', 'DOC', 'TAI LIEU', 'TÀI LIỆU', 'CHUNG TU', 'CHỨNG TỪ', 'HO SO', 'HỒ SƠ', 'THU TU', 'THƯ TỪ', 'TAI_LIEU'],
        rates: {
            UPS: { supplierFeePerKg: 0, customerFeePerKg: 0, hasPrice: true, note: '0 đ/kg' },
            FEDEX: { supplierFeePerKg: 0, customerFeePerKg: 0, hasPrice: true, note: '0 đ/kg' }
        },
        supplierFeePerKg: 0,
        customerFeePerKg: 0
    }
];
const CONFIG_FILE = path.join(process.cwd(), 'data', 'customs_cargo_rates.json');
export class CustomsCargoConfigService {
    static cachedTypes = null;
    static loadFromDisk() {
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
                const savedData = JSON.parse(raw);
                return DEFAULT_CARGO_TYPES.map(def => {
                    const override = savedData[def.code];
                    if (override) {
                        const upsRate = {
                            supplierFeePerKg: override.UPS?.supplierFeePerKg !== undefined ? Number(override.UPS.supplierFeePerKg) : (override.supplierFeePerKg !== undefined ? Number(override.supplierFeePerKg) : def.rates.UPS.supplierFeePerKg),
                            customerFeePerKg: override.UPS?.customerFeePerKg !== undefined ? Number(override.UPS.customerFeePerKg) : (override.customerFeePerKg !== undefined ? Number(override.customerFeePerKg) : def.rates.UPS.customerFeePerKg),
                            hasPrice: override.UPS?.hasPrice !== undefined ? Boolean(override.UPS.hasPrice) : (def.rates.UPS.hasPrice),
                            note: override.UPS?.note || def.rates.UPS.note
                        };
                        const fedexRate = {
                            supplierFeePerKg: override.FEDEX?.supplierFeePerKg !== undefined ? Number(override.FEDEX.supplierFeePerKg) : def.rates.FEDEX.supplierFeePerKg,
                            customerFeePerKg: override.FEDEX?.customerFeePerKg !== undefined ? Number(override.FEDEX.customerFeePerKg) : def.rates.FEDEX.customerFeePerKg,
                            hasPrice: override.FEDEX?.hasPrice !== undefined ? Boolean(override.FEDEX.hasPrice) : def.rates.FEDEX.hasPrice,
                            note: override.FEDEX?.note || def.rates.FEDEX.note
                        };
                        return {
                            ...def,
                            rates: { UPS: upsRate, FEDEX: fedexRate },
                            supplierFeePerKg: upsRate.supplierFeePerKg,
                            customerFeePerKg: upsRate.customerFeePerKg
                        };
                    }
                    return { ...def };
                });
            }
        }
        catch (e) {
            console.warn('[CustomsCargoConfigService] Error reading config file:', e);
        }
        return DEFAULT_CARGO_TYPES.map(d => ({ ...d }));
    }
    static getAllCargoTypes() {
        if (!this.cachedTypes) {
            this.cachedTypes = this.loadFromDisk();
        }
        return this.cachedTypes;
    }
    static getCargoTypeInfo(codeOrAlias) {
        const list = this.getAllCargoTypes();
        if (!codeOrAlias)
            return list[0]; // Mặc định GENERAL
        const clean = codeOrAlias.trim().toUpperCase();
        if (clean === 'COSMETICS' || clean === 'FOOD' || clean === 'COSMETICS_FOOD' || clean === 'THUC_PHAM' || clean === 'MY_PHAM' || clean === 'THUC_PHAM_MY_PHAM' || clean === 'MY_PHAM_THUC_PHAM') {
            return list.find(t => t.code === 'COSMETICS_FOOD') || list[0];
        }
        if (clean === 'GENERAL' || clean === 'HANG_THUONG' || clean === 'HANG_THONG_THUONG' || clean === 'THONG_THUONG') {
            return list.find(t => t.code === 'GENERAL') || list[0];
        }
        if (clean === 'BRANDED' || clean === 'HANG_THUONG_HIEU' || clean === 'THUONG_HIEU') {
            return list.find(t => t.code === 'BRANDED') || list[0];
        }
        if (clean === 'EYELASHES' || clean === 'MI_GIA' || clean === 'HANG_MI_GIA') {
            return list.find(t => t.code === 'EYELASHES') || list[0];
        }
        if (clean === 'AGARWOOD' || clean === 'TRAM' || clean === 'TRAM_HUONG' || clean === 'HANG_TRAM') {
            return list.find(t => t.code === 'AGARWOOD') || list[0];
        }
        if (clean === 'HAIR' || clean === 'TOC' || clean === 'HANG_TOC') {
            return list.find(t => t.code === 'HAIR') || list[0];
        }
        if (clean === 'DOCUMENT' || clean === 'DOC' || clean === 'TAI_LIEU' || clean === 'THU_TU') {
            return list.find(t => t.code === 'DOCUMENT') || list[0];
        }
        const found = list.find(t => t.code === clean);
        if (found)
            return found;
        return this.detectCargoType(clean);
    }
    /**
     * Lấy đơn giá Hải quan cụ thể theo từng loại hàng và từng hãng (UPS vs FEDEX)
     */
    static getCargoRate(codeOrAlias, carrier = 'UPS') {
        const cargoType = this.getCargoTypeInfo(codeOrAlias);
        const upperCarrier = String(carrier || 'UPS').toUpperCase().includes('FEDEX') ? 'FEDEX' : 'UPS';
        const carrierRate = cargoType.rates[upperCarrier] || cargoType.rates.UPS;
        return {
            cargoType,
            supplierFeePerKg: carrierRate.supplierFeePerKg,
            customerFeePerKg: carrierRate.customerFeePerKg,
            hasPrice: carrierRate.hasPrice,
            note: carrierRate.note
        };
    }
    /**
     * Tự động nhận diện Loại Hàng dựa trên chuỗi mô tả từ Excel hoặc input
     * Quy tắc: Phí chỉ áp dụng cho 1 loại / 1 AWB duy nhất.
     */
    static detectCargoType(rawText) {
        const list = this.getAllCargoTypes();
        if (!rawText)
            return list[0]; // GENERAL
        const upper = rawText.toUpperCase();
        // 1. Kiểm tra Thực Phẩm / Mỹ Phẩm
        if (list.find(t => t.code === 'COSMETICS_FOOD')?.keywords.some(k => upper.includes(k))) {
            return list.find(t => t.code === 'COSMETICS_FOOD');
        }
        // 2. Kiểm tra Hàng Thương Hiệu
        if (list.find(t => t.code === 'BRANDED')?.keywords.some(k => upper.includes(k))) {
            return list.find(t => t.code === 'BRANDED');
        }
        // 3. Kiểm tra Trầm
        if (list.find(t => t.code === 'AGARWOOD')?.keywords.some(k => upper.includes(k))) {
            return list.find(t => t.code === 'AGARWOOD');
        }
        // 4. Kiểm tra Tóc
        if (list.find(t => t.code === 'HAIR')?.keywords.some(k => upper.includes(k))) {
            return list.find(t => t.code === 'HAIR');
        }
        // 5. Kiểm tra Mi Giả
        if (list.find(t => t.code === 'EYELASHES')?.keywords.some(k => upper.includes(k))) {
            return list.find(t => t.code === 'EYELASHES');
        }
        // 6. Kiểm tra tài liệu
        if (list.find(t => t.code === 'DOCUMENT')?.keywords.some(k => upper.includes(k))) {
            return list.find(t => t.code === 'DOCUMENT');
        }
        // Mặc định là Hàng Thông Thường
        return list[0];
    }
    /**
     * Cập nhật biểu phí Hải quan hỗ trợ cả cấu trúc carrier lồng nhau hoặc phẳng
     */
    static updateRates(payload) {
        const list = this.getAllCargoTypes();
        const saveObj = {};
        for (const t of list) {
            const updateData = payload[t.code];
            if (updateData) {
                if (updateData.UPS || updateData.FEDEX) {
                    if (updateData.UPS) {
                        t.rates.UPS.supplierFeePerKg = Math.max(0, Number(updateData.UPS.supplierFeePerKg) || 0);
                        t.rates.UPS.customerFeePerKg = Math.max(0, Number(updateData.UPS.customerFeePerKg) || 0);
                        if (updateData.UPS.hasPrice !== undefined)
                            t.rates.UPS.hasPrice = Boolean(updateData.UPS.hasPrice);
                    }
                    if (updateData.FEDEX) {
                        t.rates.FEDEX.supplierFeePerKg = Math.max(0, Number(updateData.FEDEX.supplierFeePerKg) || 0);
                        t.rates.FEDEX.customerFeePerKg = Math.max(0, Number(updateData.FEDEX.customerFeePerKg) || 0);
                        if (updateData.FEDEX.hasPrice !== undefined)
                            t.rates.FEDEX.hasPrice = Boolean(updateData.FEDEX.hasPrice);
                    }
                }
                else {
                    // Phẳng: cập nhật cả 2 hoặc UPS
                    const supp = Math.max(0, Number(updateData.supplierFeePerKg) || 0);
                    const cust = Math.max(0, Number(updateData.customerFeePerKg) || 0);
                    t.rates.UPS.supplierFeePerKg = supp;
                    t.rates.UPS.customerFeePerKg = cust;
                    t.rates.UPS.hasPrice = supp > 0 || cust > 0;
                    t.rates.FEDEX.supplierFeePerKg = supp;
                    t.rates.FEDEX.customerFeePerKg = cust;
                    t.rates.FEDEX.hasPrice = supp > 0 || cust > 0;
                }
                t.supplierFeePerKg = t.rates.UPS.supplierFeePerKg;
                t.customerFeePerKg = t.rates.UPS.customerFeePerKg;
            }
            saveObj[t.code] = {
                UPS: t.rates.UPS,
                FEDEX: t.rates.FEDEX,
                supplierFeePerKg: t.rates.UPS.supplierFeePerKg,
                customerFeePerKg: t.rates.UPS.customerFeePerKg
            };
        }
        try {
            const dir = path.dirname(CONFIG_FILE);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(saveObj, null, 2), 'utf-8');
            this.cachedTypes = list;
        }
        catch (e) {
            console.error('[CustomsCargoConfigService] Error saving config file:', e);
        }
    }
}
