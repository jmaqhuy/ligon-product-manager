import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/workers - List active workers
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workers = await db.worker.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(workers);
  } catch (error) {
    console.error("GET /api/workers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
