# ĐẶC TẢ CHỨC NĂNG HỆ THỐNG QUẢN LÝ CỬA HÀNG THỜI TRANG ATINO

Tài liệu này tổng hợp **10 nhóm chức năng đã chốt** làm phạm vi chính thức để lập trình Backend (Python Flask + MySQL) và kết nối Frontend (HTML/CSS/JS thuần qua `fetch('/api/...')`).

---

## 1. Công nghệ & Kiến trúc chốt

| Thành phần | Lựa chọn | Ghi chú cho Agent & Sinh viên |
| :--- | :--- | :--- |
| **Frontend** | HTML5 + CSS + Vanilla JavaScript | Giữ giao diện trong `dist/`, gọi API qua `fetch('/api/...')` |
| **Backend** | **Python + Flask** | Framework tối giản, dễ học nhất cho người mới; chia tầng OOP (`models/`, `dao/`, `services/`, `routes/`) |
| **Cơ sở dữ liệu** | **MySQL** (`mysql-connector-python`) | Viết SQL thuần tham số `%s`, dùng transaction (`commit`/`rollback`), **không dùng ORM phức tạp** |
| **Kiến trúc** | RESTful JSON API | Flask phục vụ cả API `/api/*` và các tệp tĩnh trong `dist/` trên cùng cổng (tránh lỗi CORS) |

---

## 2. Chi tiết 10 nhóm chức năng đã chốt

### 1) A. Phân quyền & Đăng nhập (Authentication)
- Đăng nhập bằng `username` và `password` (mật khẩu băm an toàn bằng SHA-256 + salt hoặc `werkzeug.security`, không lưu chữ thô).
- Duy trì phiên đăng nhập phía server (`flask.session`).
- Chỉ có **2 vai trò duy nhất**:
  - `manager` (**Quản lý**): Toàn quyền xem báo cáo, giá nhập, nhân sự, ca làm, voucher, chính sách, nhập/xuất/bán/đổi hàng, nhật ký hệ thống.
  - `employee` (**Nhân viên**): Chỉ được lập phiếu nhập kho (không xem/nhập giá vốn), lập phiếu xuất kho, bán hàng/thu ngân, xem hóa đơn/phiếu do chính mình tạo và xem ca làm của mình.
- Kiểm tra quyền chặt chẽ trên Flask API (trả về `401` nếu chưa đăng nhập, `403` nếu sai vai trò).

### 2) B. Bán hàng & Thu ngân (POS - Point of Sale)
- Tìm kiếm nhanh sản phẩm theo tên, mã SKU, danh mục (hỗ trợ gõ tiếng Việt không dấu).
- Chọn sản phẩm, chọn **Size**, nhập số lượng. Chặn số lượng vượt tồn kho khả dụng (`warehouse_qty + counter_qty`) và chặn 2 dòng trùng `(product_code, size_name)` trong cùng một hóa đơn.
- Chọn khách hàng (hoặc `Khách lẻ`).
- **Tự động áp dụng ưu đãi tốt nhất (mỗi hóa đơn 1 ưu đãi):**
  - So sánh tất cả Voucher đang có hiệu lực phù hợp điều kiện (đơn tối thiểu, hạng thành viên, còn lượt dùng).
  - Kiểm tra ưu đãi sinh nhật (đúng ngày sinh, 1 lần/năm, giảm 10% tối đa 100.000đ).
  - Tự động chọn mức giảm cao nhất cho khách.
- **Phân bổ giảm giá theo từng dòng:** Chia tỷ lệ số tiền giảm giá vào từng dòng sản phẩm để lưu `paid_total` (giá trị thực trả của từng món), làm căn cứ tính đúng giá trị khi khách đổi hàng sau này.
- **Thanh toán 2 hình thức:**
  - `Tiền mặt`: Nhập tiền khách đưa $\ge$ tổng cần thu, tự động tính tiền thối lại (`change_amount`).
  - `Chuyển khoản`: Yêu cầu xác nhận đã nhận đủ tiền (`transfer_confirmed = True`), hỗ trợ hiển thị QR nếu có cấu hình.
- Tạo mã hóa đơn tự động (`HD0001`, ...), trừ tồn kho (ưu tiên trừ `counter_qty` trước, thiếu trừ tiếp `warehouse_qty`), tăng `used_count` của voucher, cập nhật chi tiêu & hạng khách hàng, ghi nhật ký kiểm toán, và hỗ trợ in hóa đơn.

### 3) C. Nghiệp vụ Đổi hàng & Trả hàng (Exchange & Returns)
> **ĐIỀU CHỈNH BẮT BUỘC SO VỚI BẢN DEMO CŨ:**
> - **Bỏ hoàn toàn phân loại hàng lỗi:** **Hàng lỗi KHÔNG ĐƯỢC PHÉP ĐỔI**.
> - Hệ thống chỉ nhận đổi đối với sản phẩm **đạt tiêu chuẩn bán lại / còn nguyên vẹn** (`condition_ok = TRUE`). Nếu chọn hoặc gửi trạng thái hàng lỗi, API phải từ chối ngay (`400 Bad Request`).

- Tra cứu hóa đơn gốc trong thời hạn **30 ngày** kể từ ngày mua.
- Chặn đổi vượt quá số lượng khách đã mua trên hóa đơn gốc (tính cả các lần đổi từng phần trước đó).
- Tính giá trị tín dụng hoàn quy đổi (`credit_amount`) dựa trên số tiền **thực trả** (`paid_total`) của từng món ở hóa đơn gốc (kể cả hóa đơn có giảm giá).
- Chính sách đổi ngang giá hoặc cao hơn: tổng giá trị hàng lấy mới (`replacement_total`) phải $\ge$ `credit_amount`. Khách thanh toán thêm phần chênh lệch (`extra_paid = replacement_total - credit_amount`), **không hoàn tiền thừa**.
- Cập nhật kho trong transaction:
  - Cộng lại hàng khách trả (đạt chuẩn) vào **`warehouse_qty`** theo đúng `product_code` và `size_name`.
  - Trừ hàng mới giao cho khách khỏi tồn kho.
- Cộng phần `extra_paid` vào doanh thu ngày lập phiếu đổi và ghi nhật ký kiểm toán.

### 4) D. Quản lý Tồn kho & Hàng hóa (Inventory Management)
> **ĐIỀU CHỈNH BẮT BUỘC SO VỚI BẢN DEMO CŨ:**
> - **KHÔNG có "hàng lỗi chờ xử lý" (`held`)**: Tồn kho đa chiều chỉ quản lý **2 nơi lưu**:
>   1. **`warehouse_qty` (Kho tổng)**
>   2. **`counter_qty` (Quầy bán)**
> - **Quản lý chi tiết theo từng Size của từng mã SKU** (bảng `product_sizes`).
> - Các tính năng khác của mục D giữ nguyên toàn bộ.

- **Quản lý danh mục sản phẩm (SKU):** Thêm, sửa, bật/tắt kinh doanh; quản lý mã SKU, tên, loại (Áo phông, Áo polo, Quần âu, Quần jean, Áo khoác, Balo/Túi, Giày/Dép, Mũ, Dây lưng, Tất, Đồ lót...), giá bán, đơn vị tính, danh sách kích cỡ.
- **Cảnh báo thiếu hàng theo từng Size:** Cảnh báo khi một size cụ thể có tổng tồn (`warehouse_qty + counter_qty`) $\le$ ngưỡng cảnh báo (mặc định `2`). Hỗ trợ ghi chú hàng bán chậm (`slow_moving_note`).
- **Nhập kho (`receipt`):**
  - Chọn nhà cung cấp đang hoạt động, nhập số lượng theo từng size (cộng vào `warehouse_qty`).
  - **Phân quyền giá nhập:** Quản lý nhập kèm `import_price`; Nhân viên chỉ nhập số lượng và giá bán (phiếu ở trạng thái `cost_status = 'pending'`), sau đó Quản lý bổ sung giá nhập hoàn tất (`completeReceiptCost`) mà không làm tăng lại tồn kho.
- **Xuất kho / Điều chuyển (`dispatch` / `transfer`):**
  - Điều chuyển từ **Kho tổng $\leftrightarrow$ Quầy bán** (giữ nguyên tổng tồn cửa hàng, chỉ dịch chuyển giữa `warehouse_qty` và `counter_qty`).
  - Xuất kho ra ngoài (trả kho tổng, trả nhà cung cấp, chuyển chi nhánh): bắt buộc nhập `destination` (nơi nhận) và `reason` (lý do xuất), kiểm tra không vượt tổng tồn và trừ kho.
- **In tem nhãn & Mã vạch QR:** Sinh mã QR theo từng sản phẩm/size trên giao diện để in tem dán nhãn.

### 5) E. Quản lý Khách hàng & Tích điểm (CRM)
- Thêm, sửa, tìm kiếm, lọc và khóa/mở theo dõi hồ sơ khách hàng (`KH001`, ...). Kiểm tra trùng số điện thoại.
- Theo dõi tổng chi tiêu tích lũy, số đơn hàng đã mua, ngày mua gần nhất và lịch sử giao dịch (mua + đổi hàng).
- **Tự động tính hạng thành viên** dựa trên tổng chi tiêu:
  - `Đồng`: $< 2.000.000$ đ
  - `Bạc`: $\ge 2.000.000$ đ
  - `Vàng`: $\ge 5.000.000$ đ
  - `Kim cương`: $\ge 10.000.000$ đ
- Phát hiện khách hàng có sinh nhật hôm nay / tháng hiện tại. Xuất danh sách CSV.

### 6) F. Quản lý Nhân sự & Ca làm việc (HRM & Shifts)
- Quản lý hồ sơ nhân viên (`NV001`, ...): họ tên, SĐT, chức vụ, ngày vào làm, ca thường lệ, loại lương (`monthly` theo tháng hoặc `hourly` theo giờ), mức lương cơ bản / lương giờ, tài khoản và trạng thái hoạt động.
- **Phân ca làm việc (`CA0001`, ...):**
  - Tạo, sửa, xóa ca theo nhân viên, ngày làm, giờ bắt đầu, giờ kết thúc, trạng thái (`planned` / `completed`), ghi chú.
  - Ràng buộc kiểm tra: `end_time > start_time`, không cho xác nhận hoàn thành ca ở ngày tương lai, không cho phân ca trùng khung giờ trong cùng ngày của cùng một nhân viên.
- **Dự toán lương tháng:** Tính tự động số giờ phân công, số giờ đã hoàn thành và ước tính lương tháng (theo tháng hoặc `giờ đã hoàn thành * hourly_rate`). Xuất CSV hồ sơ, lịch ca và bảng dự toán lương.

### 7) G. Quản lý Khuyến mãi & Voucher
- Thêm, sửa, bật/tắt chương trình ưu đãi (`VC001`, ...).
- Cấu hình: mã ưu đãi (`code`), tên chương trình, loại giảm (`percent` hoặc `fixed`), giá trị giảm, mức giảm tối đa (`max_discount`), đơn tối thiểu (`min_order`), ngày bắt đầu/kết thúc, giới hạn số lượt dùng (`usage_limit`), hạng thành viên tối thiểu (`all`, `Đồng`, `Bạc`, `Vàng`, `Kim cương`).
- Trạng thái tự động tính theo ngày và lượt dùng: *Đang áp dụng*, *Sắp diễn ra*, *Hết hạn*, *Hết lượt*, *Đã tắt*. Xuất CSV.

### 8) H. Quản lý Nhà cung cấp (Suppliers)
- Thêm, sửa, bật/tắt hoạt động nhà cung cấp (`NCC001`, ...).
- Lưu tên, người liên hệ, SĐT, email, địa chỉ, ghi chú và xem lịch sử các phiếu nhập kho của từng nhà cung cấp. Xuất CSV.

### 9) I. Báo cáo & Thống kê Điều hành (Analytics & Reports)
- Lọc báo cáo theo kỳ: **Ngày** (24 khung giờ), **Tháng** (từng ngày trong tháng), **Năm** (12 tháng).
- Các chỉ số thống kê chính:
  - Doanh thu thực thu (từ hóa đơn bán + khoản thu thêm khi đổi hàng).
  - Tách riêng doanh thu **Tiền mặt** và **Chuyển khoản**.
  - Tổng đơn bán, tổng phiếu đổi, tổng số lượng sản phẩm đã bán.
  - Tổng tồn kho hiện tại (Kho tổng + Quầy bán), số sản phẩm đang bán, số lượng sản phẩm/size sắp hết, giá trị tồn kho theo giá vốn (cảnh báo nếu còn phiếu nhập chưa điền giá vốn).
  - Bảng xếp hạng sản phẩm bán chạy và doanh thu theo nhân viên.
- Xuất báo cáo CSV cho từng bảng thống kê.

### 10) J. Nhật ký kiểm toán hệ thống (Audit Trail)
- Tự động ghi vào bảng `audit_logs` mỗi khi có thao tác quan trọng: đăng nhập, thêm/sửa sản phẩm, lập phiếu nhập/xuất, bổ sung giá nhập, lập hóa đơn, xử lý đổi hàng, thêm/sửa khách hàng, nhà cung cấp, nhân viên, ca làm, voucher, cập nhật chính sách.
- Mỗi dòng nhật ký lưu: thời điểm (`created_at`), `employee_code`, `employee_name`, tên hành động (`action`), mã đối tượng/chứng từ (`reference_id`), chi tiết bổ sung (`detail`).
- Quản lý xem và lọc nhật ký trên giao diện điều hành.
