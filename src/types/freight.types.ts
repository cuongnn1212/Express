export type FreightType = 'AIR_CARGO' | 'SEA_LCL' | 'SEA_FCL';

// ================= AIR CARGO (LINEHAUL / MAWB & HAWB) =================
export interface AirBooking {
  bookingId: string;
  airline: string; // Vietnam Airlines (VN), Eva Air (BR), Korean Air (KE), Cathay Pacific (CX)...
  airlinePrefix: string; // 738 (VN), 695 (BR), 180 (KE)...
  mawbNumber: string; // VD: 738-12345678 (Master Air Waybill)
  flightNumber: string; // VN98, BR392...
  flightDate: string; // YYYY-MM-DD
  airportDeparture: string; // SGN, HAN, DAD
  airportDestination: string; // LAX, JFK, ORD, SYD, FRA...
  status: 'BOOKED' | 'CARGO_ACCEPTED' | 'DEPARTED' | 'ARRIVED' | 'CUSTOMS_CLEARED';
  
  allocatedGrossWeightKg: number;
  allocatedVolumeCbm: number;
  chargeableWeightKg: number; // Ratio Air: 1 CBM = 167 kg (hoặc D*R*C / 6000)
  
  ratePerKgVnd: number; // Đơn giá mua từ hãng bay (VND/kg)
  sellRatePerKgVnd: number; // Đơn giá bán cho khách/đại lý (VND/kg)
  
  hawbList: HouseAirWaybill[];
  manifestNotes?: string;
  createdAt: string;
}

export interface HouseAirWaybill {
  hawbNumber: string; // HAWB cấp cho khách con
  customerName: string;
  piecesCount: number;
  grossWeightKg: number;
  volumeCbm: number;
  chargeableWeightKg: number;
  commodityDesc: string;
  shipperName: string;
  consigneeName: string;
}

// ================= SEA FREIGHT (LCL & FCL) =================
export type ContainerSize = '20GP' | '40GP' | '40HC' | '45HC';

export interface SeaShipment {
  seaId: string;
  freightMode: 'SEA_LCL' | 'SEA_FCL';
  shippingLine: string; // Maersk, MSC, ONE, CMA CGM, Evergreen, Cosco...
  vesselName: string; // Tên tàu (VD: EVER GIVEN)
  voyageNumber: string; // Chuyến tàu (VD: 024W)
  masterBillOfLading: string; // Master B/L từ hãng tàu
  houseBillOfLading: string; // House B/L PandaLex cấp cho chủ hàng
  
  portOfLoading: string; // POL (Cát Lái - VNCLI, Cái Mép - VNTOT, Hải Phòng - VNHPH)
  portOfDischarge: string; // POD (Long Beach - USLGB, Los Angeles - USLAX, Hamburg - DEHAM...)
  etd: string; // Ngày tàu chạy dự kiến (YYYY-MM-DD)
  eta: string; // Ngày tàu đến dự kiến (YYYY-MM-DD)
  
  // Dành riêng cho FCL (Nguyên container)
  containerSize?: ContainerSize;
  containerNumber?: string; // 4 chữ cái + 7 số (VD: MSCU1234567)
  sealNumber?: string; // Số chì niêm phong hãng tàu (VD: ML-VN88921)
  
  // Dành riêng cho LCL (Hàng lẻ gom số khối CBM)
  totalCbm?: number; // Số khối mét khối (m3)
  grossWeightKg: number;
  revenueTon?: number; // RT = Max(CBM, Weight Ton) theo quy chuẩn cước biển quốc tế
  
  // Giá cước & Lợi nhuận
  oceanFreightCostUsd: number; // Cước biển giá vốn mua hãng tàu
  oceanFreightSellUsd: number; // Cước biển giá bán cho khách
  localChargesVnd: {
    thc: number; // Terminal Handling Charge (Phí xếp dỡ cảng)
    blFee: number; // Phí phát hành vận đơn B/L
    sealFee: number; // Phí chì container
    telexReleaseFee?: number; // Phí điện giao hàng
  };
  
  shipper: string;
  consignee: string;
  cargoDescription: string;
  incoterm: 'FOB' | 'CIF' | 'CFR' | 'EXW' | 'DDP';
  status: 'BOOKED' | 'GATE_IN' | 'LOADED' | 'SAILING' | 'DISCHARGED' | 'DELIVERED';
  createdAt: string;
}
