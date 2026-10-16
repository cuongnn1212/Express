import fs from 'fs';
import path from 'path';
import { AtomicStorageEngine } from '../../core/storage-engine.js';
export class ShipmentRepository {
    static filePath = path.join(process.cwd(), 'data', 'shipments.json');
    static shipments = [];
    static awbIndex = new Map();
    static indexShipment(s) {
        if (!s)
            return;
        if (s.shipmentId) {
            this.awbIndex.set(s.shipmentId.trim().toUpperCase(), s);
        }
        if (s.masterTrackingNumber) {
            this.awbIndex.set(s.masterTrackingNumber.trim().toUpperCase(), s);
        }
        if (Array.isArray(s.pieces)) {
            for (const p of s.pieces) {
                if (p?.trackingNumber) {
                    this.awbIndex.set(p.trackingNumber.trim().toUpperCase(), s);
                }
            }
        }
    }
    static rebuildIndex() {
        this.awbIndex.clear();
        for (let i = this.shipments.length - 1; i >= 0; i--) {
            this.indexShipment(this.shipments[i]);
        }
    }
    static getIndexSize() {
        return this.awbIndex.size;
    }
    static init() {
        try {
            const loaded = AtomicStorageEngine.readJson(this.filePath, []);
            this.shipments = Array.isArray(loaded) ? loaded.map(s => this.ensureFinancialStatus(s)) : [];
            this.rebuildIndex();
            if (!fs.existsSync(this.filePath)) {
                this.persist();
            }
        }
        catch (e) {
            console.error('Không thể nạp dữ liệu shipments.json, khởi tạo rỗng:', e);
            this.shipments = [];
            this.awbIndex.clear();
        }
    }
    static ensureFinancialStatus(s) {
        const isPaid = s.paymentStatus === 'PAID';
        const isDeducted = Boolean(s.financialStatus?.isDeducted || (isPaid && (s.paymentMethod?.toLowerCase().includes('ví') || s.paymentMethod?.toLowerCase().includes('công nợ'))));
        const isCommitted = Boolean(s.financialStatus?.isCustomerCommitted || false);
        const eligible = Boolean(isPaid && isDeducted && isCommitted);
        let financialCategory = s.financialCategory;
        if (!financialCategory) {
            const pm = String(s.paymentMethod || s.financialStatus?.paidMethod || '').toLowerCase();
            if (pm.includes('ví') || s.paymentChannel === 'WALLET') {
                financialCategory = 'WALLET';
            }
            else if (pm.includes('công nợ') || pm.includes('sau') || s.paymentTerm === 'POSTPAID' || (s.customerCode && s.customerCode.startsWith('DL'))) {
                financialCategory = 'POSTPAID';
            }
            else {
                financialCategory = 'IMMEDIATE';
            }
        }
        const fStatus = {
            isPaid: s.financialStatus?.isPaid !== undefined ? s.financialStatus.isPaid : isPaid,
            paidAt: s.financialStatus?.paidAt || (isPaid ? s.createdAt : undefined),
            paidMethod: s.financialStatus?.paidMethod || s.paymentMethod || (isPaid ? (financialCategory === 'WALLET' ? 'Ví PandaLex' : financialCategory === 'POSTPAID' ? 'Hạn mức công nợ' : 'Tiền ngay') : undefined),
            isDeducted: s.financialStatus?.isDeducted !== undefined ? s.financialStatus.isDeducted : isDeducted,
            deductedAt: s.financialStatus?.deductedAt,
            deductedAmount: s.financialStatus?.deductedAmount || (isDeducted ? s.sellPrice : 0),
            isCustomerCommitted: s.financialStatus?.isCustomerCommitted !== undefined ? s.financialStatus.isCustomerCommitted : isCommitted,
            committedAt: s.financialStatus?.committedAt,
            committedBy: s.financialStatus?.committedBy,
            commitmentNote: s.financialStatus?.commitmentNote || 'Khách hàng cam kết chịu trách nhiệm biểu thuế & phụ phí hải quan',
            eligibleForDispatch: s.financialStatus?.eligibleForDispatch !== undefined ? s.financialStatus.eligibleForDispatch : eligible
        };
        let status = s.status || 'PENDING_PICKUP';
        if (status === 'CREATED')
            status = 'PENDING_PICKUP';
        const currentWarehouseHub = s.currentWarehouseHub || s.inboundHub || s.hub || 'HAN';
        const vendorSettled = Boolean(s.vendorSettled || false);
        const customerSettled = s.customerSettled !== undefined
            ? Boolean(s.customerSettled)
            : (financialCategory === 'IMMEDIATE' && isPaid);
        return {
            ...s,
            status,
            financialCategory,
            currentWarehouseHub,
            vendorSettled,
            vendorSettledAt: s.vendorSettledAt,
            vendorSettlementRef: s.vendorSettlementRef,
            customerSettled,
            customerSettledAt: s.customerSettledAt,
            customerSettlementRef: s.customerSettlementRef,
            financialStatus: fStatus
        };
    }
    static persist() {
        AtomicStorageEngine.writeJson(this.filePath, this.shipments);
    }
    static save(shipment, notes) {
        const existingIdx = this.shipments.findIndex(s => s.shipmentId === shipment.shipmentId || (s.masterTrackingNumber && s.masterTrackingNumber === shipment.masterTrackingNumber));
        const prev = existingIdx >= 0 ? this.shipments[existingIdx] : undefined;
        const baseObj = {
            ...shipment,
            createdAt: prev ? prev.createdAt : new Date().toISOString(),
            status: shipment.status || (prev ? prev.status : 'PENDING_PICKUP'),
            notes: notes || (prev ? prev.notes : undefined),
            awbPdfUrl: shipment.awbPdfUrl || (prev ? prev.awbPdfUrl : undefined),
            financialCategory: shipment.financialCategory || prev?.financialCategory,
            currentWarehouseHub: shipment.currentWarehouseHub || prev?.currentWarehouseHub || shipment.hub || 'HAN',
            vendorSettled: shipment.vendorSettled !== undefined ? shipment.vendorSettled : prev?.vendorSettled,
            vendorSettledAt: shipment.vendorSettledAt || prev?.vendorSettledAt,
            vendorSettlementRef: shipment.vendorSettlementRef || prev?.vendorSettlementRef,
            customerSettled: shipment.customerSettled !== undefined ? shipment.customerSettled : prev?.customerSettled,
            customerSettledAt: shipment.customerSettledAt || prev?.customerSettledAt,
            customerSettlementRef: shipment.customerSettlementRef || prev?.customerSettlementRef,
            pickedUpAt: shipment.pickedUpAt || prev?.pickedUpAt,
            pickedUpBy: shipment.pickedUpBy || prev?.pickedUpBy,
            inboundedAt: shipment.inboundedAt || prev?.inboundedAt,
            inboundedBy: shipment.inboundedBy || prev?.inboundedBy,
            inboundHub: shipment.inboundHub || prev?.inboundHub,
            dispatchedAt: shipment.dispatchedAt || prev?.dispatchedAt,
            dispatchedBy: shipment.dispatchedBy || prev?.dispatchedBy,
            dispatchManifestId: shipment.dispatchManifestId || prev?.dispatchManifestId,
            financialStatus: shipment.financialStatus || prev?.financialStatus
        };
        const stored = this.ensureFinancialStatus(baseObj);
        if (existingIdx >= 0) {
            this.shipments[existingIdx] = stored;
        }
        else {
            this.shipments.unshift(stored); // Đưa lên đầu
        }
        this.indexShipment(stored);
        this.persist();
        return stored;
    }
    static getAll() {
        return this.shipments;
    }
    static getById(id) {
        if (!id)
            return undefined;
        const clean = String(id).trim().toUpperCase();
        // O(1) Hash Map Lookup - Tốc độ 0.001ms không phụ thuộc quy mô đơn hàng
        const indexed = this.awbIndex.get(clean);
        if (indexed)
            return indexed;
        const found = this.shipments.find(s => (s.shipmentId && s.shipmentId.trim().toUpperCase() === clean) ||
            (s.masterTrackingNumber && s.masterTrackingNumber.trim().toUpperCase() === clean) ||
            (s.pieces && s.pieces.some(p => p.trackingNumber && p.trackingNumber.trim().toUpperCase() === clean)));
        if (found)
            this.indexShipment(found);
        return found;
    }
    static existsAwb(awb) {
        return Boolean(this.getById(awb));
    }
    /**
     * Cập nhật trạng thái vận hành theo quy trình kho
     */
    static updateStatus(id, status) {
        const s = this.getById(id);
        if (!s)
            return null;
        s.status = status;
        this.persist();
        return s;
    }
    static updateOperationalStatus(id, status, meta) {
        const s = this.getById(id);
        if (!s)
            return null;
        s.status = status;
        const now = new Date().toISOString();
        if (status === 'PICKED_UP') {
            s.pickedUpAt = now;
            if (meta?.operator)
                s.pickedUpBy = meta.operator;
        }
        else if (status === 'INBOUND_RECEIVED') {
            s.inboundedAt = now;
            if (meta?.operator)
                s.inboundedBy = meta.operator;
            if (meta?.hub)
                s.inboundHub = meta.hub;
        }
        else if (status === 'OUTBOUND_DISPATCHED') {
            s.dispatchedAt = now;
            if (meta?.operator)
                s.dispatchedBy = meta.operator;
            if (meta?.manifestId)
                s.dispatchManifestId = meta.manifestId;
        }
        if (meta?.note) {
            s.notes = s.notes ? `${s.notes} | ${meta.note}` : meta.note;
        }
        this.persist();
        return s;
    }
    /**
     * Kiểm tra 3 điều kiện tài chính bắt buộc để được xuất kho:
     * 1. Đã thanh toán (isPaid)
     * 2. Đã trừ tiền (isDeducted)
     * 3. Có sự cam kết từ khách hàng (isCustomerCommitted)
     */
    static verifyFinancialGate(id) {
        const s = this.getById(id);
        if (!s) {
            return {
                eligible: false,
                status: { isPaid: false, isDeducted: false, isCustomerCommitted: false, eligibleForDispatch: false },
                missingConditions: ['Không tìm thấy vận đơn']
            };
        }
        const missing = [];
        if (!s.financialStatus.isPaid) {
            missing.push('Chưa thanh toán (Cần thanh toán tiền cước)');
        }
        if (!s.financialStatus.isDeducted) {
            missing.push('Chưa trừ tiền (Cần khấu trừ ví hoặc cấn trừ công nợ)');
        }
        if (!s.financialStatus.isCustomerCommitted) {
            missing.push('Chưa có sự cam kết từ khách hàng (Cam kết nghĩa vụ thuế/phụ phí)');
        }
        const eligible = missing.length === 0;
        s.financialStatus.eligibleForDispatch = eligible;
        this.persist();
        return {
            eligible,
            status: s.financialStatus,
            missingConditions: missing,
            shipment: s
        };
    }
    /**
     * Cập nhật cổng tài chính & cam kết cho vận đơn
     */
    static updateFinancialGate(id, update) {
        const s = this.getById(id);
        if (!s)
            return null;
        s.financialStatus = {
            ...s.financialStatus,
            ...update
        };
        s.financialStatus.eligibleForDispatch = Boolean(s.financialStatus.isPaid &&
            s.financialStatus.isDeducted &&
            s.financialStatus.isCustomerCommitted);
        if (s.financialStatus.isPaid) {
            s.paymentStatus = 'PAID';
        }
        // Nếu đơn đã nhập kho và nay hoàn thành đủ 3 điều kiện -> Tự động chuyển sang Kho Chờ Xuất
        if (s.financialStatus.eligibleForDispatch && (s.status === 'INBOUND_RECEIVED' || s.status === 'PRINTED')) {
            s.status = 'WAITING_FINANCE_DISPATCH';
        }
        this.persist();
        return s;
    }
    static updatePaymentStatus(id, paymentStatus) {
        const s = this.getById(id);
        if (!s)
            return null;
        s.paymentStatus = paymentStatus;
        s.financialStatus.isPaid = (paymentStatus === 'PAID');
        s.financialStatus.eligibleForDispatch = Boolean(s.financialStatus.isPaid &&
            s.financialStatus.isDeducted &&
            s.financialStatus.isCustomerCommitted);
        this.persist();
        return s;
    }
    static getByCustomerCode(customerCode) {
        const clean = customerCode.trim().toUpperCase();
        return this.shipments.filter(s => s.customerCode?.toUpperCase() === clean);
    }
    static getWaitingDispatch(hub) {
        return this.shipments.filter(s => {
            const matchHub = !hub || s.hub === hub || s.inboundHub === hub || s.currentWarehouseHub === hub;
            const matchStatus = s.status === 'WAITING_FINANCE_DISPATCH' || (s.status === 'INBOUND_RECEIVED' && s.financialStatus.eligibleForDispatch);
            return matchHub && matchStatus;
        });
    }
    /**
     * Lấy danh sách vận đơn theo Hub chi nhánh làm việc (HAN, SGN, DAD) và trạng thái
     */
    static getByWarehouseHub(hub, status) {
        return this.shipments.filter(s => {
            const matchHub = !hub || s.currentWarehouseHub === hub || s.inboundHub === hub || s.hub === hub;
            const matchStatus = !status || s.status === status;
            return matchHub && matchStatus;
        });
    }
    /**
     * Đơn lưu trữ chờ nhập kho tại Hub (được tạo hoặc chuyển đến chi nhánh nhưng chưa quét vào kho)
     */
    static getPendingInbound(hub) {
        return this.shipments.filter(s => {
            const matchHub = !hub || s.currentWarehouseHub === hub || s.hub === hub;
            const isPending = s.status === 'PENDING_INBOUND' || s.status === 'PENDING_PICKUP' || s.status === 'PICKED_UP';
            return matchHub && isPending;
        });
    }
    /**
     * Đơn đã nhập vào kho tại Hub, phân loại theo 3 luồng tài chính: IMMEDIATE, POSTPAID, WALLET
     */
    static getInboundReceived(hub, category) {
        return this.shipments.filter(s => {
            const matchHub = !hub || s.currentWarehouseHub === hub || s.inboundHub === hub || s.hub === hub;
            const isReceived = s.status === 'INBOUND_RECEIVED' || s.status === 'WAITING_FINANCE_DISPATCH';
            const matchCategory = !category || s.financialCategory === category;
            return matchHub && isReceived && matchCategory;
        });
    }
    /**
     * Lấy các đơn hàng xuất giao Hãng/Nhà cung cấp chưa gạch nợ (costPrice)
     */
    static getUnsettledVendors(vendor) {
        return this.shipments.filter(s => {
            const isDispatched = s.status === 'OUTBOUND_DISPATCHED' || s.status === 'DELIVERED';
            const notSettled = !s.vendorSettled;
            const matchVendor = !vendor || (s.carrier && s.carrier.toUpperCase() === vendor.toUpperCase());
            return isDispatched && notSettled && matchVendor;
        });
    }
    /**
     * Lấy các đơn hàng của Đại lý/Khách hàng thanh toán sau (POSTPAID) chưa gạch nợ (sellPrice)
     */
    static getUnsettledCustomers(customerCode) {
        return this.shipments.filter(s => {
            const isPostpaid = s.financialCategory === 'POSTPAID';
            const notSettled = !s.customerSettled;
            const matchCust = !customerCode || (s.customerCode && s.customerCode.toUpperCase() === customerCode.toUpperCase());
            return isPostpaid && notSettled && matchCust;
        });
    }
    /**
     * Gạch nợ cho danh sách vận đơn theo Nhà cung cấp
     */
    static markVendorSettled(shipmentIds, ref, operator) {
        let count = 0;
        const now = new Date().toISOString();
        for (const id of shipmentIds) {
            const s = this.getById(id);
            if (s) {
                s.vendorSettled = true;
                s.vendorSettledAt = now;
                s.vendorSettlementRef = ref;
                count++;
            }
        }
        if (count > 0)
            this.persist();
        return count;
    }
    /**
     * Gạch nợ cho danh sách vận đơn của Đại lý / Khách hàng thanh toán sau
     */
    static markCustomerSettled(shipmentIds, ref, operator) {
        let count = 0;
        const now = new Date().toISOString();
        for (const id of shipmentIds) {
            const s = this.getById(id);
            if (s) {
                s.customerSettled = true;
                s.customerSettledAt = now;
                s.customerSettlementRef = ref;
                s.paymentStatus = 'PAID';
                s.financialStatus.isPaid = true;
                s.financialStatus.paidAt = now;
                s.financialStatus.paidMethod = 'Đối soát gạch nợ định kỳ';
                count++;
            }
        }
        if (count > 0)
            this.persist();
        return count;
    }
    static delete(id) {
        const initLen = this.shipments.length;
        const clean = String(id || '').trim().toUpperCase();
        this.shipments = this.shipments.filter(s => s.shipmentId?.trim().toUpperCase() !== clean &&
            s.masterTrackingNumber?.trim().toUpperCase() !== clean);
        if (this.shipments.length !== initLen) {
            this.rebuildIndex();
            this.persist();
            return true;
        }
        return false;
    }
    static deleteAll() {
        const count = this.shipments.length;
        this.shipments = [];
        this.awbIndex.clear();
        this.persist();
        return count;
    }
}
// Khởi chạy
ShipmentRepository.init();
