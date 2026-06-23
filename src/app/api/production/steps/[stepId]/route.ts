import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/production/steps/[stepId] - Update a production step (start/finish)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ stepId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { stepId } = await params;
    const body = await req.json();

    const step = await db.productionStep.findUnique({
      where: { id: stepId },
    });

    if (!step) {
      return NextResponse.json({ error: "Bước sản xuất không tồn tại" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    // Start step
    if (body.action === "start") {
      if (step.startedAt) {
        return NextResponse.json({ error: "Bước này đã bắt đầu" }, { status: 400 });
      }
      updateData.startedAt = new Date();
      updateData.performedBy = body.workerName || session.user.fullName;
    }

    // Finish step
    if (body.action === "finish") {
      if (!step.startedAt) {
        return NextResponse.json({ error: "Bước này chưa bắt đầu" }, { status: 400 });
      }
      if (step.finishedAt) {
        return NextResponse.json({ error: "Bước này đã hoàn thành" }, { status: 400 });
      }
      updateData.finishedAt = new Date();
      if (body.workerName) updateData.performedBy = body.workerName;
    }

    const updated = await db.productionStep.update({
      where: { id: stepId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/production/steps/[stepId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
