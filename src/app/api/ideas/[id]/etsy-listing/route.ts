import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT /api/ideas/[id]/etsy-listing - Create or update Etsy listing
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
      title,
      listingId,
      tags,
      description,
      price,
      useSharedMainImage,
      galleryImages,
      useSharedGallery,
      videoUrl,
      useAmazonVideo,
      listingStatus,
    } = body;

    const listing = await db.etsyListing.upsert({
      where: { ideaId: id },
      update: {
        sellingAccountId: sellingAccountId || null,
        title,
        listingId,
        tags: tags ? JSON.stringify(tags) : undefined,
        description,
        price: price ? parseFloat(price) : null,
        useSharedMainImage: useSharedMainImage ?? true,
        galleryImages: galleryImages ? JSON.stringify(galleryImages) : undefined,
        useSharedGallery: useSharedGallery ?? false,
        videoUrl,
        useAmazonVideo: useAmazonVideo ?? false,
        listingStatus,
        version: { increment: 1 },
      },
      create: {
        ideaId: id,
        sellingAccountId: sellingAccountId || null,
        title: title || idea.title,
        listingId,
        tags: tags ? JSON.stringify(tags) : "[]",
        description: description || idea.description,
        price: price ? parseFloat(price) : null,
        useSharedMainImage: useSharedMainImage ?? true,
        galleryImages: galleryImages ? JSON.stringify(galleryImages) : "[]",
        useSharedGallery: useSharedGallery ?? false,
        videoUrl,
        useAmazonVideo: useAmazonVideo ?? false,
        listingStatus: listingStatus || "pending_review",
      },
    });

    return NextResponse.json(listing);
  } catch (error) {
    console.error("PUT /api/ideas/[id]/etsy-listing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
