# AGENTS.md — Quy tắc phát triển dự án Quản lý cửa hàng thời trang Atino

Tài liệu này là quy tắc bắt buộc cho mọi AI Agent khi đọc, thiết kế, viết code hoặc kiểm thử dự án **quan_ly_atino**.

## 1. Kiến trúc & Công nghệ chốt

- **Frontend:** Giữ nguyên **HTML + CSS + JavaScript thuần** (trong thư mục `dist/`), dùng `fetch('/api/...')` gọi API backend thay cho dữ liệu giả lập trong trình duyệt (`AtinoDemo`).
- **Backend:** **Python + Flask** (RESTful JSON API), phục vụ luôn thư mục tĩnh `dist/` trên cùng origin.
- **Cơ sở dữ liệu:** **MySQL** sử dụng thư viện **`mysql-connector-python`** và câu lệnh **SQL thuần** (không dùng SQLAlchemy hay ORM phức tạp để sinh viên dễ đọc và vấn đáp).
- **Tài liệu chuẩn bắt buộc đọc trước khi code:**
  - Đặc tả chức năng đã chốt: `docs/SPEC-CHUC-NANG.md`
  - Thiết kế cơ sở dữ liệu (ERD & Schema MySQL): `docs/ERD-ATINO.md`
  - Hướng dẫn kiến trúc & thuật toán dễ vấn đáp: `docs/HUONG-DAN-VAN-DAP.md`

## 2. Ràng buộc nghiệp vụ đã chốt (Khớp 100% bản web trong `dist/`)

1. **Tồn kho dùng MỘT số lượng chung cho mỗi `(sản phẩm, kích cỡ)`:**
   - Bảng `product_sizes` chỉ có cột `stock_qty` (`>= 0`).
   - **KHÔNG** tách kho tổng / quầy bán và **KHÔNG** có trạng thái `held` / hàng lỗi chờ xử lý.
   - Thông tin tem nhãn (`label_*`) và đánh giá hàng tồn (`low_threshold`, `stock_*`) gộp thẳng vào bảng `products` để cấu trúc gọn gàng.
2. **Đổi hàng KHÔNG chấp nhận hàng lỗi:**
   - Nghiệp vụ Đổi hàng (`exchanges`) **từ chối hàng lỗi**. Chỉ cho phép đổi hàng **còn nguyên vẹn / đạt tiêu chuẩn bán lại** (`condition_ok = TRUE`) trong vòng **30 ngày** từ ngày mua.
   - Đổi ngang giá hoặc cao hơn giá thực trả (thu thêm chênh lệch, không hoàn tiền thừa). Hàng khách trả (đạt chuẩn) được cộng lại vào `stock_qty`.
3. **Bán hàng & Không dùng Voucher/Ưu đãi sinh nhật:**
   - Hóa đơn tính thẳng theo giá bán niêm yết (`số lượng × đơn giá`), lưu `paid_total` trên từng dòng để phục vụ đổi hàng từng phần chính xác.
   - Hóa đơn phân biệt **Người bán** (`seller_code`, dùng tính doanh thu nhân viên) và **Thu ngân** (`cashier_code`, người thu tiền/lập hóa đơn).
4. **Nhà cung cấp đầu mối duy nhất:**
   - Cửa hàng chỉ quản lý đầu mối **Kho tổng** (`NCC001`), cho phép cập nhật thông tin liên hệ, không tạo thêm nhà cung cấp khác.
   - Phiếu xuất kho (`dispatch`) chỉ xuất ra ngoài cửa hàng (chặn nơi nhận nội bộ).
5. **Hai vai trò tài khoản & Bảo mật:**
   - Chỉ có `manager` (Quản lý) và `employee` (Nhân viên).
   - Giá nhập (`import_price`, `total_amount` phiếu nhập) chỉ `manager` được xem và nhập/bổ sung; `employee` chỉ thao tác số lượng và giá bán.
   - Hỗ trợ tài khoản cá nhân: ảnh đại diện, thông tin cá nhân, đổi mật khẩu và đặt lại mật khẩu bằng mã khôi phục dùng 1 lần.

## 3. Quy tắc Lập trình Hướng đối tượng (OOP) & Thuật toán dễ hiểu

- **Bắt buộc chia tầng theo OOP rõ ràng** (`models/`, `dao/`, `services/`, `routes/`):
  - `models/`: Các class đại diện thực thể (`Staff`, `Shift`, `Supplier`, `Product`, `ProductSize`, `Customer`, `StockDocument`, `SaleInvoice`, `ExchangeTicket`, `StoreSettings`, `AuditLog`).
  - `dao/` (Data Access Object): Các class kế thừa `BaseDAO`, chuyên chạy SQL thuần tham số `%s`.
  - `services/`: Các class xử lý nghiệp vụ (`AuthService`, `InventoryService`, `SaleService`, `ExchangeService`, `CrmService`, `HrmService`, `ReportService`, `SettingsService`) — mỗi phương thức làm **một việc rõ ràng**, có docstring tiếng Việt ngắn gọn giải thích **đầu vào, các bước xử lý, đầu ra**.
  - `routes/`: Các Flask Blueprint mỏng chỉ nhận JSON, kiểm tra quyền, gọi `service` và trả JSON response.
- **Thuật toán đơn giản, dễ giải thích khi vấn đáp:**
  - Chỉ dùng vòng lặp `for`, `if/else`, `dict`, `list`, phép tính cơ bản, truy vấn SQL `SELECT ... WHERE ... LIKE ... ORDER BY ...` và transaction SQL (`start_transaction()` / `commit()` / `rollback()`).
  - Không dùng metaclass, decorator lồng nhiều tầng phức tạp, async/await phức tạp, hay one-liner khó đọc.
- **Tham chiếu các Skills chi tiết tại `.agents/skills/`:**
  - `.agents/skills/python-oop-backend/SKILL.md`
  - `.agents/skills/mysql-database-setup/SKILL.md`
  - `.agents/skills/frontend-api-integration/SKILL.md`
  - `.agents/skills/viva-defense-readiness/SKILL.md`
  - Khi nhận yêu cầu, đối chiếu với quy tắc và hành vi thực tế. Nếu có căn cứ phản biện, nêu tác động và phương án trước khi sửa. Dùng [.agents/skills/atino-phan-bien/SKILL.md](.agents/skills/atino-phan-bien/SKILL.md) khi rà soát hoặc gặp mâu thuẫn.
