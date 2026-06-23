import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, type Role } from "@/lib/permissions";

// GET /api/selling-accounts
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await db.sellingAccount.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        platform: true,
        name: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("GET /api/selling-accounts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/selling-accounts
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentRole = session.user.role as Role;
    if (!can(currentRole, "manage_selling_accounts")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { platform, name } = body;

    if (!platform || !name) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    if (!["amazon", "etsy"].includes(platform)) {
      return NextResponse.json({ error: "Sàn không hợp lệ" }, { status: 400 });
    }

    const account = await db.sellingAccount.create({
      data: {
        platform,
        name,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("POST /api/selling-accounts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
