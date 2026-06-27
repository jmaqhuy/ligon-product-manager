import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateMsku } from "@/lib/msku-generator";

// POST /api/ideas/bulk — Bulk create ideas from Excel upload
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ideas } = body as {
      ideas?: {
        msku?: string;
        topic: string;
        aiModel: string;
        fulfillmentType?: string;
        prompt: string;
        mainImageUrl: string;
        sourceLinks?: string[];
        title?: string;
        description?: string;
        bulletPoints?: string[];
        tags?: string;
        slugs?: string;
        widthCm?: number;
        heightCm?: number;
        thicknessMm?: number;
        material?: string;
        source?: string;
        partner?: string;
        partnerLabel?: string;
      }[];
    };

    if (!ideas || !Array.isArray(ideas) || ideas.length === 0) {
      return NextResponse.json({ error: "Không có dữ liệu ý tưởng" }, { status: 400 });
    }

    const [allTopics, allAiModels, allPartners] = await Promise.all([
      db.productTopic.findMany({ select: { id: true, name: true } }),
      db.aiModel.findMany({ select: { id: true, name: true } }),
      db.partner.findMany({ select: { id: true, name: true } }),
    ]);

    const topicMap = new Map(allTopics.map(t => [t.name.toLowerCase(), t.id]));
    const aiModelMap = new Map(allAiModels.map(m => [m.name.toLowerCase(), m.id]));
    const partnerMap = new Map(allPartners.map(p => [p.name.toLowerCase(), p.id]));

    const created: { msku: string; id: string }[] = [];
    const errors: { row: number; msku: string; error: string }[] = [];

    for (let i = 0; i < ideas.length; i++) {
      const idea = ideas[i];
      const rowNum = i + 1;

      try {
        const topicId = topicMap.get(idea.topic.toLowerCase());
        if (!topicId) {
          errors.push({ row: rowNum, msku: idea.msku || "?", error: `Chủ đề "${idea.topic}" không tồn tại` });
          continue;
        }

        const aiModelId = aiModelMap.get(idea.aiModel.toLowerCase());
        if (!aiModelId) {
          errors.push({ row: rowNum, msku: idea.msku || "?", error: `AI Model "${idea.aiModel}" không tồn tại` });
          continue;
        }

        let partnerId: string | undefined;
        if (idea.partner) {
          partnerId = partnerMap.get(idea.partner.toLowerCase());
          if (!partnerId) {
            errors.push({ row: rowNum, msku: idea.msku || "?", error: `Đối tác "${idea.partner}" không tồn tại` });
            continue;
          }
        }

        let msku = idea.msku?.trim();
        if (!msku) {
          msku = await generateMsku(session.user.id);
        }

        const existing = await db.idea.findUnique({ where: { msku }, select: { id: true } });
        if (existing) {
          errors.push({ row: rowNum, msku, error: `MSKU "${msku}" đã tồn tại` });
          continue;
        }

        const createdIdea = await db.idea.create({
          data: {
            msku,
            autoGenerateMsku: false,
            createdById: session.user.id,
            topicId,
            aiModelId,
            prompt: idea.prompt || "",
            mainImageUrl: idea.mainImageUrl || "",
            sourceLinks: JSON.stringify((idea.sourceLinks || []).filter(l => l?.trim())),
            widthCm: idea.widthCm || null,
            heightCm: idea.heightCm || null,
            thicknessMm: idea.thicknessMm || null,
            material: idea.material || null,
            source: idea.source || "employee",
            partnerId: partnerId || null,
            partnerLabel: idea.partnerLabel || null,
            amazonListing: {
              create: {
                sku: msku,
                itemName: idea.title || null,
                description: idea.description || null,
                bulletPoints: idea.bulletPoints ? JSON.stringify(idea.bulletPoints) : "[]",
                tags: idea.tags || null,
                slugs: idea.slugs || null,
                fulfillmentType: idea.fulfillmentType || "FBA",
              }
            },
            etsyListing: {
              create: {}
            }
          },
          select: { id: true, msku: true },
        });

        created.push({ id: createdIdea.id, msku: createdIdea.msku });
      } catch (e: any) {
        errors.push({ row: rowNum, msku: idea.msku || "?", error: e?.message || "Lỗi không xác định" });
      }
    }

    return NextResponse.json({
      success: created.length,
      failed: errors.length,
      created,
      errors,
    });
  } catch (error) {
    console.error("POST /api/ideas/bulk error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
