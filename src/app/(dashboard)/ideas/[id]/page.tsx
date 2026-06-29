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
import { AmazonListingTab } from "@/components/ideas/amazon-listing-tab";
import { EtsyListingTab } from "@/components/ideas/etsy-listing-tab";

import { ImagePreviewDialog } from "@/components/image-preview-dialog";
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
  XCircle,
  X,
  Trash2,
  Upload,
  ShoppingBag,
  Printer,
  History,
  Save,
  Type,
  AlignLeft,
  Sparkles, Terminal,
  MessageSquareWarning,
  Package,
  Calendar,
  Ruler,
  Layers,
  Tag,
  Store,
  ChevronDown,
  ChevronUp,
  UserCircle,
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

function getStatusDotColor(status?: string) {
  if (!status || status === "not_ready") return "bg-gray-400 dark:bg-gray-500";
  if (status === "ready" || status === "fixed") return "bg-emerald-500 animate-pulse";
  if (status === "published") return "bg-emerald-500";
  if (status === "uploading") return "bg-amber-500 animate-pulse";
  if (status === "error") return "bg-red-500 animate-pulse";
  if (status === "delisted") return "bg-red-700";
  return "bg-gray-400";
}

// Amazon listing status workflow
const NEXT_STATUS: Record<string, { label: string; next: string; className: string }[]> = {
  ready: [{ label: "Đang up", next: "uploading", className: "bg-cyan-600 hover:bg-cyan-700" }],
  uploading: [
    { label: "Đã lên", next: "published", className: "bg-green-600 hover:bg-green-700" },
    { label: "Lỗi", next: "error", className: "bg-red-600 hover:bg-red-700" },
  ],
  published: [
    { label: "Bị gỡ", next: "delisted", className: "bg-red-600 hover:bg-red-700" },
    { label: "Lỗi", next: "error", className: "bg-orange-600 hover:bg-orange-700" },
  ],
  error: [{ label: "Đã sửa", next: "fixed", className: "bg-emerald-600 hover:bg-emerald-700" }],
  fixed: [{ label: "Đã lên", next: "published", className: "bg-green-600 hover:bg-green-700" }],
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
  const [reviewComment, setReviewComment] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | "revise" | null>(null);
  const [photoRevisionInput, setPhotoRevisionInput] = useState("");
  const [labelPrintQty, setLabelPrintQty] = useState(1);
  const [autoNext, setAutoNext] = useState(true);

  // Sheets
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [changeFulfillmentOpen, setChangeFulfillmentOpen] = useState(false);
  const [pendingFulfillment, setPendingFulfillment] = useState<"FBM" | "FBA" | null>(null);

  // Idea general form state — only prompt (title/description belong to Amazon/Etsy)
  const [ideaForm, setIdeaForm] = useState({ prompt: "" });

  // Amazon listing form state

  // Etsy listing form state

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sellingAccounts, setSellingAccounts] = useState<any[]>([]);

  const fetchIdea = useCallback(async () => {
    try {
      const res = await fetch(`/api/ideas/${id}`, { cache: "no-store" });
      if (!res.ok) { toast.error("Không tìm thấy ý tưởng"); router.push("/ideas"); return; }
      const data = await res.json();
      setIdea(data);
      setIdeaForm({ prompt: data.prompt || "" });


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
            const listRes = await fetch("/api/ideas?ideaStatus=reviewing");
            if (listRes.ok) {
              const list = await listRes.json();
              const nextIdea = (list.data || list).find((i: any) => i.id !== id);
              if (nextIdea) {
                router.push(`/ideas/${nextIdea.id}`);
                return;
              }
            }
            sessionStorage.setItem("confetti-celebrate", JSON.stringify({ msku: idea.msku, ideaId: id }));
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



  const handleListingStatusChange = async (platform: "amazon" | "etsy", newStatus: string) => {
    try {
      const res = await fetch(`/api/ideas/${id}/${platform}-listing`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingStatus: newStatus }),
      });
      if (res.ok) {
        toast.success(`Trạng thái: ${(listingStatusLabels as Record<string, string>)[newStatus] || newStatus}`);
        fetchIdea();
      } else {
        const err = await res.json();
        toast.error(err.error || "Lỗi cập nhật trạng thái");
        if (err.error?.includes("Lý do") || err.error?.includes("Thiếu") || err.error?.includes("Vui lòng")) {
          toast.info("Vui lòng click Sửa và nhập đầy đủ thông tin");
        }
      }
    } catch (err) {
      toast.error("Lỗi hệ thống");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────


  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!idea) return null;

  const sourceLinks: string[] = (() => { try { return JSON.parse(idea.sourceLinks || "[]"); } catch { return []; } })();
  const canApprove = role && can(role, "approve_idea") && (idea.status === "reviewing" || idea.status === "revision_requested");
  const canManagePhotos = role && can(role, "assign_photo_task");
  const inProduction = (idea.amazonListing?.listingStatus === "published" || idea.etsyListing?.listingStatus === "published") || idea.fileStatus === "approved" || !!idea.designFileUrl;
  const deleteContext = (() => {
    if (!role) return { canDelete: false, reason: "Chưa đăng nhập" };
    if (inProduction) return { canDelete: false, reason: "Ý tưởng đã đi vào sản xuất hoặc đăng bán" };
    if (role === "employee") {
      if (idea.createdById !== session?.user?.id) return { canDelete: false, reason: "Bạn chỉ có thể xoá ý tưởng của chính mình" };
      if (!(idea.status === "reviewing" || (idea.status === "approved" && (idea.photoStatus === "not_requested" || idea.photoStatus === "awaiting_photos") && idea.fileStatus !== "approved" && !idea.designFileUrl))) {
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
      <div className="flex flex-col h-full overflow-hidden -mt-3 md:-mt-4 -mx-4 md:-mx-6">
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
                <Sheet open={editOpen} onOpenChange={setEditOpen}>
                  <Tooltip><TooltipTrigger asChild>
                    <span>
                      <SheetTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={(idea.amazonListing?.listingStatus === "published" || idea.etsyListing?.listingStatus === "published")}><Pencil className="h-3.5 w-3.5" /></Button></SheetTrigger>
                    </span>
                  </TooltipTrigger><TooltipContent sideOffset={5} className="z-[100]">Sửa prompt & ảnh</TooltipContent></Tooltip>
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

                {/* 2. Make a Copy */}
                <Tooltip><TooltipTrigger asChild>
                  <span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/ideas/new?cloneFrom=${id}`)} disabled={saving}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                </TooltipTrigger><TooltipContent sideOffset={5} className="z-[100]">Tạo bản sao</TooltipContent></Tooltip>

                {/* 3. History */}
                <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                  <Tooltip><TooltipTrigger asChild>
                    <span>
                      <SheetTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><History className="h-4 w-4" /></Button></SheetTrigger>
                    </span>
                  </TooltipTrigger><TooltipContent sideOffset={5} className="z-[100]">Lịch sử thay đổi</TooltipContent></Tooltip>
                  <SheetContent side="right" className="w-[480px] sm:max-w-[480px] z-[100]">
                    <SheetHeader><SheetTitle>Lịch sử thay đổi</SheetTitle><SheetDescription>{idea.msku}</SheetDescription></SheetHeader>
                    <div className="mt-4 overflow-y-auto max-h-[calc(100vh-10rem)]">
                      <AuditLogViewer ideaId={id} />
                    </div>
                  </SheetContent>
                </Sheet>



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
                  <div className="flex items-center ml-1.5 pl-1.5 border-l">
                    <div className="flex items-center bg-muted/30 p-1 rounded-md">

                      <Dialog open={actionType === "reject" || actionType === "revise"} onOpenChange={(open) => !open && setActionType(null)}>
                        <DialogTrigger asChild>
                          <div className="flex items-center">
                            <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => setActionType("reject")}>Từ chối</Button>
                            <div className="flex items-center pl-1 border-l border-border/50 ml-1">
                              <Button variant="outline" size="sm" className="h-8 text-xs text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => setActionType("revise")}>Yêu cầu sửa</Button>
                            </div>
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

                      <div className="flex items-center gap-1 pl-1 border-l border-border/50 ml-1">
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
            <div className="flex-1 flex flex-col overflow-hidden px-4 md:px-6 pt-3 pb-4">

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
                  <div className="flex items-end justify-between shrink-0 border-b border-border">
                    <TabsList className="flex h-auto w-fit bg-transparent p-0 gap-6 rounded-none -mb-px">
                      <TabsTrigger
                        value="amazon"
                        className="rounded-none !border-x-0 !border-t-0 border-b-2 border-transparent !bg-transparent px-2 pb-3 pt-2 text-sm font-semibold text-muted-foreground transition-all flex items-center gap-2 
                                   data-[state=active]:border-b-blue-600 dark:data-[state=active]:border-b-blue-500 data-[state=active]:text-foreground data-[state=active]:shadow-none outline-none
                                   hover:text-foreground"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="https://www.amazon.com/favicon.ico" className="w-4 h-4 object-contain shrink-0" alt="Amazon" />
                        <span>Amazon</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotColor(idea.amazonListing?.listingStatus)}`}
                          title={`Amazon: ${(listingStatusLabels as any)[idea.amazonListing?.listingStatus || "ready"]}`}
                        />
                      </TabsTrigger>
                      <TabsTrigger
                        value="etsy"
                        className="rounded-none !border-x-0 !border-t-0 border-b-2 border-transparent !bg-transparent px-2 pb-3 pt-2 text-sm font-semibold text-muted-foreground transition-all flex items-center gap-2 
                                   data-[state=active]:border-b-blue-600 dark:data-[state=active]:border-b-blue-500 data-[state=active]:text-foreground data-[state=active]:shadow-none outline-none
                                   hover:text-foreground"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="https://www.etsy.com/favicon.ico" className="w-4 h-4 object-contain shrink-0" alt="Etsy" />
                        <span>Etsy</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotColor(idea.etsyListing?.listingStatus)}`}
                          title={`Etsy: ${(listingStatusLabels as any)[idea.etsyListing?.listingStatus || "ready"]}`}
                        />
                      </TabsTrigger>
                    </TabsList>
                    {isNotApproved && !isPartner && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-amber-600 dark:text-amber-400 text-[10px] mb-1.5 ml-auto">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span>Ý tưởng chưa duyệt, chưa thể chỉnh sửa Content Amz, Etsy</span>
                      </div>
                    )}
                  </div>

                  {/* ─── Amazon Tab ─── */}
                  {/* ─── Amazon Tab ─── */}
                  <AmazonListingTab
                    session={session}
                    canManagePhotos={canManagePhotos}
                    idea={idea}
                    sellingAccounts={sellingAccounts}
                    isNotApproved={isNotApproved}
                    isPartner={isPartner}
                    NEXT_STATUS={NEXT_STATUS}
                    listingStatusLabels={listingStatusLabels}
                    role={role}
                    saving={saving}
                    handleListingStatusChange={handleListingStatusChange}
                    fetchIdea={fetchIdea}
                    fulfillmentToggle={
                      <>
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
                      </>
                    }
                  />

                  {/* ─── Etsy Tab ─── */}
                  <EtsyListingTab
                    session={session}
                    canManagePhotos={canManagePhotos}
                    idea={idea}
                    sellingAccounts={sellingAccounts}
                    isNotApproved={isNotApproved}
                    isPartner={isPartner}
                    NEXT_STATUS={NEXT_STATUS}
                    listingStatusLabels={listingStatusLabels}
                    role={role}
                    saving={saving}
                    handleListingStatusChange={handleListingStatusChange}
                    fetchIdea={fetchIdea}
                  />
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

            <Separator />

            {/* Origin */}
            <div className="p-3 space-y-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Nguồn gốc</span>
              <div className="flex flex-wrap gap-2 px-1">
                {sourceLinks.length === 0 ? (
                  <ButtonIconHover variant="outline" size="sm" className="h-7 text-[10px] bg-background shadow-sm hover:bg-muted/50 rounded-full px-3 w-fit opacity-50 cursor-not-allowed">
                    Chưa có nguồn gốc
                  </ButtonIconHover>
                ) : (
                  sourceLinks.slice(0, 5).map((link, i) => {
                    if (link.startsWith("internal:")) {
                      const originalId = link.substring(9);
                      const originalIdea = idea.internalSourceIdeas?.find((idObj: any) => idObj.id === originalId);
                      const displayMsku = originalIdea ? originalIdea.msku : "Nội bộ";
                      return (
                        <ButtonIconHover
                          key={i}
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 shadow-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full px-3 w-fit"
                          onClick={() => window.open(`/ideas/${originalId}`, "_blank")}
                        >
                          {displayMsku}
                        </ButtonIconHover>
                      );
                    }
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
                <div className="flex items-center gap-1.5 text-muted-foreground"><UserCircle className="h-3 w-3" /> Sản phẩm của</div><span className="text-right font-medium truncate">{idea.source === "partner" ? `Đối tác: ${idea.partner?.name || idea.partnerLabel || "—"}` : idea.source === "boss" ? `Boss: ${idea.createdBy?.fullName || "—"}` : `Nhân viên: ${idea.createdBy?.fullName || "—"}`}</span>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Layers className="h-3 w-3" /> Chủ đề</div><span className="text-right font-medium truncate">{idea.topic?.name || "—"}</span>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-3 w-3" /> Ngày tạo</div><span className="text-right font-medium">{new Date(idea.createdAt).toLocaleDateString("vi-VN")}</span>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Ruler className="h-3 w-3" /> Kích thước</div><span className="text-right font-medium">{idea.widthCm ? `${idea.widthCm}×${idea.heightCm}×${idea.thicknessMm}mm` : "—"}</span>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Layers className="h-3 w-3" /> Vật liệu</div><span className="text-right font-medium truncate">{idea.material || "—"}</span>
              </div>
            </div>

            <Separator />

            {/* File Management */}
            <div className="p-3 space-y-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">File Thiết Kế & Sản Xuất</span>
              <div className="space-y-2 mt-1">
                <div className="flex items-center justify-between text-[11px] px-1">
                  <span className="text-muted-foreground font-medium">Trạng thái file:</span>
                  {statusBadge(idea.fileStatus || "not_requested", fileStatusLabels)}
                </div>
                {idea.fileAssignee && (
                  <div className="flex items-center justify-between text-[11px] px-1">
                    <span className="text-muted-foreground font-medium">Người nhận file:</span>
                    <span className="font-medium truncate max-w-[150px] text-right">{idea.fileAssignee.fullName}</span>
                  </div>
                )}
                {idea.designFileUrl && (
                  <div className="flex items-center justify-between text-[11px] px-1">
                    <span className="text-muted-foreground font-medium">Link file:</span>
                    <a href={idea.designFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                      <ExternalLink className="h-3 w-3" /> Xem file thiết kế
                    </a>
                  </div>
                )}
                {idea.fileRevisionNote && (
                  <div className="text-[11px] px-1.5 py-1.5 mt-1 bg-amber-50 text-amber-800 rounded border border-amber-200">
                    <span className="font-semibold block mb-0.5">Ghi chú sửa:</span>
                    <span className="block whitespace-pre-wrap">{idea.fileRevisionNote}</span>
                  </div>
                )}

                {/* Workflow Actions for Design File */}
                <div className="pt-2 space-y-1.5 border-t mt-2">
                  {(role === "manager" || role === "boss" || idea.createdById === session?.user?.id) && (!idea.fileStatus || idea.fileStatus === "not_requested") && (
                    <Button size="sm" className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleUpdateIdea({ fileStatus: "awaiting_file" })} disabled={saving}>
                      Yêu cầu làm file thiết kế
                    </Button>
                  )}
                  {idea.fileStatus === "awaiting_file" && !idea.fileAssigneeId && (
                    <Button size="sm" className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleUpdateIdea({ fileAssigneeId: session?.user?.id })} disabled={saving}>
                      Nhận nhiệm vụ thiết kế
                    </Button>
                  )}
                  {idea.fileStatus === "awaiting_file" && idea.fileAssigneeId === session?.user?.id && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Input
                          placeholder="Nhập link file (Google Drive, Dropbox...)"
                          className="h-7 text-xs"
                          id="upload-file-url"
                          onBlur={(e) => {
                            if (e.target.value) handleUpdateIdea({ designFileUrl: e.target.value });
                          }}
                          defaultValue={idea.designFileUrl || ""}
                        />
                        <Button size="sm" className="w-full h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={() => {
                          const input = document.getElementById('upload-file-url') as HTMLInputElement;
                          if (!input?.value) { toast.error("Vui lòng nhập link file!"); return; }
                          handleUpdateIdea({ designFileUrl: input.value, fileStatus: "pending_approval" });
                        }} disabled={saving}>
                          Nộp file thiết kế
                        </Button>
                      </div>
                      <Button size="sm" variant="outline" className="w-full h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleUpdateIdea({ fileAssigneeId: null })} disabled={saving}>
                        Hủy nhận việc
                      </Button>
                    </>
                  )}
                  {idea.fileStatus === "revision_requested" && idea.fileAssigneeId === session?.user?.id && (
                    <div className="flex flex-col gap-1.5 mt-2">
                      <Input
                        placeholder="Cập nhật link file..."
                        className="h-7 text-xs"
                        id="update-file-url"
                        onBlur={(e) => {
                          if (e.target.value) handleUpdateIdea({ designFileUrl: e.target.value });
                        }}
                        defaultValue={idea.designFileUrl || ""}
                      />
                      <Button size="sm" className="w-full h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleUpdateIdea({ fileStatus: "pending_approval" })} disabled={saving}>
                        Nộp lại file đã sửa
                      </Button>
                    </div>
                  )}
                  {(role === "manager" || role === "boss" || idea.createdById === session?.user?.id) && idea.fileStatus === "pending_approval" && (
                    <div className="flex flex-col gap-1.5">
                      <Button size="sm" className="w-full h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => handleUpdateIdea({ fileStatus: "approved" })} disabled={saving}>
                        Duyệt file
                      </Button>
                      <div className="flex gap-1">
                        <Input id="file-revision-note" placeholder="Lý do sửa..." className="h-7 text-xs flex-1" />
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => {
                          const note = (document.getElementById('file-revision-note') as HTMLInputElement)?.value;
                          if (!note) { toast.error("Vui lòng nhập lý do sửa!"); return; }
                          handleUpdateIdea({ fileStatus: "revision_requested", fileRevisionNote: note });
                        }} disabled={saving}>
                          Yêu cầu sửa
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
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
      <AlertDialog open={changeFulfillmentOpen} onOpenChange={setChangeFulfillmentOpen}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              Xác nhận chuyển đổi phương thức Fulfillment
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground mt-2">
                <p>Bạn có chắc chắn muốn chuyển đổi sang <strong>{pendingFulfillment}</strong> không?</p>
                <p className="text-destructive font-medium">Lưu ý: Hành động này có thể ảnh hưởng đến quy trình in tem và vận chuyển.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setChangeFulfillmentOpen(false); setPendingFulfillment(null); }}>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleChangeFulfillment} className="bg-amber-600 hover:bg-amber-700 text-white">Chuyển đổi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
