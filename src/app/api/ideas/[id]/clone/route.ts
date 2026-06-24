import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateMsku } from "@/lib/msku-generator";

// POST /api/ideas/[id]/clone
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const cloneSource = body.source as string | undefined;
    const partnerName = body.partnerName as string | undefined;
    const partnerLabel = body.partnerLabel as string | undefined;

    const oldIdea = await db.idea.findUnique({ where: { id } });
    
    if (!oldIdea) {
      return NextResponse.json({ error: "Không tìm thấy ý tưởng" }, { status: 404 });
    }

    // Generate new MSKU
    const msku = await generateMsku(session.user.nameAbbreviation);

    // If cloning as partner, skip content fields
    const isPartner = cloneSource === "partner";

    // Create new idea based on old idea
    const newIdea = await db.idea.create({
      data: {
        msku,
        sku: msku, // default SKU = MSKU
        autoGenerateMsku: true,
        createdById: session.user.id,
        topicId: oldIdea.topicId,
        aiModelId: oldIdea.aiModelId,
        prompt: oldIdea.prompt,
        sourceLinks: oldIdea.sourceLinks,
        mainImageUrl: oldIdea.mainImageUrl,
        fulfillmentType: oldIdea.fulfillmentType,
        title: isPartner ? null : oldIdea.title,
        description: isPartner ? null : oldIdea.description,
        status: isPartner ? "approved" : "reviewing",
        photoStatus: "not_requested",
        fileStatus: "not_started",
        source: cloneSource || "employee",
        partnerName: isPartner ? partnerName || null : null,
        partnerLabel: isPartner ? partnerLabel || null : null,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        entityType: "idea",
        entityId: newIdea.id,
        fieldName: "status",
        oldValue: null,
        newValue: isPartner ? "approved" : "reviewing",
        changedById: session.user.id,
      },
    });

    return NextResponse.json({ id: newIdea.id, msku: newIdea.msku }, { status: 201 });
  } catch (error) {
    console.error("POST /api/ideas/[id]/clone error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
