import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/production/[id] - Update production request (complete, update qty, etc.)
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

    const request = await db.productionRequest.findUnique({
      where: { id },
      include: { steps: true },
    });

    if (!request) {
      return NextResponse.json({ error: "Yêu cầu sản xuất không tồn tại" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    // Mark as completed
    if (body.completed === true && !request.completedAt) {
      updateData.completedAt = new Date();
      updateData.actualQty = body.actualQty || request.requestedQty;
    }

    // Update priority
    if (body.priority) updateData.priority = body.priority;

    // Update note
    if (body.noteForWorkers !== undefined) updateData.noteForWorkers = body.noteForWorkers;

    if (Object.keys(updateData).length > 0) {
      updateData.version = { increment: 1 };
    }

    const updated = await db.productionRequest.update({
      where: { id },
      data: updateData,
      include: { steps: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/production/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
