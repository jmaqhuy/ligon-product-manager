import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateAmazonListingPipeline } from "@/lib/ai/pipeline";
import { broadcastNotification, broadcastGlobal } from "@/lib/socket-helper";

export const dynamic = "force-dynamic";

// Deadlock timeout: 5 phút
const DEADLOCK_TIMEOUT_MS = 5 * 60 * 1000;

// Background worker — runs AI pipeline without blocking HTTP response
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

    // Format fields as JSON strings for database storage
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
        contentSource: "ai",
        contentVerifiedAt: null,
        contentVerifiedById: null,
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
        contentSource: "ai",
        listingStatus: "not_ready",
        vineStatus: "not_enrolled",
        useSharedMainImage: true,
        galleryImages: "[]",
      },
    });

    // Unlock DB
    await db.idea.update({
      where: { id },
      data: {
        aiGeneratingStatus: false,
        aiGeneratingStartedAt: null,
      },
    });

    // Notify idea creator
    broadcastNotification([idea.createdById], {
      type: "IDEA_UPDATED",
      ideaId: id,
      title: "AI Amazon Listing",
      message: `Đã tự động tạo nội dung Amazon Listing cho Msku ${idea.msku} bằng AI.`,
    });

    // Broadcast to all clients — unlock UI + push new listing data
    broadcastGlobal({
      type: "idea_detail_updated",
      ideaId: id,
      updatedBy: "AI Content Generator",
      updatedById: sessionUser.id,
      updatedData: {
        aiGeneratingStatus: false,
        aiGeneratingStartedAt: null,
        amazonListing: updatedListing,
      },
    });
  } catch (error: any) {
    console.error(`Background AI Generation failed for idea ${id}:`, error);

    // Unlock DB even on failure
    await db.idea.update({
      where: { id },
      data: {
        aiGeneratingStatus: false,
        aiGeneratingStartedAt: null,
      },
    });

    // Notify the user who triggered the generation
    broadcastNotification([sessionUser.id], {
      type: "IDEA_UPDATED",
      ideaId: id,
      title: "Lỗi tạo AI Listing",
      message: error.message || "Quá trình tạo listing bằng AI gặp sự cố.",
    });

    // Broadcast global unlock so ALL clients see the button re-enabled
    broadcastGlobal({
      type: "idea_detail_updated",
      ideaId: id,
      updatedBy: "AI Content Generator",
      updatedById: sessionUser.id,
      updatedData: {
        aiGeneratingStatus: false,
        aiGeneratingStartedAt: null,
      },
    });
  }
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
      include: {
        topic: true,
        aiModel: true,
        amazonListing: true,
      },
    });

    if (!idea) {
      return NextResponse.json({ error: "Ý tưởng không tồn tại." }, { status: 404 });
    }

    // Permission check: Idea must be approved OR user must be manager/boss
    const isBossOrManager = session.user.role === "manager" || session.user.role === "boss";
    if (isBossOrManager) {
      if (idea.status === "rejected") {
        return NextResponse.json(
          { error: "Ý tưởng đã bị từ chối. Không thể tạo nội dung." },
          { status: 403 }
        );
      }
    } else {
      if (idea.status !== "approved") {
        return NextResponse.json(
          { error: "Ý tưởng chưa được duyệt. Không thể tự động tạo nội dung." },
          { status: 403 }
        );
      }
      
      // Quota check for employee
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const usageCount = await db.auditLog.count({
        where: {
          changedById: session.user.id,
          entityType: "AI_GENERATION",
          changedAt: { gte: startOfMonth }
        }
      });
      
      if (usageCount >= 1000) {
        return NextResponse.json(
          { error: "Bạn đã vượt quá giới hạn tạo bằng AI (1000 lần/tháng)." },
          { status: 429 }
        );
      }
    }

    // Atomic Lock: updateMany with WHERE condition to prevent race conditions.
    // Only succeeds if aiGeneratingStatus is currently false (nobody else holds the lock).
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
      // Lock failed — another process is already generating. Check for deadlock.
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

      // Deadlock detected — force re-lock
      console.warn(`[Deadlock detected] Force-resetting lock for idea ${id}`);
      await db.idea.update({
        where: { id },
        data: {
          aiGeneratingStatus: true,
          aiGeneratingStartedAt: new Date(),
        },
      });
    }

    // Check optional body overrides (e.g. model override or manual theme/material tweaks)
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch {}

    const aiContentSetting = await db.systemSetting.findUnique({ where: { key: "ai_content_model" } });
    const modelOverride = typeof body.model === "string" ? body.model : (aiContentSetting?.value || undefined);
    const imageUrl = (typeof body.imageUrl === "string" ? body.imageUrl : null) || idea.mainImageUrl || idea.designFileUrl || "";
    const theme = (typeof body.theme === "string" ? body.theme : null) || idea.topic?.name || "General E-commerce Item";
    const material = (typeof body.material === "string" ? body.material : null) || idea.material || "Wood";

    // Broadcast UI lock immediately to all clients
    broadcastGlobal({
      type: "idea_detail_updated",
      ideaId: id,
      updatedBy: "AI Content Generator",
      updatedById: session.user.id,
      updatedData: { aiGeneratingStatus: true },
    });

    // Fire-and-forget: run AI pipeline in background (no await)
    runAiGenerationJob(id, idea, session.user, {
      modelOverride,
      imageUrl,
      theme,
      material,
    });

    // Return immediately — HTTP 202 Accepted (async operation started)
    return NextResponse.json({
      success: true,
      message: "⏳ AI bắt đầu phân tích ảnh và viết bài. Quá trình chạy ngầm...",
      aiGeneratingStatus: true,
    }, { status: 202 });
  } catch (error: unknown) {
    console.error("POST /api/ideas/[id]/generate-listing error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
