import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, type Role } from "@/lib/permissions";

// POST /api/ideas/batch - Batch operations on ideas
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;
    const body = await req.json();
    const { ids, action } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Vui lòng chọn ít nhất 1 ý tưởng" }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: "Vui lòng chọn hành động" }, { status: 400 });
    }

    const results: { id: string; msku: string; success: boolean; error?: string }[] = [];

    for (const id of ids) {
      try {
        const idea = await db.idea.findUnique({ where: { id } });
        if (!idea) {
          results.push({ id, msku: "?", success: false, error: "Không tìm thấy" });
          continue;
        }

        switch (action) {
          case "approve": {
            if (!can(role, "approve_idea")) {
              results.push({ id, msku: idea.msku, success: false, error: "Không có quyền" });
              continue;
            }
            if (idea.status !== "reviewing" && !idea.needsReReview) {
              results.push({ id, msku: idea.msku, success: false, error: "Không ở trạng thái chờ duyệt" });
              continue;
            }
            await db.idea.update({
              where: { id },
              data: { status: "approved", needsReReview: false, version: { increment: 1 } },
            });
            await db.auditLog.create({
              data: {
                entityType: "idea",
                entityId: id,
                fieldName: "status",
                oldValue: idea.status,
                newValue: "approved",
                changedById: session.user.id,
              },
            });
            results.push({ id, msku: idea.msku, success: true });
            break;
          }

          case "request_photos": {
            if (!can(role, "approve_idea")) {
              results.push({ id, msku: idea.msku, success: false, error: "Không có quyền" });
              continue;
            }
            await db.idea.update({
              where: { id },
              data: { photoStatus: "awaiting_photos", version: { increment: 1 } },
            });
            await db.auditLog.create({
              data: {
                entityType: "idea",
                entityId: id,
                fieldName: "photoStatus",
                oldValue: idea.photoStatus,
                newValue: "awaiting_photos",
                changedById: session.user.id,
              },
            });
            results.push({ id, msku: idea.msku, success: true });
            break;
          }

          case "request_file": {
            if (!can(role, "approve_idea")) {
              results.push({ id, msku: idea.msku, success: false, error: "Không có quyền" });
              continue;
            }
            await db.idea.update({
              where: { id },
              data: { fileStatus: "in_progress", version: { increment: 1 } },
            });
            results.push({ id, msku: idea.msku, success: true });
            break;
          }

          default:
            results.push({ id, msku: idea.msku, success: false, error: "Hành động không hợp lệ" });
        }
      } catch (e) {
        console.error(`Batch error for ${id}:`, e);
        results.push({ id, msku: "?", success: false, error: "Lỗi hệ thống" });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return NextResponse.json({ results, successCount, totalCount: ids.length });
  } catch (error) {
    console.error("POST /api/ideas/batch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
