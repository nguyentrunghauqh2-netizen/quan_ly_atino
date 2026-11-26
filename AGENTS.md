# AGENTS.md — Quy tắc phát triển dự án Quản lý cửa hàng thời trang Atino

Tài liệu này là quy tắc bắt buộc cho mọi AI Agent khi đọc, thiết kế, viết code hoặc kiểm thử dự án **quan_ly_atino**.

## 1. Kiến trúc & Công nghệ chốt

- **Frontend:** Giữ nguyên hướng **HTML + CSS + JavaScript thuần** (trong thư mục `dist/`), dùng `fetch('/api/...')` để gọi API backend thay cho dữ liệu giả lập trong trình duyệt (`AtinoDemo`).
- **Backend:** **Python + Flask** (RESTful JSON API).
- **Cơ sở dữ liệu:** **MySQL** sử dụng thư viện **`mysql-connector-python`** và câu lệnh **SQL thuần** (không dùng SQLAlchemy hay ORM phức tạp để sinh viên dễ đọc và vấn đáp).
- **Tài liệu chuẩn bắt buộc đọc trước khi code:**
  - Chức năng đã chốt: `docs/SPEC-CHUC-NANG.md`
  - Thiết kế cơ sở dữ liệu (ERD & Schema MySQL): `docs/ERD-ATINO.md`
  - Hướng dẫn kiến trúc & thuật toán dễ vấn đáp: `docs/HUONG-DAN-VAN-DAP.md`

## 2. Ràng buộc nghiệp vụ bắt buộc (ĐÃ CHỐT VỚI CHỦ DỰ ÁN)

1. **KHÔNG có trạng thái `held` / hàng lỗi chờ xử lý trong kho:**
   - Tồn kho từng size của mỗi SKU (`product_sizes`) chỉ gồm **2 nơi lưu**: `warehouse_qty` (**Kho tổng**) và `counter_qty` (**Quầy bán**).
   - Tổng tồn khả dụng = `warehouse_qty + counter_qty`. Không tạo cột hay logic `held`.
2. **Đổi hàng KHÔNG chấp nhận hàng lỗi:**
   - Nghiệp vụ Đổi hàng (`exchanges`) **từ chối hàng lỗi**. Chỉ cho phép đổi đối với hàng **còn nguyên vẹn / đạt tiêu chuẩn bán lại** trong vòng **30 ngày** từ ngày mua, đổi ngang giá hoặc cao hơn giá thực trả (thu thêm chênh lệch, không hoàn tiền thừa).
   - Hàng khách trả lại (đạt chuẩn) được cộng lại vào tồn kho (`warehouse_qty`).
3. **Hai vai trò tài khoản duy nhất:**
   - Chỉ có `manager` (Quản lý) và `employee` (Nhân viên).
   - Giá nhập (`import_price`, `total_amount` phiếu nhập) chỉ `manager` được xem và nhập/bổ sung; `employee` chỉ thao tác với số lượng và giá bán.

## 3. Quy tắc Lập trình Hướng đối tượng (OOP) & Thuật toán dễ hiểu

- **Bắt buộc chia tầng theo OOP rõ ràng** (`models/`, `dao/`, `services/`, `routes/`):
  - `models/`: Các class đại diện thực thể (`Product`, `Customer`, `Invoice`, `Staff`, ...).
  - `dao/` (Data Access Object): Các class chuyên chạy SQL (`ProductDAO`, `InventoryDAO`, `SaleDAO`, ...) nhận kết nối MySQL và trả về đối tượng/dict đơn giản.
  - `services/`: Các class xử lý nghiệp vụ (`AuthService`, `SaleService`, `ExchangeService`, `InventoryService`, `ReportService`, ...) — mỗi phương thức làm **một việc rõ ràng**, có docstring tiếng Việt ngắn gọn giải thích **đầu vào, các bước xử lý, đầu ra**.
  - `routes/`: Các Flask Blueprint mỏng chỉ nhận JSON từ request, gọi `service`, bắt lỗi và trả JSON response.
- **Thuật toán đơn giản, dễ giải thích khi vấn đáp:**
  - Chỉ dùng vòng lặp `for`, điều kiện `if/else`, `dict`, `list`, phép tính cộng/trừ/nhân/chia nguyên, truy vấn SQL `SELECT ... WHERE ... LIKE ... ORDER BY ...` và transaction SQL (`start_transaction()` / `commit()` / `rollback()`).
  - Không dùng metaclass, decorator lồng nhiều tầng phức tạp, async/await phức tạp, regex rối rắm, hay one-liner lồng nhiều biểu thức khó đọc.
- **Tham chiếu các Skills chi tiết tại `.agents/skills/`:**
  - `.agents/skills/python-oop-backend/SKILL.md`
  - `.agents/skills/mysql-database-setup/SKILL.md`
  - `.agents/skills/frontend-api-integration/SKILL.md`
  - `.agents/skills/viva-defense-readiness/SKILL.md`
