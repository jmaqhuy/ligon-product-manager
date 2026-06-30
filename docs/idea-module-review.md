# Báo cáo Code Review & Business Logic: Module Quản lý Ý tưởng (Ideas)

Dưới góc độ của một Senior Developer, mình đã tiến hành scan và review toàn diện module **Quản lý Ý tưởng** của hệ thống, bao gồm từ Database Schema (Prisma), các trang giao diện (Frontend) và toàn bộ các API Routes xử lý nghiệp vụ (Backend).

Hệ thống có tư duy sản phẩm rất tốt, đáp ứng đúng nhu cầu thực tế của team e-commerce/POD. Tuy nhiên, về mặt kỹ thuật, dự án đang tích tụ một lượng **Technical Debt (nợ kỹ thuật)** khá lớn do cách tổ chức code "rapid development".

Dưới đây là đánh giá chi tiết:

---

## 1. Những điểm ĐÃ LÀM TỐT (Điểm sáng của dự án)

*   **Tư duy UX thực dụng:** UI tập trung vào hiệu suất làm việc của nhân sự. Các tính năng như Copy nhanh (MSKU, Tags, ASIN), phím tắt, popup xem ảnh nhanh ngay trong bảng là những điểm chạm UX cực kỳ đáng giá.
*   **Real-time & Optimistic UI xuất sắc:** 
    * Việc áp dụng WebSocket (`socket-provider`) để bắn notification và live-update UI rất ấn tượng.
    * Cơ chế **Conflict Resolution** (Backend có check trường `version` - Optimistic Locking, Frontend có cảnh báo khi người khác đang edit) thể hiện tư duy thiết kế hệ thống có tính đồng thời (concurrency) cao. Rất ít dự án ở scale này làm được điều này chỉn chu.
*   **Backend Validation & State Machine chặt chẽ:** Tại các route API cập nhật trạng thái sàn (`/amazon-listing`, `/etsy-listing`), Backend không tin tưởng mù quáng vào Frontend. API tự động kiểm tra xem các trường bắt buộc (Title, Bullet Points, Ảnh) có đủ số lượng không trước khi cho phép chuyển trạng thái `uploading` hay `published`. Điều này ngăn chặn rác dữ liệu rất tốt.
*   **Audit Logging & Transactions:** Việc lưu log lịch sử chỉnh sửa (`AuditLog`) và sử dụng `db.$transaction` khi cập nhật dữ liệu cốt lõi (PATCH idea) giúp đảm bảo tính toàn vẹn (ACID) cho database.

---

## 2. Những điểm BẤT CẬP về Kiến trúc & Code (Tech & Code Smells)

### 2.1. Ở phía Frontend
*   **"God Components" (Ôm đồm quá nhiều thứ):** Các file `ideas/page.tsx` (~900 dòng) và `ideas/[id]/page.tsx` (~1500 dòng) quá khổng lồ. Chúng trộn lẫn việc Fetch API, render Layout, xử lý Form State, Modal in nhãn, Bulk Action... Điều này khiến việc maintain, đọc code hoặc tìm bug trở thành ác mộng. Bắt buộc phải **chia nhỏ Component**.
*   **Quản lý Form thủ công & Thiếu thư viện:** Bạn đang dùng `useState` lưu object form khổng lồ và viết tay từng hàm `onChange`, tự validate bằng `if/else`. **Đây là một sự phí phạm lớn trong hệ sinh thái React**. Hãy áp dụng **`react-hook-form` + `zod`** để tự động hóa việc bind data, validate và kiểm soát re-render.
*   **Performance Killer - Parse JSON trong lúc Render:** Tại các tab Amazon/Etsy, hàm `JSON.parse(idea.amazonListing?.bulletPoints || "[]")` được gọi trực tiếp bên trong mã JSX. Nghĩa là mỗi lần component re-render (người dùng gõ 1 phím), nó lại tốn CPU để parse JSON lại từ đầu. Cần parse một lần khi fetch data hoặc dùng `useMemo`.
*   **Lạm dụng kiểu `any` (Vô hiệu hóa Typescript):** Rất nhiều chỗ khai báo `const [idea, setIdea] = useState<any>(null)`. Việc này tước đi sức mạnh bắt lỗi của Typescript. Nếu API thay đổi tên biến, app sẽ crash lúc chạy thay vì báo lỗi lúc code.
*   **Render Modal trong Vòng lặp:** Tại danh sách ý tưởng, bạn đặt `<Dialog>` (Preview ảnh) bên trong hàm `.map()` của bảng. Nếu bảng có 50 dòng, DOM sẽ ngầm sinh ra 50 cái modal bị ẩn. Cách đúng là chỉ để 1 `<Dialog>` duy nhất bên ngoài bảng và truyền `previewUrl` vào nó khi click.
*   **In ấn bằng `document.write`:** Tính năng in label mở một window mới và `document.write` mã HTML thô. Đây là cách làm hacky, dễ bị trình duyệt chặn (popup blocker) hoặc dính lỗi CSP. Hãy tạo một trang (route) riêng biệt cho việc in và dùng CSS `@media print`.

> [!NOTE]
> **Câu hỏi của Senior Dev cho mục 2.1 (Frontend):** Bạn có đồng ý cài thêm các thư viện hỗ trợ như `react-hook-form` (quản lý form), `zod` (validation) và `nuqs` (đồng bộ bộ lọc lên URL) để chuẩn hóa lại giao diện Frontend không? Dự án của bạn có quy định khắt khe nào về việc giới hạn thư viện bên thứ ba không?
> *   *Phản hồi của bạn:* [Tôi đồng ý cài thêm thư viện hỗ trợ. Dự án có quy định sử dụng các thư viện phổ biến và có uy tín. Các thư viện chuẩn và có cộng đồng sử dụng lớn.]


### 2.2. Ở phía Backend & Database
*   **Lưu mảng/dữ liệu phức tạp bằng String (JSON Stringified):** Do Prisma thiết lập dùng SQLite, bạn phải lưu các trường như `tags`, `bulletPoints`, `galleryImages` dưới dạng chuỗi JSON. Bất cập lớn: Không thể dùng DB để query (Ví dụ: "Tìm ý tưởng có chứa tag Halloween"). Nếu tương lai dùng PostgreSQL, hãy đổi qua kiểu `Jsonb`, hoặc tách bảng con (Ví dụ `AmazonListingTag`).
*   **Vấn đề N+1 Update trong API Batch (`/api/ideas/batch/route.ts`):** 
    * Hiện tại bạn dùng vòng lặp `for (const id of ids)` và chạy lệnh `db.idea.update` từng cái một.
    * Nếu user chọn 50 ý tưởng để duyệt, API sẽ mở 50 kết nối cập nhật tuần tự.
    * **Khắc phục:** Nên dùng `db.idea.updateMany` (nếu logic đồng nhất) hoặc gói vào `Promise.all()` để chạy song song.
*   **Lặp code (Duplication) ở Amazon và Etsy Route:** Logic validation, parse JSON, check điều kiện ở 2 route này giống nhau đến 80%. Nên extract ra các helper function dùng chung.
*   **Xóa bằng tay thừa thãi trong Transaction:** Ở API DELETE (`/api/ideas/[id]/route.ts`), bạn gọi các lệnh xóa thủ công `tx.amazonListing.delete` trước khi xóa `Idea`. Thực tế trong file `schema.prisma`, bạn đã set `onDelete: Cascade` cho các bảng con này rồi. Việc gọi thủ công là thừa và làm code dài thêm.

> [!NOTE]
> **Câu hỏi của Senior Dev cho mục 2.2 (Backend & Database):** Về môi trường Production và Database của dự án, bạn dự định chạy chính thức trên SQLite hay sẽ chuyển qua PostgreSQL/MySQL trong tương lai gần? Điều này ảnh hưởng trực tiếp đến cách tối ưu và kiểu dữ liệu cho các cột lưu trữ mảng (JSON String vs Native JSON).
> *   *Phản hồi của bạn:* [Tôi sẽ chuyển qua sử dụng PostgreSQL khi đẩy dự án lên Production.]


---

## 3. Những điểm BẤT CẬP về Nghiệp vụ (Business Logic)

*   **Tính toán Đơn vị đo lường (mm / cm / in):** 
    * Ở giao diện chi tiết, logic đổi đơn vị được tính trực tiếp từ giá trị hiển thị trên form, nhân/chia và làm tròn rồi gắn lại vào Form State.
    * Rủi ro: Làm tròn số thập phân nhiều lần qua lại sẽ gây sai lệch dữ liệu gốc.
    * **Khắc phục:** **Database và System State chỉ lưu 1 đơn vị duy nhất (ví dụ chuẩn hóa toàn bộ về `mm`)**. Select box (mm/cm/in) chỉ là "View Mode" để tính toán lúc hiển thị (Display Formatting).
*   **State Filters không đồng bộ với URL:** 
    * Ở trang `/ideas`, các bộ lọc (status, month, search...) đang lưu vào React State cục bộ (`useState`). 
    * Nếu một quản lý tạo ra một bộ lọc phức tạp và copy link gửi cho nhân viên, nhân viên đó mở lên sẽ thấy bảng... trống rỗng, vì state không lưu vào URL.
    * **Khắc phục:** Đồng bộ bộ lọc lên Query Params của URL (có thể dùng thư viện `nuqs` - Next Use Query State).
*   **Khả năng mở rộng Sàn thương mại điện tử (Scalability):** 
    * Schema hiện tại fix cứng `amazonListing` và `etsyListing` như 2 relationship trực tiếp trên bảng `Idea`.
    * Nếu tháng sau công ty mở rộng bán trên Shopify, Tiktok Shop, eBay, bạn sẽ phải vào Database thêm cột, vào Backend viết thêm hàng tá Route API mới, vào Frontend tạo thêm các Tab mới.
    * **Khắc phục dài hạn:** Chuyển sang mô hình 1-N. Bảng `Idea` -> N bảng `PlatformListing` (có cột `platform = 'AMAZON' | 'ETSY' | 'SHOPIFY'`). Dữ liệu riêng của từng sàn (như ASIN của Amazon hay Recipe của Shopify) được lưu trong 1 trường `config` dạng JSON.

> [!NOTE]
> **Câu hỏi của Senior Dev cho mục 3 (Nghiệp vụ & Hướng phát triển):** Định hướng kinh doanh trong 3-6 tháng tới của bạn là gì? Bạn có kế hoạch mở rộng bán sản phẩm sang các sàn thương mại khác (như Shopify, TikTok Shop, Shopee, eBay...) không? Nếu có, việc chuyển đổi Database Schema sang quan hệ 1-N là cực kỳ cấp thiết.
> *   *Phản hồi của bạn:* [Khả năng cao sẽ mở rộng sang Tiktok Shop]


---

## 4. Đề xuất Kế hoạch Cải thiện (Action Items)

Là một dự án đang chạy thực tế, không nên đập đi xây lại. Hãy áp dụng **cải tiến tăng dần (Iterative Refactoring)**:

1. **Sprint 1 (Dọn dẹp Frontend):**
   * Tách trang Detail và List thành các component nhỏ hơn (dưới 300 dòng/file).
   * Rút Dialog preview ảnh ra khỏi vòng lặp Table.
   * Áp dụng URL Query cho các Filter ở trang danh sách.

2. **Sprint 2 (Áp dụng thư viện chuẩn hóa):**
   * Loại bỏ việc tự quản lý state form, cài đặt `react-hook-form` + `@hookform/resolvers/zod`. Định nghĩa Zod Schema thật chặt để bắt lỗi validation ngay tại client.
   * Tạo file `types.ts` định nghĩa rõ các Type/Interface thay vì dùng `any`.

3. **Sprint 3 (Tối ưu Backend & DB):**
   * Refactor API Batch dùng `Promise.all`.
   * Gom chung logic Validation trạng thái của sàn Amazon/Etsy thành thư viện dùng chung.
   * Nếu có kế hoạch đẩy lên Production với lượng data lớn, hãy cân nhắc migrate từ SQLite sang PostgreSQL để tận dụng `Jsonb`.
