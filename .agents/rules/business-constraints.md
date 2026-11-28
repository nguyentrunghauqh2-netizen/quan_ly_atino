# Quy tắc Nghiệp vụ Chốt (Atino Store Management — Bản đồng bộ mới nhất)

Mọi code Backend Python, SQL MySQL và nối API Frontend đều phải tuân thủ chính xác các quy tắc nghiệp vụ đang chạy trên `dist/` sau:

1. **Đăng nhập, Phân quyền & Tài khoản cá nhân:**
   - Chỉ có 2 vai trò: `manager` (Quản lý) và `employee` (Nhân viên).
   - Mật khẩu lưu dạng băm an toàn (SHA-256 + salt hoặc `werkzeug.security`), kèm `revision` để tránh xung đột khi đổi mật khẩu.
   - Hỗ trợ hồ sơ cá nhân (`name`, `phone`, `email`, `birthday`, `gender`, `address`, `avatar`), đổi mật khẩu, tạo mã khôi phục 32 ký tự hex (lưu dạng băm `recovery_hash`, dùng 1 lần) và đặt lại mật khẩu khi quên.
   - Kiểm tra quyền chặt trên Flask API: nhân viên bị chặn (`403 Forbidden`) khi truy cập giá nhập, báo cáo tài chính tổng hợp, quản lý nhân viên, khách hàng, chính sách hoặc nhật ký hệ thống.

2. **Sản phẩm, Tem nhãn & Tồn kho chung theo từng Size:**
   - **Một số tồn chung duy nhất (`stock_qty`):** Mỗi `(product_code, size_name)` chỉ lưu 1 số lượng tồn duy nhất (`>= 0`). Không chia Kho tổng / Quầy bán, không có `held` (hàng lỗi chờ xử lý).
   - Thông tin in tem nhãn (`label_color`, `label_material`, `label_manufacturer`, `label_address`, `label_origin`, `label_year`, `label_care`) và thông tin đánh giá tồn (`low_threshold` mặc định `2`, `stock_reason`, `stock_note`, `stock_action`) nằm trực tiếp trên bảng `products`.
   - Hỗ trợ cảnh báo theo thứ tự ưu tiên: *Hết hàng* → *Hết size* → *Sắp hết hàng* → *Sắp hết size*, và cảnh báo hàng tồn lâu chưa bán (`>= 30 ngày`).

3. **Nhập kho, Xuất kho & Nhà cung cấp:**
   - **Chỉ có 1 nhà cung cấp đầu mối:** `NCC001` (*Kho tổng — Công ty TNHH Thời Trang Minh AM*), chỉ cho sửa thông tin liên hệ của `NCC001`.
   - Nhập kho (`receipt`) cộng số lượng vào `stock_qty`. Nhân viên chỉ nhập số lượng và giá bán (`cost_status = 'pending'`); Quản lý bổ sung giá nhập (`completeReceiptCost`) mà không cộng lại số lượng tồn.
   - Xuất kho (`dispatch`) chỉ cho xuất ra ngoài cửa hàng (từ chối nơi nhận nội bộ) và trừ `stock_qty`.

4. **Bán hàng & Thu ngân (POS):**
   - Tính `gross_amount` từ `qty * unit_price`. Khách có hồ sơ được giảm 10% đúng ngày sinh, tối đa 200.000đ mỗi khách trong ngày, tính chung qua mọi hóa đơn. Không dùng voucher.
   - Phân bổ tiền giảm theo giá trị từng dòng, lưu `paid_total` và dùng tổng thực trả để thanh toán, tính doanh thu và đổi hàng.
   - Hóa đơn tách riêng **Người bán (`seller_code`)** và **Thu ngân (`cashier_code`)**; doanh thu thống kê theo người bán.
   - Chặn dòng trùng `(product_code, size_name)` và chặn số lượng vượt `stock_qty`.
   - Thanh toán `Tiền mặt` yêu cầu `cash_received >= total_amount` và tính `change_amount`; `Chuyển khoản` yêu cầu `transfer_confirmed = TRUE`.

5. **Đổi hàng (Không nhận hàng lỗi):**
   - Chỉ cho đổi trong vòng **30 ngày** từ ngày mua trên hóa đơn gốc.
   - **Từ chối mọi trường hợp hàng lỗi:** `condition_ok` bắt buộc phải là `TRUE` (hàng nguyên vẹn, đủ điều kiện bán lại).
   - Cho phép đổi từng phần nhiều lần trên cùng hóa đơn (không vượt số lượng đã mua), tính giá trị hàng trả theo `paid_total` đã lưu trên dòng hóa đơn gốc.
   - Đổi ngang giá hoặc cao hơn giá trị hàng trả (`replacement_total >= credit_amount`), thu thêm chênh lệch, không hoàn tiền thừa. Cộng hàng trả vào `stock_qty` và trừ hàng mới lấy khỏi `stock_qty`.

6. **Khách hàng (CRM):**
   - Lưu hồ sơ khách hàng (`KH...`), kiểm tra trùng SĐT và dùng ngày sinh trên hồ sơ để xét ưu đãi ở POS.
   - Tự động tính tổng chi tiêu (từ hóa đơn bán + tiền thu thêm đổi hàng) và phân hạng: `Đồng` (`< 2tr`), `Bạc` (`>= 2tr`), `Vàng` (`>= 5tr`), `Kim cương` (`>= 10tr`).

7. **Nhân viên & Ca làm việc (HRM):**
   - Quản lý hồ sơ, chức vụ, cách tính lương (`monthly` / `hourly`), phân ca làm (`CA...`, chặn trùng giờ trong cùng ngày và chặn hoàn thành ca ở ngày tương lai), dự toán lương tháng.

8. **Báo cáo, Chính sách & Nhật ký kiểm toán:**
   - Báo cáo theo Ngày / Tháng / Năm (doanh thu thực thu, tiền mặt vs chuyển khoản, top sản phẩm, doanh thu theo người bán, giá trị tồn theo giá vốn).
   - Lưu chính sách chung (`store_settings`, `id = 1`) và ghi mọi thao tác quan trọng vào `audit_logs`.
