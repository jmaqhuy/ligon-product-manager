import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/notifications/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
