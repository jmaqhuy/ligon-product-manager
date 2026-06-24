import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { broadcastNotification } from "@/lib/socket-helper";
import { generateMsku, validateMsku } from "@/lib/msku-generator";
import type { Role } from "@/lib/permissions";

// GET /api/ideas - List ideas with filtering
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const tab = searchParams.get("tab") || "reviewing";
    const search = searchParams.get("search") || "";
    const mine = searchParams.get("mine") === "true";
    const topicId = searchParams.get("topicId");
    const month = searchParams.get("month");

    // Build where clause based on tab
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { AND: [] };

    if (mine) {
      where.AND.push({ createdById: session.user.id });
    }

    if (search) {
      where.AND.push({
        OR: [
          { sku: { contains: search } },
          { msku: { contains: search } },
        ],
      });
    }

    if (topicId) {
      where.AND.push({ topicId });
    }

    if (month) {
      const [year, mon] = month.split("-");
      const start = new Date(parseInt(year), parseInt(mon) - 1, 1);
      const end = new Date(parseInt(year), parseInt(mon), 0, 23, 59, 59);
      where.AND.push({
        createdAt: { gte: start, lte: end },
      });
    }

    switch (tab) {
      case "all":
        // No status filter
        break;
      case "reviewing":
        where.AND.push({
          OR: [
            { status: "reviewing" },
            { needsReReview: true },
          ],
        });
        break;
      case "photos":
        where.AND.push({
          status: "approved",
          photoStatus: { in: ["not_requested", "awaiting_photos", "pending_approval", "revision_requested"] }
        });
        break;
      case "ready":
        where.AND.push({
          photoStatus: "approved",
          status: { not: "published" }
        });
        break;
      case "published":
        where.AND.push({ status: "published" });
        break;
      case "rejected":
        where.AND.push({ status: "rejected" });
        break;
    }

    const ideas = await db.idea.findMany({
      where,
      include: {
        createdBy: {
          select: { fullName: true, nameAbbreviation: true },
        },
        topic: {
          select: { name: true },
        },
      },
      orderBy: tab === "reviewing" ? { createdAt: "desc" } : { updatedAt: "desc" },
    });

    const result = ideas.map((idea) => ({
      id: idea.id,
      msku: idea.msku,
      sku: idea.sku,
      mainImageUrl: idea.mainImageUrl,
      status: idea.status,
      photoStatus: idea.photoStatus,
      fulfillmentType: idea.fulfillmentType,
      topicName: idea.topic.name,
      createdByName: idea.createdBy.fullName,
      createdAt: idea.createdAt.toISOString(),
      title: idea.title,
      needsReReview: idea.needsReReview,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/ideas error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/ideas - Create new idea
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      autoGenerateMsku,
      manualMsku,
      topicId,
      aiModelId,
      prompt,
      sourceLinks,
      mainImageUrl,
      fulfillmentType,
      title,
      description,
    } = body;

    // Validate required fields
    if (!topicId || !aiModelId || !prompt || !mainImageUrl) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc (chủ đề, AI model, prompt, ảnh)" },
        { status: 400 }
      );
    }

    // Generate or validate MSKU
    let msku: string;
    if (autoGenerateMsku !== false) {
      msku = await generateMsku(session.user.nameAbbreviation);
    } else {
      if (!manualMsku) {
        return NextResponse.json({ error: "Vui lòng nhập MSKU" }, { status: 400 });
      }
      const validation = await validateMsku(manualMsku);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      msku = manualMsku;
    }

    // Default status - if manager/boss creates, auto-approve
    const role = session.user.role as Role;
    const initialStatus = role === "manager" || role === "boss" ? "approved" : "reviewing";

    const idea = await db.idea.create({
      data: {
        msku,
        sku: msku, // Default SKU = MSKU
        autoGenerateMsku: autoGenerateMsku !== false,
        createdById: session.user.id,
        topicId,
        aiModelId,
        prompt,
        sourceLinks: JSON.stringify(sourceLinks || []),
        mainImageUrl,
        fulfillmentType: fulfillmentType || "FBM",
        status: initialStatus,
        title: title || null,
        description: description || null,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        entityType: "idea",
        entityId: idea.id,
        fieldName: "status",
        oldValue: null,
        newValue: initialStatus,
        changedById: session.user.id,
      },
    });

    // Notify boss/managers if employee created it
    if (role === "employee") {
      const managersAndBosses = await db.user.findMany({
        where: { role: { in: ["manager", "boss"] }, status: "active" }
      });
      if (managersAndBosses.length > 0) {
        await db.notification.createMany({
          data: managersAndBosses.map(u => ({
            userId: u.id,
            type: "new_idea",
            category: "general",
            message: `Nhân viên ${session.user.nameAbbreviation || session.user.fullName || 'ẩn danh'} vừa tạo ý tưởng mới (MSKU: ${msku})`,
            actionUrl: `/ideas/${idea.id}`
          }))
        });

        broadcastNotification(managersAndBosses.map(u => u.id), {
          type: "new_idea",
          message: `Nhân viên ${session.user.nameAbbreviation || session.user.fullName || 'ẩn danh'} vừa tạo ý tưởng mới (MSKU: ${msku})`,
          actionUrl: `/ideas/${idea.id}`
        });
      }
    }

    return NextResponse.json(idea, { status: 201 });
  } catch (error) {
    console.error("POST /api/ideas error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
