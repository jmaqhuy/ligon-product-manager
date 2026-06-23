import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/shipments - List shipment boxes
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (search) {
      where.OR = [
        { shipmentId: { contains: search } },
        { boxName: { contains: search } },
        { trackingNumber: { contains: search } },
      ];
    }

    const boxes = await db.shipmentBox.findMany({
      where,
      include: {
        amazonAccount: { select: { id: true, name: true } },
        items: {
          include: {
            idea: { select: { id: true, msku: true, sku: true, title: true } },
          },
        },
      },
      orderBy: { shipDate: "desc" },
      take: 100,
    });

    return NextResponse.json(boxes);
  } catch (error) {
    console.error("GET /api/shipments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/shipments - Create shipment box
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      shipDate, amazonAccountId, shipmentId, boxName,
      warehouseCode, labelFileUrl, shipLine,
      lengthCm, widthCm, heightCm, weightKg, trackingNumber,
    } = body;

    if (!shipDate || !amazonAccountId || !shipmentId || !boxName || !warehouseCode) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const box = await db.shipmentBox.create({
      data: {
        shipDate: new Date(shipDate),
        amazonAccountId,
        shipmentId,
        boxName,
        warehouseCode,
        labelFileUrl: labelFileUrl || null,
        shipLine: shipLine || null,
        lengthCm: lengthCm ? parseFloat(lengthCm) : null,
        widthCm: widthCm ? parseFloat(widthCm) : null,
        heightCm: heightCm ? parseFloat(heightCm) : null,
        weightKg: weightKg ? parseFloat(weightKg) : null,
        trackingNumber: trackingNumber || null,
      },
    });

    return NextResponse.json(box, { status: 201 });
  } catch (error) {
    console.error("POST /api/shipments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
