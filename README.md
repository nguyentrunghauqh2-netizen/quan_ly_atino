# quan_ly_atino — Hệ thống Quản lý Cửa hàng Thời trang Atino

Bản đang chạy dùng HTML, CSS và JavaScript trong `dist/`. Dữ liệu cửa hàng được lưu bằng IndexedDB trong trình duyệt. Flask và MySQL là kiến trúc dự kiến cho giai đoạn triển khai máy chủ.

---

## 1. Cấu trúc Repository

```text
quan_ly_atino/
├── AGENTS.md                         # Quy tắc chung bắt buộc cho AI Agent khi lập trình
├── README.md                         # Tài liệu tổng quan dự án
├── RA-SOAT.md                        # Nhật ký rà soát bản giao diện v9 ban đầu
├── .gitignore                        # Bỏ qua tệp tạm Python, .env, IDE, OS
├── .agents/
│   ├── rules/
│   │   ├── oop-and-simple-algorithms.md  # Quy chuẩn OOP & thuật toán dễ hiểu để vấn đáp
│   │   └── business-constraints.md       # Quy ước nghiệp vụ chốt (khớp bản web mới nhất)
│   └── skills/
│       ├── python-oop-backend/SKILL.md       # Hướng dẫn dựng Backend Flask OOP
│       ├── mysql-database-setup/SKILL.md     # Hướng dẫn tạo 14 bảng MySQL theo ERD
│       ├── frontend-api-integration/SKILL.md # Hướng dẫn nối Frontend JS fetch('/api/...')
│       └── viva-defense-readiness/SKILL.md   # Checklist kiểm tra trước khi bảo vệ đồ án
├── docs/
│   ├── SPEC-CHUC-NANG.md             # Đặc tả chi tiết toàn bộ chức năng đã chốt
│   ├── ERD-ATINO.md                  # Tài liệu ERD & thiết kế 14 bảng MySQL (cho Agent)
│   ├── ERD-ATINO.docx                # Tài liệu ERD bản Word thuần tiếng Việt kèm 2 sơ đồ
│   ├── erd-tong-quan.png             # Sơ đồ tổng quan quan hệ dữ liệu (thuần tiếng Việt)
│   ├── erd-atino.png                 # Sơ đồ chi tiết 14 bảng & thuộc tính (thuần tiếng Việt)
│   └── HUONG-DAN-VAN-DAP.md          # Giải thích kiến trúc & thuật toán dễ học để vấn đáp
└── dist/                             # Mã nguồn Frontend tĩnh (HTML, CSS, JS thuần)
    └── assets/documents.js           # Mẫu Hóa đơn Nhập / Xuất (chuyển kho) và Hóa đơn bán hàng (bản in có QR)
```

---

## 2. Chức năng & Quy tắc nghiệp vụ đã chốt

1. **Đăng nhập, Phân quyền & Tài khoản cá nhân:** 2 vai trò (`manager` và `employee`), hồ sơ cá nhân, ảnh đại diện, đổi mật khẩu, mã khôi phục mật khẩu dùng 1 lần.
2. **Sản phẩm, Tem nhãn & Tồn kho chung theo từng Size:** Tồn kho dùng **1 số lượng chung (`stock_qty`)** cho mỗi `(sản phẩm, kích cỡ)` — không tách Kho tổng/Quầy bán, không có hàng lỗi chờ xử lý (`held`); gộp thông tin in tem nhãn (mã vạch + QR) và đánh giá tồn vào sản phẩm.
3. **Nhập / Xuất kho & 1 Nhà cung cấp đầu mối (`NCC001`):** Nhập hàng cộng `stock_qty` (Quản lý nhập/bổ sung giá vốn, Nhân viên chỉ nhập số lượng và giá bán); xuất kho chỉ xuất ra ngoài cửa hàng.
4. **Bán hàng & Thu ngân (POS):** Tách Người bán và Thu ngân, không có voucher/giảm giá sinh nhật, thanh toán Tiền mặt/Chuyển khoản, in hóa đơn.
5. **Đổi hàng:** Trong vòng 30 ngày, **chỉ nhận hàng nguyên vẹn đạt chuẩn (từ chối hàng lỗi)**, đổi ngang hoặc cao hơn giá thực trả và thu chênh lệch.
6. **Khách hàng (CRM):** Lưu hồ sơ, tra cứu lịch sử đơn theo mã khách hàng.
7. **Nhân sự & Ca làm (HRM):** Hồ sơ, phân ca (chặn trùng giờ), dự toán lương tháng.
8. **Báo cáo & Xuất Excel (`.xlsx`):** Doanh thu ngày/tháng/năm, Tiền mặt vs Chuyển khoản, top sản phẩm, doanh thu theo người bán, xuất file Excel nhiều sheet.
9. **Chính sách & Nhật ký kiểm toán:** Quản lý điều kiện đổi hàng và tra cứu lịch sử thao tác (`audit_logs`).

---

## 3. Chạy thử bản Frontend tĩnh hiện tại

```sh
python3 -m http.server 3000 --directory dist
```

Mở [http://localhost:3000](http://localhost:3000) và đăng nhập bằng tài khoản demo có sẵn.
