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

    const { broadcastNotification } = await import("@/lib/socket-helper");
    const { id } = await params;
    const body = await req.json();

    // Verify idea exists
    const idea = await db.idea.findUnique({ where: { id } });
    if (!idea) {
      return NextResponse.json({ error: "Ý tưởng không tồn tại" }, { status: 404 });
    }

    const {
      sellingAccountId,
      sku,
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
      listingStatus: incomingListingStatus,
      listingStatusReason,
      vineStatus,
      photosUploaded,
      fulfillmentType,
      campAuto,
      photoStatus,
      photoAssigneeId,
      photoRevisionNote,
      version,
    } = body;

    // Check existing listing for optimistic locking
    const existing = await db.amazonListing.findUnique({ where: { ideaId: id } });
    if (existing && version !== undefined && version !== existing.version) {
      return NextResponse.json(
        { error: "Dữ liệu Amazon đã được cập nhật bởi người khác. Vui lòng tải lại trang." },
        { status: 409 }
      );
    }

    let listingStatus = incomingListingStatus;
    if (listingStatus === undefined) {
      const currentStatus = existing?.listingStatus || "not_ready";
      if (currentStatus === "not_ready") {
        const finalTitle = itemName ?? existing?.itemName;
        const finalHighlights = itemHighlights ?? existing?.itemHighlights;
        const finalDesc = description ?? existing?.description;
        const finalTags = tags ?? existing?.tags;
        const finalSlugs = slugs ?? existing?.slugs;
        
        let finalBullets = [];
        if (bulletPoints !== undefined) finalBullets = bulletPoints || [];
        else if (existing?.bulletPoints) { try { finalBullets = JSON.parse(existing.bulletPoints); } catch {} }
        const validBullets = finalBullets.filter((b: string) => b && b.trim());

        let finalGallery = [];
        if (galleryImages !== undefined) finalGallery = galleryImages || [];
        else if (existing?.galleryImages) { try { finalGallery = JSON.parse(existing.galleryImages); } catch {} }
        const validGallery = finalGallery.filter((g: string) => g && g.trim());

        const isComplete = 
          finalTitle?.trim() && 
          finalHighlights?.trim() && 
          finalDesc?.trim() && 
          validBullets.length >= 5 && 
          finalTags?.trim() && 
          finalSlugs?.trim() && 
          validGallery.length >= 9;

        if (isComplete) {
          listingStatus = "ready";
        }
      }
    }

    // Track audit changes
    const auditEntries: { field: string; oldVal: string | null; newVal: string | null }[] = [];
    if (existing) {
      console.log(`[ASIN Debug] existing.asin = ${existing.asin}, new asin = ${asin}`);
      if (asin !== undefined && asin !== existing.asin) auditEntries.push({ field: "asin", oldVal: existing.asin, newVal: asin });
      if (sku !== undefined && sku !== existing.sku) auditEntries.push({ field: "sku", oldVal: existing.sku, newVal: sku });
      if (listingStatus !== undefined && listingStatus !== existing.listingStatus) auditEntries.push({ field: "listingStatus", oldVal: existing.listingStatus, newVal: listingStatus });
    } else {
      console.log(`[ASIN Debug] No existing listing, creating new one. new asin = ${asin}`);
    }

    // --- Backend Validation for Listing Status Transitions ---
    if (listingStatus === "uploading") {
      const finalTitle = itemName ?? existing?.itemName;
      const finalHighlights = itemHighlights ?? existing?.itemHighlights;
      const finalDesc = description ?? existing?.description;
      const finalTags = tags ?? existing?.tags;
      const finalSlugs = slugs ?? existing?.slugs;
      
      let finalBullets = [];
      if (bulletPoints) finalBullets = bulletPoints;
      else if (existing?.bulletPoints) { try { finalBullets = JSON.parse(existing.bulletPoints); } catch {} }
      const validBullets = finalBullets.filter((b: string) => b && b.trim());

      let finalGallery = [];
      if (galleryImages) finalGallery = galleryImages;
      else if (existing?.galleryImages) { try { finalGallery = JSON.parse(existing.galleryImages); } catch {} }
      const validGallery = finalGallery.filter((g: string) => g && g.trim());

      const finalSharedMain = useSharedMainImage ?? existing?.useSharedMainImage ?? true;
      const finalAccountId = sellingAccountId ?? existing?.sellingAccountId;

      const missing = [];
      if (!finalTitle?.trim()) missing.push("Item Name");
      if (!finalHighlights?.trim()) missing.push("Item Highlights");
      if (!finalDesc?.trim()) missing.push("Description");
      if (validBullets.length < 5) missing.push(`Bullet Points (${validBullets.length}/5)`);
      if (!finalTags?.trim()) missing.push("Tags");
      if (!finalSlugs?.trim()) missing.push("Slug");
      if (validGallery.length < 9) missing.push(`Ảnh (${validGallery.length}/9)`);

      if (missing.length > 0) {
        return NextResponse.json({ error: "Sản phẩm chưa đủ điều kiện up! Thiếu: " + missing.join(", ") }, { status: 400 });
      }
      if (!finalAccountId) {
        return NextResponse.json({ error: "Vui lòng chọn tài khoản đăng bán!" }, { status: 400 });
      }
    }

    if (listingStatus === "published") {
      const finalAsin = asin ?? existing?.asin;
      const finalFnsku = fnskuCode ?? existing?.fnskuCode;
      const finalLabel = fnskuLabelFileUrl ?? existing?.fnskuLabelFileUrl;
      
      if (!finalAsin) {
        return NextResponse.json({ error: "Vui lòng nhập ASIN trước khi chuyển sang 'Đã lên'!" }, { status: 400 });
      }
      if (!finalFnsku && !finalLabel) {
        return NextResponse.json({ error: "Vui lòng thêm FNSKU hoặc Label trước!" }, { status: 400 });
      }
    }

    if (listingStatus === "error" || listingStatus === "delisted") {
      const finalReason = listingStatusReason ?? existing?.listingStatusReason;
      if (!finalReason) {
        return NextResponse.json({ error: `Vui lòng nhập lý do ${listingStatus === "error" ? "lỗi" : "bị gỡ"}!` }, { status: 400 });
      }
    }
    // ---------------------------------------------------------

    const listing = await db.amazonListing.upsert({
      where: { ideaId: id },
      update: {
        sellingAccountId: sellingAccountId || null,
        sku: sku !== undefined ? sku : existing?.sku,
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
        vineStatus,
        photosUploaded,
        fulfillmentType: fulfillmentType ?? existing?.fulfillmentType,
        campAuto: campAuto ?? existing?.campAuto,
        photoStatus: photoStatus !== undefined ? photoStatus : undefined,
        photoAssigneeId: photoAssigneeId !== undefined ? photoAssigneeId : undefined,
        photoRevisionNote: photoRevisionNote !== undefined ? photoRevisionNote : undefined,
        version: { increment: 1 },
      },
      create: {
        ideaId: id,
        sellingAccountId: sellingAccountId || null,
        sku: sku || null,
        asin,
        fnskuCode,
        fnskuLabelFileUrl,
        itemName: itemName || null,
        itemHighlights,
        bulletPoints: bulletPoints ? JSON.stringify(bulletPoints) : "[]",
        description: description || null,
        tags,
        slugs,
        price: price ? parseFloat(price) : null,
        useSharedMainImage: useSharedMainImage ?? true,
        galleryImages: galleryImages ? JSON.stringify(galleryImages) : "[]",
        videoUrl,
        contentAPlusUrl,
        listingStatus: listingStatus || "ready",
        listingStatusReason: (listingStatus === "error" || listingStatus === "delisted") ? listingStatusReason : null,
        vineStatus: vineStatus || "not_enrolled",
        photosUploaded: photosUploaded ?? false,
        fulfillmentType: fulfillmentType || "FBA",
        campAuto: campAuto ?? false,
        photoStatus: photoStatus || "not_requested",
        photoAssigneeId: photoAssigneeId || null,
        photoRevisionNote: photoRevisionNote || null,
      },
    });

    console.log(`[ASIN Debug] upsert completed. resulting listing.asin = ${listing.asin}`);

    // Create audit logs for Amazon listing changes
    for (const entry of auditEntries) {
      await db.auditLog.create({
        data: {
          entityType: "amazon_listing",
          entityId: listing.id,
          fieldName: entry.field,
          oldValue: entry.oldVal,
          newValue: entry.newVal,
          changedById: session.user.id,
        },
      });
    }

    return NextResponse.json(listing);
  } catch (error) {
    console.error("PUT /api/ideas/[id]/amazon-listing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/ideas/[id]/amazon-listing - Strict Partial Update
export async function PATCH(
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

    const idea = await db.idea.findUnique({ where: { id } });
    if (!idea) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }

    const existing = await db.amazonListing.findUnique({ where: { ideaId: id } });
    if (existing && body.version !== undefined && body.version !== existing.version) {
      return NextResponse.json(
        { error: "Dữ liệu Amazon đã được cập nhật bởi người khác. Vui lòng tải lại trang." },
        { status: 409 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { version: { increment: 1 } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createData: any = { ideaId: id, listingStatus: "ready", vineStatus: "not_enrolled", fulfillmentType: "FBA" };

    const allowedFields = [
      "sellingAccountId", "sku", "asin", "fnskuCode", "fnskuLabelFileUrl",
      "itemName", "itemHighlights", "description", "tags", "slugs",
      "useSharedMainImage", "videoUrl", "contentAPlusUrl", "listingStatus",
      "listingStatusReason", "vineStatus", "photosUploaded", "fulfillmentType",
      "campAuto", "photoStatus", "photoAssigneeId", "photoRevisionNote",
      "contentSource", "contentVerifiedAt", "contentVerifiedById"
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
        createData[field] = body[field];
      }
    }

    if (body.price !== undefined) {
      updateData.price = body.price ? parseFloat(body.price) : null;
      createData.price = body.price ? parseFloat(body.price) : null;
    }
    if (body.bulletPoints !== undefined) {
      const bpStr = typeof body.bulletPoints === "string" ? body.bulletPoints : JSON.stringify(body.bulletPoints);
      updateData.bulletPoints = bpStr;
      createData.bulletPoints = bpStr;
    }
    if (body.galleryImages !== undefined) {
      const giStr = typeof body.galleryImages === "string" ? body.galleryImages : JSON.stringify(body.galleryImages);
      updateData.galleryImages = giStr;
      createData.galleryImages = giStr;
    }

    const listing = await db.amazonListing.upsert({
      where: { ideaId: id },
      update: updateData,
      create: createData,
    });

    // Notifications for Photo Management
    const { broadcastNotification } = await import("@/lib/socket-helper");
    if (existing) {
      const photoStatus = body.photoStatus;
      const photoAssigneeId = body.photoAssigneeId;
      const photoRevisionNote = body.photoRevisionNote;
      if (photoStatus === "awaiting_photos" && existing.photoStatus !== "awaiting_photos" && session.user.id !== idea.createdById) {
        await db.notification.create({
          data: { userId: idea.createdById, type: "photo_requested", category: "photo", message: `Sếp/Quản lý đã yêu cầu làm ảnh Amazon cho ý tưởng ${idea.msku}.`, actionUrl: `/ideas/${idea.id}` }
        });
        broadcastNotification([idea.createdById], { type: "photo_requested", message: `Yêu cầu làm ảnh Amazon cho ý tưởng ${idea.msku}.`, actionUrl: `/ideas/${idea.id}` });
      }
      if (photoAssigneeId && photoAssigneeId !== existing.photoAssigneeId && photoAssigneeId !== session.user.id) {
        await db.notification.create({
          data: { userId: photoAssigneeId, type: "photo_assigned", category: "photo", message: `Bạn được giao làm ảnh Amazon cho ý tưởng ${idea.msku}.`, actionUrl: `/ideas/${idea.id}` }
        });
        broadcastNotification([photoAssigneeId], { type: "photo_assigned", message: `Được giao ảnh Amazon ý tưởng ${idea.msku}.`, actionUrl: `/ideas/${idea.id}` });
      }
      if (photoStatus === "approved" && existing.photoStatus !== "approved" && existing.photoAssigneeId) {
        await db.notification.create({
          data: { userId: existing.photoAssigneeId, type: "photo_approved", category: "photo", message: `Ảnh Amazon của ${idea.msku} đã được duyệt!`, actionUrl: `/ideas/${idea.id}` }
        });
        broadcastNotification([existing.photoAssigneeId], { type: "photo_approved", message: `Ảnh Amazon ${idea.msku} được duyệt!`, actionUrl: `/ideas/${idea.id}` });
      }
      if (photoStatus === "revision_requested" && existing.photoStatus !== "revision_requested" && existing.photoAssigneeId) {
        await db.notification.create({
          data: { userId: existing.photoAssigneeId, type: "photo_revision_requested", category: "photo", message: `Ảnh Amazon của ${idea.msku} cần chỉnh sửa. Lý do: ${photoRevisionNote || "Không có"}`, actionUrl: `/ideas/${idea.id}` }
        });
        broadcastNotification([existing.photoAssigneeId], { type: "photo_revision_requested", message: `Ảnh Amazon ${idea.msku} cần sửa.`, actionUrl: `/ideas/${idea.id}` });
      }
    }

    return NextResponse.json(listing);
  } catch (error) {
    console.error("PATCH /api/ideas/[id]/amazon-listing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
