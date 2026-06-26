import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/shipments/[id]/boxes/[boxId] — Update box details
export async function PATCH(
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    const fields = [
      "boxName", "amazonShipmentId", "warehouseCode",
      "lengthCm", "widthCm", "heightCm", "weightKg",
      "labelFileUrl", "trackingNumber",
    ];

    for (const field of fields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    const updated = await db.shipmentBox.update({
      where: { id: boxId },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/shipments/[id]/boxes/[boxId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/shipments/[id]/boxes/[boxId] — Remove a box
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; boxId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { boxId } = await params;

    const shipment = await db.shipment.findUnique({ where: { id } });
    if (!shipment) {
      return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });
    }

    if (shipment.status !== "draft" && shipment.status !== "packing") {
      return NextResponse.json(
        { error: "Chỉ có thể xoá thùng khi lô hàng ở trạng thái draft hoặc packing" },
        { status: 400 }
      );
    }

    await db.shipmentBox.delete({ where: { id: boxId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/shipments/[id]/boxes/[boxId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
