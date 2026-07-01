import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/ideas/draft - Lấy bản nháp của user hiện tại
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const draft = await db.ideaDraft.findUnique({
      where: { userId: session.user.id },
    });

    if (!draft) {
      return NextResponse.json({ data: null }, { status: 200 });
    }

    return NextResponse.json({ data: JSON.parse(draft.data), updatedAt: draft.updatedAt }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/ideas/draft error:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}

// POST /api/ideas/draft - Upsert bản nháp cho user hiện tại
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const draft = await db.ideaDraft.upsert({
      where: { userId: session.user.id },
      update: { data: JSON.stringify(body) },
      create: { userId: session.user.id, data: JSON.stringify(body) },
    });

    return NextResponse.json({ success: true, updatedAt: draft.updatedAt }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/ideas/draft error:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}

// DELETE /api/ideas/draft - Xóa bản nháp
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.ideaDraft.delete({
      where: { userId: session.user.id },
    }).catch(() => {
      // Ignore if it doesn't exist
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/ideas/draft error:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}
