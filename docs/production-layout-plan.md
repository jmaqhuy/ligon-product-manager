# Kế hoạch triển khai: Quản lý File Sản xuất (Ganging/Nesting)

> **Ngày:** 2026-07-01 | **Phạm vi:** Schema + API + UI + Thuật toán gợi ý sản xuất
> **Mục tiêu:** Số hóa quy trình dàn trang file sản xuất, tối ưu vật liệu (ganging/nesting), và gợi ý thông minh khi tạo lệnh sản xuất.

---

## 📋 Tổng quan

### Vấn đề hiện tại
- Designer dàn trang thủ công trên Illustrator/Corel, không có nơi lưu trữ thông số layout.
- Khi tạo `ProductionRequest`, Quản lý phải tự tính toán số lần chạy máy, không có gợi ý tối ưu.
- Worker ở xưởng không có thông tin trực quan về kích thước phôi và loại vật liệu.

### Giải pháp
2 bảng mới: **`ProductionLayout`** (lưu file + thông số phôi) và **`ProductionLayoutItem`** (ánh xạ SKU trong layout). Tích hợp thuật toán tính số lần chạy + gợi ý cross-selling vào flow tạo `ProductionRequest`.

---

## 🗂️ Kiến trúc dữ liệu

### Schema Prisma (thêm vào `schema.prisma`)

```prisma
// ============================
// Module: Production Layouts (Ganging/Nesting)
// ============================
model ProductionLayout {
  id              String   @id @default(cuid())
  code            String   @unique // e.g., LAYOUT-BABY-SIGN-001
  name            String?  // Human-readable name
  materialCode    String   @map("material_code") // e.g., BW-3-MXL, BW-2-T, ACRYLIC-3MM
  materialWidth   Float    @map("material_width") // Phôi rộng (mm)
  materialLength  Float    @map("material_length") // Phôi dài (mm)
  dxfFileUrl      String   @map("dxf_file_url") // File cắt laser (bắt buộc)
  pdfFileUrl      String?  @map("pdf_file_url") // File in UV (tùy chọn)
  status          String   @default("active") // active | archived
  isVerified      Boolean  @default(false) @map("is_verified")
  verifiedById    String?  @map("verified_by_id")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  items      ProductionLayoutItem[]
  verifiedBy User?                 @relation("LayoutVerifier", fields: [verifiedById], references: [id])

  @@map("production_layouts")
}

model ProductionLayoutItem {
  id                 String   @id @default(cuid())
  productionLayoutId String   @map("production_layout_id")
  ideaId             String   @map("idea_id")
  quantityPerRun     Int      @map("quantity_per_run") // Số lượng sản phẩm này trong 1 lần chạy

  productionLayout ProductionLayout @relation(fields: [productionLayoutId], references: [id], onDelete: Cascade)
  idea             Idea             @relation(fields: [ideaId], references: [id], onDelete: Cascade)

  @@unique([productionLayoutId, ideaId])
  @@map("production_layout_items")
}
```

### Quan hệ với các bảng hiện có
- `ProductionLayout.verifiedById` → `User.id` (1 worker xác minh file)
- `ProductionLayoutItem.ideaId` → `Idea.id` (1 SKU có mặt trong layout)

### Thay đổi bảng `ProductionRequest` hiện có
Thêm 1 trường mới để lưu snapshot layout tại thời điểm tạo request:

```prisma
model ProductionRequest {
  // ... existing fields ...
  status          String   @default("ready") @map("status") // awaiting_layout | ready | producing | completed
  layoutSnapshot  String?  @map("layout_snapshot") // JSON snapshot của { layoutId, code, materialCode, materialWidth, materialLength, dxfFileUrl, pdfFileUrl, runs, items[] } tại thời điểm tạo request
}
```

**Trạng thái `ProductionRequest.status`:**
| Trạng thái | Ý nghĩa | Hành vi ở xưởng |
|---|---|---|
| `awaiting_layout` | Đã tạo lệnh nhưng chưa có file layout phù hợp — đang chờ Designer làm file | Thẻ bị làm mờ (greyed out), badge "⏳ Đang chờ File thiết kế", không thao tác được |
| `ready` | Đã có file layout, sẵn sàng đưa vào sản xuất | Thẻ sáng bình thường, có nút tải file + verify |
| `producing` | Đang trong quá trình sản xuất (có step đã bắt đầu) | Hiển thị tiến độ step như hiện tại |
| `completed` | Đã hoàn thành sản xuất (`completedAt` không null) | Badge xanh "Hoàn thành" |

> **Tại sao cần field riêng thay vì nhét vào `noteForWorkers`:**
> - `noteForWorkers` là trường ghi chú do Quản lý nhập cho Worker đọc — nhét JSON vào đây sẽ làm hỏng trải nghiệm đọc nếu vô tình hiển thị/in ra.
> - Tách field riêng giúp parse lại data dễ dàng khi cần thống kê hoặc hiển thị thông tin layout trên UI chi tiết request.
> - Đây là pattern "Snapshot in time" chuẩn của hệ thống ERP: dữ liệu lịch sử không bị hỏng khi Layout gốc bị sửa/archive sau này.

---

## 🔢 Thuật toán xử lý Lệnh sản xuất & Gợi ý

### Đầu vào
- `requirements: Map<ideaId, requestedQty>` — yêu cầu từ Quản lý

### Đầu ra
- Danh sách `RunPlan[]`: mỗi phần tử = { `layoutId`, `runs` (số lần chạy), `items: Map<ideaId, producedQty>` }
- `Suggestions[]`: gợi ý cross-selling (nếu có)

### Logic cốt lõi (`src/lib/production-layout-engine.ts`)

```
function calculateRuns(requestedQty, quantityPerRun) => Math.ceil(requestedQty / quantityPerRun)
```

#### Bước 1: Gom nhóm SKU cần sản xuất
Từ danh sách `requirements`, tạo `remaining: Map<ideaId, qty>`.

#### Bước 2: Tìm layout tối ưu
Với mỗi layout trong DB (đã lọc theo `status = "active"`):
1. Tính `score = số SKU requirements có trong layout (matchCount)` + `bonus nếu matchCount = totalItems (perfect match)`.
2. Sắp xếp layout theo: `bonus (perfect match)` → `matchCount` giảm dần → `quantityPerRun` giảm dần.

#### Bước 3: Phân bổ lần chạy (Greedy)
```
for each layout (sorted by score desc):
    for each item in layout:
        if remaining[item.ideaId] > 0:
            neededRuns = ceil(remaining[item.ideaId] / item.quantityPerRun)
            record: layout.runs = max(layout.runs, neededRuns)
    // Cập nhật remaining sau khi trừ sản lượng layout sinh ra
    for each item in layout:
        remaining[item.ideaId] -= layout.runs * item.quantityPerRun
```

#### Bước 4: Gợi ý (Suggestions)

**Hằng số cấu hình (configurable thresholds):**
```typescript
// src/lib/production-layout-engine.ts
// Có thể override qua SystemSetting trong tương lai, không cần deploy lại code
const MAX_OVERPRODUCTION_THRESHOLD = 0.2;  // 20% — ngưỡng cảnh báo dư thừa
```
> **Tại sao tách thành hằng số:** Xưởng sản xuất thường thay đổi mức chấp nhận hao hụt theo thời kỳ hoặc theo vật liệu đắt/rẻ. Việc tách khỏi logic code cho phép cấu hình lại qua `SystemSetting` (bảng đã có sẵn) mà không cần deploy.

**Loại A — Điều chỉnh số lượng dư thừa lớn:**
Với mỗi layout có runs ≥ 1 và lượng dư > `MAX_OVERPRODUCTION_THRESHOLD`:
→ Gợi ý: "Chạy X lần cho Y SKU dư Z cái. Có muốn giảm xuống (X-1) lần không?"

**Loại B — Cross-selling (cảnh báo cạn kho):**
Với mỗi layout đã chọn để chạy, kiểm tra các SKU trong layout KHÔNG có trong `requirements`:
→ Gợi ý: "Layout [code] còn chứa mã [msku]. Có muốn thêm vào lệnh này không?"

**Loại C — Không tìm thấy layout cho SKU:**
Khi một `ideaId` trong `requirements` không xuất hiện trong bất kỳ `ProductionLayout` nào:
→ `remaining` vẫn giữ nguyên số lượng đó. Trả về `{ type: "no_layout", ideaIds: [...] }` để UI hiển thị nút "Yêu cầu Layout mới".

**Loại D — Tỷ lệ dư thừa vượt ngưỡng cứng:**
Khi lượng dư vượt quá một ngưỡng cứng cao hơn (ví dụ `MAX_WASTE_CRITICAL = 0.5`, tức 50%):
→ Gợi ý: "Tỷ lệ hao phí lên tới X%. Cân nhắc yêu cầu Designer làm file mới thay vì chạy file hiện tại."
→ UI hiển thị thêm nút "Yêu cầu Layout mới" bên cạnh nút "Vẫn tiếp tục".

---

## 🔄 Workflow: Yêu cầu Layout mới & Báo lỗi file

Tính năng này khép kín vòng phản hồi giữa Quản lý, Worker, và Designer — tận dụng bảng `Notification` có sẵn (field `isCompleted`) thay vì tạo bảng mới.

### Touchpoint 1 — Quản lý yêu cầu Layout mới (từ Dialog tạo ProductionRequest)

**Kích hoạt khi:** Thuật toán suggest trả về Loại C (không có layout) hoặc Loại D (dư thừa > 50%).

**Nguyên tắc cốt lõi:** **Luôn tạo `ProductionRequest` ngay lập tức.** Không bắt Quản lý/Sếp phải "nhớ" quay lại tạo lệnh sau — điều này cực kỳ dễ gây sót việc. Lệnh được tạo ở trạng thái `awaiting_layout` (treo), tự động kích hoạt khi Designer hoàn thành file.

**UI:**
- Dưới bảng kết quả gợi ý (khi không có layout), thay vì ẩn nút "Tạo yêu cầu", hiển thị **radio group** với 2 lựa chọn:
  1. **"Tạo lệnh & Yêu cầu Layout mới"** (mặc định được chọn) — tạo `ProductionRequest` với `status = "awaiting_layout"`, đồng thời gửi notification cho Designer.
  2. **"Tạo lệnh với file hiện tại"** — vẫn dùng file cũ dù dư thừa cao (nếu có layout Loại D).
- Có textarea "Ghi chú cho Designer" (VD: *"Làm gấp file ghép 50 Mã A + 20 Mã B cho ván BW-3-MXL"*).

**Luồng xử lý Server-side:**
1. **Tạo `ProductionRequest`** với:
   - `status = "awaiting_layout"`
   - `layoutSnapshot = null` (chưa có file)
   - `noteForWorkers` chứa ghi chú "Đang chờ file layout — dự kiến vật liệu [materialCode]"
   - Các field `ideaId`, `type`, `priority`, `requestedQty`, `steps` vẫn được điền đầy đủ như thường.
2. **Tự động gọi `POST /api/production-layouts/request`** (type: `layout_requested`) để tạo `Notification` gán cho toàn bộ Designer (`employee`).
3. Socket.io bắn realtime notification đến Designer.
4. Designer vào `/my-tasks`, xem yêu cầu, làm file mới trên Illustrator.
5. Designer upload file → tạo `ProductionLayout` mới (kèm `quantityPerRun` cho từng SKU) → tick `isCompleted = true` trên notification.
6. **Auto-trigger:** Hệ thống phát hiện `isCompleted = true` → quét các `ProductionRequest` đang `awaiting_layout` có chứa SKU trong layout mới → tự động chạy `suggestProductionRuns` để tính `layoutSnapshot` → cập nhật `status = "ready"` → thẻ công việc dưới xưởng tự động sáng lên, mở khóa nút tải file.

### Touchpoint 2 — Worker báo lỗi file (từ thẻ công việc dưới xưởng)

**Kích hoạt khi:** File đang chạy gặp vấn đề vật lý (đường nét quá sát gây cháy cạnh, sai kích thước phôi, hao hụt thực tế cao bất thường).

**UI:**
- Trên thẻ công việc (Task Card) của Worker, bên cạnh nút "Tải file" và "Verify File", thêm nút **"Báo lỗi file"** (icon `AlertTriangle`, màu đỏ).
- Click mở Dialog: dropdown chọn lý do (các lỗi phổ biến):
  - `File hỏng / không mở được`
  - `Hao hụt thực tế quá cao`
  - `Sai độ dày vật liệu`
  - `Đường nét quá sát, gây cháy cạnh`
  - `Sai kích thước phôi`
  - `Khác (nhập tự do)`
- Có textarea nhập ghi chú bổ sung.

**Luồng xử lý:**
1. **Đổi trạng thái `ProductionLayout`:** `isVerified = false` (để các ca sau không "nhắm mắt" chạy file lỗi).
2. **Tạo `Notification`:**
   - `type`: `"layout_revision_requested"`
   - `category`: `"production_file"`
   - `priority`: `"urgent"`
   - `message`: lý do + ghi chú từ Worker
   - `userId`: gán cho tất cả user có role `employee`
   - `actionUrl`: `/production/layouts/[id]` (link trực tiếp đến layout cần sửa)
3. **Lệnh sản xuất không bị chặn hoàn toàn** — Worker vẫn có thể tiếp tục chạy các phần khác của đơn hàng. Thẻ công việc chuyển sang viền vàng/cam kèm badge "Chờ sửa file" để cảnh báo trực quan.

### Tận dụng `Notification.isCompleted` + Auto-trigger

Bảng `Notification` đã có sẵn field `isCompleted`. Khi Designer tick hoàn thành, hệ thống tự động kích hoạt các lệnh sản xuất đang treo:

```
Quản lý tạo ProductionRequest(status=awaiting_layout)
    → Notification(isCompleted=false) gửi Designer
    → Designer làm file, tạo ProductionLayout, tick isCompleted=true
    → AUTO-TRIGGER: quét ProductionRequest đang awaiting_layout, chạy suggestProductionRuns, gắn layoutSnapshot, chuyển status=ready
    → Thẻ công việc dưới xưởng tự sáng lên, Worker tải file và bắt đầu sản xuất
```

**Logic Auto-trigger (`src/lib/layout-auto-activator.ts`):**
```typescript
// Gọi khi Notification.isCompleted chuyển từ false → true (type = layout_requested)
async function activateAwaitingRequests(layoutId: string, ideaIds: string[]) {
  // 1. Tìm tất cả ProductionRequest đang awaiting_layout, có ideaId trong danh sách
  const pendingRequests = await db.productionRequest.findMany({
    where: {
      status: "awaiting_layout",
      ideaId: { in: ideaIds }
    }
  });
  
  // 2. Với mỗi request, chạy lại suggestProductionRuns để tính layoutSnapshot
  for (const req of pendingRequests) {
    const { runPlan } = await suggestProductionRuns(
      new Map([[req.ideaId, req.requestedQty]])
    );
    
    // 3. Cập nhật layoutSnapshot + chuyển status sang ready
    await db.productionRequest.update({
      where: { id: req.id },
      data: {
        layoutSnapshot: JSON.stringify(runPlan),
        status: "ready"
      }
    });
  }
}
```

**Ghi chú:** Auto-trigger chạy trong cùng transaction với PATCH notification (đánh dấu `isCompleted`). Nếu có nhiều request đang treo cùng lúc, tất cả đều được kích hoạt.

### API mới: `POST /api/production-layouts/request`

**Quyền:** `manager`, `boss`, `worker`
**Body:**
```json
{
  "type": "layout_requested" | "layout_revision_requested",
  "layoutId": "clx..." (chỉ với revision_requested),
  "ideaIds": ["id1", "id2"],
  "materialCode": "BW-3-MXL" (tùy chọn),
  "note": "Làm gấp file ghép 50 Mã A + 20 Mã B"
}
```
**Logic:** Tạo `Notification` cho tất cả `employee` đang active, bắn Socket.io realtime, trả về danh sách notification đã tạo.

---

## 🗺️ API Routes (Backend)

### 1. `GET /api/production-layouts`
**Quyền:** `employee`, `manager`, `boss`
**Tham số query:** `?status=active|archived`, `?search=code`, `?ideaId=` (lọc layout chứa SKU cụ thể)
**Trả về:** Danh sách `ProductionLayout` + kèm `items` (với `idea.msku`)

### 2. `POST /api/production-layouts`
**Quyền:** `manager`, `boss` (cần thêm action `manage_production_layouts`)
**Body:**
```json
{
  "code": "LAYOUT-BABY-SIGN-001",
  "name": "Baby Sign Layout 1",
  "materialCode": "BW-3-MXL",
  "materialWidth": 910,
  "materialLength": 600,
  "dxfFileUrl": "https://drive.google.com/...",
  "pdfFileUrl": "https://drive.google.com/..." (optional),
  "items": [
    { "ideaId": "clx...", "quantityPerRun": 54 },
    { "ideaId": "cly...", "quantityPerRun": 30 }
  ]
}
```
**Xử lý:**
- Validate `code` unique.
- Validate tất cả `ideaId` tồn tại.
- `quantityPerRun` phải ≥ 1 — mọi SKU khai báo trong layout đều sinh ra sản phẩm thực tế.
- Tạo `ProductionLayout` + `ProductionLayoutItem[]` trong transaction.

### 3. `GET /api/production-layouts/[id]`
**Quyền:** `employee`, `manager`, `boss`
**Trả về:** Chi tiết 1 layout + danh sách items (kèm `idea.msku`, `idea.mainImageUrl`)

### 4. `PATCH /api/production-layouts/[id]`
**Quyền:** `manager`, `boss`
**Cho phép sửa:** `name`, `materialCode`, `materialWidth`, `materialLength`, `dxfFileUrl`, `pdfFileUrl`, `items`
**Xử lý items:** Xóa hết items cũ → tạo lại items mới (đơn giản, không cần diff)

### 5. `PATCH /api/production-layouts/[id]/verify`
**Quyền:** `worker`, `manager`, `boss` (cần action mới: `verify_production_layout`)
**Body:** `{}` (tự động set `isVerified = true`, `verifiedById = currentUser.id`)
**Business rule:** Layout đã `isVerified = true` vẫn cho phép verify lại nếu file được cập nhật (reset `isVerified = false` khi edit layout).

> **Tại sao KHÔNG cho `employee` verify:** Nhân viên văn phòng (Designer, CS, Kế toán) dùng chung role `employee`. Nếu cho `employee` quyền verify, họ có thể vô tình nhấn "Verify" file mà chưa từng chạy máy — gây sai lệch nghiêm trọng về chất lượng sản xuất. Role `worker` mới được tạo riêng cho công nhân đứng máy.

### 6. `DELETE /api/production-layouts/[id]`
**Quyền:** `boss` only
**Xử lý:** Soft archive (`status = "archived"`) — không hard delete vì có thể có production request history tham chiếu.

### 7. `GET /api/production-layouts/suggest`
**Quyền:** `manager`, `boss`
**Tham số query:** `?ideaIds=id1,id2,id3&qtys=100,50,30`
**Trả về:** `{ runPlan: RunPlan[], suggestions: Suggestion[], remaining: Map<ideaId, qty> }`
**Logic:** Gọi `production-layout-engine.ts`.

**Đây là endpoint quan trọng nhất** — được gọi từ UI tạo `ProductionRequest` để hiển thị gợi ý trước khi Quản lý chốt lệnh.

#### Kiến trúc thực thi: Server-side only

Toàn bộ thuật toán `suggestProductionRuns` chạy **hoàn toàn trên Server**. Client gửi request → Server tính toán (quét toàn bộ layout trong DB, chạy thuật toán greedy, sinh gợi ý) → trả về kết quả cuối cùng cho Client hiển thị.

```
┌─ Client (Browser) ─┐          ┌─ Server (Next.js API) ─┐          ┌─ Database ─┐
│                     │  HTTP    │                         │  Prisma  │            │
│  Tạo ProductionReq  │ ──────→  │  suggest endpoint       │ ───────→ │  Layouts   │
│  ← hiển thị kết quả  │ ←──────  │  Engine tính toán       │ ←─────── │  Items     │
│                     │  JSON    │                         │          │            │
└─────────────────────┘          └─────────────────────────┘          └────────────┘
```

**Lý do chọn Server-side:**
- Thuật toán cần quét toàn bộ bảng `ProductionLayout` + `ProductionLayoutItem` — không thể tải toàn bộ về Client.
- Kết quả cần nhất quán (transactional read) — tránh race condition khi nhiều Quản lý cùng tạo request.
- Client chỉ cần nhận kết quả cuối cùng để hiển thị, không cần chạy lại thuật toán.

**Trải nghiệm UI khi Quản lý tăng/giảm số lượng on-the-fly:**
- Mỗi lần thay đổi số lượng → gọi lại API suggest (có debounce 500ms để tránh spam).
- Server cache kết quả theo `(ideaIds, qtys)` trong 30 giây (dùng in-memory `Map`) để phản hồi nhanh khi người dùng thử đi thử lại cùng một tổ hợp.
- UI hiển thị skeleton loading trong lúc chờ kết quả.

### 8. Cập nhật `POST /api/production` (tạo ProductionRequest)
**Thay đổi:** Thêm optional field `layoutPlan` + `awaitingLayout` flag.
**Body mở rộng:**
```json
{
  // ... existing fields (ideaId, type, priority, requestedQty, noteForWorkers, steps) ...
  "awaitingLayout": true,
  "designerNote": "Làm gấp file ghép 50 Mã A + 20 Mã B cho ván BW-3-MXL",
  "layoutPlan": {
    "runs": [
      { "layoutId": "clx...", "code": "LAYOUT-BW3MXL-001", "runCount": 2, "items": [
        { "ideaId": "idy...", "msku": "NQH2606-001", "quantityPerRun": 54, "producedQty": 108 }
      ]}
    ],
    "suggestions": [
      { "type": "overproduction", "message": "Dư 4 cái Mã A", "layoutId": "clx...", "suggestedReduction": 1 }
    ]
  }
}
```
**Logic:**
- Nếu `awaitingLayout === true`:
  - Tạo `ProductionRequest` với `status = "awaiting_layout"`, `layoutSnapshot = null`.
  - Tự động gọi `POST /api/production-layouts/request` (type: `layout_requested`) để gửi notification cho Designer.
  - Trả về `ProductionRequest` đã tạo.
- Nếu có `layoutPlan` (có layout đầy đủ):
  - Serialize `layoutPlan` thành JSON → lưu vào `layoutSnapshot`.
  - `status = "ready"`.
- Nếu không có cả hai: giữ nguyên flow cũ, `status = "ready"` (không dùng layout).

> **Decision:** Không thêm FK từ `ProductionRequest` → `ProductionLayout`. Lý do: 1 request có thể dùng nhiều layout, và layout có thể thay đổi sau khi request được tạo. Field `layoutSnapshot` (String/JSON) lưu trọn vẹn ngữ cảnh tại thời điểm tạo — đây là pattern chuẩn cho hệ thống ERP.

### 9. `POST /api/production-layouts/request`
**Quyền:** `manager`, `boss`, `worker`
**Mục đích:** Tạo notification yêu cầu Designer làm layout mới hoặc sửa file lỗi.
**Body:**
```json
{
  "type": "layout_requested",
  "ideaIds": ["id1", "id2"],
  "materialCode": "BW-3-MXL",
  "note": "Làm gấp file ghép 50 Mã A + 20 Mã B"
}
```
hoặc
```json
{
  "type": "layout_revision_requested",
  "layoutId": "clx...",
  "reason": "burn_marks",
  "note": "Đường nét quá sát gây cháy cạnh ở góc dưới bên phải"
}
```
**Logic:**
- Với `layout_requested`: tạo `Notification` cho tất cả user có role `employee`, `status = active`. Type = `layout_requested`, category = `production_file`, priority = `urgent`.
- Với `layout_revision_requested`: set `isVerified = false` trên `ProductionLayout` tương ứng, sau đó tạo notification tương tự với type = `layout_revision_requested`.
- Bắn Socket.io `broadcastNotification` để Designer nhận realtime.

---

## 🖥️ Frontend (UI)

### Trang mới: `/production/layouts` (Quản lý Layout Sản xuất)
**Vị trí trong sidebar:** Dưới mục "Sản xuất" → submenu "File SX" (icon: `Layers` hoặc `FileStack`)

**Giao diện:**
- **Bảng danh sách layout:** Cột: Code, Tên, Vật liệu, Kích thước phôi, SKU trong layout (badge), Trạng thái (Verified/Chưa Verify), Ngày tạo.
- **Filter:** Theo vật liệu (`materialCode`), trạng thái (`active`/`archived`), `isVerified`.
- **Nút "+ Thêm Layout"** mở Sheet/Dialog tạo mới.

### Dialog/Sheet: Tạo/Sửa Layout
**Layout 2 cột:**
- **Trái:** Upload file (DXF + PDF link từ Google Drive), thông số phôi, vật liệu.
- **Phải:** Chọn SKU — searchable multi-select (dùng `cmdk` như `sku-selector.tsx`) + nhập `quantityPerRun` cho từng SKU.

**Validation:**
- `code`: bắt buộc, unique, uppercase, không dấu, format `LAYOUT-{TEN}-{XXX}`.
- `dxfFileUrl`: bắt buộc (Google Drive link).
- `materialCode`: bắt buộc, có thể dùng `Select` với danh sách vật liệu phổ biến (lấy từ metadata hoặc hardcode).
- `materialWidth`, `materialLength`: bắt buộc, > 0.
- Tất cả item có `quantityPerRun ≥ 1`.
- **Designer tự nhập `quantityPerRun`** cho từng SKU khi upload file — đây là thông số thực tế từ file Illustrator ("file này sinh ra bao nhiêu cái mỗi SKU mỗi lần chạy").

### Nâng cấp: Dialog Tạo ProductionRequest
**Thay đổi:** Thêm tab/bước "Gợi ý Layout" trước khi tạo request.

**Flow mới:**
1. Quản lý chọn SKU + nhập số lượng yêu cầu (như cũ).
2. **Bước mới — "Tối ưu sản xuất":** Hệ thống gọi `GET /api/production-layouts/suggest` và hiển thị:
   - Bảng kết quả: Layout → số lần chạy → sản lượng từng SKU.
   - Số lượng dư (badge màu cam nếu dư > 0).
   - Gợi ý cross-selling (alert box màu vàng).
3. Quản lý có thể:
   - Chấp nhận gợi ý (giữ nguyên).
   - Điều chỉnh số lần chạy (override).
   - Bỏ qua layout, dùng flow thủ công.
   - **Nếu không có layout hoặc dư thừa > 50%:** Radio group với 2 lựa chọn:
     - **"Tạo lệnh & Yêu cầu Layout mới"** (mặc định) → tạo `ProductionRequest` với `status = "awaiting_layout"` + tự động gửi notification cho Designer.
     - **"Tạo lệnh với file hiện tại"** → tạo request bình thường với `status = "ready"` (chấp nhận rủi ro dư thừa).
4. Sau khi chốt → tạo request + kèm `layoutSnapshot` (hoặc `null` nếu `awaiting_layout`).

### Nâng cấp: Trang Chi tiết ProductionRequest (`/production/[id]`)
**Thay đổi:** Hiển thị thông tin layout (nếu có):
- Tên layout + code.
- Kích thước phôi **in đậm, màu nổi bật** (dùng `--color-brass` hoặc `--color-craft`).
- Vật liệu.
- Nút tải file DXF/PDF.
- Trạng thái Verified của layout.

### Nâng cấp: Worker View (Xưởng)
**Yêu cầu từ thiết kế:** Worker cần thấy ngay thông số phôi và chất liệu mà không cần mở file.
**Giải pháp:**
- Trong danh sách production (Kanban/List), mỗi thẻ hiển thị:
  - **Dòng vật liệu:** `BW-3-MXL` (badge màu nâu đất).
  - **Dòng kích thước:** `910 × 600 mm` (font đậm, màu `--color-ink`).
  - Nút "Tải DXF" / "Tải PDF" (icon `Download`).

**Trạng thái `awaiting_layout` — Thẻ bị khoá:**
- Thẻ công việc hiển thị **làm mờ (opacity-60, greyed out)** với viền nét đứt (dashed border).
- Thay vì nút tải file, hiển thị badge **"⏳ Đang chờ File thiết kế"** (màu vàng/cam, cỡ lớn, dễ thấy).
- Worker **không thể** bấm Verify, không thể tải file, không thể bắt đầu step — toàn bộ action bị khoá.
- Mục đích: Xưởng biết có lệnh này trong pipeline, ước lượng được khối lượng việc sắp tới, nhưng không thể thao tác nhầm.

**Trạng thái `ready` — Thẻ hoạt động bình thường:**
- Nút **"Verify File"**: Chỉ hiển thị khi `layout.isVerified === false` và user có quyền. Khi click → gọi `PATCH /api/production-layouts/[id]/verify` → hiện toast xác nhận.
- Nút **"Báo lỗi file"** (icon `AlertTriangle`, màu đỏ): Luôn hiển thị trên thẻ có layout. Khi click → mở Dialog chọn lý do lỗi (dropdown) + ghi chú → gọi `POST /api/production-layouts/request` với `type: "layout_revision_requested"`.
  - Sau khi báo lỗi: `isVerified` của layout bị set về `false`, thẻ công việc chuyển viền cam + badge "Chờ sửa file".
  - **Lệnh sản xuất không bị khoá:** Worker vẫn thao tác được các bước sản xuất khác. Chỉ cảnh báo trực quan, không chặn.

**Chuyển đổi trạng thái tự động:**
- Khi Designer hoàn thành file và auto-trigger chạy: `awaiting_layout` → `ready`. Thẻ tự động sáng lên, mở khóa, hiển thị đầy đủ nút tải file + verify. Worker không cần refresh trang (react-query invalidate hoặc Socket.io push).

---

## 🔐 Phân quyền (Permissions)

### Role mới: `worker`

Hệ thống hiện có 3 role: `employee`, `manager`, `boss`. Cần thêm role thứ 4: **`worker`** — dành riêng cho công nhân đứng máy tại xưởng.

> **Lý do:** Hiện tại nhân viên văn phòng (Designer, CS, Kế toán) và công nhân xưởng dùng chung role `employee`. Nếu cho `employee` quyền verify layout, nhân viên văn phòng có thể vô tình xác minh file họ chưa từng chạy — gây rủi ro chất lượng sản xuất.

**Thay đổi trong `src/lib/permissions.ts`:**

```typescript
export type Role = "employee" | "worker" | "manager" | "boss";

export type Action =
  // ... existing actions ...
  | "manage_production_layouts"  // Tạo/Sửa/Xóa layout
  | "verify_production_layout";  // Worker xác minh file sau khi chạy mẻ đầu

const PERMISSIONS: Record<Action, Role[]> = {
  // ... existing ...
  manage_production_layouts: ["manager", "boss"],
  verify_production_layout: ["worker", "manager", "boss"],  // employee KHÔNG có quyền này
};

// Cập nhật các hàm helper
export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    employee: "Nhân viên",
    worker: "Công nhân",
    manager: "Quản lý",
    boss: "Sếp",
  };
  return labels[role] || role;
}

export function getRoleOrder(role: Role): number {
  const order: Record<Role, number> = {
    employee: 0,
    worker: 1,
    manager: 2,
    boss: 3,
  };
  return order[role] ?? 0;
}
```

**Bảng phân quyền đầy đủ cho module Production Layout:**

| Hành động | Nhân viên | Công nhân | Quản lý | Sếp |
|---|---|---|---|---|
| Xem danh sách layout | ✅ | ✅ | ✅ | ✅ |
| Xem chi tiết layout | ✅ | ✅ | ✅ | ✅ |
| Tạo/Sửa layout | ❌ | ❌ | ✅ | ✅ |
| Xóa/Archive layout | ❌ | ❌ | ❌ | ✅ |
| Verify file layout | ❌ | ✅ | ✅ | ✅ |
| Nhận gợi ý sản xuất | ❌ | ❌ | ✅ | ✅ |

**Ghi chú tích hợp role `worker` vào hệ thống hiện tại:**
- `User.role` trong DB cần mở rộng enum thêm `"worker"`.
- Các action hiện có như `update_production`, `manage_orders`, `manage_shipments` nên được gán thêm cho `worker` để công nhân có thể cập nhật tiến độ.
- Form tạo tài khoản (Quản lý/Sếp) cần thêm option "Công nhân" trong dropdown chọn role.

---

## 📐 Thứ tự triển khai (Implementation Order)

### Phase 1: Foundation (Backend + Schema) — Ngày 1

#### Bước 1.1 — Migration Prisma
1. Thêm 2 model vào `prisma/schema.prisma`.
2. Thêm relation `ProductionLayout.verifiedBy` vào `User` model:
   ```prisma
   verifiedLayouts ProductionLayout[] @relation("LayoutVerifier")
   ```
3. Chạy `npx prisma migrate dev --name add_production_layouts`.
4. Chạy `npx prisma generate`.

#### Bước 1.2 — Validation Schema (`src/lib/validators.ts`)
Thêm:
```typescript
export const createProductionLayoutSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[A-Z0-9\-]+$/, "Code chỉ chứa chữ in hoa, số, dấu gạch ngang"),
  name: z.string().max(200).optional(),
  materialCode: z.string().min(1, "Vật liệu không được để trống"),
  materialWidth: z.number().positive("Chiều rộng phải > 0"),
  materialLength: z.number().positive("Chiều dài phải > 0"),
  dxfFileUrl: z.string().min(1, "File DXF không được để trống"),
  pdfFileUrl: z.string().optional(),
  items: z.array(z.object({
    ideaId: z.string().min(1),
    quantityPerRun: z.number().int().min(1, "Số lượng phải >= 1"),
  })).min(1, "Cần ít nhất 1 SKU"),
});
```

#### Bước 1.3 — API Routes
Tạo thư mục + files:
```
src/app/api/production-layouts/
├── route.ts           (GET list + POST create)
├── [id]/
│   └── route.ts       (GET detail + PATCH update + DELETE archive)
├── verify/
│   └── [id]/
│       └── route.ts   (PATCH verify — hoặc gộp vào [id]/route.ts với action query param)
└── suggest/
    └── route.ts       (GET suggest — thuật toán gợi ý)
```

#### Bước 1.4 — Engine + Auto-activator
- Implement `src/lib/production-layout-engine.ts`: hàm `suggestProductionRuns(requirements): { runPlan, suggestions, remaining }`.
- Implement `src/lib/layout-auto-activator.ts`: hàm `activateAwaitingRequests(layoutId, ideaIds)` — quét `ProductionRequest` đang `awaiting_layout`, tính `layoutSnapshot`, chuyển `status = "ready"`. Được gọi từ PATCH notification khi `isCompleted = true`.

### Phase 2: UI Cơ bản — Ngày 2

#### Bước 2.1 — Trang `/production/layouts`
- Tạo `src/app/(dashboard)/production/layouts/page.tsx`.
- Bảng danh sách layout (dùng `@tanstack/react-query`).
- Dialog tạo/sửa layout.
- Filter + search.

#### Bước 2.2 — Components tái sử dụng
- `src/components/production-layout-card.tsx` — Hiển thị thông tin layout trên thẻ production.
- `src/components/layout-item-selector.tsx` — Multi-select SKU + quantityPerRun.

#### Bước 2.3 — Sidebar
Cập nhật `app-sidebar.tsx` thêm submenu "File SX" dưới "Sản xuất".

### Phase 3: Tích hợp Production Request — Ngày 3

#### Bước 3.1 — Nâng cấp Dialog Tạo Production Request
- Thêm tab/bước "Gợi ý Layout".
- Gọi `GET /api/production-layouts/suggest`.
- Hiển thị bảng kết quả + gợi ý.
- Cho phép điều chỉnh / bỏ qua.
- Nút "Yêu cầu Layout mới" khi không có layout phù hợp.

#### Bước 3.2 — Nâng cấp Trang Chi tiết Production Request
- Hiển thị layout info (nếu có `layoutSnapshot`).
- Nút tải file DXF/PDF.
- Nút "Verify File".

#### Bước 3.3 — Worker View
- Thẻ production hiển thị material + kích thước phôi nổi bật.
- Nút Verify + Nút "Báo lỗi file".
- Badge trạng thái layout (verified / chờ sửa).

### Phase 4: Workflow Yêu cầu & Báo lỗi — Ngày 4

#### Bước 4.1 — API `POST /api/production-layouts/request`
- Nhận `type`, `ideaIds`, `materialCode`, `note`.
- Tạo `Notification` cho tất cả `employee`.
- Nếu type là `revision_requested`: set `isVerified = false` trên layout.

#### Bước 4.2 — Auto-trigger trong PATCH Notification
- Sửa `PATCH /api/notifications/[id]`: khi `isCompleted` chuyển từ `false` → `true` và notification có type là `layout_requested` → gọi `activateAwaitingRequests()`.
- Test: tạo request `awaiting_layout` → Designer tạo layout + tick hoàn thành → request tự chuyển `ready`.

#### Bước 4.3 — Trang placeholder: `/my-tasks` (Công việc của tôi)
- **Vị trí:** Sidebar dưới mục "Ý tưởng", tên "Công việc của tôi" (icon `ClipboardList`).
- **Nội dung Phase 4:** Trang trống với 3 tab placeholder:
  - Tab "Ảnh" — danh sách ý tưởng được giao làm ảnh (`photoAssigneeId = currentUser`)
  - Tab "File thiết kế" — danh sách ý tưởng được giao làm file (`fileAssigneeId = currentUser`)
  - Tab "File sản xuất" — danh sách notification `layout_requested` / `layout_revision_requested` chưa `isCompleted`
- **Ghi chú:** Đây là trang tổng hợp công việc cho `employee`. Chi tiết UI và logic từng tab sẽ được thiết kế riêng sau. Phase 4 chỉ dựng khung (layout + 3 tab rỗng).

#### Bước 4.4 — Socket.io realtime cho notification mới
- Khi có `layout_requested` hoặc `layout_revision_requested`: bắn event `new_notification` qua Socket.io để Designer nhận realtime.

### Phase 5: Testing & Polish — Ngày 5

#### Bước 5.1 — Unit Tests
- `tests/unit/production-layout-engine.test.ts`: Test các kịch bản:
  - Đơn lẻ 1 SKU (50 Mã A).
  - Đa SKU tối ưu (90 Mã A + 20 Mã B).
  - Không tìm thấy layout phù hợp → trả về Loại C.
  - Layout có 1 SKU duy nhất, yêu cầu đúng bằng quantityPerRun.
  - Dư thừa > 20% (gợi ý điều chỉnh).
  - Dư thừa > 50% (gợi ý Loại D — yêu cầu layout mới).
- `tests/unit/layout-auto-activator.test.ts`: Test auto-trigger:
  - Designer tick `isCompleted` → request `awaiting_layout` chuyển `ready`.
  - Nhiều request cùng `awaiting_layout` → tất cả được kích hoạt.
  - Không có request `awaiting_layout` → không có gì thay đổi.
  - Cross-selling detection.

#### Bước 5.2 — Integration Test
- Test API CRUD production-layouts.
- Test API suggest với mock data.
- Test API request (tạo notification đúng employee, set `isVerified = false`).

#### Bước 5.3 — Build Verification
- `npx prisma generate` → `npx tsc --noEmit` → `npm run build`.

---

## 🔄 Tích hợp với hệ thống hiện tại

### Những module không thay đổi
- **Auth:** Dùng lại `auth()` + `can()` hiện tại.
- **Audit Log:** Thêm `entityType = "production_layout"` cho các thay đổi layout.
- **Notifications:** Tạo notification khi layout được verify (type: `layout_verified`, category: `production_file`), khi có yêu cầu layout mới (`layout_requested`), và khi Worker báo lỗi file (`layout_revision_requested`).
- **Socket.io:** Không cần thay đổi (layout thay đổi ít, không cần realtime).
- **Workers:** Dùng lại bảng `workers` hiện tại (không thêm field).

### Những module cần thay đổi
| Module | Thay đổi | Mức độ |
|---|---|---|
| `schema.prisma` | Thêm 2 model + 1 relation + 1 field (`layoutSnapshot`) + enum role `worker` | 🔴 Required |
| `permissions.ts` | Thêm role `worker` + 2 action mới | 🔴 Required |
| `validators.ts` | Thêm validation schema `createProductionLayoutSchema` | 🔴 Required |
| `types/index.ts` | Thêm layout-related types + constants + `worker` role label + notification types mới | 🔴 Required |
| `api/production/route.ts` | Hỗ trợ `awaitingLayout` + `layoutPlan` khi POST → lưu `layoutSnapshot` + set `status` | 🟠 Enhancement |
| `api/production/[id]/route.ts` | Trả về `layoutSnapshot` + `status` trong response GET | 🟡 Minor |
| `api/notifications/[id]/route.ts` | PATCH `isCompleted = true` → auto-trigger `activateAwaitingRequests` nếu type là `layout_requested` | 🟠 Enhancement |
| `lib/layout-auto-activator.ts` | **Mới:** Logic auto-trigger khi Designer hoàn thành file | 🔴 Required |
| `api/production-layouts/request/route.ts` | **Mới:** API tạo notification yêu cầu/báo lỗi layout | 🔴 Required |
| `(dashboard)/production/page.tsx` | Hiển thị layout info trên thẻ (parse `layoutSnapshot`), nút "Báo lỗi file" | 🟠 Enhancement |
| `(dashboard)/my-tasks/page.tsx` | **Mới:** Trang "Công việc của tôi" (placeholder 3 tab) | 🟡 Phase 4 |
| `app-sidebar.tsx` | Thêm submenu "File SX" + "Công việc của tôi" | 🟡 Minor |
| `notifications` type | Thêm `layout_requested`, `layout_revision_requested` | 🟡 Minor |
| `api/users` / form tạo user | Thêm option role "Công nhân" | 🟡 Minor |

---

## 📊 Các constant mới (`src/types/index.ts`)

```typescript
export const LAYOUT_STATUSES = ["active", "archived"] as const;
export type LayoutStatus = (typeof LAYOUT_STATUSES)[number];

export const layoutStatusLabels: Record<LayoutStatus, string> = {
  active: "Đang dùng",
  archived: "Đã lưu trữ",
};

export const PRODUCTION_REQUEST_STATUSES = ["awaiting_layout", "ready", "producing", "completed"] as const;
export type ProductionRequestStatus = (typeof PRODUCTION_REQUEST_STATUSES)[number];

export const productionRequestStatusLabels: Record<ProductionRequestStatus, string> = {
  awaiting_layout: "Đang chờ File thiết kế",
  ready: "Sẵn sàng sản xuất",
  producing: "Đang sản xuất",
  completed: "Hoàn thành",
};

export const SUGGESTION_TYPES = ["overproduction", "cross_sell", "no_layout", "critical_waste"] as const;
export type SuggestionType = (typeof SUGGESTION_TYPES)[number];

// Notification types mới cho Production Layout
// (bổ sung vào NOTIFICATION_CATEGORIES nếu cần)
// "layout_requested"        — Quản lý yêu cầu Designer làm layout mới
// "layout_revision_requested" — Worker báo lỗi file, yêu cầu Designer sửa
// "layout_verified"         — Worker xác minh file OK sau mẻ đầu

export const LAYOUT_REPORT_REASONS = [
  "file_corrupted",
  "high_waste",
  "wrong_thickness",
  "burn_marks",
  "wrong_dimensions",
  "other",
] as const;
export type LayoutReportReason = (typeof LAYOUT_REPORT_REASONS)[number];

export const layoutReportReasonLabels: Record<LayoutReportReason, string> = {
  file_corrupted: "File hỏng / không mở được",
  high_waste: "Hao hụt thực tế quá cao",
  wrong_thickness: "Sai độ dày vật liệu",
  burn_marks: "Đường nét quá sát, gây cháy cạnh",
  wrong_dimensions: "Sai kích thước phôi",
  other: "Khác",
};
```

---

## ✅ Tiêu chí chấp nhận (Acceptance Criteria)

### Phase 1 (Foundation)
- [ ] Migration chạy thành công, bảng mới xuất hiện trong DB.
- [ ] `POST /api/production-layouts` tạo layout + items trong 1 transaction.
- [ ] `GET /api/production-layouts` trả về danh sách có filter.
- [ ] `PATCH /api/production-layouts/[id]` cập nhật đúng.
- [ ] `PATCH /api/production-layouts/[id]/verify` set `isVerified = true`.
- [ ] `GET /api/production-layouts/suggest` trả về kế hoạch chạy + gợi ý đúng cho 3 kịch bản.

### Phase 2 (UI)
- [ ] Trang `/production/layouts` hiển thị danh sách layout.
- [ ] Dialog tạo layout hoạt động (upload link file, chọn SKU, nhập quantityPerRun).
- [ ] Sidebar hiển thị submenu "File SX".

### Phase 3 (Integration)
- [ ] Dialog tạo Production Request có bước gợi ý layout.
- [ ] Khi không có layout: radio "Tạo lệnh & Yêu cầu Layout mới" tạo request `awaiting_layout` + notification.
- [ ] Trang chi tiết Production Request hiển thị layout info + nút tải file.
- [ ] Worker thấy kích thước phôi + vật liệu nổi bật trên thẻ công việc.
- [ ] Worker có nút "Báo lỗi file" hoạt động (tạo notification + set `isVerified = false`).

### Phase 4 (Workflow)
- [ ] API `POST /api/production-layouts/request` hoạt động cho cả 2 loại.
- [ ] Auto-trigger: tick `isCompleted` trên notification `layout_requested` → request `awaiting_layout` tự chuyển `ready`.
- [ ] Thẻ `awaiting_layout` hiển thị greyed out + badge "⏳ Đang chờ File thiết kế" + không thao tác được.
- [ ] Trang `/my-tasks` hiển thị 3 tab placeholder (Ảnh / File thiết kế / File sản xuất).
- [ ] Socket.io bắn event realtime khi có notification mới.

### Phase 5 (Quality)
- [ ] Unit test engine + auto-activator đạt ≥ 90% coverage các nhánh logic.
- [ ] Build thành công (`npm run build`).
- [ ] Test thủ công trên trình duyệt với cả 4 role (employee, worker, manager, boss).

---

## 🚨 Rủi ro & Giả định

| Rủi ro | Mức độ | Giải pháp |
|---|---|---|
| Designer không tuân thủ format code `LAYOUT-...` | Medium | Validation + gợi ý tự sinh code từ tên rút gọn |
| Layout bị sửa sau khi production request đã tạo | Low | Lưu snapshot JSON, không FK cứng |
| Worker không biết dùng nút Verify | Low | Tooltip + hướng dẫn trong app |
| Công nhân văn phòng (`employee`) vô tình verify file | Medium | Tách role `worker` riêng — chỉ công nhân đứng máy mới có quyền verify |
| Designer không phản hồi kịp yêu cầu layout mới | Medium | Notification có `priority: urgent` + badge đỏ trên UI; Quản lý có thể gọi điện trực tiếp nếu quá gấp |
| Worker báo lỗi nhầm (file không lỗi) | Low | Dialog yêu cầu chọn lý do cụ thể từ dropdown; Manager có thể re-verify để ghi đè |

---

## 📝 Ghi chú triển khai

1. **Google Drive:** Hệ thống chỉ lưu link (theo đúng kiến trúc hiện tại), không upload/download file. Worker tự mở link trên Drive để tải file.

2. **Số lượng dư:** Không quản lý trong hệ thống. Sản phẩm dư ra do làm tròn lên (`Math.ceil`) được để trong rổ tại xưởng, không nhập kho chính thức.

3. **Format code:** `LAYOUT-{TEN_VAT_LIEU}-{SO_THU_TU}`. Ví dụ: `LAYOUT-BW3MXL-001`, `LAYOUT-ACRYLIC-003`.

4. **Tương thích SQLite:** Các field JSON array vẫn lưu dạng `String` (theo pattern hiện tại của project). Prisma với SQLite không hỗ trợ native JSON type.

5. **Realtime:** Layout thay đổi ít (vài lần/tuần) → không cần Socket.io, dùng `react-query` invalidate thủ công sau mutation.
