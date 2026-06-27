import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/shipments/[id]/items/[itemId] — Update item qty
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, itemId } = await params;
    const body = await req.json();

    const shipment = await db.shipment.findUnique({ where: { id } });
    if (!shipment) {
      return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });
    }

    if (shipment.status !== "draft" && shipment.status !== "packing") {
      return NextResponse.json(
        { error: "Chỉ có thể sửa SKU khi lô hàng ở trạng thái draft hoặc packing" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (body.totalQty !== undefined) data.totalQty = body.totalQty;
    if (body.productionRequestId !== undefined) data.productionRequestId = body.productionRequestId;

    const updated = await db.shipmentItem.update({
      where: { id: itemId },
      data,
      include: {
        idea: { select: { id: true, msku: true, amazonListing: { select: { sku: true } } } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/shipments/[id]/items/[itemId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/shipments/[id]/items/[itemId] — Remove item from shipment
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, itemId } = await params;

    const shipment = await db.shipment.findUnique({ where: { id } });
    if (!shipment) {
      return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });
    }

    if (shipment.status !== "draft" && shipment.status !== "packing") {
      return NextResponse.json(
        { error: "Chỉ có thể xoá SKU khi lô hàng ở trạng thái draft hoặc packing" },
        { status: 400 }
      );
    }

    await db.shipmentItem.delete({ where: { id: itemId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/shipments/[id]/items/[itemId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
