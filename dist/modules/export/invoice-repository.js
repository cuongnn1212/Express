import fs from 'fs';
import path from 'path';
export class InvoiceRepository {
    static filePath = path.join(process.cwd(), 'data', 'invoices.json');
    static invoices = [];
    static init() {
        try {
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                this.invoices = JSON.parse(raw);
            }
            else {
                this.invoices = [];
                this.persist();
            }
        }
        catch (e) {
            console.error('Không thể nạp dữ liệu invoices.json, khởi tạo rỗng:', e);
            this.invoices = [];
        }
    }
    static persist() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.invoices, null, 2), 'utf-8');
        }
        catch (e) {
            console.error('Lỗi lưu trữ invoices.json:', e);
        }
    }
    static getAll() {
        return [...this.invoices];
    }
    static getById(id) {
        return this.invoices.find(inv => inv.id === id || inv.invoiceNumber === id);
    }
    static getByShipmentId(shipmentId) {
        return this.invoices.find(inv => inv.shipmentId === shipmentId);
    }
    static save(data) {
        const now = new Date().toISOString();
        const id = data.id || `CI_${Date.now()}`;
        const existingIdx = this.invoices.findIndex(inv => inv.id === id);
        const fullRecord = {
            id,
            invoiceNumber: data.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
            invoiceDate: data.invoiceDate || new Date().toISOString().slice(0, 10),
            dateFormatted: data.dateFormatted || new Date().toLocaleDateString('en-GB'),
            templateType: data.templateType || 'UPS',
            airWaybillNo: data.airWaybillNo || data.masterTrackingNumber || '',
            masterTrackingNumber: data.masterTrackingNumber || data.airWaybillNo || '',
            carrier: data.carrier || 'UPS',
            serviceName: data.serviceName || 'UPS Worldwide Saver',
            shipperCompanyName: data.shipperCompanyName || 'EXPORTER COMPANY',
            shipperAddress: data.shipperAddress || '',
            shipperTownArea: data.shipperTownArea || '100000',
            shipperStateCountry: data.shipperStateCountry || 'VIET NAM',
            shipperContactName: data.shipperContactName || 'Shipper Contact',
            shipperPhone: data.shipperPhone || '',
            shipperEmail: data.shipperEmail || '',
            shipperTaxId: data.shipperTaxId || '',
            consigneeCompanyName: data.consigneeCompanyName || 'CONSIGNEE COMPANY',
            consigneeAddress: data.consigneeAddress || '',
            consigneeCity: data.consigneeCity || '',
            consigneeState: data.consigneeState || '',
            consigneePostalCode: data.consigneePostalCode || '',
            consigneeStateCountry: data.consigneeStateCountry || 'USA',
            consigneeContactName: data.consigneeContactName || 'Consignee Contact',
            consigneePhone: data.consigneePhone || '',
            consigneeEmail: data.consigneeEmail || '',
            consigneeTaxId: data.consigneeTaxId || '',
            totalPackages: Number(data.totalPackages) || 1,
            totalActualWeightKg: Number(data.totalActualWeightKg) || 0,
            totalDimensionalWeightKg: Number(data.totalDimensionalWeightKg) || 0,
            dimensionsSummary: data.dimensionsSummary || 'Standard',
            reasonForExport: data.reasonForExport || 'Sample / Commercial Sale',
            termsOfSale: data.termsOfSale || 'DAP',
            currency: data.currency || 'USD',
            shippingCharge: Number(data.shippingCharge) || 0,
            insuranceCharge: Number(data.insuranceCharge) || 0,
            subtotal: Number(data.subtotal) || 0,
            totalValue: Number(data.totalValue) || 0,
            items: data.items && data.items.length > 0 ? data.items : [{
                    description: 'Commercial Goods',
                    hsCode: '4202.92.10',
                    quantity: 1,
                    unit: 'pcs',
                    originCountry: 'Vietnam',
                    unitValue: 30,
                    lineTotal: 30
                }],
            signatoryName: data.signatoryName || data.shipperContactName || '',
            signatoryTitle: data.signatoryTitle || 'Shipper / Export Manager',
            shipmentId: data.shipmentId,
            createdAt: existingIdx >= 0 ? this.invoices[existingIdx].createdAt : now,
            updatedAt: now,
            notes: data.notes
        };
        // Tính lại subtotal và totalValue nếu chưa có
        let calcSubtotal = 0;
        fullRecord.items.forEach(it => {
            const q = Number(it.quantity) || 1;
            const u = Number(it.unitValue) || 0;
            it.lineTotal = Number(it.lineTotal) || (q * u);
            calcSubtotal += it.lineTotal;
        });
        if (!fullRecord.subtotal)
            fullRecord.subtotal = calcSubtotal;
        if (!fullRecord.totalValue)
            fullRecord.totalValue = fullRecord.subtotal + (fullRecord.shippingCharge || 0) + (fullRecord.insuranceCharge || 0);
        if (existingIdx >= 0) {
            this.invoices[existingIdx] = fullRecord;
        }
        else {
            this.invoices.unshift(fullRecord);
        }
        this.persist();
        return fullRecord;
    }
    static delete(id) {
        const prevLen = this.invoices.length;
        this.invoices = this.invoices.filter(inv => inv.id !== id);
        if (this.invoices.length !== prevLen) {
            this.persist();
            return true;
        }
        return false;
    }
}
// Khởi tạo ngay khi nạp module
InvoiceRepository.init();
