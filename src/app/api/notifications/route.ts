import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/notifications - List notifications for current user
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get("category");
    const sortBy = searchParams.get("sort") || "newest"; // newest | oldest | priority

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: session.user.id };
    if (category && category !== "all") where.category = category;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any = { createdAt: "desc" };
    if (sortBy === "oldest") orderBy = { createdAt: "asc" };
    if (sortBy === "priority") orderBy = [{ priority: "asc" }, { createdAt: "desc" }]; // urgent first

    const notifications = await db.notification.findMany({
      where,
      orderBy,
      take: 100,
    });

    // Count unread
    const unreadCount = await db.notification.count({
      where: { userId: session.user.id, isRead: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
