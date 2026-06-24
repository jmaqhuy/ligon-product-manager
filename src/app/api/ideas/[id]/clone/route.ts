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
    const oldIdea = await db.idea.findUnique({ where: { id } });
    
    if (!oldIdea) {
      return NextResponse.json({ error: "Không tìm thấy ý tưởng" }, { status: 404 });
    }

    // Generate new MSKU
    const msku = await generateMsku(session.user.nameAbbreviation);

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
        title: oldIdea.title,
        description: oldIdea.description,
        status: "reviewing",
        photoStatus: "not_requested",
        fileStatus: "not_started",
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        entityType: "idea",
        entityId: newIdea.id,
        fieldName: "status",
        oldValue: null,
        newValue: "reviewing",
        changedById: session.user.id,
      },
    });

    return NextResponse.json({ id: newIdea.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/ideas/[id]/clone error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
