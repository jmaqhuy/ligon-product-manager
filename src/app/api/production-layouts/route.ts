import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, type Role } from "@/lib/permissions";
import { createProductionLayoutSchema } from "@/lib/validators";

// GET /api/production-layouts - List production layouts
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status"); // active | archived
    const search = searchParams.get("search");
    const ideaId = searchParams.get("ideaId");
    const materialCode = searchParams.get("materialCode");
    const isVerified = searchParams.get("isVerified");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status) {
      where.status = status;
    } else {
      where.status = "active"; // default: only show active layouts
    }

    if (search) {
      where.code = { contains: search };
    }

    if (materialCode) {
      where.materialCode = materialCode;
    }

    if (isVerified === "true") where.isVerified = true;
    if (isVerified === "false") where.isVerified = false;

    if (ideaId) {
      where.items = { some: { ideaId } };
    }

    const layouts = await db.productionLayout.findMany({
      where,
      include: {
        items: {
          include: {
            idea: { select: { id: true, msku: true, mainImageUrl: true } },
          },
        },
        verifiedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(layouts);
  } catch (error) {
    console.error("GET /api/production-layouts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/production-layouts - Create new production layout
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;
    if (!can(role, "create_production_layout")) {
      return NextResponse.json(
        { error: "Bạn không có quyền tạo layout sản xuất" },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Validate
    const parsed = createProductionLayoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { code: rawCode, name, materialCode, materialWidth, materialLength, dxfFileUrl, pdfFileUrl, items, requestIds } = parsed.data;

    // Auto-generate code if not provided
    const code = rawCode?.trim()
      ? rawCode.trim().toUpperCase()
      : `LAYOUT-${Date.now().toString(36).toUpperCase().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // Validate all ideaIds exist
    const ideaIds = items.map((i) => i.ideaId);
    const existingIdeas = await db.idea.findMany({
      where: { id: { in: ideaIds } },
      select: { id: true },
    });
    if (existingIdeas.length !== ideaIds.length) {
      return NextResponse.json(
        { error: "Một hoặc nhiều SKU không tồn tại" },
        { status: 400 }
      );
    }

    // ===== ATOMIC TRANSACTION: Create layout + auto-resolve requests =====
    const result = await db.$transaction(async (tx) => {
      // 1. Create ProductionLayout + items
      const layout = await tx.productionLayout.create({
        data: {
          code,
          name: name || null,
          materialCode,
          materialWidth,
          materialLength,
          dxfFileUrl,
          pdfFileUrl: pdfFileUrl || null,
          items: {
            create: items.map((item) => ({
              ideaId: item.ideaId,
              quantityPerRun: item.quantityPerRun,
            })),
          },
        },
        include: {
          items: {
            include: {
              idea: { select: { id: true, msku: true } },
            },
          },
        },
      });

      // 2. Audit log
      await tx.auditLog.create({
        data: {
          entityType: "production_layout",
          entityId: layout.id,
          fieldName: "created",
          oldValue: null,
          newValue: layout.code,
          changedById: session.user.id,
        },
      });

      // 3. Zero-click resolve: update linked requests (concurrency-safe)
      const resolvedRequestIds: string[] = [];

      if (requestIds && requestIds.length > 0) {
        const snapshot = JSON.stringify({
          layoutId: layout.id,
          code: layout.code,
          materialCode: layout.materialCode,
          materialWidth: layout.materialWidth,
          materialLength: layout.materialLength,
          dxfFileUrl: layout.dxfFileUrl,
          pdfFileUrl: layout.pdfFileUrl,
          resolvedAt: new Date().toISOString(),
          resolvedBy: session.user.id,
        });

        // updateMany with strict where clause prevents race conditions:
        // only resolves requests that are STILL awaiting_layout AND claimed by this user
        const updateResult = await tx.productionRequest.updateMany({
          where: {
            id: { in: requestIds },
            status: "awaiting_layout",
            layoutAssigneeId: session.user.id,
          },
          data: {
            status: "ready",
            layoutSnapshot: snapshot,
            version: { increment: 1 },
          },
        });

        // Track which ones were actually resolved (may differ from requestIds due to concurrency)
        if (updateResult.count > 0) {
          const actuallyResolved = await tx.productionRequest.findMany({
            where: {
              id: { in: requestIds },
              status: "ready",
              layoutSnapshot: snapshot,
            },
            select: { id: true },
          });
          actuallyResolved.forEach((r) => resolvedRequestIds.push(r.id));
        }

        // Mark related notifications as read
        if (resolvedRequestIds.length > 0) {
          await tx.notification.updateMany({
            where: {
              type: { in: ["layout_requested", "layout_revision_requested"] },
              isCompleted: false,
            },
            data: { isCompleted: true },
          });
        }
      }

      return { layout, resolvedRequestIds };
    });

    return NextResponse.json(
      {
        ...result.layout,
        resolvedRequestIds: result.resolvedRequestIds,
        message:
          result.resolvedRequestIds.length > 0
            ? `Đã giải quyết ${result.resolvedRequestIds.length}/${requestIds?.length || 0} yêu cầu sản xuất`
            : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/production-layouts error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === "P2002") {
      return NextResponse.json(
        { error: "Mã layout đã tồn tại" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
