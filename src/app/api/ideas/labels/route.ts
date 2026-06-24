import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/ideas/labels - Find labels for a list of SKUs
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { skus, quantities } = body; // quantities: Record<ideaId, number>

    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return NextResponse.json({ error: "Vui lòng nhập ít nhất 1 SKU" }, { status: 400 });
    }

    const ideas = await db.idea.findMany({
      where: {
        OR: skus.map((sku: string) => ({
          OR: [
            { sku: { equals: sku } },
            { msku: { equals: sku } },
            { sku: { contains: sku } },
            { msku: { contains: sku } },
          ],
        })),
      },
      include: {
        amazonListing: {
          select: {
            id: true,
            fnskuCode: true,
            fnskuLabelFileUrl: true,
            asin: true,
          },
        },
        createdBy: {
          select: { fullName: true },
        },
      },
      take: 50,
    });

    const results = ideas.map((idea) => ({
      id: idea.id,
      msku: idea.msku,
      sku: idea.sku,
      title: idea.title,
      fulfillmentType: idea.fulfillmentType,
      createdBy: idea.createdBy.fullName,
      fnskuCode: idea.amazonListing?.fnskuCode || null,
      fnskuLabelFileUrl: idea.amazonListing?.fnskuLabelFileUrl || null,
      asin: idea.amazonListing?.asin || null,
      quantity: (quantities && quantities[idea.id]) || 1,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("POST /api/ideas/labels error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
