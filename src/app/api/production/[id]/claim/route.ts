import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/production/[id]/claim - Claim a layout task (race-condition safe)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: requestId } = await params;
    const body = await req.json();
    const { assigneeId } = body;

    // Only allow claiming for yourself
    if (assigneeId !== session.user.id) {
      return NextResponse.json(
        { error: "Bạn chỉ có thể nhận việc cho chính mình" },
        { status: 403 }
      );
    }

    // Atomically claim: only update if layoutAssigneeId is still null
    // This prevents race condition where 2 employees click "Nhận việc" at the same time
    const result = await db.productionRequest.updateMany({
      where: {
        id: requestId,
        status: "awaiting_layout",
        layoutAssigneeId: null,
      },
      data: {
        layoutAssigneeId: assigneeId,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      // Either not found, not awaiting_layout, or already claimed
      const existing = await db.productionRequest.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          status: true,
          layoutAssigneeId: true,
          layoutAssignee: { select: { fullName: true } },
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Yêu cầu sản xuất không tồn tại" },
          { status: 404 }
        );
      }

      if (existing.status !== "awaiting_layout") {
        return NextResponse.json(
          { error: "Yêu cầu này không ở trạng thái chờ layout" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: `Yêu cầu đã được nhận bởi ${existing.layoutAssignee?.fullName || "người khác"}`,
          claimedBy: existing.layoutAssigneeId,
        },
        { status: 409 }
      );
    }

    // Fetch the updated record with relations
    const updated = await db.productionRequest.findUnique({
      where: { id: requestId },
      include: {
        idea: {
          select: {
            id: true,
            msku: true,
            amazonListing: { select: { sku: true, fulfillmentType: true, itemName: true } },
            mainImageUrl: true,
          },
        },
        layoutAssignee: { select: { id: true, fullName: true, nameAbbreviation: true } },
        steps: { orderBy: { sequenceOrder: "asc" } },
      },
    });

    // Mark related notifications as read
    await db.notification.updateMany({
      where: {
        type: "layout_requested",
        isCompleted: false,
        actionUrl: { contains: requestId },
      },
      data: { isCompleted: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/production/[id]/claim error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
