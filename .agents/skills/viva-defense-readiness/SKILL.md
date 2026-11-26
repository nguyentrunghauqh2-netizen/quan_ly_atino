---
name: viva-defense-readiness
description: >-
  Use this skill to review and verify all generated Python backend and SQL code
  before finishing, ensuring the code strictly follows OOP, simple explainable
  algorithms, and all 10 confirmed features so the student can confidently
  defend the project in an oral exam.
---

# Viva Defense Readiness Skill (Kiểm tra sẵn sàng Vấn đáp)

Chạy skill này ở bước cuối cùng sau khi viết xong backend và nối frontend.

## Checklist kiểm tra bắt buộc

1. **Kiểm tra cấu trúc OOP:**
   - Có tách biệt rõ `models/`, `dao/`, `services/`, `routes/` chưa?
   - Các DAO có kế thừa từ `BaseDAO` không?
   - Có hàm nào viết SQL trực tiếp trong `routes/` hoặc trộn lẫn HTML vào Python không? (Nếu có -> tách về đúng tầng).
2. **Kiểm tra độ dễ đọc & thuật toán:**
   - Có docstring tiếng Việt ngắn gọn ở mọi class và phương thức nghiệp vụ trong `services/` không?
   - Có đoạn code nào quá dài (> 50 dòng), lồng nhiều `if/for` (> 3 cấp), hoặc dùng biểu thức khó hiểu không? (Nếu có -> tách thành hàm phụ có tên rõ ràng).
3. **Kiểm tra ràng buộc nghiệp vụ đã chốt:**
   - Tìm từ khóa `held` hoặc `damaged` trong toàn bộ `backend/` và `schema.sql` -> **phải bằng 0** (hoặc chỉ có thông báo từ chối hàng lỗi).
   - Kiểm tra 10 nhóm chức năng từ A đến J đều có API + giao diện hoạt động thật với MySQL.
4. **Cập nhật tài liệu hướng dẫn vấn đáp (`docs/HUONG-DAN-VAN-DAP.md`):**
   - Ghi đúng tên file, tên class, tên hàm thực tế đã tạo để sinh viên đối chiếu khi thầy/cô hỏi.
5. **Chạy kiểm thử thực tế (Smoke Test):**
   - Kiểm tra kết nối MySQL.
   - Test đủ luồng: Đăng nhập Quản lý/Nhân viên -> Thêm sản phẩm & Nhập kho -> Điều chuyển từ Kho tổng ra Quầy bán -> Tạo hóa đơn có áp dụng voucher/sinh nhật -> Đổi hàng đạt chuẩn (và test từ chối hàng lỗi) -> Xem báo cáo doanh thu -> Kiểm tra `audit_logs` đã ghi đủ.
