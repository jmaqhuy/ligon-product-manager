# Kế hoạch triển khai: Fix toàn bộ lỗi Flow Tạo Ý Tưởng

> **Ngày:** 2026-07-01 | **Phạm vi:** `new/page.tsx` + `POST /api/ideas` + `draft/route.ts` + `msku-generator.ts`

---

## 📋 Tổng quan danh sách lỗi

| # | Mức độ | Mô tả | File chính |
|---|--------|-------|-----------|
| 1 | 🔴 Critical | Backend POST bỏ quên `title`, `description`, `designFileUrl`, `itemHighlights` | `api/ideas/route.ts` |
| 2 | 🔴 Critical | `sendBeacon` beforeunload luôn thất bại (Content-Type sai) | `new/page.tsx` |
| 3 | 🟠 High | Validation trùng lặp (Zod + if/else thủ công) → báo lỗi chung chung "Vui lòng điền đầy đủ..." | `new/page.tsx` |
| 4 | 🟠 High | Backend POST thiếu validate `designFileUrl` (partner) & dimensions bắt buộc | `api/ideas/route.ts` |
| 5 | 🟡 Medium | `form.watch` dependency gây re-subscribe liên tục | `new/page.tsx` |
| 6 | 🟡 Medium | Race condition trong `generateMsku()` | `msku-generator.ts` |
| 7 | 🟡 Medium | Unit conversion không nhất quán giữa `new` và `edit-idea-sheet` | `new/page.tsx`, `edit-idea-sheet.tsx` |
| 8 | 🟡 Medium | `isBasicallyEmpty` fragile, dễ lỗi khi thêm field | `new/page.tsx` |
| 9 | 🟡 Medium | Draft API không có rate limit | `api/ideas/draft/route.ts` |
| 10 | 🟢 Low | `createIdeaSchema` trong `validators.ts` không được dùng | `validators.ts` |
| 11 | 🟢 Low | PATCH không validate range dimensions | `api/ideas/[id]/route.ts` |
| 12 | 🟢 Low | `any` types lan tràn | `new/page.tsx`, `edit-idea-sheet.tsx` |
| **U1** | 🔴 User | **Không có cơ chế "ở lại page" sau khi tạo** — user bị đá ra `/ideas` | `new/page.tsx` |
| **U2** | 🟠 User | **Lỗi validation hiển thị sai** — prompt vượt ký tự nhưng báo "điền đầy đủ thông tin" | `new/page.tsx` |
| **U3** | 🟠 User | **Bản nháp không được xóa sau khi lưu** — bị lưu lại trong 2 giây delay trước redirect | `new/page.tsx` |

---

## 🗂️ Thứ tự triển khai (theo file, không phá vỡ nhau)

### Phase 1: Sửa Backend (Foundation)

> Làm trước vì thay đổi API, frontend phụ thuộc vào.

#### Bước 1.1 — Sửa `POST /api/ideas` (Fix #1, #4)

**File:** `src/app/api/ideas/route.ts`

1. **Thêm `title`, `description`, `designFileUrl`, `itemHighlights` vào destructure:**
   ```typescript
   const {
     // ... existing fields ...
     title,
     description,
     designFileUrl,
     itemHighlights,
   } = body;
   ```

2. **Validate `designFileUrl` bắt buộc cho partner:**
   ```typescript
   if (ideaSource === "partner" && !designFileUrl) {
     return NextResponse.json(
       { error: "Đối tác bắt buộc phải có file thiết kế" },
       { status: 400 }
     );
   }
   ```

3. **Validate dimensions bắt buộc:**
   ```typescript
   if (!widthCm || !heightCm || !thicknessMm) {
     return NextResponse.json(
       { error: "Vui lòng nhập đầy đủ kích thước (rộng, cao, dày)" },
       { status: 400 }
     );
   }
   ```

4. **Lưu các field mới vào `db.idea.create`:**
   ```typescript
   const idea = await db.idea.create({
     data: {
       // ... existing ...
       title: title || null,
       description: description || null,
       designFileUrl: designFileUrl || null,
       amazonListing: {
         create: {
           // ... existing ...
           itemHighlights: itemHighlights || null,  // ← field này thuộc AmazonListing!
         }
       }
     }
   });
   ```

#### Bước 1.2 — Thêm rate limit cho Draft API (Fix #9)

**File:** `src/app/api/ideas/draft/route.ts`

```typescript
import { withRateLimit } from "@/lib/rate-limit-helper";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) { ... }
  
  const { blocked } = withRateLimit(session.user.id, "POST", "/api/ideas/draft");
  if (blocked) return blocked;
  // ... rest
}
```

#### Bước 1.3 — Chống race condition MSKU bằng try-catch trong POST route (Fix #6)

**File:** `src/app/api/ideas/route.ts`

Do MSKU có namespace riêng theo `nameAbbreviation` (mỗi user một prefix, ví dụ `NQH2607-xxx`), race condition chỉ xảy ra khi **cùng một user** submit 2+ ý tưởng trong cùng millisecond (rất hiếm). Không cần sửa `msku-generator.ts`.

**Giải pháp đơn giản:** Bọc `db.idea.create` trong try-catch, nếu gặp unique constraint (P2002) thì retry 1 lần:

```typescript
// Trong POST route, thay vì gọi generateMsku rồi create riêng:
let msku: string;
if (autoGenerateMsku !== false) {
  msku = await generateMsku(session.user.nameAbbreviation);
} else {
  // ... manual MSKU ...
}

// Gói create trong retry loop đơn giản
let idea;
for (let attempt = 0; attempt < 2; attempt++) {
  try {
    idea = await db.idea.create({ data: { msku, ... } });
    break;
  } catch (err: any) {
    if (err?.code === 'P2002' && attempt === 0 && autoGenerateMsku !== false) {
      msku = await generateMsku(session.user.nameAbbreviation);
      continue;
    }
    throw err;
  }
}
```

#### Bước 1.4 — Validate dimension range trong PATCH (Fix #11)

**File:** `src/app/api/ideas/[id]/route.ts`

Thêm check positive:
```typescript
if (body.widthCm !== undefined && (body.widthCm <= 0 || body.widthCm > 1000)) {
  return NextResponse.json({ error: "Chiều rộng không hợp lệ" }, { status: 400 });
}
// Tương tự cho heightCm (max 1000), thicknessMm (max 100)
```

---

### Phase 2: Sửa Frontend (UX & Logic)

> Làm sau vì phụ thuộc vào backend đã fix.

#### Bước 2.1 — Xóa validation thủ công, dùng Zod resolver hoàn toàn (Fix #3, #U2)

**File:** `src/app/(dashboard)/ideas/new/page.tsx`

**Hiện tại:** `onSubmit` có ~40 dòng `if/else` lặp lại toàn bộ schema. `onError` luôn báo "Vui lòng điền đầy đủ các thông tin bắt buộc".

**Sửa thành:**

1. **Xóa TOÀN BỘ manual validation trong `onSubmit`** (từ dòng `let hasError = false` đến `if (hasError) return;`)

2. **Sửa `onError` để hiển thị lỗi cụ thể đầu tiên:**
   ```typescript
   const onError = (errors: any) => {
     // Tìm field error đầu tiên và hiển thị message cụ thể của nó
     const firstErrorKey = Object.keys(errors)[0];
     const firstError = errors[firstErrorKey];
     const message = firstError?.message || "Vui lòng kiểm tra lại thông tin";
     toast.error(message, { position: "top-center" });
   };
   ```

3. **Đảm bảo Zod schema `getFormSchema` đã cover tất cả các case**, bao gồm cả `designFileUrl` bắt buộc cho partner:
   ```typescript
   .superRefine((data, ctx) => {
     // ... existing checks ...
     if (data.ideaSource === "partner" && (!data.designFileUrl || data.designFileUrl.trim() === "")) {
       ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["designFileUrl"], message: "Đối tác bắt buộc phải có file thiết kế" });
     }
   });
   ```

#### Bước 2.2 — Thêm cơ chế "Ở lại trang" sau khi tạo (Fix #U1)

**File:** `src/app/(dashboard)/ideas/new/page.tsx`

**Thay đổi hành vi sau khi tạo thành công:**

```typescript
// State mới
const [lastCreatedIdea, setLastCreatedIdea] = useState<{ id: string; msku: string } | null>(null);

// Trong onSubmit, sau khi API trả về data:
if (data) {
  const createdMsku = data.msku;
  const createdId = data.id;
  
  // Xóa draft
  await apiFetch("/api/ideas/draft", { method: "DELETE" });
  
  // Reset form nhưng GIỮ LẠI "Cài đặt chung" (topicId, aiModelId, ideaSource)
  form.reset({
    ...form.getValues(),
    // Reset các field nội dung
    mainImageUrl: "",
    designFileUrl: "",
    prompt: "",
    sourceLinks: [""],
    title: "",
    description: "",
    bulletPoints: ["", "", "", "", ""],
    tags: "",
    slugs: "",
    itemHighlights: "",
    width: "",
    height: "",
    thickness: "",
    material: "",
    // GIỮ LẠI các field "Cài đặt chung":
    // autoGenerateMsku, topicId, aiModelId, ideaSource, partnerId được giữ nguyên
    autoGenerateMsku: form.getValues("autoGenerateMsku"),
    manualMsku: "",
  });
  
  setShowDraftBanner(false);
  setLastSaved(null);
  setLastCreatedIdea({ id: createdId, msku: createdMsku });
  
  // Toast với action button "Xem chi tiết"
  toast.success(`Đã tạo ${createdMsku}!`, {
    action: {
      label: "Xem chi tiết",
      onClick: () => router.push(`/ideas/${createdId}`),
    },
    duration: 5000,
  });
  
  // Confetti
  import("canvas-confetti").then((c) => {
    c.default({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  });
  
  // Focus vào field ảnh để user tiếp tục nhập idea mới
  setTimeout(() => {
    const imageInput = document.querySelector('input[name="mainImageUrl"]') as HTMLInputElement;
    imageInput?.focus();
  }, 100);
}
```

**XÓA dòng:** `setTimeout(() => router.push("/ideas"), 2000);`

#### Bước 2.3 — Ngăn draft bị lưu lại sau khi submit thành công (Fix #U3)

**File:** `src/app/(dashboard)/ideas/new/page.tsx`

**Nguyên nhân:** Sau khi `form.reset()`, form watch vẫn chạy và thấy field thay đổi → trigger debounce → lưu draft trong lúc user đang xem confetti.

**Giải pháp:** Thêm một ref `skipDraftRef` để bỏ qua lần watch sau reset:

```typescript
const skipDraftRef = useRef(false);

// Trong form.watch subscription, thêm check đầu tiên:
useEffect(() => {
  const subscription = form.watch((value, { type }) => {
    if (!type) return;
    if (skipDraftRef.current) {
      skipDraftRef.current = false;
      return;
    }
    // ... existing logic ...
  });
  // ...
}, [form]);  // ← Fix #5: đổi từ [form.watch] thành [form]
```

Sau khi `form.reset()` trong `onSubmit`, set `skipDraftRef.current = true`:
```typescript
skipDraftRef.current = true;
form.reset({ ... });
```

#### Bước 2.4 — Sửa `sendBeacon` beforeunload (Fix #2)

**File:** `src/app/(dashboard)/ideas/new/page.tsx`

**Vấn đề:** `sendBeacon` với Blob gửi `Content-Type: text/plain`.

**Giải pháp:** Dùng `fetch` với `keepalive: true` thay vì `sendBeacon`:

```typescript
useEffect(() => {
  const handleBeforeUnload = () => {
    if (form.formState.isDirty && latestDataRef.current) {
      fetch('/api/ideas/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(latestDataRef.current),
        keepalive: true,
      });
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [form.formState.isDirty]);
```

> **Note:** `fetch` + `keepalive: true` có giới hạn body 64KB. Với form idea, body JSON thường < 5KB nên an toàn.

#### Bước 2.5 — Sửa `form.watch` dependency (Fix #5)

**File:** `src/app/(dashboard)/ideas/new/page.tsx`

Đổi:
```typescript
}, [form.watch]);
```
Thành:
```typescript
}, [form]);
```

> `form` object là stable reference, không thay đổi mỗi render.

#### Bước 2.6 — Sửa `isBasicallyEmpty` thành hàm helper (Fix #8)

**File:** `src/app/(dashboard)/ideas/new/page.tsx`

Định nghĩa constant `PRESERVED_FIELDS` (các field được giữ lại sau khi tạo) và dùng nó cho cả 2 nơi:

```typescript
// Các field được giữ lại khi reset form sau khi tạo idea thành công
const PRESERVED_FIELDS = new Set([
  "autoGenerateMsku", "topicId", "aiModelId", "ideaSource", "partnerId"
]);

// Hàm check form có thực sự trống không (ngoại trừ preserved fields)
const isFormEffectivelyEmpty = (values: Record<string, any>) => {
  return Object.entries(values).every(([key, val]) => {
    if (PRESERVED_FIELDS.has(key)) return true;
    if (val === undefined || val === null || val === "") return true;
    if (Array.isArray(val) && val.every((v: any) => !v)) return true;
    return false;
  });
};
```

---

### Phase 3: Dọn dẹp & Tối ưu

#### Bước 3.1 — Dùng chung `createIdeaSchema` từ `validators.ts` (Fix #10)

**File:** `src/lib/validators.ts`

Cập nhật `createIdeaSchema` để khớp với thực tế (thêm `designFileUrl`, `itemHighlights`, v.v.), rồi:

**File:** `src/app/api/ideas/route.ts` — thay thế validate thủ công bằng:
```typescript
const parsed = createIdeaSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: parsed.error.issues[0].message },
    { status: 400 }
  );
}
```

**File:** `new/page.tsx` — dùng trực tiếp `createIdeaSchema` thay vì `getFormSchema` động. Nếu cần rule động (max length từ DB), dùng `.refine()` hoặc merge schema.

#### Bước 3.2 — Thêm types thay vì `any` (Fix #12)

Tạo `src/types/idea-form.ts`:
```typescript
export interface IdeaFormValues {
  autoGenerateMsku: boolean;
  manualMsku: string;
  topicId: string;
  aiModelId: string;
  ideaSource: "employee" | "partner";
  partnerId: string;
  mainImageUrl: string;
  designFileUrl: string;
  prompt: string;
  sourceLinks: string[];
  title: string;
  description: string;
  bulletPoints: string[];
  tags: string;
  slugs: string;
  width: string;
  height: string;
  thickness: string;
  material: string;
  itemHighlights: string;
}
```

Dùng trong `useForm<IdeaFormValues>({...})`.

---

## 📊 Ma trận phụ thuộc

```
Phase 1 (Backend)
├── 1.1 POST /api/ideas fix ────── ► Phase 2 phụ thuộc vào
├── 1.2 Rate limit draft ───────── (độc lập)
├── 1.3 MSKU race condition ────── (độc lập)
└── 1.4 PATCH dimension validate ─ (độc lập)

Phase 2 (Frontend)
├── 2.1 Xóa manual validation ──── ► Fix #U2 (báo lỗi cụ thể)
├── 2.2 Ở lại trang ────────────── ► Fix #U1 + #U3 (không redirect)
├── 2.3 Ngăn draft sau reset ───── ► Fix #U3
├── 2.4 sendBeacon → fetch ─────── ► Fix #2
├── 2.5 form.watch dependency ──── ► Fix #5
└── 2.6 isBasicallyEmpty helper ── ► Fix #8

Phase 3 (Cleanup)
├── 3.1 Unified Zod schema ─────── ► Fix #10
└── 3.2 TypeScript types ───────── ► Fix #12
```

---

## ⏱️ Thời gian ước tính

| Phase | Bước | Ước lượng |
|-------|------|-----------|
| **Phase 1** | 1.1 → 1.4 | 45 phút |
| **Phase 2** | 2.1 → 2.6 | 1.5 giờ |
| **Phase 3** | 3.1 → 3.2 | 30 phút |
| **Test** | Build + dev test | 30 phút |
| **Tổng** | | ~3.5 giờ |

---

## ✅ Checklist test sau khi triển khai

- [ ] `npm run build` — 0 errors
- [ ] Tạo idea với đầy đủ field → mở detail → title, description, itemHighlights hiển thị đúng
- [ ] Tạo idea partner không có design file → báo lỗi cụ thể "Đối tác bắt buộc phải có file thiết kế"
- [ ] Prompt vượt 500 ký tự → báo "Tối đa 500 ký tự" (không phải "điền đầy đủ")
- [ ] Tạo idea thành công → form reset, giữ topic/aiModel/source → có thể tạo tiếp ngay
- [ ] Click "Xem chi tiết" trong toast → vào đúng idea vừa tạo
- [ ] Tạo idea xong → reload page → KHÔNG thấy draft cũ
- [ ] Đóng tab khi đang điền dở → mở lại → draft được khôi phục
- [ ] 2 user cùng tạo idea → MSKU không trùng
- [ ] Employee tạo idea → cần duyệt; Manager/Boss tạo → auto-approved
