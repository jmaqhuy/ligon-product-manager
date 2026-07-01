import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { broadcastNotification } from "@/lib/socket-helper";
import { createProductionLayoutRequestSchema } from "@/lib/validators";

// POST /api/production-layouts/request - Create layout request notification
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "manager" && role !== "boss" && role !== "worker") {
      return NextResponse.json(
        { error: "Bạn không có quyền thực hiện hành động này" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const parsed = createProductionLayoutRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { type, layoutId, ideaIds, materialCode, reason, note } = parsed.data;

    // For revision requests: reset verification on the layout
    if (type === "layout_revision_requested" && layoutId) {
      await db.productionLayout.update({
        where: { id: layoutId },
        data: { isVerified: false, verifiedById: null },
      });
    }

    // Find all active employees (design team)
    const designers = await db.user.findMany({
      where: { role: "employee", status: "active" },
      select: { id: true },
    });

    if (designers.length === 0) {
      return NextResponse.json(
        { error: "Không có nhân viên thiết kế nào đang hoạt động" },
        { status: 400 }
      );
    }

    // Build message
    const ideaMskus = await db.idea.findMany({
      where: { id: { in: ideaIds } },
      select: { msku: true },
    });
    const skuList = ideaMskus.map((i) => i.msku).join(", ");

    let message = "";
    if (type === "layout_requested") {
      message = `Yêu cầu làm file layout mới cho SKU: ${skuList}`;
      if (materialCode) message += ` — Vật liệu: ${materialCode}`;
      if (note) message += ` — Ghi chú: ${note}`;
    } else {
      message = `Yêu cầu sửa file layout cho SKU: ${skuList}`;
      if (reason) message += ` — Lý do: ${reason}`;
      if (note) message += ` — Ghi chú: ${note}`;
    }

    const actionUrl =
      type === "layout_revision_requested" && layoutId
        ? `/production/layouts`
        : `/my-tasks`;

    // Create notifications for all designers
    const notifications = await Promise.all(
      designers.map((d) =>
        db.notification.create({
          data: {
            userId: d.id,
            type,
            category: "production_file",
            priority: "urgent",
            message,
            actionUrl,
          },
        })
      )
    );

    // Broadcast via Socket.io
    broadcastNotification(
      designers.map((d) => d.id),
      {
        type,
        message,
        actionUrl,
      }
    );

    return NextResponse.json(
      { success: true, count: notifications.length },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/production-layouts/request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
