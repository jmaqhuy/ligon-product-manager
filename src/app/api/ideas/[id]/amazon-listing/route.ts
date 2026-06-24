import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT /api/ideas/[id]/amazon-listing - Create or update Amazon listing
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Verify idea exists
    const idea = await db.idea.findUnique({ where: { id } });
    if (!idea) {
      return NextResponse.json({ error: "Ý tưởng không tồn tại" }, { status: 404 });
    }

    const {
      sellingAccountId,
      asin,
      fnskuCode,
      fnskuLabelFileUrl,
      itemName,
      itemHighlights,
      bulletPoints,
      description,
      tags,
      slugs,
      price,
      useSharedMainImage,
      galleryImages,
      videoUrl,
      contentAPlusUrl,
      listingStatus,
      listingStatusReason,
    } = body;

    const listing = await db.amazonListing.upsert({
      where: { ideaId: id },
      update: {
        sellingAccountId: sellingAccountId || null,
        asin,
        fnskuCode,
        fnskuLabelFileUrl,
        itemName,
        itemHighlights,
        bulletPoints: bulletPoints ? JSON.stringify(bulletPoints) : undefined,
        description,
        tags,
        slugs,
        price: price ? parseFloat(price) : null,
        useSharedMainImage: useSharedMainImage ?? true,
        galleryImages: galleryImages ? JSON.stringify(galleryImages) : undefined,
        videoUrl,
        contentAPlusUrl,
        listingStatus,
        listingStatusReason: (listingStatus === "error" || listingStatus === "delisted") ? listingStatusReason : null,
        version: { increment: 1 },
      },
      create: {
        ideaId: id,
        sellingAccountId: sellingAccountId || null,
        asin,
        fnskuCode,
        fnskuLabelFileUrl,
        itemName: itemName || idea.title,
        itemHighlights,
        bulletPoints: bulletPoints ? JSON.stringify(bulletPoints) : "[]",
        description: description || idea.description,
        tags,
        slugs,
        price: price ? parseFloat(price) : null,
        useSharedMainImage: useSharedMainImage ?? true,
        galleryImages: galleryImages ? JSON.stringify(galleryImages) : "[]",
        videoUrl,
        contentAPlusUrl,
        listingStatus: listingStatus || "ready",
        listingStatusReason: (listingStatus === "error" || listingStatus === "delisted") ? listingStatusReason : null,
      },
    });

    return NextResponse.json(listing);
  } catch (error) {
    console.error("PUT /api/ideas/[id]/amazon-listing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
