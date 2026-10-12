import { CustomerPolicy } from '../../types/pricing.types.js';
import { CustomerService, Customer } from './customer-service.js';

export class CustomerPolicyService {
  /**
   * Đồng bộ chính sách tính giá từ CustomerService
   */
  static getAll(): CustomerPolicy[] {
    const customers = CustomerService.getAll();
    return customers.map(c => this.toPolicy(c));
  }

  static getById(idOrCode: string): CustomerPolicy {
    const cust = CustomerService.getById(idOrCode) || CustomerService.getByCode(idOrCode);
    if (cust) {
      return this.toPolicy(cust);
    }
    return this.getDefaultGuestPolicy();
  }

  static getDefaultGuestPolicy(): CustomerPolicy {
    const guest = CustomerService.getById('cust_guest') || CustomerService.getByCode('PDL-GUEST');
    if (guest) return this.toPolicy(guest);
    return {
      id: 'guest',
      customerCode: 'PDL-GUEST',
      name: 'Khách vãng lai check giá (Public Guest)',
      customerType: 'PUBLIC_GUEST',
      paymentTerm: 'PREPAID',
      marginType: 'PERCENT',
      marginPercent: 20.0,
      marginFixedAmount: 0,
      note: 'Chính sách công khai áp dụng cho khách vãng lai check giá trực tiếp.'
    };
  }

  static save(policy: CustomerPolicy): void {
    CustomerService.saveCustomer({
      id: policy.id,
      customerCode: policy.customerCode,
      customerName: policy.name,
      phone: policy.phone,
      email: policy.email,
      address: policy.address,
      customerType: policy.customerType,
      paymentTerm: policy.paymentTerm,
      creditLimit: policy.creditLimit,
      creditDays: policy.creditDays,
      marginType: policy.marginType,
      marginPercent: policy.marginPercent,
      marginFixedAmount: policy.marginFixedAmount,
      notes: policy.note
    });
  }

  static delete(id: string): boolean {
    return CustomerService.deleteCustomer(id);
  }

  private static toPolicy(c: Customer): CustomerPolicy {
    return {
      id: c.id,
      customerCode: c.customerCode,
      name: c.customerName,
      phone: c.phone,
      email: c.email,
      address: c.address,
      customerType: c.customerType,
      paymentTerm: c.paymentTerm,
      creditLimit: c.creditLimit,
      creditDays: c.creditDays,
      marginType: c.marginType,
      marginPercent: c.marginPercent,
      marginFixedAmount: c.marginFixedAmount,
      note: c.notes
    };
  }
}
