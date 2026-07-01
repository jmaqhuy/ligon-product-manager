import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/production/claim-bulk — Batch claim nhiều request cùng lúc
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { requestIds } = body;

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn ít nhất 1 yêu cầu" },
        { status: 400 }
      );
    }

    // Atomic: only claim requests that are still awaiting_layout AND unassigned
    const result = await db.productionRequest.updateMany({
      where: {
        id: { in: requestIds },
        status: "awaiting_layout",
        layoutAssigneeId: null,
      },
      data: {
        layoutAssigneeId: session.user.id,
        version: { increment: 1 },
      },
    });

    // Determine which ones failed (already claimed, cancelled, etc.)
    const successfullyClaimed = await db.productionRequest.findMany({
      where: {
        id: { in: requestIds },
        layoutAssigneeId: session.user.id,
        status: "awaiting_layout",
      },
      select: { id: true },
    });

    const claimedIds = successfullyClaimed.map((r) => r.id);
    const failedIds = requestIds.filter((id) => !claimedIds.includes(id));

    return NextResponse.json({
      claimed: result.count,
      total: requestIds.length,
      claimedIds,
      failedIds,
      message:
        result.count > 0
          ? `Đã nhận ${result.count}/${requestIds.length} việc`
          : "Không thể nhận việc nào — có thể đã bị người khác nhận trước hoặc không còn ở trạng thái chờ",
    });
  } catch (error) {
    console.error("PATCH /api/production/claim-bulk error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
