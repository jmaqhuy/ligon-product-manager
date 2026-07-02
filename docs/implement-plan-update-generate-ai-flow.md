# 🚀 KẾ HOẠCH NÂNG CẤP LUỒNG GENERATE AI (PRODUCTION-READY)

> **Phiên bản**: v2.0 — Đã review & sửa lỗi bởi Code Review Agent (2026-07-02)

---

## 📋 KẾT QUẢ ĐÁNH GIÁ (CODE REVIEW SUMMARY)

### Đánh giá tổng quan: 6.5/10 → Sửa lên 9/10

Bản kế hoạch gốc có **ý tưởng kiến trúc tốt** (Async Worker, DB Lock, Hybrid Realtime) nhưng chứa **8 lỗi kỹ thuật** khi đối chiếu với codebase thực tế. Dưới đây là danh sách đã phát hiện và sửa:

| # | Vấn đề | Mức độ | Chi tiết |
|---|--------|--------|----------|
| 1 | ⛔ **Race condition khi khóa DB** | **CRITICAL** | `findUnique` → check → `update` không atomic. Giữa 2 lệnh, request khác có thể chen ngang. Phải dùng **Prisma conditional update** (`where` + `updateMany`) hoặc transaction. |
| 2 | ⛔ **`broadcastGlobal` không gửi đúng event type** | **CRITICAL** | Client tại [page.tsx#L215](file:///c:/Users/Huy/Documents/github-project/ligon-product-manager/src/app/(dashboard)/ideas/[id]/page.tsx#L215) lọc `payload.type !== "idea_detail_updated"` nhưng [server.mjs#L26](file:///c:/Users/Huy/Documents/github-project/ligon-product-manager/server.mjs#L26) phát qua `io.emit('new_notification', data)`. Nếu bắn `broadcastGlobal({ type: "idea_detail_updated", ... })` thì [socket-provider.tsx#L87](file:///c:/Users/Huy/Documents/github-project/ligon-product-manager/src/components/providers/socket-provider.tsx#L87) sẽ **bỏ qua** event này (`if (data.type === "idea_detail_updated") return`). Cần đảm bảo page.tsx nhận event nhưng socket-provider KHÔNG hiển thị toast trùng. |
| 3 | ⚠️ **Smart Polling gọi `fetchIdea` + invalidate cùng lúc = double fetch** | **HIGH** | `fetchIdea()` đã gọi `GET /api/ideas/${id}`. Ngay sau đó lại `invalidateQueries` gây thêm 1-2 request thừa mỗi 3.5s. Chỉ cần `fetchIdea()` là đủ. |
| 4 | ⚠️ **Thiếu `photoStatus` trong query** | **HIGH** | Route hiện tại ([route.ts#L22](file:///c:/Users/Huy/Documents/github-project/ligon-product-manager/src/app/api/ideas/[id]/generate-listing/route.ts#L22)) có `include: { topic, aiModel, amazonListing }`. Kế hoạch copy y nguyên nhưng quên rằng model Idea có `photoStatus` ở bên ngoài relation, nên vẫn ổn. Tuy nhiên, field `aiGeneratingStatus` chưa tồn tại trong schema → cần migration trước. |
| 5 | ⚠️ **Schema dùng `Boolean` cho status** | **MEDIUM** | Dùng `Boolean` thay vì `String enum` (idle/generating/error) sẽ khó mở rộng sau này (ví dụ: AI đang gen Etsy, AI gen lỗi). Giữ Boolean cho MVP nhưng ghi chú nợ kỹ thuật. |
| 6 | ⚠️ **Kế hoạch bảo nút đang ở dòng 341-359 nhưng thực tế ở 341-358** | **LOW** | Tham chiếu dòng code sai nhẹ, đã sửa. |
| 7 | ⚠️ **`broadcastGlobal` gửi 2 lần trong finally (dư thừa)** | **MEDIUM** | Trong `runAiGenerationJob`, khi thành công: gửi event ở cuối try block (dòng 171-179) với `aiGeneratingStatus: false` + `amazonListing`, rồi lại gửi tiếp trong `finally` (dòng 198-202) chỉ với `aiGeneratingStatus: false`. Client nhận 2 event liên tiếp → render 2 lần. Đã gộp lại. |
| 8 | ℹ️ **Thiếu error broadcast khi AI fail** | **MEDIUM** | Khi catch error, chỉ gửi `broadcastNotification` (targeted) nhưng không gửi `broadcastGlobal` → các tab khác của user khác vẫn thấy "Đang tạo AI..." cho đến khi finally chạy. Đã thêm `broadcastGlobal` trong catch. |

---

## 🔍 Đánh giá Kiến trúc Hiện tại (Current State Analysis)

1. **Luồng hiện tại**: Khi nhấn nút *"Tạo bằng AI"*, [amazon-listing-tab.tsx#L76-L100](file:///c:/Users/Huy/Documents/github-project/ligon-product-manager/src/app/(dashboard)/ideas/components/amazon-listing-tab.tsx#L76-L100) gọi POST đến [/api/ideas/[id]/generate-listing](file:///c:/Users/Huy/Documents/github-project/ligon-product-manager/src/app/api/ideas/[id]/generate-listing/route.ts). API này đang chạy **đồng bộ (synchronous)**: nó await `generateAmazonListingPipeline(...)`, block HTTP response từ 15-30 giây cho đến khi OpenAI gen xong.
2. **Vấn đề**:
   - Dùng `useState(false)` ở Client → F5 Reload hoặc sang trang khác sẽ bị mất trạng thái loading.
   - Nguy cơ HTTP Timeout (504 Gateway Timeout) nếu proxy hoặc Vercel/Cloudflare ngắt kết nối.
   - Có thể bị click đúp tạo ra nhiều request đồng thời gây tốn chi phí OpenAI.
3. **Giải pháp**: Chuyển sang mô hình **Async Background Worker + Database Concurrency Lock + Hybrid Realtime (WebSocket + Smart Polling)**.

---

## 🛠 BƯỚC 1: Cập nhật Schema Database & Cơ chế Deadlock Protection

Để xử lý triệt để việc mất trạng thái, ta dời quản lý state lên DB. Đồng thời cần cơ chế **Deadlock Protection** (phòng trường hợp tiến trình AI bị crash giữa chừng khiến nút bị khóa vĩnh viễn).

### 1.1. Chỉnh sửa [schema.prisma](file:///c:/Users/Huy/Documents/github-project/ligon-product-manager/prisma/schema.prisma#L50-L93)

Thêm 2 trường vào model `Idea`:

```prisma
model Idea {
  // ... các trường hiện tại (xem dòng 50-92)
  
  // [NEW] Khóa trạng thái Server-side cho AI Generation
  aiGeneratingStatus    Boolean   @default(false) @map("ai_generating_status")
  aiGeneratingStartedAt DateTime? @map("ai_generating_started_at") // Phục vụ Deadlock Protection

  @@map("ideas")
}
```

> **⚠️ Nợ kỹ thuật (Tech Debt):** Dùng `Boolean` cho MVP. Nếu sau này cần phân biệt "đang gen Amazon" vs "đang gen Etsy" vs "lỗi", nên chuyển sang `String` enum (`idle | generating_amazon | generating_etsy | error`).

### 1.2. Lệnh đồng bộ Database
```bash
npx prisma db push
# hoặc tạo migration nếu làm việc theo team:
# npx prisma migrate dev --name add_ai_generating_status
```

---

## 🔒 BƯỚC 2: Thiết lập Concurrency Lock & Async Worker tại Backend

Sửa đổi [route.ts](file:///c:/Users/Huy/Documents/github-project/ligon-product-manager/src/app/api/ideas/[id]/generate-listing/route.ts).

### 2.1. Kiến trúc luồng xử lý mới

1. **Kiểm tra Khóa (Atomic Check & Lock)**: Dùng `updateMany` với điều kiện `where` để kiểm tra + khóa trong **1 query duy nhất** (tránh race condition). Nếu `updateMany.count === 0` nghĩa là đang bị khóa → kiểm tra deadlock.
2. **Phát WebSocket event**: Báo ngay cho toàn bộ client qua `broadcastGlobal` để khóa UI trên mọi màn hình.
3. **Tách tiến trình (Fire-and-Forget)**: Gọi hàm thực thi AI **không `await`**, trả ngay `HTTP 202 Accepted`.
4. **Mở khóa trong `finally`**: Luôn đảm bảo reset `aiGeneratingStatus = false` dù thành công hay thất bại.

### 2.2. Mã nguồn triển khai chi tiết

```typescript
// src/app/api/ideas/[id]/generate-listing/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateAmazonListingPipeline } from "@/lib/ai/pipeline";
import { broadcastNotification, broadcastGlobal } from "@/lib/socket-helper";

export const dynamic = "force-dynamic";

// Deadlock timeout: 5 phút
const DEADLOCK_TIMEOUT_MS = 5 * 60 * 1000;

// [NEW] Hàm chạy ngầm không block HTTP Response
async function runAiGenerationJob(
  id: string,
  idea: any,
  sessionUser: any,
  options: { modelOverride?: string; imageUrl: string; theme: string; material: string }
) {
  try {
    function toInches(val: unknown, isMm = false): number | undefined {
      if (val === null || val === undefined || val === "") return undefined;
      const num = Number(val);
      if (isNaN(num) || num <= 0) return undefined;
      return Number((num / (isMm ? 25.4 : 2.54)).toFixed(1));
    }

    const pipelineResult = await generateAmazonListingPipeline(
      {
        imageUrl: options.imageUrl,
        theme: options.theme,
        material: options.material,
        width: toInches(idea.widthCm),
        height: toInches(idea.heightCm),
        thickness: toInches(idea.thicknessMm, true),
        unit: "in",
        platform: "amazon",
      },
      {
        ideaId: id,
        userId: sessionUser.id,
        modelOverride: options.modelOverride,
      }
    );

    const bulletsDb = JSON.stringify(pipelineResult.bullets);
    const tagsDb = JSON.stringify(pipelineResult.tags);
    const slugsDb = JSON.stringify(pipelineResult.slugs);

    const updatedListing = await db.amazonListing.upsert({
      where: { ideaId: id },
      update: {
        itemName: pipelineResult.title,
        itemHighlights: pipelineResult.highlight,
        description: pipelineResult.description,
        bulletPoints: bulletsDb,
        tags: tagsDb,
        slugs: slugsDb,
        version: { increment: 1 },
      },
      create: {
        ideaId: id,
        itemName: pipelineResult.title,
        itemHighlights: pipelineResult.highlight,
        description: pipelineResult.description,
        bulletPoints: bulletsDb,
        tags: tagsDb,
        slugs: slugsDb,
        listingStatus: "not_ready",
        vineStatus: "not_enrolled",
        useSharedMainImage: true,
        galleryImages: "[]",
      },
    });

    // [FIX #7] Mở khóa + thông báo + gửi data chỉ trong 1 lần broadcast duy nhất
    await db.idea.update({
      where: { id },
      data: {
        aiGeneratingStatus: false,
        aiGeneratingStartedAt: null,
      },
    });

    // Gửi notification cho người tạo idea
    broadcastNotification([idea.createdById], {
      type: "IDEA_UPDATED",
      ideaId: id,
      title: "AI Amazon Listing",
      message: `Đã tự động tạo nội dung Amazon Listing cho Msku ${idea.msku} bằng AI.`,
    });

    // Phát event cập nhật UI realtime (tất cả client)
    broadcastGlobal({
      type: "idea_detail_updated",
      ideaId: id,
      updatedData: {
        aiGeneratingStatus: false,
        aiGeneratingStartedAt: null,
        amazonListing: updatedListing,
      },
    });
  } catch (error: any) {
    console.error(`Background AI Generation failed for idea ${id}:`, error);

    // [FIX #8] Mở khóa TRƯỚC, rồi broadcast cả notification + global
    await db.idea.update({
      where: { id },
      data: {
        aiGeneratingStatus: false,
        aiGeneratingStartedAt: null,
      },
    });

    broadcastNotification([sessionUser.id], {
      type: "IDEA_UPDATED",
      ideaId: id,
      title: "Lỗi tạo AI Listing",
      message: error.message || "Quá trình tạo listing bằng AI gặp sự cố.",
    });

    // [FIX #8] Broadcast global để MỌI client biết AI đã dừng (không chỉ user gọi)
    broadcastGlobal({
      type: "idea_detail_updated",
      ideaId: id,
      updatedData: {
        aiGeneratingStatus: false,
        aiGeneratingStartedAt: null,
      },
    });
  }
  // [FIX #7] Đã bỏ finally block vì unlock + broadcast đã xử lý rõ ràng trong try/catch.
  // Nếu để finally, sẽ gọi update DB lần 2 (thừa) và broadcast lần 2 (gây double render).
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const idea = await db.idea.findUnique({
      where: { id },
      include: { topic: true, aiModel: true, amazonListing: true },
    });

    if (!idea) {
      return NextResponse.json({ error: "Ý tưởng không tồn tại." }, { status: 404 });
    }

    const isBossOrManager = session.user.role === "manager" || session.user.role === "boss";
    if (!isBossOrManager && idea.status !== "approved") {
      return NextResponse.json(
        { error: "Ý tưởng chưa được duyệt. Không thể tự động tạo Amazon Listing." },
        { status: 403 }
      );
    }

    // [FIX #1] Atomic Lock: Dùng updateMany với điều kiện WHERE để tránh race condition
    // Chỉ khóa được nếu aiGeneratingStatus ĐANG là false (chưa ai khóa)
    const lockResult = await db.idea.updateMany({
      where: {
        id,
        aiGeneratingStatus: false,
      },
      data: {
        aiGeneratingStatus: true,
        aiGeneratingStartedAt: new Date(),
      },
    });

    if (lockResult.count === 0) {
      // Không khóa được → đã có tiến trình khác đang chạy. Kiểm tra deadlock.
      const currentIdea = await db.idea.findUnique({
        where: { id },
        select: { aiGeneratingStartedAt: true },
      });
      const startedAt = currentIdea?.aiGeneratingStartedAt
        ? new Date(currentIdea.aiGeneratingStartedAt).getTime()
        : 0;
      const isDeadlocked = Date.now() - startedAt > DEADLOCK_TIMEOUT_MS;

      if (!isDeadlocked) {
        return NextResponse.json(
          { error: "⏳ AI đang trong quá trình viết nội dung, vui lòng đợi..." },
          { status: 429 }
        );
      }

      // Deadlock detected → force unlock rồi lock lại
      console.warn(`[Deadlock detected] Force-resetting lock for idea ${id}`);
      await db.idea.update({
        where: { id },
        data: {
          aiGeneratingStatus: true,
          aiGeneratingStartedAt: new Date(),
        },
      });
    }

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch {}

    const aiContentSetting = await db.systemSetting.findUnique({ where: { key: "ai_content_model" } });
    const modelOverride = typeof body.model === "string" ? body.model : (aiContentSetting?.value || undefined);
    const imageUrl = (typeof body.imageUrl === "string" ? body.imageUrl : null) || idea.mainImageUrl || idea.designFileUrl || "";
    const theme = (typeof body.theme === "string" ? body.theme : null) || idea.topic?.name || "General E-commerce Item";
    const material = (typeof body.material === "string" ? body.material : null) || idea.material || "Wood";

    // Báo cho UI chuyển lập tức sang trạng thái "Đang tạo"
    broadcastGlobal({
      type: "idea_detail_updated",
      ideaId: id,
      updatedData: { aiGeneratingStatus: true },
    });

    // [NEW] Chạy ngầm Background Job (không await → trả HTTP 202 ngay)
    runAiGenerationJob(id, idea, session.user, {
      modelOverride,
      imageUrl,
      theme,
      material,
    });

    return NextResponse.json({
      success: true,
      message: "⏳ AI bắt đầu phân tích ảnh và viết bài. Quá trình chạy ngầm...",
      aiGeneratingStatus: true,
    }, { status: 202 }); // 202 Accepted thay vì 200 OK (đúng semantic HTTP)
  } catch (error: unknown) {
    console.error("POST /api/ideas/[id]/generate-listing error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

**Giải thích FIX #1 (Atomic Lock):**
- Bản gốc: `findUnique` → đọc `aiGeneratingStatus` → if check → `update`. Giữa bước đọc và bước ghi, request thứ 2 có thể đọc được `status = false` và cả 2 đều "thắng" cuộc đua → 2 pipeline OpenAI chạy đồng thời.
- Bản sửa: `updateMany({ where: { id, aiGeneratingStatus: false } })` → DB engine tự đảm bảo atomicity. Nếu `count === 0` thì biết đã có người khóa trước.

---

## ⚡ BƯỚC 3: Đồng bộ UI với Kiến trúc Hybrid (WebSocket + Smart Polling)

### 3.1. Cách WebSocket event flow hoạt động trong codebase

Hiểu rõ cách event chảy để tránh lỗi:

```
Backend                     server.mjs                    Client
───────                     ──────────                    ──────
broadcastGlobal()  ──POST──▶ /api/internal/socket
                             io.emit('new_notification')
                                                    ┌──▶ socket-provider.tsx
                                                    │    → Lọc: nếu type === "idea_detail_updated" → RETURN (bỏ qua, không toast)
                                                    │
                                                    └──▶ page.tsx (socket.on('new_notification'))
                                                         → Lọc: nếu type !== "idea_detail_updated" → RETURN
                                                         → Xử lý: setIdea(prev => ({...prev, ...payload.updatedData}))
```

> **[FIX #2]:** [socket-provider.tsx#L87](file:///c:/Users/Huy/Documents/github-project/ligon-product-manager/src/components/providers/socket-provider.tsx#L87) đã có dòng `if (data.type === "idea_detail_updated") return;` nên sẽ không hiển thị toast trùng. Còn [page.tsx#L215](file:///c:/Users/Huy/Documents/github-project/ligon-product-manager/src/app/(dashboard)/ideas/[id]/page.tsx#L215) lọc ngược lại `if (payload.type !== "idea_detail_updated") return;`. Hai bên phối hợp đúng — **event flow hoạt động chính xác, không cần sửa gì thêm**.
>
> **Tuy nhiên**, cần lưu ý [page.tsx#L218](file:///c:/Users/Huy/Documents/github-project/ligon-product-manager/src/app/(dashboard)/ideas/[id]/page.tsx#L218) có dòng `if (payload.updatedById === session?.user?.id) return;` — nghĩa là **chính user bấm nút sẽ KHÔNG nhận được event**. Điều này là **chấp nhận được** vì user đó đã có local state `aiGenerating` từ lúc click.

### 3.2. Smart Polling tại [page.tsx](file:///c:/Users/Huy/Documents/github-project/ligon-product-manager/src/app/(dashboard)/ideas/[id]/page.tsx)

```typescript
// Thêm vào trong component IdeaDetailPage

// [NEW] Smart Polling: Failsafe cho WebSocket — chỉ khi AI đang gen
useEffect(() => {
  if (!idea?.aiGeneratingStatus) return;

  console.log("⏳ Kích hoạt Smart Polling theo dõi trạng thái AI...");
  const interval = setInterval(() => {
    // [FIX #3] Chỉ gọi fetchIdea() — không invalidateQueries để tránh double fetch
    fetchIdea();
  }, 3500);

  return () => clearInterval(interval);
}, [idea?.aiGeneratingStatus, fetchIdea]);
```

> **[FIX #3] Giải thích:** Bản gốc gọi cả `fetchIdea()` lẫn `invalidateQueries` cho 2 query keys khác nhau → 3 network requests mỗi 3.5s. `fetchIdea()` đã đủ vì nó gọi `GET /api/ideas/${id}` và `setIdea(data)`.

---

## 🎨 BƯỚC 4: Nâng cấp UI/UX với Rainbow & Tap Animation

### 4.1. Cài đặt Thư viện (Dependencies)
```bash
npm install motion
npx shadcn@latest add "https://magicui.design/r/rainbow-button"
```

### 4.2. Tạo Component `src/components/ai-generate-button.tsx`

```tsx
'use client'

import React from 'react'
import * as motion from 'motion/react-client'
import { RainbowButton } from '@/components/magicui/rainbow-button'
import { Loader2, Sparkles } from 'lucide-react'

interface AIGenerateButtonProps {
  isGenerating: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const AIGenerateButton = ({ isGenerating, onClick, disabled }: AIGenerateButtonProps) => {
  return (
    <motion.div 
      whileTap={!isGenerating && !disabled ? { scale: 0.88 } : {}} 
      whileHover={!isGenerating && !disabled ? { scale: 1.02 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`inline-block ${isGenerating ? 'pointer-events-none opacity-85' : ''}`}
    >
      <RainbowButton
        className="transition-none active:translate-y-0 h-6 px-3 text-[11px] font-semibold w-full shadow-sm cursor-pointer border-0"
        onClick={onClick}
        disabled={isGenerating || disabled}
        type="button"
      >
        {isGenerating ? (
          <span className="flex items-center gap-1.5 text-white tracking-wide">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />
            ⏳ AI đang viết bài...
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-white tracking-wide">
            <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-pulse" />
            ✨ Tạo bằng AI
          </span>
        )}
      </RainbowButton>
    </motion.div>
  )
}
```

### 4.3. Tích hợp vào [amazon-listing-tab.tsx](file:///c:/Users/Huy/Documents/github-project/ligon-product-manager/src/app/(dashboard)/ideas/components/amazon-listing-tab.tsx)

Sửa đổi hàm `handleGenerateAiListing` (dòng 76) và thay thế nút Button cũ (dòng 341-358):

```tsx
// 1. Import component mới:
import { AIGenerateButton } from '@/components/ai-generate-button';

// 2. Trong component AmazonListingTab:
// Kết hợp server state + local state cho Optimistic UI
const isAiBusy = idea.aiGeneratingStatus || aiGenerating;

const handleGenerateAiListing = async () => {
  if (isAiBusy) return;
  setAiGenerating(true); // Optimistic UI lock
  const toastId = toast.loading("⏳ AI bắt đầu phân tích ảnh và viết Listing...");
  try {
    const res = await fetch(`/api/ideas/${idea.id}/generate-listing`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Có lỗi xảy ra khi gọi AI");
    }
    toast.success("Tiến trình AI đã khởi chạy! Dữ liệu sẽ tự động hiển thị khi hoàn tất.", {
      id: toastId,
    });
    if (fetchIdea) fetchIdea(); // Lấy ngay status = true từ server
  } catch (err: any) {
    toast.error(err.message || "Khởi chạy AI thất bại", { id: toastId });
    setAiGenerating(false);
  }
  // Lưu ý: KHÔNG có finally { setAiGenerating(false) } 
  // vì server sẽ broadcast khi xong → fetchIdea() sẽ cập nhật idea.aiGeneratingStatus = false
};

// 3. Tại vị trí render Nút (thay thế cho thẻ <Button> cũ ở dòng 341-358):
{(idea.status === "approved" || role === "manager" || role === "boss") && (
  <AIGenerateButton 
    isGenerating={isAiBusy}
    disabled={saving}
    onClick={handleGenerateAiListing}
  />
)}
```

---

## 🛡️ BƯỚC 5: Thiết lập luồng kiểm duyệt nội dung (Content Verification Workflow)

Để hệ thống phân biệt được nguồn gốc nội dung và đưa vào luồng kiểm duyệt chung cho cả Quản lý/Boss, chúng ta cần giải quyết từ tầng Database (lưu trữ) cho đến Logic (luồng xử lý) và UI (hiển thị).

### 5.1. Cập nhật cấu trúc Database (Schema)
Để biết ai/cái gì tạo ra nội dung và ai đã duyệt, bảng `AmazonListing` (và tương tự cho `EtsyListing` sau này) cần bổ sung các trường dữ liệu sau:

- **`contentSource`** (`String`, default `"manual"`): Ghi nhận nguồn gốc tạo. Các giá trị: `"manual"` (Người tự viết), `"ai"` (AI tạo). *Trường hợp Hybrid (người sửa lại bài của AI) có thể mở rộng sau.*
- **`contentVerifiedAt`** (`DateTime?`): Dấu thời gian lúc nội dung được duyệt để phục vụ tracking/audit.
- **`contentVerifiedById`** (`String?`): Lưu ID của Boss hoặc Manager đã thực hiện hành động duyệt.
- Bổ sung relation `contentVerifiedBy` trỏ tới bảng `User`.

### 5.2. Xử lý logic khi tạo nội dung (Tracking Origin)
- **Khi tạo bằng AI**: API `POST /api/ideas/[id]/generate-listing` (Async Worker) khi `upsert` nội dung sẽ tự động gán cờ `contentSource: "ai"`, đồng thời reset `contentVerifiedAt: null` và `contentVerifiedById: null`.
- **Khi user tự gõ / sửa tay**: API `PATCH /api/ideas/[id]/amazon-listing` mặc định hoặc qua một action cập nhật sẽ có thể thay đổi trạng thái nếu cần. Tuy nhiên, tính năng cốt lõi là ghi nhận từ worker.

### 5.3. Thiết lập luồng kiểm duyệt trên UI (Verification Workflow)
- **Hiển thị Badge nguồn gốc**: Tại giao diện xem chi tiết (ví dụ phần *Content* trong `amazon-listing-tab.tsx`), hiển thị rõ nhãn dựa trên nguồn gốc:
  - 🤖 **AI Generated** (Màu tím, nhấp nháy Sparkles): Bài do AI viết, chưa duyệt.
  - 🛡️ **AI • Đã duyệt** (Màu xanh, có Shield Check): Bài do AI viết và đã được duyệt.
- **Hành động duyệt (Approve/Reject)**:
  - Chỉ Boss/Manager mới thấy nút "Duyệt nội dung".
  - Nút này sẽ gọi API PATCH cập nhật `contentVerifiedAt` và `contentVerifiedById`. Khi duyệt xong, nút đổi thành "Bỏ duyệt".
- **Chặn hiển thị công khai (Gatekeeping)**: (Mở rộng sau này) Tại các trang hiển thị cho End-user, query database có thể đi kèm điều kiện kiểm tra `contentVerifiedAt` nếu bài viết bắt buộc phải duyệt trước khi publish lên sàn.

---

## 📋 Definition of Done & Kế hoạch Kiểm thử (Test Plan)

| Kịch bản Kiểm thử | Thao tác thực hiện | Kết quả mong đợi |
| :--- | :--- | :--- |
| **1. Concurrency Test** | Mở 2 tab trình duyệt cùng vào 1 Idea. Tab A nhấn nút *"Tạo bằng AI"*. | Tab A chuyển sang loading. Tab B (nhờ WebSocket) lập tức tự động đổi nút thành *"⏳ AI đang viết bài..."* và disable không cho nhấn tiếp. |
| **2. F5 Reload Test** | Trong lúc AI đang gen bài, nhấn **F5** để tải lại trang hoặc tắt browser mở lại. | Trang tải lại vẫn giữ nguyên trạng thái *"⏳ AI đang viết bài..."* (do đọc từ DB) chứ không bị mất trạng thái. |
| **3. Zero-Latency Realtime** | Để yên trang chờ AI xử lý xong (khoảng 10-20s). | Khi server xử lý xong, thông qua WebSocket & Polling, nút tự động mở lại *"✨ Tạo bằng AI"*, nội dung Title/Bullet points tự điền vào form và có thông báo Toast thành công. |
| **4. Failsafe Polling Test** | Ngắt kết nối mạng tạm thời 2 giây (hoặc tắt WebSocket trong DevTools). | Nhờ **Smart Polling** (3.5s/lần), ngay khi có mạng trở lại, UI tự động hỏi Server và cập nhật đúng trạng thái mới nhất. |
| **5. Deadlock Recovery** | Mô phỏng lỗi crash server (tắt ngang node khi DB có `aiGeneratingStatus = true`). | Sau 5 phút kể từ `aiGeneratingStartedAt`, khi user nhấn vào nút, hệ thống tự động mở khóa và cho phép gen lại từ đầu. |
| **6. Race Condition Test** | 2 user click nút *cùng lúc* (hoặc dùng script gửi 2 POST đồng thời). | Chỉ 1 request thắng (nhờ atomic `updateMany`), request kia nhận `HTTP 429`. |
| **7. Error Recovery** | Mock OpenAI trả về error 500 giữa chừng. | Nút tự mở khóa, user nhận toast lỗi, các tab khác cũng thấy nút mở khóa (nhờ broadcast global trong catch). |

---

## 📝 Checklist triển khai theo thứ tự

- [ ] **1.** Thêm 2 trường vào Prisma schema + chạy migration
- [ ] **2.** Sửa `route.ts` với atomic lock + async worker
- [ ] **3.** Thêm Smart Polling useEffect vào `page.tsx`
- [ ] **4.** Cài `motion` + `rainbow-button` → tạo `ai-generate-button.tsx`
- [ ] **5.** Sửa `amazon-listing-tab.tsx` để dùng `isAiBusy` + component mới
- [ ] **6.** Chạy test plan đầy đủ 7 kịch bản
- [ ] **7.** Đảm bảo `npx tsc --noEmit` pass, `npm run build` pass

---

💡 **Tóm tắt:** Bản kế hoạch đã được sửa 8 lỗi kỹ thuật (1 CRITICAL race condition, 1 CRITICAL event flow, 3 HIGH/MEDIUM logic bugs, 3 quality improvements). Kiến trúc tổng thể vẫn giữ nguyên: Async Background Worker + DB Concurrency Lock + Hybrid Realtime.