import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

print("Creating comprehensive pricing tool workbook...")

# 1. Load Data
wb_v = openpyxl.load_workbook('rates/UPS_VIETTEL_2026.xlsx', data_only=True)
ws_v = wb_v['EXPORT - Doc & Saver']
wb_f = openpyxl.load_workbook('rates/UPS_FRANK_CUSTOMER_2026.xlsx', data_only=True)
ws_f = wb_f['EXPORT - Doc & Saver']

viettel_rates = []
for r in range(13, 53):
    w = ws_v.cell(r, 1).value
    row_vals = [w]
    for c in range(2, 12):
        row_vals.append(ws_v.cell(r, c).value)
    viettel_rates.append(row_vals)

viettel_heavy = []
for r in range(53, 57):
    label = ws_v.cell(r, 1).value
    row_vals = [label]
    for c in range(2, 12):
        row_vals.append(ws_v.cell(r, c).value)
    viettel_heavy.append(row_vals)

frank_rates = []
cols_map = [2, 3, 5, 6, 7, 8, 9, 10, 11, 12]
for r in range(13, 53):
    w = ws_f.cell(r, 1).value
    row_vals = [w]
    for c in cols_map:
        row_vals.append(ws_f.cell(r, c).value)
    frank_rates.append(row_vals)

frank_heavy = []
for r in range(53, 57):
    label = ws_f.cell(r, 1).value
    row_vals = [label]
    for c in cols_map:
        row_vals.append(ws_f.cell(r, c).value)
    frank_heavy.append(row_vals)

# Countries & Zones
ws_z = wb_v['ZONE']
countries_raw = []
for r in range(5, ws_z.max_row+1):
    cname = ws_z.cell(r, 1).value
    iata = ws_z.cell(r, 2).value
    wxs = ws_z.cell(r, 3).value
    if cname and iata:
        countries_raw.append((str(iata).strip().upper(), str(cname).strip(), int(wxs) if wxs else 10))

anz_set = {'AU', 'NZ'}
apac_set = {
    'JP', 'KR', 'SG', 'TW', 'TH', 'MY', 'CN', 'HK', 'MO', 'ID', 'PH', 'IN',
    'BN', 'KH', 'LA', 'MM', 'MN', 'GU', 'AS', 'MP', 'WS', 'NC', 'VN'
}
europe_set = {
    'AL', 'AD', 'AM', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK',
    'EE', 'FI', 'FR', 'GE', 'DE', 'GI', 'GR', 'GG', 'HU', 'IS', 'IE', 'IL',
    'IT', 'JE', 'XK', 'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 'NL',
    'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SE',
    'CH', 'TR', 'UA', 'GB', 'UK', 'AX'
}
ismea_set = {
    'AF', 'DZ', 'AO', 'AZ', 'BH', 'BD', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV',
    'TD', 'KM', 'DJ', 'EG', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'IQ',
    'JO', 'KZ', 'KE', 'KW', 'KG', 'LB', 'LS', 'LR', 'MG', 'MW', 'MV', 'ML',
    'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NP', 'NE', 'NG', 'OM', 'PK', 'QA',
    'CG', 'CD', 'CI', 'TN', 'RE', 'RW', 'SA', 'LK', 'SN', 'SC', 'SL', 'ZA',
    'SZ', 'TZ', 'TG', 'TM', 'AE', 'UAE', 'UG', 'UZ', 'YE', 'ZM', 'ZW'
}
americas_set = {
    'US', 'USA', 'CA', 'MX', 'AR', 'AW', 'BS', 'BB', 'BZ', 'BM',
    'BO', 'BR', 'KY', 'CL', 'CO', 'CR', 'CW', 'DM', 'DO', 'EC', 'SV', 'GF',
    'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MS', 'NI', 'PA', 'PY',
    'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'SX', 'VC', 'SR', 'TT', 'TC', 'VI',
    'VG', 'UY', 'VE', 'AI', 'AG'
}

country_catalog = []
for iata, cname, zone in countries_raw:
    if iata in americas_set:
        region = "Hoa Kỳ & Châu Mỹ"
        surge_rate = 19975
        has_ipf = "CÓ" if iata == 'US' else "KHÔNG"
    elif iata in europe_set:
        region = "Châu Âu (Europe)"
        surge_rate = 14100
        has_ipf = "KHÔNG"
    elif iata in ismea_set:
        region = "ISMEA (Trung Đông & Châu Phi)"
        surge_rate = 14100
        has_ipf = "KHÔNG"
    elif iata in anz_set:
        region = "Úc & New Zealand"
        surge_rate = 1175
        has_ipf = "KHÔNG"
    elif iata in apac_set:
        region = "Châu Á Thái Bình Dương (APAC)"
        surge_rate = 1175
        has_ipf = "KHÔNG"
    else:
        region = "Phần còn lại của thế giới"
        surge_rate = 19975
        has_ipf = "KHÔNG"
    
    country_catalog.append({
        'iata': iata,
        'name': cname,
        'label': f"{iata} - {cname}",
        'zone': zone,
        'region': region,
        'surge_rate': surge_rate,
        'has_ipf': has_ipf
    })

popular = ['US', 'DE', 'AE', 'GB', 'FR', 'AU', 'CA', 'JP', 'KR', 'SG']
country_catalog.sort(key=lambda x: (0 if x['iata'] in popular else 1, x['iata']))

# 2. Build Workbook
wb = openpyxl.Workbook()
wb.remove(wb.active)

# Styles
font_title = Font(name="Arial", size=15, bold=True, color="1E3A8A")
font_sub = Font(name="Arial", size=9, italic=True, color="475569")
font_sec_hdr = Font(name="Arial", size=10, bold=True, color="FFFFFF")
font_bold = Font(name="Arial", size=10, bold=True, color="0F172A")
font_regular = Font(name="Arial", size=10, color="0F172A")
font_desc = Font(name="Arial", size=9, italic=True, color="64748B")

font_kpi_lbl = Font(name="Arial", size=8, bold=True)
font_kpi_num = Font(name="Arial", size=16, bold=True)
font_kpi_sub = Font(name="Arial", size=8, italic=True)

fill_navy = PatternFill("solid", fgColor="1E3A8A")
fill_emerald = PatternFill("solid", fgColor="059669")
fill_rose = PatternFill("solid", fgColor="E11D48")
fill_amber = PatternFill("solid", fgColor="D97706")
fill_slate = PatternFill("solid", fgColor="334155")
fill_subhdr = PatternFill("solid", fgColor="F1F5F9")

fill_kpi_green = PatternFill("solid", fgColor="ECFDF5")
fill_kpi_red = PatternFill("solid", fgColor="FFF1F2")
fill_kpi_gold = PatternFill("solid", fgColor="FFFBEB")

fill_input = PatternFill("solid", fgColor="EFF6FF")
fill_highlight = PatternFill("solid", fgColor="FEF9C3")
fill_zebra = PatternFill("solid", fgColor="F8FAFC")
fill_tot_row = PatternFill("solid", fgColor="E2E8F0")

thin_gray = Side(style='thin', color='CBD5E1')
med_navy = Side(style='medium', color='1E3A8A')
double_bottom = Side(style='double', color='0F172A')

border_cell = Border(left=thin_gray, right=thin_gray, top=thin_gray, bottom=thin_gray)
border_header = Border(left=thin_gray, right=thin_gray, top=med_navy, bottom=med_navy)
border_total = Border(top=thin_gray, bottom=double_bottom, left=thin_gray, right=thin_gray)

align_center = Alignment(horizontal="center", vertical="center")
align_left = Alignment(horizontal="left", vertical="center")
align_right = Alignment(horizontal="right", vertical="center")
align_wrap = Alignment(horizontal="left", vertical="center", wrap_text=True)

fmt_vnd = '#,##0" đ"'
fmt_kg = '0.0" kg"'
fmt_pct = '0.0%'
fmt_num = '#,##0'

# ==========================================
# SHEET 1: CAU_HINH (Settings)
# ==========================================
ws_cfg = wb.create_sheet(title="CAU_HINH")
ws_cfg.views.sheetView[0].showGridLines = True

ws_cfg['A1'] = "BẢNG CẤU HÌNH THAM SỐ TÍNH CƯỚC UPS VIETTEL POST (2026)"
ws_cfg['A1'].font = font_title
ws_cfg['A2'] = "Các tham số được liên kết tự động tới các bảng tính tra cước. Có thể điều chỉnh tỷ lệ xăng dầu hoặc phụ phí khi có thông báo mới."
ws_cfg['A2'].font = font_sub

headers_cfg = ["Tên Tham Số / Phụ Phí", "Giá Trị", "Đơn Vị", "Ghi Chú Áp Dụng"]
for col_idx, h in enumerate(headers_cfg, 1):
    c = ws_cfg.cell(4, col_idx, h)
    c.font = font_sec_hdr
    c.fill = fill_navy
    c.alignment = align_center
    c.border = border_header

cfg_rows = [
    ("Phụ phí xăng dầu FSC (UPS)", 0.525, "%", "Tỷ lệ FSC mặc định hiện tại (52.5%), tự động cập nhật vào các sheet", fmt_pct),
    ("Thuế VAT cước vận chuyển", 0.08, "%", "Thuế GTGT 8% áp dụng trên (Cước Net + Phụ Phí + FSC)", fmt_pct),
    ("Tỷ lệ giảm Phí Biến Động Khẩn Cấp", 0.50, "%", "Chính sách chiết khấu giảm 50% Phí Biến Động UPS của Viettel", fmt_pct),
    ("Phí Phát Hàng Tại Mỹ (IPF) - Thu Khách", 58750, "VNĐ/đơn", "Phí giao hàng nội địa Mỹ tiêu chuẩn áp dụng cho khách hàng", fmt_vnd),
    ("Phí Phát Hàng Tại Mỹ (IPF) - Viettel Cost", 35250, "VNĐ/đơn", "Chính sách Viettel giảm 40% (58.750 đ x 60% = 35.250 đ)", fmt_vnd),
    ("Phí An Ninh Sân Bay - Thu Khách", 150000, "VNĐ/đơn", "Phí an ninh hàng không áp dụng thu khách trên mỗi AWB", fmt_vnd),
    ("Phí An Ninh Sân Bay - Viettel Cost", 0, "VNĐ/đơn", "Viettel Post không thu phụ phí an ninh này", fmt_vnd)
]

for idx, (name, val, unit, note, num_fmt) in enumerate(cfg_rows, 5):
    ws_cfg.cell(idx, 1, name).font = font_bold
    ws_cfg.cell(idx, 1).border = border_cell
    c2 = ws_cfg.cell(idx, 2, val)
    c2.font = font_bold
    c2.number_format = num_fmt
    c2.alignment = align_right
    c2.border = border_cell
    c2.fill = fill_highlight
    ws_cfg.cell(idx, 3, unit).font = font_regular
    ws_cfg.cell(idx, 3).alignment = align_center
    ws_cfg.cell(idx, 3).border = border_cell
    ws_cfg.cell(idx, 4, note).font = font_desc
    ws_cfg.cell(idx, 4).border = border_cell

# Customs Rate Table
ws_cfg['A13'] = "BIỂU PHÍ DỊCH VỤ HẢI QUAN THEO LOẠI HÀNG HÓA (Áp dụng 1 loại hàng / AWB - Dưới 1kg tính 1kg)"
ws_cfg['A13'].font = font_bold

headers_customs = ["Loại Hàng Hóa", "Đơn Giá Viettel (VNĐ/kg)", "Đơn Giá Thu Khách (VNĐ/kg)", "Mô Tả & Ghi Chú"]
for col_idx, h in enumerate(headers_customs, 1):
    c = ws_cfg.cell(14, col_idx, h)
    c.font = font_sec_hdr
    c.fill = fill_slate
    c.alignment = align_center
    c.border = border_header

customs_rows = [
    ("Hàng Thông Thường (quần áo, giày dép, phụ kiện...)", 8000, 40000, "Trả Hải quan UPS 8.000 đ/kg | Thu khách 40.000 đ/kg"),
    ("Mỹ Phẩm / Thực Phẩm (kem, son, đồ ăn, gia vị...)", 32000, 40000, "Trả Hải quan UPS 32.000 đ/kg | Thu khách 40.000 đ/kg"),
    ("Hàng Có Pin / Thiết Bị Điện Tử", 32000, 40000, "Trả Hải quan UPS 32.000 đ/kg | Thu khách 40.000 đ/kg"),
    ("Hàng Thương Hiệu (Brand)", 35000, 40000, "Hàng có nhãn mác thương hiệu (Thu khách 40.000 đ/kg)"),
    ("Tài Liệu / Chứng Từ (Document)", 0, 0, "Chứng từ, giấy tờ không chịu phí hải quan")
]

for idx, (name, v_rate, c_rate, note) in enumerate(customs_rows, 15):
    ws_cfg.cell(idx, 1, name).font = font_regular
    ws_cfg.cell(idx, 1).border = border_cell
    c2 = ws_cfg.cell(idx, 2, v_rate)
    c2.font = font_bold
    c2.number_format = fmt_vnd
    c2.alignment = align_right
    c2.border = border_cell
    c3 = ws_cfg.cell(idx, 3, c_rate)
    c3.font = font_bold
    c3.number_format = fmt_vnd
    c3.alignment = align_right
    c3.border = border_cell
    ws_cfg.cell(idx, 4, note).font = font_desc
    ws_cfg.cell(idx, 4).border = border_cell

for col in ws_cfg.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = get_column_letter(col[0].column)
    ws_cfg.column_dimensions[col_letter].width = max(max_len + 4, 15)

# ==========================================
# SHEET 2: DANH_MUC_QUOC_GIA (Country Master)
# ==========================================
ws_dm = wb.create_sheet(title="DANH_MUC_QUOC_GIA")
ws_dm.views.sheetView[0].showGridLines = True

ws_dm['A1'] = "DANH MỤC QUỐC GIA, ZONE UPS SAVER & BIỂU PHÍ BIẾN ĐỘNG KHẨN CẤP"
ws_dm['A1'].font = font_title
ws_dm['A2'] = "Dữ liệu tra cứu chuẩn hóa cho 250 quốc gia/vùng lãnh thổ xuất khẩu từ Việt Nam."
ws_dm['A2'].font = font_sub

headers_dm = [
    "Mã IATA", "Tên Quốc Gia", "Tên Hiển Thị (Dropdown)", 
    "Zone UPS Saver", "Khu Vực Phí Biến Động", "Phí Biến Động (VNĐ/kg)", "Phí Phát Mỹ (IPF)"
]
for col_idx, h in enumerate(headers_dm, 1):
    c = ws_dm.cell(4, col_idx, h)
    c.font = font_sec_hdr
    c.fill = fill_navy
    c.alignment = align_center
    c.border = border_header

for idx, cdata in enumerate(country_catalog, 5):
    ws_dm.cell(idx, 1, cdata['iata']).alignment = align_center
    ws_dm.cell(idx, 2, cdata['name']).alignment = align_left
    ws_dm.cell(idx, 3, cdata['label']).alignment = align_left
    ws_dm.cell(idx, 4, cdata['zone']).alignment = align_center
    ws_dm.cell(idx, 5, cdata['region']).alignment = align_left
    c6 = ws_dm.cell(idx, 6, cdata['surge_rate'])
    c6.alignment = align_right
    c6.number_format = fmt_vnd
    ws_dm.cell(idx, 7, cdata['has_ipf']).alignment = align_center

    for c_i in range(1, 8):
        cell = ws_dm.cell(idx, c_i)
        cell.font = font_regular
        cell.border = border_cell
        if idx % 2 == 0:
            cell.fill = fill_zebra

for col in ws_dm.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = get_column_letter(col[0].column)
    ws_dm.column_dimensions[col_letter].width = max(max_len + 3, 12)

# ==========================================
# SHEET 3: GIA_VIETTEL (Viettel Cost Base Rates)
# ==========================================
ws_gv = wb.create_sheet(title="GIA_VIETTEL")
ws_gv.views.sheetView[0].showGridLines = True

ws_gv['A1'] = "BIỂU CƯỚC GỐC CHI TRẢ NHÀ CUNG CẤP VIETTEL POST (UPS SAVER EXPORT)"
ws_gv['A1'].font = font_title
ws_gv['A2'] = "Giá Net chưa bao gồm Phụ phí Xăng dầu, Phí biến động, Phí phát hàng tại Mỹ và VAT."
ws_gv['A2'].font = font_sub

headers_rate = ["Trọng Lượng (kg)"] + [f"Zone {z:02d}" for z in range(1, 11)]
for col_idx, h in enumerate(headers_rate, 1):
    c = ws_gv.cell(4, col_idx, h)
    c.font = font_sec_hdr
    c.fill = fill_rose
    c.alignment = align_center
    c.border = border_header

# 0.5 to 20kg (rows 5 to 44)
for idx, rdata in enumerate(viettel_rates, 5):
    c1 = ws_gv.cell(idx, 1, float(rdata[0]))
    c1.alignment = align_center
    c1.font = font_bold
    c1.border = border_cell
    c1.number_format = fmt_kg

    for z_idx, val in enumerate(rdata[1:], 2):
        c = ws_gv.cell(idx, z_idx, val)
        c.alignment = align_right
        c.font = font_regular
        c.number_format = fmt_vnd
        c.border = border_cell
        if idx % 2 == 0:
            c.fill = fill_zebra

# Heavy weights rows 45 to 48
for idx, rdata in enumerate(viettel_heavy, 45):
    c1 = ws_gv.cell(idx, 1, str(rdata[0]))
    c1.alignment = align_center
    c1.font = font_bold
    c1.border = border_cell

    for z_idx, val in enumerate(rdata[1:], 2):
        c = ws_gv.cell(idx, z_idx, val)
        c.alignment = align_right
        c.font = font_bold
        c.number_format = fmt_vnd
        c.border = border_cell
        c.fill = fill_tot_row

for col in ws_gv.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = get_column_letter(col[0].column)
    ws_gv.column_dimensions[col_letter].width = max(max_len + 3, 14)

# ==========================================
# SHEET 4: GIA_KHAC (Frank Customer Base Rates)
# ==========================================
ws_gk = wb.create_sheet(title="GIA_KHAC")
ws_gk.views.sheetView[0].showGridLines = True

ws_gk['A1'] = "BIỂU CƯỚC GỐC THU KHÁCH HÀNG (UPS SAVER EXPORT - FRANK)"
ws_gk['A1'].font = font_title
ws_gk['A2'] = "Giá Net bán ra chưa bao gồm Phụ phí Xăng dầu, Phí biến động, Phí phát hàng tại Mỹ và VAT."
ws_gk['A2'].font = font_sub

for col_idx, h in enumerate(headers_rate, 1):
    c = ws_gk.cell(4, col_idx, h)
    c.font = font_sec_hdr
    c.fill = fill_emerald
    c.alignment = align_center
    c.border = border_header

# 0.5 to 20kg (rows 5 to 44)
for idx, rdata in enumerate(frank_rates, 5):
    c1 = ws_gk.cell(idx, 1, float(rdata[0]))
    c1.alignment = align_center
    c1.font = font_bold
    c1.border = border_cell
    c1.number_format = fmt_kg

    for z_idx, val in enumerate(rdata[1:], 2):
        c = ws_gk.cell(idx, z_idx, val)
        c.alignment = align_right
        c.font = font_regular
        c.number_format = fmt_vnd
        c.border = border_cell
        if idx % 2 == 0:
            c.fill = fill_zebra

# Heavy weights rows 45 to 48
for idx, rdata in enumerate(frank_heavy, 45):
    c1 = ws_gk.cell(idx, 1, str(rdata[0]))
    c1.alignment = align_center
    c1.font = font_bold
    c1.border = border_cell

    for z_idx, val in enumerate(rdata[1:], 2):
        c = ws_gk.cell(idx, z_idx, val)
        c.alignment = align_right
        c.font = font_bold
        c.number_format = fmt_vnd
        c.border = border_cell
        c.fill = fill_tot_row

for col in ws_gk.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = get_column_letter(col[0].column)
    ws_gk.column_dimensions[col_letter].width = max(max_len + 3, 14)

# ==========================================
# SHEET 5: TRA_CUOC_NHANH (Quick Lookup Calculator)
# ==========================================
ws_q = wb.create_sheet(title="TRA_CUOC_NHANH")
ws_q.views.sheetView[0].showGridLines = True

# Title
ws_q['B1'] = "⚡ PANDALEX EXPRESS - CÔNG CỤ TRA CƯỚC NHANH UPS VIETTEL POST"
ws_q['B1'].font = font_title
ws_q['B2'] = "Đối soát song song: 1. Giá Bán Thu Khách | 2. Giá Vốn Trả Viettel & Hải Quan | 3. Lợi Nhuận Gộp (Tự động 2026)"
ws_q['B2'].font = font_sub

# --- 3 KPI CARDS (Rows 4-6) ---
# Card 1: Thu Khách
ws_q.merge_cells("B4:D4")
ws_q['B4'] = "🟢 1. TỔNG THU KHÁCH HÀNG (DOANH THU)"
ws_q['B4'].font = Font(name="Arial", size=9, bold=True, color="065F46")
ws_q['B4'].alignment = align_center
ws_q['B4'].fill = fill_kpi_green

ws_q.merge_cells("B5:D5")
ws_q['B5'] = "=C30"
ws_q['B5'].font = Font(name="Arial", size=18, bold=True, color="047857")
ws_q['B5'].alignment = align_center
ws_q['B5'].fill = fill_kpi_green
ws_q['B5'].number_format = fmt_vnd

ws_q.merge_cells("B6:D6")
ws_q['B6'] = "Đã gồm Cước hãng + Hải quan + An ninh"
ws_q['B6'].font = font_kpi_sub
ws_q['B6'].alignment = align_center
ws_q['B6'].fill = fill_kpi_green

# Card 2: Trả Viettel
ws_q.merge_cells("E4:G4")
ws_q['E4'] = "🔴 2. TỔNG TRẢ VIETTEL & HQ (CHI PHÍ VỐN)"
ws_q['E4'].font = Font(name="Arial", size=9, bold=True, color="9F1239")
ws_q['E4'].alignment = align_center
ws_q['E4'].fill = fill_kpi_red

ws_q.merge_cells("E5:G5")
ws_q['E5'] = "=D30"
ws_q['E5'].font = Font(name="Arial", size=18, bold=True, color="BE123C")
ws_q['E5'].alignment = align_center
ws_q['E5'].fill = fill_kpi_red
ws_q['E5'].number_format = fmt_vnd

ws_q.merge_cells("E6:G6")
ws_q['E6'] = "Đã gồm Cước Viettel + Giảm 40% phát Mỹ + HQ"
ws_q['E6'].font = font_kpi_sub
ws_q['E6'].alignment = align_center
ws_q['E6'].fill = fill_kpi_red

# Card 3: Lợi Nhuận
ws_q.merge_cells("H4:J4")
ws_q['H4'] = "🟡 3. LỢI NHUẬN GỘP DỰ KIẾN (CHÊNH LỆCH)"
ws_q['H4'].font = Font(name="Arial", size=9, bold=True, color="92400E")
ws_q['H4'].alignment = align_center
ws_q['H4'].fill = fill_kpi_gold

ws_q.merge_cells("H5:J5")
ws_q['H5'] = "=E30"
ws_q['H5'].font = Font(name="Arial", size=18, bold=True, color="B45309")
ws_q['H5'].alignment = align_center
ws_q['H5'].fill = fill_kpi_gold
ws_q['H5'].number_format = fmt_vnd

ws_q.merge_cells("H6:J6")
ws_q['H6'] = '="Tỷ suất lợi nhuận: " & TEXT(E32, "0.0%")'
ws_q['H6'].font = font_kpi_sub
ws_q['H6'].alignment = align_center
ws_q['H6'].fill = fill_kpi_gold

for r in range(4, 7):
    for c in range(2, 11):
        ws_q.cell(r, c).border = border_cell

# --- INPUT SECTION (Rows 8 to 17) ---
ws_q.merge_cells("B8:C8")
ws_q['B8'] = "THÔNG TIN ĐƠN HÀNG CẦN TRA CƯỚC"
ws_q['B8'].font = font_sec_hdr
ws_q['B8'].fill = fill_navy
ws_q['B8'].alignment = align_left

ws_q.merge_cells("D8:F8")
ws_q['D8'] = "KẾT QUẢ TỰ ĐỘNG NHẬN DIỆN TỪ HỆ THỐNG"
ws_q['D8'].font = font_sec_hdr
ws_q['D8'].fill = fill_slate
ws_q['D8'].alignment = align_left

inputs = [
    (9, "Quốc gia đến:", "US - United States", "Chọn từ danh mục dropdown hoặc gõ mã quốc gia (US, DE, AE...)"),
    (10, "Trọng lượng thực tế (kg):", 2.0, "Cân nặng thực tế cân được trên cân"),
    (11, "Kích thước Dài (cm):", 30, "Chiều dài thùng hàng"),
    (12, "Kích thước Rộng (cm):", 20, "Chiều rộng thùng hàng"),
    (13, "Kích thước Cao (cm):", 15, "Chiều cao thùng hàng"),
    (14, "Trọng lượng thể tích (kg):", '=(C11*C12*C13)/5000', "Công thức UPS: (Dài x Rộng x Cao) / 5000"),
    (15, "Trọng lượng tính cước (kg):", '=IF(MAX(C10,C14)<=20, ROUNDUP(MAX(C10,C14)*2, 0)/2, ROUNDUP(MAX(C10,C14), 0))', "Lấy MAX(Thực tế, Thể tích), làm tròn chuẩn nấc UPS"),
    (16, "Loại hàng hóa:", "Hàng Thông Thường (quần áo, giày dép, phụ kiện...)", "Chọn loại hàng để áp biểu phí hải quan chính xác"),
    (17, "Phụ phí xăng dầu FSC (%):", '=CAU_HINH!$B$5', "Mặc định 52.5% từ Sheet Cấu hình (có thể gõ sửa trực tiếp)"),
    (18, "Thuế VAT (%):", '=CAU_HINH!$B$6', "Mặc định 8.0% từ Sheet Cấu hình")
]

for row_i, label, def_val, note in inputs:
    ws_q.cell(row_i, 2, label).font = font_bold
    ws_q.cell(row_i, 2).alignment = align_left
    ws_q.cell(row_i, 2).border = border_cell

    c_val = ws_q.cell(row_i, 3, def_val)
    c_val.font = font_bold
    c_val.border = border_cell
    c_val.fill = fill_input
    c_val.alignment = align_left if isinstance(def_val, str) and not def_val.startswith('=') else align_right

    if row_i in [10, 14, 15]:
        c_val.number_format = fmt_kg
    elif row_i in [11, 12, 13]:
        c_val.number_format = '#,##0" cm"'
    elif row_i in [17, 18]:
        c_val.number_format = fmt_pct

    # Auto resolved details in cols D, E, F
    ws_q.merge_cells(start_row=row_i, start_column=4, end_row=row_i, end_column=6)
    cell_d = ws_q.cell(row_i, 4)
    cell_d.border = border_cell
    cell_d.alignment = align_left

# Populate Auto-resolved cells
ws_q['D9'] = '="Zone " & VLOOKUP(LEFT(C9, 2), DANH_MUC_QUOC_GIA!$A$5:$G$260, 4, FALSE) & " | Vùng: " & VLOOKUP(LEFT(C9, 2), DANH_MUC_QUOC_GIA!$A$5:$G$260, 5, FALSE)'
ws_q['D9'].font = font_bold

ws_q['D10'] = '="Trọng lượng thực tế: " & TEXT(C10, "0.0 kg")'
ws_q['D10'].font = font_desc

ws_q['D14'] = '="Thể tích quy đổi: " & TEXT(C14, "0.00 kg")'
ws_q['D14'].font = font_desc

ws_q['D15'] = '=IF(C15>C10, "👉 Áp dụng trọng lượng Thể tích quy đổi (lớn hơn)", "👉 Áp dụng trọng lượng Thực tế cân được")'
ws_q['D15'].font = font_bold

ws_q['D16'] = '="Hải quan UPS: Thu khách " & TEXT(VLOOKUP(C16, CAU_HINH!$A$15:$D$19, 3, FALSE), "#,##0 đ/kg") & " | Trả Viettel: " & TEXT(VLOOKUP(C16, CAU_HINH!$A$15:$D$19, 2, FALSE), "#,##0 đ/kg") & " (Dưới 1kg tính 1kg)"'
ws_q['D16'].font = font_bold

ws_q['D17'] = '="Cơ sở tính: Áp trên (Net + Phí Biến Động + Phí Phát Hàng)"'
ws_q['D17'].font = font_desc

ws_q['D18'] = '="Thuế VAT 8% tính trên Cước Vận Chuyển Hãng"'
ws_q['D18'].font = font_desc

# Helper hidden cells for clean formulas:
# Row 8: Col G: Zone, Col H: SurgeRate, Col I: HasIPF
ws_q['G8'] = '=VLOOKUP(LEFT(C9, 2), DANH_MUC_QUOC_GIA!$A$5:$G$260, 4, FALSE)'
ws_q['H8'] = '=VLOOKUP(LEFT(C9, 2), DANH_MUC_QUOC_GIA!$A$5:$G$260, 6, FALSE)'
ws_q['I8'] = '=VLOOKUP(LEFT(C9, 2), DANH_MUC_QUOC_GIA!$A$5:$G$260, 7, FALSE)'

# --- BREAKDOWN TABLE (Rows 20 to 32) ---
headers_comp = [
    ("HẠNG MỤC CƯỚC & PHỤ PHÍ", fill_navy, align_left),
    ("1. GIÁ BÁN KHÁCH HÀNG (VNĐ)", fill_emerald, align_right),
    ("2. GIÁ VỐN VIETTEL (VNĐ)", fill_rose, align_right),
    ("CHÊNH LỆCH / LÃI (VNĐ)", fill_amber, align_right),
    ("CÔNG THỨC & DIỄN GIẢI ĐỐI SOÁT", fill_slate, align_left)
]

for col_idx, (h_title, fill_h, h_align) in enumerate(headers_comp, 2):
    c = ws_q.cell(20, col_idx, h_title)
    c.font = font_sec_hdr
    c.fill = fill_h
    c.alignment = h_align
    c.border = border_header

comp_rows = [
    (21, "1. Cước Net (Base Rate)",
     '=IF(C15<=20, VLOOKUP(C15, GIA_KHAC!$A$5:$K$44, G8+1, FALSE), C15*IF(C15<=44, VLOOKUP("21-44", GIA_KHAC!$A$45:$K$48, G8+1, FALSE), IF(C15<=70, VLOOKUP("45-70", GIA_KHAC!$A$45:$K$48, G8+1, FALSE), IF(C15<=99, VLOOKUP("71-99", GIA_KHAC!$A$45:$K$48, G8+1, FALSE), VLOOKUP("100+", GIA_KHAC!$A$45:$K$48, G8+1, FALSE)))))',
     '=IF(C15<=20, VLOOKUP(C15, GIA_VIETTEL!$A$5:$K$44, G8+1, FALSE), C15*IF(C15<=44, VLOOKUP("21-44", GIA_VIETTEL!$A$45:$K$48, G8+1, FALSE), IF(C15<=70, VLOOKUP("45-70", GIA_VIETTEL!$A$45:$K$48, G8+1, FALSE), IF(C15<=99, VLOOKUP("71-99", GIA_VIETTEL!$A$45:$K$48, G8+1, FALSE), VLOOKUP("100+", GIA_VIETTEL!$A$45:$K$48, G8+1, FALSE)))))',
     '="Cước Express Saver Zone " & G8 & " nấc " & TEXT(C15, "0.0kg")'),
    (22, "2. Phí Biến Động Khẩn Cấp (Surge/Demand)",
     '=ROUND(C15 * H8, 0)',
     '=ROUND(C15 * H8, 0)',
     '="Đã giảm 50% (Mỹ 19.975 đ/kg, Đức/UAE 14.100 đ/kg, APAC 1.175 đ/kg)"'),
    (23, "3. Phí Phát Hàng Tại Mỹ (IPF)",
     '=IF(LEFT(C9, 2)="US", CAU_HINH!$B$8, 0)',
     '=IF(LEFT(C9, 2)="US", CAU_HINH!$B$9, 0)',
     '="Chỉ áp dụng cho Mỹ (Viettel giảm 40% còn 35.250đ / Khách thu 58.750đ)"'),
    (24, "4. Tổng chịu Phụ Phí Xăng Dầu (Subtotal)",
     '=C21+C22+C23',
     '=D21+D22+D23',
     '="= Cước Net + Phí Biến Động + Phí Phát Hàng Tại Mỹ"'),
    (25, "5. Phụ Phí Xăng Dầu FSC (52.5%)",
     '=ROUND(C24*C17, 0)',
     '=ROUND(D24*C17, 0)',
     '="Tỷ lệ FSC " & TEXT(C17, "0.0%") & " tính trên dòng 4"'),
    (26, "6. Thuế VAT (8%)",
     '=ROUND((C24+C25)*C18, 0)',
     '=ROUND((D24+D25)*C18, 0)',
     '="Thuế VAT " & TEXT(C18, "0%") & " tính trên (Dòng 4 + FSC)"'),
    (27, "⭐ CƯỚC HÃNG VẬN CHUYỂN (Sau VAT)",
     '=C24+C25+C26',
     '=D24+D25+D26',
     '="= Tổng cước vận chuyển hãng UPS / Viettel Post thu"'),
    (28, "7. Phí Dịch Vụ Hải Quan",
     '=ROUND(MAX(1, C15) * VLOOKUP(C16, CAU_HINH!$A$15:$D$19, 3, FALSE), 0)',
     '=ROUND(MAX(1, C15) * VLOOKUP(C16, CAU_HINH!$A$15:$D$19, 2, FALSE), 0)',
     '="Theo loại hàng (Dưới 1kg tính 1kg: " & TEXT(MAX(1, C15), "0.0") & "kg)"'),
    (29, "8. Phí An Ninh Sân Bay",
     '=CAU_HINH!$B$10',
     '=CAU_HINH!$B$11',
     '="Phí an ninh hàng không (Khách trả 150.000đ / Viettel 0đ)"'),
    (30, "🏆 TỔNG CỘNG THANH TOÁN",
     '=C27+C28+C29',
     '=D27+D28+D29',
     '="TỔNG THU KHÁCH HÀNG / TỔNG CHI TRẢ VIETTEL POST & HẢI QUAN"')
]

for row_i, title, formula_c, formula_d, desc in comp_rows:
    c_title = ws_q.cell(row_i, 2, title)
    c_c = ws_q.cell(row_i, 3, formula_c)
    c_d = ws_q.cell(row_i, 4, formula_d)
    c_diff = ws_q.cell(row_i, 5, f"=C{row_i}-D{row_i}")
    c_desc = ws_q.cell(row_i, 6, desc)

    is_star = "⭐" in title or "🏆" in title
    is_subtot = "Tổng" in title

    c_title.font = Font(name="Arial", size=10, bold=is_star or is_subtot)
    c_title.alignment = align_left
    c_title.border = border_total if "🏆" in title else border_cell

    for c in [c_c, c_d, c_diff]:
        c.font = Font(name="Arial", size=10, bold=is_star or is_subtot)
        c.alignment = align_right
        c.number_format = fmt_vnd
        c.border = border_total if "🏆" in title else border_cell

    c_desc.font = font_desc
    c_desc.border = border_total if "🏆" in title else border_cell

    if "⭐" in title:
        c_title.fill = PatternFill("solid", fgColor="E0F2FE")
        c_c.fill = PatternFill("solid", fgColor="E0F2FE")
        c_d.fill = PatternFill("solid", fgColor="E0F2FE")
        c_diff.fill = PatternFill("solid", fgColor="E0F2FE")
        c_desc.fill = PatternFill("solid", fgColor="E0F2FE")
    elif "🏆" in title:
        c_title.fill = fill_highlight
        c_c.fill = fill_kpi_green
        c_d.fill = fill_kpi_red
        c_diff.fill = fill_kpi_gold
        c_desc.fill = fill_highlight
    elif row_i % 2 == 0:
        c_title.fill = fill_zebra
        c_c.fill = fill_zebra
        c_d.fill = fill_zebra
        c_diff.fill = fill_zebra
        c_desc.fill = fill_zebra

# Margin row 32
ws_q.cell(32, 2, "📊 TỶ SUẤT LỢI NHUẬN GỘP (%)").font = font_bold
ws_q.cell(32, 2).border = border_cell
ws_q.cell(32, 3, 1.0).font = font_bold
ws_q.cell(32, 3).alignment = align_right
ws_q.cell(32, 3).number_format = fmt_pct
ws_q.cell(32, 3).border = border_cell
ws_q.cell(32, 4, "=IF(C30>0, D30/C30, 0)").font = font_bold
ws_q.cell(32, 4).alignment = align_right
ws_q.cell(32, 4).number_format = fmt_pct
ws_q.cell(32, 4).border = border_cell
ws_q.cell(32, 5, "=IF(C30>0, E30/C30, 0)").font = Font(name="Arial", size=11, bold=True, color="B45309")
ws_q.cell(32, 5).alignment = align_right
ws_q.cell(32, 5).number_format = fmt_pct
ws_q.cell(32, 5).border = border_cell
ws_q.cell(32, 5).fill = fill_kpi_gold
ws_q.cell(32, 6, "= Lợi Nhuận Gộp / Tổng Thu Khách Hàng").font = font_desc
ws_q.cell(32, 6).border = border_cell

# Column widths
ws_q.column_dimensions['A'].width = 3
ws_q.column_dimensions['B'].width = 34
ws_q.column_dimensions['C'].width = 24
ws_q.column_dimensions['D'].width = 24
ws_q.column_dimensions['E'].width = 24
ws_q.column_dimensions['F'].width = 46

# Data Validation for Quick Sheet
# Dropdown for Countries
dv_country = DataValidation(type="list", formula1="DANH_MUC_QUOC_GIA!$C$5:$C$254", allow_blank=False)
ws_q.add_data_validation(dv_country)
dv_country.add(ws_q["C9"])

# Dropdown for Cargo
dv_cargo = DataValidation(type="list", formula1="CAU_HINH!$A$15:$A$19", allow_blank=False)
ws_q.add_data_validation(dv_cargo)
dv_cargo.add(ws_q["C16"])

# ==========================================
# SHEET 6: TINH_NHIEU_DON (Batch Calculator)
# ==========================================
ws_b = wb.create_sheet(title="TINH_NHIEU_DON")
ws_b.views.sheetView[0].showGridLines = True

ws_b['A1'] = "📋 BẢNG TÍNH NHANH NHIỀU ĐƠN HÀNG (BATCH 20 AWB - UPS VIETTEL)"
ws_b['A1'].font = font_title
ws_b['A2'] = "Nhập AWB, Nước, Trọng lượng thực, Kích thước D-R-C, Loại hàng -> Công thức tự động tính đầy đủ Doanh thu, Chi phí, Lợi nhuận."
ws_b['A2'].font = font_sub

headers_batch_top = [
    ("THÔNG TIN LÔ HÀNG", 1, 11, fill_navy),
    ("1. THU KHÁCH HÀNG (VNĐ)", 12, 15, fill_emerald),
    ("2. TRẢ VIETTEL & HQ (VNĐ)", 16, 18, fill_rose),
    ("LỢI NHUẬN GỘP", 19, 20, fill_amber)
]

for title, start_c, end_c, f_color in headers_batch_top:
    ws_b.merge_cells(start_row=4, start_column=start_c, end_row=4, end_column=end_c)
    cell = ws_b.cell(4, start_c, title)
    cell.font = font_sec_hdr
    cell.fill = f_color
    cell.alignment = align_center
    for c_i in range(start_c, end_c + 1):
        ws_b.cell(4, c_i).border = border_header

headers_b_sub = [
    "STT", "Mã AWB", "Quốc Gia Đến", "Zone", "Cân Thực (kg)", 
    "Dài (cm)", "Rộng (cm)", "Cao (cm)", "Thể Tích (kg)", "Cân Tính (kg)", "Loại Hàng",
    "Cước Hãng", "Hải Quan", "An Ninh", "TỔNG THU",
    "Cước Viettel", "Hải Quan", "TỔNG TRẢ",
    "LÃI GỘP (VNĐ)", "TỶ SUẤT LN"
]

for col_idx, h in enumerate(headers_b_sub, 1):
    c = ws_b.cell(5, col_idx, h)
    c.font = font_sec_hdr
    c.fill = fill_slate
    c.alignment = align_center
    c.border = border_header

# 20 Sample / Template Rows
sample_batch_data = [
    (1, "1Z999999010001", "US - United States", 2.0, 30, 20, 15, "Hàng Thông Thường (quần áo, giày dép, phụ kiện...)"),
    (2, "1Z999999010002", "US - United States", 1.0, 25, 20, 10, "Hàng Thông Thường (quần áo, giày dép, phụ kiện...)"),
    (3, "1Z999999010003", "DE - Germany", 1.5, 30, 20, 15, "Hàng Thông Thường (quần áo, giày dép, phụ kiện...)"),
    (4, "1Z999999010004", "AE - United Arab Emirates", 2.0, 30, 25, 20, "Mỹ Phẩm / Thực Phẩm (kem, son, đồ ăn, gia vị...)"),
    (5, "1Z999999010005", "AU - Australia", 3.0, 35, 25, 20, "Mỹ Phẩm / Thực Phẩm (kem, son, đồ ăn, gia vị...)"),
    (6, "1Z999999010006", "CA - Canada", 4.5, 40, 30, 20, "Hàng Thông Thường (quần áo, giày dép, phụ kiện...)"),
    (7, "1Z999999010007", "GB - United Kingdom", 1.0, 25, 15, 10, "Hàng Thông Thường (quần áo, giày dép, phụ kiện...)"),
    (8, "1Z999999010008", "FR - France", 2.5, 30, 20, 20, "Mỹ Phẩm / Thực Phẩm (kem, son, đồ ăn, gia vị...)"),
    (9, "1Z999999010009", "JP - Japan", 0.5, 20, 15, 10, "Hàng Thông Thường (quần áo, giày dép, phụ kiện...)"),
    (10, "1Z999999010010", "KR - Korea, South", 5.0, 40, 30, 25, "Hàng Thông Thường (quần áo, giày dép, phụ kiện...)")
]

start_row = 6
for r_i in range(1, 21):
    curr_r = start_row + r_i - 1
    
    # Preset sample or empty
    if r_i <= len(sample_batch_data):
        s_idx, s_awb, s_country, s_w, s_l, s_w_dim, s_h, s_cargo = sample_batch_data[r_i - 1]
    else:
        s_idx = r_i
        s_awb = f"1Z9999990100{r_i:02d}"
        s_country = "US - United States"
        s_w = 0.0
        s_l = 0
        s_w_dim = 0
        s_h = 0
        s_cargo = "Hàng Thông Thường (quần áo, giày dép, phụ kiện...)"

    # Col A: STT
    ws_b.cell(curr_r, 1, s_idx).alignment = align_center
    # Col B: AWB
    ws_b.cell(curr_r, 2, s_awb).alignment = align_center
    # Col C: Country
    c3 = ws_b.cell(curr_r, 3, s_country)
    c3.alignment = align_left
    c3.fill = fill_input
    # Col D: Zone
    ws_b.cell(curr_r, 4, f'=VLOOKUP(LEFT(C{curr_r}, 2), DANH_MUC_QUOC_GIA!$A$5:$G$260, 4, FALSE)').alignment = align_center
    # Col E: Weight
    c5 = ws_b.cell(curr_r, 5, s_w)
    c5.alignment = align_right
    c5.number_format = fmt_kg
    c5.fill = fill_input
    # Col F, G, H: D, R, C
    for col_k, val_k in [(6, s_l), (7, s_w_dim), (8, s_h)]:
        c_k = ws_b.cell(curr_r, col_k, val_k)
        c_k.alignment = align_right
        c_k.number_format = fmt_num
        c_k.fill = fill_input
    # Col I: Dim Weight
    c9 = ws_b.cell(curr_r, 9, f'=IF(F{curr_r}*G{curr_r}*H{curr_r}>0, (F{curr_r}*G{curr_r}*H{curr_r})/5000, 0)')
    c9.alignment = align_right
    c9.number_format = fmt_kg
    # Col J: Chargeable Weight
    c10 = ws_b.cell(curr_r, 10, f'=IF(E{curr_r}>0, IF(MAX(E{curr_r}, I{curr_r})<=20, ROUNDUP(MAX(E{curr_r}, I{curr_r})*2, 0)/2, ROUNDUP(MAX(E{curr_r}, I{curr_r}), 0)), 0)')
    c10.alignment = align_right
    c10.number_format = fmt_kg
    c10.font = font_bold
    # Col K: Cargo
    c11 = ws_b.cell(curr_r, 11, s_cargo)
    c11.alignment = align_left
    c11.fill = fill_input

    # Helper surge and ipf references
    f_surge_rate = f'VLOOKUP(LEFT(C{curr_r}, 2), DANH_MUC_QUOC_GIA!$A$5:$G$260, 6, FALSE)'
    f_is_us = f'LEFT(C{curr_r}, 2)="US"'

    # Col L: Customer Freight
    # Base rate + Surge + IPF + FSC + VAT
    f_net_c = f'IF(J{curr_r}<=20, VLOOKUP(J{curr_r}, GIA_KHAC!$A$5:$K$44, D{curr_r}+1, FALSE), J{curr_r}*IF(J{curr_r}<=44, VLOOKUP("21-44", GIA_KHAC!$A$45:$K$48, D{curr_r}+1, FALSE), IF(J{curr_r}<=70, VLOOKUP("45-70", GIA_KHAC!$A$45:$K$48, D{curr_r}+1, FALSE), IF(J{curr_r}<=99, VLOOKUP("71-99", GIA_KHAC!$A$45:$K$48, D{curr_r}+1, FALSE), VLOOKUP("100+", GIA_KHAC!$A$45:$K$48, D{curr_r}+1, FALSE)))))'
    f_sub_c = f'({f_net_c} + J{curr_r}*{f_surge_rate} + IF({f_is_us}, CAU_HINH!$B$8, 0))'
    f_total_freight_c = f'IF(J{curr_r}>0, ROUND({f_sub_c} * (1 + CAU_HINH!$B$5) * (1 + CAU_HINH!$B$6), 0), 0)'
    
    cL = ws_b.cell(curr_r, 12, f'={f_total_freight_c}')
    cL.alignment = align_right
    cL.number_format = fmt_vnd

    # Col M: Customer Customs
    cM = ws_b.cell(curr_r, 13, f'=IF(J{curr_r}>0, ROUND(MAX(1, J{curr_r}) * VLOOKUP(K{curr_r}, CAU_HINH!$A$15:$D$19, 3, FALSE), 0), 0)')
    cM.alignment = align_right
    cM.number_format = fmt_vnd

    # Col N: Customer Security (150k)
    cN = ws_b.cell(curr_r, 14, f'=IF(J{curr_r}>0, CAU_HINH!$B$10, 0)')
    cN.alignment = align_right
    cN.number_format = fmt_vnd

    # Col O: CUSTOMER TOTAL SELL
    cO = ws_b.cell(curr_r, 15, f'=L{curr_r}+M{curr_r}+N{curr_r}')
    cO.alignment = align_right
    cO.number_format = fmt_vnd
    cO.font = Font(name="Arial", size=10, bold=True, color="047857")
    cO.fill = fill_kpi_green

    # Col P: Viettel Freight
    f_net_v = f'IF(J{curr_r}<=20, VLOOKUP(J{curr_r}, GIA_VIETTEL!$A$5:$K$44, D{curr_r}+1, FALSE), J{curr_r}*IF(J{curr_r}<=44, VLOOKUP("21-44", GIA_VIETTEL!$A$45:$K$48, D{curr_r}+1, FALSE), IF(J{curr_r}<=70, VLOOKUP("45-70", GIA_VIETTEL!$A$45:$K$48, D{curr_r}+1, FALSE), IF(J{curr_r}<=99, VLOOKUP("71-99", GIA_VIETTEL!$A$45:$K$48, D{curr_r}+1, FALSE), VLOOKUP("100+", GIA_VIETTEL!$A$45:$K$48, D{curr_r}+1, FALSE)))))'
    f_sub_v = f'({f_net_v} + J{curr_r}*{f_surge_rate} + IF({f_is_us}, CAU_HINH!$B$9, 0))'
    f_total_freight_v = f'IF(J{curr_r}>0, ROUND({f_sub_v} * (1 + CAU_HINH!$B$5) * (1 + CAU_HINH!$B$6), 0), 0)'
    
    cP = ws_b.cell(curr_r, 16, f'={f_total_freight_v}')
    cP.alignment = align_right
    cP.number_format = fmt_vnd

    # Col Q: Viettel Customs
    cQ = ws_b.cell(curr_r, 17, f'=IF(J{curr_r}>0, ROUND(MAX(1, J{curr_r}) * VLOOKUP(K{curr_r}, CAU_HINH!$A$15:$D$19, 2, FALSE), 0), 0)')
    cQ.alignment = align_right
    cQ.number_format = fmt_vnd

    # Col R: VIETTEL TOTAL COST
    cR = ws_b.cell(curr_r, 18, f'=P{curr_r}+Q{curr_r}')
    cR.alignment = align_right
    cR.number_format = fmt_vnd
    cR.font = Font(name="Arial", size=10, bold=True, color="BE123C")
    cR.fill = fill_kpi_red

    # Col S: PROFIT
    cS = ws_b.cell(curr_r, 19, f'=O{curr_r}-R{curr_r}')
    cS.alignment = align_right
    cS.number_format = fmt_vnd
    cS.font = Font(name="Arial", size=10, bold=True, color="B45309")
    cS.fill = fill_kpi_gold

    # Col T: MARGIN %
    cT = ws_b.cell(curr_r, 20, f'=IF(O{curr_r}>0, S{curr_r}/O{curr_r}, 0)')
    cT.alignment = align_right
    cT.number_format = fmt_pct
    cT.font = font_bold

    for col_c in range(1, 21):
        cell = ws_b.cell(curr_r, col_c)
        cell.border = border_cell
        if not cell.font.bold:
            cell.font = font_regular
        if curr_r % 2 == 0 and col_c not in [15, 18, 19]:
            cell.fill = fill_zebra

# Footer Summary Row (Row 26)
tot_r = start_row + 20
ws_b.merge_cells(start_row=tot_r, start_column=1, end_row=tot_r, end_column=9)
ws_b.cell(tot_r, 1, "TỔNG CỘNG TOÀN BỘ ĐƠN HÀNG (SUMMARY)").alignment = align_center
ws_b.cell(tot_r, 1).font = font_bold
ws_b.cell(tot_r, 1).fill = fill_tot_row

# Sum Weight
ws_b.cell(tot_r, 10, f'=SUM(J6:J{tot_r-1})').number_format = fmt_kg
ws_b.cell(tot_r, 10).font = font_bold
ws_b.cell(tot_r, 10).alignment = align_right
ws_b.cell(tot_r, 10).fill = fill_tot_row

ws_b.cell(tot_r, 11, "").fill = fill_tot_row

# Sum Customer
ws_b.cell(tot_r, 12, f'=SUM(L6:L{tot_r-1})').number_format = fmt_vnd
ws_b.cell(tot_r, 13, f'=SUM(M6:M{tot_r-1})').number_format = fmt_vnd
ws_b.cell(tot_r, 14, f'=SUM(N6:N{tot_r-1})').number_format = fmt_vnd
cO_tot = ws_b.cell(tot_r, 15, f'=SUM(O6:O{tot_r-1})')
cO_tot.number_format = fmt_vnd
cO_tot.font = Font(name="Arial", size=11, bold=True, color="047857")
cO_tot.fill = fill_kpi_green

# Sum Viettel
ws_b.cell(tot_r, 16, f'=SUM(P6:P{tot_r-1})').number_format = fmt_vnd
ws_b.cell(tot_r, 17, f'=SUM(Q6:Q{tot_r-1})').number_format = fmt_vnd
cR_tot = ws_b.cell(tot_r, 18, f'=SUM(R6:R{tot_r-1})')
cR_tot.number_format = fmt_vnd
cR_tot.font = Font(name="Arial", size=11, bold=True, color="BE123C")
cR_tot.fill = fill_kpi_red

# Sum Profit & Margin
cS_tot = ws_b.cell(tot_r, 19, f'=SUM(S6:S{tot_r-1})')
cS_tot.number_format = fmt_vnd
cS_tot.font = Font(name="Arial", size=11, bold=True, color="B45309")
cS_tot.fill = fill_kpi_gold

cT_tot = ws_b.cell(tot_r, 20, f'=IF(O{tot_r}>0, S{tot_r}/O{tot_r}, 0)')
cT_tot.number_format = fmt_pct
cT_tot.font = font_bold
cT_tot.fill = fill_tot_row

for c_i in range(1, 21):
    c = ws_b.cell(tot_r, c_i)
    c.border = border_total
    if not c.font.bold:
        c.font = font_bold
    if c_i in range(12, 15) or c_i in range(16, 18):
        c.fill = fill_tot_row
        c.alignment = align_right

# Data validation for batch
dv_b_country = DataValidation(type="list", formula1="DANH_MUC_QUOC_GIA!$C$5:$C$254", allow_blank=False)
ws_b.add_data_validation(dv_b_country)
dv_b_country.add(f"C6:C{tot_r-1}")

dv_b_cargo = DataValidation(type="list", formula1="CAU_HINH!$A$15:$A$19", allow_blank=False)
ws_b.add_data_validation(dv_b_cargo)
dv_b_cargo.add(f"K6:K{tot_r-1}")

# Widths for batch
ws_b.column_dimensions['A'].width = 6
ws_b.column_dimensions['B'].width = 18
ws_b.column_dimensions['C'].width = 24
ws_b.column_dimensions['D'].width = 7
ws_b.column_dimensions['E'].width = 13
ws_b.column_dimensions['F'].width = 10
ws_b.column_dimensions['G'].width = 10
ws_b.column_dimensions['H'].width = 10
ws_b.column_dimensions['I'].width = 13
ws_b.column_dimensions['J'].width = 13
ws_b.column_dimensions['K'].width = 28
ws_b.column_dimensions['L'].width = 16
ws_b.column_dimensions['M'].width = 13
ws_b.column_dimensions['N'].width = 12
ws_b.column_dimensions['O'].width = 18
ws_b.column_dimensions['P'].width = 16
ws_b.column_dimensions['Q'].width = 13
ws_b.column_dimensions['R'].width = 18
ws_b.column_dimensions['S'].width = 18
ws_b.column_dimensions['T'].width = 14

# Order of sheets:
# 1. TRA_CUOC_NHANH
# 2. TINH_NHIEU_DON
# 3. DANH_MUC_QUOC_GIA
# 4. GIA_VIETTEL
# 5. GIA_KHAC
# 6. CAU_HINH
sheet_order = ["TRA_CUOC_NHANH", "TINH_NHIEU_DON", "DANH_MUC_QUOC_GIA", "GIA_VIETTEL", "GIA_KHAC", "CAU_HINH"]
wb._sheets = [wb[s] for s in sheet_order]

# Save file in root directory & in public directory for web download
out_root = 'PANDALEX_TRA_CUOC_UPS_VIETTEL_NHANH.xlsx'
out_public = 'public/PANDALEX_TRA_CUOC_UPS_VIETTEL_NHANH.xlsx'

wb.save(out_root)
wb.save(out_public)

print(f"✅ File created successfully:\n- {out_root}\n- {out_public}")
