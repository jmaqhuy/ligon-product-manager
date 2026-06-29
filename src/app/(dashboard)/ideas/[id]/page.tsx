"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button"
import { ButtonIconHover } from "@/components/shadcn-studio/button/button-04";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { AuditLogViewer } from "@/components/audit-log-viewer";
import { ImagePreviewDialog } from "@/components/image-preview-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Pencil,
  Edit3,
  XCircle,
  X,
  Trash2,
  FileText,
  Upload,
  ShoppingBag,
  Printer,
  History,
  Save,
  Type,
  AlignLeft,
  Sparkles, Terminal,
  Link2,
  MessageSquareWarning,
  Package,
  Calendar,
  Ruler,
  Layers,
  Tag,
  Store,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { toast } from "sonner";
import {
  ideaStatusLabels,
  photoStatusLabels,
  fileStatusLabels,
  listingStatusLabels,
} from "@/types";
import type { Role } from "@/lib/permissions";
import { can } from "@/lib/permissions";
import { convertToDirectImageUrl, isDriveLink, driveToPreviewUrl, driveToThumbnailUrl } from "@/lib/google-drive";

// ─── Status badge helpers ───────────────────────────────────────────
const statusColors: Record<string, string> = {
  reviewing: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
  // Idea statuses
  approved: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
  not_requested: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
  awaiting_photos: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
  pending_approval: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
  revision_requested: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
  not_started: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
  in_progress: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300",
  pending_review: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
  editing: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300",
  ready_to_publish: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  // Listing statuses
  ready: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
  uploading: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300",
  uploaded: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  selling: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  error: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
  fixed: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
  delisted: "bg-red-200 text-red-900 border-red-300 dark:bg-red-900/50 dark:text-red-400",
};

function statusBadge(status: string, labels: Record<string, string>) {
  return (
    <Badge variant="outline" className={statusColors[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

// Amazon listing status workflow
const NEXT_STATUS: Record<string, { label: string; next: string; className: string }[]> = {
  ready: [{ label: "Đang up", next: "uploading", className: "bg-cyan-600 hover:bg-cyan-700" }],
  uploading: [
    { label: "Đã lên", next: "selling", className: "bg-green-600 hover:bg-green-700" },
    { label: "Lỗi", next: "error", className: "bg-red-600 hover:bg-red-700" },
  ],
  selling: [
    { label: "Bị gỡ", next: "delisted", className: "bg-red-600 hover:bg-red-700" },
    { label: "Lỗi", next: "error", className: "bg-orange-600 hover:bg-orange-700" },
  ],
  error: [{ label: "Đã sửa", next: "fixed", className: "bg-emerald-600 hover:bg-emerald-700" }],
  fixed: [{ label: "Đã lên", next: "selling", className: "bg-green-600 hover:bg-green-700" }],
  delisted: [],
};

// ─── Main component ─────────────────────────────────────────────────
export default function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [idea, setIdea] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | "revise" | null>(null);
  const [photoRevisionInput, setPhotoRevisionInput] = useState("");
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [labelPrintQty, setLabelPrintQty] = useState(1);
  const [autoNext, setAutoNext] = useState(true);

  // Sheets
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [amzEditOpen, setAmzEditOpen] = useState(false);
  const [etsyEditOpen, setEtsyEditOpen] = useState(false);
  const [changeFulfillmentOpen, setChangeFulfillmentOpen] = useState(false);
  const [pendingFulfillment, setPendingFulfillment] = useState<"FBM" | "FBA" | null>(null);
  const [amzInfoExpanded, setAmzInfoExpanded] = useState(true);

  // Idea general form state — only prompt (title/description belong to Amazon/Etsy)
  const [ideaForm, setIdeaForm] = useState({ prompt: "" });

  // Amazon listing form state
  const [amzForm, setAmzForm] = useState({
    sellingAccountId: "", asin: "", fnskuCode: "", fnskuLabelFileUrl: "",
    itemName: "", itemHighlights: "", bulletPoints: ["", "", "", "", ""],
    description: "", tags: "", slugs: "", price: "", useSharedMainImage: true,
    galleryImages: [""], videoUrl: "", contentAPlusUrl: "",
    listingStatus: "ready", listingStatusReason: "", vineStatus: "not_enrolled",
    vineReviewUrl: "", photosUploaded: false,
  });

  // Etsy listing form state
  const [etsyForm, setEtsyForm] = useState({
    sellingAccountId: "", title: "", listingId: "", tags: [] as string[],
    tagsInput: "", description: "", price: "", useSharedMainImage: true,
    galleryImages: [""], useSharedGallery: false, videoUrl: "",
    useAmazonVideo: false, listingStatus: "ready", listingStatusReason: "",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sellingAccounts, setSellingAccounts] = useState<any[]>([]);

  const fetchIdea = useCallback(async () => {
    try {
      const res = await fetch(`/api/ideas/${id}`, { cache: "no-store" });
      if (!res.ok) { toast.error("Không tìm thấy ý tưởng"); router.push("/ideas"); return; }
      const data = await res.json();
      setIdea(data);
      setIdeaForm({ prompt: data.prompt || "" });

      if (data.amazonListing) {
        const a = data.amazonListing;
        setAmzForm({
          sellingAccountId: a.sellingAccountId || "", asin: a.asin || "", fnskuCode: a.fnskuCode || "",
          fnskuLabelFileUrl: a.fnskuLabelFileUrl || "", itemName: a.itemName || "",
          itemHighlights: a.itemHighlights || "",
          bulletPoints: (() => { try { const p = JSON.parse(a.bulletPoints || "[]"); return [...p, ...Array(5)].slice(0, 5); } catch { return ["", "", "", "", ""]; } })(),
          description: a.description || "", tags: a.tags || "", slugs: a.slugs || "",
          price: a.price ? String(a.price) : "", useSharedMainImage: a.useSharedMainImage ?? true,
          galleryImages: (() => { try { const g = JSON.parse(a.galleryImages || "[]"); return g.length ? g : [""]; } catch { return [""]; } })(),
          videoUrl: a.videoUrl || "", contentAPlusUrl: a.contentAPlusUrl || "",
          listingStatus: a.listingStatus || "ready", listingStatusReason: a.listingStatusReason || "",
          vineStatus: a.vineStatus || "not_enrolled", vineReviewUrl: a.vineReviewUrl || "",
          photosUploaded: a.photosUploaded ?? false,
        });
      } else {
        setAmzForm((prev) => ({ ...prev, itemName: data.title || "", description: data.description || "" }));
      }

      if (data.etsyListing) {
        const e = data.etsyListing;
        const parsedTags = (() => { try { return JSON.parse(e.tags || "[]"); } catch { return []; } })();
        setEtsyForm({
          sellingAccountId: e.sellingAccountId || "", title: e.title || "", listingId: e.listingId || "",
          tags: parsedTags, tagsInput: "", description: e.description || "",
          price: e.price ? String(e.price) : "", useSharedMainImage: e.useSharedMainImage ?? true,
          galleryImages: (() => { try { const g = JSON.parse(e.galleryImages || "[]"); return g.length ? g : [""]; } catch { return [""]; } })(),
          useSharedGallery: e.useSharedGallery ?? false, videoUrl: e.videoUrl || "",
          useAmazonVideo: e.useAmazonVideo ?? false, listingStatus: e.listingStatus || "ready",
          listingStatusReason: e.listingStatusReason || "",
        });
      } else {
        setEtsyForm((prev) => ({ ...prev, title: data.title || "", description: data.description || "" }));
      }
    } catch { toast.error("Lỗi tải ý tưởng"); }
    finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => {
    fetchIdea();
    fetch("/api/selling-accounts").then((r) => r.json()).then(setSellingAccounts).catch(() => { });
  }, [fetchIdea]);

  // ─── Actions ──────────────────────────────────────────────────────
  const handleReviewAction = async (overrideAction?: "approve" | "reject" | "revise", requestPhotos?: boolean, fulfillmentType?: "FBM" | "FBA") => {
    const action = overrideAction || actionType;
    if (!action) return;
    if ((action === "reject" || action === "revise") && !reviewComment.trim()) { toast.error("Vui lòng nhập lý do"); return; }
    setSaving(true);
    try {
      const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "revision_requested";
      const body: Record<string, unknown> = { status, reviewComment: reviewComment.trim() || undefined, version: idea.version };
      if (action === "approve" && requestPhotos) body.photoStatus = "awaiting_photos";
      if (action === "approve" && fulfillmentType === "FBA") body.fileStatus = "awaiting_file";
      if (fulfillmentType) body.fulfillmentType = fulfillmentType;
      const res = await fetch(`/api/ideas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(`Đã ${action === "approve" ? "duyệt" : action === "reject" ? "từ chối" : "yêu cầu sửa"} ý tưởng!${requestPhotos ? " Đã yêu cầu làm ảnh." : ""}`);
        if (action === "approve" || action === "reject") {
          if (autoNext) {
            const listRes = await fetch("/api/ideas?tab=reviewing");
            if (listRes.ok) { const list = await listRes.json(); const nextIdea = (list.data || list).find((i: any) => i.id !== id); if (nextIdea) { router.push(`/ideas/${nextIdea.id}`); return; } }
            router.push("/ideas");
          } else {
            fetchIdea(); setActionType(null); setReviewComment("");
          }
        } else { fetchIdea(); setActionType(null); setReviewComment(""); }
      } else { const error = await res.json(); toast.error(error.error || "Lỗi cập nhật ý tưởng"); }
    } catch { toast.error("Lỗi hệ thống"); }
    finally { setSaving(false); }
  };

  const handleDeleteIdea = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Đã xoá ý tưởng thành công!"); router.push("/ideas"); }
      else { const err = await res.json(); toast.error(err.error || "Không thể xoá ý tưởng này"); }
    } catch { toast.error("Lỗi mạng khi xoá ý tưởng"); }
    finally { setSaving(false); }
  };

  const handleSaveIdea = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...ideaForm, version: idea.version }) });
      if (res.ok) { toast.success("Đã cập nhật prompt!"); setEditOpen(false); fetchIdea(); }
      else { const data = await res.json(); toast.error(data.error || "Lỗi cập nhật"); }
    } catch { toast.error("Lỗi hệ thống"); }
    finally { setSaving(false); }
  };

  const handleUpdateIdea = async (fields: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, version: idea.version }) });
      if (res.ok) { toast.success("Đã cập nhật!"); fetchIdea(); }
      else { const data = await res.json(); toast.error(data.error || "Lỗi cập nhật"); }
    } catch { toast.error("Lỗi hệ thống"); }
    finally { setSaving(false); }
  };

  const handleChangeFulfillment = async () => {
    if (!pendingFulfillment) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fulfillmentType: pendingFulfillment, version: idea.version }) });
      if (res.ok) { toast.success("Đã đổi loại Fulfillment!"); fetchIdea(); }
      else { const data = await res.json(); toast.error(data.error || "Lỗi cập nhật"); }
    } catch { toast.error("Lỗi hệ thống"); }
    finally { setSaving(false); setChangeFulfillmentOpen(false); setPendingFulfillment(null); }
  };

  const handleSaveAmazon = async () => {
    console.log("=== START handleSaveAmazon ===");
    console.log("amzForm.asin value:", amzForm.asin);

    setSaving(true);
    try {
      let autoStatus = amzForm.listingStatus;
      if (autoStatus === "not_ready") {
        const title = amzForm.itemName;
        const highlights = amzForm.itemHighlights;
        const desc = amzForm.description;
        const tags = amzForm.tags;
        const slugs = amzForm.slugs;
        const validBullets = amzForm.bulletPoints.filter((b) => b.trim());
        const validGallery = amzForm.galleryImages.filter((g) => g.trim());
        const shared = amzForm.useSharedMainImage;
        if (title?.trim() && highlights?.trim() && desc?.trim() && tags?.trim() && slugs?.trim() && validBullets.length >= 5 && (shared || validGallery.length >= 9) && amzForm.sellingAccountId) {
          autoStatus = "ready";
        }
      }
      const payload = { ...amzForm, listingStatus: autoStatus, bulletPoints: amzForm.bulletPoints.filter((b) => b.trim()), galleryImages: amzForm.galleryImages.filter((g) => g.trim()) };
      console.log("Payload sent to API:", payload);

      const res = await fetch(`/api/ideas/${id}/amazon-listing`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("API response status:", res.status, res.ok);

      if (res.ok) {
        const data = await res.json();
        console.log("API response data (success):", data);
        toast.success("Đã lưu Amazon Listing!");
        setAmzEditOpen(false);
        fetchIdea();
      }
      else {
        const data = await res.json();
        console.error("API error response:", data);
        toast.error(data.error || "Lỗi lưu Amazon Listing");
      }
    } catch (err) {
      console.error("handleSaveAmazon caught error:", err);
      toast.error("Lỗi hệ thống");
    }
    finally { setSaving(false); }
  };

  const handleSaveEtsy = async () => {
    setSaving(true);
    try {
      let autoStatus = etsyForm.listingStatus;
      if (autoStatus === "not_ready") {
        const title = etsyForm.title;
        const desc = etsyForm.description;
        const tags = etsyForm.tags;
        const validGallery = etsyForm.galleryImages.filter((g) => g.trim());
        if (title?.trim() && desc?.trim() && tags?.length > 0 && etsyForm.sellingAccountId && (validGallery.length >= 9)) {
          autoStatus = "ready";
        }
      }
      const payloadEtsy = { ...etsyForm, listingStatus: autoStatus, tags: etsyForm.tags, galleryImages: etsyForm.galleryImages.filter((g) => g.trim()) };

      const res = await fetch(`/api/ideas/${id}/etsy-listing`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadEtsy),
      });
      if (res.ok) { toast.success("Đã lưu Etsy Listing!"); setEtsyEditOpen(false); fetchIdea(); }
      else { const data = await res.json(); toast.error(data.error || "Lỗi lưu Etsy Listing"); }
    } catch { toast.error("Lỗi hệ thống"); }
    finally { setSaving(false); }
  };

  const handleListingStatusChange = async (platform: "amazon" | "etsy", newStatus: string) => {
    if (platform === "amazon") {
      if (newStatus === "uploading") {
        const amz = idea?.amazonListing || {};
        const title = amz.itemName || amzForm.itemName;
        const highlights = amz.itemHighlights || amzForm.itemHighlights;
        const desc = amz.description || amzForm.description;
        const tags = amz.tags || amzForm.tags;
        const slugs = amz.slugs || amzForm.slugs;

        let bullets = [];
        try { bullets = typeof amz.bulletPoints === "string" ? JSON.parse(amz.bulletPoints) : (amz.bulletPoints || []); } catch { }
        if (bullets.length === 0) bullets = amzForm.bulletPoints;
        const validBullets = bullets.filter((b: string) => b && b.trim());

        let gallery = [];
        try { gallery = typeof amz.galleryImages === "string" ? JSON.parse(amz.galleryImages) : (amz.galleryImages || []); } catch { }
        if (gallery.length === 0) gallery = amzForm.galleryImages;
        const validGallery = gallery.filter((g: string) => g && g.trim());

        const missing = [];
        if (!title?.trim()) missing.push("Item Name");
        if (!highlights?.trim()) missing.push("Item Highlights");
        if (!desc?.trim()) missing.push("Description");
        if (validBullets.length < 5) missing.push(`Bullet Points (${validBullets.length}/5)`);
        if (!tags?.trim()) missing.push("Tags");
        if (!slugs?.trim()) missing.push("Slug");
        if (validGallery.length < 9 && !amz.useSharedMainImage) missing.push(`Ảnh (${validGallery.length}/9)`);

        if (missing.length > 0) {
          toast.error("Sản phẩm chưa đủ điều kiện up! Thiếu: " + missing.join(", "));
          return;
        }

        if (!amzForm.sellingAccountId && !idea?.amazonListing?.sellingAccountId) {
          toast.error("Vui lòng chọn tài khoản đăng bán trước khi chuyển sang 'Đang up'!");
          setAmzEditOpen(true);
          return;
        }
      }
      if (newStatus === "selling") {
        const currentAsin = idea?.amazonListing?.asin || amzForm.asin;
        const currentFnsku = idea?.amazonListing?.fnskuCode || amzForm.fnskuCode;
        const currentLabel = idea?.amazonListing?.fnskuLabelFileUrl || amzForm.fnskuLabelFileUrl;
        if (!currentAsin) {
          toast.error("Vui lòng nhập ASIN trước khi chuyển sang 'Đã lên'!");
          setAmzEditOpen(true);
          return;
        }
        if (!currentFnsku && !currentLabel) {
          toast.error("Vui lòng thêm FNSKU hoặc Label trước!");
          setAmzEditOpen(true);
          return;
        }
      }
      if (newStatus === "error" || newStatus === "delisted") {
        if (!amzForm.listingStatusReason && !idea?.amazonListing?.listingStatusReason) { toast.error(`Vui lòng nhập lý do ${newStatus === "error" ? "lỗi" : "bị gỡ"}!`); setAmzEditOpen(true); return; }
      }

      setAmzForm((prev) => ({ ...prev, listingStatus: newStatus }));

      try {
        const res = await fetch(`/api/ideas/${id}/amazon-listing`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingStatus: newStatus }),
        });
        if (res.ok) {
          toast.success(`Trạng thái: ${(listingStatusLabels as Record<string, string>)[newStatus] || newStatus}`);
          fetchIdea();
        } else {
          const err = await res.json();
          toast.error(err.error || "Lỗi cập nhật trạng thái");
          setAmzForm(prev => ({ ...prev, listingStatus: idea?.amazonListing?.listingStatus || "ready" }));
        }
      } catch (err) {
        toast.error("Lỗi hệ thống");
        setAmzForm(prev => ({ ...prev, listingStatus: idea?.amazonListing?.listingStatus || "ready" }));
      }
    } else if (platform === "etsy") {
      if (newStatus === "uploading") {
        const etsy = idea?.etsyListing || {};
        const title = etsy.title || etsyForm.title;
        const desc = etsy.description || etsyForm.description;
        const price = etsy.price || etsyForm.price;

        let tags = [];
        try { tags = typeof etsy.tags === "string" ? JSON.parse(etsy.tags) : (etsy.tags || []); } catch { }
        if (tags.length === 0) tags = etsyForm.tags;

        let gallery = [];
        try { gallery = typeof etsy.galleryImages === "string" ? JSON.parse(etsy.galleryImages) : (etsy.galleryImages || []); } catch { }
        if (gallery.length === 0) gallery = etsyForm.galleryImages;
        const validGallery = gallery.filter((g: string) => g && g.trim());

        const missing = [];
        if (!title?.trim()) missing.push("Title");
        if (!desc?.trim()) missing.push("Description");
        if (tags.length === 0) missing.push("Tags");
        if (!price) missing.push("Giá");
        if (validGallery.length === 0 && !etsy.useSharedGallery) missing.push("Gallery Images");

        if (missing.length > 0) {
          toast.error("Sản phẩm chưa đủ điều kiện up! Thiếu: " + missing.join(", "));
          return;
        }

        if (!etsyForm.sellingAccountId && !idea?.etsyListing?.sellingAccountId) {
          toast.error("Vui lòng chọn tài khoản đăng bán trước khi chuyển sang 'Đang up'!");
          setEtsyEditOpen(true);
          return;
        }
      }
      if (newStatus === "selling") {
        if (!etsyForm.listingId && !idea?.etsyListing?.listingId) {
          toast.error("Vui lòng nhập Listing ID trước khi chuyển sang 'Đã lên'!");
          setEtsyEditOpen(true);
          return;
        }
      }
      if (newStatus === "error" || newStatus === "delisted") {
        if (!etsyForm.listingStatusReason && !idea?.etsyListing?.listingStatusReason) { toast.error(`Vui lòng nhập lý do ${newStatus === "error" ? "lỗi" : "bị gỡ"}!`); setEtsyEditOpen(true); return; }
      }

      setEtsyForm((prev) => ({ ...prev, listingStatus: newStatus }));

      try {
        const res = await fetch(`/api/ideas/${id}/etsy-listing`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingStatus: newStatus }),
        });
        if (res.ok) {
          toast.success(`Trạng thái: ${(listingStatusLabels as Record<string, string>)[newStatus] || newStatus}`);
          fetchIdea();
        } else {
          const err = await res.json();
          toast.error(err.error || "Lỗi cập nhật trạng thái Etsy");
          setEtsyForm(prev => ({ ...prev, listingStatus: idea?.etsyListing?.listingStatus || "ready" }));
        }
      } catch (err) {
        toast.error("Lỗi hệ thống");
        setEtsyForm(prev => ({ ...prev, listingStatus: idea?.etsyListing?.listingStatus || "ready" }));
      }
    }
  };

  // ─── Render ───────────────────────────────────────────────────────
  const renderPhotoGallery = (platform: "amazon" | "etsy", listing: any, form: any, setEditOpen: (val: boolean) => void, handleUpdateListing: (data: any) => Promise<void>) => {
    const images = (form.galleryImages || []).filter(Boolean);
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
        <div className="flex flex-row overflow-x-auto gap-2 pb-2 scrollbar-thin">
          {cells.map((img, i) =>
            img ? (
              <ImagePreviewDialog key={i} images={images as string[]} initialIndex={i}>
                <div className="w-16 h-16 shrink-0 bg-muted/40 border border-dashed border-muted-foreground/30 rounded flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                  <img src={driveToThumbnailUrl(img as string, 150)} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              </ImagePreviewDialog>
            ) : (
              <div key={i} className="w-16 h-16 shrink-0 bg-muted/40 border border-dashed border-muted-foreground/30 rounded flex items-center justify-center overflow-hidden cursor-not-allowed">
                <span className="text-[10px] text-muted-foreground text-center px-1">Chưa có ảnh</span>
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

          {canManagePhotos && pStatus === "awaiting_photos" && assigneeId && (
            <Button size="sm" className="w-full h-7 text-xs" variant="ghost" onClick={() => handleUpdateListing({ photoAssigneeId: null })} disabled={saving}>
              <XCircle className="h-3 w-3 mr-1" /> Gỡ người nhận
            </Button>
          )}

          {canManagePhotos && pStatus === "pending_approval" && (
            <div className="space-y-1.5">
              <Button size="sm" className="w-full h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleUpdateListing({ photoStatus: "approved" })} disabled={saving}>
                <ShieldCheck className="h-3 w-3 mr-1" /> Duyệt ảnh
              </Button>
              <div className="flex gap-1">
                <Input value={photoRevisionInput} onChange={(e) => setPhotoRevisionInput(e.target.value)} placeholder="Lý do sửa..." className="h-7 text-xs flex-1" />
                <Button size="sm" className="h-7 text-xs px-2" variant="outline" onClick={() => {
                  if (!photoRevisionInput.trim()) { toast.error("Nhập lý do"); return; }
                  handleUpdateListing({ photoStatus: "revision_requested", photoRevisionNote: photoRevisionInput.trim() });
                  setPhotoRevisionInput("");
                }} disabled={saving}>Sửa</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!idea) return null;

  const sourceLinks: string[] = (() => { try { return JSON.parse(idea.sourceLinks || "[]"); } catch { return []; } })();
  const canApprove = role && can(role, "approve_idea") && (idea.status === "reviewing" || idea.status === "revision_requested");
  const canManagePhotos = role && can(role, "assign_photo_task");
  const inProduction = (idea.amazonListing?.listingStatus === "published" || idea.etsyListing?.listingStatus === "published") || idea.fileStatus === "approved" || !!idea.productionFileUrl;
  const deleteContext = (() => {
    if (!role) return { canDelete: false, reason: "Chưa đăng nhập" };
    if (inProduction) return { canDelete: false, reason: "Ý tưởng đã đi vào sản xuất hoặc đăng bán" };
    if (role === "employee") {
      if (idea.createdById !== session?.user?.id) return { canDelete: false, reason: "Bạn chỉ có thể xoá ý tưởng của chính mình" };
      if (!(idea.status === "reviewing" || (idea.status === "approved" && (idea.photoStatus === "not_requested" || idea.photoStatus === "awaiting_photos") && idea.fileStatus !== "approved" && !idea.productionFileUrl))) {
        return { canDelete: false, reason: "Trạng thái hiện tại không cho phép xoá" };
      }
    }
    return { canDelete: true, reason: "" };
  })();
  const mainImageDirectUrl = convertToDirectImageUrl(idea.mainImageUrl);
  const isPartner = (idea as Record<string, unknown>).source === "partner";
  const isNotApproved = idea.status === "reviewing";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* ═══════════════ MAIN 2-COLUMN LAYOUT ═══════════════ */}
        <div className="flex-1 flex overflow-hidden">

          {/* ─── LEFT COLUMN: Header + Content + Tabs ─── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

            {/* ═══ HEADER BAR ═══ */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b bg-background/80 backdrop-blur-sm">
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => {
                const initialLen = parseInt(sessionStorage.getItem("initial_history_length") || "0");
                if (window.history.length > initialLen) {
                  router.back();
                } else {
                  router.push("/ideas");
                }
              }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold tracking-tight">{idea.msku}</h1>
                  {statusBadge(idea.status, ideaStatusLabels)}
                  {idea.needsReReview && <Badge variant="destructive" className="animate-pulse text-[10px]">Sửa đổi mới</Badge>}

                  <Badge variant="outline" className="text-[10px]">
                    {idea.amazonListing?.fulfillmentType || "FBM"}
                  </Badge>

                  {isPartner && <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-[10px]">Đối tác</Badge>}
                  {(idea as Record<string, unknown>).source === "boss" && <Badge className="bg-purple-600 text-white text-[10px]">Sếp</Badge>}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tạo bởi {idea.createdBy.fullName} · {idea.topic.name} · {idea.aiModel.name}
                  {isPartner && (idea as any).partner && <> · Đối tác: {String((idea as any).partner.name)}</>}
                </p>
              </div>

              {/* Action buttons — right side */}
              <div className="flex items-center gap-1 shrink-0">
                {/* 1. Edit */}
                <Tooltip><TooltipTrigger asChild>
                  <Sheet open={editOpen} onOpenChange={setEditOpen}>
                    <SheetTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={(idea.amazonListing?.listingStatus === "published" || idea.etsyListing?.listingStatus === "published")}><Pencil className="h-3.5 w-3.5" /></Button></SheetTrigger>
                    <SheetContent side="right" className="w-[520px] sm:max-w-[520px] p-6 z-[100]">
                      <SheetHeader className="mb-4"><SheetTitle>Chỉnh sửa nội dung</SheetTitle><SheetDescription>{idea.msku}</SheetDescription></SheetHeader>
                      <div className="flex-1 overflow-y-auto pr-1">
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <Label htmlFor="ep" className="text-xs flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-amber-500" /> Prompt</Label>
                            <Textarea id="ep" value={ideaForm.prompt} onChange={e => setIdeaForm({ prompt: e.target.value })} placeholder="Nhập prompt..." rows={8} className="resize-none text-sm" />
                            <p className="text-[10px] text-muted-foreground">Prompt dùng để lưu trữ và tái sử dụng khi cần tạo sản phẩm tương tự.</p>
                          </div>
                          <Separator />
                          <div className="space-y-2">
                            <Label htmlFor="eimg" className="text-xs flex items-center gap-1.5"><ImageIcon className="h-3 w-3 text-blue-500" /> Ảnh main (URL)</Label>
                            <Input id="eimg" value={idea.mainImageUrl || ""} onChange={e => handleUpdateIdea({ mainImageUrl: e.target.value })} placeholder="https://drive.google.com/file/d/..." className="h-9 text-sm" />
                            <p className="text-[10px] text-muted-foreground">Link Google Drive hoặc link ảnh trực tiếp.</p>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => { setIdeaForm({ prompt: idea.prompt || "" }); }}><X className="h-4 w-4 mr-1" /> Đặt lại</Button>
                            <Button onClick={handleSaveIdea} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Lưu</Button>
                          </div>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </TooltipTrigger><TooltipContent sideOffset={5} className="z-[100]">Sửa prompt & ảnh</TooltipContent></Tooltip>

                {/* 2. Make a Copy */}
                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/ideas/new?cloneFrom=${id}`)} disabled={saving}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger><TooltipContent sideOffset={5} className="z-[100]">Tạo bản sao</TooltipContent></Tooltip>

                {/* 3. History */}
                <Tooltip><TooltipTrigger asChild>
                  <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                    <SheetTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><History className="h-4 w-4" /></Button></SheetTrigger>
                    <SheetContent side="right" className="w-[480px] sm:max-w-[480px] z-[100]">
                      <SheetHeader><SheetTitle>Lịch sử thay đổi</SheetTitle><SheetDescription>{idea.msku}</SheetDescription></SheetHeader>
                      <div className="mt-4 overflow-y-auto max-h-[calc(100vh-10rem)]">
                        <AuditLogViewer ideaId={id} />
                      </div>
                    </SheetContent>
                  </Sheet>
                </TooltipTrigger><TooltipContent sideOffset={5} className="z-[100]">Lịch sử thay đổi</TooltipContent></Tooltip>

                {/* 4. Delete */}
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={deleteContext.canDelete ? "h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" : "h-8 w-8 text-muted-foreground opacity-50 cursor-not-allowed"}
                          disabled={saving || !deleteContext.canDelete}
                          onClick={() => document.getElementById("trigger-delete")?.click()}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={5} className="z-[100]">{deleteContext.canDelete ? "Xoá ý tưởng" : deleteContext.reason}</TooltipContent>
                  </Tooltip>
                  {deleteContext.canDelete && (
                    <AlertDialogTrigger className="hidden" id="trigger-delete" />
                  )}
                  {deleteContext.canDelete && (
                    <AlertDialogContent className="z-[100]">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          {((idea.amazonListing?.listingStatus === "published" || idea.etsyListing?.listingStatus === "published") || idea.productionRequests?.length > 0) && <AlertTriangle className="h-5 w-5 text-red-500" />}
                          Xác nhận xoá {idea.msku}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="space-y-2">
                            {(idea.amazonListing?.listingStatus === "published" || idea.etsyListing?.listingStatus === "published") && (
                              <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-2.5 border border-red-200 dark:border-red-800">
                                <p className="text-xs font-medium text-red-800 dark:text-red-300">⚠️ Ý tưởng này đã được đăng bán!</p>
                                <p className="text-[10px] text-red-700 dark:text-red-400 mt-1">
                                  {idea.amazonListing?.listingStatus === "published" ? "• Đã có Amazon Listing" : ""}
                                  {idea.etsyListing?.listingStatus === "published" ? `${idea.amazonListing?.listingStatus === "published" ? "\n" : ""}• Đã có Etsy Listing` : ""}
                                </p>
                                <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">Xoá sẽ làm mất toàn bộ thông tin đăng bán và dữ liệu liên quan.</p>
                              </div>
                            )}
                            {idea.productionRequests && idea.productionRequests.length > 0 && (
                              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-2.5 border border-amber-200 dark:border-amber-800">
                                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">⚠️ Đang có {idea.productionRequests.length} yêu cầu sản xuất!</p>
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Xoá ý tưởng sẽ xoá luôn tất cả yêu cầu sản xuất liên quan.</p>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">Hành động này không thể hoàn tác.</p>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Huỷ</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteIdea} className="bg-red-600 hover:bg-red-700">Xoá</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  )}
                </AlertDialog>

                {idea.status === "revision_requested" && (idea.createdById === session?.user?.id || role === "boss" || role === "manager") && (
                  <Button variant="outline" size="sm" className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 ml-1.5" onClick={() => handleUpdateIdea({ status: "reviewing" })} disabled={saving}>
                    <Upload className="mr-1 h-3.5 w-3.5" /> Gửi lại duyệt
                  </Button>
                )}

                {canApprove && idea.status === "reviewing" && (
                  <div className="flex gap-2 ml-1.5 pl-1.5 border-l">
                    <Dialog open={actionType === "reject" || actionType === "revise"} onOpenChange={(open) => !open && setActionType(null)}>
                      <DialogTrigger asChild>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => setActionType("reject")}>Từ chối</Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => setActionType("revise")}>Yêu cầu sửa</Button>
                        </div>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>{actionType === "reject" ? "Từ chối?" : "Yêu cầu sửa?"}</DialogTitle></DialogHeader>
                        <div className="mt-2 space-y-3">
                          <Label htmlFor="rc">Lý do (Bắt buộc)</Label>
                          <Textarea id="rc" autoFocus value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReviewAction(); } }}
                            placeholder="Nhập lý do..." rows={4} className="resize-none" />
                        </div>
                        <div className="mt-3 flex justify-between items-center gap-2">
                          <div className="flex items-center gap-2 pl-1">
                            <Checkbox id="auto-next-reject" checked={autoNext} onCheckedChange={(v) => setAutoNext(!!v)} />
                            <Label htmlFor="auto-next-reject" className="text-xs text-muted-foreground cursor-pointer">Tự động sang bài kế tiếp</Label>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => { setActionType(null); setReviewComment(""); }}>Huỷ</Button>
                            <Button onClick={() => handleReviewAction()} disabled={saving} className={actionType === "reject" ? "bg-red-600" : "bg-amber-600"}>
                              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Xác nhận {actionType === "reject" ? "từ chối" : "yêu cầu sửa"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <div className="flex items-center gap-1.5 ml-1 bg-muted/30 p-1 rounded-md">
                      <div className="flex gap-1">
                        <TooltipProvider><Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" className="h-8 text-xs px-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleReviewAction("approve", true, "FBM")} disabled={saving}><ImageIcon className="mr-1 h-3.5 w-3.5" /> Duyệt FBM</Button>
                          </TooltipTrigger>
                          <TooltipContent>Ý tưởng đã chốt, yêu cầu nhân viên làm ảnh</TooltipContent>
                        </Tooltip></TooltipProvider>
                        <TooltipProvider><Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs px-2 border-green-300 text-green-700 hover:bg-green-50" onClick={() => handleReviewAction("approve", false, "FBA")} disabled={saving}><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Duyệt FBA</Button>
                          </TooltipTrigger>
                          <TooltipContent>Sản xuất hàng loạt, đợi file sx + sp thật rồi mới chụp</TooltipContent>
                        </Tooltip></TooltipProvider>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 border-l border-border/50 ml-1">
                        <Checkbox id="auto-next-approve" checked={autoNext} onCheckedChange={(v) => setAutoNext(!!v)} />
                        <Label htmlFor="auto-next-approve" className="text-[10px] text-muted-foreground cursor-pointer leading-tight">Auto<br />Next</Label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ═══ CONTENT AREA ═══ */}
            <div className="flex-1 flex flex-col overflow-hidden px-4 pt-2 pb-2">

              {/* Review Comment — shown inline if exists and not approved */}
              {idea.reviewComment && idea.status !== "approved" && (
                <div className={`shrink-0 rounded-lg border p-3 mb-3 ${idea.status === "rejected" ? "border-red-200 bg-red-100 dark:bg-red-900/30" : "border-orange-200 bg-orange-100 dark:bg-orange-900/30"}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquareWarning className={`h-3 w-3 ${idea.status === "rejected" ? "text-red-600" : "text-orange-600"}`} />
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${idea.status === "rejected" ? "text-red-800 dark:text-red-300" : "text-orange-800 dark:text-orange-300"}`}>Ghi chú Sếp/QL</span>
                  </div>
                  <p className={`text-xs whitespace-pre-wrap ${idea.status === "rejected" ? "text-red-800 dark:text-red-300" : "text-orange-800 dark:text-orange-300"}`}>{idea.reviewComment}</p>
                </div>
              )}





              {/* ── Tabs: Amazon / Etsy ── */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <Tabs defaultValue="amazon" className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex items-center justify-between shrink-0 mb-1">
                    <TabsList className="w-fit">
                      <TabsTrigger value="amazon" className="text-xs gap-1">
                        <ShoppingBag className="h-3 w-3" /> Amazon{idea.amazonListing && statusBadge(idea.amazonListing.listingStatus || "ready", listingStatusLabels)}
                      </TabsTrigger>
                      <TabsTrigger value="etsy" className="text-xs gap-1">
                        <Store className="h-3 w-3" /> Etsy{idea.etsyListing && statusBadge(idea.etsyListing.listingStatus || "ready", listingStatusLabels)}
                      </TabsTrigger>
                    </TabsList>
                    {isNotApproved && !isPartner && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-amber-600 dark:text-amber-400 text-[10px] ml-auto">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span>Ý tưởng chưa duyệt, chưa thể chỉnh sửa Content Amz, Etsy</span>
                      </div>
                    )}
                  </div>

                  {/* ─── Amazon Tab ─── */}
                  <TabsContent value="amazon" className="flex-1 overflow-y-auto mt-2 space-y-3 data-[state=inactive]:hidden pr-1 relative">
                    <fieldset disabled={isNotApproved && !isPartner} className="space-y-3">
                      {/* FBA/FBM — belongs to Amazon */}

                      {/* Amazon Listing Card */}
                      <Card>
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-base font-bold flex items-center gap-2">
                            Amazon Listing
                            {idea.amazonListing?.fulfillmentType && (
                              <Badge variant="outline" className="text-[11px] ml-1 font-normal bg-muted/50">
                                {idea.amazonListing.fulfillmentType}
                              </Badge>
                            )}
                            {role !== "employee" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                disabled={saving}
                                onClick={() => {
                                  const target = idea.amazonListing?.fulfillmentType === "FBA" ? "FBM" : "FBA";
                                  if (idea.status !== "reviewing") {
                                    setPendingFulfillment(target);
                                    setChangeFulfillmentOpen(true);
                                  } else {
                                    handleUpdateIdea({ fulfillmentType: target });
                                  }
                                }}
                              >
                                Chuyển sang {idea.amazonListing?.fulfillmentType === "FBA" ? "FBM" : "FBA"}?
                              </Button>
                            )}
                            <div className="mx-2 h-4 w-px bg-border"></div>
                            <div className="flex items-center gap-1.5 ml-1">
                              {statusBadge(idea.amazonListing?.listingStatus || "ready", listingStatusLabels)}
                              {(NEXT_STATUS[idea.amazonListing?.listingStatus || "ready"] || []).map(opt => (
                                <Button key={opt.next} size="sm" className={`h-6 px-2 text-[10px] text-white ${opt.className}`}
                                  onClick={() => handleListingStatusChange("amazon", opt.next)} disabled={saving}>{opt.label}</Button>
                              ))}
                            </div>
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            {role !== "employee" && <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setAmzForm(idea.amazonListing || { ideaId: id, listingStatus: "ready", fulfillmentType: idea.fulfillmentType || "FBA" }); setAmzEditOpen(true); }}><Edit3 className="h-3.5 w-3.5 mr-1.5" /> Sửa</Button>}
                          </div>
                        </CardHeader>
                        <CardContent className="text-sm pt-2">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* ─── LEFT COLUMN: INFORMATION & GALLERY & PREMIUM CONTENT ─── */}
                            <div className="space-y-6">
                              {/* INFORMATION */}
                              <div className="space-y-3">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Information</span>

                                <div className="space-y-2">
                                  {/* Row 1: Selling Account & Price */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="group/acc flex flex-col justify-center rounded-md bg-muted/40 px-2.5 py-1.5 border border-transparent hover:border-border/50 transition-colors">
                                      <span className="text-[10px] text-muted-foreground block mb-0.5">Selling Account</span>
                                      <span className="text-xs font-medium line-clamp-1">
                                        {sellingAccounts.find(a => a.id === idea.amazonListing?.sellingAccountId)?.name || "—"}
                                      </span>
                                    </div>
                                    <div className="group/price flex flex-col justify-center rounded-md bg-muted/40 px-2.5 py-1.5 border border-transparent hover:border-border/50 transition-colors">
                                      <span className="text-[10px] text-muted-foreground block mb-0.5">Price</span>
                                      <span className="text-xs font-medium">${idea.amazonListing?.price || "—"}</span>
                                    </div>
                                  </div>

                                  {/* Row 2: SKU & ASIN */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="group/sku flex flex-col justify-center rounded-md bg-muted/40 px-2.5 py-1.5 border border-transparent hover:border-border/50 transition-colors">
                                      <span className="text-[10px] text-muted-foreground block mb-0.5">SKU</span>
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono font-medium truncate">{idea.amazonListing?.sku || idea.sku || "—"}</span>
                                        {(idea.amazonListing?.sku || idea.sku) && <CopyButton text={idea.amazonListing?.sku || idea.sku} className="shrink-0 h-4 w-4 opacity-0 group-hover/sku:opacity-100 transition-opacity" />}
                                      </div>
                                    </div>
                                    <div className="group/asin flex flex-col justify-center rounded-md bg-muted/40 px-2.5 py-1.5 border border-transparent hover:border-border/50 transition-colors">
                                      <span className="text-[10px] text-muted-foreground block mb-0.5">ASIN</span>
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono font-medium truncate">{idea.amazonListing?.asin || "—"}</span>
                                        {idea.amazonListing?.asin && (
                                          <div className="flex items-center gap-1 opacity-0 group-hover/asin:opacity-100 transition-opacity">
                                            <a href={`https://www.amazon.com/dp/${idea.amazonListing.asin}`} target="_blank" rel="noopener noreferrer" className="h-4 w-4 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded"><ExternalLink className="h-3 w-3" /></a>
                                            <CopyButton text={idea.amazonListing.asin} className="h-4 w-4" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Row 3: FNSKU & Print Label combined */}
                                  <div className="group/fnsku flex items-center justify-between rounded-md bg-muted/40 p-2 border border-transparent hover:border-border/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                      {/* Thumbnail */}
                                      {idea.amazonListing?.fnskuLabelFileUrl ? (
                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <div className="shrink-0 w-12 h-8 rounded border bg-white cursor-pointer hover:ring-2 hover:ring-primary/50 overflow-hidden">
                                              <img src={convertToDirectImageUrl(idea.amazonListing.fnskuLabelFileUrl) || idea.amazonListing.fnskuLabelFileUrl} alt="Label" className="w-full h-full object-contain" />
                                            </div>
                                          </DialogTrigger>
                                          <DialogContent className="max-w-[90vw] sm:max-w-[90vw] max-h-[90vh] bg-transparent border-none shadow-none !ring-0 p-0" showCloseButton={false}>
                                            <img src={convertToDirectImageUrl(idea.amazonListing.fnskuLabelFileUrl) || idea.amazonListing.fnskuLabelFileUrl} alt="Label" className="max-w-[90vw] max-h-[90vh] object-contain rounded-md" />
                                          </DialogContent>
                                        </Dialog>
                                      ) : (
                                        <div className="shrink-0 w-12 h-8 rounded border bg-muted/50 flex items-center justify-center">
                                          <span className="text-[8px] text-muted-foreground">No Label</span>
                                        </div>
                                      )}

                                      <div className="flex flex-col">
                                        <span className="text-[10px] text-muted-foreground">FNSKU</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs font-mono font-medium">{idea.amazonListing?.fnskuCode || "—"}</span>
                                          {idea.amazonListing?.fnskuCode && <CopyButton text={idea.amazonListing.fnskuCode} className="h-3 w-3 opacity-0 group-hover/fnsku:opacity-100 transition-opacity" />}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Print Controls */}
                                    {idea.amazonListing?.fnskuCode && idea.amazonListing?.fnskuLabelFileUrl && (
                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                          <Label className="text-[10px] text-muted-foreground shrink-0">SL:</Label>
                                          <Input
                                            type="number" min={1} max={99}
                                            className="w-12 h-7 text-xs text-center px-1"
                                            value={labelPrintQty}
                                            onChange={(e) => setLabelPrintQty(Math.max(1, parseInt(e.target.value) || 1))}
                                          />
                                        </div>
                                        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => {
                                          const li = convertToDirectImageUrl(idea.amazonListing?.fnskuLabelFileUrl || "") || idea.amazonListing?.fnskuLabelFileUrl;
                                          const w = window.open("", "_blank", "width=600,height=400");
                                          if (w) {
                                            const imgs = Array(labelPrintQty).fill(`<img src="${li}" alt="Label" onerror="this.remove()">`).join("");
                                            w.document.write('<!DOCTYPE html><html><head><title>Label</title>' +
                                              '<style>' +
                                              '@page{size:5cm 3cm;margin:0}' +
                                              '@media print{html,body{margin:0;padding:0}img{page-break-after:always}}' +
                                              'body{margin:0;padding:0;background:#fff;display:flex;flex-direction:column;align-items:center}' +
                                              'img{display:block;width:5cm;height:3cm;object-fit:contain}' +
                                              '</style></head><body>' + imgs + '<script>' +
                                              'var all=document.querySelectorAll("img"),n=all.length,ok=0;' +
                                              'if(n===0){window.print();window.close()}' +
                                              'all.forEach(function(img){img.onload=function(){ok++;if(ok===n)setTimeout(function(){window.print();window.close()},300)};' +
                                              'img.onerror=function(){img.remove();ok++;if(ok===n)setTimeout(function(){window.print();window.close()},300)}});' +
                                              '<' + '/script></body></html>');
                                            w.document.close();
                                          }
                                        }}>
                                          <Printer className="h-3 w-3" /> In
                                        </Button>
                                      </div>
                                    )}
                                  </div>

                                </div>
                              </div>

                              <Separator />

                              {/* GALLERY */}
                              <div className="pb-2">
                                {renderPhotoGallery("amazon", idea.amazonListing, amzForm, setAmzEditOpen, async (data) => {
                                  try {
                                    setSaving(true);
                                    const res = await fetch(`/api/ideas/${id}/amazon-listing`, { method: "PUT", body: JSON.stringify(data) });
                                    if (!res.ok) throw new Error("Lỗi");
                                    await fetchIdea();
                                  } catch (err) { toast.error("Lỗi cập nhật ảnh Amazon"); }
                                  finally { setSaving(false); }
                                })}
                              </div>

                              <Separator />

                              {/* PREMIUM CONTENT */}
                              <div className="space-y-3 pb-2">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Premium Content</span>
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="group/video rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative flex flex-col justify-center">
                                      <span className="text-[10px] text-muted-foreground block mb-1">Video</span>
                                      {idea.amazonListing?.videoUrl ? (
                                        <a href={idea.amazonListing.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline line-clamp-1 break-all"><ExternalLink className="h-3 w-3 shrink-0" /> <span className="truncate">{idea.amazonListing.videoUrl}</span></a>
                                      ) : <p className="text-xs text-muted-foreground">—</p>}
                                      {idea.amazonListing?.videoUrl && <CopyButton text={idea.amazonListing.videoUrl} className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/video:opacity-100 transition-opacity bg-background" />}
                                    </div>

                                    <div className="group/aplus rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative flex flex-col justify-center">
                                      <span className="text-[10px] text-muted-foreground block mb-1">Content A+</span>
                                      {idea.amazonListing?.contentAPlusUrl ? (
                                        <a href={idea.amazonListing.contentAPlusUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline line-clamp-1 break-all"><ExternalLink className="h-3 w-3 shrink-0" /> <span className="truncate">{idea.amazonListing.contentAPlusUrl}</span></a>
                                      ) : <p className="text-xs text-muted-foreground">—</p>}
                                      {idea.amazonListing?.contentAPlusUrl && <CopyButton text={idea.amazonListing.contentAPlusUrl} className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/aplus:opacity-100 transition-opacity bg-background" />}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* ─── RIGHT COLUMN: CONTENT ─── */}
                            <div className="space-y-3 lg:col-span-2">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Content</span>

                              <div className="group/iname flex flex-col justify-center rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative">
                                <div className="flex items-center gap-2 mb-1"><span className="text-[10px] text-muted-foreground block">Title (Item Name)</span><Badge variant="outline" className="text-[9px] font-mono font-medium h-4 px-1.5 border-primary/20 bg-primary/5 text-primary/70">75 ký tự max</Badge></div>
                                <span className="text-sm font-medium pr-6">{idea.amazonListing?.itemName || "—"}</span>
                                {idea.amazonListing?.itemName && <CopyButton text={idea.amazonListing.itemName} className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/iname:opacity-100 transition-opacity bg-background" />}
                              </div>

                              <div className="group/ihigh flex flex-col justify-center rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative">
                                <div className="flex items-center gap-2 mb-1"><span className="text-[10px] text-muted-foreground block">Item Highlights</span><Badge variant="outline" className="text-[9px] font-mono font-medium h-4 px-1.5 border-primary/20 bg-primary/5 text-primary/70">125 ký tự max</Badge></div>
                                <span className="text-xs pr-6">{idea.amazonListing?.itemHighlights || "—"}</span>
                                {idea.amazonListing?.itemHighlights && <CopyButton text={idea.amazonListing.itemHighlights} className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/ihigh:opacity-100 transition-opacity bg-background" />}
                              </div>

                              <div className="group/idesc flex flex-col rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative">
                                <div className="flex items-center gap-2 mb-1.5"><span className="text-[10px] text-muted-foreground block">Description</span><Badge variant="outline" className="text-[9px] font-mono font-medium h-4 px-1.5 border-primary/20 bg-primary/5 text-primary/70">500 - 2000 ký tự</Badge></div>
                                <div className="text-xs whitespace-pre-wrap text-muted-foreground pr-6 max-h-32 overflow-y-auto custom-scrollbar">
                                  {idea.amazonListing?.description || "—"}
                                </div>
                                {idea.amazonListing?.description && <CopyButton text={idea.amazonListing.description} className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/idesc:opacity-100 transition-opacity bg-background" />}
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 px-1"><span className="text-[10px] text-muted-foreground block">Bullet Points</span><Badge variant="outline" className="text-[9px] font-mono font-medium h-4 px-1.5 border-primary/20 bg-primary/5 text-primary/70">5 bullets, 255 ký tự max/bullet</Badge></div>
                                {(() => {
                                  try {
                                    const bps = JSON.parse(idea.amazonListing?.bulletPoints || "[]").filter(Boolean);
                                    if (bps.length === 0) return <p className="text-xs text-muted-foreground px-1">—</p>;
                                    return (
                                      <div className="space-y-1.5">
                                        {bps.map((bp: string, i: number) => (
                                          <div key={i} className="group/bp rounded-md bg-muted/30 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative flex items-start gap-2">
                                            <span className="text-[10px] font-bold text-muted-foreground/50 mt-0.5 select-none w-3 shrink-0">{i + 1}.</span>
                                            <p className="text-xs pr-6 leading-relaxed">{bp}</p>
                                            <CopyButton text={bp} className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/bp:opacity-100 transition-opacity bg-background" />
                                          </div>
                                        ))}
                                        <div className="flex justify-end pt-1">
                                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 py-1" onClick={() => { navigator.clipboard.writeText(bps.join("\n")); toast.success("Đã copy toàn bộ Bullets"); }}><Copy className="h-3 w-3 mr-1.5" /> Copy toàn bộ Bullets</Button>
                                        </div>
                                      </div>
                                    );
                                  } catch { return <p className="text-xs text-muted-foreground px-1">—</p>; }
                                })()}
                              </div>

                              <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="group/itags flex flex-col rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative overflow-hidden">
                                  <div className="flex items-center gap-2 mb-1.5 shrink-0"><span className="text-[10px] text-muted-foreground block">Tags</span><Badge variant="outline" className="text-[9px] font-mono font-medium h-4 px-1.5 border-primary/20 bg-primary/5 text-primary/70">500 ký tự max</Badge></div>
                                  {(() => {
                                    const tags = (idea.amazonListing?.tags || "").split(";").filter(Boolean);
                                    if (tags.length === 0) return <p className="text-xs text-muted-foreground">—</p>;
                                    return (
                                      <div className="flex flex-wrap gap-1 pr-6 max-h-24 overflow-y-auto custom-scrollbar content-start">
                                        {tags.map((t: string, i: number) =>
                                          <Badge key={i} variant="secondary" className="text-xs py-1 px-2.5 font-normal group/tag flex items-center shrink-0 overflow-hidden transition-all duration-300">
                                            <span>{t.trim()}</span>
                                            <div className="flex items-center gap-1 w-0 opacity-0 group-hover:w-12 group-hover:opacity-100 group-hover:ml-1.5 transition-all duration-300 overflow-hidden justify-end">
                                              <a title="Search on Amazon" href={`https://www.amazon.com/s?k=${encodeURIComponent(t.trim())}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 bg-background/80 rounded shrink-0"><ExternalLink className="h-3 w-3" /></a>
                                              <a title="Search on Etsy" href={`https://www.etsy.com/search?q=${encodeURIComponent(t.trim())}&ref=search_bar&instant_download=false`} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-700 bg-background/80 rounded shrink-0"><ShoppingBag className="h-3 w-3" /></a>
                                            </div>
                                          </Badge>
                                        )}
                                        <CopyButton text={idea.amazonListing?.tags || ""} className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/itags:opacity-100 transition-opacity bg-background" />
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div className="group/islug flex flex-col rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative">
                                  <div className="flex items-center gap-2 mb-1.5"><span className="text-[10px] text-muted-foreground block">Slugs</span><Badge variant="outline" className="text-[9px] font-mono font-medium h-4 px-1.5 border-primary/20 bg-primary/5 text-primary/70">12 slugs max</Badge></div>
                                  {(() => {
                                    const slugs = (idea.amazonListing?.slugs || "").split("\n").filter(Boolean);
                                    if (slugs.length === 0) return <p className="text-xs text-muted-foreground">—</p>;
                                    return (
                                      <div className="flex flex-col gap-1 pr-6 max-h-24 overflow-y-auto custom-scrollbar">
                                        {slugs.map((s: string, i: number) => <code key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded truncate">{s}</code>)}
                                        <CopyButton text={idea.amazonListing?.slugs || ""} className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/islug:opacity-100 transition-opacity bg-background" />
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </fieldset></TabsContent>

                  {/* ─── Etsy Tab ─── */}
                  <TabsContent value="etsy" className="flex-1 overflow-y-auto mt-2 space-y-3 data-[state=inactive]:hidden pr-1 relative">
                    <fieldset disabled={isNotApproved && !isPartner} className="space-y-3">
                      <Card>
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-sm">Etsy Listing</CardTitle>
                          <div className="flex items-center gap-1">
                            {idea.etsyListing && (() => { try { const g = typeof idea.etsyListing.galleryImages === "string" ? JSON.parse(idea.etsyListing.galleryImages) : (idea.etsyListing.galleryImages || []); if (g.filter(Boolean).length > 0) return <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { g.filter(Boolean).forEach((url: string) => window.open(convertToDirectImageUrl(url) || url, "_blank")); }}><Download className="h-3 w-3 mr-1" /> Tải {g.filter(Boolean).length} ảnh</Button>; } catch { } return null; })()}
                            <Sheet open={etsyEditOpen} onOpenChange={setEtsyEditOpen}>
                              <SheetTrigger asChild><Button variant="ghost" size="sm" className="h-7 text-xs" disabled={(idea.amazonListing?.listingStatus === "published" || idea.etsyListing?.listingStatus === "published")}><Pencil className="h-3 w-3 mr-1" /> Sửa</Button></SheetTrigger>
                              <SheetContent side="right" className="w-[min(92vw,1000px)] sm:max-w-[1000px] p-6 flex flex-col">
                                <SheetHeader className="shrink-0"><SheetTitle>Sửa Etsy Listing</SheetTitle><SheetDescription>{idea.msku}</SheetDescription></SheetHeader>
                                <div className="flex-1 overflow-y-auto mt-4 pr-1">
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1"><Label className="text-xs">Tài khoản</Label>
                                        <Select value={etsyForm.sellingAccountId} onValueChange={v => setEtsyForm({ ...etsyForm, sellingAccountId: v })}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn..." /></SelectTrigger>
                                          <SelectContent>{sellingAccounts.filter((a: any) => a.platform === "etsy" && a.status === "active").map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>
                                      </div>
                                      <div className="space-y-1"><Label className="text-xs">Giá ($)</Label><Input className="h-8 text-xs" type="number" value={etsyForm.price} onChange={e => setEtsyForm({ ...etsyForm, price: e.target.value })} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1"><Label className="text-xs">Title</Label><Input className="h-8 text-xs" value={etsyForm.title} onChange={e => setEtsyForm({ ...etsyForm, title: e.target.value })} /></div>
                                      <div className="space-y-1"><Label className="text-xs">Listing ID</Label><Input className="h-8 text-xs" value={etsyForm.listingId} onChange={e => setEtsyForm({ ...etsyForm, listingId: e.target.value })} /></div>
                                    </div>
                                    <div className="space-y-1"><Label className="text-xs">Mô tả</Label><Textarea className="text-xs resize-none" rows={3} value={etsyForm.description} onChange={e => setEtsyForm({ ...etsyForm, description: e.target.value })} /></div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2"><Label className="text-xs">Tags (tối đa 13, mỗi tag ≤20 ký tự)</Label><CopyButton text={etsyForm.tags.join(", ")} className="h-5 w-5" /></div>
                                      <div className="flex flex-wrap gap-1 mb-1.5">{etsyForm.tags.map((tag: string, i: number) => <Badge key={i} variant="secondary" className="gap-1 text-[10px]">{tag}<button type="button" onClick={() => setEtsyForm({ ...etsyForm, tags: etsyForm.tags.filter((_, j) => j !== i) })} className="hover:text-destructive ml-0.5">×</button></Badge>)}</div>
                                      {etsyForm.tags.length < 13 && <Input className="h-7 text-xs" value={etsyForm.tagsInput} onChange={e => setEtsyForm({ ...etsyForm, tagsInput: e.target.value })} onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); const val = etsyForm.tagsInput.trim().slice(0, 20); if (val && !etsyForm.tags.includes(val)) setEtsyForm({ ...etsyForm, tags: [...etsyForm.tags, val], tagsInput: "" }); } }} placeholder="Nhập tag rồi Enter..." />}
                                      <p className="text-[10px] text-muted-foreground">{etsyForm.tags.length}/13 tags</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1"><Label className="text-xs">Status</Label>
                                        <Select value={etsyForm.listingStatus} onValueChange={v => setEtsyForm({ ...etsyForm, listingStatus: v })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                          <SelectContent>{Object.entries(listingStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
                                      </div>
                                      <div className="space-y-1"><Label className="text-xs">Video URL</Label><Input className="h-8 text-xs" value={etsyForm.videoUrl} onChange={e => setEtsyForm({ ...etsyForm, videoUrl: e.target.value })} /></div>
                                    </div>
                                    {(etsyForm.listingStatus === "error" || etsyForm.listingStatus === "delisted") && (
                                      <div className="space-y-1"><Label className="text-xs">Lý do {etsyForm.listingStatus === "error" ? "lỗi" : "bị gỡ"}</Label><Input className="h-8 text-xs" value={etsyForm.listingStatusReason} onChange={e => setEtsyForm({ ...etsyForm, listingStatusReason: e.target.value })} placeholder={etsyForm.listingStatus === "error" ? "Mô tả lỗi..." : "Lý do sàn gỡ..."} /></div>
                                    )}
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2"><Checkbox id="etsy-shared-gallery" checked={etsyForm.useSharedGallery} onCheckedChange={v => setEtsyForm({ ...etsyForm, useSharedGallery: !!v })} /><Label htmlFor="etsy-shared-gallery" className="text-[10px] cursor-pointer">Dùng chung gallery Amazon</Label></div>
                                      {etsyForm.useSharedGallery ? (
                                        <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Ảnh từ Amazon (dùng chung)</Label>{amzForm.galleryImages.filter(Boolean).length > 0 ? amzForm.galleryImages.filter(Boolean).map((img: string, i: number) => <Input key={i} className="h-7 text-xs" value={img} readOnly />) : <p className="text-[10px] text-muted-foreground italic">Chưa có ảnh Amazon</p>}</div>
                                      ) : (
                                        <>
                                          <div className="flex items-center gap-2"><Checkbox id="etsy-shared-main" checked={etsyForm.useSharedMainImage} onCheckedChange={v => setEtsyForm({ ...etsyForm, useSharedMainImage: !!v })} /><Label htmlFor="etsy-shared-main" className="text-[10px] cursor-pointer">Dùng ảnh main chung</Label></div>
                                          <div className="space-y-1"><Label className="text-xs">Gallery ({etsyForm.galleryImages.filter(Boolean).length} ảnh)</Label>
                                            {etsyForm.galleryImages.map((url, i) => <div key={i} className="flex gap-1"><Input className="h-7 text-xs flex-1" value={url} onChange={e => { const n = [...etsyForm.galleryImages]; n[i] = e.target.value; setEtsyForm({ ...etsyForm, galleryImages: n }); }} placeholder={`Ảnh ${i + 1}`} /><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEtsyForm({ ...etsyForm, galleryImages: etsyForm.galleryImages.filter((_, j) => j !== i) })}><X className="h-3 w-3" /></Button></div>)}
                                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEtsyForm({ ...etsyForm, galleryImages: [...etsyForm.galleryImages, ""] })}>+ Thêm ảnh</Button>
                                          </div>
                                        </>
                                      )}
                                      <div className="flex items-center gap-2"><Checkbox id="etsy-amz-video" checked={etsyForm.useAmazonVideo} onCheckedChange={v => setEtsyForm({ ...etsyForm, useAmazonVideo: !!v })} /><Label htmlFor="etsy-amz-video" className="text-[10px] cursor-pointer">Dùng video Amazon</Label></div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2 pb-4">
                                      <Button variant="outline" size="sm" onClick={() => { setEtsyEditOpen(false); fetchIdea(); }}>Huỷ</Button>
                                      <Button size="sm" onClick={handleSaveEtsy} disabled={saving}>{saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}Lưu</Button>
                                    </div>
                                  </div>
                                </div>
                              </SheetContent>
                            </Sheet>
                          </div>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                          <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                            <div className="group/etitle col-span-2 flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5">
                              <div className="min-w-0 flex-1"><span className="text-[10px] text-muted-foreground block">Title</span><span className="text-xs font-medium truncate block">{idea.etsyListing?.title || "—"}</span></div>
                              {idea.etsyListing?.title && <CopyButton text={idea.etsyListing.title} className="h-4 w-4 opacity-0 group-hover/etitle:opacity-100 transition-opacity shrink-0" />}
                            </div>
                            <div className="rounded-md bg-muted/40 px-2.5 py-1.5">
                              <span className="text-[10px] text-muted-foreground block">Giá</span><span className="text-xs font-medium">${idea.etsyListing?.price || "—"}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                            <div className="group/elid rounded-md bg-muted/40 px-2.5 py-1.5">
                              <div className="flex items-center justify-between">
                                <div><span className="text-[10px] text-muted-foreground block">Listing ID</span><span className="text-xs font-mono font-medium">{idea.etsyListing?.listingId || "—"}</span></div>
                                {idea.etsyListing?.listingId && <CopyButton text={idea.etsyListing.listingId} className="h-4 w-4 opacity-0 group-hover/elid:opacity-100 transition-opacity" />}
                              </div>
                            </div>
                            <div className="rounded-md bg-muted/40 px-2.5 py-1.5">
                              <span className="text-[10px] text-muted-foreground block">Status</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {statusBadge(idea.etsyListing?.listingStatus || "ready", listingStatusLabels)}
                                {(NEXT_STATUS[idea.etsyListing?.listingStatus || "ready"] || []).map(opt => (
                                  <Button key={opt.next} size="sm" className={`h-6 text-[10px] text-white ${opt.className}`}
                                    onClick={() => handleListingStatusChange("etsy", opt.next)} disabled={saving}>{opt.label}</Button>
                                ))}
                              </div>
                            </div>
                          </div>
                          {(idea.etsyListing?.listingStatus === "error" || idea.etsyListing?.listingStatus === "delisted") && idea.etsyListing?.listingStatusReason && (
                            <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-2.5 py-1.5">
                              <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">Lý do {idea.etsyListing.listingStatus === "error" ? "lỗi" : "bị gỡ"}:</span>
                              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{idea.etsyListing.listingStatusReason}</p>
                            </div>
                          )}
                          {idea.etsyListing && (() => { const t = typeof idea.etsyListing.tags === "string" ? JSON.parse(idea.etsyListing.tags) : (idea.etsyListing.tags || []); if (!t.length) return <div className="rounded-md bg-muted/40 px-2.5 py-1.5"><span className="text-[10px] text-muted-foreground block">Tags</span><p className="text-xs text-muted-foreground mt-0.5">—</p></div>; return <div className="rounded-md bg-muted/40 px-2.5 py-1.5"><span className="text-[10px] text-muted-foreground block">Tags ({t.length}) <CopyButton text={t.join(", ")} className="h-4 w-4 inline" /></span><div className="flex items-center gap-1 flex-wrap mt-0.5">{t.map((tag: string, i: number) => <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>)}</div></div>; })()}
                          <div className="rounded-md bg-muted/40 px-2.5 py-1.5">
                            <span className="text-[10px] text-muted-foreground block">Gallery{idea.etsyListing?.useSharedGallery ? " (Dùng chung Amazon)" : ""}</span>
                            {(() => { try { const g = typeof idea.etsyListing?.galleryImages === "string" ? JSON.parse(idea.etsyListing.galleryImages) : (idea.etsyListing?.galleryImages || []); const imgs = g.filter(Boolean); if (imgs.length === 0) return <p className="text-xs text-muted-foreground mt-0.5">—</p>; return <><span className="text-[10px] text-muted-foreground">({imgs.length} ảnh)</span><div className="flex gap-1 flex-wrap mt-0.5">{imgs.slice(0, 6).map((url: string, i: number) => { const directUrl = convertToDirectImageUrl(url) || url; return <Dialog key={i}><DialogTrigger asChild><div className="w-8 h-8 rounded border overflow-hidden bg-muted cursor-pointer hover:ring-1 hover:ring-primary/50"><img src={directUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /></div></DialogTrigger><DialogContent className="max-w-[90vw] sm:max-w-[90vw] w-fit bg-transparent border-none shadow-none !ring-0 p-0" showCloseButton={false}><img src={directUrl} alt="" className="max-h-[80vh] max-w-[90vw] rounded-md object-contain" /></DialogContent></Dialog>; })}{imgs.length > 6 && <span className="text-[10px] text-muted-foreground self-center">+{imgs.length - 6}</span>}</div></>; } catch { return <p className="text-xs text-muted-foreground mt-0.5">—</p>; } })()}
                          </div>
                          <div className="rounded-md bg-muted/40 px-2.5 py-1.5">
                            <span className="text-[10px] text-muted-foreground block">Video URL{idea.etsyListing?.useAmazonVideo ? " (dùng chung Amazon)" : ""}</span>
                            {idea.etsyListing?.videoUrl ? (
                              <a href={idea.etsyListing.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-0.5"><ExternalLink className="h-3 w-3" /> Xem video</a>
                            ) : <p className="text-xs text-muted-foreground mt-0.5">—</p>}
                          </div>
                          <div className="group/edesc rounded-md bg-muted/40 px-2.5 py-1.5">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] text-muted-foreground">Mô tả</span>
                              {idea.etsyListing?.description && <CopyButton text={idea.etsyListing.description} className="h-4 w-4 opacity-0 group-hover/edesc:opacity-100 transition-opacity" />}
                            </div>
                            <p className="text-xs whitespace-pre-wrap line-clamp-3 text-muted-foreground">{idea.etsyListing?.description || "—"}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </fieldset></TabsContent>
                </Tabs>
              </div>
            </div>
          </div>

          {/* ─── RIGHT COLUMN (340px): Image + Info + File Management ─── */}
          <div className="w-[340px] shrink-0 border-l flex flex-col overflow-y-auto bg-muted/10">

            {/* Main Image */}
            <div className="p-3 pb-2">
              {mainImageDirectUrl ? (
                <ImagePreviewDialog url={mainImageDirectUrl}>
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer group shadow-sm">
                    <img src={mainImageDirectUrl} alt={idea.msku} className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                </ImagePreviewDialog>
              ) : (
                <div className="aspect-square rounded-xl bg-muted flex items-center justify-center"><ImageIcon className="h-12 w-12 text-muted-foreground/40" /></div>
              )}
            </div>

            {/* Origin */}
            <div className="px-3 pb-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Nguồn gốc ý tưởng/ sản phẩm</span>
              <div className="flex flex-wrap gap-2">
                {sourceLinks.length === 0 ? (
                  <ButtonIconHover variant="outline" size="sm" className="h-7 text-[10px] bg-background shadow-sm hover:bg-muted/50 rounded-full px-3 w-fit opacity-50 cursor-not-allowed">
                    Chưa có nguồn gốc
                  </ButtonIconHover>
                ) : (
                  sourceLinks.slice(0, 5).map((link, i) => {
                    let domain = link;
                    try { domain = new URL(link).hostname.replace("www.", ""); } catch { }
                    return (
                      <ButtonIconHover
                        key={i}
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] bg-background shadow-sm hover:bg-muted/50 rounded-full px-3 w-fit"
                        onClick={() => window.open(link, "_blank")}
                      >
                        {domain}
                      </ButtonIconHover>
                    );
                  })
                )}
              </div>
            </div>

            <Separator />

            {/* Info Section */}
            <div className="p-3 space-y-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Thông tin chung</span>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] px-1">
                <div className="flex items-center gap-1.5 text-muted-foreground"><Package className="h-3 w-3" /> MSKU</div><div className="text-right flex items-center justify-end gap-1"><code className="bg-muted px-1 rounded">{idea.msku}</code><CopyButton text={idea.msku} className="h-3 w-3 text-muted-foreground hover:text-foreground" /></div>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Layers className="h-3 w-3" /> Chủ đề</div><span className="text-right font-medium">{idea.topic.name}</span>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-3 w-3" /> Ngày tạo</div><span className="text-right font-medium">{new Date(idea.createdAt).toLocaleDateString("vi-VN")}</span>
                {idea.widthCm && <><div className="flex items-center gap-1.5 text-muted-foreground"><Ruler className="h-3 w-3" /> Kích thước</div><span className="text-right font-medium">{idea.widthCm}×{idea.heightCm}×{idea.thicknessMm}mm</span></>}
                {idea.material && <><div className="flex items-center gap-1.5 text-muted-foreground"><Layers className="h-3 w-3" /> Chất liệu</div><span className="text-right font-medium">{idea.material}</span></>}
              </div>
            </div>

            <Separator />

            {/* File Management */}
            <div className="p-3 space-y-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">File Thiết Kế</span>
              <div className="space-y-2 mt-1">
                <div className="flex items-center justify-between text-[11px] px-1">
                  <span className="text-muted-foreground font-medium">Trạng thái file:</span>
                  {statusBadge(idea.fileStatus || "not_requested", fileStatusLabels)}
                </div>
                {idea.designFileUrl && (
                  <div className="flex items-center justify-between text-[11px] px-1">
                    <span className="text-muted-foreground font-medium">Link file:</span>
                    <a href={idea.designFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                      <ExternalLink className="h-3 w-3" /> Xem file thiết kế
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* AI Section */}
            <>
              <Separator />
              <div className="p-3 space-y-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">AI</span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] px-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Sparkles className="h-3 w-3 text-amber-500" /> AI Model</div><span className="text-right font-medium">{idea.aiModel.name}</span>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Terminal className="h-3 w-3 text-amber-500" /> Prompt</div>
                </div>
                {idea.prompt && (
                  <div className="mt-1 rounded-md bg-muted/50 border p-2 relative group/prompt">
                    <p className="text-xs whitespace-pre-wrap text-muted-foreground">{idea.prompt}</p>
                    <CopyButton text={idea.prompt} className="absolute top-1.5 right-1.5 h-5 w-5 opacity-0 group-hover/prompt:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
            </>

          </div>

        </div>


      </div>
    </TooltipProvider>
  );
}
