import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { broadcastNotification, broadcastGlobal } from "@/lib/socket-helper";
import { can, type Role } from "@/lib/permissions";

// GET /api/ideas/[id] - Get single idea with listings
export async function GET(
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
        createdBy: {
          select: { id: true, fullName: true, nameAbbreviation: true, role: true },
        },
        fileAssignee: {
          select: { id: true, fullName: true, nameAbbreviation: true },
        },
        topic: { select: { id: true, name: true } },
        aiModel: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true, googleSheetUrl: true } },
        amazonListing: {
          include: {
            sellingAccount: { select: { id: true, name: true, platform: true } },
          },
        },
        etsyListing: {
          include: {
            sellingAccount: { select: { id: true, name: true, platform: true } },
          },
        },
        productionRequests: {
          select: { id: true, completedAt: true },
        },
      },
    });

    if (!idea) {
      return NextResponse.json({ error: "Không tìm thấy ý tưởng" }, { status: 404 });
    }

    let internalSourceIdeas: { id: string; msku: string }[] = [];
    if (idea.sourceLinks) {
      try {
        const links = JSON.parse(idea.sourceLinks) as string[];
        const internalIds = links
          .filter(l => l.startsWith("internal:"))
          .map(l => l.substring(9));
        
        if (internalIds.length > 0) {
          internalSourceIdeas = await db.idea.findMany({
            where: { id: { in: internalIds } },
            select: { id: true, msku: true }
          });
        }
      } catch (e) {
        // ignore parse error
      }
    }

    return NextResponse.json({
      ...idea,
      internalSourceIdeas
    });
  } catch (error) {
    console.error("GET /api/ideas/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/ideas/[id] - Update idea fields
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const currentRole = session.user.role as Role;
    const body = await req.json();

    const idea = await db.idea.findUnique({ where: { id } });
    if (!idea) {
      return NextResponse.json({ error: "Không tìm thấy ý tưởng" }, { status: 404 });
    }

    // Optimistic locking
    if (body.version !== undefined && body.version !== idea.version) {
      return NextResponse.json(
        { error: "Dữ liệu đã được cập nhật bởi người khác. Vui lòng tải lại trang." },
        { status: 409 }
      );
    }

    // Permission check for employees
    if (currentRole === "employee" && idea.createdById !== session.user.id) {
      return NextResponse.json({ error: "Bạn chỉ có thể chỉnh sửa ý tưởng do mình tạo" }, { status: 403 });
    }

    // Build update data and audit logs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { version: { increment: 1 } };
    const auditEntries: { field: string; oldVal: string | null; newVal: string | null }[] = [];

    // Status change (approve/reject/revise)
    if (body.status !== undefined && body.status !== idea.status) {
      if ((body.status === "approved" || body.status === "rejected" || body.status === "revision_requested") && !can(currentRole, "approve_idea")) {
        return NextResponse.json({ error: "Bạn không có quyền duyệt/từ chối ý tưởng" }, { status: 403 });
      }
      auditEntries.push({ field: "status", oldVal: idea.status, newVal: body.status });
      updateData.status = body.status;

      if (body.fulfillmentType) {
        await db.amazonListing.update({
          where: { ideaId: id },
          data: { fulfillmentType: body.fulfillmentType }
        });
      }

      // If approved or rejected, typically needsReReview is cleared
      if (body.status === "approved" || body.status === "rejected") {
        updateData.needsReReview = false;
      }
    }

    // Review Comment
    if (body.reviewComment !== undefined) {
      updateData.reviewComment = body.reviewComment;
    }

    // Clear needsReReview manually
    if (body.needsReReview !== undefined) {
      updateData.needsReReview = body.needsReReview;
    }

    // File status & assignee
    if (body.fileStatus !== undefined && body.fileStatus !== idea.fileStatus) {
      auditEntries.push({ field: "fileStatus", oldVal: idea.fileStatus, newVal: body.fileStatus });
      updateData.fileStatus = body.fileStatus;
    }
    if (body.fileAssigneeId !== undefined) {
      updateData.fileAssigneeId = body.fileAssigneeId;
    }
    if (body.fileRevisionNote !== undefined) {
      updateData.fileRevisionNote = body.fileRevisionNote;
    }

    // Production file URL
    if (body.designFileUrl !== undefined) {
      updateData.designFileUrl = body.designFileUrl;
    }
    if (body.partnerLabel !== undefined) {
      updateData.partnerLabel = body.partnerLabel;
    }
    if (body.fulfillmentType !== undefined && !body.status) {
      // If updating fulfillmentType independently of status change
      await db.amazonListing.update({
        where: { ideaId: id },
        data: { fulfillmentType: body.fulfillmentType }
      });
    }

    // Dimensions & material
    const addAudit = (field: string, oldV: any, newV: any) => {
      const oldStr = oldV != null ? String(oldV) : null;
      const newStr = newV != null ? String(newV) : null;
      if (oldStr !== newStr) {
        auditEntries.push({ field, oldVal: oldStr, newVal: newStr });
        return true;
      }
      return false;
    };

    if (body.widthCm !== undefined) { 
      if (addAudit("widthCm", idea.widthCm, body.widthCm)) updateData.widthCm = body.widthCm; 
    }
    if (body.heightCm !== undefined) { 
      if (addAudit("heightCm", idea.heightCm, body.heightCm)) updateData.heightCm = body.heightCm; 
    }
    if (body.thicknessMm !== undefined) { 
      if (addAudit("thicknessMm", idea.thicknessMm, body.thicknessMm)) updateData.thicknessMm = body.thicknessMm; 
    }
    if (body.material !== undefined) { 
      if (addAudit("material", idea.material, body.material)) updateData.material = body.material; 
    }

    // Photo status
    if (body.photoStatus !== undefined) {
      await db.amazonListing.update({ where: { ideaId: id }, data: { photoStatus: body.photoStatus } });
      await db.etsyListing.update({ where: { ideaId: id }, data: { photoStatus: body.photoStatus } });
    }

    // Core fields
    let coreEdited = false;
    if (body.sourceLinks !== undefined) { 
      const newLinks = typeof body.sourceLinks === "string" ? body.sourceLinks : JSON.stringify(body.sourceLinks);
      if (addAudit("sourceLinks", idea.sourceLinks, newLinks)) {
        updateData.sourceLinks = newLinks; 
        coreEdited = true; 
      }
    }
    if (body.prompt !== undefined) { if (addAudit("prompt", idea.prompt, body.prompt)) { updateData.prompt = body.prompt; coreEdited = true; } }
    if (body.topicId !== undefined) { if (addAudit("topicId", idea.topicId, body.topicId)) { updateData.topicId = body.topicId; coreEdited = true; } }
    if (body.aiModelId !== undefined) { if (addAudit("aiModelId", idea.aiModelId, body.aiModelId)) { updateData.aiModelId = body.aiModelId; coreEdited = true; } }
    if (body.mainImageUrl !== undefined) { if (addAudit("mainImageUrl", idea.mainImageUrl, body.mainImageUrl)) { updateData.mainImageUrl = body.mainImageUrl; coreEdited = true; } }
    if (body.source !== undefined) { if (addAudit("source", idea.source, body.source)) { updateData.source = body.source; coreEdited = true; } }
    if (body.partnerId !== undefined) { if (addAudit("partnerId", idea.partnerId, body.partnerId)) { updateData.partnerId = body.partnerId; coreEdited = true; } }

    // If employee edits a non-reviewing idea, flag it for re-review or resubmit
    if (currentRole === "employee" && coreEdited) {
      if (idea.status === "revision_requested") {
        updateData.status = "reviewing";
        updateData.needsReReview = false;
        auditEntries.push({ field: "status", oldVal: "revision_requested", newVal: "reviewing" });
      } else if (idea.status !== "reviewing") {
        updateData.needsReReview = true;
      }
    }

    const [updated] = await db.$transaction([
      db.idea.update({
        where: { id },
        data: updateData,
        include: {
          createdBy: { select: { fullName: true } },
          topic: { select: { name: true } },
          partner: { select: { name: true } },
          amazonListing: true,
          etsyListing: true,
        }
      }),
      db.auditLog.createMany({
        data: auditEntries.map(e => ({
          entityType: "idea",
          entityId: id,
          fieldName: e.field,
          oldValue: e.oldVal,
          newValue: e.newVal,
          changedById: session.user.id,
        }))
      })
    ]);

    const ideaRow = {
      id: updated.id,
      msku: updated.msku,
      sku: updated.amazonListing?.sku,
      mainImageUrl: updated.mainImageUrl,
      status: updated.status,
      photoStatus: updated.amazonListing?.photoStatus || updated.etsyListing?.photoStatus || "not_requested",
      amazonPhotoStatus: updated.amazonListing?.photoStatus,
      etsyPhotoStatus: updated.etsyListing?.photoStatus,
      topicName: updated.topic.name,
      createdByName: updated.createdBy.fullName,
      createdAt: updated.createdAt.toISOString(),
      needsReReview: updated.needsReReview,
      reviewComment: updated.reviewComment,
      source: updated.source,
      partnerName: updated.partner?.name,
      amazonListingStatus: updated.amazonListing?.listingStatus,
      etsyListingStatus: updated.etsyListing?.listingStatus,
      fulfillmentType: updated.amazonListing?.fulfillmentType || "FBM",
    };

    // (Audit logs are now created in transaction)

    // Notifications
    // 1. Notify creator if manager/boss changes status
    if (body.status && body.status !== idea.status && session.user.id !== idea.createdById) {
      let type = "";
      let message = "";
      if (body.status === "approved") {
        type = "idea_approved";
        message = `Ý tưởng ${idea.msku} của bạn đã được duyệt.`;
      } else if (body.status === "rejected") {
        type = "idea_rejected";
        message = `Ý tưởng ${idea.msku} của bạn bị từ chối. Lý do: ${body.reviewComment || "Không có"}`;
      } else if (body.status === "revision_requested") {
        type = "idea_revision_requested";
        message = `Ý tưởng ${idea.msku} của bạn cần được chỉnh sửa. Lý do: ${body.reviewComment || "Không có"}`;
      }

      if (type) {
        await db.notification.create({
          data: {
            userId: idea.createdById,
            type,
            category: "general",
            message,
            actionUrl: `/ideas/${idea.id}`
          }
        });
        broadcastNotification([idea.createdById], {
          type,
          message,
          actionUrl: `/ideas/${idea.id}`,
          idea: ideaRow
        });
      }
    }

    // 3. Notify bosses/managers if employee updates idea and needs re-review
    if (updateData.needsReReview || (updateData.status === "reviewing" && idea.status === "revision_requested")) {
      const managersAndBosses = await db.user.findMany({
        where: { role: { in: ["manager", "boss"] }, status: "active" }
      });
      if (managersAndBosses.length > 0) {
        await db.notification.createMany({
          data: managersAndBosses.map(u => ({
            userId: u.id,
            type: "idea_updated",
            category: "general",
            message: `Nhân viên đã cập nhật ý tưởng ${idea.msku} sau khi có yêu cầu chỉnh sửa.`,
            actionUrl: `/ideas/${idea.id}`
          }))
        });
        broadcastNotification(managersAndBosses.map(u => u.id), {
          type: "idea_updated",
          message: `Nhân viên đã cập nhật ý tưởng ${idea.msku} sau khi có yêu cầu chỉnh sửa.`,
          actionUrl: `/ideas/${idea.id}`,
          idea: ideaRow
        });
      }
    }

    // Broadcast globally to sync detail page
    broadcastGlobal({
      type: "idea_detail_updated",
      ideaId: id,
      updatedBy: session.user.fullName,
      updatedById: session.user.id,
      updatedData: ideaRow
    });

    return NextResponse.json(ideaRow);
  } catch (error) {
    console.error("PATCH /api/ideas/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/ideas/[id] - Delete idea
export async function DELETE(
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
        amazonListing: true,
        etsyListing: true,
        productionRequests: true
      }
    });

    if (!idea) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }

    const role = session.user.role;

    // Global check: cannot delete if already in production
    const inProduction =
      idea.amazonListing?.listingStatus === "published" ||
      idea.etsyListing?.listingStatus === "published" ||
      idea.fileStatus === "approved" ||
      !!idea.designFileUrl ||
      idea.productionRequests.length > 0;

    if (inProduction) {
      return NextResponse.json(
        {
          error: "Không thể xoá ý tưởng.",
          details: ["Ý tưởng này đã được duyệt thiết kế, đăng bán hoặc đang trong quá trình sản xuất."],
          action: {
            label: "Xem ý tưởng",
            url: `/ideas/${id}`
          }
        },
        { status: 403 }
      );
    }

    // Role-specific check
    if (role === "employee") {
      if (idea.createdById !== session.user.id) {
        return NextResponse.json(
          {
            error: "Không thể xoá ý tưởng.",
            details: ["Bạn chỉ được phép xoá ý tưởng do chính mình tạo ra."]
          },
          { status: 403 }
        );
      }
    }

    // Boss/Manager can delete without condition, but client handles warnings.
    // Proceed to delete

    await db.$transaction(async (tx) => {
      // Delete child relations
      if (idea.amazonListing) {
        await tx.amazonListing.delete({ where: { ideaId: id } });
      }
      if (idea.etsyListing) {
        await tx.etsyListing.delete({ where: { ideaId: id } });
      }
      // Delete production requests and their steps
      if (idea.productionRequests.length > 0) {
        for (const req of idea.productionRequests) {
          await tx.productionStep.deleteMany({ where: { productionRequestId: req.id } });
        }
        await tx.productionRequest.deleteMany({ where: { ideaId: id } });
      }

      // Delete ShipmentItems referencing this idea (cascades to ShipmentBoxItems)
      await tx.shipmentItem.deleteMany({ where: { ideaId: id } });

      // Delete audit logs associated
      await tx.auditLog.deleteMany({ where: { entityType: "idea", entityId: id } });

      // Finally delete the idea
      await tx.idea.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/ideas/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
