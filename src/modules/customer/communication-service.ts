import fs from 'fs';
import path from 'path';
import { LogisticsTradeBrain } from '../ai/logistics-trade-brain.js';

export type TicketType = 
  | 'PICKUP_REQUEST'     // Yêu cầu lấy hàng tận nơi
  | 'QUOTE_REQUEST'      // Tư vấn báo giá lô lớn / FBA / Hợp đồng
  | 'CLAIM_DISPUTE'      // Khiếu nại hàng hóa, vỡ hỏng, chậm phát
  | 'BILLING_INQUIRY'    // Thắc mắc cước phí / Hóa đơn / Ví
  | 'CUSTOMS_SUPPORT'    // Tư vấn hải quan / MSDS / Giấy phép
  | 'GENERAL_SUPPORT';   // Hỗ trợ chung

export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TicketStatus = 'NEW' | 'PROCESSING' | 'RESOLVED' | 'CLOSED';

export interface TicketMessage {
  id: string;
  senderRole: 'CUSTOMER' | 'SUPPORT_AGENT' | 'WAREHOUSE' | 'FINANCE' | 'WAREHOUSE_PARTNER';
  senderName: string;
  message: string;
  attachments?: string[];
  timestamp: string;
}

export interface CustomerTicket {
  ticketCode: string;           // TK-20261012-0001
  type: TicketType;
  title: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerCode?: string;        // AG-001, AG-002 nếu đã có tài khoản
  awbNumber?: string;           // Mã vận đơn liên quan nếu có
  hub: 'HAN' | 'SGN' | 'DAD';    // Điểm tiếp nhận hỗ trợ
  priority: TicketPriority;
  status: TicketStatus;
  pickupDetails?: {
    address: string;
    city: string;
    estimatedWeightKg?: number;
    estimatedPackages?: number;
    scheduledTime?: string;
    notes?: string;
  };
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;          // Nhân viên phụ trách
  resolutionNotes?: string;
}

export interface LiveChatMessage {
  id: string;
  sessionId: string;            // Phiên chat của khách
  customerName: string;
  customerPhone?: string;
  sender: 'CUSTOMER' | 'PANDALEX_BOT' | 'CSKH';
  senderName: string;
  message: string;
  awbNumber?: string;
  timestamp: string;
}

const TICKETS_FILE = path.resolve('data/customer_tickets.json');
const CHATS_FILE = path.resolve('data/customer_chats.json');

export class CommunicationService {
  private static ensureFiles(): void {
    const dataDir = path.resolve('data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(TICKETS_FILE)) {
      const initialTickets: CustomerTicket[] = [
        {
          ticketCode: 'TK-20261012-0001',
          type: 'PICKUP_REQUEST',
          title: 'Yêu cầu lấy hàng tận nơi tại Cầu Giấy - 5 kiện đi Mỹ',
          customerName: 'Nguyễn Văn Minh',
          customerPhone: '0988776655',
          customerEmail: 'minh.nguyen@example.com',
          customerCode: 'AG-002',
          hub: 'HAN',
          priority: 'HIGH',
          status: 'PROCESSING',
          pickupDetails: {
            address: 'Số 45 Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
            city: 'Hà Nội',
            estimatedWeightKg: 45.5,
            estimatedPackages: 5,
            scheduledTime: '14:00 - 15:30 Hôm nay',
            notes: 'Hàng quà tặng thủ công mỹ nghệ, cần shipper mang theo cân bàn và băng keo niêm phong.'
          },
          messages: [
            {
              id: 'msg_1',
              senderRole: 'CUSTOMER',
              senderName: 'Nguyễn Văn Minh',
              message: 'Nhờ PandaLex cho bạn shipper qua lấy trước 16h giúp mình nhé, bên mình kịp đóng gói xong rồi ạ.',
              timestamp: '2026-10-12T08:15:00.000Z'
            },
            {
              id: 'msg_2',
              senderRole: 'SUPPORT_AGENT',
              senderName: 'CSKH Thùy Linh (HAN Hub)',
              message: 'Dạ PandaLex đã tiếp nhận yêu cầu của Anh Minh. Bạn điều phối viên HAN Hub đang sắp xếp xe tải lấy hàng lúc 14h30 qua địa chỉ 45 Duy Tân ạ!',
              timestamp: '2026-10-12T08:25:00.000Z'
            }
          ],
          createdAt: '2026-10-12T08:15:00.000Z',
          updatedAt: '2026-10-12T08:25:00.000Z',
          assignedTo: 'thuylinh_cskh'
        },
        {
          ticketCode: 'TK-20261012-0002',
          type: 'CLAIM_DISPUTE',
          title: 'Tra soát thời gian giao hàng AWB 1Z861R320493609873 đi Houston, TX',
          customerName: 'Trần Thị Thu Hà',
          customerPhone: '0912348899',
          customerEmail: 'ha.tran@exportvn.com',
          awbNumber: '1Z861R320493609873',
          hub: 'SGN',
          priority: 'URGENT',
          status: 'PROCESSING',
          messages: [
            {
              id: 'msg_3',
              senderRole: 'CUSTOMER',
              senderName: 'Trần Thị Thu Hà',
              message: 'Chào PandaLex, đơn 1Z861R320493609873 của mình đã thông quan xong chưa ạ? Người nhận tại Texas đang hỏi lịch giao.',
              timestamp: '2026-10-12T08:30:00.000Z'
            },
            {
              id: 'msg_4',
              senderRole: 'SUPPORT_AGENT',
              senderName: 'Điều Phối Viên Hoàng Quân (SGN Hub)',
              message: 'Dạ kiện hàng đã hoàn tất thủ tục xuất khẩu từ SGN Hub và đang trên chuyến bay chuyển tiếp qua trung chuyển Louisville của UPS. Dự kiến ngày mai sẽ cập bến Texas phát cho người nhận ạ!',
              timestamp: '2026-10-12T08:42:00.000Z'
            }
          ],
          createdAt: '2026-10-12T08:30:00.000Z',
          updatedAt: '2026-10-12T08:42:00.000Z',
          assignedTo: 'hoangquan_ops'
        }
      ];
      fs.writeFileSync(TICKETS_FILE, JSON.stringify(initialTickets, null, 2), 'utf-8');
    }

    if (!fs.existsSync(CHATS_FILE)) {
      const initialChats: LiveChatMessage[] = [
        {
          id: 'chat_init_1',
          sessionId: 'default_session',
          customerName: 'Khách hàng vãng lai',
          sender: 'PANDALEX_BOT',
          senderName: 'Trợ lý CSKH PandaLex 24/7',
          message: 'Xin chào Quý khách! PandaLex Express sẵn sàng hỗ trợ tra cứu AWB, đặt lịch lấy hàng, hoặc tư vấn cước phí gửi hàng quốc tế. Quý khách cần hỗ trợ gì ạ?',
          timestamp: '2026-10-12T08:00:00.000Z'
        }
      ];
      fs.writeFileSync(CHATS_FILE, JSON.stringify(initialChats, null, 2), 'utf-8');
    }
  }

  static getAllTickets(): CustomerTicket[] {
    this.ensureFiles();
    try {
      const data = fs.readFileSync(TICKETS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static getTicketByCode(ticketCode: string): CustomerTicket | undefined {
    const list = this.getAllTickets();
    return list.find(t => t.ticketCode.toUpperCase() === ticketCode.toUpperCase());
  }

  static findTicketsByKeyword(keyword: string): CustomerTicket[] {
    const list = this.getAllTickets();
    const kw = keyword.toLowerCase().trim();
    return list.filter(t => 
      t.ticketCode.toLowerCase().includes(kw) ||
      t.customerPhone.toLowerCase().includes(kw) ||
      t.customerName.toLowerCase().includes(kw) ||
      (t.awbNumber && t.awbNumber.toLowerCase().includes(kw))
    );
  }

  static createTicket(data: {
    type: TicketType;
    title: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    customerCode?: string;
    awbNumber?: string;
    hub?: 'HAN' | 'SGN' | 'DAD';
    priority?: TicketPriority;
    initialMessage: string;
    pickupDetails?: CustomerTicket['pickupDetails'];
  }): CustomerTicket {
    this.ensureFiles();
    const list = this.getAllTickets();

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = list.filter(t => t.ticketCode.includes(`TK-${dateStr}`)).length + 1;
    const ticketCode = `TK-${dateStr}-${countToday.toString().padStart(4, '0')}`;

    const newTicket: CustomerTicket = {
      ticketCode,
      type: data.type || 'GENERAL_SUPPORT',
      title: data.title || 'Yêu cầu hỗ trợ từ khách hàng',
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      customerCode: data.customerCode,
      awbNumber: data.awbNumber,
      hub: data.hub || 'HAN',
      priority: data.priority || 'NORMAL',
      status: 'NEW',
      pickupDetails: data.pickupDetails,
      messages: [
        {
          id: `msg_${Date.now()}`,
          senderRole: 'CUSTOMER',
          senderName: data.customerName,
          message: data.initialMessage,
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    list.unshift(newTicket);
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    return newTicket;
  }

  static replyTicket(ticketCode: string, reply: {
    senderRole: 'CUSTOMER' | 'SUPPORT_AGENT' | 'WAREHOUSE' | 'FINANCE' | 'WAREHOUSE_PARTNER';
    senderName: string;
    message: string;
  }): CustomerTicket | null {
    this.ensureFiles();
    const list = this.getAllTickets();
    const idx = list.findIndex(t => t.ticketCode.toUpperCase() === ticketCode.toUpperCase());
    if (idx === -1) return null;

    const ticket = list[idx];
    ticket.messages.push({
      id: `msg_${Date.now()}`,
      senderRole: reply.senderRole,
      senderName: reply.senderName,
      message: reply.message,
      timestamp: new Date().toISOString()
    });
    ticket.updatedAt = new Date().toISOString();

    if (reply.senderRole !== 'CUSTOMER' && ticket.status === 'NEW') {
      ticket.status = 'PROCESSING';
    }

    list[idx] = ticket;
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    return ticket;
  }

  static updateTicketStatus(ticketCode: string, status: TicketStatus, notes?: string, assignedTo?: string): CustomerTicket | null {
    this.ensureFiles();
    const list = this.getAllTickets();
    const idx = list.findIndex(t => t.ticketCode.toUpperCase() === ticketCode.toUpperCase());
    if (idx === -1) return null;

    list[idx].status = status;
    list[idx].updatedAt = new Date().toISOString();
    if (notes) list[idx].resolutionNotes = notes;
    if (assignedTo) list[idx].assignedTo = assignedTo;

    fs.writeFileSync(TICKETS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    return list[idx];
  }

  // --- Live Chat Methods ---
  static getChatMessages(sessionId: string): LiveChatMessage[] {
    this.ensureFiles();
    try {
      const data = fs.readFileSync(CHATS_FILE, 'utf-8');
      const all: LiveChatMessage[] = JSON.parse(data);
      return all.filter(c => c.sessionId === sessionId || c.sessionId === 'default_session');
    } catch {
      return [];
    }
  }

  static async postChatMessage(entry: {
    sessionId: string;
    customerName: string;
    customerPhone?: string;
    sender: 'CUSTOMER' | 'PANDALEX_BOT' | 'CSKH';
    senderName: string;
    message: string;
    awbNumber?: string;
  }): Promise<{ message: LiveChatMessage; botReply?: LiveChatMessage }> {
    this.ensureFiles();
    let all: LiveChatMessage[] = [];
    try {
      all = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf-8'));
    } catch {
      all = [];
    }

    const newMsg: LiveChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: entry.sessionId,
      customerName: entry.customerName,
      customerPhone: entry.customerPhone,
      sender: entry.sender,
      senderName: entry.senderName,
      message: entry.message,
      awbNumber: entry.awbNumber,
      timestamp: new Date().toISOString()
    };
    all.push(newMsg);

    let botReply: LiveChatMessage | undefined;
    // Tự động trả lời nhanh thông minh nếu là khách hàng hỏi
    if (entry.sender === 'CUSTOMER') {
      const text = entry.message.toLowerCase();
      let botResponse = '';

      if (text.includes('lấy hàng') || text.includes('pick') || text.includes('tận nhà') || text.includes('tận nơi')) {
        botResponse = `Dạ PandaLex Express hỗ trợ lấy hàng miễn phí tận nơi tại Hà Nội, TP.HCM và Đà Nẵng. Quý khách vui lòng cung cấp địa chỉ cụ thể và số kiện để điều phối viên cho Shipper qua cân đo và lấy hàng ngay trong ngày ạ!`;
      } else {
        // Gọi Bộ não Trí Tuệ Thương Mại, Thuế & Pháp Chế Quốc Tế
        botResponse = await LogisticsTradeBrain.consult(entry.message, {
          customerName: entry.customerName,
          customerCode: entry.customerPhone
        });
      }

      botReply = {
        id: `chat_${Date.now() + 1}_bot`,
        sessionId: entry.sessionId,
        customerName: entry.customerName,
        sender: 'PANDALEX_BOT',
        senderName: 'Trí Tuệ Logistics PandaLex 24/7',
        message: botResponse,
        timestamp: new Date().toISOString()
      };
      all.push(botReply);
    }

    fs.writeFileSync(CHATS_FILE, JSON.stringify(all, null, 2), 'utf-8');
    return { message: newMsg, botReply };
  }
}
