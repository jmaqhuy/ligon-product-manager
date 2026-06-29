import { ReactNode, useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CopyButton } from "@/components/copy-button"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import { isDriveLink, convertToDirectImageUrl, driveToPreviewUrl, driveToThumbnailUrl } from "@/lib/google-drive"

interface ImagePreviewDialogProps {
  url?: string
  images?: string[]
  initialIndex?: number
  children: ReactNode
}

export function ImagePreviewDialog({ url, images, initialIndex = 0, children }: ImagePreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const galleryImages = images || (url ? [url] : []);
  const currentUrl = galleryImages[currentIndex] || url || "";

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open || galleryImages.length <= 1) return;
      if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : prev));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, galleryImages.length]);

  // Preload next and previous images
  useEffect(() => {
    if (!open || galleryImages.length <= 1) return;
    
    const preloadImage = (index: number) => {
      if (index >= 0 && index < galleryImages.length) {
        const url = galleryImages[index];
        if (url) {
          const img = new Image();
          img.src = convertToDirectImageUrl(url) || url;
        }
      }
    };

    preloadImage(currentIndex + 1);
    preloadImage(currentIndex - 1);
  }, [open, currentIndex, galleryImages]);

  if (!currentUrl) return <>{children}</>;

  const directUrl = convertToDirectImageUrl(currentUrl) || currentUrl;
  const isDrive = isDriveLink(currentUrl);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-fit bg-transparent border-none shadow-none !ring-0 p-0 flex flex-col items-center justify-center gap-4" showCloseButton={false}>
        {/* Main image container */}
        <div className="relative group/lightbox flex items-center justify-center max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={directUrl} 
            alt="Preview" 
            className="max-h-[80vh] max-w-[95vw] rounded-md object-contain bg-background/20"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />

          {/* Navigation Arrows */}
          {galleryImages.length > 1 && currentIndex > 0 && (
            <button
              onClick={() => setCurrentIndex(currentIndex - 1)}
              className="absolute left-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          {galleryImages.length > 1 && currentIndex < galleryImages.length - 1 && (
            <button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className="absolute right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
        </div>

        {/* Thumbnail strip */}
        {galleryImages.length > 1 && (
          <div className="flex items-center justify-center gap-2 max-w-[95vw] overflow-x-auto p-2 bg-black/50 rounded-lg backdrop-blur-sm">
            {galleryImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                  i === currentIndex
                    ? "border-primary ring-2 ring-primary/50"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={driveToThumbnailUrl(img, 150)}
                  alt={`Thumb ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </button>
            ))}
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow">
          <CopyButton text={currentUrl} className="h-7 w-7" />
          <span className="text-[10px] text-muted-foreground">Sao chép liên kết</span>
          {isDrive && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <CopyButton text={driveToPreviewUrl(currentUrl)} className="h-7 w-7" />
              <span className="text-[10px] text-muted-foreground">Copy link xem trực tiếp</span>
            </>
          )}
          <Separator orientation="vertical" className="h-5" />
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => window.open(currentUrl, "_blank")}>
            <ExternalLink className="h-3 w-3" /> Xem tại trang đích
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
