---
name: viva-defense-readiness
description: >-
  Use this skill to review and verify all generated Python backend and SQL code
  before finishing, ensuring the code strictly follows OOP, simple explainable
  algorithms, and the latest confirmed Atino features so the student can
  confidently defend the project in an oral exam.
---

# Viva Defense Readiness Skill (Kiểm tra sẵn sàng Vấn đáp)

Chạy skill này ở bước cuối cùng sau khi viết xong backend và nối frontend.

## Checklist kiểm tra bắt buộc

1. **Kiểm tra cấu trúc OOP:**
   - Có tách biệt rõ 4 tầng `models/`, `dao/`, `services/`, `routes/` chưa?
   - Các DAO có kế thừa từ `BaseDAO` không?
   - Có hàm nào viết SQL trực tiếp trong `routes/` hoặc trộn lẫn HTML vào Python không?
2. **Kiểm tra độ dễ đọc & thuật toán:**
   - Có docstring tiếng Việt ngắn gọn ở mọi class và phương thức nghiệp vụ trong `services/` không?
   - Có đoạn code nào quá dài (> 50 dòng), lồng quá sâu (> 3 cấp), hoặc dùng biểu thức khó giải thích không?
3. **Kiểm tra ràng buộc nghiệp vụ mới nhất:**
   - Tồn kho `product_sizes` chỉ có **1 cột `stock_qty`** (không có `held`, không tách 2 kho).
   - Đúng ngày sinh, giảm 10% với hạn mức 200.000đ mỗi khách trong ngày, cộng dồn qua các hóa đơn. Tổng `paid_total` từng dòng bằng tổng thanh toán và dùng để tính giá trị hàng đổi.
   - Đổi hàng từ chối hàng lỗi (`condition_ok = TRUE`).
   - Hóa đơn lưu đủ `seller_code` và `cashier_code`.
   - Nhà cung cấp chỉ quản lý `NCC001` (Kho tổng).
4. **Cập nhật tài liệu vấn đáp (`docs/HUONG-DAN-VAN-DAP.md`):**
   - Ghi đúng tên file, tên class, tên hàm thực tế đã tạo để sinh viên đối chiếu khi thầy/cô hỏi.
5. **Chạy kiểm thử thực tế (Smoke Test):**
   - Test kết nối MySQL.
   - Test luồng: Đăng nhập Quản lý/Nhân viên -> Cập nhật hồ sơ & mã khôi phục -> Thêm SP & Nhập kho -> Bán hàng chọn người bán + thu ngân -> Đổi hàng đạt chuẩn (và test chặn hàng lỗi) -> Xem báo cáo & `audit_logs`.
