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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

    // Build where clause based on tab
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { AND: [] };

    if (mine) {
      where.AND.push({ createdById: session.user.id });
    }

    if (search) {
      const terms = search.split(/[\n,;]+/).map((s: string) => s.trim()).filter(Boolean);
      if (terms.length > 0) {
        where.AND.push({
          OR: terms.flatMap((term: string) => [
            { sku: { contains: term } },
            { msku: { contains: term } },
            { amazonListing: { fnskuCode: { contains: term } } },
          ]),
        });
      }
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
      default:
        return NextResponse.json(
          { error: `Invalid tab: "${tab}". Valid values: all, reviewing, photos, ready, published, rejected` },
          { status: 400 }
        );
    }

    const [ideas, total] = await Promise.all([
      db.idea.findMany({
        where,
        include: {
          createdBy: { select: { fullName: true, nameAbbreviation: true } },
          topic: { select: { name: true } },
          partner: { select: { name: true } },
        },
        orderBy: tab === "reviewing" ? { createdAt: "desc" } : { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.idea.count({ where }),
    ]);

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
      source: idea.source,
      partnerName: idea.partner?.name,
    }));

    return NextResponse.json({
      data: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
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
      source,
      partnerId,
      partnerLabel,
      widthCm,
      heightCm,
      thicknessMm,
      material,
      bulletPoints,
      tags,
      slugs,
    } = body;

    // Determine source: explicit > role-based > default
    const role = session.user.role as Role;
    const ideaSource = source || (role === "manager" || role === "boss" ? "boss" : "employee");

    // Partner ideas: partnerId is required
    if (ideaSource === "partner" && !partnerId) {
      return NextResponse.json(
        { error: "Vui lòng chọn đối tác" },
        { status: 400 }
      );
    }

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
    const initialStatus = role === "manager" || role === "boss" ? "approved" : "reviewing";

    // Partner ideas skip directly to approved (no review needed)
    const finalStatus = ideaSource === "partner" ? "approved" : initialStatus;

    const idea = await db.idea.create({
      data: {
        msku,
        sku: msku, // Default SKU = MSKU
        autoGenerateMsku: autoGenerateMsku !== false,
        createdBy: { connect: { id: session.user.id } },
        topic: { connect: { id: topicId } },
        aiModel: { connect: { id: aiModelId } },
        prompt,
        sourceLinks: JSON.stringify(sourceLinks || []),
        mainImageUrl,
        fulfillmentType: fulfillmentType || "FBM",
        status: finalStatus,
        title: title || null,
        description: description || null,
        source: ideaSource,
        ...(ideaSource === "partner" && partnerId ? { partner: { connect: { id: partnerId } } } : {}),
        partnerLabel: partnerLabel || null,
        widthCm: widthCm || null,
        heightCm: heightCm || null,
        thicknessMm: thicknessMm || null,
        material: material || null,
        amazonListing: {
          create: {
            bulletPoints: bulletPoints ? JSON.stringify(bulletPoints) : JSON.stringify([]),
            tags: tags || null,
            slugs: slugs || null,
          }
        },
        etsyListing: {
          create: {}
        }
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        entityType: "idea",
        entityId: idea.id,
        fieldName: "status",
        oldValue: null,
        newValue: finalStatus,
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
