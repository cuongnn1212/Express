import fs from 'fs';
import path from 'path';
import { Party } from '../shipment/shipment-service.js';

export interface AddressBookEntry extends Party {
  id: string;
  type: 'SHIPPER' | 'RECIPIENT';
  isDefault?: boolean;
  notes?: string;
}

export class AddressBookService {
  private static filePath = path.join(process.cwd(), 'data', 'address_book.json');
  private static entries: AddressBookEntry[] = [];

  static init() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.entries = JSON.parse(raw);
      } else {
        // Mẫu mặc định ban đầu
        this.entries = [
          {
            id: 'shp_cuong',
            type: 'SHIPPER',
            contactName: 'MR CUONG',
            companyName: 'PANDALEX EXPRESS HUB 1',
            phone: '0976843168',
            email: 'cuong@pandalex.vn',
            taxId: '036084005796',
            address1: 'PHUC YEN, PHAN HUY ICH, P15, TAN BINH',
            city: 'HO CHI MINH',
            postalCode: '700000',
            countryCode: 'VN',
            countryName: 'VIETNAM',
            isDefault: true
          },
          {
            id: 'rec_tammy',
            type: 'RECIPIENT',
            contactName: 'TAMMY NGUYEN',
            companyName: 'TAMMY BEAUTY STUDIO',
            phone: '774-810-5199',
            address1: '1219 MAIN ST',
            city: 'WORCESTER',
            state: 'MA',
            postalCode: '01603',
            countryCode: 'US',
            countryName: 'UNITED STATES',
            residential: true
          },
          {
            id: 'rec_michael',
            type: 'RECIPIENT',
            contactName: 'MICHAEL JOHNSON',
            companyName: 'BLUE OCEAN TRADING LLC',
            phone: '415-555-0199',
            address1: '450 MISSION ST',
            address2: 'STE 700',
            city: 'SAN FRANCISCO',
            state: 'CA',
            postalCode: '94105',
            countryCode: 'US',
            countryName: 'UNITED STATES',
            residential: false
          }
        ];
        this.persist();
      }
    } catch (e) {
      console.error('Lỗi nạp address_book.json:', e);
      this.entries = [];
    }
  }

  private static persist() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.entries, null, 2), 'utf-8');
    } catch (e) {
      console.error('Lỗi lưu trữ address_book.json:', e);
    }
  }

  static getAll(type?: 'SHIPPER' | 'RECIPIENT'): AddressBookEntry[] {
    if (!type) return this.entries;
    return this.entries.filter(e => e.type === type);
  }

  static getById(id: string): AddressBookEntry | undefined {
    return this.entries.find(e => e.id === id);
  }

  static save(entry: Partial<AddressBookEntry> & { contactName: string; type: 'SHIPPER' | 'RECIPIENT' }): AddressBookEntry {
    const id = entry.id || `addr_${Date.now()}`;
    const idx = this.entries.findIndex(e => e.id === id);
    const full: AddressBookEntry = {
      id,
      type: entry.type,
      contactName: entry.contactName,
      companyName: entry.companyName,
      phone: entry.phone || '',
      email: entry.email,
      taxId: entry.taxId,
      address1: entry.address1 || '',
      address2: entry.address2,
      address3: entry.address3,
      city: entry.city || '',
      state: entry.state,
      postalCode: entry.postalCode,
      countryCode: entry.countryCode || 'VN',
      countryName: entry.countryName,
      residential: Boolean(entry.residential),
      isDefault: Boolean(entry.isDefault),
      notes: entry.notes
    };

    if (idx >= 0) {
      this.entries[idx] = full;
    } else {
      this.entries.push(full);
    }
    this.persist();
    return full;
  }

  static delete(id: string): boolean {
    const initLen = this.entries.length;
    this.entries = this.entries.filter(e => e.id !== id);
    if (this.entries.length !== initLen) {
      this.persist();
      return true;
    }
    return false;
  }
}

AddressBookService.init();
