import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const topics = await db.productTopic.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return NextResponse.json(topics);
  } catch (error) {
    console.error("GET /api/topics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "manager" && session.user.role !== "boss")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Tên chủ đề không được để trống" }, { status: 400 });

    const topic = await db.productTopic.create({
      data: { name: name.trim() },
    });

    return NextResponse.json(topic);
  } catch (error) {
    console.error("POST /api/topics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "manager" && session.user.role !== "boss")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name } = await req.json();
    if (!id || !name?.trim()) return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });

    const topic = await db.productTopic.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json(topic);
  } catch (error) {
    console.error("PATCH /api/topics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "manager" && session.user.role !== "boss")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

    // Check if it's used
    const count = await db.idea.count({ where: { topicId: id } });
    if (count > 0) return NextResponse.json({ error: "Không thể xoá chủ đề đang có ý tưởng" }, { status: 400 });

    await db.productTopic.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/topics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
