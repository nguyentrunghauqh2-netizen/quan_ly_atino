# Quy tắc Lập trình Hướng đối tượng (OOP) & Thuật toán đơn giản

Áp dụng cho toàn bộ mã nguồn Python Backend trong `backend/`. Mục tiêu cao nhất là **code sạch, chuẩn OOP, tách trách nhiệm rõ ràng để sinh viên đọc vào có thể giải thích được từng class, từng hàm khi vấn đáp với giảng viên**.

## 1. Nguyên tắc OOP bắt buộc

1. **Đóng gói (Encapsulation):**
   - Mỗi thực thể nghiệp vụ là một class trong `backend/models/` với `__init__` rõ ràng các thuộc tính.
   - Mọi logic kiểm tra dữ liệu (validate số lượng > 0, giá > 0, ngày hợp lệ...) đặt vào phương thức rõ tên (ví dụ `validate()`, `to_dict()`).
2. **Tách lớp theo 4 tầng dễ hiểu (Model - DAO - Service - Route):**
   - **Model (`backend/models/`):** Định nghĩa các thực thể: `Staff`, `Shift`, `Supplier`, `Product`, `ProductSize`, `Customer`, `StockDocument`, `SaleInvoice`, `ExchangeTicket`, `StoreSettings`, `AuditLog`.
   - **DAO (`backend/dao/`):** Chứa các class kế thừa từ `BaseDAO` (tính Kế thừa - Inheritance). `BaseDAO` giữ hàm chạy SQL dùng chung (`fetch_one`, `fetch_all`, `execute`). Các lớp con chỉ viết câu SQL thuần tham số `%s` (chống SQL Injection).
   - **Service (`backend/services/`):** Chứa toàn bộ xử lý nghiệp vụ và điều phối SQL Transaction (`start_transaction()`, `commit()`, `rollback()`).
   - **Route (`backend/routes/`):** Chỉ đọc `request.get_json()`, kiểm tra quyền (`manager` / `employee`), gọi 1 hàm trong `Service`, trả `jsonify(...)` cùng mã HTTP chuẩn (`200`, `201`, `400`, `401`, `403`, `404`).
3. **Kế thừa vừa đủ, dễ giải thích:**
   - Dùng `BaseDAO` làm lớp cha cho mọi DAO. Không tạo kế thừa sâu quá 2 cấp hay pattern phức tạp.

## 2. Quy chuẩn đặt tên & Docstring

- Tên class dùng `PascalCase` (ví dụ: `SaleService`, `ProductDAO`).
- Tên hàm và biến dùng `snake_case` rõ nghĩa, kèm docstring **tiếng Việt ngắn gọn** giải thích đầu vào, các bước xử lý và đầu ra.
- Mỗi hàm dài khoảng **15–40 dòng**, lồng nhau tối đa 2–3 cấp `if/for`. Nếu dài hơn, tách thành hàm phụ có tên rõ nghĩa.

## 3. Giới hạn thuật toán (Ưu tiên dễ học, dễ vấn đáp)

- **Tìm kiếm & Lọc:** Dùng SQL `WHERE ... LIKE %s` hoặc chuẩn hóa bỏ dấu tiếng Việt với `unicodedata.normalize('NFD', text)` rồi kiểm tra chuỗi con.
- **Tính tổng & Thống kê:** Dùng SQL `SUM()`, `COUNT()`, `GROUP BY` hoặc vòng `for` cộng dồn.
- **Cộng / Trừ tồn kho (`stock_qty`):** Một số tồn chung cho mỗi `(product_code, size_name)`. Nhập kho cộng vào `stock_qty`; Bán hoặc Xuất trừ khỏi `stock_qty` sau khi kiểm tra `qty <= stock_qty` trong SQL Transaction.
- **Tính tiền thực trả từng dòng (`paid_total`) khi đọc chứng từ cũ:** Giữ nguyên `paid_total` đã lưu nếu khớp tổng đơn; nếu chứng từ cũ có chênh lệch tổng thì chia tỷ lệ nguyên và cộng phần dư từng 1 đồng bằng vòng `for`.
- **Chống trùng giờ khi phân ca:** Kiểm tra `start_1 < end_2 AND end_1 > start_2` trong cùng ngày của cùng 1 nhân viên.
- **Cấm dùng:** List/dict comprehension lồng nhiều tầng khó đọc, `lambda` phức tạp, `functools.reduce`, metaclass, hoặc thư viện ORM/async phức tạp.
