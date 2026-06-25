# Test Case

Để hiểu rõ hơn những gì đang diễn ra, bạn có thể chủ động làm theo các bước để phát hiện chính xác lỗi là gì, ứng dụng phản hồi lỗi đó như thế nào

## 1. Idea detail page: Duyệt ý tưởng mới

- Luồng hoạt động: Nhân viên thêm ý tưởng mới, sếp xem và duyệt sản phẩm. 
- Mong đợi: Nhân viên thêm ý tưởng thành công. Nhân viên tiếp tục ở lại trang thêm ý tưởng với các trường thông tin được giữ lại như: model sử dụng là gì, đang làm ở chủ đề nào. Nhân viên hiển thị thông báo đã thêm thành công, có nút đi xem. Nếu không xem thì thông báo đó biến mất và nhân viên tiếp tục thêm ý tưởng. Sếp kiểm tra ảnh + các trường thông tin. Sếp thấy ý tưởng tốt, sếp duyệt + yêu cầu làm ảnh. Idea đó được duyệt, màn hình sếp nhảy sang idea cần duyệt tiếp theo. Nếu không còn idea nào được duyệt, màn hình sẽ trở về danh sách trông idea.

- Thực tế:
+ Nhân viên lưu thành công. Nhưng khi sếp duyệt idea, ứng dụng báo đã duyệt + yc làm ảnh. Ngay sau đó có báo lỗi hệ thống. Cũng không chuyển sang ý tưởng tiếp theo hay trở về trang danh sách khi đã hết ý tưởng. Trang chi tiết ý tưởng mà các thông tin của sản phẩm thì chả thấy đâu. Bấm vào chỉnh sửa lại thấy rất nhiều trường thông tin. Vậy mỗi lần muốn kiểm tra thì phải bấm chỉnh sửa hay sao.

## 2. Idea detail page: giao diện

- Mong muốn hạn chế cuộn, nhưng ở trang này kể cả khi chưa có thông tin gì nhưng vẫn có cuộn. Hơn nữa, khi bấm vào chỉnh sửa ý tưởng, rất nhiều thông tin hiện ra, sắp xếp chưa hợp lý. Còn rất nhiều khoảng trống nhưng vẫn phải cuộn. Nội dung thì căn chỉnh sát lề trái, không có khoảng hở. Không thể điều chỉnh ảnh main khi đã upload idea luôn. 

## 3. Thanh top bar. 

Khi muốn chỉnh light mode dark mode nhanh, di Chuột Lên phía thanh topbar vào 2 icon thông báo và biểu tưởng mặt trời/mặt trăng, ứng dụng không tự động show lên thông báo hay lựa chọn darkmode ligh mode. Ở lựa chọn theme cũng không có icon mà có duy nhất chữ viết. Về thông báo, sau khi click vào thông báo, thông báo đó không được đánh dấu là đã đọc, và cũng không ẩn đi khi người dùng bấm xem chi tiết. Tôi thấy sonner thông báo hiện ra rất đẹp, nhưng bấm vào icon thông báo ở topbar thì đúng thật là xấu, không có action button. Khi người dùng đang ở sẵn trang đó, bấm vào thông báo thì không có phản ứng nào xảy ra, cứ như thông báo đó không có chức năng click. Và khi ở trang khác, bấm vào thì màn hình nháy một cái, như thông tin mới vừa được load. Tôi nghĩ nên mở nội dung thông báo trong tab mới để tránh công việc cũ chưa kịp lưu, load trang mới khiến công việc hiện tại bị hỏng. Hơn nữa, thông báo cũng cần có nhiều nội dung hơn về người, sản phẩm, nội dung thông báo. Khi có sonner thông báo, người dùng bấm vào action button. Nó bật lên tab mới. Nhưng giả sử ở trang ý tưởng chi tiết, khi bấm nút back nó không back về phía trước, ít nhất là cũng về về trang danh sách ý tưởng. Nút back của chrome không hoạt động là đúng vì nó là trang mới, nhưng nút back ở ứng dụng nhất định phải hoạt động

