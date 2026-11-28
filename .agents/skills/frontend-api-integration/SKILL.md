---
name: frontend-api-integration
description: >-
  Use this skill when connecting the existing HTML/CSS/JavaScript frontend in
  dist/ to the Python Flask REST API using fetch('/api/...'). Preserves the
  latest dist/ UI (unified stock, no vouchers, no damaged returns, account
  profile/recovery, Excel export, product labels) while replacing IndexedDB demo
  storage.
---

# Frontend - Backend API Integration Skill

Sử dụng skill này khi nối giao diện HTML/CSS/JS trong `dist/` với Backend Flask qua `fetch('/api/...')`.

## 1. Nguyên tắc tích hợp

- **Giữ nguyên HTML/CSS/JS thuần** trong `dist/` (bao gồm giao diện tài khoản `account-ui.js`, tem nhãn `product-labels.js`, xuất Excel `workbook.js` / `report-export.js`).
- Khi nối POS, hiển thị khoản giảm sinh nhật và thực thu do API báo giá trả về. Yêu cầu báo giá lại nếu tổng tiền thay đổi khi lưu. Giữ tồn kho chung theo kích cỡ và điều kiện chỉ đổi hàng nguyên vẹn.
- Trong `dist/index.html`, hàm `api(path, options)` đã có sẵn khung `fetch('/api/' + path, ...)`. Agent cần:
  1. Tắt/gỡ bỏ mock `window.AtinoDemo` dùng `IndexedDB` khi chạy bản kết nối backend.
  2. Nối toàn bộ API của `dist/assets/erp.js` và `dist/assets/account-store.js` sang gọi Flask endpoints:
     - Tài khoản: `/api/login`, `/api/logout`, `/api/account`, `/api/account/profile`, `/api/account/password`, `/api/account/recovery-code`, `/api/account/reset-password`
     - Hàng hóa & Kho: `/api/snapshot`, `/api/checkout-data`, `/api/products`, `/api/products/<code>/note`, `/api/stock-documents/preview`, `/api/stock-documents`, `/api/stock-documents/complete-cost`
     - Bán hàng & Đổi hàng: `/api/sales/quote`, `/api/sales`, `/api/exchanges/quote`, `/api/exchanges`
     - Đối tác & Nhân sự: `/api/suppliers/NCC001`, `/api/customers`, `/api/staff`, `/api/shifts`, `/api/settings`
  3. Phục vụ `dist/` trực tiếp từ Flask (`static_folder='../dist'`) để dùng chung origin, cookie session hoạt động ổn định.

## 2. Xử lý lỗi & Trạng thái tải

- Mọi lời gọi `fetch` phải kiểm tra `if (!response.ok)` để lấy trường `error` từ JSON của Flask và hiển thị thông báo tiếng Việt trên giao diện.
- Khi server trả `401 Unauthorized`, tự động đưa về màn hình đăng nhập.
- Khi server trả `403 Forbidden`, hiển thị thông báo `"Bạn không có quyền thực hiện thao tác này."`.
