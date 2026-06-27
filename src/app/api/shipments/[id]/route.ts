import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/shipments/[id] — Shipment detail
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const shipment = await db.shipment.findUnique({
      where: { id },
      include: {
        amazonAccount: { select: { id: true, name: true, platform: true } },
        items: {
          include: {
            idea: { select: { id: true, msku: true, mainImageUrl: true, amazonListing: { select: { sku: true, asin: true, fnskuCode: true, fnskuLabelFileUrl: true } } } },
            productionRequest: { select: { id: true, completedAt: true, requestedQty: true } },
            boxItems: {
              include: {
                shipmentBox: { select: { id: true, boxName: true } },
              },
            },
          },
        },
        boxes: {
          include: {
            items: {
              include: {
                shipmentItem: { select: { id: true, totalQty: true, idea: { select: { msku: true, mainImageUrl: true, amazonListing: { select: { sku: true, asin: true, fnskuCode: true } } } } } },
              },
            },
          },
          orderBy: { boxName: "asc" },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });
    }

    return NextResponse.json(shipment);
  } catch (error) {
    console.error("GET /api/shipments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/shipments/[id] — Update shipment status, dates
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

    const shipment = await db.shipment.findUnique({ where: { id } });
    if (!shipment) {
      return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (body.status !== undefined) {
      const validStatuses = ["draft", "packing", "ready", "in_transit", "received"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
      }
      data.status = body.status;
    }

    if (body.plannedShipDate !== undefined) {
      data.plannedShipDate = new Date(body.plannedShipDate);
    }

    if (body.actualShipDate !== undefined) {
      data.actualShipDate = body.actualShipDate ? new Date(body.actualShipDate) : null;
    }

    if (body.shipLine !== undefined) {
      data.shipLine = body.shipLine || null;
    }

    const updated = await db.shipment.update({
      where: { id },
      data,
      include: {
        amazonAccount: { select: { id: true, name: true } },
        items: {
          include: {
            idea: { select: { id: true, msku: true, amazonListing: { select: { sku: true, asin: true, fnskuCode: true, fnskuLabelFileUrl: true } } } },
          },
        },
        boxes: {
          include: {
            items: {
              include: {
                shipmentItem: { select: { id: true, totalQty: true, idea: { select: { msku: true, mainImageUrl: true, amazonListing: { select: { sku: true, asin: true, fnskuCode: true } } } } } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/shipments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/shipments/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const shipment = await db.shipment.findUnique({ where: { id } });
    if (!shipment) {
      return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });
    }

    // Only allow delete for draft shipments
    if (shipment.status !== "draft" && shipment.status !== "packing") {
      return NextResponse.json(
        { error: "Chỉ có thể xoá lô hàng ở trạng thái draft hoặc packing" },
        { status: 400 }
      );
    }

    await db.shipment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/shipments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
