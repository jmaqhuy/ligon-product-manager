import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, type Role } from "@/lib/permissions";

// PATCH /api/selling-accounts/[id]/status
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentRole = session.user.role as Role;
    if (!can(currentRole, "manage_selling_accounts")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!["active", "inactive"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
    }

    const account = await db.sellingAccount.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error("PATCH /api/selling-accounts/[id]/status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
