# Quy tắc Nghiệp vụ Chốt (Atino Store Management)

Mọi code Backend, SQL và chỉnh sửa Frontend đều phải tuân thủ chính xác 10 nhóm nghiệp vụ đã chốt sau:

1. **A. Phân quyền & Đăng nhập:**
   - Chỉ có 2 vai trò: `manager` (Quản lý) và `employee` (Nhân viên).
   - Mật khẩu lưu dạng băm an toàn (SHA-256 + salt hoặc `werkzeug.security`), không lưu plain text.
   - Kiểm tra quyền ngay trên server Flask ở mỗi API: nhân viên bị chặn (`403 Forbidden`) khi truy cập dữ liệu giá nhập, báo cáo tài chính, cấu hình nhân viên, voucher, chính sách.

2. **B. Bán hàng & Thu ngân (POS):**
   - Kiểm tra tồn kho khả dụng (`warehouse_qty + counter_qty`) theo đúng `product_code` + `size_name`.
   - Không cho phép 2 dòng trùng `(product_code, size_name)` trong cùng 1 hóa đơn.
   - Tự động áp dụng ưu đãi tốt nhất (giữa voucher hợp lệ và ưu đãi sinh nhật 10% tối đa 100.000đ, 1 lần/năm).
   - Thanh toán Tiền mặt yêu cầu `cash_received >= total_amount` và tính `change_amount`. Thanh toán Chuyển khoản yêu cầu `transfer_confirmed = True`.

3. **C. Đổi hàng & Trả hàng (ĐÃ ĐIỀU CHỈNH):**
   - Chỉ cho đổi trong vòng **30 ngày** kể từ ngày mua trên hóa đơn gốc.
   - **KHÔNG CHO ĐỔI HÀNG LỖI:** Hệ thống chỉ tiếp nhận sản phẩm khách trả lại **còn nguyên vẹn, đạt tiêu chuẩn bán lại**. Mọi trường hợp hàng lỗi đều bị từ chối đổi ngay tại bước kiểm tra đầu vào.
   - Đổi ngang giá hoặc cao hơn giá trị thực trả (đã trừ phân bổ giảm giá của hóa đơn gốc); thu thêm phần chênh lệch, không hoàn tiền thừa.
   - Hàng khách trả (đạt chuẩn) được cộng lại vào `warehouse_qty`; hàng mới giao cho khách được trừ khỏi tồn kho (ưu tiên `counter_qty` trước, thiếu mới trừ `warehouse_qty`).

4. **D. Quản lý Tồn kho & Hàng hóa (ĐÃ ĐIỀU CHỈNH):**
   - **KHÔNG có trạng thái `held` (hàng lỗi chờ xử lý).**
   - Tồn kho theo từng Size của mỗi SKU (`product_sizes`) chỉ gồm **2 cột số lượng**:
     - `warehouse_qty` (Kho tổng)
     - `counter_qty` (Quầy bán)
   - Hỗ trợ cảnh báo thiếu hàng theo từng Size (mặc định ngưỡng `<= 2`), nhập kho, xuất kho/điều chuyển (từ kho tổng ra quầy hoặc xuất trả NCC/nơi khác), bổ sung giá nhập cho quản lý, và in tem nhãn QR.

5. **E. Quản lý Khách hàng & Tích điểm (CRM):**
   - Lưu hồ sơ khách hàng, số điện thoại duy nhất, ngày sinh, lịch sử đơn hàng.
   - Tự động tính hạng theo tổng chi tiêu: Đồng (`< 2tr`), Bạc (`>= 2tr`), Vàng (`>= 5tr`), Kim cương (`>= 10tr`).

6. **F. Quản lý Nhân sự & Ca làm việc (HRM & Shifts):**
   - Quản lý hồ sơ nhân viên, hình thức lương (tháng/giờ), phân ca làm việc (chặn trùng giờ trong cùng ngày, chặn hoàn thành ca ở tương lai), dự toán lương tháng.

7. **G. Quản lý Khuyến mãi & Voucher:**
   - Giảm theo `%` (có trần tối đa) hoặc số tiền cố định, đơn tối thiểu, thời gian hiệu lực, giới hạn lượt dùng, hạng thành viên tối thiểu.

8. **H. Quản lý Nhà cung cấp (Suppliers):**
   - Danh mục nhà cung cấp (Kho tổng Atino và các nhà cung cấp khác), trạng thái hoạt động, thông tin liên hệ.

9. **I. Báo cáo & Thống kê Điều hành:**
   - Doanh thu thực thu theo ngày/tháng/năm (bao gồm hóa đơn bán + khoản thu thêm khi đổi hàng), tách riêng Tiền mặt và Chuyển khoản, top sản phẩm bán chạy, tồn kho và xuất CSV.

10. **J. Nhật ký kiểm toán (Audit Trail):**
    - Ghi nhận mọi thao tác tạo/sửa/xóa dữ liệu quan trọng vào bảng `audit_logs` gồm: thời gian, mã nhân viên, tên nhân viên, hành động, mã chứng từ tham chiếu.
