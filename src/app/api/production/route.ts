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
    const status = searchParams.get("status"); // pending | in_progress | completed | awaiting_layout
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
    } else if (status === "awaiting_layout") {
      where.status = "awaiting_layout";
    }

    if (search) {
      where.idea = {
        OR: [
          { msku: { contains: search } },
          { amazonListing: { sku: { contains: search } } },
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
            amazonListing: { select: { sku: true, fulfillmentType: true, itemName: true, description: true } },
            mainImageUrl: true,
            designFileUrl: true,
            widthCm: true,
            heightCm: true,
            thicknessMm: true,
            material: true,
          },
        },
        steps: {
          orderBy: { sequenceOrder: "asc" },
        },
        layoutAssignee: {
          select: { id: true, fullName: true, nameAbbreviation: true },
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

// POST /api/production - Create production request(s)
// Supports single mode: { ideaId, type, priority, requestedQty, ... }
// Supports batch mode:  { requests: [{ ideaId, type, priority, requestedQty, ... }, ...] }
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

    // ─── Batch mode ───
    if (body.requests && Array.isArray(body.requests) && body.requests.length > 0) {
      return handleBatchCreate(body.requests, body.awaitingLayout, body.designerNote, session.user.id);
    }

    // ─── Single mode (backward compatible) ───
    const { ideaId, type, priority, requestedQty, noteForWorkers, steps, awaitingLayout, designerNote, layoutPlan } = body;

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

    // Determine status
    let requestStatus = "ready";
    let layoutSnapshot: string | null = null;

    if (awaitingLayout) {
      requestStatus = "awaiting_layout";
    } else if (layoutPlan) {
      layoutSnapshot = JSON.stringify(layoutPlan);
    }

    // Default production steps if not provided
    const defaultSteps = steps || [
      { stepName: "Cắt", sequenceOrder: 1 },
      { stepName: "In", sequenceOrder: 2 },
      { stepName: "Ép", sequenceOrder: 3 },
      { stepName: "Kiểm tra", sequenceOrder: 4 },
    ];

    // Build note for workers
    let finalNote = noteForWorkers || null;
    if (awaitingLayout && designerNote) {
      finalNote = `[Đang chờ file layout] ${designerNote}`;
    }

    const request = await db.productionRequest.create({
      data: {
        ideaId,
        type: type || "batch",
        priority: priority || "normal",
        requestedQty,
        noteForWorkers: finalNote,
        status: requestStatus,
        layoutSnapshot,
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

    // If awaiting layout, auto-create notification for designers
    if (awaitingLayout) {
      await notifyDesigners([{ msku: idea.msku }], designerNote);
    }

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error("POST /api/production error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── Batch create helper ────────────────────────────────────────────
async function handleBatchCreate(
  requests: Array<{
    ideaId: string;
    type?: string;
    priority?: string;
    requestedQty: number;
    noteForWorkers?: string;
  }>,
  awaitingLayout: boolean,
  designerNote: string | undefined,
  userId: string
) {
  // Validate all ideaIds exist
  const ideaIds = [...new Set(requests.map((r) => r.ideaId))];
  const ideas = await db.idea.findMany({
    where: { id: { in: ideaIds } },
    select: { id: true, msku: true },
  });
  const ideaMap = new Map(ideas.map((i) => [i.id, i]));

  const missingIds = ideaIds.filter((id) => !ideaMap.has(id));
  if (missingIds.length > 0) {
    return NextResponse.json(
      { error: `Ý tưởng không tồn tại: ${missingIds.slice(0, 3).join(", ")}` },
      { status: 400 }
    );
  }

  const status = awaitingLayout ? "awaiting_layout" : "ready";

  const created = await db.productionRequest.createMany({
    data: requests.map((r) => ({
      ideaId: r.ideaId,
      type: r.type || "batch",
      priority: r.priority || "normal",
      requestedQty: r.requestedQty,
      noteForWorkers: r.noteForWorkers || null,
      status,
    })),
  });

  // Notify designers if awaiting layout
  if (awaitingLayout) {
    const mskus = requests.map((r) => {
      const idea = ideaMap.get(r.ideaId);
      return { msku: idea?.msku || r.ideaId.slice(0, 8) };
    });
    await notifyDesigners(mskus, designerNote);
  }

  return NextResponse.json(
    { count: created.count, message: `Đã tạo ${created.count} lệnh sản xuất` },
    { status: 201 }
  );
}

// ─── Shared helper: notify designers ────────────────────────────────
async function notifyDesigners(
  ideas: Array<{ msku: string }>,
  designerNote?: string
) {
  const designers = await db.user.findMany({
    where: { role: "employee", status: "active" },
    select: { id: true },
  });

  if (designers.length === 0) return;

  const skuList = ideas.map((i) => i.msku).join(", ");
  const message = designerNote
    ? `Yêu cầu làm file layout mới cho SKU: ${skuList} — Ghi chú: ${designerNote}`
    : `Yêu cầu làm file layout mới cho SKU: ${skuList}`;

  await db.notification.createMany({
    data: designers.map((d) => ({
      userId: d.id,
      type: "layout_requested",
      category: "production_file",
      priority: "urgent",
      message,
      actionUrl: "/my-tasks",
    })),
  });

  // Broadcast via Socket.io
  const { broadcastNotification } = await import("@/lib/socket-helper");
  broadcastNotification(
    designers.map((d) => d.id),
    {
      type: "layout_requested",
      message,
      actionUrl: "/my-tasks",
    }
  );
}
