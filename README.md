# quan_ly_atino — Hệ thống Quản lý Cửa hàng Thời trang Atino

Dự án xây dựng phần mềm quản lý cửa hàng thời trang **Atino** theo mô hình **Frontend (HTML, CSS, JavaScript thuần) + Backend API (Python Flask OOP) + Cơ sở dữ liệu MySQL**.

---

## 1. Cấu trúc quy hoạch Repository

```text
quan_ly_atino/
├── AGENTS.md                         # Quy tắc chung bắt buộc cho AI Agent khi lập trình
├── README.md                         # Tài liệu tổng quan dự án
├── RA-SOAT.md                        # Nhật ký rà soát bản giao diện v9 ban đầu
├── .gitignore                        # Bỏ qua tệp tạm Python, .env, IDE, OS
├── .agents/
│   ├── rules/
│   │   ├── oop-and-simple-algorithms.md  # Quy chuẩn OOP & thuật toán dễ hiểu để vấn đáp
│   │   └── business-constraints.md       # Quy ước nghiệp vụ đã chốt (bỏ held, không đổi hàng lỗi)
│   └── skills/
│       ├── python-oop-backend/SKILL.md       # Hướng dẫn dựng Backend Flask OOP
│       ├── mysql-database-setup/SKILL.md     # Hướng dẫn tạo CSDL MySQL theo ERD
│       ├── frontend-api-integration/SKILL.md # Hướng dẫn nối Frontend JS fetch('/api/...')
│       └── viva-defense-readiness/SKILL.md   # Checklist kiểm tra trước khi bảo vệ đồ án
├── docs/
│   ├── SPEC-CHUC-NANG.md             # Đặc tả chi tiết 10 nhóm chức năng đã chốt
│   ├── ERD-ATINO.md                  # Tài liệu ERD & thiết kế 15 bảng MySQL (cho Agent)
│   ├── ERD-ATINO.docx                # Tài liệu ERD bản Word kèm sơ đồ (để đọc & nộp báo cáo)
│   ├── erd-atino.png                 # Ảnh sơ đồ ERD 15 bảng
│   └── HUONG-DAN-VAN-DAP.md          # Giải thích kiến trúc & thuật toán dễ học để vấn đáp
├── dist/                             # Mã nguồn Frontend tĩnh (HTML, CSS, JS thuần)
└── backend/                          # (Dành cho Agent triển khai Backend Python Flask + MySQL)
```

---

## 2. 10 nhóm chức năng đã chốt

1. **A. Phân quyền & Đăng nhập (Authentication)** — 2 vai trò: Quản lý & Nhân viên.
2. **B. Bán hàng & Thu ngân (POS)** — Tìm kiếm nhanh, tồn kho theo size, tự động chọn ưu đãi tốt nhất, tiền mặt/chuyển khoản, in hóa đơn.
3. **C. Nghiệp vụ Đổi hàng & Trả hàng** — Trong 30 ngày, đổi ngang hoặc cao hơn giá thực trả, thu chênh lệch, **chỉ nhận hàng đạt tiêu chuẩn (không đổi hàng lỗi)**.
4. **D. Quản lý Tồn kho & Hàng hóa** — Quản lý chi tiết theo từng Size của SKU tại **Kho tổng** và **Quầy bán** (**không có trạng thái hàng lỗi chờ xử lý**), cảnh báo hết size, nhập/xuất/điều chuyển, in tem QR.
5. **E. Quản lý Khách hàng & Tích điểm (CRM)** — Tự động phân hạng Đồng / Bạc / Vàng / Kim cương, ưu đãi sinh nhật.
6. **F. Quản lý Nhân sự & Ca làm việc (HRM & Shifts)** — Hồ sơ, phân ca (chặn trùng giờ), dự toán lương.
7. **G. Quản lý Khuyến mãi & Voucher** — Giảm % hoặc tiền cố định theo hạng thẻ, thời hạn và lượt dùng.
8. **H. Quản lý Nhà cung cấp (Suppliers)** — Danh bạ nhà cung cấp và lịch sử nhập hàng.
9. **I. Báo cáo & Thống kê Điều hành** — Doanh thu ngày/tháng/năm, tách tiền mặt/chuyển khoản, top sản phẩm, xuất CSV.
10. **J. Nhật ký kiểm toán hệ thống (Audit Trail)** — Ghi vết mọi thao tác quan trọng theo nhân viên và chứng từ.

---

## 3. Hướng dẫn cho Agent lập trình tiếp

Khi bắt đầu viết Backend và nối API, hãy đọc theo thứ tự:
1. [AGENTS.md](AGENTS.md)
2. [docs/SPEC-CHUC-NANG.md](docs/SPEC-CHUC-NANG.md)
3. [docs/ERD-ATINO.md](docs/ERD-ATINO.md)
4. Các skill trong `.agents/skills/`

---

## 4. Chạy thử bản Frontend tĩnh hiện tại

```sh
python3 -m http.server 3000 --directory dist
```

Mở [http://localhost:3000](http://localhost:3000) và đăng nhập bằng tài khoản demo có sẵn.
