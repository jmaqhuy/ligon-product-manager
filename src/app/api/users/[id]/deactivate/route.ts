import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, canManageUser, type Role } from "@/lib/permissions";

// PATCH /api/users/[id]/deactivate
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const currentRole = session.user.role as Role;

    // Find target user
    const targetUser = await db.user.findUnique({
      where: { id },
      select: { role: true, status: true, fullName: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Tài khoản không tồn tại" }, { status: 404 });
    }

    // Cannot deactivate yourself
    if (id === session.user.id) {
      return NextResponse.json({ error: "Không thể vô hiệu hoá chính mình" }, { status: 400 });
    }

    // Check permission
    if (!canManageUser(currentRole, targetUser.role as Role)) {
      return NextResponse.json({ error: "Bạn không có quyền vô hiệu hoá tài khoản này" }, { status: 403 });
    }

    await db.user.update({
      where: { id },
      data: { status: "inactive" },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        entityType: "user",
        entityId: id,
        fieldName: "status",
        oldValue: "active",
        newValue: "inactive",
        changedById: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/users/[id]/deactivate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
