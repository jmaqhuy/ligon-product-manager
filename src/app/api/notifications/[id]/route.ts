import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { activateAwaitingRequests } from "@/lib/layout-auto-activator";

// PATCH /api/notifications/[id] - Mark notification as read/completed
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
    const body = await req.json();

    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Thông báo không tồn tại" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (body.isRead !== undefined) updateData.isRead = body.isRead;
    if (body.isCompleted !== undefined) updateData.isCompleted = body.isCompleted;

    const updated = await db.notification.update({
      where: { id },
      data: updateData,
    });

    // Auto-trigger: when a layout_requested notification is completed,
    // activate all awaiting_layout production requests for the related SKUs
    if (
      body.isCompleted === true &&
      !notification.isCompleted &&
      (notification.type === "layout_requested" ||
        notification.type === "layout_revision_requested")
    ) {
      // Extract ideaIds from the notification message or find related layouts
      try {
        // Find all active layouts to check which SKUs are now available
        const activeLayouts = await db.productionLayout.findMany({
          where: { status: "active" },
          include: {
            items: { select: { ideaId: true } },
          },
        });

        const availableIdeaIds = [
          ...new Set(activeLayouts.flatMap((l) => l.items.map((i) => i.ideaId))),
        ];

        if (availableIdeaIds.length > 0) {
          const activated = await activateAwaitingRequests(availableIdeaIds);
          if (activated > 0) {
            console.log(
              `Auto-activator: ${activated} production request(s) moved from awaiting_layout to ready`
            );
          }
        }
      } catch (err) {
        console.error("Auto-trigger failed for notification", id, err);
        // Don't fail the request — auto-trigger is best-effort
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/notifications/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
