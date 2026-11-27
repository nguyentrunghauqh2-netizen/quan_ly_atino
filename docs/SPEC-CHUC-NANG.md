# ĐẶC TẢ CHỨC NĂNG HỆ THỐNG QUẢN LÝ CỬA HÀNG THỜI TRANG ATINO

Tài liệu này tổng hợp toàn bộ **chức năng đã chốt** (khớp 100% với bản web hiện tại trong `dist/`) làm chuẩn để thiết kế cơ sở dữ liệu MySQL và lập trình Backend Python Flask theo hướng đối tượng OOP.

---

## 1. Công nghệ & Kiến trúc chốt

| Thành phần | Lựa chọn | Ghi chú |
| :--- | :--- | :--- |
| **Frontend** | HTML5 + CSS + Vanilla JavaScript | Giữ giao diện trong `dist/`, gọi API qua `fetch('/api/...')` |
| **Backend** | **Python + Flask** | Framework tối giản, dễ học nhất; chia tầng OOP (`models/`, `dao/`, `services/`, `routes/`) |
| **Cơ sở dữ liệu** | **MySQL** (`mysql-connector-python`) | Viết SQL thuần tham số `%s`, dùng Transaction (`commit`/`rollback`), **không dùng ORM phức tạp** |

---

## 2. Chi tiết 9 nhóm chức năng đã chốt (Khớp bản web mới nhất)

### 1) Phân quyền, Đăng nhập & Tài khoản cá nhân
- Đăng nhập bằng `username` và `password` (mật khẩu băm an toàn kèm `salt`, có `revision` chống xung đột phiên).
- Chỉ có **2 vai trò duy nhất**: `manager` (**Quản lý**) và `employee` (**Nhân viên**).
- **Hồ sơ cá nhân:** Sửa họ tên, SĐT, email, ngày sinh, giới tính, địa chỉ; tải/xóa ảnh đại diện (tối đa 5 MB).
- **Bảo mật tài khoản:** Đổi mật khẩu; tạo/đổi **mã khôi phục 32 ký tự hex** (dùng 1 lần); đặt lại mật khẩu ở màn hình đăng nhập khi quên mật khẩu; soạn nháp email báo lỗi phần mềm (`.eml`).

### 2) Sản phẩm, Tem nhãn & Tồn kho chung theo từng Size
- Quản lý sản phẩm theo mã SKU (`AT001`, `QJ001`...): tên, loại hàng, giá bán, đơn vị tính (`sản phẩm` / `đôi`), ảnh sản phẩm, mô tả, nguồn tham khảo, trạng thái kinh doanh (`active`).
- **Thông tin tem nhãn & In mã vạch (`label_*`):** Màu sắc, chất liệu, đơn vị chịu trách nhiệm, địa chỉ, nơi sản xuất, năm sản xuất, hướng dẫn bảo quản; in tem có **mã vạch 1D Code 128B** + **mã QR theo từng Size**.
- **Tồn kho 1 con số chung (`stock_qty`):** Mỗi `(sản phẩm, kích cỡ)` chỉ lưu **một số lượng tồn duy nhất** (`>= 0`). **Không** chia Kho tổng/Quầy bán và **không** có hàng lỗi chờ xử lý (`held`).
- **Cảnh báo & Đánh giá hàng hóa (`stock_*`):**
  - Cảnh báo theo mức độ ưu tiên: *Hết hàng* → *Hết size* → *Sắp hết hàng* → *Sắp hết size* (ngưỡng mặc định `2`).
  - Cảnh báo hàng tồn lâu chưa bán/nhập lại từ `30 ngày` trở lên.
  - Quản lý ghi chú đánh giá sản phẩm (lý do, ghi chú, hướng xử lý, ngưỡng cảnh báo riêng).

### 3) Nhập kho, Xuất kho & Nhà cung cấp đầu mối
- **Nhà cung cấp (`NCC001`):** Cửa hàng chỉ quản lý **1 đầu mối duy nhất** là *Kho tổng — Công ty TNHH Thời Trang Minh AM*, cho phép Quản lý cập nhật SĐT và email liên hệ.
- **Nhập kho (`PN...`):** Cộng số lượng vào `stock_qty` theo từng Size.
  - Quản lý nhập kèm giá vốn (`import_price`) và xem tổng tiền phiếu nhập.
  - Nhân viên chỉ nhập số lượng và giá bán (`cost_status = 'pending'`); Quản lý bổ sung giá nhập sau (`completeReceiptCost`) mà không làm tăng lại tồn kho.
- **Xuất kho (`XK...`):** Chỉ xuất ra ngoài cửa hàng (chặn nơi nhận nội bộ), kiểm tra đủ tồn và trừ `stock_qty`.

### 4) Bán hàng & Thu ngân (POS)
- Tìm kiếm nhanh sản phẩm không dấu theo tên, mã SKU hoặc loại hàng.
- Tách riêng **Người bán (`seller_code`, dùng tính doanh thu nhân viên)** và **Thu ngân (`cashier_code`, người thu tiền/lập hóa đơn)**.
- Chọn khách hàng (hoặc `Khách lẻ`), chọn Size và số lượng (chặn trùng dòng và chặn vượt `stock_qty`).
- Tính thẳng tiền theo giá niêm yết (`số lượng × đơn giá`), lưu `paid_total` từng dòng để phục vụ đổi hàng. *(Không có voucher và không giảm giá sinh nhật).*
- Thanh toán **Tiền mặt** (nhập tiền khách đưa $\ge$ tổng tiền, tính tiền thối) hoặc **Chuyển khoản** (xác nhận đã nhận tiền). Hỗ trợ in hóa đơn.

### 5) Đổi hàng (Không nhận hàng lỗi)
- Tra cứu hóa đơn gốc trong thời hạn **30 ngày** từ ngày mua.
- **Từ chối mọi trường hợp hàng lỗi:** Chỉ nhận đổi hàng **còn nguyên vẹn, đủ điều kiện bán lại** (`condition_ok = TRUE`).
- Cho phép đổi từng phần nhiều lần trên cùng hóa đơn (không vượt quá số lượng đã mua).
- Tính giá trị hàng trả theo `paid_total` của hóa đơn gốc; tổng giá trị hàng lấy mới phải **ngang giá hoặc cao hơn** (`replacement_total >= credit_amount`). Khách trả thêm phần chênh lệch, **không hoàn tiền thừa**.
- Cộng lại hàng khách trả vào `stock_qty` và trừ hàng mới giao khỏi `stock_qty`.

### 6) Quản lý Khách hàng (CRM)
- Thêm, sửa, tìm kiếm, tra hồ sơ theo mã khách hàng (`KH...`) và kiểm tra trùng SĐT. Bấm mã khách để mở các hóa đơn bán gắn với mã đó.
- Tính tổng chi tiêu (từ hóa đơn mua + tiền thu thêm khi đổi hàng), số đơn hàng, ngày mua gần nhất của khách hàng.
- Xem danh sách đơn hàng của khách và tạo bản nháp email gửi khách (`.eml`).

### 7) Quản lý Nhân sự, Ca làm & Dự toán lương (HRM)
- Quản lý hồ sơ nhân viên (`NV...`), chức vụ, cách tính lương (`monthly` theo tháng / `hourly` theo giờ), mức lương, ngày vào làm, ca thường lệ, quyền tài khoản, khóa/mở tài khoản.
- **Phân ca (`CA...`):** Tạo/sửa/xóa/hoàn thành ca; chặn trùng khung giờ trong cùng ngày và chặn xác nhận hoàn thành ca ở ngày tương lai.
- **Dự toán lương tháng:** Tính theo số giờ đã hoàn thành (nếu trả theo giờ) hoặc lương tháng cố định.
- Giao diện nhân viên xem được tổng kết giao dịch, lịch sử phiếu của bản thân và lịch ca làm.

### 8) Báo cáo, Thống kê & Xuất Excel `.xlsx`
- Lọc theo **Ngày / Tháng / Năm**: Doanh thu thực thu (bán + thu chênh lệch đổi hàng), tách Tiền mặt vs Chuyển khoản, số đơn bán, số phiếu đổi, top sản phẩm bán chạy, doanh thu theo người bán, giá trị tồn theo giá vốn.
- Xuất báo cáo Excel `.xlsx` nhiều sheet có biểu đồ và định dạng bảng.

### 9) Chính sách cửa hàng & Nhật ký thao tác (Audit Trail)
- Lưu cấu hình chính sách chung (`return_days = 30`, điều kiện đổi hàng).
- Tự động ghi nhật ký kiểm toán (`audit_logs`) cho mọi thao tác quan trọng; Quản lý xem trực tiếp trên màn hình *Nhật ký thao tác*.
