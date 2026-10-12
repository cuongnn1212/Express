import fs from 'fs';
import path from 'path';
import { AirBooking, HouseAirWaybill, SeaShipment } from '../../types/freight.types.js';
import { AuthService } from '../auth/auth-service.js';

export class FreightService {
  private static airFile = path.join(process.cwd(), 'data', 'air_cargo_bookings.json');
  private static seaFile = path.join(process.cwd(), 'data', 'sea_freight_shipments.json');

  private static airBookings: AirBooking[] = [];
  private static seaShipments: SeaShipment[] = [];

  static init() {
    try {
      const dir = path.dirname(this.airFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      // 1. Air Cargo Bookings
      if (fs.existsSync(this.airFile)) {
        this.airBookings = JSON.parse(fs.readFileSync(this.airFile, 'utf-8'));
      } else {
        this.airBookings = [
          {
            bookingId: 'AIR_BKG_2026_001',
            airline: 'Vietnam Airlines',
            airlinePrefix: '738',
            mawbNumber: '738-92814022',
            flightNumber: 'VN98',
            flightDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
            airportDeparture: 'SGN',
            airportDestination: 'SFO',
            status: 'BOOKED',
            allocatedGrossWeightKg: 1500,
            allocatedVolumeCbm: 9.5,
            chargeableWeightKg: 1586.5, // 9.5 CBM * 167 = 1586.5 kg
            ratePerKgVnd: 105000, // Giá mua hãng bay 105.000 đ/kg
            sellRatePerKgVnd: 135000, // Giá bán cho khách 135.000 đ/kg
            manifestNotes: 'Lô hàng may mặc xuất khẩu đi San Francisco, bay thẳng SGN-SFO',
            hawbList: [
              {
                hawbNumber: 'PLX-SFO-8811',
                customerName: 'Công ty TNHH Dệt May Sài Gòn (VIP-105)',
                piecesCount: 45,
                grossWeightKg: 850,
                volumeCbm: 5.2,
                chargeableWeightKg: 868.4,
                commodityDesc: 'Garments & Cotton Shirts (Áo sơ mi xuất khẩu)',
                shipperName: 'SAI GON TEXTILE CO., LTD',
                consigneeName: 'PACIFIC APPAREL INC (SAN FRANCISCO, USA)'
              },
              {
                hawbNumber: 'PLX-SFO-8812',
                customerName: 'An Nam Logistics (AG-002)',
                piecesCount: 30,
                grossWeightKg: 650,
                volumeCbm: 4.3,
                chargeableWeightKg: 718.1,
                commodityDesc: 'Footwear & Fashion Accessories (Giày dép & phụ kiện)',
                shipperName: 'AN NAM FORWARDING VN',
                consigneeName: 'BAY AREA DISTRIBUTORS LLC (OAKLAND, CA)'
              }
            ],
            createdAt: new Date().toISOString()
          }
        ];
        this.persistAir();
      }

      // 2. Sea Freight Shipments
      if (fs.existsSync(this.seaFile)) {
        this.seaShipments = JSON.parse(fs.readFileSync(this.seaFile, 'utf-8'));
      } else {
        this.seaShipments = [
          {
            seaId: 'SEA_FCL_2026_001',
            freightMode: 'SEA_FCL',
            shippingLine: 'ONE (Ocean Network Express)',
            vesselName: 'ONE COMMITMENT',
            voyageNumber: '028E',
            masterBillOfLading: 'ONEYSGN260199',
            houseBillOfLading: 'HBL-PLX-LAX-001',
            portOfLoading: 'Cát Lái, TP.HCM (VNCLI)',
            portOfDischarge: 'Los Angeles, USA (USLAX)',
            etd: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
            eta: new Date(Date.now() + 24 * 86400000).toISOString().slice(0, 10),
            containerSize: '40HC',
            containerNumber: 'TGHU9284102',
            sealNumber: 'ONE-VN99281',
            grossWeightKg: 18500,
            oceanFreightCostUsd: 2150, // Mua 2.150$ / 40HC
            oceanFreightSellUsd: 2650, // Bán 2.650$ / 40HC (Lãi 500$)
            localChargesVnd: {
              thc: 5400000,
              blFee: 950000,
              sealFee: 220000,
              telexReleaseFee: 750000
            },
            shipper: 'GO DANG SEAFOOD JOINT STOCK COMPANY',
            consignee: 'OCEAN CROWN SEAFOOD CORP (LOS ANGELES, USA)',
            cargoDescription: 'Frozen Pangasius Fillet in cartons (Cá tra fillet đông lạnh)',
            incoterm: 'CIF',
            status: 'LOADED',
            createdAt: new Date().toISOString()
          },
          {
            seaId: 'SEA_LCL_2026_002',
            freightMode: 'SEA_LCL',
            shippingLine: 'Maersk Line',
            vesselName: 'MAERSK MC-KINNEY MOLLER',
            voyageNumber: '2604W',
            masterBillOfLading: 'MAEU21948102',
            houseBillOfLading: 'HBL-PLX-HAM-002',
            portOfLoading: 'Cái Mép, Vũng Tàu (VNTOT)',
            portOfDischarge: 'Hamburg, Germany (DEHAM)',
            etd: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
            eta: new Date(Date.now() + 32 * 86400000).toISOString().slice(0, 10),
            totalCbm: 6.8, // 6.8 m3
            grossWeightKg: 2450,
            revenueTon: 6.8, // RT = Max(6.8, 2.45) = 6.8 RT
            oceanFreightCostUsd: 272, // 40$ / CBM * 6.8 = 272$
            oceanFreightSellUsd: 442, // 65$ / CBM * 6.8 = 442$ (Lãi 170$)
            localChargesVnd: {
              thc: 2720000,
              blFee: 900000,
              sealFee: 0
            },
            shipper: 'GOM SU MINH LONG TRADING CO.',
            consignee: 'EUROPEAN HOMEWARES GMBH (HAMBURG, GERMANY)',
            cargoDescription: 'Ceramic Tableware & Teasets (Đồ gốm sứ mỹ nghệ gia dụng)',
            incoterm: 'FOB',
            status: 'BOOKED',
            createdAt: new Date().toISOString()
          }
        ];
        this.persistSea();
      }
    } catch (e) {
      console.error('Lỗi nạp Freight data:', e);
    }
  }

  private static persistAir() {
    fs.writeFileSync(this.airFile, JSON.stringify(this.airBookings, null, 2), 'utf-8');
  }

  private static persistSea() {
    fs.writeFileSync(this.seaFile, JSON.stringify(this.seaShipments, null, 2), 'utf-8');
  }

  // ================= AIR CARGO METHODS =================
  static getAllAirBookings(): AirBooking[] {
    return this.airBookings;
  }

  static getAirBookingById(id: string): AirBooking | undefined {
    return this.airBookings.find(b => b.bookingId === id || b.mawbNumber === id);
  }

  static createAirBooking(b: Omit<AirBooking, 'bookingId' | 'createdAt'>, operator: string): AirBooking {
    const newBooking: AirBooking = {
      bookingId: `AIR_BKG_${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      ...b
    };
    this.airBookings.unshift(newBooking);
    this.persistAir();

    AuthService.logAction({
      userId: operator,
      username: operator,
      userRole: 'SUPER_ADMIN',
      action: 'CREATE_SHIPMENT',
      targetId: newBooking.mawbNumber,
      details: `Tạo Booking Air Cargo MAWB: ${newBooking.mawbNumber} (${newBooking.airline} - ${newBooking.flightNumber}) tuyến ${newBooking.airportDeparture} ➔ ${newBooking.airportDestination}. KL: ${newBooking.allocatedGrossWeightKg}kg`
    });

    return newBooking;
  }

  static addHawbToBooking(bookingId: string, hawb: HouseAirWaybill, operator: string): { success: boolean; message: string; booking?: AirBooking } {
    const booking = this.getAirBookingById(bookingId);
    if (!booking) return { success: false, message: 'Không tìm thấy Booking MAWB' };

    booking.hawbList.push(hawb);
    // Tính lại tổng tải
    booking.allocatedGrossWeightKg = Math.round(booking.hawbList.reduce((s, h) => s + h.grossWeightKg, 0) * 10) / 10;
    booking.allocatedVolumeCbm = Math.round(booking.hawbList.reduce((s, h) => s + h.volumeCbm, 0) * 100) / 100;
    booking.chargeableWeightKg = Math.max(booking.allocatedGrossWeightKg, Math.round(booking.allocatedVolumeCbm * 167 * 10) / 10);
    this.persistAir();

    return { success: true, message: `Đã thêm HAWB ${hawb.hawbNumber} vào lô MAWB ${booking.mawbNumber} thành công!`, booking };
  }

  // ================= SEA FREIGHT METHODS =================
  static getAllSeaShipments(): SeaShipment[] {
    return this.seaShipments;
  }

  static getSeaShipmentById(id: string): SeaShipment | undefined {
    return this.seaShipments.find(s => s.seaId === id || s.masterBillOfLading === id || s.houseBillOfLading === id);
  }

  static createSeaShipment(s: Omit<SeaShipment, 'seaId' | 'createdAt'>, operator: string): SeaShipment {
    const newShipment: SeaShipment = {
      seaId: `SEA_${s.freightMode === 'SEA_FCL' ? 'FCL' : 'LCL'}_${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      ...s
    };
    this.seaShipments.unshift(newShipment);
    this.persistSea();

    AuthService.logAction({
      userId: operator,
      username: operator,
      userRole: 'SUPER_ADMIN',
      action: 'CREATE_SHIPMENT',
      targetId: newShipment.masterBillOfLading,
      details: `Tạo Vận đơn đường biển ${newShipment.freightMode} Master B/L: ${newShipment.masterBillOfLading} (${newShipment.shippingLine} - Tàu ${newShipment.vesselName}) tuyến ${newShipment.portOfLoading} ➔ ${newShipment.portOfDischarge}`
    });

    return newShipment;
  }

  static updateSeaStatus(id: string, status: SeaShipment['status']): SeaShipment | null {
    const s = this.getSeaShipmentById(id);
    if (!s) return null;
    s.status = status;
    this.persistSea();
    return s;
  }
}

FreightService.init();
