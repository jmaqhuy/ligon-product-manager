import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/orders - List orders with filtering
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");
    const search = searchParams.get("search");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status) where.productionStatus = status;
    if (platform) where.platform = platform;
    if (search) {
      where.OR = [
        { orderId: { contains: search } },
        { sku: { contains: search } },
        { customerName: { contains: search } },
        { trackingNumber: { contains: search } },
      ];
    }

    const orders = await db.order.findMany({
      where,
      include: {
        sellingAccount: { select: { id: true, name: true, platform: true } },
        designer: { select: { id: true, fullName: true } },
        producer: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/orders - Create new order
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      platform, orderId, orderDate, customerName, customerPhone,
      addressLine1, addressLine2, city, state, zipcode, country,
      itemDetail, weight, length, width, height, service,
      quantity, sku, unitPrice, sellingAccountId, customNote,
    } = body;

    if (!platform || !orderId || !customerName || !addressLine1 || !city || !country || !sku || !sellingAccountId) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const order = await db.order.create({
      data: {
        platform,
        orderId,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        customerName,
        customerPhone: customerPhone || null,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state: state || null,
        zipcode: zipcode || null,
        country,
        itemDetail: itemDetail || null,
        weight: weight ? parseFloat(weight) : null,
        length: length ? parseFloat(length) : null,
        width: width ? parseFloat(width) : null,
        height: height ? parseFloat(height) : null,
        service: service || "US Express",
        quantity: quantity || 1,
        sku,
        unitPrice: unitPrice ? parseFloat(unitPrice) : null,
        sellingAccountId,
        customNote: customNote || null,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
