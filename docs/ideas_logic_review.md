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

- **Xác nhận từ lập trình viên**: `Idea` chỉ để lại 3 trạng thái (`reviewing`, `approved`, `rejected`). Việc sản phẩm chuyển sang public hay không sẽ được đánh dấu ở mỗi nền tảng. Trạng thái ở các nền tảng sẽ là `not_ready` (hoặc cái tên phù hợp) | `ready` | `uploading` | `published` | `error` | `fixed` | `delisted`. Trên UI, idea sẽ được coi là published khi sản phẩm trên nền tảng đang publish (hiển thị rõ nền tảng nào đang publish). Một idea ở trạng thái ready theo từng nền tảng, nếu ở nền tảng đó ảnh và content đã được duyệt. 

## 2. Dữ liệu bị phân mảnh và sao chép (Data Redundancy)
- **Vấn đề**: Bảng `Idea` có trường `title`, `description`. Nhưng bảng `AmazonListing` lại có `itemName`, `description`. Bảng `EtsyListing` cũng có `title`, `description`.
- **Điểm bất hợp lý**: 
  - Khi tạo Idea, nếu người dùng nhập Title, hệ thống sẽ copy Title đó sang cho Amazon và Etsy ngay lúc tạo (API POST `/api/ideas`).
  - Tuy nhiên, nếu sau này người dùng sửa Title ở bảng Idea chung, Title ở Amazon và Etsy **không được cập nhật theo**. Điều này dẫn đến dữ liệu "lệch pha" mà không báo trước.
- **Đề xuất**: Xóa bỏ `title` và `description` ở bảng `Idea` (vì bản chất Idea ban đầu chỉ là hình ảnh + prompt). Hoặc coi `Idea.title` là "Tên dự án nội bộ", còn `itemName` của Amazon là tên chuẩn SEO đẩy lên sàn. Cần làm rõ ý nghĩa trên UI để nhân viên không nhập trùng lặp.
- **Xác nhận từ lập trình viên**: Bỏ `title`, `description` trong bảng `Idea`. Xóa những nơi nó tồn tại. Mình sẽ dùng riêng ở từng nền tảng. 

## 3. Quy trình tạo Idea bị ngược (Form Overload)
- **Vấn đề**: Ở API tạo Idea (`POST /api/ideas`), form tiếp nhận cả các trường: `bulletPoints`, `tags`, `slugs`.
- **Điểm bất hợp lý**: Một "Ý tưởng" khi mới tạo bản chất chỉ là gửi ảnh AI, prompt và chủ đề để duyệt (trạng thái `reviewing`). Lúc này chưa chắc ý tưởng đã được sếp duyệt để làm sản phẩm, tại sao lại phải tốn công viết 5 dòng Bullet Points, SEO Tags, Slugs của Amazon? 
- **Đề xuất**: Form "Tạo ý tưởng" chỉ nên có: Hình ảnh, Chủ đề, AI Model, Prompt, Phân loại. Mọi thông tin về Listing (Title, Tags, Bullets...) chỉ hiển thị và cho phép nhập **sau khi** Idea đã được duyệt (Approved) và chuyển sang bước soạn content.
- **Xác nhận từ lập trình viên**: Khi tạo 1 ý tưởng mới, tất cả các thông tin đều cho phép người dùng nhập vào, nhưng sẽ ở dạng ẩn và không bắt buộc. Chỉ bắt buộc điền những thông tin như AI đề xuất ở trên. Việc này sẽ hữu ích trong 2 trường hợp: nhân viên bàn bạc trước với sếp, chỉ cần thêm vào và chờ sếp duyệt ngay và trường hợp 2 là nút tạo bản sao, nó sẽ copy toàn bộ thông tin có sẵn của sku trước đó. 

## 4. Rối loạn khái niệm "Sẵn sàng" trên UI
- **Vấn đề**: Ở trang danh sách Ý tưởng (`page.tsx`), có một Tab tên là **"Sẵn sàng" (Ready)**. Logic filter của tab này là: Ảnh đã duyệt (`photoStatus = approved`) & Idea chưa đăng bán (`status != published`).
- **Điểm bất hợp lý**:
  - Việc dùng từ "Sẵn sàng" ở đây ám chỉ "Ảnh đã sẵn sàng".
  - Nhưng trong tab Amazon, trạng thái ban đầu của Listing cũng là `ready`. (Trước đây nó được dịch là "Sẵn sàng" gây nhầm lẫn trầm trọng là sản phẩm đã điền đủ thông tin, nay đã đổi thành "Chưa sẵn sàng").
  - Nhân viên nhìn vào tab "Sẵn sàng" ngoài màn hình chính sẽ lầm tưởng rằng "Mọi thứ đã điền xong, chỉ việc up".
- **Đề xuất**: Đổi tên Tab "Sẵn sàng" ở ngoài danh sách thành **"Chờ lên Listing"** hoặc **"Đã có ảnh thật"** để chỉ rõ ngữ cảnh.
- **Xác nhận từ lập trình viên**: Ở trang danh sách ý tưởng, thống nhất loại bỏ các tab, mà sẽ tạo một button để bật filter, trong đó cho người tích chọn một hay nhiều trạng thái của từng trường thông tin có trạng thái, như trạng thái idea, trạng thái amazon, trạng thái ảnh, trạng thái content của amazon ... Filter này mở ra như Popover, 1 component của shadcn UI. Sẽ có các template có sẵn để tự động tích chọn các ô cần thiết. Và bấm xác nhận thì bắt đầu lọc. 


## 5. Thuộc tính Fulfillment (FBA / FBM) đặt sai chỗ
- **Vấn đề**: Trường `fulfillmentType` (FBA / FBM) đang nằm ở bảng `Idea`.
- **Điểm bất hợp lý**: 
  - Một mẫu thiết kế (Idea) hoàn toàn có thể được bán theo dạng FBM trên Etsy và dạng FBA trên Amazon. Việc gắn chết FBA/FBM vào `Idea` sẽ làm khó cho việc bán chéo đa kênh, đa tài khoản sau này.
  - Hơn nữa, Amazon FBA đòi hỏi phải chuẩn bị `Vine`, in `FNSKU Label`... logic này chỉ liên quan đến Amazon.
- **Đề xuất**: Di chuyển trường `fulfillmentType` vào thẳng trong bảng `AmazonListing` hoặc tạo ra bảng `Variant` để linh hoạt hơn.

- **Xác nhận từ lập trình viên**: Thuộc tính Fulfillment chỉ dành cho FBA. đặt ở Idea là sai, Etsy cũng k có thuộc tính này. Thêm thuộc tính Camp Auto (chạy quảng cáo tự động) dạng boolean để đánh kiểm tra xem sản phẩm đó mình chạy ads chưa. 

## 6. Photo Status Lifecycle (Vòng đời hình ảnh)
- **Vấn đề**: `photoStatus` tách biệt với `status` chính. Gồm `not_requested`, `awaiting_photos`, `pending_approval`...
- **Điểm bất hợp lý**: Quy trình này yêu cầu ai đó phải theo dõi. Khi Idea được Approved, ai sẽ là người chuyển `photoStatus` sang `awaiting_photos`? Nếu làm tay, rất dễ quên.
- **Đề xuất**: Tự động hóa. Khi `Idea` được duyệt (`status = approved`), hệ thống tự động đổi `photoStatus` thành `awaiting_photos` và push Notification cho bộ phận Design/Photo.
- **Xác nhận từ lập trình viên**: Một idea sẽ có thể đi fba hoặc fbm. Nếu là fbm, hình ảnh sẽ được nhân viên dùng AI tạo ra, nên chúng ta cần yêu cầu nhân viên làm ảnh. Còn khi idea đó được duyệt ở FBA, chúng ta sẽ sản xuất hàng hóa, và dùng sản phẩm thật để chụp ảnh. Ý tưởng của tôi là không thay đổi trạng thái làm ảnh, mà thay đổi UI ở trang chi tiết idea, ghi là duyệt FBM hoặc duyệt FBA kèm tooltip giải thích. Sau này vẫn có thể chuyển trạng thái giữa FBM và FBA, nhưng nó chỉ dành cho quản lý hoặc sếp, và UI tôi nghĩ nên sử dụng toggle. 

---
**Kết luận từ AI:** Hệ thống hiện tại đang bị gộp quá nhiều bước vào lúc khởi tạo Ý tưởng, nhưng lại bắt người dùng phải đồng bộ trạng thái ở các bước cuối bằng tay. Việc cấu trúc lại luồng (Workflow) tách bạch rõ 3 giai đoạn: **[Tạo ý tưởng] -> [Sản xuất ảnh] -> [Làm Content & Đăng bán]** sẽ giúp hệ thống trơn tru và logic hơn rất nhiều.
