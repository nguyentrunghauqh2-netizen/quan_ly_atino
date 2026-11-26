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

- **Web Framework:** `Flask` (kèm `Flask-CORS` hoặc phục vụ luôn thư mục tĩnh `dist/` để tránh lỗi CORS).
- **Database Driver:** `mysql-connector-python` (viết SQL thuần có tham số `%s`, KHÔNG dùng SQLAlchemy/ORM để code rõ ràng từng câu truy vấn khi giảng viên hỏi).
- **Session / Auth:** Dùng `flask.session` (cookie ký số) hoặc token đơn giản lưu ở server/session kèm mật khẩu băm `werkzeug.security` (`generate_password_hash`, `check_password_hash`) hoặc `hashlib.sha256` có salt.
- **Biến môi trường:** `python-dotenv` đọc file `.env` (chứa `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SECRET_KEY`).

## 2. Cấu trúc thư mục Backend chuẩn OOP

```text
backend/
├── app.py                     # Khởi tạo Flask app, đăng ký Blueprints, phục vụ dist/
├── config.py                  # Class Config đọc cấu hình DB và Secret Key
├── requirements.txt           # flask, flask-cors, mysql-connector-python, python-dotenv
├── .env.example               # Mẫu cấu hình kết nối MySQL
├── database/
│   ├── connection.py          # Class DatabaseManager quản lý kết nối MySQL & transaction
│   ├── schema.sql             # Script tạo 15 bảng MySQL chuẩn theo docs/ERD-ATINO.md
│   └── seed.sql               # Dữ liệu mẫu ban đầu (nhân viên, khách hàng, sản phẩm, kho)
├── models/                    # Tầng Đối tượng (Entities)
│   ├── base_model.py          # Class BaseModel (hàm to_dict, validate cơ bản)
│   ├── staff.py               # Class Staff, Shift
│   ├── product.py             # Class Product, ProductSize
│   ├── partner.py             # Class Customer, Supplier
│   ├── promotion.py           # Class Voucher, StoreSettings
│   ├── transaction.py         # Class StockDocument, SaleInvoice, ExchangeTicket
│   └── audit_log.py           # Class AuditLog
├── dao/                       # Tầng Truy xuất Dữ liệu (Data Access Objects)
│   ├── base_dao.py            # Class BaseDAO (kế thừa cho các DAO con: fetch_one, fetch_all, execute)
│   ├── staff_dao.py
│   ├── product_dao.py         # Thao tác bảng products và product_sizes (warehouse_qty, counter_qty)
│   ├── customer_dao.py
│   ├── supplier_dao.py
│   ├── voucher_dao.py
│   ├── stock_dao.py
│   ├── sale_dao.py
│   ├── exchange_dao.py
│   └── audit_dao.py
├── services/                  # Tầng Nghiệp vụ (Business Logic)
│   ├── auth_service.py        # Đăng nhập, đăng xuất, kiểm tra quyền manager/employee
│   ├── inventory_service.py   # Nhập kho, xuất kho, điều chuyển kho tổng <-> quầy, cảnh báo hết size
│   ├── sale_service.py        # Báo giá đơn, chọn voucher tốt nhất, ưu đãi sinh nhật, lưu hóa đơn
│   ├── exchange_service.py    # Kiểm tra hạn 30 ngày, từ chối hàng lỗi, tính chênh lệch, lưu phiếu đổi
│   ├── crm_service.py         # Quản lý khách hàng & tính hạng thành viên
│   ├── hrm_service.py         # Quản lý nhân viên, phân ca (check trùng giờ), dự toán lương
│   ├── report_service.py      # Doanh thu theo ngày/tháng/năm, tiền mặt/chuyển khoản, top sản phẩm
│   └── settings_service.py    # Chính sách đổi hàng & ngưỡng hạng
└── routes/                    # Tầng API Endpoints (Flask Blueprints)
    ├── auth_routes.py         # /api/login, /api/logout, /api/me
    ├── inventory_routes.py    # /api/products, /api/stock-documents
    ├── sale_routes.py         # /api/sales/quote, /api/sales
    ├── exchange_routes.py     # /api/exchanges/quote, /api/exchanges
    ├── crm_routes.py          # /api/customers, /api/vouchers
    ├── hrm_routes.py          # /api/staff, /api/shifts
    ├── supplier_routes.py     # /api/suppliers
    └── report_routes.py       # /api/reports/overview, /api/audit-logs, /api/settings
```

## 3. Hướng dẫn viết từng tầng theo OOP dễ hiểu

1. **Class `DatabaseManager` (`database/connection.py`)**:
   - Đóng gói thông tin host, user, password, database.
   - Cung cấp phương thức `get_connection()` trả về connection từ `mysql.connector.connect(...)`.
2. **Class `BaseDAO` (`dao/base_dao.py`)**:
   - Các DAO khác kế thừa `BaseDAO`: `class ProductDAO(BaseDAO):`.
   - Có các method dùng chung: `fetch_all(sql, params)`, `fetch_one(sql, params)`, `execute(sql, params)`.
   - Luôn dùng `dictionary=True` trên cursor để dữ liệu trả về là `dict` dễ đọc, dễ chuyển sang JSON.
3. **Tầng `services/`**:
   - Nhận các DAO cần thiết qua `__init__(self, db_manager)` (Dependency Injection đơn giản).
   - Khi thực hiện nghiệp vụ thay đổi nhiều bảng (như **Lưu hóa đơn** hoặc **Lưu phiếu đổi hàng** hoặc **Nhập/Xuất kho**), mở transaction tường minh:
     ```python
     conn = self.db.get_connection()
     try:
         conn.start_transaction()
         # 1. Kiểm tra tồn kho
         # 2. Trừ/cộng product_sizes (warehouse_qty, counter_qty)
         # 3. Lưu chứng từ + chi tiết dòng
         # 4. Ghi audit_logs
         conn.commit()
     except Exception:
         conn.rollback()
         raise
     finally:
         conn.close()
     ```
4. **Decorator kiểm tra đăng nhập & quyền (`routes/`)**:
   - Chỉ cần 1 hàm helper hoặc decorator đơn giản `require_auth(roles=["manager", "employee"])` đọc `session.get("user")`.
   - Tuyệt đối không trả cột `import_price` (giá nhập) hay báo cáo tổng quan nếu `user["role"] != "manager"`.

## 4. Các thuật toán cốt lõi phải viết thật tường minh

1. **Chọn ưu đãi tốt nhất khi bán hàng (`SaleService.tinh_bao_gia`)**:
   - Bước 1: Tính `gross_amount = sum(qty * unit_price)`.
   - Bước 2: Dùng 1 vòng `for` duyệt các voucher đang hoạt động, kiểm tra `start_date <= today <= end_date`, `used_count < usage_limit` (hoặc `usage_limit == 0`), `gross_amount >= min_order`, và hạng khách hàng đạt yêu cầu. Chọn voucher có số tiền giảm lớn nhất.
   - Bước 3: Kiểm tra khách có sinh nhật hôm nay và chưa dùng ưu đãi sinh nhật trong năm hiện tại không -> tính giảm 10% (tối đa 100.000đ).
   - Bước 4: So sánh giảm giá voucher và giảm giá sinh nhật, chọn phương án giảm nhiều tiền nhất cho khách.
2. **Phân bổ tiền giảm giá về từng dòng hàng (`_phan_bo_giam_gia`)**:
   - Dùng chia nguyên `(discount_amount * line_total) // gross_amount`, phần dư cộng từng 1 đồng từ dòng đầu tiên đến khi hết. Giúp khi đổi trả từng món vẫn biết chính xác số tiền khách đã thực trả cho món đó.
3. **Kiểm tra đổi hàng (`ExchangeService`)**:
   - Kiểm tra hóa đơn tồn tại và `0 <= (today - invoice_date).days <= 30`.
   - **Kiểm tra tình trạng hàng:** Nếu nhận tham số tình trạng là hàng lỗi -> trả lỗi `400`: `"Cửa hàng không hỗ trợ đổi đối với sản phẩm bị lỗi."`
   - Tính tổng số lượng đã đổi ở các phiếu trước của cùng hóa đơn để đảm bảo không đổi vượt quá số lượng đã mua.
   - Tổng giá trị hàng mới phải `>= credit_amount` (chỉ thu thêm, không hoàn tiền).

## 5. Bước kiểm tra sau khi viết code

1. Chạy `python -m py_compile` kiểm tra toàn bộ file `.py` không lỗi cú pháp.
2. Khởi chạy Flask `python backend/app.py`, dùng `curl` hoặc script test kiểm tra đăng nhập, phân quyền 403 cho nhân viên, bán hàng trừ kho, đổi hàng từ chối hàng lỗi, và ghi `audit_logs`.
