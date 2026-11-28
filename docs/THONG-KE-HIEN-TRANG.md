# Thống kê dự án Atino ngày 27/11/2026

## Phạm vi và nguồn

Đối chiếu yêu cầu của chủ cửa hàng với AGENTS.md, hai tệp trong .agents/rules, bốn skill chuyên môn (Flask OOP, MySQL, nối API, vấn đáp), đặc tả, ERD, hướng dẫn vấn đáp và mã giao diện trong dist. Bảng dưới tổng hợp nghiệp vụ. Đây là rà soát mã và tài liệu, chưa phải kiểm thử từng luồng bằng tài khoản thực tế.

| Nhóm theo đặc tả | Quyết định hoặc phạm vi cần giữ |
|---|---|
| Tài khoản | Quản lý và nhân viên có quyền riêng. Có hồ sơ cá nhân, đổi mật khẩu và khôi phục tài khoản. Chỉ quản lý xem giá nhập. |
| Hàng hóa và tem | Mỗi mã hàng và kích cỡ có một số lượng trong cửa hàng. Cảnh báo phân biệt hết cả sản phẩm, hết hoặc sắp hết từng size và hàng lâu chưa bán. Xếp loại theo số chiếc bán trong tháng. Dưới 5 là chậm, 5–30 ổn định, trên 30 bán chạy. Mã trên web, hóa đơn, Excel và tem phải thống nhất. Tem có tên công ty. |
| Nhập, xuất và nhà cung cấp | NCC001 là Kho tổng của Công ty TNHH Thời Trang Minh AM, nguồn giao hàng cho cửa hàng. Liên hệ gồm điện thoại và email. Khi nhập, ghi nhân viên xác nhận, gom mặt hàng theo mã và mở chi tiết từng cỡ. Bổ sung giá sau chỉ cập nhật tiền. Xuất cần nơi nhận bên ngoài. |
| Bán hàng | Phân biệt người bán và thu ngân. Tiền mặt có tiền trả lại, chuyển khoản phải xác nhận. Đã bỏ ưu đãi và mã giảm giá. |
| Đổi hàng | Tra theo hóa đơn gốc, tối đa 30 ngày, nhận hàng nguyên vẹn. Tổng lượng đổi nhiều lần không vượt lượng mua. Thu phần chênh lệch khi đổi lên, không hoàn tiền thừa. |
| Khách hàng | Hồ sơ, số điện thoại, chi tiêu và lịch sử giao dịch. |
| Nhân sự | Hồ sơ, phân ca, lương tháng hoặc giờ và dự toán. Doanh thu theo người bán. Có thể tra phiếu bán và phiếu đổi của nhân viên. |
| Báo cáo | Tổng quan cho tra chứng từ và sản phẩm từ chỉ số. Báo cáo Excel chia cột; theo dõi thực thu, thanh toán, sản phẩm bán tốt và doanh thu nhân viên. |
| Chính sách và nhật ký | Lưu chính sách cửa hàng và người thực hiện thao tác để truy lại chứng từ. |

## Những điểm cần xử lý theo thứ tự

1. **Lưu trữ dùng chung.** Web v12 đã phát hành ở dạng tĩnh. Mã dist/assets/erp.js dùng AtinoDemo.transact và dữ liệu trình duyệt. Flask, MySQL, SQL tham số và bốn tầng model, DAO, service, route là thiết kế đích. Chưa thấy bộ mã backend hoặc schema SQL của Atino trong danh sách tệp dự án. Chưa thể coi hai máy nhân viên là đang dùng chung sổ hàng.
2. **Điều kiện lưu phiếu đổi.** ERD mô tả exchanges.reason là NOT NULL trong khi web đã bỏ nhập lý do. Trước khi viết SQL, bỏ ràng buộc bắt người dùng cung cấp giá trị này và giữ khả năng đọc chứng từ cũ.
3. **Đánh giá hàng hóa.** Đặc tả còn yêu cầu quản lý ghi lý do và hướng xử lý. Chủ cửa hàng đã chọn xếp loại tự động theo số chiếc. Cần sửa đặc tả và phân biệt ngưỡng cảnh báo số lượng với xếp loại bán chạy.


## Số bảng, tài liệu và thư mục

ERD-ATINO.md hiện liệt kê **12 bảng nghiệp vụ và 2 bảng hệ thống**, tổng cộng 14. Hai bảng hệ thống là store_settings và audit_logs. Thông tin tem và đánh giá đã gộp vào products. Vì vậy chỉ riêng việc gộp này không đưa tổng số bảng từ 14 xuống 12.

Trong docs có đặc tả, hướng dẫn vấn đáp, ERD dạng Markdown và Word. Hai ảnh PNG được nhắc trong đề xuất trước chưa thấy trong danh sách tệp. ClothesShopManagement-App là nguồn C# tham khảo, còn .sites-publish-work là thư mục tạm khi phát hành. Hai tên này chưa có mục riêng trong .gitignore. Khi dọn, nên giữ bản tham khảo trên máy và loại hai thư mục khỏi danh sách theo dõi nếu còn cần dùng.
