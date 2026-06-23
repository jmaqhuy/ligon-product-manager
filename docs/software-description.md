# Xây dựng phần mềm quản lý sản phẩm, ý tưởng

> **Chú thích quy ước đánh dấu (do AI thêm vào):**
> - ✏️ **[ĐÃ SỬA: ...]** — đoạn mình đã chỉnh sửa/viết rõ lại trực tiếp trong file, kèm lý do ngắn gọn.
> - ⚠️ **[CẦN LÀM RÕ: ...]** — chỗ mình thấy chưa rõ/mâu thuẫn nhưng chưa tự ý sửa, cần bạn quyết định.
> - Các lỗi chính tả nhỏ (gõ lặp ký tự, thiếu dấu...) được sửa thẳng, không đánh dấu riêng để đỡ rối file.
> - Danh sách tính năng đề xuất thêm/bớt được để ở cuối phần chat trả lời, không chèn vào file này.

## Mô tả
- Đây là ứng dụng web quản lý thông tin sản phẩm, ý tưởng
- Có thể quản lý nhiều ý tưởng
- Có nhiều người sử dụng cùng lúc, cùng chỉnh sửa vào danh sách các ý tưởng
- "Ý tưởng" và "sản phẩm" là cùng một bản ghi dữ liệu trong ứng dụng, chỉ khác tên gọi theo từng giai đoạn (gọi là "ý tưởng" khi mới đề xuất, gọi là "sản phẩm" khi đã được duyệt/sản xuất). *(✏️ ĐÃ SỬA: viết rõ lại câu gốc "Ý tưởng, hay sản phẩm là một trong ứng dụng này" cho dễ hiểu — xin xác nhận lại đúng ý bạn muốn nói)*
- Sản phẩm này có thể được đăng bán lên sàn thương mại điện tử Amazon, hoặc(và) Etsy

## Quy trình chung của một ý tưởng
- 1 Ý tưởng chỉ được tạo ra bởi 1 người duy nhất. Nhưng chúng có thể được chỉnh sửa bởi chính người đó hoặc người quản lý
- Ý tưởng được tạo ra từ bất kỳ ai nhưng cần được người quản lý duyệt
- Mỗi ý tưởng (cho Amazon) cần được đánh dấu là đi **FBA** hay **FBM**, vì hai hướng này có quy trình khác nhau hẳn. Etsy thì gần như luôn list (không phân biệt FBA/FBM), nên không bị ảnh hưởng bởi lựa chọn này.
- **Trường hợp FBM**: không cần làm file sản xuất, không cần sản xuất mẫu — đăng bán trực tiếp luôn.
- **Trường hợp FBA**: cần làm file sản xuất kỹ trước (file sai sẽ gây lỗi hàng loạt, tốn chi phí vật liệu; sản phẩm không bán được còn chịu thêm phí lưu kho/phí hủy hàng), rồi mới được sản xuất.
- **Về ảnh đăng bán**: phần lớn ảnh dùng để đăng bán (kể cả với hàng FBA) là **ảnh do AI generate** (đội ngũ chuyên tạo ảnh AI giống sản phẩm gốc khoảng 80–99%), không phải ảnh chụp thật. Nếu có làm sản phẩm mẫu thật thì ảnh chụp từ mẫu cũng dùng được, không có gì thay đổi so với ảnh AI.
- **Thứ tự thực tế với hàng FBA**: (1) tạo ảnh AI-gen trước → (2) đăng ảnh lên sàn để tạo sản phẩm/listing → (3) từ đó có FNSKU để in và dán lên hàng → (4) sản xuất hàng loạt song song hoặc sau đó → (5) tạo lệnh ship trên sàn, đóng thùng → (6) ship hàng vào kho Amazon.
- Vì công ty còn nhỏ và linh hoạt, các bước trên không bắt buộc phải tuần tự cứng nhắc cho mọi sản phẩm — đây là luồng phổ biến nhất, không phải quy tắc duy nhất. *(✏️ ĐÃ SỬA: viết lại toàn bộ phần này theo đúng quy trình thực tế bạn mô tả — phân nhánh FBA/FBM, và làm rõ ảnh đăng bán chủ yếu là ảnh AI-gen chứ không phải ảnh chụp mẫu)*
* Cần quản lý chặt chẽ các khâu, tránh sai sót như bỏ sót ý tưởng, sản phẩm đã sản xuất nhưng chưa upload lên amazon, hoặc hàng đã đi đến kho nhưng chưa làm xong bộ ảnh để up, hoặc làm xong ảnh rồi nhưng chưa up lên amazon. Lưu ý, ship vào kho thì chỉ ship vào amazon, còn etsy sẽ tự ship hàng. 

## Danh sách các thông tin cần quản lý

- Thông tin chung:
    - SKU: mặc định trùng MSKU và có thể chỉnh sửa
    - MSKU: Tự động tạo hoặc thêm thủ công. Có dấu tích tự động tạo, và tự động tick chọn ban đầu. Nó được sinh ra bằng công thức {tên nhân viên viết tắt} + ngày tạo {yymm} + "-" + số thứ tự idea (3 chữ số). Ví dụ Nguyễn Quốc Huy tạo idea thứ 5 trong tháng 1 năm 2026 -> NQH2601-005. Nếu tên Ánh, Đức thì ghi viết tắt phải ghi A, D, không được Á, Đ.
      - Quy tắc viết tắt khi trùng tên (✏️ ĐÃ SỬA theo yêu cầu: không thêm số thứ tự như NQH1/NQH2 vì sẽ khó đọc chung với {yymm}):
        - Mặc định: viết tắt theo chữ cái đầu của từng từ trong họ tên, ví dụ Nguyễn Quốc Huy → NQH.
        - Nếu trùng với viết tắt của 1 nhân viên khác đang hoạt động: giữ chữ cái đầu của họ và tên đệm, viết đầy đủ tên chính (không dấu), ví dụ → NQHuy.
        - Nếu vẫn còn trùng (kể cả trường hợp hiếm là trùng cả họ và tên): viết đầy đủ luôn cả tên đệm (không dấu), ví dụ → NQuocHuy. Nếu vẫn trùng nữa thì viết tắt đầy đủ cả họ tên không dấu, liền nhau.
        - Hệ thống tự kiểm tra trùng lặp theo thứ tự ưu tiên trên khi tạo tài khoản nhân viên mới, không cần nhân viên tự chọn.
    - Date: ngày tạo ý tưởng
    - Employee: người tạo ý tưởng, dựa trên tài khoản đang sử dụng.
    - Liên kết ý tưởng gốc: Tối thiểu 1 và tối đa 5 liên kết(thông thường chỉ có 1). Đây là liên kết tới sản phẩm mà nhân viên lấy ý tưởng để tạo ra một sản phẩm mới. Các liên kết từ nhiều nguồn khác nhau, khi truy cập sẽ có chuỗi truy vấn (sau dấu ? ở url) hoặc không có, khi lưu vào cơ sở dữ liệu, hãy chỉ lấy đường dẫn chính và bỏ qua chúng.
    - Ảnh sản phẩm: **Chỉ 1 ảnh duy nhất, là ảnh main** — vừa là ảnh đầu tiên hiển thị trên sàn, vừa là ảnh đại diện hiển thị ở mọi nơi cần trong ứng dụng (danh sách ý tưởng, dashboard...). Bắt buộc phải có ảnh này thì Quản lý/Sếp mới xem để duyệt ý tưởng — duyệt ý tưởng trước rồi mới làm các ảnh/việc tiếp theo, tránh mất công nếu không được duyệt. Ở phần thông tin Amazon/Etsy, có tích chọn dùng ảnh này làm ảnh main của bộ ảnh trên từng sàn. *(✏️ ĐÃ SỬA: bản gốc ghi "tối đa 10 ảnh", nay theo xác nhận chỉ còn đúng 1 ảnh main ở mức ý tưởng; bộ ảnh đầy đủ (9 ảnh) được quản lý riêng theo từng sàn ở mục Amazon/Etsy bên dưới — đã cập nhật lại 2 mục đó tương ứng)*
    - Status: trạng thái tổng quát của **ý tưởng**, đề xuất chỉ gồm 3 giá trị đơn giản: **đang xem xét** (chờ duyệt) → **đã được duyệt** → **đã đăng bán**. *(✏️ ĐÃ SỬA theo đề xuất của bạn: đơn giản hóa từ nhiều trạng thái xuống còn 3 — không gộp các bước làm ảnh/sản xuất vào trạng thái này nữa)*
      - Việc làm ảnh không còn là một "trạng thái" của ý tưởng mà là một **hành động** sau khi ý tưởng đã được duyệt, đi kèm 1 **trạng thái ảnh** (Photo status) riêng để trả lời rõ "khi nào nhân viên cần làm ảnh, khi nào sếp cần duyệt, khi nào có ảnh để đăng bán":
        - **Chưa yêu cầu làm ảnh** (mặc định, ngay sau khi ý tưởng được duyệt).
        - **Đang chờ làm ảnh**: sau khi Quản lý/Sếp bấm nút "Yêu cầu gen ảnh AI" hoặc "Yêu cầu chụp ảnh sản phẩm mẫu" và giao cho 1 nhân viên cụ thể → nhân viên đó biết mình cần làm ảnh.
        - **Chờ duyệt ảnh**: sau khi nhân viên đã nộp đủ ảnh (ảnh main + bộ ảnh) → Quản lý/Sếp biết cần vào duyệt.
        - **Yêu cầu làm lại ảnh**: nếu Quản lý/Sếp xem thấy chưa ưng ý, bấm "Yêu cầu làm lại" kèm lý do → quay về trạng thái "Đang chờ làm ảnh" để nhân viên làm bộ ảnh mới.
        - **Đã duyệt ảnh, sẵn sàng đăng bán**: Quản lý/Sếp duyệt OK → nhân viên tiến hành đăng bán lên sàn (Amazon/Etsy).
        *(✏️ ĐÃ THÊM: đây là đề xuất cụ thể trả lời câu hỏi của bạn về thời điểm làm ảnh/duyệt ảnh/yêu cầu làm lại — ⚠️ CẦN LÀM RÕ: bạn xem lại có đúng ý không, đặc biệt là trường hợp "yêu cầu làm lại ảnh" có cần giới hạn số lần không)*
      - Một SKU bán chạy có thể được đưa vào sản xuất lại nhiều lần — mỗi lần là **một yêu cầu sản xuất riêng** ở mục "Quản lý quá trình sản xuất" bên dưới (đã có liên kết SKU/MSKU), nên không ảnh hưởng tới trạng thái chung của ý tưởng/sản phẩm.
    - Chủ đề của sản phẩm: Sản phẩm có thể là baby announcement sign, baby milestone sign, christmas ornament ... Những chủ đề này sẽ do quản lý hoặc sếp thêm vào. 
    - Sản phẩm được tạo ra từ model AI nào (danh sách model AI do Quản lý/Sếp thêm vào) *(✏️ ĐÃ SỬA: đổi "admin" thành "Quản lý/Sếp" cho thống nhất — xem ghi chú về vai trò "Admin" ở cuối phần trả lời)*
    - Sản phẩm được tạo ra bằng prompt nào
    - file sản xuất: liên kết tới folder Google Drive chứa toàn bộ file thiết kế liên quan (bao gồm cả file gia công số lượng nếu có — không cần trường riêng, khi nào cần sản xuất thì vào thư mục đó tìm). *(✏️ ĐÃ SỬA theo yêu cầu: gộp "file gia công số lượng" vào chung trường "file sản xuất", bỏ trường riêng)*


    *Vì sao cần MSKU
        - Khi up sản phẩm lên sàn thương mại điện tử, nhân viên có thể quên đặt sku trên sàn, sàn sẽ tự động tạo SKU, SKU này sẽ không có ý nghĩa cụ thể, khó nhớ, khó phân biệt. Vì vậy ta cần lưu giữ thông tin ban đầu dưới dạng MSKU để tự quản lý trong ứng dụng. MSKU sẽ không thể chỉnh sửa sau khi tạo. SKU mặc định trùng khớp với MSKU, SKU có thể chỉnh sửa khi gặp trường hợp như mô tả trước đó. 
- Thông tin sản phẩm Amazon:
    - ASIN: mã định danh sản phẩm trên Amazon, gồm 10 ký tự chữ+số, hầu hết bắt đầu bằng "B0" (riêng sách dùng ISBN nên có thể toàn số).
    - Link Amazon: **không lưu vào database**, chỉ tính toán/hiển thị ở frontend từ ASIN (amazon.com/dp/{ASIN}). *(✏️ ĐÃ SỬA: theo xác nhận, đây là giá trị suy ra được nên không cần lưu trữ riêng)*
    - FNSKU: gồm 2 phần — (1) mã FNSKU (text), và (2) liên kết tới file in nhãn FNSKU (file này được in ra giấy và dán vào sản phẩm khi đi hàng vào kho Amazon, chỉ chứa mã FNSKU và mã vạch). Cần quản lý chặt chẽ cả 2 phần này để tránh nhầm lẫn. *(✏️ ĐÃ SỬA: bản gốc chỉ mô tả việc in dán, chưa tách rõ cần lưu cả mã FNSKU lẫn link file in riêng)*
    - Tên sản phẩm (Item Name): tối đa 75 ký tự (quy định mới của Amazon, trước đây là 200 ký tự cho cả tiêu đề + điểm nổi bật gộp chung). *(✏️ ĐÃ SỬA theo cập nhật của bạn về quy định mới của Amazon)*
    - Điểm nổi bật (Item Highlights): tối đa 125 ký tự — là phần còn lại sau khi Amazon tách 200 ký tự cũ thành 75 (tiêu đề) + 125 (điểm nổi bật). *(✏️ ĐÃ SỬA: bổ sung giới hạn ký tự, và làm rõ đây KHÔNG phải trùng với "5 điểm nổi bật/Bullet points" bên dưới — là 2 trường khác nhau)*
    - 5 điểm nổi bật (Bullet points)
    - Mô tả chi tiết sản phẩm (Product description)
    - Tags: danh sách từ khóa, tối đa 500 ký tự, cách nhau bằng dấu chấm phẩy.
    - Slug: tên ảnh thân thiện với SEO, tối đa 12 slug. Các slug cách nhau bằng dấu xuống dòng (\n). Tối ưu sao cho nhân viên có thể copy toàn bộ slug hoặc copy từng slug để dùng.
    - Account: tài khoản đăng bán sản phẩm.
    - Giá: Giá bán của sản phẩm trên Amazon.
    - Bộ 9 ảnh sản phẩm khác: 9 ảnh dành riêng cho Amazon. Ảnh đầu tiên (ảnh main) có thể tích chọn dùng lại đúng ảnh main ở mục "Thông tin chung" (1 ảnh duy nhất), hoặc upload ảnh main riêng cho Amazon. *(✏️ ĐÃ SỬA: viết rõ lại cho khớp với việc "Ảnh sản phẩm" ở Thông tin chung giờ chỉ còn 1 ảnh duy nhất, không phải "bộ ảnh" như trước)*
    - Video
    - Content A+

- Thông tin sản phẩm Etsy:
    - Title: 
    - listing ID: tùy chọn, có thể chủ không muốn tiết lộ thông tin tài khoản.
    - Tags: danh sách từ khóa, không bắt buộc. *(✏️ ĐÃ THÊM theo yêu cầu — lưu ý Etsy giới hạn khác Amazon: tối đa 13 tags, mỗi tag tối đa 20 ký tự)*
    - 5 điểm nổi bật (Bullet points)
    - Mô tả chi tiết sản phẩm (Product description)
    - Giá: Giá bán của sản phẩm trên Etsy.
    - Account: tài khoản đăng bán sản phẩm. 
    - Bộ 9 ảnh sản phẩm khác: 9 ảnh dành riêng cho Etsy. Ảnh đầu tiên (ảnh main) có thể tích chọn dùng lại ảnh main ở mục "Thông tin chung", hoặc dùng chung với ảnh main đã chọn bên Amazon, hoặc upload ảnh main riêng cho Etsy. *(✏️ ĐÃ SỬA: đồng bộ cách viết với phần Amazon ở trên)*
    - Video (có thể tích chọn dùng chung video với Amazon hoặc không)

* Tạo nút tải xuống cho phép tải nhanh bộ ảnh (Amazon, hoặc Etsy)
* Tạo nút hỏi chấm ở cuối các trường, hoặc di chuột tới phải viết mô tả cho nhân viên hiểu. Phải đánh dấu trường nào là bắt buộc điền.
* Danh sách **tài khoản đăng bán** (Account dùng để đăng sản phẩm lên Amazon/Etsy — khác với tài khoản đăng nhập hệ thống ở mục "Quản lý tài khoản" bên dưới) sẽ do Quản lý/Sếp thêm vào, **chỉ được thêm mới, không được xóa** (kể cả khi tài khoản đó không còn dùng nữa) — vì xóa sẽ làm lỗi/trống thông tin ở các SKU đã đăng bán trên tài khoản đó. Cần có trường **trạng thái** (đang dùng/ngừng dùng) để đánh dấu tài khoản không còn dùng nữa, và khi đăng bán sản phẩm mới sẽ không gợi ý các tài khoản ở trạng thái ngừng dùng. *(✏️ ĐÃ SỬA: đổi "admin" thành "Quản lý/Sếp"; theo xác nhận, chỉ cho thêm không cho xóa, đồng thời thêm trường trạng thái để xử lý tài khoản ngừng dùng)*
* Cần quản lý chặt chẽ lịch sử sửa đổi: sửa đổi bởi ai, khi nào, và **đổi từ giá trị gì sang giá trị gì** (dạng diff/so sánh trước-sau). *(✏️ ĐÃ SỬA theo xác nhận: bổ sung yêu cầu lưu lại giá trị cũ/mới, không chỉ "ai, khi nào")*
* Liên kết ảnh có thể là liên kết ảnh trực tiếp từ bất kỳ website nào hoặc là link google drive. Nếu là link google drive ở dạng drive.google.com, không chỉnh sửa link trong database nhưng khi hiện preview thì phải chuyển về link direct thì mới xem được(lh3.googleusercontent.com/...)
* Về phần trạng thái, nó có thể là chờ duyệt, đang chỉnh sửa, sẵn sàng đăng bán, đã up. Cần quản lý riêng biệt amazon và etsy. Sản phẩm có thể đã bán ở amazon nhưng chưa đăng ở etsy và ngược lại.
* Cần kiểm soát chặt chẽ để tránh bỏ sót ý tưởng, nhân viên dễ dàng biết ý tưởng của họ đang ở đâu, cần phải làm gì với nó, có thông báo rõ ràng khi được yêu cầu chỉnh sửa, thêm thắt gì vào ý tưởng của mình. 

## Danh sách các chức năng

- Quản lý tài khoản
    
    - Tạo tài khoản:
        - Email: dùng để đăng nhập (cũng chính là "tên đăng nhập" được nhắc tới ở mục Tìm kiếm/Sắp xếp tài khoản bên dưới), không thể trùng email. *(✏️ ĐÃ SỬA: theo xác nhận — không cần thêm số điện thoại, "tên đăng nhập" = Email)*
        - Mật khẩu: mật khẩu tài khoản, không thể hiển thị, bắt buộc phải có 8 ký tự trở lên
        - Tên nhân viên
        - Chức vụ: nhân viên, quản lý, sếp
        - Chức năng của từng chức vụ — đề xuất bảng phân quyền chi tiết hơn theo toàn bộ chức năng của app (✏️ ĐÃ SỬA/MỞ RỘNG: bạn nói có thể còn thiếu và để mình tự gán quyền phù hợp — đây là đề xuất, ⚠️ CẦN LÀM RÕ: bạn xem lại từng dòng có đúng ý không):

| Chức năng | Nhân viên | Quản lý | Sếp |
|---|---|---|---|
| Tạo ý tưởng, làm file, đăng bán sản phẩm | ✅ | ✅ | ✅ |
| Xem ý tưởng của chính mình | ✅ | ✅ | ✅ |
| Xem toàn bộ ý tưởng (có nút chuyển "Của tôi" / "Toàn bộ") | ✅ | ✅ | ✅ |
| Duyệt ý tưởng / duyệt ảnh / yêu cầu chỉnh sửa | ❌ | ✅ | ✅ |
| Xóa ý tưởng bất kỳ lúc nào | ❌ | ✅ | ✅ |
| Cập nhật tiến độ sản xuất, đơn hàng, shipment | ✅ | ✅ | ✅ |
| Thêm chủ đề sản phẩm / AI model | ❌ | ✅ | ✅ |
| Thêm tài khoản đăng bán (Amazon/Etsy) | ❌ | ✅ | ✅ |
| Xem dashboard/thống kê cá nhân | ✅ | ✅ | ✅ |
| Xem dashboard/thống kê toàn công ty | ❌ | ✅ | ✅ |
| Thêm/sửa/vô hiệu hóa tài khoản Nhân viên | ❌ | ✅ | ✅ |
| Thêm/sửa/vô hiệu hóa tài khoản Quản lý | ❌ | ❌ | ✅ |
| Chỉnh sửa thông tin cá nhân | ✅ | ✅ | ✅ |

        *(✏️ ĐÃ SỬA theo xác nhận: Nhân viên được xem toàn bộ ý tưởng công ty để học hỏi, có nút chuyển qua lại giữa "Của tôi" và "Toàn bộ" để không bị rối. Riêng "Xóa ý tưởng bất kỳ lúc nào" trong bảng là quyền KHÔNG điều kiện của Quản lý/Sếp — khác với quyền xóa CÓ điều kiện của Nhân viên với ý tưởng của chính mình, xem chi tiết ở mục "Xóa ý tưởng" trong "Quản lý ý tưởng" bên dưới)*

        - Trạng thái: hoạt động, không hoạt động
        - Ngày bắt đầu làm việc: hệ thống tự động điền ngày hiện tại, nhưng có thể thay đổi.
        
    - Chỉnh sửa tài khoản:
        - Nhân viên có thể chỉnh sửa thông tin cá nhân.
        - Quản lý có thể chỉnh sửa thông tin cá nhân, tài khoản của nhân viên.
        - Sếp có thể chỉnh sửa thông tin cá nhân, tài khoản của nhân viên và quản lý.
        
    - Vô hiệu hóa tài khoản (thay cho xóa): Không cho phép xóa tài khoản đăng nhập thật sự — chỉ chuyển **Trạng thái** sang "không hoạt động" (soft delete). Tài khoản không đăng nhập được nữa nhưng dữ liệu vẫn giữ nguyên, để các ý tưởng/ảnh/file mà người đó từng tạo vẫn xác định được người tạo, tránh mất dấu trách nhiệm khi có sai sót.
        - Sếp có thể vô hiệu hóa tài khoản Nhân viên và Quản lý. Quản lý chỉ có thể vô hiệu hóa tài khoản Nhân viên, không được đụng tới tài khoản Sếp.
        *(✏️ ĐÃ SỬA theo yêu cầu: bỏ hẳn chức năng xóa tài khoản, thay bằng vô hiệu hóa/soft delete để không làm lỗi dữ liệu liên quan)*
        
    - Tìm kiếm tài khoản: dựa trên tên đăng nhập (Email), tên nhân viên là đủ. *(✏️ ĐÃ SỬA: bỏ số điện thoại theo xác nhận không cần trường này)*
        
    - Lọc tài khoản: Sẽ filter theo chức vụ, trạng thái, ngày bắt đầu làm việc.
        
    - Sắp xếp tài khoản: Sẽ sắp xếp theo ngày bắt đầu làm việc, chức vụ, trạng thái, tên đăng nhập (Email). *(✏️ ĐÃ SỬA: bỏ số điện thoại theo xác nhận không cần trường này)*
    

- Quản lý ý tưởng

    - Tạo ý tưởng: Bên cạnh SKU, MSKU, Date, Employee, nhân viên cần cung cấp thêm các thông tin sau (bắt buộc hoặc cảnh báo, cảnh báo thì phải cảnh báo khi bấm nút submit và highligh vị trí điền hoặc dấu !):
        - Liên kết đến nguồn ý tưởng: chỉ cảnh báo, không bắt buộc
        - Ảnh sản phẩm: 1 ảnh duy nhất là bắt buộc
        - Trạng thái. Mặc định là "đang xem xét". Chỉ có quản lý hoặc sếp thêm idea mới được tự đổi trạng thái (ví dụ sếp thêm thì không cần sếp duyệt nữa). *(✏️ ĐÃ SỬA: đồng bộ tên trạng thái mặc định với model 3 trạng thái "đang xem xét / đã được duyệt / đã đăng bán" ở mục Thông tin chung)*
        - Chủ đề của sản phẩm (bắt buộc)
        - Sản phẩm được tạo ra từ model AI nào  (bắt buộc)
        - Sản phẩm được tạo ra bằng prompt nào (bắt buộc)
        
    - Chỉnh sửa ý tưởng: quản lý và sếp có yêu cầu nhân viên thay đổi phần nào, có phần điền lý do cần thay đổi. Tích chọn mục cần thay đổi, nêu lý do cho toàn bộ những thứ cần thay đổi, không phải nêu lý do ở từng mục cần thay đổi. Phải theo dõi kỹ ai là người chỉnh sửa, chỉnh sửa thời gian nào, thay đổi trạng thái ý tưởng để dễ theo dõi ý tưởng đang ở giai đoạn nào. 
        
    - Xóa ý tưởng: Nhân viên được phép xóa ý tưởng của chính mình khi đang ở 1 trong 2 giai đoạn: (a) đang chờ duyệt ý tưởng, hoặc (b) đã được duyệt nhưng vẫn đang ở giai đoạn "chưa yêu cầu làm ảnh" hoặc "đang chờ làm ảnh" (ví dụ nhân viên tự thấy ý tưởng của mình không đủ hấp dẫn nên muốn rút). Một khi đã có file sản xuất / đã yêu cầu làm file sản xuất, đã có đầy đủ bộ ảnh (chờ duyệt ảnh trở đi), hoặc đã đăng bán — thì KHÔNG được xóa nữa. Quản lý/Sếp có thể xóa bất cứ khi nào (không điều kiện), nhưng phải hiện cảnh báo nếu ý tưởng đó đã được đăng bán hoặc đang trong quá trình sản xuất. *(✏️ ĐÃ SỬA theo xác nhận mới nhất: mở rộng điều kiện cho phép Nhân viên xóa — không chỉ khi "chờ duyệt ý tưởng" mà còn cả giai đoạn "yêu cầu làm ảnh" nếu chưa có file sx/bộ ảnh đầy đủ/chưa đăng bán)*
        
    - Tìm kiếm ý tưởng: dựa trên sku, msku là đủ.
        
    - Lọc ý tưởng: Sẽ filter theo trạng thái, người làm, chủ đề, tháng làm.
        
    - Sắp xếp ý tưởng: mặc định tùy theo ý tưởng đang ở giai đoạn/view nào — ví dụ ở danh sách "chờ xem xét ý tưởng" thì sắp theo ngày tạo; ở danh sách "chờ làm ảnh" thì sắp theo ngày ý tưởng được duyệt. Ngoài ra cho phép người dùng tự đổi sang sắp xếp theo người tạo hoặc mức độ ưu tiên (nếu đã vào sản xuất). *(✏️ ĐÃ SỬA theo xác nhận: chức năng này ít dùng, mặc định phụ thuộc vào giai đoạn/view hiện tại thay vì 1 tiêu chí cố định)*

 - Quản lý quá trình sản xuất:
    - SKU/MSKU sản phẩm cần sản xuất: liên kết tới ý tưởng/sản phẩm tương ứng. *(✏️ ĐÃ THÊM: bản gốc liệt kê các trường tiến độ nhưng không có trường nào liên kết tới sản phẩm/SKU cụ thể — nếu thiếu thì không xác định được yêu cầu sản xuất này là cho sản phẩm nào)*
    - Mức độ ưu tiên: Khẩn cấp, ưu tiên, bình thường.
    - Thời gian tạo yêu cầu sản xuất (đã duyệt file và đi vào sản xuất): mặc định là thời gian hiện tại.
    - Số lượng yêu cầu sản xuất
    - Số lượng thực tế.
    - Danh sách công đoạn sản xuất: không cố định là "Cắt rồi In" cho mọi sản phẩm — tùy sản phẩm mà có thể chỉ cần Cắt, chỉ cần In, Cắt trước In sau, hoặc In trước Cắt sau. Mỗi sản phẩm sẽ có 1 danh sách công đoạn riêng (xác định theo SKU/chủ đề sản phẩm), mỗi công đoạn gồm:
        - Tên công đoạn (Cắt / In / ...)
        - Người thực hiện: chọn từ danh sách tên có sẵn dạng **dropdown** (không gắn với tài khoản đăng nhập, vì máy trong xưởng dùng chung nên không bắt đăng nhập riêng từng máy).
        - Thời gian bắt đầu, thời gian hoàn tất (để tránh 2 người cùng xử lý 1 công đoạn).
        *(✏️ ĐÃ SỬA theo xác nhận: thay 2 trường cố định "Tiến độ cắt"/"Tiến độ in" bằng danh sách công đoạn linh hoạt theo từng sản phẩm; thêm "Người thực hiện" dạng chọn tên có sẵn thay vì đăng nhập)*
    - Thời gian hoàn tất (đóng vào thùng)
    - Ghi chú của quản lý dành cho thợ (tùy chọn)
    - sắp xếp theo mức độ ưu tiên, từ cao đến thấp hoặc sắp xếp theo thời gian yêu cầu sản xuất.

 - Quản lý đơn hàng
    Thông thường, xưởng sản xuất hàng sẽ đi vào kho amazon ở dạng FBA. Tuy nhiên, đôi khi sẽ có một vài đơn lẻ là FBM. Bên cạnh đó, còn có những đơn của Etsy nữa. Nên chúng ta cần quản lý các đơn hàng lẻ này.
    - Amazon hay Etsy
    - Tracking.
    - Ngày có đơn (Date)
    - Name
    - SDT
    - Address
    - Address2
    - City
    - State
    - Zipcode
    - Country
    - Order ID
    - Chi tiết hàng
    - Cân nặng (nặng)
    - Kích thước (Dài, Rộng, Cao)
    - Dịch vụ (thường là US Express)
    - Số lượng (SL)
    - SKU
    - Đơn giá (Unit Price)
    - ACC (tùy vào acc amazon hay etsy)
    - CUSTOM (thường các đơn lẻ là các đơn personalized. Nên sẽ có mục custom để khách điền tên hoặc ghi chú gì đó)
    - Ảnh (ẢNH): show lên ảnh dựa trên sku hoặc msku
    - Đã thêm tracking lên sàn (checkbox): tích chọn khi đã điền mã tracking vào đơn trên sàn (Amazon/Etsy) để khách tiện theo dõi. *(✏️ ĐÃ SỬA: theo bạn xác nhận, đổi tên trường cho rõ nghĩa và đổi từ dropdown/text sang dạng checkbox đơn giản (✓ đã thêm / ✗ chưa thêm))*
    - Trạng thái sản xuất (trạng thái SX): Thường chỉ có đang sx, đã sx, chờ Fullfilment, đã fullfilment hoặc FF AMZ.
    - Người thiết kế (Designer): Các đơn cá nhân sẽ có người design lại theo thông tin, yêu cầu từ khách. Còn đơn FBA thường được thiết kế từ trước nên sẽ để là người làm ra file trước đó nếu không có đăng file mới. Nếu file sx để trống, người thiết kế sẽ là người chỉnh sửa link file lấy từ sku, nếu không thì sẽ là người thêm file sx.
    - File sản xuất (File sx): Nếu hàng personalize sẽ cần có người làm file sx lại.
    - Người sản xuất (người sx): thường sẽ có 1 người duy nhất đảm nhiệm việc này.
    - Link file (Link File): là file thiết kế, lấy từ sku. Sản phẩm này có thể là chưa có file thiết kế, vì nếu đi fbm hoặc etsy thì không cần sx số lượng trước khi đăng bán, nên không cần làm file thiết kế sẵn.
    - Link sản phẩm (link SP): Tạo liên kết từ asin, hoặc listing id 
    - Ghi chú (NOTE)

  - Quản lý shipment:
  Đây là nơi để quản lý các thùng hàng ship qua kho fba. Trong một ngày có thể đi nhiều thùng hàng. Đoạn này để tôi mô tả kỹ hơn. Mỗi thùng hàng sẽ có thể có 1, hoặc nhiều sku. Mỗi sku sẽ có số lượng khác nhau. Và chúng tôi sẽ chia mỗi sku ra vài thùng, tương ứng với các kho khác nhau. Ví dụ có 5 SKU A(90), B(90), C(90), D(100), E(100) được chia vào 10 thùng hàng. Trong ngày hôm nay, chúng tôi sẽ ship cả 10 thùng hàng này đến kho của Amazon. 3 SKU A, B, C sẽ chia đều vào 5 thùng ship đến 5 kho khác nhau, mỗi thùng 18 cái (90/5=18). Còn D và E sẽ mỗi SKU vào 5 thùng ship vào 5 kho khác nhau, mỗi thùng 20 cái (100/5=20). Các trường thông tin sẽ được điền như sau:
    - date: hôm nay (tùy vào ngày đi hàng).
    - Tên account AMZ (tùy vào thùng hàng)
    - ID ship ment: mỗi thùng hàng sẽ có 1 id shipment riêng. (tùy vào thùng hàng)
    - name box: thường được đánh dấu là box 1, box2 ...(tùy vào thùng hàng)
    - kho: hiển thị mã kho của thùng hàng này đi đến. (tùy vào thùng hàng)
    - link Label: để in, chứa mã và id shipment. (nó sẽ là 1 file pdf chứa các mã vận đơn, với mỗi mã vận đơn sẽ có mã id shipment và mã sku) (tùy vào thùng hàng)
    - số lượng box: chỉ sản phẩm có mã sku này nằm trong bao nhiêu thùng. ví dụ ở trên (SKU A, B, C) có số lượng là 90, mỗi thùng 18 cái, thì 3 sku này sẽ có số lượng box là 5 thùng. (nó là tổng số box của SKU này nằm trong shipment này) (tùy vào SKU)
    - Line ship: Thường là SEA, SBay, Air VNL,.. gợi ý 3 cái trên(bắt buộc), và cho phép tự điền, hoặc gợi ý các nội dung đã từng điền (tùy vào thùng hàng)
    - tên hàng: chính là MSKU (tùy vào SKU)
    - Ảnh của SKU đó (tùy vào SKU)
    - SKU (tùy vào SKU)
    - FNSKU (tùy vào SKU)
    - sl sp trong 1 box (tùy vào SKU)
    - sl tổng: (tính theo sl sp trong 1 box nhân với sl box) (tùy vào SKU)
    - Kích thước thùng hàng (cm) nhân viên điền (tùy vào thùng hàng)
        - Dài (cm)
        - Rộng (cm)
        - Cao (cm)
    - Cân nặng thùng hàng (kg) nhân viên điền (tùy vào thùng hàng)
    - Kích thước thùng hàng (inch) tự động đổi sang inch từ cm (tùy vào thùng hàng)
        - Dài (inch)
        - Rộng (inch)
        - Cao (inch)
    - Cân nặng thùng hàng (Lb) tự động đổi sang Lb từ kg (tùy vào thùng hàng)
    - mã tracking (tùy vào thùng hàng)

 - Quản lý thông báo (Notification) *(✏️ ĐÃ THÊM nguyên mục này dựa theo mô tả chi tiết của bạn)*:
    - Mỗi nhân viên có danh sách thông báo riêng, đánh dấu được đã đọc / chưa đọc.
    - Khi có thông báo mới: hiện popup trong vài giây (dùng component toast/notification có sẵn của Shadcn/ui). Nếu nhiều thông báo đến liên tiếp thì hiện lần lượt hết, không gộp hay chặn thông báo sau.
    - Thông báo có thể là "thông báo hành động" (action): có nút bấm để đưa nhân viên tới đúng nơi cần xem/xử lý — nút này **mở ở tab mới** để không làm mất công việc nhân viên đang làm dở ở tab hiện tại.

 - Dashboard / Thống kê *(✏️ ĐÃ THÊM nguyên mục này dựa theo mô tả chi tiết của bạn)*:
    - Phân quyền xem: **Nhân viên** chỉ xem được thống kê/dashboard của chính mình. **Quản lý** và **Sếp** xem được thống kê của toàn bộ nhân viên. *(✏️ ĐÃ SỬA theo xác nhận)*
    - **Thống kê theo nhân viên, theo tháng**: số ý tưởng đã tạo, số ý tưởng đã được duyệt, số ảnh đã làm, số video đã làm, số content A+ đã làm — theo từng nhân viên, theo từng tháng.
    - **Thống kê theo liên kết ý tưởng gốc**: với mỗi liên kết sản phẩm gốc, hiển thị dạng danh sách: liên kết đó đã được dùng làm nguồn cảm hứng cho bao nhiêu ý tưởng, và danh sách các ý tưởng đó là gì.

 * Hãy thêm một danh mục để quản lý tool. Tạm thời hãy để là tool 1, tool 2, tool 3 và để trang trống.
    
## Công nghệ sử dụng 

- Node js
- Shadcn/ui --preset b1D0dv72 (dùng toàn bộ component của shadcn/ui, lấy skill bằng npx skills add shadcn/ui, I’m looking at this shadcn/ui documentation: https://ui.shadcn.com/docs/components. )
- Icon lucide
- Lưu trữ file ảnh, file sản xuất đều nằm trên google drive và quản lý bằng liên kết.

**Đề xuất bổ sung** *(✏️ ĐÃ THÊM — bạn để mình chọn công nghệ phù hợp Node.js, dễ triển khai; đây là gợi ý, không bắt buộc, có thể đổi nếu bạn/đội dev có công nghệ quen thuộc hơn)*:
- **Next.js** (chạy trên Node.js, kết hợp tự nhiên với Shadcn/ui + Tailwind đã chọn sẵn).
- **PostgreSQL** + **Prisma ORM** cho database — phù hợp dữ liệu quan hệ nhiều bảng như ý tưởng, đơn hàng, shipment, sản xuất.
- **Auth.js (NextAuth)** cho đăng nhập bằng Email/mật khẩu.
- Triển khai: **Vercel** (cho phần web) kết hợp **Neon/Supabase** (Postgres miễn phí, dễ setup) — deploy nhanh, ít cấu hình.
