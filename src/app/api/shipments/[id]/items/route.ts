import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/shipments/[id]/items — Add items to shipment
export async function POST(
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
    const { items } = body; // Array of { ideaId, totalQty, productionRequestId? }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cần ít nhất một SKU" }, { status: 400 });
    }

    const shipment = await db.shipment.findUnique({ where: { id } });
    if (!shipment) {
      return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });
    }

    if (shipment.status !== "draft" && shipment.status !== "packing") {
      return NextResponse.json(
        { error: "Chỉ có thể thêm SKU khi lô hàng ở trạng thái draft hoặc packing" },
        { status: 400 }
      );
    }

    const created = [];
    for (const item of items) {
      if (!item.ideaId || !item.totalQty || item.totalQty < 1) continue;

      // Check idea exists
      const idea = await db.idea.findUnique({ where: { id: item.ideaId } });
      if (!idea) continue;

      // Check if this idea is already in the shipment
      const existing = await db.shipmentItem.findFirst({
        where: { shipmentId: id, ideaId: item.ideaId },
      });
      if (existing) continue;

      const si = await db.shipmentItem.create({
        data: {
          shipmentId: id,
          ideaId: item.ideaId,
          totalQty: item.totalQty,
          productionRequestId: item.productionRequestId || null,
        },
        include: {
          idea: { select: { id: true, msku: true, amazonListing: { select: { sku: true } } } },
          productionRequest: { select: { id: true, completedAt: true } },
        },
      });
      created.push(si);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/shipments/[id]/items error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
