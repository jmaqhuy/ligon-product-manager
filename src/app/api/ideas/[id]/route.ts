import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
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
        photoAssignee: {
          select: { id: true, fullName: true, nameAbbreviation: true },
        },
        topic: { select: { id: true, name: true } },
        aiModel: { select: { id: true, name: true } },
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
      },
    });

    if (!idea) {
      return NextResponse.json({ error: "Không tìm thấy ý tưởng" }, { status: 404 });
    }

    return NextResponse.json(idea);
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

    // Build update data and audit logs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { version: { increment: 1 } };
    const auditEntries: { field: string; oldVal: string | null; newVal: string | null }[] = [];

    // Status change (approve)
    if (body.status !== undefined && body.status !== idea.status) {
      if (body.status === "approved" && !can(currentRole, "approve_idea")) {
        return NextResponse.json({ error: "Bạn không có quyền duyệt ý tưởng" }, { status: 403 });
      }
      auditEntries.push({ field: "status", oldVal: idea.status, newVal: body.status });
      updateData.status = body.status;
    }

    // Photo status
    if (body.photoStatus !== undefined && body.photoStatus !== idea.photoStatus) {
      auditEntries.push({ field: "photoStatus", oldVal: idea.photoStatus, newVal: body.photoStatus });
      updateData.photoStatus = body.photoStatus;
    }

    // Photo assignee
    if (body.photoAssigneeId !== undefined) {
      auditEntries.push({ field: "photoAssigneeId", oldVal: idea.photoAssigneeId, newVal: body.photoAssigneeId });
      updateData.photoAssigneeId = body.photoAssigneeId;
    }

    // Photo revision note
    if (body.photoRevisionNote !== undefined) {
      updateData.photoRevisionNote = body.photoRevisionNote;
    }

    // File status
    if (body.fileStatus !== undefined && body.fileStatus !== idea.fileStatus) {
      auditEntries.push({ field: "fileStatus", oldVal: idea.fileStatus, newVal: body.fileStatus });
      updateData.fileStatus = body.fileStatus;
    }

    // Fulfillment type
    if (body.fulfillmentType !== undefined && body.fulfillmentType !== idea.fulfillmentType) {
      if (!can(currentRole, "change_fulfillment_type")) {
        return NextResponse.json({ error: "Bạn không có quyền đổi loại fulfillment" }, { status: 403 });
      }
      auditEntries.push({ field: "fulfillmentType", oldVal: idea.fulfillmentType, newVal: body.fulfillmentType });
      updateData.fulfillmentType = body.fulfillmentType;
    }

    // Production file URL
    if (body.productionFileUrl !== undefined) {
      updateData.productionFileUrl = body.productionFileUrl;
    }

    // Title / Description
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.sourceLinks !== undefined) updateData.sourceLinks = body.sourceLinks;

    const updated = await db.idea.update({
      where: { id },
      data: updateData,
    });

    // Create audit logs
    for (const entry of auditEntries) {
      await db.auditLog.create({
        data: {
          entityType: "idea",
          entityId: id,
          fieldName: entry.field,
          oldValue: entry.oldVal,
          newValue: entry.newVal,
          changedById: session.user.id,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/ideas/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
