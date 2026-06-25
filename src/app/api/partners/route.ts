import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/partners - List all partners
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partners = await db.partner.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(partners);
  } catch (error) {
    console.error("GET /api/partners error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/partners - Create a new partner
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "manager" && session.user.role !== "boss")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone, address, googleSheetUrl } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Tên đối tác không được để trống" }, { status: 400 });
    }

    const existing = await db.partner.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json({ error: "Tên đối tác đã tồn tại" }, { status: 400 });
    }

    const partner = await db.partner.create({
      data: {
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        address: address || null,
        googleSheetUrl: googleSheetUrl || null,
      },
    });

    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    console.error("POST /api/partners error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "manager" && session.user.role !== "boss")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, email, phone, address, googleSheetUrl } = body;

    if (!id || !name?.trim()) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const partner = await db.partner.update({
      where: { id },
      data: {
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        address: address || null,
        googleSheetUrl: googleSheetUrl || null,
      },
    });

    return NextResponse.json(partner);
  } catch (error) {
    console.error("PATCH /api/partners error:", error);
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

    const count = await db.idea.count({ where: { partnerId: id } });
    if (count > 0) return NextResponse.json({ error: "Không thể xoá đối tác đang có ý tưởng" }, { status: 400 });

    await db.partner.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/partners error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
