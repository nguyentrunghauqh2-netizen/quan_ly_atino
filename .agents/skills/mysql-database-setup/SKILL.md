---
name: mysql-database-setup
description: >-
  Use this skill when creating or migrating the MySQL database for quan_ly_atino.
  Ensures schema.sql matches the latest docs/ERD-ATINO.md (12 main tables +
  2 system tables, unified stock_qty per size, no vouchers, no held/damaged
  inventory, no damaged returns allowed), creates proper foreign keys, and seeds
  initial demo data cleanly.
---

# MySQL Database Setup Skill

Sử dụng skill này khi tạo CSDL MySQL (`backend/database/schema.sql` và `backend/database/seed.sql`).

## 1. Quy tắc bắt buộc đối với Schema MySQL

1. **Đối chiếu 100% với `docs/ERD-ATINO.md`:**
   - Tạo đủ **14 bảng** (12 bảng nghiệp vụ chính + 2 bảng hệ thống):
     - **12 bảng chính:** `staff`, `shifts`, `suppliers`, `products`, `product_sizes`, `customers`, `stock_documents`, `stock_document_items`, `sales_invoices`, `sales_invoice_items`, `exchanges`, `exchange_items`.
     - **2 bảng hệ thống:** `store_settings`, `audit_logs`.
   - **Không tạo** bảng `vouchers`, **không tạo** cột `held_qty`, **không tách** `warehouse_qty` / `counter_qty`.
2. **Charset & Engine:**
   - Sử dụng `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` cho mọi bảng để hỗ trợ tiếng Việt có dấu, Transaction và Khóa ngoại.
3. **Kiểm tra ràng buộc đã chốt:**
   - Bảng `product_sizes` chỉ có **1 cột số lượng duy nhất**: `stock_qty INT NOT NULL DEFAULT 0` kèm `CHECK (stock_qty >= 0)`.
   - Bảng `products` gộp luôn thông tin tem nhãn (`label_*`) và đánh giá hàng hóa (`low_threshold`, `stock_reason`, `stock_note`, `stock_action`).
   - Bảng `sales_invoices` lưu cả `seller_code` (FK -> `staff.code`) và `cashier_code` (FK -> `staff.code`).
   - Bảng `exchanges` chỉ nhận đổi hàng đạt tiêu chuẩn (`condition_ok BOOLEAN NOT NULL DEFAULT TRUE`, `CHECK (condition_ok = TRUE)`).

## 2. Dữ liệu khởi tạo (`seed.sql`)

Cần seed tối thiểu các bản ghi mẫu sau để chạy và bảo vệ đồ án ngay:
1. `store_settings` (`id = 1`): `return_days = 30`, `tier_silver = 2000000`, `tier_gold = 5000000`, `tier_diamond = 10000000`, `return_conditions`.
2. `staff`:
   - `NV001` (`role='manager'`, tài khoản quản lý mẫu)
   - `NV002`, `NV003` (`role='employee'`, tài khoản nhân viên mẫu)
3. `suppliers`: Duy nhất 1 đầu mối `NCC001` — `Kho tổng — Công ty TNHH Thời Trang Minh AM`.
4. `products` + `product_sizes`: Các mặt hàng mẫu Atino (Áo phông, Áo polo, Quần âu, Quần jean, Balo/Phụ kiện...) với số lượng `stock_qty` ban đầu theo từng size.
5. `customers`: 3–4 khách hàng mẫu.

## 3. Kiểm tra sau khi chạy SQL

1. Chạy `schema.sql` và `seed.sql` trên MySQL local.
2. Chạy `SHOW TABLES;` xác nhận đủ 14 bảng.
3. Xác nhận `product_sizes` chỉ có 1 cột `stock_qty` (không có `held`, không chia 2 kho) và không có bảng `vouchers`.
