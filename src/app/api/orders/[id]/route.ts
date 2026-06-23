import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/orders/[id] - Update order
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

    const order = await db.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Đơn hàng không tồn tại" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { version: { increment: 1 } };

    if (body.productionStatus) updateData.productionStatus = body.productionStatus;
    if (body.trackingNumber !== undefined) updateData.trackingNumber = body.trackingNumber;
    if (body.trackingUploaded !== undefined) updateData.trackingUploaded = body.trackingUploaded;
    if (body.designerId !== undefined) updateData.designerId = body.designerId || null;
    if (body.producerId !== undefined) updateData.producerId = body.producerId || null;
    if (body.orderProductionFileUrl !== undefined) updateData.orderProductionFileUrl = body.orderProductionFileUrl;
    if (body.note !== undefined) updateData.note = body.note;

    const updated = await db.order.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/orders/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
