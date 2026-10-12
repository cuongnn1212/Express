/**
 * Shipment Service - Mô hình vận đơn quốc tế đồng bộ theo form hãng (UPS / FedEx)
 *
 * Cấu trúc form bám theo màn hình "Create a Shipment" của ups.com và "FedEx Ship Manager":
 *   1. Ship From (Người gửi)   2. Ship To (Người nhận)   3. Packages (Kiện hàng)
 *   4. Service & Ship Date      5. Payment (Cước & Thuế)  6. Customs / Commercial Invoice
 *   7. Options & References
 *
 * LƯU Ý: Số tracking sinh ở đây đúng CẤU TRÚC & CHECK DIGIT của hãng nhưng là số mô phỏng.
 * Số tracking thật phải lấy từ UPS Shipping API / FedEx Ship API sau khi hãng xác nhận lô hàng.
 */
export class ShipmentValidationError extends Error {
    errors;
    constructor(errors) {
        super(errors.join(' | '));
        this.errors = errors;
    }
}
const COUNTRY_NAMES = {
    VN: 'VIETNAM', US: 'UNITED STATES', CA: 'CANADA', GB: 'UNITED KINGDOM', AU: 'AUSTRALIA',
    DE: 'GERMANY', FR: 'FRANCE', JP: 'JAPAN', KR: 'SOUTH KOREA', TW: 'TAIWAN', SG: 'SINGAPORE',
    HK: 'HONG KONG', CN: 'CHINA', TH: 'THAILAND', MY: 'MALAYSIA', NZ: 'NEW ZEALAND', NL: 'NETHERLANDS',
    IT: 'ITALY', ES: 'SPAIN', CH: 'SWITZERLAND', SE: 'SWEDEN', NO: 'NORWAY', DK: 'DENMARK',
    BE: 'BELGIUM', IN: 'INDIA', PH: 'PHILIPPINES', ID: 'INDONESIA', AE: 'UNITED ARAB EMIRATES',
    KH: 'CAMBODIA', LA: 'LAOS'
};
const UPS_SERVICES = {
    EXPRESS_PLUS: { name: 'UPS WORLDWIDE EXPRESS PLUS', tag: '1+', code: '54', days: 2 },
    EXPRESS: { name: 'UPS WORLDWIDE EXPRESS', tag: '1', code: '07', days: 3 },
    SAVER: { name: 'UPS SAVER', tag: '1P', code: '65', days: 3 },
    EXPEDITED: { name: 'UPS WORLDWIDE EXPEDITED', tag: '2', code: '08', days: 5 }
};
const FEDEX_SERVICES = {
    IF: { name: 'INTL FIRST', tag: 'IF', days: 2 },
    IP: { name: 'INTL PRIORITY', tag: 'IP', days: 3 },
    IE: { name: 'INTL ECONOMY', tag: 'IE', days: 5 }
};
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
/** Bỏ dấu tiếng Việt & in hoa - hãng chỉ chấp nhận ký tự Latin trên nhãn */
export function toCarrierText(s) {
    return String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}
export class ShipmentService {
    /** UPS 1Z check digit (chuẩn: chữ cái -> (ASCII-63)%10, vị trí chẵn x2, (10 - sum%10)%10) */
    static upsCheckDigit(body15) {
        let sum = 0;
        for (let i = 0; i < body15.length; i++) {
            const c = body15[i];
            const v = /[0-9]/.test(c) ? parseInt(c, 10) : (c.charCodeAt(0) - 63) % 10;
            sum += (i % 2 === 1) ? v * 2 : v;
        }
        return (10 - (sum % 10)) % 10;
    }
    /** FedEx 12 số check digit (trọng số 1,3,7 từ phải sang trái, (sum % 11) % 10) */
    static fedexCheckDigit(body11) {
        const weights = [1, 3, 7];
        let sum = 0;
        for (let i = 0; i < body11.length; i++) {
            const digit = parseInt(body11[body11.length - 1 - i], 10);
            sum += digit * weights[i % 3];
        }
        return (sum % 11) % 10;
    }
    static generateUpsTracking(account, svcDigits) {
        const acc = (account.replace(/[^A-Za-z0-9]/g, '').toUpperCase() + '000000').slice(0, 6);
        const ref7 = Math.floor(1000000 + Math.random() * 9000000).toString();
        const body15 = `${acc}${svcDigits}${ref7}`;
        return `1Z${body15}${this.upsCheckDigit(body15)}`;
    }
    static generateFedexTracking() {
        const body11 = '7' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
        return `${body11}${this.fedexCheckDigit(body11)}`;
    }
    static randomAlnum(n) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
        let s = '';
        for (let i = 0; i < n; i++)
            s += chars[Math.floor(Math.random() * chars.length)];
        return s;
    }
    static addBusinessDays(d, days) {
        const r = new Date(d);
        let added = 0;
        while (added < days) {
            r.setDate(r.getDate() + 1);
            if (r.getDay() !== 0 && r.getDay() !== 6)
                added++;
        }
        return r;
    }
    static normalizeParty(p, fallback) {
        const src = { ...fallback, ...(p || {}) };
        const countryCode = toCarrierText(src.countryCode || 'VN').slice(0, 2);
        return {
            contactName: toCarrierText(src.contactName),
            companyName: toCarrierText(src.companyName),
            phone: String(src.phone || '').trim(),
            email: String(src.email || '').trim(),
            taxId: toCarrierText(src.taxId),
            address1: toCarrierText(src.address1),
            address2: toCarrierText(src.address2),
            address3: toCarrierText(src.address3),
            city: toCarrierText(src.city),
            state: toCarrierText(src.state),
            postalCode: toCarrierText(src.postalCode),
            countryCode,
            countryName: toCarrierText(src.countryName) || COUNTRY_NAMES[countryCode] || countryCode,
            residential: Boolean(src.residential)
        };
    }
    /** Kiểm tra theo quy định chung của UPS/FedEx cho hàng quốc tế */
    static validate(req, from, to) {
        const errors = [];
        const warnings = [];
        const isFedex = req.carrier === 'FEDEX';
        const checkParty = (label, p) => {
            if (!p.contactName)
                errors.push(`${label}: thiếu Tên liên hệ`);
            if (!p.phone)
                errors.push(`${label}: thiếu Số điện thoại`);
            if (!p.address1)
                errors.push(`${label}: thiếu Địa chỉ dòng 1`);
            if (!p.city)
                errors.push(`${label}: thiếu Thành phố`);
            [['Tên', p.contactName], ['Công ty', p.companyName], ['Địa chỉ 1', p.address1], ['Địa chỉ 2', p.address2], ['Địa chỉ 3', p.address3]]
                .forEach(([n, v]) => { if (v && v.length > 35)
                errors.push(`${label}: ${n} vượt 35 ký tự (giới hạn của hãng)`); });
            if (['US', 'CA'].includes(p.countryCode) && !p.state)
                errors.push(`${label}: ${p.countryCode} bắt buộc mã Bang/Tỉnh (State)`);
            if (p.countryCode === 'US' && p.postalCode && !/^\d{5}(-\d{4})?$/.test(p.postalCode))
                errors.push(`${label}: ZIP Mỹ phải dạng 12345 hoặc 12345-6789`);
            if (['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP'].includes(p.countryCode) && !p.postalCode)
                errors.push(`${label}: thiếu Mã bưu chính`);
        };
        checkParty('Người gửi', from);
        checkParty('Người nhận', to);
        if (!req.pieces || req.pieces.length === 0)
            errors.push('Phải có ít nhất 1 kiện hàng');
        const maxKg = isFedex ? 68 : 70;
        const maxLG = isFedex ? 330 : 400;
        (req.pieces || []).forEach((p, i) => {
            const dims = [p.lengthCm, p.widthCm, p.heightCm].map(Number).sort((a, b) => b - a);
            const lg = dims[0] + 2 * (dims[1] + dims[2]);
            if (!(p.weightKg > 0))
                errors.push(`Kiện ${i + 1}: trọng lượng phải > 0`);
            if (p.weightKg > maxKg)
                errors.push(`Kiện ${i + 1}: ${p.weightKg}kg vượt giới hạn ${maxKg}kg/kiện của ${req.carrier}`);
            if (dims[0] > 274)
                errors.push(`Kiện ${i + 1}: cạnh dài ${dims[0]}cm vượt 274cm`);
            if (lg > maxLG)
                errors.push(`Kiện ${i + 1}: Dài + Vòng bụng ${lg}cm vượt ${maxLG}cm`);
            if (!isFedex && (dims[0] > 122 || dims[1] > 76 || p.weightKg > 25))
                warnings.push(`Kiện ${i + 1}: có thể bị phụ phí Additional Handling (AHC)`);
        });
        if ((req.contentsType || 'NON_DOCUMENT') === 'NON_DOCUMENT') {
            const items = req.items || [];
            if (items.length === 0)
                errors.push('Hàng phi chứng từ: phải khai ít nhất 1 dòng hàng trên Commercial Invoice');
            const vague = ['GIFT', 'SAMPLE', 'SAMPLES', 'GOODS', 'CLOTHES', 'PARTS', 'ACCESSORIES', 'PERSONAL ITEMS'];
            items.forEach((it, i) => {
                const d = toCarrierText(it.description);
                if (!d)
                    errors.push(`Dòng hàng ${i + 1}: thiếu mô tả`);
                if (vague.includes(d))
                    warnings.push(`Dòng hàng ${i + 1}: mô tả "${d}" quá chung chung, hải quan có thể giữ hàng - ghi rõ chất liệu/công dụng`);
                if (!(it.quantity > 0))
                    errors.push(`Dòng hàng ${i + 1}: số lượng phải > 0`);
                if (!(it.unitValue > 0))
                    errors.push(`Dòng hàng ${i + 1}: đơn giá phải > 0`);
                if (!it.hsCode)
                    warnings.push(`Dòng hàng ${i + 1}: nên khai mã HS (6-10 số) để thông quan nhanh`);
                else if (!/^\d{6,10}$/.test(String(it.hsCode).replace(/\./g, '')))
                    warnings.push(`Dòng hàng ${i + 1}: mã HS nên là 6-10 chữ số`);
            });
        }
        if (req.billShippingTo === 'THIRD_PARTY' && !req.billShippingAccount)
            errors.push('Cước bên thứ 3: thiếu số tài khoản thanh toán');
        if (req.billDutiesTo === 'THIRD_PARTY' && !req.billDutiesAccount)
            errors.push('Thuế bên thứ 3: thiếu số tài khoản thanh toán');
        return { errors, warnings };
    }
    static createShipment(req) {
        const carrier = String(req.carrier || 'UPS').toUpperCase() === 'FEDEX' ? 'FEDEX' : 'UPS';
        req.carrier = carrier;
        const isFedex = carrier === 'FEDEX';
        // Chuẩn hóa người gửi / người nhận (hỗ trợ cả payload cũ dạng phẳng)
        const shipFrom = this.normalizeParty(req.shipFrom, {
            contactName: req.senderName, phone: req.senderPhone, address1: req.senderAddress,
            city: req.senderCity, countryCode: 'VN', countryName: req.senderCountry, postalCode: '700000'
        });
        const shipTo = this.normalizeParty(req.shipTo, {
            contactName: req.recipientName, phone: req.recipientPhone, address1: req.recipientAddress,
            city: req.recipientCity, state: req.recipientState, postalCode: req.recipientPostalCode,
            countryCode: req.recipientCountry && req.recipientCountry.length === 2 ? req.recipientCountry : 'US',
            countryName: req.recipientCountry && req.recipientCountry.length > 2 ? req.recipientCountry : undefined
        });
        // Payload cũ không có items -> tự tạo 1 dòng từ itemDescription để không phá API cũ
        if (!req.items && !req.shipFrom) {
            req.contentsType = req.contentsType || 'DOCUMENT';
        }
        const { errors, warnings } = this.validate(req, shipFrom, shipTo);
        if (errors.length)
            throw new ShipmentValidationError(errors);
        const shipDate = req.shipDate ? new Date(req.shipDate + 'T00:00:00') : new Date();
        const dd = String(shipDate.getDate()).padStart(2, '0');
        const dateFormatted = `${dd} ${MONTHS[shipDate.getMonth()]} ${shipDate.getFullYear()}`;
        const fedexDate = `${dd}${MONTHS[shipDate.getMonth()]}${String(shipDate.getFullYear()).slice(2)}`;
        // Dịch vụ
        let serviceName, serviceTag, serviceCode, days;
        if (isFedex) {
            const s = FEDEX_SERVICES[req.serviceCode || 'IP'] || FEDEX_SERVICES.IP;
            serviceName = s.name;
            serviceTag = s.tag;
            serviceCode = req.serviceCode || 'IP';
            days = s.days;
        }
        else {
            const s = UPS_SERVICES[req.serviceCode || 'SAVER'] || UPS_SERVICES.SAVER;
            serviceName = s.name;
            serviceTag = s.tag;
            serviceCode = s.code;
            days = s.days;
        }
        const commit = this.addBusinessDays(shipDate, days);
        const deliveryCommit = isFedex
            ? `${DAYS[commit.getDay()]} - ${String(commit.getDate()).padStart(2, '0')} ${MONTHS[commit.getMonth()]} ${serviceTag === 'IE' ? '5:00P' : '10:30A'}`
            : `${String(commit.getDate()).padStart(2, '0')} ${MONTHS[commit.getMonth()]} ${commit.getFullYear()}`;
        const accountNumber = toCarrierText(req.accountNumber) || (isFedex ? '000000000' : '84Y820');
        // Kiện hàng & tracking
        let totalWeight = 0;
        const pieces = (req.pieces || []).map((p, idx) => {
            const w = Number(p.weightKg);
            totalWeight += w;
            // Nếu đã có số tracking sẵn (từ nhãn quét AWB hoặc truyền vào) thì dùng trực tiếp
            let tracking = p.trackingNumber ? String(p.trackingNumber).trim().toUpperCase() : '';
            if (!tracking && idx === 0 && (req.masterTrackingNumber || req.existingTrackingNumber)) {
                tracking = String(req.masterTrackingNumber || req.existingTrackingNumber).trim().toUpperCase();
            }
            if (!tracking) {
                tracking = isFedex ? this.generateFedexTracking() : this.generateUpsTracking(accountNumber, '04');
            }
            const trackingFormatted = isFedex
                ? tracking.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')
                : (tracking.startsWith('1Z')
                    ? tracking.replace(/^(.{2})(.{3})(.{3})(.{2})(.{4})(.{4})$/, '$1 $2 $3 $4 $5 $6')
                    : tracking);
            const L = Math.round(Number(p.lengthCm) || 0), W = Math.round(Number(p.widthCm) || 0), H = Math.round(Number(p.heightCm) || 0);
            return {
                pieceNumber: idx + 1,
                weightKg: w,
                lengthCm: L, widthCm: W, heightCm: H,
                dimsText: isFedex ? `${L}x${W}x${H} CM` : `${L},${W},${H}`,
                trackingNumber: tracking,
                trackingFormatted
            };
        });
        // Routing
        const zip = (shipTo.postalCode || '').replace(/\s/g, '');
        const routingCode = isFedex
            ? `${zip} ${shipTo.state ? shipTo.state + '-' : ''}${shipTo.countryCode}`.trim()
            : (shipTo.countryCode === 'US'
                ? `${shipTo.state} ${zip.slice(0, 3)} 9-99`
                : `${shipTo.countryCode} ${zip.slice(0, 3) || '000'} 0-00`);
        const routingBarcode = `420${zip.replace(/-/g, '')}`;
        // Thanh toán
        const shipPayer = req.billShippingTo || 'SHIPPER';
        const dutyPayer = req.billDutiesTo || 'RECEIVER';
        let billingCode = 'P/P';
        if (shipPayer === 'RECEIVER')
            billingCode = 'F/C';
        else if (shipPayer === 'THIRD_PARTY')
            billingCode = 'T/P';
        else if (dutyPayer === 'SHIPPER')
            billingCode = 'F/D';
        const payerText = { SHIPPER: 'SENDER', RECEIVER: 'RECIPIENT', THIRD_PARTY: 'THIRD PARTY' };
        const billingText = `BILL ${payerText[shipPayer]}`;
        const dutiesText = `D/T: ${payerText[dutyPayer]}`;
        // Hải quan
        const currency = toCarrierText(req.currency) || 'USD';
        const items = (req.items || []).map(it => {
            const qty = Number(it.quantity) || 0;
            const uv = Number(it.unitValue) || 0;
            return {
                description: toCarrierText(it.description),
                hsCode: String(it.hsCode || '').replace(/\./g, ''),
                originCountry: toCarrierText(it.originCountry) || 'VN',
                quantity: qty,
                unit: toCarrierText(it.unit) || 'PCS',
                unitValue: uv,
                netWeightKg: Number(it.netWeightKg) || 0,
                lineTotal: Math.round(qty * uv * 100) / 100
            };
        });
        const totalCustomsValue = Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
        const itemDescription = toCarrierText(req.itemDescription) || items.map(i => i.description).join(', ').slice(0, 50) || 'DOCUMENTS';
        const acc6 = accountNumber.slice(0, 6).padEnd(6, '0');
        const shipmentNumber = isFedex
            ? pieces[0]?.trackingNumber || ''
            : `${acc6.slice(0, 4)} ${acc6.slice(4, 6)}${this.randomAlnum(2)} ${this.randomAlnum(3)}`;
        // Tính trọng lượng quy đổi (Volumetric weight) và Trọng lượng tính cước (Chargeable weight)
        const dimDivisor = 5000;
        const volWeight = pieces.reduce((sum, p) => sum + (p.lengthCm * p.widthCm * p.heightCm) / dimDivisor, 0);
        const volumetricWeightKg = Math.round(volWeight * 10) / 10;
        const rawChargeable = Math.max(totalWeight, volumetricWeightKg);
        // Chuẩn IATA làm tròn lên 0.5kg
        const chargeableWeightKg = Math.ceil(rawChargeable * 2) / 2;
        const custCode = (req.customerCode || req.customerId || 'PDL-GUEST').trim().toUpperCase();
        const custName = req.customerName || shipFrom.companyName || shipFrom.contactName || 'Khách hàng';
        const hub = req.hub || 'SGN';
        const pTerm = req.paymentTerm === 'POSTPAID' ? 'POSTPAID' : 'PREPAID';
        const pStatus = req.paymentStatus || (pTerm === 'POSTPAID' ? 'UNPAID' : 'PAID');
        const pMethod = req.paymentMethod || (pTerm === 'POSTPAID' ? 'Công nợ (Thanh toán sau)' : 'Thanh toán tiền ngay');
        const sellPrice = req.sellPrice !== undefined ? Number(req.sellPrice) : Math.round(chargeableWeightKg * 275000);
        const costPrice = req.costPrice !== undefined ? Number(req.costPrice) : Math.round(chargeableWeightKg * 220000);
        const profit = req.profit !== undefined ? Number(req.profit) : (sellPrice - costPrice);
        return {
            shipmentId: `SHP_${Date.now()}`,
            carrier,
            serviceName: toCarrierText(req.serviceName) || serviceName,
            serviceCode,
            serviceTag,
            accountNumber,
            shipmentNumber,
            masterTrackingNumber: pieces[0]?.trackingNumber || '',
            shipDate: shipDate.toISOString().slice(0, 10),
            dateFormatted,
            fedexDate,
            deliveryCommit,
            packagingType: toCarrierText(req.packagingType) || (isFedex ? 'YOUR PACKAGING' : 'PACKAGE'),
            // Thông tin kế thừa chuẩn PandaLex
            customerCode: custCode,
            customerName: custName,
            hub,
            paymentTerm: pTerm,
            paymentStatus: pStatus,
            paymentMethod: pMethod,
            costPrice,
            sellPrice,
            profit,
            volumetricWeightKg,
            chargeableWeightKg,
            shipFrom,
            shipTo,
            sender: {
                name: shipFrom.contactName, phone: shipFrom.phone,
                address: [shipFrom.address1, shipFrom.address2].filter(Boolean).join(', '),
                city: shipFrom.city, country: shipFrom.countryName || '', postalCode: shipFrom.postalCode || ''
            },
            recipient: {
                name: shipTo.contactName, phone: shipTo.phone,
                address: [shipTo.address1, shipTo.address2].filter(Boolean).join(', '),
                city: shipTo.city, state: shipTo.state || '', postalCode: shipTo.postalCode || '', country: shipTo.countryName || ''
            },
            routingCode,
            routingBarcode,
            ursaCode: toCarrierText(req.ursaCode),
            billingCode,
            billingText,
            dutiesText,
            paperlessInvoice: req.paperlessInvoice !== false,
            contentsType: req.contentsType || 'NON_DOCUMENT',
            exportReason: toCarrierText(req.exportReason) || 'SALE',
            invoiceNumber: toCarrierText(req.invoiceNumber) || `INV-${Date.now().toString().slice(-8)}`,
            currency,
            incoterm: toCarrierText(req.incoterm) || (dutyPayer === 'SHIPPER' ? 'DDP' : 'DAP'),
            items,
            totalCustomsValue,
            itemDescription,
            reference1: toCarrierText(req.reference1),
            reference2: toCarrierText(req.reference2),
            signatureRequired: Boolean(req.signatureRequired),
            saturdayDelivery: Boolean(req.saturdayDelivery),
            totalPieces: pieces.length,
            totalWeightKg: Math.round(totalWeight * 10) / 10,
            pieces,
            warnings
        };
    }
}
