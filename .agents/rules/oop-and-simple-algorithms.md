# Quy tắc Lập trình Hướng đối tượng (OOP) & Thuật toán đơn giản

Áp dụng cho toàn bộ mã nguồn Python Backend trong `backend/`. Mục tiêu cao nhất là **code sạch, chuẩn OOP, tách trách nhiệm rõ ràng để sinh viên đọc vào có thể giải thích được từng class, từng hàm khi vấn đáp với giảng viên**.

## 1. Nguyên tắc OOP bắt buộc

1. **Đóng gói (Encapsulation):**
   - Mỗi thực thể nghiệp vụ là một class trong `backend/models/` với `__init__` rõ ràng các thuộc tính.
   - Mọi logic kiểm tra dữ liệu (validate số lượng > 0, giá > 0, ngày hợp lệ...) đặt vào phương thức rõ tên (ví dụ `validate()`, `to_dict()`).
2. **Tách lớp theo 3 tầng dễ hiểu (Model - DAO - Service - Route):**
   - **Model (`backend/models/`):** Định nghĩa dữ liệu đối tượng (`Staff`, `Product`, `ProductSize`, `Customer`, `Voucher`, `SaleInvoice`, `ExchangeTicket`, `StockDocument`, `Shift`, `Supplier`, `AuditLog`).
   - **DAO (`backend/dao/`):** Chứa class kế thừa từ `BaseDAO` (kế thừa - Inheritance). `BaseDAO` giữ hàm kết nối MySQL và thực thi truy vấn chung (`fetch_one`, `fetch_all`, `execute`). Các lớp con (`ProductDAO`, `SaleDAO`...) chỉ viết câu SQL đơn giản, tham số hóa `%s` (tránh SQL Injection).
   - **Service (`backend/services/`):** Chứa toàn bộ nghiệp vụ. Không viết câu lệnh SQL trực tiếp trong `routes/` hay `services/` (trừ điều phối transaction qua `db` connection).
   - **Route (`backend/routes/`):** Chỉ đọc `request.get_json()`, gọi đúng 1 hàm trong `Service`, trả `jsonify(...)` cùng HTTP status code (`200`, `201`, `400`, `401`, `403`, `404`).
3. **Kế thừa & Đa hình vừa đủ, dễ giải thích:**
   - Ví dụ: `BaseDAO` làm lớp cha cho các lớp DAO; `BaseService` hoặc lớp `Person` (cha của `Staff` và `Customer`) nếu thực sự tự nhiên và dễ giải thích. Không lạm dụng kế thừa sâu quá 2 cấp.

## 2. Quy chuẩn đặt tên & Docstring

- Tên class dùng `PascalCase` (ví dụ: `SaleService`, `InventoryDAO`).
- Tên hàm và biến dùng `snake_case` có nghĩa tiếng Anh chuẩn, kèm comment/docstring **tiếng Việt ngắn gọn** giải thích mục đích hàm và các bước:
  ```python
  def tinh_hang_thanh_vien(self, tong_chi_tieu: int) -> str:
      """Xác định hạng thành viên dựa trên tổng tiền đã chi tiêu."""
      if tong_chi_tieu >= 10_000_000:
          return "Kim cương"
      if tong_chi_tieu >= 5_000_000:
          return "Vàng"
      if tong_chi_tieu >= 2_000_000:
          return "Bạc"
      return "Đồng"
  ```
- Mỗi hàm chỉ nên dài khoảng **15–40 dòng**, lồng nhau tối đa 2–3 cấp `if/for`. Nếu dài hơn, tách thành hàm phụ có tên rõ nghĩa (ví dụ `_chon_voucher_tot_nhat`, `_phan_bo_giam_gia`).

## 3. Giới hạn thuật toán (Ưu tiên dễ học, dễ vấn đáp)

- **Tìm kiếm & Lọc:** Dùng SQL `WHERE ... LIKE %s` hoặc duyệt vòng `for` tuyến tính trên danh sách nhỏ.
- **Tính tổng & Thống kê:** Dùng SQL `SUM()`, `COUNT()`, `GROUP BY` hoặc vòng `for` cộng dồn đơn giản.
- **Chọn khuyến mãi tốt nhất:** Duyệt qua danh sách voucher đang hợp lệ bằng 1 vòng `for`, tính số tiền giảm của từng voucher, so sánh lấy giá trị `max_discount_amount`, rồi so tiếp với ưu đãi sinh nhật (nếu đủ điều kiện).
- **Phân bổ giảm giá theo từng dòng sản phẩm (để tính đúng giá trị khi đổi hàng):**
  - Dùng công thức chia tỷ lệ nguyên: `phan_giam = (tong_giam * gia_tri_dong) // tong_hoa_don`.
  - Phần dư (vài đồng lẻ do chia nguyên) cộng lần lượt `1` đồng cho từng dòng bằng một vòng `for` cho đến khi hết phần dư (`du = tong_giam - sum(phan_giam)`).
- **Chống trừ âm tồn kho khi nhiều người bấm lưu cùng lúc:** Dùng SQL Transaction (`conn.start_transaction()`, `SELECT ... FOR UPDATE`, `commit()`, `rollback()`).
- **Cấm dùng:** List/dict comprehension lồng nhau nhiều tầng khó đọc, `lambda` phức tạp, `functools.reduce`, metaclass, hoặc thư viện magic khó giải thích.
