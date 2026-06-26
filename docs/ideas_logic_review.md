# Đánh giá Logic & Vòng đời "Ý tưởng" (Idea Lifecycle Review)

Sau khi scan toàn bộ cấu trúc thư mục, Database Schema (`prisma/schema.prisma`) và logic tại API, tôi xin tổng hợp các điểm bất hợp lý về mặt quy trình nghiệp vụ (Business Logic) cũng như UI/UX liên quan đến module "Ý tưởng" (Ideas). 

Các điểm dưới đây đang gây ra sự chồng chéo, khó hiểu và thừa thãi trong quá trình sử dụng hệ thống.

---

## 1. Sự chồng chéo giữa Trạng thái Ý tưởng (Idea Status) và Trạng thái Đăng bán (Listing Status)
- **Vấn đề**: Hiện tại `Idea` có 4 trạng thái (`reviewing`, `approved`, `published`, `rejected`). Tuy nhiên, bản thân mỗi nền tảng `AmazonListing` và `EtsyListing` lại có một vòng đời riêng (ready -> uploading -> selling...).
- **Điểm bất hợp lý**: 
  - Nếu Amazon chuyển sang `selling` (Đang bán), thì trạng thái tổng của `Idea` có tự động chuyển thành `published` (Đã đăng bán) không? Code hiện tại **không tự động đồng bộ**. Người dùng đang phải làm thao tác này bằng tay 2 lần (chỉnh ở tab Amazon xong ra ngoài update lại trạng thái Idea).
  - Nếu bán trên cả Amazon và Etsy, thì khi nào Idea mới được coi là `published`? Khi 1 sàn lên, hay cả 2 sàn lên?
- **Đề xuất**: Trạng thái `published` của Idea nên được **tính toán tự động (Derived State)**. Nếu bất kỳ một Listing nào (Amazon/Etsy) đạt trạng thái `selling`, Idea tự động chuyển sang `published`. Không nên bắt user tự click.

## 2. Dữ liệu bị phân mảnh và sao chép (Data Redundancy)
- **Vấn đề**: Bảng `Idea` có trường `title`, `description`. Nhưng bảng `AmazonListing` lại có `itemName`, `description`. Bảng `EtsyListing` cũng có `title`, `description`.
- **Điểm bất hợp lý**: 
  - Khi tạo Idea, nếu người dùng nhập Title, hệ thống sẽ copy Title đó sang cho Amazon và Etsy ngay lúc tạo (API POST `/api/ideas`).
  - Tuy nhiên, nếu sau này người dùng sửa Title ở bảng Idea chung, Title ở Amazon và Etsy **không được cập nhật theo**. Điều này dẫn đến dữ liệu "lệch pha" mà không báo trước.
- **Đề xuất**: Xóa bỏ `title` và `description` ở bảng `Idea` (vì bản chất Idea ban đầu chỉ là hình ảnh + prompt). Hoặc coi `Idea.title` là "Tên dự án nội bộ", còn `itemName` của Amazon là tên chuẩn SEO đẩy lên sàn. Cần làm rõ ý nghĩa trên UI để nhân viên không nhập trùng lặp.

## 3. Quy trình tạo Idea bị ngược (Form Overload)
- **Vấn đề**: Ở API tạo Idea (`POST /api/ideas`), form tiếp nhận cả các trường: `bulletPoints`, `tags`, `slugs`.
- **Điểm bất hợp lý**: Một "Ý tưởng" khi mới tạo bản chất chỉ là gửi ảnh AI, prompt và chủ đề để duyệt (trạng thái `reviewing`). Lúc này chưa chắc ý tưởng đã được sếp duyệt để làm sản phẩm, tại sao lại phải tốn công viết 5 dòng Bullet Points, SEO Tags, Slugs của Amazon? 
- **Đề xuất**: Form "Tạo ý tưởng" chỉ nên có: Hình ảnh, Chủ đề, AI Model, Prompt, Phân loại. Mọi thông tin về Listing (Title, Tags, Bullets...) chỉ hiển thị và cho phép nhập **sau khi** Idea đã được duyệt (Approved) và chuyển sang bước soạn content.

## 4. Rối loạn khái niệm "Sẵn sàng" trên UI
- **Vấn đề**: Ở trang danh sách Ý tưởng (`page.tsx`), có một Tab tên là **"Sẵn sàng" (Ready)**. Logic filter của tab này là: Ảnh đã duyệt (`photoStatus = approved`) & Idea chưa đăng bán (`status != published`).
- **Điểm bất hợp lý**:
  - Việc dùng từ "Sẵn sàng" ở đây ám chỉ "Ảnh đã sẵn sàng".
  - Nhưng trong tab Amazon, trạng thái ban đầu của Listing cũng là `ready`. (Trước đây nó được dịch là "Sẵn sàng" gây nhầm lẫn trầm trọng là sản phẩm đã điền đủ thông tin, nay đã đổi thành "Chưa sẵn sàng").
  - Nhân viên nhìn vào tab "Sẵn sàng" ngoài màn hình chính sẽ lầm tưởng rằng "Mọi thứ đã điền xong, chỉ việc up".
- **Đề xuất**: Đổi tên Tab "Sẵn sàng" ở ngoài danh sách thành **"Chờ lên Listing"** hoặc **"Đã có ảnh thật"** để chỉ rõ ngữ cảnh.

## 5. Thuộc tính Fulfillment (FBA / FBM) đặt sai chỗ
- **Vấn đề**: Trường `fulfillmentType` (FBA / FBM) đang nằm ở bảng `Idea`.
- **Điểm bất hợp lý**: 
  - Một mẫu thiết kế (Idea) hoàn toàn có thể được bán theo dạng FBM trên Etsy và dạng FBA trên Amazon. Việc gắn chết FBA/FBM vào `Idea` sẽ làm khó cho việc bán chéo đa kênh, đa tài khoản sau này.
  - Hơn nữa, Amazon FBA đòi hỏi phải chuẩn bị `Vine`, in `FNSKU Label`... logic này chỉ liên quan đến Amazon.
- **Đề xuất**: Di chuyển trường `fulfillmentType` vào thẳng trong bảng `AmazonListing` hoặc tạo ra bảng `Variant` để linh hoạt hơn.

## 6. Photo Status Lifecycle (Vòng đời hình ảnh)
- **Vấn đề**: `photoStatus` tách biệt với `status` chính. Gồm `not_requested`, `awaiting_photos`, `pending_approval`...
- **Điểm bất hợp lý**: Quy trình này yêu cầu ai đó phải theo dõi. Khi Idea được Approved, ai sẽ là người chuyển `photoStatus` sang `awaiting_photos`? Nếu làm tay, rất dễ quên.
- **Đề xuất**: Tự động hóa. Khi `Idea` được duyệt (`status = approved`), hệ thống tự động đổi `photoStatus` thành `awaiting_photos` và push Notification cho bộ phận Design/Photo.

---
**Kết luận:** Hệ thống hiện tại đang bị gộp quá nhiều bước vào lúc khởi tạo Ý tưởng, nhưng lại bắt người dùng phải đồng bộ trạng thái ở các bước cuối bằng tay. Việc cấu trúc lại luồng (Workflow) tách bạch rõ 3 giai đoạn: **[Tạo ý tưởng] -> [Sản xuất ảnh] -> [Làm Content & Đăng bán]** sẽ giúp hệ thống trơn tru và logic hơn rất nhiều.
