---
name: mysql-database-setup
description: >-
  Use this skill when creating or migrating the MySQL database for quan_ly_atino.
  Ensures schema.sql matches docs/ERD-ATINO.md (no held/damaged inventory column,
  no damaged returns allowed), creates proper foreign keys, and seeds initial
  demo data cleanly.
---

# MySQL Database Setup Skill

Sử dụng skill này khi tạo CSDL MySQL (`backend/database/schema.sql` và `backend/database/seed.sql`).

## 1. Quy tắc bắt buộc đối với Schema MySQL

1. **Đối chiếu 100% với `docs/ERD-ATINO.md`:**
   - Tạo đủ 15 bảng: `staff`, `shifts`, `suppliers`, `products`, `product_sizes`, `customers`, `vouchers`, `stock_documents`, `stock_document_items`, `sales_invoices`, `sales_invoice_items`, `exchanges`, `exchange_items`, `store_settings`, `audit_logs`.
2. **Charset & Engine:**
   - Sử dụng `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` cho mọi bảng để hỗ trợ đầy đủ tiếng Việt có dấu và Transaction (`COMMIT`/`ROLLBACK`) cùng Khóa ngoại (`FOREIGN KEY`).
3. **Kiểm tra ràng buộc đã chốt:**
   - Bảng `product_sizes` CHỈ có 2 cột số lượng: `warehouse_qty` và `counter_qty`. Tuyệt đối KHÔNG tạo cột `held_qty`.
   - Thêm ràng buộc `CHECK (warehouse_qty >= 0 AND counter_qty >= 0)` (hoặc kiểm tra chặt ở Service trong transaction) để không bao giờ âm kho.
   - Bảng `exchanges` chỉ phục vụ đổi hàng đạt tiêu chuẩn (`condition_ok BOOLEAN NOT NULL DEFAULT TRUE`, `CHECK (condition_ok = TRUE)`).

## 2. Dữ liệu khởi tạo (`seed.sql`)

Cần seed tối thiểu các bản ghi mẫu sau để test và bảo vệ đồ án ngay:
1. `store_settings` (`id = 1`): `return_days = 30`, ngưỡng Bạc `2000000`, Vàng `5000000`, Kim cương `10000000`, sinh nhật `10%` tối đa `100000`.
2. `staff`:
   - `NV001` (`role='manager'`, tài khoản demo quản lý)
   - `NV002`, `NV003` (`role='employee'`, tài khoản demo nhân viên)
3. `suppliers`: `NCC001` — `Kho tổng Atino`.
4. `products` + `product_sizes`: Một số mặt hàng mẫu của Atino (Áo phông, Áo polo, Quần âu, Quần jean, Balo/Phụ kiện) với số lượng ban đầu ở `warehouse_qty` và `counter_qty`.
5. `customers`: 3–4 khách hàng mẫu (có ít nhất 1 khách có sinh nhật đúng ngày để test ưu đãi sinh nhật).
6. `vouchers`: 1–2 chương trình khuyến mãi mẫu (giảm % và giảm tiền cố định).

## 3. Kiểm tra sau khi chạy SQL

1. Chạy `schema.sql` và `seed.sql` trên MySQL local.
2. Chạy `SHOW TABLES;` xác nhận đủ 15 bảng.
3. Chạy truy vấn kiểm tra khóa ngoại và thử 1 câu `SELECT` kiểm tra tồn kho từng size không có cột lỗi (`held`).
