import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const models = await db.aiModel.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return NextResponse.json(models);
  } catch (error) {
    console.error("GET /api/ai-models error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
