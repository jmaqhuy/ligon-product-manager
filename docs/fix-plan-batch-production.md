# Kế hoạch Fix: Luồng Sản xuất — Batch Operation & UX

> **Ngày:** 2026-07-02 | **Trạng thái:** Chờ thẩm định
> **Mục tiêu:** Sửa 6 bug nghiêm trọng, tái cấu trúc luồng Admin→Employee cho mượt mà.

---

## 🐛 Danh sách Bug & Root Cause

| # | Bug | Root Cause | File liên quan |
|---|---|---|---|
| 1 | **Admin không thể tạo lệnh hàng loạt** | Form `POST /api/production` chỉ nhận 1 `ideaId`, UI chỉ có 1 select SKU | `src/app/api/production/route.ts`, `src/app/(dashboard)/production/page.tsx` |
| 2 | **Employee không thể Batch Claim** | `/my-tasks` không có checkbox, API claim chỉ xử lý từng `id` một | `src/app/(dashboard)/my-tasks/page.tsx`, `src/app/api/production/[id]/claim/route.ts` |
| 3 | **Thiếu ngữ cảnh (ảnh, file gốc)** | Card task chỉ hiện MSKU, không có `mainImageUrl` hay `designFileUrl` | `src/app/(dashboard)/my-tasks/page.tsx` |
| 4 | **Lỗi 3 vs 2 SKU (resolve nhầm)** | Quick-submit không cho chọn SKU nào được resolve, mặc định resolve request đang mở | `src/app/api/production-layouts/quick/route.ts` |
| 5 | **403 Forbidden khi Employee nộp file** | `manage_production_layouts` chỉ có `["manager", "boss"]`, thiếu `"employee"` | `src/lib/permissions.ts` |
| 6 | **Thiếu `quantityPerRun` trong form nộp nhanh** | Quick-submit dialog không có trường này → `ProductionLayoutItem.quantityPerRun` mặc định = 1, engine không tính được | `src/app/api/production-layouts/quick/route.ts`, `src/app/(dashboard)/my-tasks/page.tsx` |

---

## 📐 Kế hoạch Triển khai (5 Phase)

### Phase 1: Fix Phân quyền (5 phút)

**File:** `src/lib/permissions.ts`

```diff
- manage_production_layouts: ["manager", "boss"],
+ manage_production_layouts: ["employee", "manager", "boss"],
```

> Employee cần quyền này để gọi `POST /api/production-layouts` và `POST /api/production-layouts/quick`.

---

### Phase 2: Admin — Tạo lệnh hàng loạt (Multi-SKU)

#### 2a. API: `POST /api/production` → nhận Array

**File:** `src/app/api/production/route.ts`

Hiện tại POST handler nhận 1 object `{ ideaId, type, ... }`. Cần mở rộng:

- Nhận thêm mode `batch`: nếu `body.requests` là Array → xử lý hàng loạt
- Dùng `db.productionRequest.createMany()` thay vì `create()` từng cái
- Response trả về `{ count, requests }` thay vì 1 object

```typescript
// Request body mới:
{
  mode: "batch",              // "single" | "batch"
  requests: [
    { ideaId, requestedQty, type, priority, noteForWorkers, awaitingLayout, ... },
    ...
  ]
}
```

#### 2b. UI: Modal "Tạo yêu cầu sản xuất" — Multi-SKU Table

**File:** `src/app/(dashboard)/production/page.tsx`

Thiết kế lại `CreateProductionDialog`:

```
┌─────────────────────────────────────────────────────┐
│  Tạo yêu cầu sản xuất                    [×]        │
│─────────────────────────────────────────────────────│
│  🔍 Tìm SKU (multi-select): [_____________] [Thêm] │
│─────────────────────────────────────────────────────│
│  ✓ │ SKU         │ SL cần │ Loại   │ Ưu tiên │ Note │
│  ☑ │ TMA2607-001 │  100   │ batch  │ normal  │ ...  │
│  ☑ │ TMA2607-002 │   50   │ sample │ urgent  │ ...  │
│  ☐ │ TMA2607-003 │  200   │ batch  │ normal  │ ...  │
│─────────────────────────────────────────────────────│
│  ☐ Chờ layout (tạo lệnh ở trạng thái awaiting)     │
│  📝 Ghi chú chung cho Designer: [______________]   │
│─────────────────────────────────────────────────────│
│                               [Huỷ] [Tạo 3 lệnh]   │
└─────────────────────────────────────────────────────┘
```

- **Multi-select SKU search**: Gõ để tìm, chọn nhiều SKU → mỗi SKU thành 1 dòng trong bảng
- **Bảng động**: Mỗi dòng có input `requestedQty`, select `type`, select `priority`, input `note`
- **Toggle "Chờ layout"**: Áp dụng cho tất cả dòng — nếu bật, tất cả lệnh tạo ở trạng thái `awaiting_layout`
- **Ghi chú chung**: Áp dụng cho tất cả dòng
- **Nút submit**: Hiển thị số lượng lệnh sẽ tạo ("Tạo 3 lệnh")

---

### Phase 3: Employee — Batch Claim + Ngữ cảnh

#### 3a. API: `PATCH /api/production/claim-bulk`

**File mới:** `src/app/api/production/claim-bulk/route.ts`

```typescript
// PATCH /api/production/claim-bulk
// Body: { requestIds: string[] }
// Atomic: updateMany với where: { id: { in: requestIds }, status: "awaiting_layout", layoutAssigneeId: null }
// Trả về: { claimed: number, failed: number, failedIds: string[] }
```

- Dùng `updateMany` để tránh race condition
- Chỉ claim những request chưa có ai nhận
- Trả về count thành công + danh sách thất bại (đã bị claim trước hoặc không còn `awaiting_layout`)

#### 3b. UI: `/my-tasks` Tab 3 — Checkbox + Nút Batch Claim

**File:** `src/app/(dashboard)/my-tasks/page.tsx`

Thêm vào header của tab:

```
┌──────────────────────────────────────────────────────┐
│  ☐ Chọn tất cả    [Nhận 3 việc đã chọn]             │
│──────────────────────────────────────────────────────│
│  ☐ │ 🟢 TMA2607-001 │ SL:100 │ urgent │ [Nhận việc] │
│  ☐ │ ⏳ TMA2607-002 │ SL:50  │ normal │ [Đã nhận]   │
│  ☑ │ ⏳ TMA2607-003 │ SL:200 │ normal │ [Nhận việc] │
└──────────────────────────────────────────────────────┘
```

- Checkbox ở đầu mỗi dòng (chỉ hiện với `isUnclaimed`)
- "Chọn tất cả" checkbox trên header
- Nút **"Nhận X việc đã chọn"** → gọi `claim-bulk` API

#### 3c. Quick View Drawer — Xem ngữ cảnh tại chỗ

**File:** `src/app/(dashboard)/my-tasks/page.tsx`

Click vào MSKU → mở Sheet/Drawer bên phải:

```
┌──────────────────────┬──────────────────────────────┐
│  Danh sách task      │  👁️ Chi tiết TMA2607-002     │
│                      │──────────────────────────────│
│  TMA2607-001         │  [mainImageUrl preview]      │
│  ▶ TMA2607-002       │                              │
│  TMA2607-003         │  📐 Kích thước: 30×20×3 cm  │
│                      │  🧱 Vật liệu: Acrylic 3mm    │
│                      │  📎 File thiết kế: [Tải về]  │
│                      │  📝 Mô tả: ...               │
│                      │                              │
│                      │           [Đóng]             │
└──────────────────────┴──────────────────────────────┘
```

- Dùng `Sheet` component từ shadcn/ui (đã có sẵn)
- Load dữ liệu từ `/api/ideas/[id]` hoặc embed sẵn trong `LayoutRequest` type
- Hiển thị: `mainImageUrl`, `designFileUrl`, `widthCm × heightCm × thicknessMm`, `material`, `description`

> **Cập nhật `LayoutRequest` type**: Thêm các field `widthCm`, `heightCm`, `thicknessMm`, `material`, `designFileUrl`, `description` vào API response của `/api/production?status=awaiting_layout` (include thêm idea fields).

---

### Phase 4: Fix lỗi 3 vs 2 SKU — Nộp file có chọn lọc

Đây là thay đổi quan trọng nhất. Thay vì nộp file từ 1 task cụ thể, modal mới cho phép chọn chính xác SKU nào được giải quyết.

#### 4a. Xóa quick-submit cũ, thay bằng modal "Nộp file & Ghép Layout"

**File:** `src/app/(dashboard)/my-tasks/page.tsx`

- **Xóa** dialog quick-submit hiện tại (chỉ có DXF + PDF + material)
- **Thêm** modal mới với 2 phần:

```
┌──────────────────────────────────────────────────────────────┐
│  📤 Nộp file & Ghép Layout                        [×]       │
│──────────────────────────────────────────────────────────────│
│  PHẦN A: Thông tin File                                      │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Link DXF *: [____________________________]              ││
│  │ Link PDF : [____________________________]              ││
│  │ Vật liệu  : [BW-3-MXL________]  Rộng:[910] Dài:[600]   ││
│  └──────────────────────────────────────────────────────────┘│
│──────────────────────────────────────────────────────────────│
│  PHẦN B: Chọn SKU sẽ giải quyết trong file này               │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ ☑ │ TMA2607-001 │ Cần: 100 │ SL/tấm: [20] │ ✅ đủ      ││
│  │ ☑ │ TMA2607-002 │ Cần:  50 │ SL/tấm: [10] │ ⚠️ SL/tấm  ││
│  │   │             │          │              │  < yêu cầu  ││
│  │ ☐ │ TMA2607-003 │ Cần: 200 │ (bỏ tick → không resolve) ││
│  └──────────────────────────────────────────────────────────┘│
│──────────────────────────────────────────────────────────────│
│  📊 Tổng: 2 SKU được resolve, 1 SKU giữ lại chờ file khác  │
│                              [Huỷ] [Nộp file & Hoàn thành]  │
└──────────────────────────────────────────────────────────────┘
```

**Logic quan trọng:**
- Chỉ những SKU **được tick** mới được gửi trong `items[]` lên API
- SKU **không tick** → API không resolve request của SKU đó
- Mỗi SKU được tick **phải nhập `quantityPerRun`** (bắt buộc, không mặc định = 1 nữa)
- Cảnh báo vàng nếu `quantityPerRun < requestedQty` (giữ nguyên)

#### 4b. API: `POST /api/production-layouts` — Không thay đổi

API hiện tại đã xử lý đúng:
- Nhận `requestIds[]` → chỉ resolve những ID được gửi lên
- `items[]` với `quantityPerRun` từ form
- `$transaction` atomic

**Không cần sửa API** — chỉ cần UI gửi đúng payload.

#### 4c. API: Xóa `POST /api/production-layouts/quick`

**File:** `src/app/api/production-layouts/quick/route.ts`

Quick-submit cũ không còn cần thiết vì modal mới đã thay thế hoàn toàn. Xóa file này.

---

### Phase 5: Backend cleanup & Test

#### 5a. Cập nhật GET `/api/production?status=awaiting_layout`

Include thêm các trường của Idea để Quick View Drawer có dữ liệu:

```typescript
include: {
  idea: {
    select: {
      id: true, msku: true,
      mainImageUrl: true,
      designFileUrl: true,
      widthCm: true, heightCm: true, thicknessMm: true,
      material: true,
      description: true,
      amazonListing: { select: { sku: true, itemName: true } },
    },
  },
  layoutAssignee: { select: { id: true, fullName: true, nameAbbreviation: true } },
}
```

#### 5b. Unit tests

| Test | File |
|---|---|
| `can(employee, manage_production_layouts)` → true | `tests/unit/permissions.test.ts` |
| Batch claim API | Test mới |
| Multi-SKU create API | Test mới |

#### 5c. Build verification

```bash
npx tsc --noEmit  # 0 errors
npx vitest run    # all pass
```

---

## 📊 Tổng quan thay đổi File

| File | Hành động | Phase |
|---|---|---|
| `src/lib/permissions.ts` | Thêm `"employee"` vào `manage_production_layouts` | 1 |
| `src/app/api/production/route.ts` | POST: hỗ trợ batch `requests[]` array | 2a |
| `src/app/(dashboard)/production/page.tsx` | `CreateProductionDialog`: multi-SKU table | 2b |
| `src/app/api/production/claim-bulk/route.ts` | **Mới**: Batch claim endpoint | 3a |
| `src/app/(dashboard)/my-tasks/page.tsx` | Checkbox + batch claim button + Quick View Drawer + Modal "Nộp file & Ghép Layout" mới | 3b, 3c, 4a |
| `src/app/api/production-layouts/quick/route.ts` | **Xoá** | 4c |
| `src/app/api/production/route.ts` (GET) | Include thêm idea fields cho drawer | 5a |
| `tests/unit/permissions.test.ts` | Cập nhật test employee + manage_production_layouts | 5b |

---

## ⏱️ Ước lượng thời gian

| Phase | Nội dung | Thời gian |
|---|---|---|
| 1 | Fix phân quyền | 5 phút |
| 2 | Admin batch create (API + UI) | 30 phút |
| 3 | Employee batch claim + Quick View | 35 phút |
| 4 | Modal "Nộp file & Ghép Layout" (fix 3vs2) | 25 phút |
| 5 | Cleanup + Test | 15 phút |
| **Tổng** | | **~2 giờ** |

---

## ✅ Tiêu chí hoàn thành

- [ ] Admin tạo được 10 lệnh sản xuất trong 1 lần submit
- [ ] Employee tick chọn nhiều task → bấm "Nhận X việc" 1 lần → tất cả được claim
- [ ] Click MSKU → Drawer hiện ảnh, kích thước, link file thiết kế
- [ ] Employee có 3 task, tick 2 SKU khi nộp file → chỉ 2 request được resolve, 1 request vẫn ở `awaiting_layout`
- [ ] `quantityPerRun` là trường bắt buộc khi nộp file
- [ ] Employee không còn bị 403 khi gọi API tạo layout
- [ ] `npx tsc --noEmit` = 0 lỗi, `npx vitest run` = all pass
