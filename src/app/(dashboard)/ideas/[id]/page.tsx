"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { AuditLogViewer } from "@/components/audit-log-viewer";
import { ImagePreviewInput } from "@/components/image-preview-input";
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
  ArrowLeft,
  Check,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Save,
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
} from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { EditableField } from "@/components/editable-field";
import { toast } from "sonner";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ideaStatusLabels,
  photoStatusLabels,
  fileStatusLabels,
  listingStatusLabels,
} from "@/types";
import type { Role } from "@/lib/permissions";
import { can } from "@/lib/permissions";
import { convertToDirectImageUrl } from "@/lib/google-drive";

// ─── Status badge helpers ───────────────────────────────────────────
function statusBadge(status: string, labels: Record<string, string>) {
  const colors: Record<string, string> = {
    reviewing: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    approved: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
    published: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    not_requested: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
    awaiting_photos: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
    pending_approval: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
    revision_requested: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
    not_started: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
    in_progress: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300",
    pending_review: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
    editing: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300",
    ready_to_publish: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  };
  return (
    <Badge variant="outline" className={colors[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

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
  const [reviewComment, setReviewComment] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | "revise" | null>(null);

  // Edit modes
  const [isEditingIdea, setIsEditingIdea] = useState(false);
  const [isEditingAmz, setIsEditingAmz] = useState(false);
  const [isEditingEtsy, setIsEditingEtsy] = useState(false);
  const [photoRevisionInput, setPhotoRevisionInput] = useState("");

  // Idea general form state
  const [ideaForm, setIdeaForm] = useState({
    title: "",
    description: "",
    prompt: "",
  });

  // Amazon listing form state
  const [amzForm, setAmzForm] = useState({
    sellingAccountId: "",
    asin: "",
    fnskuCode: "",
    fnskuLabelFileUrl: "",
    itemName: "",
    itemHighlights: "",
    bulletPoints: ["", "", "", "", ""],
    description: "",
    tags: "",
    slugs: "",
    price: "",
    useSharedMainImage: true,
    galleryImages: [""],
    videoUrl: "",
    contentAPlusUrl: "",
    listingStatus: "ready",
    listingStatusReason: "",
  });

  // Etsy listing form state
  const [etsyForm, setEtsyForm] = useState({
    sellingAccountId: "",
    title: "",
    listingId: "",
    tags: [] as string[],
    tagsInput: "",
    description: "",
    price: "",
    useSharedMainImage: true,
    galleryImages: [""],
    useSharedGallery: false,
    videoUrl: "",
    useAmazonVideo: false,
    listingStatus: "ready",
    listingStatusReason: "",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sellingAccounts, setSellingAccounts] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [users, setUsers] = useState<any[]>([]);

  const fetchIdea = useCallback(async () => {
    try {
      const res = await fetch(`/api/ideas/${id}`);
      if (!res.ok) {
        toast.error("Không tìm thấy ý tưởng");
        router.push("/ideas");
        return;
      }
      const data = await res.json();
      setIdea(data);

      setIdeaForm({
        title: data.title || "",
        description: data.description || "",
        prompt: data.prompt || "",
      });

      // Populate Amazon form
      if (data.amazonListing) {
        const a = data.amazonListing;
        setAmzForm({
          sellingAccountId: a.sellingAccountId || "",
          asin: a.asin || "",
          fnskuCode: a.fnskuCode || "",
          fnskuLabelFileUrl: a.fnskuLabelFileUrl || "",
          itemName: a.itemName || "",
          itemHighlights: a.itemHighlights || "",
          bulletPoints: (() => {
            try { const p = JSON.parse(a.bulletPoints || "[]"); return [...p, ...Array(5)].slice(0, 5); } catch { return ["", "", "", "", ""]; }
          })(),
          description: a.description || "",
          tags: a.tags || "",
          slugs: a.slugs || "",
          price: a.price ? String(a.price) : "",
          useSharedMainImage: a.useSharedMainImage ?? true,
          galleryImages: (() => {
            try { const g = JSON.parse(a.galleryImages || "[]"); return g.length ? g : [""]; } catch { return [""]; }
          })(),
          videoUrl: a.videoUrl || "",
          contentAPlusUrl: a.contentAPlusUrl || "",
          listingStatus: a.listingStatus || "ready",
          listingStatusReason: a.listingStatusReason || "",
        });
      } else {
        // Pre-fill from idea
        setAmzForm((prev) => ({
          ...prev,
          itemName: data.title || "",
          description: data.description || "",
        }));
      }

      // Populate Etsy form
      if (data.etsyListing) {
        const e = data.etsyListing;
        const parsedTags = (() => {
          try { return JSON.parse(e.tags || "[]"); } catch { return []; }
        })();
        setEtsyForm({
          sellingAccountId: e.sellingAccountId || "",
          title: e.title || "",
          listingId: e.listingId || "",
          tags: parsedTags,
          tagsInput: "",
          description: e.description || "",
          price: e.price ? String(e.price) : "",
          useSharedMainImage: e.useSharedMainImage ?? true,
          galleryImages: (() => {
            try { const g = JSON.parse(e.galleryImages || "[]"); return g.length ? g : [""]; } catch { return [""]; }
          })(),
          useSharedGallery: e.useSharedGallery ?? false,
          videoUrl: e.videoUrl || "",
          useAmazonVideo: e.useAmazonVideo ?? false,
          listingStatus: e.listingStatus || "ready",
          listingStatusReason: e.listingStatusReason || "",
        });
      } else {
        setEtsyForm((prev) => ({
          ...prev,
          title: data.title || "",
          description: data.description || "",
        }));
      }
    } catch {
      toast.error("Lỗi tải ý tưởng");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchIdea();
    fetch("/api/selling-accounts").then((r) => r.json()).then(setSellingAccounts).catch(() => {});
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
  }, [fetchIdea]);

  // ─── Actions ──────────────────────────────────────────────────────
  const handleReviewAction = async (overrideAction?: "approve" | "reject" | "revise", requestPhotos?: boolean) => {
    const action = overrideAction || actionType;
    if (!action) return;
    if ((action === "reject" || action === "revise") && !reviewComment.trim()) {
      toast.error("Vui lòng nhập lý do");
      return;
    }

    setSaving(true);
    try {
      const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "reviewing";
      const body: Record<string, unknown> = {
        status,
        reviewComment: reviewComment.trim() || undefined,
        version: idea.version,
      };
      // If "Duyệt + Yêu cầu làm ảnh", also set photoStatus
      if (action === "approve" && requestPhotos) {
        body.photoStatus = "awaiting_photos";
      }

      const res = await fetch(`/api/ideas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(`Đã ${action === "approve" ? "duyệt" : action === "reject" ? "từ chối" : "yêu cầu sửa"} ý tưởng!${requestPhotos ? " Đã yêu cầu làm ảnh." : ""}`);
        
        // Find next idea in reviewing tab
        if (action === "approve" || action === "reject") {
          const listRes = await fetch('/api/ideas?tab=reviewing');
          if (listRes.ok) {
            const list = await listRes.json();
            const nextIdea = list.find((i: any) => i.id !== id);
            if (nextIdea) {
              router.push(`/ideas/${nextIdea.id}`);
              return;
            }
          }
          router.push("/ideas");
        } else {
          fetchIdea();
          setActionType(null);
          setReviewComment("");
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Lỗi cập nhật ý tưởng");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIdea = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Đã xoá ý tưởng thành công!");
        router.push("/ideas");
      } else {
        const err = await res.json();
        toast.error(err.error || "Không thể xoá ý tưởng này");
      }
    } catch {
      toast.error("Lỗi mạng khi xoá ý tưởng");
    } finally {
      setSaving(false);
    }
  };

  const handleCloneIdea = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${id}/clone`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success("Đã tạo bản sao ý tưởng!");
        router.push(`/ideas/${data.id}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi tạo bản sao");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIdea = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ideaForm,
          version: idea.version,
        }),
      });

      if (res.ok) {
        toast.success("Đã cập nhật nội dung ý tưởng");
        setIsEditingIdea(false);
        fetchIdea(); // Refresh to get latest version and history
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi cập nhật");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateIdea = async (fields: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, version: idea.version }),
      });
      if (res.ok) {
        toast.success("Đã cập nhật!");
        fetchIdea();
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi cập nhật");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAmazon = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${id}/amazon-listing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...amzForm,
          bulletPoints: amzForm.bulletPoints.filter((b) => b.trim()),
          galleryImages: amzForm.galleryImages.filter((g) => g.trim()),
        }),
      });
      if (res.ok) {
        toast.success("Đã lưu Amazon Listing!");
        fetchIdea();
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi lưu Amazon Listing");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEtsy = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${id}/etsy-listing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...etsyForm,
          tags: etsyForm.tags,
          galleryImages: etsyForm.galleryImages.filter((g) => g.trim()),
        }),
      });
      if (res.ok) {
        toast.success("Đã lưu Etsy Listing!");
        fetchIdea();
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi lưu Etsy Listing");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!idea) return null;

  const sourceLinks: string[] = (() => {
    try { return JSON.parse(idea.sourceLinks || "[]"); } catch { return []; }
  })();

  const canApprove = role && can(role, "approve_idea") && (idea.status === "reviewing" || idea.needsReReview);
  const canManagePhotos = role && can(role, "assign_photo_task");
  const canDeleteIdea = role && (
    role !== "employee" || 
    (idea.createdById === session?.user?.id && 
      (idea.status === "reviewing" || 
       (idea.status === "approved" && (idea.photoStatus === "not_requested" || idea.photoStatus === "awaiting_photos") && idea.fileStatus !== "approved" && !idea.productionFileUrl)
      )
    )
  );
  const mainImageDirectUrl = convertToDirectImageUrl(idea.mainImageUrl);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-1">
          <Link href="/ideas"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{idea.msku}</h1>
            {statusBadge(idea.status, ideaStatusLabels)}
            {idea.needsReReview && (
              <Badge variant="destructive" className="bg-red-500 text-white animate-pulse">Sửa đổi mới</Badge>
            )}
            <Badge variant="outline">{idea.fulfillmentType}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Tạo bởi {idea.createdBy.fullName} · {idea.topic.name} · {idea.aiModel.name}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {canDeleteIdea && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" disabled={saving}>
                  <Trash2 className="h-4 w-4 mr-2" /> Xoá
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    {(idea.status === "published" || (idea.productionRequests && idea.productionRequests.length > 0)) && (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    Xác nhận xoá ý tưởng {idea.msku}
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2">
                      {idea.status === "published" && (
                        <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-3 border border-red-200 dark:border-red-800">
                          <p className="text-sm font-medium text-red-800 dark:text-red-300">⚠️ Ý tưởng này đã được đăng bán!</p>
                          <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                            {idea.amazonListing ? "• Đã có Amazon Listing" : ""}
                            {idea.etsyListing ? "\n• Đã có Etsy Listing" : ""}
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">Xoá sẽ làm mất toàn bộ thông tin đăng bán và dữ liệu liên quan.</p>
                        </div>
                      )}
                      {idea.productionRequests && idea.productionRequests.length > 0 && (
                        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200 dark:border-amber-800">
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">⚠️ Đang có {idea.productionRequests.length} yêu cầu sản xuất!</p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Xoá ý tưởng sẽ xoá luôn tất cả yêu cầu sản xuất liên quan.</p>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {role !== "employee" 
                          ? "Bạn đang thực hiện xoá ý tưởng với quyền Quản lý/Sếp. Hành động này không thể hoàn tác." 
                          : "Bạn có chắc chắn muốn xoá ý tưởng này không? Hành động này không thể hoàn tác."}
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Huỷ</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteIdea} className="bg-red-600 hover:bg-red-700">Tiếp tục xoá</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {idea.status === "rejected" && (
            <Button variant="outline" onClick={handleCloneIdea} disabled={saving}>
              Tạo bản sao
            </Button>
          )}

          {canApprove && (
            <div className="flex gap-2">
              <Dialog open={actionType === "reject" || actionType === "revise"} onOpenChange={(open) => !open && setActionType(null)}>
                <DialogTrigger asChild>
                  <div className="flex gap-2">
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => setActionType("reject")}>
                      Từ chối
                    </Button>
                    <Button variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700" onClick={() => setActionType("revise")}>
                      Yêu cầu sửa
                    </Button>
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-xl">
                      {actionType === "reject" ? "Từ chối ý tưởng này?" : "Yêu cầu chỉnh sửa?"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-4 space-y-3">
                    <Label htmlFor="comment" className="font-semibold">Lý do {actionType === "reject" ? "từ chối" : "yêu cầu sửa"} (Bắt buộc)</Label>
                    <Textarea
                      id="comment"
                      autoFocus
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleReviewAction();
                        }
                      }}
                      placeholder="Nhập lý do chi tiết để nhân viên có thể cải thiện..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="ghost" onClick={() => { setActionType(null); setReviewComment(""); }}>Huỷ</Button>
                    <Button onClick={(e) => { e.preventDefault(); handleReviewAction(); }} disabled={saving} className={actionType === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}>
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Xác nhận
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Two direct approve buttons — no dialog */}
              <Button
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
                onClick={() => handleReviewAction("approve")}
                disabled={saving}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Duyệt
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                onClick={() => handleReviewAction("approve", true)}
                disabled={saving}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Duyệt + Yêu cầu ảnh
              </Button>
            </div>
          )}

          {/* Mark as published — shown when photo approved and not yet published */}
          {canManagePhotos && idea.photoStatus === "approved" && idea.status !== "published" && (
            <Button
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={() => handleUpdateIdea({ status: "published" })}
              disabled={saving}
            >
              <Upload className="mr-2 h-4 w-4" />
              Đánh dấu đã đăng
            </Button>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main image + info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Ảnh main</CardTitle>
            </CardHeader>
            <CardContent>
              {mainImageDirectUrl ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mainImageDirectUrl}
                        alt={idea.msku}
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-125"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] w-fit bg-transparent border-none shadow-none" showCloseButton={false}>
                    <div className="relative flex justify-center items-center p-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mainImageDirectUrl} alt="Full view" className="max-h-[95vh] max-w-[95vw] w-auto h-auto rounded-md object-contain" />
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <a
                href={idea.mainImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 mt-2 hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Mở trên Google Drive
              </a>
            </CardContent>
          </Card>

          {/* Quick Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Thông tin</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between items-center group/sku">
                <span className="text-muted-foreground">SKU</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{idea.sku}</code>
                  <CopyButton text={idea.sku} className="h-5 w-5 opacity-0 group-hover/sku:opacity-100" />
                </div>
              </div>
              <div className="flex justify-between items-center group/msku">
                <span className="text-muted-foreground">MSKU</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{idea.msku}</code>
                  <CopyButton text={idea.msku} className="h-5 w-5 opacity-0 group-hover/msku:opacity-100" />
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Trạng thái ảnh</span>
                {statusBadge(idea.photoStatus, photoStatusLabels)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Trạng thái file</span>
                {statusBadge(idea.fileStatus, fileStatusLabels)}
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chủ đề</span>
                <span>{idea.topic.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AI Model</span>
                <span>{idea.aiModel.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ngày tạo</span>
                <span>{new Date(idea.createdAt).toLocaleDateString("vi-VN")}</span>
              </div>
            </CardContent>
          </Card>

          {/* Photo & File Management */}
          {idea.status !== "reviewing" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Quản lý ảnh & File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Photo Status Display */}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Trạng thái ảnh</span>
                  {statusBadge(idea.photoStatus, photoStatusLabels)}
                </div>

                {/* Photo Assignee Info */}
                {idea.photoAssignee && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Người nhận việc</span>
                    <span className="text-xs font-medium">{idea.photoAssignee.fullName}</span>
                  </div>
                )}

                {/* Gallery preview — show Amazon/Etsy gallery images if they exist */}
                {(() => {
                  let amzGallery: string[] = [];
                  let etsyGallery: string[] = [];
                  try { amzGallery = JSON.parse(idea.amazonListing?.galleryImages || "[]").filter(Boolean); } catch {}
                  try { etsyGallery = JSON.parse(idea.etsyListing?.galleryImages || "[]").filter(Boolean); } catch {}
                  const hasGallery = amzGallery.length > 0 || etsyGallery.length > 0;
                  if (!hasGallery) return null;
                  return (
                    <div className="space-y-2">
                      <Separator />
                      {amzGallery.length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Amazon ({amzGallery.length} ảnh)</p>
                          <div className="flex gap-1 flex-wrap">
                            {amzGallery.slice(0, 4).map((url, i) => {
                              const directUrl = convertToDirectImageUrl(url) || url;
                              return (
                              <Dialog key={i}>
                                <DialogTrigger asChild>
                                  <div className="w-10 h-10 rounded border overflow-hidden bg-muted cursor-pointer">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={directUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                  </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-[95vw] w-fit bg-transparent border-none shadow-none" showCloseButton={false}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={directUrl} alt="" className="max-h-[95vh] max-w-[95vw] rounded-md object-contain" />
                                </DialogContent>
                              </Dialog>
                              );
                            })}
                            {amzGallery.length > 4 && <span className="text-xs text-muted-foreground self-center">+{amzGallery.length - 4}</span>}
                          </div>
                        </div>
                      )}
                      {etsyGallery.length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Etsy ({etsyGallery.length} ảnh)</p>
                          <div className="flex gap-1 flex-wrap">
                            {etsyGallery.slice(0, 4).map((url, i) => {
                              const directUrl = convertToDirectImageUrl(url) || url;
                              return (
                              <Dialog key={i}>
                                <DialogTrigger asChild>
                                  <div className="w-10 h-10 rounded border overflow-hidden bg-muted cursor-pointer">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={directUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                  </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-[95vw] w-fit bg-transparent border-none shadow-none" showCloseButton={false}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={directUrl} alt="" className="max-h-[95vh] max-w-[95vw] rounded-md object-contain" />
                                </DialogContent>
                              </Dialog>
                              );
                            })}
                            {etsyGallery.length > 4 && <span className="text-xs text-muted-foreground self-center">+{etsyGallery.length - 4}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <Separator />

                {/* === WORKFLOW ACTIONS === */}

                {/* Sếp/QL yêu cầu làm ảnh */}
                {canManagePhotos && idea.photoStatus === "not_requested" && (
                  <Button size="sm" className="w-full" onClick={() => handleUpdateIdea({ photoStatus: "awaiting_photos" })} disabled={saving}>
                    <ImageIcon className="h-4 w-4 mr-2" /> Yêu cầu làm ảnh
                  </Button>
                )}

                {/* NV nhận nhiệm vụ */}
                {idea.photoStatus === "awaiting_photos" && !idea.photoAssigneeId && (
                  <Button size="sm" className="w-full" onClick={() => handleUpdateIdea({ photoAssigneeId: session?.user?.id })} disabled={saving}>
                    <Check className="h-4 w-4 mr-2" /> Nhận nhiệm vụ làm ảnh
                  </Button>
                )}

                {/* NV đã nhận — hiện nút hủy + gallery quick-edit + nộp ảnh */}
                {idea.photoStatus === "awaiting_photos" && idea.photoAssigneeId === session?.user?.id && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleUpdateIdea({ photoAssigneeId: null })} disabled={saving}>
                        <XCircle className="h-4 w-4 mr-1" /> Hủy nhận
                      </Button>
                    </div>

                    {/* Quick gallery link edit */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px]">Thêm ảnh gallery nhanh (Google Drive link)</Label>
                      {/* Amazon quick input */}
                      <div className="flex gap-1">
                        <Input
                          className="h-7 text-xs flex-1"
                          placeholder="Link ảnh Amazon..."
                          value={amzForm.galleryImages.filter(Boolean).length > 0 ? `${amzForm.galleryImages.filter(Boolean).length} ảnh` : ""}
                          readOnly
                        />
                        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => { setIsEditingAmz(true); }} disabled={saving}>
                          <Pencil className="h-3 w-3 mr-1" /> Sửa
                        </Button>
                      </div>
                      {/* Etsy quick input */}
                      <div className="flex gap-1">
                        <Input
                          className="h-7 text-xs flex-1"
                          placeholder="Link ảnh Etsy..."
                          value={etsyForm.galleryImages.filter(Boolean).length > 0 ? `${etsyForm.galleryImages.filter(Boolean).length} ảnh` : ""}
                          readOnly
                        />
                        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => { setIsEditingEtsy(true); }} disabled={saving}>
                          <Pencil className="h-3 w-3 mr-1" /> Sửa
                        </Button>
                      </div>
                    </div>

                    {/* Nộp ảnh buttons — validate gallery images exist */}
                    <div className="space-y-1.5">
                      {(() => {
                        const amzHas = amzForm.galleryImages.filter(Boolean).length > 0;
                        const etsyHas = etsyForm.galleryImages.filter(Boolean).length > 0;
                        return (
                          <>
                            <Button
                              size="sm" className="w-full"
                              onClick={() => {
                                if (!amzHas) { toast.error("Vui lòng thêm ít nhất 1 ảnh Amazon trước khi nộp!"); return; }
                                handleSaveAmazon().then(() => handleUpdateIdea({ photoStatus: "pending_approval" }));
                              }}
                              disabled={saving}
                            >
                              <ShoppingBag className="h-4 w-4 mr-2" /> Nộp ảnh Amazon {amzHas ? `(${amzForm.galleryImages.filter(Boolean).length})` : ""}
                            </Button>
                            <div className="flex gap-2">
                              <Button
                                size="sm" variant="outline" className="flex-1"
                                onClick={() => {
                                  if (!etsyHas) { toast.error("Vui lòng thêm ít nhất 1 ảnh Etsy trước khi nộp!"); return; }
                                  handleSaveEtsy().then(() => handleUpdateIdea({ photoStatus: "pending_approval" }));
                                }}
                                disabled={saving}
                              >
                                Nộp ảnh Etsy {etsyHas ? `(${etsyForm.galleryImages.filter(Boolean).length})` : ""}
                              </Button>
                              <Button
                                size="sm" variant="default" className="flex-1"
                                onClick={() => {
                                  if (!amzHas && !etsyHas) { toast.error("Vui lòng thêm ảnh Amazon hoặc Etsy trước khi nộp!"); return; }
                                  const promises = [];
                                  if (amzHas) promises.push(handleSaveAmazon());
                                  if (etsyHas) promises.push(handleSaveEtsy());
                                  Promise.all(promises).then(() => handleUpdateIdea({ photoStatus: "pending_approval" }));
                                }}
                                disabled={saving}
                              >
                                Cả 2
                              </Button>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* NV nộp lại ảnh khi bị yêu cầu sửa */}
                {idea.photoStatus === "revision_requested" && idea.photoAssigneeId === session?.user?.id && (
                  <div className="space-y-2">
                    {idea.photoRevisionNote && (
                      <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-2.5 border border-amber-200 dark:border-amber-800">
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">Yêu cầu sửa ảnh:</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">{idea.photoRevisionNote}</p>
                      </div>
                    )}
                    <Button size="sm" variant="outline" className="w-full" onClick={() => { setIsEditingAmz(true); }} disabled={saving}>
                      <Pencil className="h-4 w-4 mr-2" /> Sửa ảnh gallery
                    </Button>
                    <Button size="sm" className="w-full" onClick={() => handleUpdateIdea({ photoStatus: "pending_approval" })} disabled={saving}>
                      <ImageIcon className="h-4 w-4 mr-2" /> Nộp lại ảnh đã sửa
                    </Button>
                  </div>
                )}

                {/* Đang chờ - người khác đã nhận */}
                {idea.photoStatus === "awaiting_photos" && idea.photoAssigneeId && idea.photoAssigneeId !== session?.user?.id && !canManagePhotos && (
                  <p className="text-xs text-muted-foreground italic">{idea.photoAssignee?.fullName || "Nhân viên khác"} đã nhận nhiệm vụ này</p>
                )}

                {/* Sếp/QL gỡ assignee */}
                {canManagePhotos && idea.photoStatus === "awaiting_photos" && idea.photoAssigneeId && (
                  <Button size="sm" className="w-full" variant="ghost" onClick={() => handleUpdateIdea({ photoAssigneeId: null })} disabled={saving}>
                    <XCircle className="h-4 w-4 mr-2" /> Gỡ người nhận ({idea.photoAssignee?.fullName})
                  </Button>
                )}

                {/* Sếp/QL duyệt ảnh */}
                {canManagePhotos && idea.photoStatus === "pending_approval" && (
                  <div className="space-y-2">
                    <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleUpdateIdea({ photoStatus: "approved" })} disabled={saving}>
                      <ShieldCheck className="h-4 w-4 mr-2" /> Duyệt ảnh
                    </Button>
                    <div className="space-y-1.5">
                      <Input value={photoRevisionInput} onChange={(e) => setPhotoRevisionInput(e.target.value)} placeholder="Lý do yêu cầu sửa..." className="h-8 text-xs" />
                      <Button size="sm" className="w-full" variant="outline" onClick={() => {
                        if (!photoRevisionInput.trim()) { toast.error("Vui lòng nhập lý do yêu cầu sửa ảnh"); return; }
                        handleUpdateIdea({ photoStatus: "revision_requested", photoRevisionNote: photoRevisionInput.trim() });
                        setPhotoRevisionInput("");
                      }} disabled={saving}>
                        <Edit3 className="h-4 w-4 mr-2" /> Yêu cầu sửa ảnh
                      </Button>
                    </div>
                  </div>
                )}

                {/* Sếp/QL: Assign photo to specific employee */}
                {canManagePhotos && (idea.photoStatus === "awaiting_photos" || idea.photoStatus === "revision_requested") && !idea.photoAssigneeId && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Giao việc cho nhân viên</Label>
                    <Select value="" onValueChange={(v) => handleUpdateIdea({ photoAssigneeId: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn nhân viên..." /></SelectTrigger>
                      <SelectContent>
                        {users.filter((u: any) => u.status === "active" && u.role === "employee").map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Separator />

                {/* File Management */}
                {canManagePhotos && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Trạng thái file</span>
                      {statusBadge(idea.fileStatus, fileStatusLabels)}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Link file sản xuất</Label>
                      {idea.productionFileUrl ? (
                        <a href={idea.productionFileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <ExternalLink className="h-3 w-3" /> Mở file sản xuất
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Chưa có link file</p>
                      )}
                    </div>
                    {idea.fileStatus === "not_started" && (
                      <Button size="sm" className="w-full" variant="outline" onClick={() => handleUpdateIdea({ fileStatus: "in_progress" })} disabled={saving}>
                        <FileText className="h-4 w-4 mr-2" /> Yêu cầu làm file SX
                      </Button>
                    )}
                    {idea.fileStatus === "in_progress" && (
                      <Button size="sm" className="w-full" onClick={() => {
                        if (!idea.productionFileUrl) { toast.error("Vui lòng thêm link file sản xuất trước khi nộp!"); return; }
                        handleUpdateIdea({ fileStatus: "pending_review" });
                      }} disabled={saving}>
                        <FileText className="h-4 w-4 mr-2" /> Nộp file để duyệt
                      </Button>
                    )}
                    {idea.fileStatus === "pending_review" && (
                      <div className="space-y-2">
                        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={() => {
                          if (!idea.productionFileUrl) { toast.error("Chưa có link file sản xuất để duyệt!"); return; }
                          handleUpdateIdea({ fileStatus: "approved" });
                        }} disabled={saving}>
                          <ShieldCheck className="h-4 w-4 mr-2" /> Duyệt file
                        </Button>
                        <Button size="sm" className="w-full" variant="outline" onClick={() => handleUpdateIdea({ fileStatus: "revision_requested" })} disabled={saving}>
                          <Edit3 className="h-4 w-4 mr-2" /> Yêu cầu sửa file
                        </Button>
                      </div>
                    )}
                    {idea.fileStatus === "revision_requested" && (
                      <Button size="sm" className="w-full" onClick={() => {
                        if (!idea.productionFileUrl) { toast.error("Vui lòng thêm link file sản xuất trước khi nộp!"); return; }
                        handleUpdateIdea({ fileStatus: "pending_review" });
                      }} disabled={saving}>
                        <FileText className="h-4 w-4 mr-2" /> Nộp lại file đã sửa
                      </Button>
                    )}
                    <Separator />
                    <div className="space-y-1.5">
                      <Label className="text-xs">Loại Fulfillment</Label>
                      <Select value={idea.fulfillmentType} onValueChange={(v) => handleUpdateIdea({ fulfillmentType: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FBA">FBA</SelectItem>
                          <SelectItem value="FBM">FBM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Tabs for content, amazon, etsy */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="content">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="content">Nội dung</TabsTrigger>
              <TabsTrigger value="amazon">
                Amazon {idea.amazonListing && <Check className="ml-1 h-3 w-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="etsy">
                Etsy {idea.etsyListing && <Check className="ml-1 h-3 w-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="history">Lịch sử</TabsTrigger>
            </TabsList>

            {/* Content Tab */}
            <TabsContent value="content" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Prompt & Nội dung</CardTitle>
                  <div>
                    {!isEditingIdea ? (
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingIdea(true)}>
                        <Pencil className="h-4 w-4 mr-2" /> Chỉnh sửa
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsEditingIdea(false)}>
                          <X className="h-4 w-4 mr-2" /> Huỷ
                        </Button>
                        <Button size="sm" onClick={handleSaveIdea} disabled={saving}>
                          <Save className="h-4 w-4 mr-2" /> Lưu
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <EditableField
                    label="Tiêu đề (Item Name)"
                    value={ideaForm.title}
                    onChange={(v) => setIdeaForm({ ...ideaForm, title: v })}
                    isEditing={isEditingIdea}
                    placeholder="Nhập tiêu đề sản phẩm..."
                  />
                  <EditableField
                    label="Mô tả sản phẩm"
                    value={ideaForm.description}
                    onChange={(v) => setIdeaForm({ ...ideaForm, description: v })}
                    isEditing={isEditingIdea}
                    type="textarea"
                    rows={4}
                    placeholder="Nhập mô tả..."
                  />
                  <EditableField
                    label="Prompt"
                    value={ideaForm.prompt}
                    onChange={(v) => setIdeaForm({ ...ideaForm, prompt: v })}
                    isEditing={isEditingIdea}
                    type="textarea"
                    rows={4}
                  />
                  {sourceLinks.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Liên kết nguồn</Label>
                      <div className="space-y-1">
                        {sourceLinks.map((link: string, i: number) => {
                          let domain = link;
                          try { domain = new URL(link).hostname; } catch {}
                          return (
                            <a
                              key={i}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" /> {domain}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {idea.reviewComment && (
                    <>
                      <Separator />
                      <div className="space-y-1.5 bg-red-50 p-3 rounded-lg border border-red-100">
                        <Label className="text-xs text-red-800 font-semibold">Ghi chú của Sếp/Quản lý</Label>
                        <p className="text-sm text-red-700 whitespace-pre-wrap">{idea.reviewComment}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Amazon Listing Tab */}
            <TabsContent value="amazon" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      Amazon Listing
                      {idea.amazonListing && statusBadge(idea.amazonListing.listingStatus, listingStatusLabels)}
                    </CardTitle>
                    <CardDescription>Điền thông tin sản phẩm trên Amazon</CardDescription>
                  </div>
                  <div>
                    {!isEditingAmz ? (
                      <div className="flex items-center gap-1">
                        {/* Download gallery button */}
                        {idea.amazonListing && (() => {
                          try {
                            const gallery = JSON.parse(idea.amazonListing.galleryImages || "[]");
                            if (gallery.length > 0) {
                              return (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const urls = gallery.map((g: string) => convertToDirectImageUrl(g));
                                    urls.forEach((url: string) => window.open(url, "_blank"));
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Tải bộ ảnh ({gallery.length})
                                </Button>
                              );
                            }
                          } catch {}
                          return null;
                        })()}
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingAmz(true)}>
                          <Pencil className="h-4 w-4 mr-2" /> Chỉnh sửa
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsEditingAmz(false)}>
                          <X className="h-4 w-4 mr-2" /> Huỷ
                        </Button>
                        <Button size="sm" onClick={handleSaveAmazon} disabled={saving}>
                          <Save className="h-4 w-4 mr-2" /> Lưu
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Selling Account */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Tài khoản đăng bán</Label>
                      <Select disabled={!isEditingAmz} value={amzForm.sellingAccountId} onValueChange={(v) => setAmzForm({ ...amzForm, sellingAccountId: v })}>
                        <SelectTrigger><SelectValue placeholder="Chọn tài khoản" /></SelectTrigger>
                        <SelectContent>
                          {sellingAccounts.filter((a) => a.platform === "amazon" && a.status === "active").map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Trạng thái Listing</Label>
                      <Select disabled={!isEditingAmz} value={amzForm.listingStatus} onValueChange={(v) => setAmzForm({ ...amzForm, listingStatus: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(listingStatusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(amzForm.listingStatus === "error" || amzForm.listingStatus === "delisted") && (
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-sm">Lý do {amzForm.listingStatus === "error" ? "lỗi" : "bị gỡ"}</Label>
                        <Input
                          disabled={!isEditingAmz}
                          value={amzForm.listingStatusReason}
                          onChange={(e) => setAmzForm({ ...amzForm, listingStatusReason: e.target.value })}
                          placeholder={amzForm.listingStatus === "error" ? "Mô tả lỗi..." : "Lý do sàn gỡ sản phẩm..."}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <EditableField label="ASIN" value={amzForm.asin} onChange={(v) => setAmzForm({ ...amzForm, asin: v })} isEditing={isEditingAmz} placeholder="B0..." />
                      {amzForm.asin && !isEditingAmz && (
                        <a
                          href={`https://www.amazon.com/dp/${amzForm.asin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Xem trên Amazon
                        </a>
                      )}
                    </div>
                    <EditableField label="FNSKU Code" value={amzForm.fnskuCode} onChange={(v) => setAmzForm({ ...amzForm, fnskuCode: v })} isEditing={isEditingAmz} />
                    <EditableField label="Giá ($)" type="number" value={amzForm.price} onChange={(v) => setAmzForm({ ...amzForm, price: v })} isEditing={isEditingAmz} />
                  </div>

                  <Separator />

                  <EditableField label="Item Name (Tiêu đề)" value={amzForm.itemName} onChange={(v) => setAmzForm({ ...amzForm, itemName: v })} isEditing={isEditingAmz} />
                  <EditableField label="Item Highlights" value={amzForm.itemHighlights} onChange={(v) => setAmzForm({ ...amzForm, itemHighlights: v })} isEditing={isEditingAmz} />

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Bullet Points (tối đa 5)</Label>
                    <div className="space-y-2">
                      {amzForm.bulletPoints.map((bp, i) => (
                        <EditableField
                          key={i}
                          value={bp}
                          onChange={(v) => {
                            const bps = [...amzForm.bulletPoints];
                            bps[i] = v;
                            setAmzForm({ ...amzForm, bulletPoints: bps });
                          }}
                          isEditing={isEditingAmz}
                          placeholder={`Bullet point ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <EditableField
                    label="Mô tả chi tiết"
                    value={amzForm.description}
                    onChange={(v) => setAmzForm({ ...amzForm, description: v })}
                    isEditing={isEditingAmz}
                    type="textarea"
                    rows={3}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EditableField
                      label="Tags (từ khoá, phân cách bởi dấu chấm phẩy)"
                      value={amzForm.tags}
                      onChange={(v) => setAmzForm({ ...amzForm, tags: v })}
                      isEditing={isEditingAmz}
                      type="textarea"
                      rows={2}
                    />
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-semibold text-muted-foreground">Slugs (mỗi dòng 1 slug, tối đa 12)</Label>
                        {amzForm.slugs && !isEditingAmz && (
                          <CopyButton text={amzForm.slugs} className="h-4 w-4" />
                        )}
                      </div>
                      {isEditingAmz ? (
                        <Textarea
                          value={amzForm.slugs}
                          onChange={(e) => setAmzForm({ ...amzForm, slugs: e.target.value })}
                          rows={4}
                          placeholder="slug-1&#10;slug-2&#10;slug-3"
                        />
                      ) : amzForm.slugs ? (
                        <div className="space-y-1">
                          {amzForm.slugs.split("\n").filter(Boolean).map((slug, i) => (
                            <div key={i} className="flex items-center gap-1.5 group/slug">
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded flex-1 truncate">{slug}</code>
                              <CopyButton text={slug} className="h-4 w-4 opacity-0 group-hover/slug:opacity-100 transition-opacity" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Chưa có slug</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Gallery images */}
                  <div className="space-y-1.5">
                    {isEditingAmz && (
                      <div className="flex items-center gap-3 mb-2">
                        <Checkbox
                          id="amz-shared-main"
                          checked={amzForm.useSharedMainImage}
                          onCheckedChange={(v) => setAmzForm({ ...amzForm, useSharedMainImage: !!v })}
                        />
                        <Label htmlFor="amz-shared-main" className="text-sm cursor-pointer">
                          Dùng ảnh main chung (ảnh đầu gallery = ảnh main)
                        </Label>
                      </div>
                    )}
                    <Label>Gallery Images (Google Drive links, tối đa 9)</Label>
                    {amzForm.galleryImages.map((img, i) => (
                      <div key={i} className="flex gap-2">
                        <ImagePreviewInput
                          value={img}
                          onChange={(val) => {
                            const imgs = [...amzForm.galleryImages];
                            imgs[i] = val;
                            setAmzForm({ ...amzForm, galleryImages: imgs });
                          }}
                          placeholder="https://drive.google.com/..."
                          className="text-sm"
                        />
                        {isEditingAmz && amzForm.galleryImages.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setAmzForm({
                                ...amzForm,
                                galleryImages: amzForm.galleryImages.filter((_, j) => j !== i),
                              });
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {isEditingAmz && amzForm.galleryImages.length < 9 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAmzForm({ ...amzForm, galleryImages: [...amzForm.galleryImages, ""] })}
                      >
                        + Thêm ảnh
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EditableField label="Video URL" value={amzForm.videoUrl} onChange={(v) => setAmzForm({ ...amzForm, videoUrl: v })} isEditing={isEditingAmz} />
                    <div className="space-y-1.5">
                      <Label>Content A+ URL (Ảnh)</Label>
                      <ImagePreviewInput value={amzForm.contentAPlusUrl} onChange={(val) => setAmzForm({ ...amzForm, contentAPlusUrl: val })} readOnly={!isEditingAmz} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>FNSKU Label File URL (Ảnh hoặc PDF)</Label>
                    <ImagePreviewInput value={amzForm.fnskuLabelFileUrl} onChange={(val) => setAmzForm({ ...amzForm, fnskuLabelFileUrl: val })} readOnly={!isEditingAmz} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Etsy Listing Tab */}
            <TabsContent value="etsy" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      Etsy Listing
                      {idea.etsyListing && statusBadge(idea.etsyListing.listingStatus, listingStatusLabels)}
                    </CardTitle>
                    <CardDescription>Điền thông tin sản phẩm trên Etsy</CardDescription>
                  </div>
                  <div>
                    {!isEditingEtsy ? (
                      <div className="flex items-center gap-1">
                        {/* Download gallery button for Etsy */}
                        {idea.etsyListing && (() => {
                          try {
                            const gallery = JSON.parse(idea.etsyListing.galleryImages || "[]");
                            if (gallery.length > 0) {
                              return (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const urls = gallery.map((g: string) => convertToDirectImageUrl(g));
                                    urls.forEach((url: string) => window.open(url, "_blank"));
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Tải bộ ảnh ({gallery.length})
                                </Button>
                              );
                            }
                          } catch {}
                          return null;
                        })()}
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingEtsy(true)}>
                          <Pencil className="h-4 w-4 mr-2" /> Chỉnh sửa
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsEditingEtsy(false)}>
                          <X className="h-4 w-4 mr-2" /> Huỷ
                        </Button>
                        <Button size="sm" onClick={handleSaveEtsy} disabled={saving}>
                          <Save className="h-4 w-4 mr-2" /> Lưu
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Tài khoản đăng bán</Label>
                      <Select disabled={!isEditingEtsy} value={etsyForm.sellingAccountId} onValueChange={(v) => setEtsyForm({ ...etsyForm, sellingAccountId: v })}>
                        <SelectTrigger><SelectValue placeholder="Chọn tài khoản" /></SelectTrigger>
                        <SelectContent>
                          {sellingAccounts.filter((a) => a.platform === "etsy" && a.status === "active").map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Trạng thái Listing</Label>
                      <Select disabled={!isEditingEtsy} value={etsyForm.listingStatus} onValueChange={(v) => setEtsyForm({ ...etsyForm, listingStatus: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(listingStatusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(etsyForm.listingStatus === "error" || etsyForm.listingStatus === "delisted") && (
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-sm">Lý do {etsyForm.listingStatus === "error" ? "lỗi" : "bị gỡ"}</Label>
                        <Input
                          disabled={!isEditingEtsy}
                          value={etsyForm.listingStatusReason}
                          onChange={(e) => setEtsyForm({ ...etsyForm, listingStatusReason: e.target.value })}
                          placeholder={etsyForm.listingStatus === "error" ? "Mô tả lỗi..." : "Lý do sàn gỡ sản phẩm..."}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EditableField label="Listing ID (Etsy)" value={etsyForm.listingId} onChange={(v) => setEtsyForm({ ...etsyForm, listingId: v })} isEditing={isEditingEtsy} />
                    <EditableField label="Giá ($)" type="number" value={etsyForm.price} onChange={(v) => setEtsyForm({ ...etsyForm, price: v })} isEditing={isEditingEtsy} />
                  </div>

                  <EditableField label="Tiêu đề" value={etsyForm.title} onChange={(v) => setEtsyForm({ ...etsyForm, title: v })} isEditing={isEditingEtsy} />
                  <EditableField label="Mô tả" value={etsyForm.description} onChange={(v) => setEtsyForm({ ...etsyForm, description: v })} isEditing={isEditingEtsy} type="textarea" rows={4} />

                  {/* Tags with chips */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label>Tags (tối đa 13, mỗi tag tối đa 20 ký tự)</Label>
                      <CopyButton text={etsyForm.tags.join(", ")} className="h-5 w-5" />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {etsyForm.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {tag}
                          {isEditingEtsy && (
                            <button
                              type="button"
                              onClick={() => setEtsyForm({ ...etsyForm, tags: etsyForm.tags.filter((_, j) => j !== i) })}
                              className="hover:text-destructive"
                            >
                              ×
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                    {isEditingEtsy && etsyForm.tags.length < 13 && (
                      <Input
                        value={etsyForm.tagsInput}
                        onChange={(e) => setEtsyForm({ ...etsyForm, tagsInput: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            const val = etsyForm.tagsInput.trim().slice(0, 20);
                            if (val && !etsyForm.tags.includes(val)) {
                              setEtsyForm({
                                ...etsyForm,
                                tags: [...etsyForm.tags, val],
                                tagsInput: "",
                              });
                            }
                          }
                        }}
                        placeholder="Nhập tag rồi bấm Enter..."
                        className="text-sm"
                      />
                    )}
                    <p className="text-xs text-muted-foreground">{etsyForm.tags.length}/13 tags</p>
                  </div>

                  <Separator />

                  {/* Gallery */}
                  <div className="space-y-2">
                    {isEditingEtsy && (
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="etsy-shared-gallery"
                          checked={etsyForm.useSharedGallery}
                          onCheckedChange={(v) => setEtsyForm({ ...etsyForm, useSharedGallery: !!v })}
                        />
                        <Label htmlFor="etsy-shared-gallery" className="text-sm cursor-pointer">
                          Dùng chung gallery ảnh Amazon
                        </Label>
                      </div>
                    )}

                    {etsyForm.useSharedGallery ? (
                      /* Show Amazon gallery images as read-only reference */
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Ảnh từ Amazon (dùng chung)</Label>
                        {amzForm.galleryImages.filter(Boolean).length > 0 ? (
                          amzForm.galleryImages.filter(Boolean).map((img, i) => (
                            <div key={i} className="flex gap-2">
                              <ImagePreviewInput
                                value={img}
                                onChange={() => {}}
                                readOnly
                                className="text-sm opacity-70"
                              />
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Chưa có ảnh Amazon nào. Hãy thêm ảnh ở tab Amazon trước.</p>
                        )}
                      </div>
                    ) : (
                      <>
                        {isEditingEtsy && (
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id="etsy-shared-main"
                              checked={etsyForm.useSharedMainImage}
                              onCheckedChange={(v) => setEtsyForm({ ...etsyForm, useSharedMainImage: !!v })}
                            />
                            <Label htmlFor="etsy-shared-main" className="text-sm cursor-pointer">
                              Dùng ảnh main chung
                            </Label>
                          </div>
                        )}
                        <Label>Gallery Images</Label>
                        {etsyForm.galleryImages.map((img, i) => (
                          <div key={i} className="flex gap-2">
                            <ImagePreviewInput
                              value={img}
                              onChange={(val) => {
                                const imgs = [...etsyForm.galleryImages];
                                imgs[i] = val;
                                setEtsyForm({ ...etsyForm, galleryImages: imgs });
                              }}
                              placeholder="https://drive.google.com/..."
                              className="text-sm"
                              readOnly={!isEditingEtsy}
                            />
                            {isEditingEtsy && etsyForm.galleryImages.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => setEtsyForm({ ...etsyForm, galleryImages: etsyForm.galleryImages.filter((_, j) => j !== i) })}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {isEditingEtsy && etsyForm.galleryImages.length < 9 && (
                          <Button type="button" variant="outline" size="sm" onClick={() => setEtsyForm({ ...etsyForm, galleryImages: [...etsyForm.galleryImages, ""] })}>
                            + Thêm ảnh
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    {isEditingEtsy && (
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="etsy-amz-video"
                          checked={etsyForm.useAmazonVideo}
                          onCheckedChange={(v) => setEtsyForm({ ...etsyForm, useAmazonVideo: !!v })}
                        />
                        <Label htmlFor="etsy-amz-video" className="text-sm cursor-pointer">
                          Dùng video Amazon
                        </Label>
                      </div>
                    )}
                    {!etsyForm.useAmazonVideo && (
                      <EditableField label="Video URL" value={etsyForm.videoUrl} onChange={(v) => setEtsyForm({ ...etsyForm, videoUrl: v })} isEditing={isEditingEtsy} />
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            {/* History Tab */}
            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lịch sử thay đổi</CardTitle>
                </CardHeader>
                <CardContent>
                  <AuditLogViewer ideaId={id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
