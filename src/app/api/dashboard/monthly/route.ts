import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/dashboard/monthly - Get monthly stats for charts
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get data for the last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Fetch all relevant records created in the last 6 months
    const [ideas, orders, productions] = await Promise.all([
      db.idea.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, status: true },
      }),
      db.order.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, productionStatus: true },
      }),
      db.productionRequest.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, completedAt: true },
      }),
    ]);

    // Build monthly buckets
    const months: { label: string; ideas: number; orders: number; production: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const label = date.toLocaleDateString("vi-VN", { month: "short", year: "2-digit" });

      const monthIdeas = ideas.filter((r) => {
        const d = new Date(r.createdAt);
        return d.getFullYear() === year && d.getMonth() === month;
      }).length;

      const monthOrders = orders.filter((r) => {
        const d = new Date(r.createdAt);
        return d.getFullYear() === year && d.getMonth() === month;
      }).length;

      const monthProduction = productions.filter((r) => {
        const d = new Date(r.createdAt);
        return d.getFullYear() === year && d.getMonth() === month;
      }).length;

      months.push({
        label,
        ideas: monthIdeas,
        orders: monthOrders,
        production: monthProduction,
      });
    }

    // Status breakdown for current month
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentIdeas = ideas.filter((r) => new Date(r.createdAt) >= currentMonthStart);
    const currentOrders = orders.filter((r) => new Date(r.createdAt) >= currentMonthStart);

    const statusBreakdown = {
      ideas: {
        reviewing: currentIdeas.filter((i) => i.status === "reviewing").length,
        approved: currentIdeas.filter((i) => i.status === "approved").length,
        published: currentIdeas.filter((i) => i.status === "published").length,
      },
      orders: {
        producing: currentOrders.filter((o) => o.productionStatus === "producing").length,
        produced: currentOrders.filter((o) => o.productionStatus === "produced").length,
        fulfilled: currentOrders.filter((o) => ["fulfilled", "ff_amz"].includes(o.productionStatus)).length,
      },
    };

    return NextResponse.json({ months, statusBreakdown });
  } catch (error) {
    console.error("GET /api/dashboard/monthly error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
