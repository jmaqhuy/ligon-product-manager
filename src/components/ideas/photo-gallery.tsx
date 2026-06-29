import { Button } from "@/components/ui/button";
import { Pencil, ImageIcon, Check, XCircle, ShoppingBag } from "lucide-react";
import { ImagePreviewDialog } from "@/components/image-preview-dialog";
import { driveToThumbnailUrl } from "@/lib/google-drive";
import { photoStatusLabels } from "@/types";
import { toast } from "sonner";

export function statusBadge(status: string, labels: Record<string, string>) {
  if (status === "published" || status === "approved") {
    return <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">{labels[status] || status}</span>;
  }
  if (status === "draft" || status === "not_requested" || status === "not_enrolled") {
    return <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">{labels[status] || status}</span>;
  }
  if (status === "pending_approval" || status === "awaiting_photos" || status === "awaiting_file") {
    return <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">{labels[status] || status}</span>;
  }
  return <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">{labels[status] || status}</span>;
}

export interface PhotoGalleryProps {
  platform: "amazon" | "etsy";
  listing: any;
  form: any;
  setEditOpen: (val: boolean) => void;
  handleUpdateListing: (data: any) => Promise<void>;
  saving: boolean;
  canManagePhotos: boolean;
  session: any;
  idea: any;
}

export function PhotoGallery({
  platform,
  listing,
  form,
  setEditOpen,
  handleUpdateListing,
  saving,
  canManagePhotos,
  session,
  idea,
}: PhotoGalleryProps) {
  let parsedImages = [];
  try {
    if (typeof form.galleryImages === "string") {
      parsedImages = JSON.parse(form.galleryImages);
    } else if (Array.isArray(form.galleryImages)) {
      parsedImages = form.galleryImages;
    }
  } catch (e) {}
  const images = parsedImages.filter(Boolean);
  const cells = Array.from({ length: 9 }).map((_, i) => images[i] || null);
  const pStatus = listing?.photoStatus || "not_requested";
  const assigneeId = listing?.photoAssigneeId;

  return (
    <div className="space-y-3 mt-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground block font-bold">Gallery Images (9 ảnh 1:1)</span>
        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => setEditOpen(true)} disabled={saving || (idea?.amazonListing?.listingStatus === "published" || idea?.etsyListing?.listingStatus === "published")}>
          <Pencil className="h-3 w-3 mr-1" /> Sửa link ảnh
        </Button>
      </div>
      <div className="grid grid-cols-5 gap-2 pb-2">
        {cells.map((img, i) =>
          img ? (
            <ImagePreviewDialog key={i} images={images as string[]} initialIndex={i}>
              <div className="aspect-square bg-muted/40 border border-dashed border-muted-foreground/30 rounded flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                <img src={driveToThumbnailUrl(img as string, 150)} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            </ImagePreviewDialog>
          ) : (
            <div key={i} className="aspect-square bg-muted/40 border border-dashed border-muted-foreground/30 rounded flex flex-col items-center justify-center overflow-hidden cursor-not-allowed">
              <span className="text-[8px] text-muted-foreground text-center px-0.5 leading-tight">Chưa có<br />ảnh</span>
            </div>
          )
        )}
      </div>

      <div className="space-y-1.5 mt-2 bg-muted/30 p-2 rounded border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Trạng thái ảnh:</span>
          {statusBadge(pStatus, photoStatusLabels)}
        </div>

        {canManagePhotos && pStatus === "not_requested" && (
          <Button size="sm" className="w-full h-7 text-xs" onClick={() => handleUpdateListing({ photoStatus: "awaiting_photos" })} disabled={saving}>
            <ImageIcon className="h-3 w-3 mr-1" /> Yêu cầu làm ảnh
          </Button>
        )}

        {pStatus === "awaiting_photos" && !assigneeId && (
          <Button size="sm" className="w-full h-7 text-xs" onClick={() => handleUpdateListing({ photoAssigneeId: session?.user?.id })} disabled={saving}>
            <Check className="h-3 w-3 mr-1" /> Nhận nhiệm vụ
          </Button>
        )}

        {pStatus === "awaiting_photos" && assigneeId === session?.user?.id && (
          <div className="space-y-1.5">
            <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => handleUpdateListing({ photoAssigneeId: null })} disabled={saving}>
              <XCircle className="h-3 w-3 mr-1" /> Hủy nhận
            </Button>
            <Button size="sm" className="w-full h-7 text-xs" onClick={() => {
              if (images.length === 0) { toast.error("Thêm ít nhất 1 ảnh!"); return; }
              handleUpdateListing({ photoStatus: "pending_approval" });
            }} disabled={saving}>
              <ShoppingBag className="h-3 w-3 mr-1" /> Nộp ảnh
            </Button>
          </div>
        )}

        {pStatus === "revision_requested" && assigneeId === session?.user?.id && (
          <div className="space-y-1.5">
            {listing?.photoRevisionNote && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-2 border border-amber-200 dark:border-amber-800">
                <p className="text-[10px] font-medium text-amber-800 dark:text-amber-300 mb-0.5">Yêu cầu sửa:</p>
                <p className="text-[10px] text-amber-700 dark:text-amber-400">{listing.photoRevisionNote}</p>
              </div>
            )}
            <Button size="sm" className="w-full h-7 text-xs" onClick={() => handleUpdateListing({ photoStatus: "pending_approval" })} disabled={saving}>
              <ImageIcon className="h-3 w-3 mr-1" /> Nộp lại ảnh đã sửa
            </Button>
          </div>
        )}

        {canManagePhotos && pStatus === "pending_approval" && (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs border-red-200 text-red-700 hover:bg-red-50" onClick={() => {
              const note = prompt("Lý do sửa ảnh:");
              if (!note) { toast.error("Cần nhập lý do!"); return; }
              handleUpdateListing({ photoStatus: "revision_requested", photoRevisionNote: note });
            }} disabled={saving}>
              Yêu cầu sửa
            </Button>
            <Button size="sm" className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleUpdateListing({ photoStatus: "approved" })} disabled={saving}>
              <Check className="h-3 w-3 mr-1" /> Duyệt ảnh
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
