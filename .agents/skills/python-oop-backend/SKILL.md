---
name: python-oop-backend
description: >-
  Use this skill when building or modifying the Python Flask backend for the
  Atino store management system. Enforces clean Object-Oriented Programming (OOP)
  across models, DAOs, services, and Flask routes using simple, beginner-friendly
  algorithms and mysql-connector-python without complex ORMs.
---

# Python OOP Backend Skill (Flask + MySQL)

Sử dụng skill này khi lập trình toàn bộ phần Backend tại thư mục `backend/`.

## 1. Framework & Thư viện khuyên dùng (Dễ học, dễ vấn đáp)

- **Web Framework:** `Flask` (phục vụ luôn thư mục tĩnh `dist/` trên cùng cổng để tránh lỗi CORS).
- **Database Driver:** `mysql-connector-python` (viết SQL thuần có tham số `%s`, KHÔNG dùng SQLAlchemy/ORM để code rõ ràng từng câu truy vấn khi giảng viên hỏi).
- **Session / Auth:** Dùng `flask.session` (cookie ký số) kèm mật khẩu băm `hashlib.sha256` có salt hoặc `werkzeug.security`.
- **Biến môi trường:** `python-dotenv` đọc file `.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SECRET_KEY`).

## 2. Cấu trúc thư mục Backend chuẩn OOP

```text
backend/
├── app.py                     # Khởi tạo Flask app, đăng ký Blueprints, phục vụ dist/
├── config.py                  # Class Config đọc cấu hình DB và Secret Key
├── requirements.txt           # flask, mysql-connector-python, python-dotenv
├── .env.example               # Mẫu cấu hình kết nối MySQL
├── database/
│   ├── connection.py          # Class DatabaseManager quản lý kết nối MySQL & transaction
│   ├── schema.sql             # Script tạo 14 bảng (12 chính + 2 hệ thống) theo docs/ERD-ATINO.md
│   └── seed.sql               # Dữ liệu mẫu ban đầu
├── models/                    # Tầng Đối tượng (Entities)
│   ├── base_model.py          # Class BaseModel (to_dict, validate cơ bản)
│   ├── staff.py               # Class Staff, Shift
│   ├── product.py             # Class Product (gộp tem nhãn & đánh giá tồn), ProductSize
│   ├── partner.py             # Class Customer, Supplier (NCC001)
│   ├── transaction.py         # Class StockDocument, SaleInvoice, ExchangeTicket
│   └── system.py              # Class StoreSettings, AuditLog
├── dao/                       # Tầng Truy xuất Dữ liệu (Data Access Objects)
│   ├── base_dao.py            # Class BaseDAO (kế thừa cho DAO con: fetch_one, fetch_all, execute)
│   ├── staff_dao.py           # Bảng staff & shifts
│   ├── product_dao.py         # Bảng products & product_sizes (1 cột stock_qty duy nhất)
│   ├── customer_dao.py        # Bảng customers
│   ├── supplier_dao.py        # Bảng suppliers (chỉ NCC001)
│   ├── stock_dao.py           # Bảng stock_documents & stock_document_items
│   ├── sale_dao.py            # Bảng sales_invoices & sales_invoice_items
│   ├── exchange_dao.py        # Bảng exchanges & exchange_items
│   └── system_dao.py          # Bảng store_settings & audit_logs
├── services/                  # Tầng Nghiệp vụ (Business Logic)
│   ├── auth_service.py        # Đăng nhập, hồ sơ cá nhân, avatar, đổi MK, mã khôi phục
│   ├── inventory_service.py   # Quản lý SP, tem nhãn, đánh giá tồn, nhập/xuất kho, cảnh báo
│   ├── sale_service.py        # Báo giá đơn, tách người bán/thu ngân, thanh toán, lưu hóa đơn
│   ├── exchange_service.py    # Kiểm tra hạn 30 ngày, từ chối hàng lỗi, tính chênh lệch, lưu phiếu đổi
│   ├── crm_service.py         # Quản lý khách hàng & tính hạng thành viên (Đồng/Bạc/Vàng/KC)
│   ├── hrm_service.py         # Quản lý nhân viên, phân ca (chặn trùng giờ), dự toán lương
│   ├── report_service.py      # Doanh thu ngày/tháng/năm, tiền mặt/CK, top SP, doanh thu theo người bán
│   └── settings_service.py    # Chính sách đổi hàng & ngưỡng hạng
└── routes/                    # Tầng API Endpoints (Flask Blueprints)
    ├── auth_routes.py         # /api/login, /api/logout, /api/account/*
    ├── inventory_routes.py    # /api/products, /api/products/<code>/note, /api/stock-documents
    ├── sale_routes.py         # /api/sales/quote, /api/sales
    ├── exchange_routes.py     # /api/exchanges/quote, /api/exchanges
    ├── crm_routes.py          # /api/customers
    ├── hrm_routes.py          # /api/staff, /api/shifts
    ├── supplier_routes.py     # /api/suppliers/NCC001
    └── report_routes.py       # /api/reports/overview, /api/audit-logs, /api/settings
```

## 3. Hướng dẫn viết từng tầng theo OOP dễ hiểu

1. **Class `DatabaseManager` (`database/connection.py`)**:
   - Đóng gói thông tin kết nối MySQL và cung cấp `get_connection()`.
2. **Class `BaseDAO` (`dao/base_dao.py`)**:
   - Các DAO con kế thừa `BaseDAO`: `class ProductDAO(BaseDAO):`.
   - Có hàm dùng chung: `fetch_all(sql, params)`, `fetch_one(sql, params)`, `execute(sql, params)`.
   - Dùng `dictionary=True` trên cursor để dữ liệu trả về là `dict` dễ đọc.
3. **Tầng `services/`**:
   - Khi thực hiện nghiệp vụ thay đổi nhiều bảng (Bán hàng, Đổi hàng, Nhập/Xuất kho), luôn bọc trong SQL Transaction:
     ```python
     conn = self.db.get_connection()
     try:
         conn.start_transaction()
         # 1. Kiểm tra tồn kho (stock_qty)
         # 2. Cộng/trừ product_sizes.stock_qty
         # 3. Lưu chứng từ + chi tiết dòng
         # 4. Ghi audit_logs
         conn.commit()
     except Exception:
         conn.rollback()
         raise
     finally:
         conn.close()
     ```
4. **Kiểm tra quyền trên Route (`routes/`)**:
   - Dùng helper `require_auth(roles=["manager", "employee"])`.
   - Chặn `403 Forbidden` nếu `employee` truy cập giá nhập (`import_price`), bổ sung giá nhập, báo cáo tổng quan, nhân sự, khách hàng, chính sách hoặc nhật ký kiểm toán.

## 4. Các nghiệp vụ cốt lõi phải viết tường minh

1. **Tồn kho 1 con số chung (`InventoryService`)**:
   - Chỉ có `stock_qty` cho từng `(product_code, size_name)`.
   - Nhập kho cộng `stock_qty`; Xuất kho (chỉ xuất ra ngoài, chặn nơi nhận nội bộ) hoặc Bán hàng kiểm tra `qty <= stock_qty` rồi trừ `stock_qty`.
2. **Bán hàng (`SaleService`)**:
   - Không có voucher và không giảm giá sinh nhật; `total_amount = sum(qty * unit_price)` và lưu `paid_total = qty * unit_price` cho từng dòng.
   - Ghi nhận cả `seller_code` (người bán tính doanh thu) và `cashier_code` (thu ngân thu tiền).
3. **Đổi hàng (`ExchangeService`)**:
   - Kiểm tra hóa đơn tồn tại và `0 <= (today - invoice_date).days <= 30`.
   - **Từ chối hàng lỗi:** Nếu hàng trả không đạt tiêu chuẩn (`condition != 'resellable'` hoặc `condition_ok == False`) -> trả lỗi `400`.
   - Tính tổng đã đổi trước đó trên cùng hóa đơn; tổng giá trị hàng mới phải `>= credit_amount` (thu chênh lệch, không hoàn tiền thừa).
   - Cộng hàng khách trả vào `stock_qty`, trừ hàng mới giao khỏi `stock_qty`.

## 5. Bước kiểm tra sau khi viết code

1. Chạy `python -m py_compile` kiểm tra toàn bộ file `.py`.
2. Khởi chạy Flask `python backend/app.py`, kiểm tra đăng nhập, đổi mật khẩu bằng mã khôi phục, phân quyền 403, bán hàng trừ `stock_qty`, đổi hàng từ chối hàng lỗi, và ghi `audit_logs`.
