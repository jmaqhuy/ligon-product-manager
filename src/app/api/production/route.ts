import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, type Role } from "@/lib/permissions";

// GET /api/production - List production requests
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status"); // pending | in_progress | completed
    const type = searchParams.get("type"); // batch | sample
    const search = searchParams.get("search");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (type) where.type = type;

    if (status === "pending") {
      where.completedAt = null;
      where.steps = { none: { startedAt: { not: null } } };
    } else if (status === "in_progress") {
      where.completedAt = null;
      where.steps = { some: { startedAt: { not: null } } };
    } else if (status === "completed") {
      where.completedAt = { not: null };
    }

    if (search) {
      where.idea = {
        OR: [
          { sku: { contains: search } },
          { msku: { contains: search } },
        ],
      };
    }

    const requests = await db.productionRequest.findMany({
      where,
      include: {
        idea: {
          select: {
            id: true,
            msku: true,
            sku: true,
            mainImageUrl: true,
            title: true,
            fulfillmentType: true,
            productionFileUrl: true,
          },
        },
        steps: {
          orderBy: { sequenceOrder: "asc" },
        },
      },
      orderBy: [
        { priority: "asc" }, // urgent first
        { requestedAt: "desc" },
      ],
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("GET /api/production error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/production - Create production request
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;
    if (!can(role, "create_production_request")) {
      return NextResponse.json({ error: "Bạn không có quyền tạo yêu cầu sản xuất" }, { status: 403 });
    }

    const body = await req.json();
    const { ideaId, type, priority, requestedQty, noteForWorkers, steps } = body;

    if (!ideaId || !requestedQty || requestedQty < 1) {
      return NextResponse.json(
        { error: "Vui lòng chọn ý tưởng và nhập số lượng" },
        { status: 400 }
      );
    }

    // Verify idea exists
    const idea = await db.idea.findUnique({ where: { id: ideaId } });
    if (!idea) {
      return NextResponse.json({ error: "Ý tưởng không tồn tại" }, { status: 404 });
    }

    // Default production steps if not provided
    const defaultSteps = steps || [
      { stepName: "Cắt", sequenceOrder: 1 },
      { stepName: "In", sequenceOrder: 2 },
      { stepName: "Ép", sequenceOrder: 3 },
      { stepName: "Kiểm tra", sequenceOrder: 4 },
    ];

    const request = await db.productionRequest.create({
      data: {
        ideaId,
        type: type || "batch",
        priority: priority || "normal",
        requestedQty,
        noteForWorkers: noteForWorkers || null,
        steps: {
          create: defaultSteps.map((s: { stepName: string; sequenceOrder: number }) => ({
            stepName: s.stepName,
            sequenceOrder: s.sequenceOrder,
          })),
        },
      },
      include: {
        steps: true,
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error("POST /api/production error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
