import * as XLSX from 'xlsx';
export class ExcelExportService {
    /**
     * Xuất danh sách Vận đơn ra Buffer Excel (.xlsx) chuẩn nghiệp vụ PandaLex
     * Kế thừa từ logic BookingManager.ascx.cs của ship.pandalexvn.com
     */
    static exportShipmentsToExcel(shipments) {
        // Tiêu đề cột chuẩn hóa
        const headers = [
            'STT',
            'Ngày tạo',
            'Mã khách hàng',
            'Tên khách hàng',
            'Mã vận đơn (AWB)',
            'Hãng vận chuyển',
            'Gói dịch vụ',
            'Số kiện',
            'Cân thực tế (kg)',
            'Cân quy đổi (kg)',
            'Cân tính cước (kg)',
            'Hình thức thanh toán',
            'Trạng thái thanh toán',
            'Giá vốn Net (VNĐ)',
            'Giá bán khách (VNĐ)',
            'Lợi nhuận gộp (VNĐ)',
            'Kho gửi (Hub)',
            'Nước đến',
            'Người nhận',
            'Trạng thái đơn hàng'
        ];
        let totalWeight = 0;
        let totalPieces = 0;
        let totalCost = 0;
        let totalSell = 0;
        let totalProfit = 0;
        const rows = shipments.map((s, index) => {
            const actWeight = s.totalWeightKg || 0;
            const volWeight = s.volumetricWeightKg || 0;
            const chgWeight = s.chargeableWeightKg || Math.max(actWeight, volWeight);
            const cost = s.costPrice || Math.round(chgWeight * 220000);
            const sell = s.sellPrice || Math.round(chgWeight * 275000);
            const profit = s.profit !== undefined ? s.profit : (sell - cost);
            totalWeight += actWeight;
            totalPieces += s.totalPieces || 1;
            totalCost += cost;
            totalSell += sell;
            totalProfit += profit;
            const pTermText = s.paymentTerm === 'POSTPAID' ? 'Thanh toán sau (Công nợ)' : 'Thanh toán ngay (Prepaid)';
            const pStatusText = s.paymentStatus === 'PAID' ? 'Đã thu tiền' : 'Chưa thu (Ghi nợ)';
            const dateStr = s.createdAt ? new Date(s.createdAt).toLocaleString('vi-VN') : s.dateFormatted;
            return [
                index + 1,
                dateStr,
                s.customerCode || 'PDL-GUEST',
                s.customerName || s.sender?.name || 'Khách lẻ',
                s.masterTrackingNumber,
                s.carrier,
                s.serviceName,
                s.totalPieces || 1,
                actWeight,
                volWeight,
                chgWeight,
                pTermText,
                pStatusText,
                cost,
                sell,
                profit,
                s.hub || 'SGN',
                s.shipTo?.countryCode || s.recipient?.country || 'US',
                s.recipient?.name || s.shipTo?.contactName || '',
                s.status || 'CREATED'
            ];
        });
        // Dòng Tổng Cộng (Summary Row)
        const summaryRow = [
            'TỔNG',
            '',
            '',
            '',
            '',
            '',
            '',
            totalPieces,
            Math.round(totalWeight * 10) / 10,
            '',
            '',
            '',
            '',
            totalCost,
            totalSell,
            totalProfit,
            '',
            '',
            '',
            `${shipments.length} VẬN ĐƠN`
        ];
        const data = [headers, ...rows, summaryRow];
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        // Thiết lập độ rộng cột
        worksheet['!cols'] = [
            { wch: 6 }, // STT
            { wch: 20 }, // Ngày tạo
            { wch: 15 }, // Mã KH
            { wch: 25 }, // Tên KH
            { wch: 22 }, // AWB
            { wch: 16 }, // Hãng
            { wch: 24 }, // Dịch vụ
            { wch: 10 }, // Số kiện
            { wch: 16 }, // Cân thực
            { wch: 16 }, // Cân quy đổi
            { wch: 18 }, // Cân tính cước
            { wch: 24 }, // HTTT
            { wch: 20 }, // Trạng thái TT
            { wch: 18 }, // Giá vốn
            { wch: 18 }, // Giá bán
            { wch: 18 }, // Lợi nhuận
            { wch: 14 }, // Hub
            { wch: 12 }, // Nước đến
            { wch: 22 }, // Người nhận
            { wch: 18 } // Trạng thái
        ];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachBill_PandaLex');
        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
}
