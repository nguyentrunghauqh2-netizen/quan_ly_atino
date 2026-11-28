# HƯỚNG DẪN KIẾN TRÚC & ÔN TẬP VẤN ĐÁP (PYTHON FLASK + MYSQL + OOP)

Tài liệu này giúp bạn hiểu rõ **vì sao chọn Flask + MySQL**, **cấu trúc OOP hoạt động ra sao**, và **cách giải thích từng thuật toán** khi thầy/cô hỏi vấn đáp.

---

## 1. Vì sao chọn Python + Flask cho người mới học?

1. **Tối giản nhất trong Python:** Một API trong Flask chỉ mất vài dòng code (`@app.route('/api/products')`), không ép buộc cấu trúc phức tạp hay cơ chế bất đồng bộ `async/await` khó giải thích như FastAPI, cũng không nặng nề như Django.
2. **Dùng SQL thuần với `mysql-connector-python`:** Bạn nhìn trực tiếp thấy câu `SELECT`, `INSERT`, `UPDATE` trong lớp DAO, không phải giải thích các cơ chế phức tạp của ORM (như SQLAlchemy session lifecycle).
3. **Khớp sẵn với Frontend hiện có:** Giao diện trong `dist/index.html` vốn dĩ đã thiết kế sẵn hàm gọi `fetch('/api/...')` hướng về Flask.

---

## 2. Cách giải thích kiến trúc OOP (4 tầng rõ ràng)

Khi thầy/cô hỏi *"Em tổ chức code theo hướng đối tượng như thế nào?"*, bạn trả lời ngắn gọn theo 4 tầng:

1. **Tầng `models/` (Đóng gói thực thể):**
   - Mỗi đối tượng trong cửa hàng là một Class (`Product`, `ProductSize`, `Customer`, `Staff`, `Shift`, `SaleInvoice`, `ExchangeTicket`...).
   - Tính **Đóng gói (Encapsulation)**: Dữ liệu và hàm kiểm tra tính hợp lệ (`validate()`) nằm chung trong class.
2. **Tầng `dao/` (Truy xuất CSDL & Kế thừa):**
   - Tạo lớp cha `BaseDAO` chứa các hàm kết nối MySQL và chạy câu SQL dùng chung (`fetch_one`, `fetch_all`, `execute`).
   - Các lớp con như `ProductDAO(BaseDAO)`, `SaleDAO(BaseDAO)` **kế thừa (Inheritance)** từ `BaseDAO` để tái sử dụng code, chỉ viết câu SQL riêng của từng bảng.
3. **Tầng `services/` (Xử lý nghiệp vụ):**
   - Gồm các class như `AuthService`, `InventoryService`, `SaleService`, `ExchangeService`, `CrmService`, `HrmService`, `ReportService`.
   - Đọc dữ liệu từ DAO, kiểm tra điều kiện nghiệp vụ, mở MySQL **Transaction** (`commit` khi thành công, `rollback` nếu lỗi) rồi trả kết quả.
4. **Tầng `routes/` (Giao tiếp HTTP / JSON):**
   - Chỉ nhận JSON từ JavaScript (`fetch`), kiểm tra đăng nhập và vai trò (`manager` hay `employee`), gọi 1 hàm bên `services/` rồi trả JSON về trình duyệt.

---

## 3. Các thuật toán đơn giản trong hệ thống (Dễ đọc, dễ trả lời)

Hệ thống **không dùng thuật toán phức tạp** mà chỉ dùng các bước logic tuần tự dễ hiểu:

### Thuật toán 1: Quản lý tồn kho 1 số chung theo mã và kích cỡ
- Mỗi `(mã sản phẩm, kích cỡ)` có **một số lượng tồn chung duy nhất** (`stock_qty`) trong cửa hàng.
- Phiếu nhập kho cộng số lượng vào `stock_qty` của dòng tương ứng.
- Khi bán hàng hoặc xuất kho ra ngoài, kiểm tra `so_luong_mua <= stock_qty` trong SQL Transaction. Nếu đủ thì trừ `stock_qty` và ghi chứng từ; nếu thiếu thì báo số lượng còn lại.

### Thuật toán 2: Tính tiền hóa đơn & Phân biệt Người bán / Thu ngân
- Nhân số lượng với đơn giá niêm yết của từng dòng (`qty * unit_price`) và cộng thành `gross_amount`.
- Nếu đúng ngày sinh của khách có hồ sơ, lấy 10% của `gross_amount`, làm tròn đến đồng và giới hạn theo phần còn lại của 200.000đ sau khi trừ ưu đãi đã dùng trong ngày. Ví dụ, khách đã giảm 150.000đ thì hóa đơn tiếp theo chỉ được giảm thêm tối đa 50.000đ.
- Phân bổ khoản giảm theo giá trị từng dòng, sau đó chia các đồng lẻ còn lại theo thứ tự dòng. Lưu số tiền thực trả của từng dòng (`paid_total`). Cộng các khoản thực trả thành `total_amount`.
- Lưu cả `seller_code` (người bán để thống kê doanh thu nhân viên) và `cashier_code` (thu ngân thu tiền).

### Thuật toán 3: Kiểm tra đổi hàng (Trong 30 ngày, không đổi hàng lỗi)
1. Kiểm tra hóa đơn gốc có tồn tại và `(ngay_hien_tai - ngay_mua) <= 30 ngày`.
2. **Kiểm tra tình trạng sản phẩm trả:** Bắt buộc là hàng còn nguyên vẹn (`condition_ok = True`). Nếu là hàng lỗi → từ chối ngay.
3. Tính tổng số lượng đã đổi ở các phiếu đổi trước đó để đảm bảo không đổi vượt quá số lượng đã mua.
4. Tính tiền của số chiếc trả theo tỷ lệ trên `paid_total` từng dòng. Lấy giá trị lũy kế của số chiếc đã đổi và đang đổi, rồi trừ giá trị đã ghi nhận ở các phiếu trước. Cộng các khoản này thành `credit_amount`.
5. Tính tổng tiền các món khách lấy mới (`replacement_total`). Nếu `replacement_total < credit_amount` → báo lỗi vì không hoàn tiền thừa.
6. Trong cùng một SQL Transaction: cộng lại hàng trả vào `stock_qty`, trừ hàng mới lấy khỏi `stock_qty`, lưu phiếu đổi và ghi `audit_logs`.

### Thuật toán 4: Cảnh báo thiếu hàng & Hàng tồn lâu chưa bán
- Với mỗi sản phẩm đang bán, duyệt các kích cỡ:
  - Nếu tổng tồn `= 0` → cảnh báo **Hết hàng**.
  - Nếu có kích cỡ tồn `= 0` → cảnh báo **Hết size**.
  - Nếu tổng tồn `<= ngưỡng` (mặc định `2`) → cảnh báo **Sắp hết hàng**.
  - Nếu có kích cỡ tồn `<= ngưỡng` → cảnh báo **Sắp hết size**.
- Nếu sản phẩm còn tồn (`> 0`) và ngày nhập/bán gần nhất cách hiện tại `>= 30 ngày` → đưa vào danh sách hàng lâu chưa bán.

### Thuật toán 5: Chống trùng giờ khi phân ca & Dự toán lương
- Hai ca làm `(start_1, end_1)` và `(start_2, end_2)` của cùng 1 nhân viên trong cùng 1 ngày bị trùng nhau khi và chỉ khi:
  `start_1 < end_2 AND end_1 > start_2`
- Dự toán lương tháng: Nếu nhân viên hưởng lương tháng thì lấy `base_salary`; nếu hưởng lương theo giờ thì cộng tổng số giờ các ca đã hoàn thành (`status = 'completed'`) nhân với `hourly_rate`.

### Thuật toán 6: Tìm kiếm tiếng Việt không dấu
- Chuyển chuỗi về chữ thường, chuẩn hóa Unicode (`unicodedata.normalize('NFD', text)` ở Python) để loại bỏ dấu thanh tiếng Việt, rồi dùng phép kiểm tra chuỗi con (`keyword in normalized_text`) hoặc `LIKE %keyword%` trong SQL.
