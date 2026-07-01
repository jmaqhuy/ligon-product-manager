import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, type Role } from "@/lib/permissions";
import { broadcastNotification } from "@/lib/socket-helper";

// PATCH /api/production-layouts/[id]/verify - Verify a layout file
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;
    if (!can(role, "verify_production_layout")) {
      return NextResponse.json(
        { error: "Bạn không có quyền xác minh file layout" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const layout = await db.productionLayout.findUnique({ where: { id } });
    if (!layout) {
      return NextResponse.json(
        { error: "Không tìm thấy layout" },
        { status: 404 }
      );
    }

    const updated = await db.productionLayout.update({
      where: { id },
      data: {
        isVerified: true,
        verifiedById: session.user.id,
      },
    });

    // Notify managers/boss that layout is verified
    const managersAndBosses = await db.user.findMany({
      where: { role: { in: ["manager", "boss"] }, status: "active" },
    });

    if (managersAndBosses.length > 0) {
      await db.notification.createMany({
        data: managersAndBosses.map((u) => ({
          userId: u.id,
          type: "layout_verified",
          category: "production_file",
          message: `Layout ${layout.code} đã được ${session.user.fullName} xác minh.`,
          actionUrl: `/production/layouts`,
          priority: "normal",
        })),
      });

      broadcastNotification(
        managersAndBosses.map((u) => u.id),
        {
          type: "layout_verified",
          message: `Layout ${layout.code} đã được ${session.user.fullName} xác minh.`,
          actionUrl: `/production/layouts`,
        }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/production-layouts/[id]/verify error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
