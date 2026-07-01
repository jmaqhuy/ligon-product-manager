import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, type Role } from "@/lib/permissions";

// GET /api/production-layouts/[id] - Get single layout
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

    const layout = await db.productionLayout.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            idea: {
              select: {
                id: true,
                msku: true,
                mainImageUrl: true,
                widthCm: true,
                heightCm: true,
                thicknessMm: true,
                material: true,
              },
            },
          },
        },
        verifiedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!layout) {
      return NextResponse.json(
        { error: "Không tìm thấy layout" },
        { status: 404 }
      );
    }

    return NextResponse.json(layout);
  } catch (error) {
    console.error("GET /api/production-layouts/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/production-layouts/[id] - Update layout
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
    if (!can(role, "manage_production_layouts")) {
      return NextResponse.json(
        { error: "Bạn không có quyền sửa layout sản xuất" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const layout = await db.productionLayout.findUnique({ where: { id } });
    if (!layout) {
      return NextResponse.json(
        { error: "Không tìm thấy layout" },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.materialCode !== undefined) updateData.materialCode = body.materialCode;
    if (body.materialWidth !== undefined) updateData.materialWidth = body.materialWidth;
    if (body.materialLength !== undefined) updateData.materialLength = body.materialLength;
    if (body.dxfFileUrl !== undefined) updateData.dxfFileUrl = body.dxfFileUrl;
    if (body.pdfFileUrl !== undefined) updateData.pdfFileUrl = body.pdfFileUrl;

    // When layout is edited, reset verification
    const hasFileChange =
      body.dxfFileUrl !== undefined || body.pdfFileUrl !== undefined;
    if (hasFileChange && layout.isVerified) {
      updateData.isVerified = false;
      updateData.verifiedById = null;
    }

    // Update items: delete all old, create new
    if (body.items && Array.isArray(body.items)) {
      await db.productionLayoutItem.deleteMany({
        where: { productionLayoutId: id },
      });

      if (body.items.length > 0) {
        await db.productionLayoutItem.createMany({
          data: body.items.map(
            (item: { ideaId: string; quantityPerRun: number }) => ({
              productionLayoutId: id,
              ideaId: item.ideaId,
              quantityPerRun: item.quantityPerRun,
            })
          ),
        });
      }
    }

    const updated = await db.productionLayout.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            idea: { select: { id: true, msku: true } },
          },
        },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        entityType: "production_layout",
        entityId: id,
        fieldName: "updated",
        oldValue: layout.code,
        newValue: updated.code,
        changedById: session.user.id,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/production-layouts/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/production-layouts/[id] - Archive layout (boss only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;
    if (role !== "boss") {
      return NextResponse.json(
        { error: "Chỉ Sếp mới có quyền xóa layout" },
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

    // Soft archive — không hard delete
    const archived = await db.productionLayout.update({
      where: { id },
      data: { status: "archived" },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        entityType: "production_layout",
        entityId: id,
        fieldName: "status",
        oldValue: "active",
        newValue: "archived",
        changedById: session.user.id,
      },
    });

    return NextResponse.json(archived);
  } catch (error) {
    console.error("DELETE /api/production-layouts/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
