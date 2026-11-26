---
name: frontend-api-integration
description: >-
  Use this skill when connecting the existing HTML/CSS/JavaScript frontend in
  dist/ to the Python Flask REST API using fetch('/api/...'). Preserves the UI
  while replacing local IndexedDB demo storage and aligning UI labels with the
  removed damaged-return/held-stock features.
---

# Frontend - Backend API Integration Skill

Sử dụng skill này khi nối giao diện HTML/CSS/JS trong `dist/` với Backend Flask qua `fetch('/api/...')`.

## 1. Nguyên tắc tích hợp

- **Giữ nguyên HTML/CSS/JS thuần** (không chuyển sang React/Vue hay build tool phức tạp).
- Trong `dist/index.html`, hàm `api(path, options)` (khoảng dòng 2265) đã viết sẵn cấu trúc gọi `fetch('/api/' + path, ...)`. Agent cần:
  1. Tách hoặc vô hiệu hóa mock `window.AtinoDemo` (không dùng dữ liệu giả lập `IndexedDB` nữa khi chạy bản có backend).
  2. Chuyển toàn bộ các lời gọi trong `dist/assets/erp.js` (`snapshot`, `checkoutData`, `saveProduct`, `saveStockDocument`, `completeReceiptCost`, `quoteSale`, `saveSale`, `quoteExchange`, `saveExchange`, `saveCustomer`, `saveSupplier`, `saveVoucher`, `saveEmployee`, `saveShift`, `deleteShift`, `saveSettings`) sang gọi `fetch('/api/...')` tới Flask.
  3. Phục vụ `dist/` trực tiếp từ Flask (`static_folder='../dist'`) để cùng origin `http://localhost:5000`, tránh rắc rối CORS và giữ cookie session hoạt động mượt mà.

## 2. Điều chỉnh UI theo 2 yêu cầu đã chốt

1. **Bỏ "Hàng lỗi chờ xử lý" (`held`) ở phần Tồn kho:**
   - Trong `dist/assets/manager-shell.js`, `dist/assets/manager-operations.js`, `dist/assets/erp.js` và `dist/index.html`: ẩn/xóa các thẻ thống kê, cột bảng hoặc bộ lọc hiển thị số lượng `held` / "Chờ xử lý".
   - Giữ nguyên hiển thị **Kho tổng** (`warehouse`), **Quầy bán** (`counter`), **Tổng tồn theo Size** và cảnh báo thiếu hàng theo từng size.
2. **Bỏ lựa chọn "Hàng lỗi" trong form Đổi hàng:**
   - Trong `dist/assets/manager-operations.js` (form lập phiếu đổi hàng): bỏ tùy chọn tình trạng `damaged` / "Hàng lỗi". Chỉ cho phép xác nhận hàng trả lại là **"Đạt tiêu chuẩn / Nguyên vẹn"**; ghi rõ thông báo chính sách: *Không hỗ trợ đổi hàng lỗi*.

## 3. Xử lý lỗi & Trạng thái tải

- Mọi hàm `fetch` phải kiểm tra `if (!response.ok)` để lấy trường `error` từ JSON của Flask và hiển thị thông báo tiếng Việt lên giao diện.
- Khi server trả mã `401 Unauthorized`, tự động chuyển về màn hình đăng nhập.
- Khi server trả mã `403 Forbidden`, hiển thị thông báo `"Bạn không có quyền thực hiện thao tác này"`.
