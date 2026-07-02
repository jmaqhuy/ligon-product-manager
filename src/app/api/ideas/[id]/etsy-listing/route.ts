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
      listingStatusReason,
      photoStatus,
      photoAssigneeId,
      photoRevisionNote,
    } = body;

    const existing = await db.etsyListing.findUnique({ where: { ideaId: id } });

    // --- Backend Validation for Listing Status Transitions ---
    if (listingStatus === "uploading") {
      const finalTitle = title ?? existing?.title;
      const finalDesc = description ?? existing?.description;
      const finalPrice = price ?? existing?.price;

      let finalTags = [];
      if (tags) finalTags = tags;
      else if (existing?.tags) { try { finalTags = JSON.parse(existing.tags); } catch {} }

      let finalGallery = [];
      if (galleryImages) finalGallery = galleryImages;
      else if (existing?.galleryImages) { try { finalGallery = JSON.parse(existing.galleryImages); } catch {} }
      const validGallery = finalGallery.filter((g: string) => g && g.trim());

      const finalSharedGallery = useSharedGallery ?? existing?.useSharedGallery ?? false;
      const finalAccountId = sellingAccountId ?? existing?.sellingAccountId;

      const missing = [];
      if (!finalTitle?.trim()) missing.push("Title");
      if (!finalDesc?.trim()) missing.push("Description");
      if (finalTags.length === 0) missing.push("Tags");
      if (!finalPrice) missing.push("Giá");
      if (validGallery.length === 0 && !finalSharedGallery) missing.push("Gallery Images");

      if (missing.length > 0) {
        return NextResponse.json({ error: "Sản phẩm chưa đủ điều kiện up! Thiếu: " + missing.join(", ") }, { status: 400 });
      }
      if (!finalAccountId) {
        return NextResponse.json({ error: "Vui lòng chọn tài khoản đăng bán!" }, { status: 400 });
      }
    }

    if (listingStatus === "published") {
      const finalListingId = listingId ?? existing?.listingId;
      if (!finalListingId) {
        return NextResponse.json({ error: "Vui lòng nhập Listing ID trước khi chuyển sang 'Đã lên'!" }, { status: 400 });
      }
    }

    if (listingStatus === "error" || listingStatus === "delisted") {
      const finalReason = listingStatusReason ?? existing?.listingStatusReason;
      if (!finalReason) {
        return NextResponse.json({ error: `Vui lòng nhập lý do ${listingStatus === "error" ? "lỗi" : "bị gỡ"}!` }, { status: 400 });
      }
    }
    // ---------------------------------------------------------

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
        listingStatusReason: (listingStatus === "error" || listingStatus === "delisted") ? listingStatusReason : null,
        photoStatus: photoStatus !== undefined ? photoStatus : undefined,
        photoAssigneeId: photoAssigneeId !== undefined ? photoAssigneeId : undefined,
        photoRevisionNote: photoRevisionNote !== undefined ? photoRevisionNote : undefined,
        version: { increment: 1 },
      },
      create: {
        ideaId: id,
        sellingAccountId: sellingAccountId || null,
        title: title || null,
        listingId,
        tags: tags ? JSON.stringify(tags) : "[]",
        description: description || null,
        price: price ? parseFloat(price) : null,
        useSharedMainImage: useSharedMainImage ?? true,
        galleryImages: galleryImages ? JSON.stringify(galleryImages) : "[]",
        useSharedGallery: useSharedGallery ?? false,
        videoUrl,
        useAmazonVideo: useAmazonVideo ?? false,
        listingStatus: listingStatus || "ready",
        listingStatusReason: (listingStatus === "error" || listingStatus === "delisted") ? listingStatusReason : null,
        photoStatus: photoStatus || "not_requested",
        photoAssigneeId: photoAssigneeId || null,
        photoRevisionNote: photoRevisionNote || null,
      },
    });

    
    // Notifications for Photo Management
    const { broadcastNotification } = await import("@/lib/socket-helper");
    if (existing) {
      if (photoStatus === "awaiting_photos" && existing.photoStatus !== "awaiting_photos" && session.user.id !== idea.createdById) {
        await db.notification.create({
          data: { userId: idea.createdById, type: "photo_requested", category: "photo", message: `Sếp/Quản lý đã yêu cầu làm ảnh Etsy cho ý tưởng ${idea.msku}.`, actionUrl: `/ideas/${idea.id}` }
        });
        broadcastNotification([idea.createdById], { type: "photo_requested", message: `Yêu cầu làm ảnh Etsy cho ý tưởng ${idea.msku}.`, actionUrl: `/ideas/${idea.id}` });
      }
      if (photoAssigneeId && photoAssigneeId !== existing.photoAssigneeId && photoAssigneeId !== session.user.id) {
        await db.notification.create({
          data: { userId: photoAssigneeId, type: "photo_assigned", category: "photo", message: `Bạn được giao làm ảnh Etsy cho ý tưởng ${idea.msku}.`, actionUrl: `/ideas/${idea.id}` }
        });
        broadcastNotification([photoAssigneeId], { type: "photo_assigned", message: `Được giao ảnh Etsy ý tưởng ${idea.msku}.`, actionUrl: `/ideas/${idea.id}` });
      }
      if (photoStatus === "approved" && existing.photoStatus !== "approved" && existing.photoAssigneeId) {
        await db.notification.create({
          data: { userId: existing.photoAssigneeId, type: "photo_approved", category: "photo", message: `Ảnh Etsy của ${idea.msku} đã được duyệt!`, actionUrl: `/ideas/${idea.id}` }
        });
        broadcastNotification([existing.photoAssigneeId], { type: "photo_approved", message: `Ảnh Etsy ${idea.msku} được duyệt!`, actionUrl: `/ideas/${idea.id}` });
      }
      if (photoStatus === "revision_requested" && existing.photoStatus !== "revision_requested" && existing.photoAssigneeId) {
        await db.notification.create({
          data: { userId: existing.photoAssigneeId, type: "photo_revision_requested", category: "photo", message: `Ảnh Etsy của ${idea.msku} cần chỉnh sửa. Lý do: ${photoRevisionNote || "Không có"}`, actionUrl: `/ideas/${idea.id}` }
        });
        broadcastNotification([existing.photoAssigneeId], { type: "photo_revision_requested", message: `Ảnh Etsy ${idea.msku} cần sửa.`, actionUrl: `/ideas/${idea.id}` });
      }
    }

    return NextResponse.json(listing);
  } catch (error) {
    console.error("PUT /api/ideas/[id]/etsy-listing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/ideas/[id]/etsy-listing - Strict Partial Update
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

    const existing = await db.etsyListing.findUnique({ where: { ideaId: id } });
    if (existing && body.version !== undefined && body.version !== existing.version) {
      return NextResponse.json(
        { error: "Dữ liệu Etsy đã được cập nhật bởi người khác. Vui lòng tải lại trang." },
        { status: 409 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { version: { increment: 1 } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createData: any = { ideaId: id, listingStatus: "ready" };

    const allowedFields = [
      "sellingAccountId", "title", "listingId", "description",
      "useSharedMainImage", "useSharedGallery", "videoUrl", "useAmazonVideo",
      "listingStatus", "listingStatusReason", "photoStatus",
      "photoAssigneeId", "photoRevisionNote"
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
    if (body.tags !== undefined) {
      const tagsStr = typeof body.tags === "string" ? body.tags : JSON.stringify(body.tags);
      updateData.tags = tagsStr;
      createData.tags = tagsStr;
    }
    if (body.galleryImages !== undefined) {
      const giStr = typeof body.galleryImages === "string" ? body.galleryImages : JSON.stringify(body.galleryImages);
      updateData.galleryImages = giStr;
      createData.galleryImages = giStr;
    }

    const listing = await db.etsyListing.upsert({
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
          data: { userId: idea.createdById, type: "photo_requested", category: "photo", message: `Sếp/Quản lý đã yêu cầu làm ảnh Etsy cho ý tưởng ${idea.msku}.`, actionUrl: `/ideas/${idea.id}` }
        });
        broadcastNotification([idea.createdById], { type: "photo_requested", message: `Yêu cầu làm ảnh Etsy cho ý tưởng ${idea.msku}.`, actionUrl: `/ideas/${idea.id}` });
      }
      if (photoAssigneeId && photoAssigneeId !== existing.photoAssigneeId && photoAssigneeId !== session.user.id) {
        await db.notification.create({
          data: { userId: photoAssigneeId, type: "photo_assigned", category: "photo", message: `Bạn được giao làm ảnh Etsy cho ý tưởng ${idea.msku}.`, actionUrl: `/ideas/${idea.id}` }
        });
        broadcastNotification([photoAssigneeId], { type: "photo_assigned", message: `Được giao ảnh Etsy ý tưởng ${idea.msku}.`, actionUrl: `/ideas/${idea.id}` });
      }
      if (photoStatus === "approved" && existing.photoStatus !== "approved" && existing.photoAssigneeId) {
        await db.notification.create({
          data: { userId: existing.photoAssigneeId, type: "photo_approved", category: "photo", message: `Ảnh Etsy của ${idea.msku} đã được duyệt!`, actionUrl: `/ideas/${idea.id}` }
        });
        broadcastNotification([existing.photoAssigneeId], { type: "photo_approved", message: `Ảnh Etsy ${idea.msku} được duyệt!`, actionUrl: `/ideas/${idea.id}` });
      }
      if (photoStatus === "revision_requested" && existing.photoStatus !== "revision_requested" && existing.photoAssigneeId) {
        await db.notification.create({
          data: { userId: existing.photoAssigneeId, type: "photo_revision_requested", category: "photo", message: `Ảnh Etsy của ${idea.msku} cần chỉnh sửa. Lý do: ${photoRevisionNote || "Không có"}`, actionUrl: `/ideas/${idea.id}` }
        });
        broadcastNotification([existing.photoAssigneeId], { type: "photo_revision_requested", message: `Ảnh Etsy ${idea.msku} cần sửa.`, actionUrl: `/ideas/${idea.id}` });
      }
    }

    return NextResponse.json(listing);
  } catch (error) {
    console.error("PATCH /api/ideas/[id]/etsy-listing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
