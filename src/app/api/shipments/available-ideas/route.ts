import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/shipments/available-ideas — Find ideas for shipment creation
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const amazonAccountId = searchParams.get("amazonAccountId") || "";

    // Build where: ideas that are published and have FBA fulfillment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: "published",
      fulfillmentType: "FBA",
    };

    if (search) {
      where.OR = [
        { msku: { contains: search } },
        { sku: { contains: search } },
        { title: { contains: search } },
      ];
    }

    if (amazonAccountId) {
      where.amazonListing = { sellingAccountId: amazonAccountId };
    }

    // Fetch ideas with their Amazon listing, production, and shipment info
    const ideas = await db.idea.findMany({
      where,
      select: {
        id: true,
        msku: true,
        sku: true,
        title: true,
        mainImageUrl: true,
        fulfillmentType: true,
        topic: { select: { name: true } },
        amazonListing: {
          select: {
            id: true,
            asin: true,
            fnskuCode: true,
            sellingAccount: { select: { id: true, name: true } },
          },
        },
        productionRequests: {
          select: {
            id: true,
            completedAt: true,
            requestedQty: true,
            actualQty: true,
            shipped: true,
          },
          orderBy: { completedAt: "desc" },
        },
        shipmentItems: {
          select: {
            id: true,
            totalQty: true,
            shipment: { select: { id: true, status: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    // Transform and filter
    const result = ideas
      .map((idea) => {
        // Determine production status
        const activeProduction = idea.productionRequests.filter((pr) => !pr.completedAt);
        const completedProduction = idea.productionRequests.filter(
          (pr) => pr.completedAt && !pr.shipped
        );
        const shippedProduction = idea.productionRequests.filter((pr) => pr.shipped);
        const latestCompleted = completedProduction[0] || null;

        // Production status tag
        let productionStatus: "waiting" | "producing" | "produced" | "none" = "none";
        if (activeProduction.length > 0) {
          productionStatus = "producing";
        } else if (completedProduction.length > 0) {
          productionStatus = "produced";
        } else if (idea.productionRequests.length === 0) {
          productionStatus = "none";
        } else {
          // All production requests are shipped
          productionStatus = "none"; // treat as none since all shipped
        }

        // Total produced (not shipped) quantity
        const availableQty = completedProduction.reduce(
          (sum, pr) => sum + (pr.actualQty || pr.requestedQty),
          0
        );

        const hasShippedProduction = shippedProduction.length > 0;
        const totalShippedQty = shippedProduction.reduce(
          (sum, pr) => sum + (pr.actualQty || pr.requestedQty),
          0
        );

        // Find active shipment(s) this SKU is already in
        const activeShipments = idea.shipmentItems
          .filter(si => si.shipment && si.shipment.status !== "received")
          .map(si => ({ id: si.shipment!.id, status: si.shipment!.status }));
        const latestShipment = activeShipments[0] || null;

        return {
          id: idea.id,
          msku: idea.msku,
          sku: idea.sku,
          title: idea.title,
          mainImageUrl: idea.mainImageUrl,
          fulfillmentType: idea.fulfillmentType,
          topicName: idea.topic.name,
          asin: idea.amazonListing?.asin || null,
          fnskuCode: idea.amazonListing?.fnskuCode || null,
          sellingAccountId: idea.amazonListing?.sellingAccount?.id || null,
          sellingAccountName: idea.amazonListing?.sellingAccount?.name || null,
          productionStatus,
          availableQty,
          hasShippedProduction,
          totalShippedQty,
          latestProductionRequest: latestCompleted
            ? {
                id: latestCompleted.id,
                completedAt: latestCompleted.completedAt?.toISOString(),
                requestedQty: latestCompleted.requestedQty,
                actualQty: latestCompleted.actualQty,
              }
            : null,
          totalProductionRequests: idea.productionRequests.length,
          hasEverBeenInShipment: idea.shipmentItems.length > 0,
          activeShipment: latestShipment,
          isShipped: hasShippedProduction && availableQty === 0 && activeProduction.length === 0,
        };
      })
      // Include all items — shipped ones will be shown disabled in UI
      .filter((idea) => {
        // Show all: available, producing, none, and shipped
        if (idea.productionStatus === "none" && idea.totalProductionRequests === 0) return true;
        if (idea.availableQty > 0) return true;
        if (idea.productionStatus === "producing") return true;
        if (idea.isShipped) return true; // show shipped but disabled
        return false;
      });

    // Sort: producing first > produced > waiting/none
    const order = { producing: 0, produced: 1, none: 2 };
    result.sort((a, b) => {
      const oa = order[a.productionStatus] ?? 3;
      const ob = order[b.productionStatus] ?? 3;
      if (oa !== ob) return oa - ob;
      return b.availableQty - a.availableQty;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/shipments/available-ideas error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
