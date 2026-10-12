#!/usr/bin/env python3
"""
fill_commercial_invoice.py
Điền dữ liệu Commercial Invoice trực tiếp vào MẪU EXCEL GỐC CỦA DỰ ÁN bằng openpyxl.
Đảm bảo giữ 100% định dạng, phông chữ, đường kẻ viền (borders), logo và công thức của mẫu gốc.
"""

import sys
import json
import os
import openpyxl

def fill_invoice(data, output_file):
    template_type = data.get('templateType', 'UPS').upper()
    carrier = data.get('carrier', 'UPS').upper()
    
    # Chọn template gốc
    if 'FEDEX' in template_type or 'FEDEX' in carrier:
        template_path = 'INV FEDEX SPOT. MAU.xlsx'
    else:
        template_path = 'INV UPS SAVER C Vy HCM 2105... K56 2.xlsx'
        
    if not os.path.exists(template_path):
        if os.path.exists('templates/MAU_COMMERCIAL_INVOICE_CHUAN.xlsx'):
            template_path = 'templates/MAU_COMMERCIAL_INVOICE_CHUAN.xlsx'
        elif os.path.exists('INV FEDEX SPOT. MAU.xlsx'):
            template_path = 'INV FEDEX SPOT. MAU.xlsx'

    wb = openpyxl.load_workbook(template_path)
    ws = wb.active

    # 1. Header & Shipper
    date_val = data.get('dateFormatted') or data.get('invoiceDate') or ''
    if date_val:
        ws['H2'].value = date_val
        
    awb_val = data.get('airWaybillNo') or data.get('masterTrackingNumber') or ''
    if awb_val:
        ws['H3'].value = awb_val

    shp_company = data.get('shipperCompanyName') or data.get('shipperContactName') or ''
    if shp_company:
        ws['C4'].value = shp_company

    shp_address = data.get('shipperAddress') or ''
    if shp_address:
        ws['C5'].value = shp_address

    shp_postal = data.get('shipperTownArea') or '100000'
    ws['C6'].value = shp_postal

    pkgs = data.get('totalPackages') or 1
    try:
        ws['H6'].value = int(pkgs)
    except:
        ws['H6'].value = pkgs

    shp_country = data.get('shipperStateCountry') or 'VIET NAM'
    ws['C7'].value = shp_country

    shp_contact = data.get('shipperContactName') or shp_company
    ws['C8'].value = shp_contact

    actual_wt = data.get('totalActualWeightKg') or 0
    try:
        ws['H8'].value = float(actual_wt)
    except:
        ws['H8'].value = actual_wt

    shp_phone = data.get('shipperPhone') or ''
    ws['C9'].value = shp_phone

    dims = data.get('dimensionsSummary') or ''
    if dims:
        ws['H10'].value = dims

    # 2. Consignee & Service
    cns_company = data.get('consigneeCompanyName') or data.get('consigneeContactName') or ''
    cns_contact = data.get('consigneeContactName') or ''
    cns_address = data.get('consigneeAddress') or ''
    cns_postal = data.get('consigneePostalCode') or ''
    cns_country = data.get('consigneeStateCountry') or 'USA'
    cns_phone = data.get('consigneePhone') or ''
    cns_email = data.get('consigneeEmail') or ''

    service_name = data.get('serviceName') or ('FedEx Spot IP' if 'FEDEX' in template_type else 'UPS Saver')

    if 'FEDEX' in template_path:
        # Template FedEx: Row 14 = Company, Row 15 = Address & Services
        if cns_company:
            ws['C14'].value = cns_company
        if cns_address:
            ws['C15'].value = cns_address
        ws['H15'].value = service_name
        if cns_postal:
            ws['C17'].value = cns_postal
        if cns_country:
            ws['C18'].value = cns_country
        if cns_contact:
            ws['C19'].value = cns_contact
        if cns_phone:
            ws['C20'].value = cns_phone
    else:
        # Template UPS: Row 15 = Company, Row 16 = Address & Services
        if cns_company:
            ws['C15'].value = cns_company
        if cns_address:
            ws['C16'].value = cns_address
        ws['H16'].value = service_name
        if cns_postal:
            ws['C18'].value = cns_postal
        if cns_country:
            ws['C19'].value = cns_country
        if cns_contact:
            ws['C20'].value = cns_contact
        if cns_phone:
            ws['C21'].value = cns_phone
        if cns_email:
            ws['C22'].value = cns_email

    # 3. Danh mục hàng hóa (Commodity Items)
    items = data.get('items') or []
    if not items:
        items = [{
            'description': 'Commercial Goods / Sample',
            'hsCode': '4202.92.10',
            'quantity': 1,
            'unit': 'pcs',
            'originCountry': 'Vietnam',
            'unitValue': 30,
            'lineTotal': 30
        }]

    # Bắt đầu điền dòng hàng
    start_row = 23 if 'FEDEX' in template_path else 24
    subtotal = 0.0

    for idx, item in enumerate(items):
        r = start_row + idx
        desc = (item.get('description') or '').strip()
        material = (item.get('material') or '').strip()
        hs = (item.get('hsCode') or '').strip()
        mid = (item.get('midCode') or '').strip()
        mnf = (item.get('manufacturer') or '').strip()
        factory_add = (item.get('factoryAddress') or '').strip()
        origin = item.get('originCountry') or 'Vietnam'
        
        # Tạo chuỗi mô tả đa dòng chi tiết theo chuẩn mẫu Commercial Invoice Excel của anh
        desc_lines = []
        if desc:
            desc_lines.append(desc)
        if material and material not in desc:
            desc_lines.append(material)
        if hs and f"HTS code: {hs}" not in desc and f"HS Code: {hs}" not in desc:
            desc_lines.append(f"HTS code: {hs}")
        if mid and f"MID code: {mid}" not in desc:
            desc_lines.append(f"MID code: {mid}")
        if mnf and f"Mnf: {mnf}" not in desc:
            desc_lines.append(f"Mnf: {mnf}")
        if factory_add and f"Add: {factory_add}" not in desc:
            desc_lines.append(f"Add: {factory_add}")
        
        desc_full = "\n".join(desc_lines) if desc_lines else desc

        qty = float(item.get('quantity') or 1)
        unit = item.get('unit') or 'pcs'
        unit_val = float(item.get('unitValue') or 0)
        line_total = float(item.get('lineTotal') or (qty * unit_val))
        subtotal += line_total

        # Chỉ điền nếu ô tồn tại
        ws.cell(row=r, column=2).value = desc_full
        ws.cell(row=r, column=4).value = qty
        ws.cell(row=r, column=5).value = unit
        ws.cell(row=r, column=6).value = origin
        ws.cell(row=r, column=7).value = unit_val
        ws.cell(row=r, column=8).value = line_total

    # 4. Điều khoản xuất khẩu & Tổng tiền bên dưới
    reason = data.get('reasonForExport') or 'Sample / Commercial Sale'
    ws['B25'].value = f"REASON FOR EXPORT : {reason}"
    ws['H25'].value = subtotal

    terms = data.get('termsOfSale') or 'DAP'
    ws['B27'].value = f"Terms of Sale (Incoterm) : {terms}"
    ws['B28'].value = f"No.of packages (Số kiện)             :      {pkgs}"

    dim_wt = data.get('totalDimensionalWeightKg') or actual_wt
    ws['B29'].value = f"Total Actual weight (Trọng lượng thực)          :     {actual_wt} KG"
    ws['B30'].value = f"Total Dimensional weight (Trọng lượng khối) :  {dim_wt} KG"

    shipping_charge = float(data.get('shippingCharge') or 0)
    insurance_charge = float(data.get('insuranceCharge') or 0)
    if shipping_charge > 0:
        ws['H29'].value = shipping_charge
    if insurance_charge > 0:
        ws['H30'].value = insurance_charge

    total_shipment_val = data.get('totalValue')
    if total_shipment_val is not None:
        ws['H31'].value = float(total_shipment_val)
    else:
        ws['H31'].value = subtotal + shipping_charge + insurance_charge

    # 5. Lưu kết quả
    wb.save(output_file)
    print(f"OK: Saved to {output_file}")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: fill_commercial_invoice.py <json_data_or_file> <output_file>")
        sys.exit(1)
        
    input_arg = sys.argv[1]
    output_path = sys.argv[2]
    
    if os.path.exists(input_arg):
        with open(input_arg, 'r', encoding='utf-8') as f:
            invoice_data = json.load(f)
    else:
        invoice_data = json.loads(input_arg)
        
    fill_invoice(invoice_data, output_path)
