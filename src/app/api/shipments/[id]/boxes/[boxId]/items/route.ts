import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/shipments/[id]/boxes/[boxId]/items — Set box items (replace all)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; boxId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, boxId } = await params;
    const body = await req.json();
    const { items } = body; // [{ shipmentItemId, qtyPerBox }]

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Thiếu danh sách items" }, { status: 400 });
    }

    const shipment = await db.shipment.findUnique({ where: { id } });
    if (!shipment) {
      return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });
    }

    if (shipment.status !== "draft" && shipment.status !== "packing") {
      return NextResponse.json(
        { error: "Chỉ có thể thay đổi khi lô hàng ở trạng thái draft hoặc packing" },
        { status: 400 }
      );
    }

    // Delete existing box items
    await db.shipmentBoxItem.deleteMany({ where: { shipmentBoxId: boxId } });

    // Create new box items
    const created = [];
    for (const item of items) {
      if (!item.shipmentItemId || (item.qtyPerBox || 0) <= 0) continue;
      const boxItem = await db.shipmentBoxItem.create({
        data: {
          shipmentBoxId: boxId,
          shipmentItemId: item.shipmentItemId,
          qtyPerBox: item.qtyPerBox,
        },
      });
      created.push(boxItem);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/shipments/[id]/boxes/[boxId]/items error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
