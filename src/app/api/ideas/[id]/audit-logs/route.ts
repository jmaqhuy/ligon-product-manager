import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/ideas/[id]/audit-logs
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Check if idea exists
    const idea = await db.idea.findUnique({ where: { id } });
    if (!idea) {
      return NextResponse.json({ error: "Không tìm thấy ý tưởng" }, { status: 404 });
    }

    const logs = await db.auditLog.findMany({
      where: {
        entityType: "idea",
        entityId: id,
      },
      include: {
        changedBy: {
          select: { id: true, fullName: true, nameAbbreviation: true, role: true },
        },
      },
      orderBy: { changedAt: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("GET /api/ideas/[id]/audit-logs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
