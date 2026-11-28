# Kiểm tra bản web Atino

Bản Sites 9, mã nguồn `700c30c`. Các bước lưu giao dịch được kiểm tra bằng dữ liệu thử trên bản sao cục bộ. Bản đang chạy yêu cầu đăng nhập, nên chưa kiểm tra trực tiếp các màn hình sau đăng nhập.

## Đã kiểm tra

- Nhập kho ghi nhận số lượng theo từng kích cỡ.
- Bán hàng chặn số lượng vượt tồn và các dòng trùng sản phẩm và kích cỡ. Gửi lại cùng lần lưu chỉ tạo một hóa đơn. Tiền mặt yêu cầu khách đưa đủ. Chuyển khoản yêu cầu xác nhận đã nhận tiền.
- Đổi từng phần trên cùng hóa đơn tính đúng tổng giá trị hàng trả theo số tiền khách đã trả, kể cả hóa đơn có giảm giá.
- Báo cáo ngày, tháng và năm ghi nhận khoản thu thêm khi đổi hàng và tách tiền mặt với chuyển khoản. Với hóa đơn cũ có giá gốc 300.000 đ và thực thu 272.999 đ, bản 8 còn cộng 300.000 đ vào doanh thu theo sản phẩm. Bản 9 đã tính đúng 272.999 đ.

## Ghi nhận tại thời điểm rà soát bản 9

- Hàng mua ở kỳ trước và trả khi đổi trong kỳ hiện tại có thể xuất hiện với số lượng âm trong bảng **Sản phẩm bán tốt**.
- Khi sửa tên khách hàng, hóa đơn cũ hiển thị tên mới trong danh sách và tệp CSV. Tìm theo tên đã lưu lúc lập hóa đơn có thể bỏ sót giao dịch.
- Dữ liệu được lưu trong trình duyệt. Các thiết bị dùng dữ liệu riêng, nên chưa thể đối chiếu chung đơn hàng và tồn kho giữa quản lý với nhân viên. Bản hiện tại cũng chưa có luồng chốt ca và đối chiếu tiền cuối ca.
