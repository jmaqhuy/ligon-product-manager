import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
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

    // Build where clause based on tab
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (mine) {
      where.createdById = session.user.id;
    }

    if (search) {
      where.OR = [
        { sku: { contains: search } },
        { msku: { contains: search } },
      ];
    }

    if (topicId) {
      where.topicId = topicId;
    }

    switch (tab) {
      case "reviewing":
        where.status = "reviewing";
        break;
      case "photos":
        where.status = "approved";
        where.photoStatus = { in: ["not_requested", "awaiting_photos", "pending_approval", "revision_requested"] };
        break;
      case "ready":
        where.photoStatus = "approved";
        where.status = { not: "published" };
        break;
      case "published":
        where.status = "published";
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

    return NextResponse.json(idea, { status: 201 });
  } catch (error) {
    console.error("POST /api/ideas error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
