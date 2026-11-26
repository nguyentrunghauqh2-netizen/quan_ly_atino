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
   - Mỗi đối tượng trong cửa hàng là một Class (`Product`, `Customer`, `Staff`, `SaleInvoice`, `ExchangeTicket`...).
   - Tính **Đóng gói (Encapsulation)**: Dữ liệu và hàm kiểm tra tính hợp lệ (`validate()`) nằm chung trong class.
2. **Tầng `dao/` (Truy xuất CSDL & Kế thừa):**
   - Tạo lớp cha `BaseDAO` chứa các hàm kết nối MySQL và chạy câu SQL dùng chung (`fetch_one`, `fetch_all`, `execute`).
   - Các lớp con như `ProductDAO(BaseDAO)`, `SaleDAO(BaseDAO)` **kế thừa (Inheritance)** từ `BaseDAO` để tái sử dụng code, chỉ viết câu SQL riêng của từng bảng.
3. **Tầng `services/` (Xử lý nghiệp vụ):**
   - Gồm các class như `SaleService`, `ExchangeService`, `InventoryService`, `ReportService`.
   - Đọc dữ liệu từ DAO, tính toán tiền/tồn kho/khuyến mãi, mở MySQL **Transaction** (`commit` khi thành công, `rollback` nếu lỗi) rồi trả kết quả.
4. **Tầng `routes/` (Giao tiếp HTTP / JSON):**
   - Chỉ nhận JSON từ JavaScript (`fetch`), kiểm tra đăng nhập/vai trò (`manager` hay `employee`), gọi 1 hàm bên `services/` rồi trả JSON về trình duyệt.

---

## 3. Các thuật toán đơn giản trong hệ thống (Dễ đọc, dễ trả lời)

Hệ thống **không dùng thuật toán phức tạp** mà chỉ dùng các bước logic tuần tự dễ hiểu:

### Thuật toán 1: Tính tổng tồn kho & trừ kho theo 2 lớp (Kho tổng + Quầy bán)
- **Mục tiêu:** Bán hàng ưu tiên lấy hàng trưng bày ở Quầy bán trước; nếu quầy hết thì lấy tiếp ở Kho tổng.
- **Các bước:**
  1. Cộng tồn khả dụng: `ton_kha_dung = counter_qty + warehouse_qty`.
  2. Nếu `so_luong_mua > ton_kha_dung` -> báo lỗi hết hàng.
  3. Lấy từ quầy: `tru_quay = min(so_luong_mua, counter_qty)`.
  4. Phần thiếu lấy từ kho tổng: `tru_kho = so_luong_mua - tru_quay`.
  5. Cập nhật `counter_qty -= tru_quay` và `warehouse_qty -= tru_kho`.

### Thuật toán 2: Tự động chọn ưu đãi tốt nhất khi bán hàng
- **Mục tiêu:** Mỗi hóa đơn chỉ áp dụng **1 ưu đãi có lợi nhất** cho khách (Voucher hoặc Sinh nhật).
- **Các bước:**
  1. Tính tạm tính: `tong_goc = tổng (số lượng * đơn giá)`.
  2. Đặt `giam_tot_nhat = 0`.
  3. Duyệt vòng lặp `for` qua các voucher đang bật, còn hạn, còn lượt, đạt đơn tối thiểu và đạt hạng thành viên:
     - Nếu giảm `%`: `tien_giam = (tong_goc * gia_tri) // 100` (nếu có trần `max_discount > 0` thì lấy `min(tien_giam, max_discount)`).
     - Nếu giảm tiền cố định: `tien_giam = min(tong_goc, gia_tri)`.
     - Nếu `tien_giam > giam_tot_nhat` -> cập nhật `giam_tot_nhat` và lưu lại voucher đó.
  4. Kiểm tra sinh nhật khách hàng (đúng ngày sinh và chưa dùng trong năm nay) -> tính `giam_sinh_nhat = min(100_000, tong_goc * 10 // 100)`. Nếu lớn hơn `giam_tot_nhat` thì ưu tiên dùng ưu đãi sinh nhật.

### Thuật toán 3: Phân bổ tiền giảm giá về từng dòng hóa đơn
- **Tại sao cần?** Nếu hóa đơn 300.000đ được giảm còn 270.000đ rồi sau đó khách quay lại đổi 1 món trong hóa đơn đó, cửa hàng phải hoàn đổi đúng số tiền khách đã **thực trả** cho món đó chứ không tính theo giá gốc 300.000đ.
- **Cách làm (chia tỷ lệ nguyên):**
  1. Với mỗi dòng hàng: `phan_giam = (tong_giam * gia_tri_dong) // tong_goc`.
  2. Do phép chia nguyên có thể thiếu vài đồng lẻ, tính `phan_du = tong_giam - sum(phan_giam)`.
  3. Dùng vòng lặp `for` cộng thêm `1` đồng giảm giá vào từng dòng đầu tiên cho tới khi hết `phan_du`.
  4. `paid_total` (tiền thực trả của dòng) = `gia_tri_dong - phan_giam`.

### Thuật toán 4: Kiểm tra đổi hàng (Không đổi hàng lỗi)
- **Các bước tuần tự:**
  1. Kiểm tra hóa đơn gốc có tồn tại và `(ngay_hien_tai - ngay_mua) <= 30 ngày`.
  2. **Kiểm tra tình trạng sản phẩm trả:** Bắt buộc là hàng nguyên vẹn đạt tiêu chuẩn (`condition_ok = True`). Nếu là hàng lỗi -> từ chối ngay.
  3. Kiểm tra số lượng đổi $\le$ `so_luong_mua_ban_dau - so_luong_da_doi_truoc_do`.
  4. Cộng tổng tiền thực trả của các món trả lại thành `credit_amount`.
  5. Tính tổng tiền các món khách lấy mới (`replacement_total`). Nếu `replacement_total < credit_amount` -> báo lỗi vì không hoàn tiền thừa.
  6. Trong 1 Transaction: cộng hàng trả về `warehouse_qty`, trừ hàng mới lấy từ `counter_qty`/`warehouse_qty`, lưu phiếu đổi và ghi `audit_logs`.

### Thuật toán 5: Chống trùng giờ khi phân ca làm việc
- Hai ca làm `(start_1, end_1)` và `(start_2, end_2)` của cùng 1 nhân viên trong cùng 1 ngày bị trùng nhau khi và chỉ khi:
  `start_1 < end_2 AND end_1 > start_2`
- Chỉ cần 1 câu SQL `SELECT COUNT(*)` kiểm tra điều kiện này trước khi lưu ca mới.

### Thuật toán 6: Tìm kiếm tiếng Việt không dấu
- Ở frontend (`search.js`) hoặc backend: chuyển chuỗi về chữ thường, chuẩn hóa Unicode (`unicodedata.normalize('NFD', text)` ở Python) và bỏ dấu thanh tiếng Việt, rồi dùng phép kiểm tra chuỗi con (`keyword in normalized_text`) hoặc `LIKE %keyword%` trong SQL.
