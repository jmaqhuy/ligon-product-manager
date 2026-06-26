import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/shipments — List all shipments
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { boxes: { some: { amazonShipmentId: { contains: search } } } },
        { boxes: { some: { boxName: { contains: search } } } },
        { boxes: { some: { trackingNumber: { contains: search } } } },
        { amazonAccount: { name: { contains: search } } },
      ];
    }

    const shipments = await db.shipment.findMany({
      where,
      include: {
        amazonAccount: { select: { id: true, name: true, platform: true } },
        items: {
          include: {
            idea: { select: { id: true, msku: true, sku: true, title: true, mainImageUrl: true, fulfillmentType: true } },
            productionRequest: { select: { id: true, completedAt: true } },
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
                shipmentItem: { select: { id: true, idea: { select: { msku: true } } } },
              },
            },
          },
          orderBy: { boxName: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(shipments);
  } catch (error) {
    console.error("GET /api/shipments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/shipments — Create new shipment (draft)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amazonAccountId, plannedShipDate, items } = body;

    if (!amazonAccountId) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc (tài khoản Amazon)" },
        { status: 400 }
      );
    }

    // Validate account is Amazon
    const account = await db.sellingAccount.findUnique({
      where: { id: amazonAccountId },
    });
    if (!account || account.platform !== "amazon") {
      return NextResponse.json(
        { error: "Tài khoản không hợp lệ (cần tài khoản Amazon)" },
        { status: 400 }
      );
    }

    const shipment = await db.shipment.create({
      data: {
        status: "draft",
        plannedShipDate: plannedShipDate ? new Date(plannedShipDate) : new Date(),
        amazonAccountId,
        items: items?.length
          ? {
              create: items.map((item: { ideaId: string; totalQty: number; productionRequestId?: string }) => ({
                ideaId: item.ideaId,
                totalQty: item.totalQty,
                productionRequestId: item.productionRequestId || null,
              })),
            }
          : undefined,
      },
      include: {
        amazonAccount: { select: { id: true, name: true, platform: true } },
        items: {
          include: {
            idea: { select: { id: true, msku: true, sku: true, title: true, mainImageUrl: true } },
          },
        },
      },
    });

    return NextResponse.json(shipment, { status: 201 });
  } catch (error) {
    console.error("POST /api/shipments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
