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
    
    if (!entityId) {
      return NextResponse.json({ error: "Missing entityId" }, { status: 400 });
    }

    // Get audit logs for the last update session (we group by changedAt approximately, or just return the latest changes per field)
    // To keep it simple, we return the most recent audit log for each field.
    const logs = await db.auditLog.findMany({
      where: { entityId },
      orderBy: { changedAt: "desc" },
      include: {
        changedBy: { select: { fullName: true } }
      }
    });

    // Group by field to get the latest change for each field that hasn't been reviewed
    // Actually, it's better to just return all of them or the ones from the last batch.
    // For our use case (Manager Review), returning the latest change per field is usually what's needed.
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
