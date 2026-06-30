import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    const showAll = searchParams.get("all") === "true";
    
    if (!entityId) {
      return NextResponse.json({ error: "Missing entityId" }, { status: 400 });
    }

    // Build where clause: by default, only show unreviewed audit logs (for diff modal)
    // Use ?all=true to get all logs (for full history)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { entityId };
    if (!showAll) {
      where.reviewedAt = null;
    }

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { changedAt: "desc" },
      include: {
        changedBy: { select: { fullName: true } }
      }
    });

    // Group by field to get the latest change for each field
    const latestChanges = new Map();
    for (const log of logs) {
      if (!latestChanges.has(log.fieldName)) {
        latestChanges.set(log.fieldName, log);
      }
    }

    return NextResponse.json(Array.from(latestChanges.values()));
  } catch (error) {
    console.error("GET /api/audit-logs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
