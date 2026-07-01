"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ClipboardList,
  Image as ImageIcon,
  FileText,
  Layers,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Send,
  Upload,
  Download,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { Role } from "@/lib/permissions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Types ──────────────────────────────────────────────────────────
interface AssignedIdea {
  id: string;
  msku: string;
  mainImageUrl: string;
  status: string;
  photoStatus?: string;
  fileStatus?: string;
  topicName?: string;
  createdAt: string;
}

interface LayoutRequest {
  id: string;
  ideaId: string;
  type: string;
  priority: string;
  requestedQty: number;
  noteForWorkers: string | null;
  status: string;
  requestedAt: string;
  layoutAssigneeId: string | null;
  idea: {
    id: string;
    msku: string;
    amazonListing?: { sku: string; fulfillmentType: string; itemName: string; description?: string | null } | null;
    mainImageUrl: string;
    designFileUrl?: string | null;
    widthCm?: number | null;
    heightCm?: number | null;
    thicknessMm?: number | null;
    material?: string | null;
  } | null;
  layoutAssignee?: {
    id: string;
    fullName: string;
    nameAbbreviation: string;
  } | null;
}

export default function MyTasksPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const role = session?.user?.role as Role | undefined;
  const isEmployee = role === "employee";

  const [photoTasks, setPhotoTasks] = useState<AssignedIdea[]>([]);
  const [fileTasks, setFileTasks] = useState<AssignedIdea[]>([]);
  const [layoutRequests, setLayoutRequests] = useState<LayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Batch claim
  const [selectedForClaim, setSelectedForClaim] = useState<Set<string>>(new Set());

  // Quick View Drawer
  const [viewingRequest, setViewingRequest] = useState<LayoutRequest | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Fetch photo tasks (ideas assigned to current user for photos)
      const photoRes = await fetch(
        `/api/ideas?photoStatus=awaiting_photos,pending_approval,revision_requested&pageSize=100`
      );
      if (photoRes.ok) {
        const json = await photoRes.json();
        const ideas = (json.data || []).filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (idea: any) => idea.photoAssigneeId === userId
        );
        setPhotoTasks(ideas);
      }

      // Fetch file design tasks (ideas assigned to current user for files)
      const fileRes = await fetch(
        `/api/ideas?ideaStatus=approved&pageSize=100`
      );
      if (fileRes.ok) {
        const json = await fileRes.json();
        const ideas = (json.data || []).filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (idea: any) =>
            idea.fileAssigneeId === userId ||
            idea.fileStatus === "awaiting_file" ||
            idea.fileStatus === "pending_approval" ||
            idea.fileStatus === "revision_requested"
        );
        setFileTasks(ideas);
      }

      // Fetch production requests awaiting layout (NOT from notifications)
      const prodRes = await fetch(`/api/production?status=awaiting_layout`);
      if (prodRes.ok) {
        const json = await prodRes.json();
        setLayoutRequests(Array.isArray(json) ? json : []);
      }
    } catch {
      // Silently fail — these are optional fetches
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleClaim = async (requestId: string) => {
    if (!userId) return;
    const { data, error } = await apiFetch(`/api/production/${requestId}/claim`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId: userId }),
      successMessage: "Đã nhận việc!",
    });
    if (data || !error) {
      fetchTasks();
    }
  };

  const handleBatchClaim = async () => {
    if (!userId || selectedForClaim.size === 0) return;
    const { data } = await apiFetch("/api/production/claim-bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestIds: Array.from(selectedForClaim) }),
      successMessage: `Đã nhận ${selectedForClaim.size} việc!`,
    });
    if (data) {
      setSelectedForClaim(new Set());
      fetchTasks();
    }
  };

  const toggleSelectForClaim = (id: string) => {
    const next = new Set(selectedForClaim);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedForClaim(next);
  };

  const toggleSelectAll = () => {
    const unclaimed = layoutRequests.filter((r) => !r.layoutAssigneeId);
    if (selectedForClaim.size === unclaimed.length && unclaimed.length > 0) {
      setSelectedForClaim(new Set());
    } else {
      setSelectedForClaim(new Set(unclaimed.map((r) => r.id)));
    }
  };

  // ─── Nộp file & Ghép Layout (modal mới) ───
  const [quickSubmitOpen, setQuickSubmitOpen] = useState(false);
  const [quickDxfUrl, setQuickDxfUrl] = useState("");
  const [quickPdfUrl, setQuickPdfUrl] = useState("");
  const [quickMaterial, setQuickMaterial] = useState("");
  const [quickWidth, setQuickWidth] = useState("");
  const [quickLength, setQuickLength] = useState("");
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  // SKU selection within the submit modal
  const [selectedSkusForSubmit, setSelectedSkusForSubmit] = useState<Set<string>>(new Set());
  const [skuQtyPerRun, setSkuQtyPerRun] = useState<Record<string, number>>({});

  // All claimed tasks for current user (used in the modal)
  const claimedTasksForSubmit = layoutRequests.filter(
    (r) => r.layoutAssigneeId === userId
  );

  const openQuickSubmit = () => {
    setQuickDxfUrl("");
    setQuickPdfUrl("");
    setQuickMaterial("");
    setQuickWidth("");
    setQuickLength("");
    setSelectedSkusForSubmit(new Set());
    setSkuQtyPerRun({});
    setQuickSubmitOpen(true);
  };

  const toggleSkuForSubmit = (reqId: string) => {
    const next = new Set(selectedSkusForSubmit);
    if (next.has(reqId)) {
      next.delete(reqId);
      setSkuQtyPerRun((prev) => {
        const copy = { ...prev };
        delete copy[reqId];
        return copy;
      });
    } else {
      next.add(reqId);
      setSkuQtyPerRun((prev) => ({ ...prev, [reqId]: 1 }));
    }
    setSelectedSkusForSubmit(next);
  };

  const handleQuickSubmit = async () => {
    if (!quickDxfUrl.trim()) {
      toast.error("Vui lòng nhập link file DXF");
      return;
    }
    if (selectedSkusForSubmit.size === 0) {
      toast.error("Vui lòng chọn ít nhất 1 SKU để giải quyết");
      return;
    }
    setQuickSubmitting(true);
    const { data, error } = await apiFetch("/api/production-layouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dxfFileUrl: quickDxfUrl.trim(),
        pdfFileUrl: quickPdfUrl.trim() || undefined,
        materialCode: quickMaterial.trim() || "BW-3-MXL",
        materialWidth: parseFloat(quickWidth) || 910,
        materialLength: parseFloat(quickLength) || 600,
        items: Array.from(selectedSkusForSubmit).map((reqId) => {
          const req = claimedTasksForSubmit.find((r) => r.id === reqId);
          return {
            ideaId: req?.ideaId || "",
            quantityPerRun: skuQtyPerRun[reqId] || 1,
          };
        }),
        requestIds: Array.from(selectedSkusForSubmit),
      }),
      successMessage: `Đã nộp file và hoàn thành ${selectedSkusForSubmit.size} SKU! 🎉`,
    });
    setQuickSubmitting(false);
    if (data || !error) {
      setQuickSubmitOpen(false);
      fetchTasks();
    }
  };

  const priorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      urgent: "bg-red-100 text-red-800 border-red-200",
      priority: "bg-amber-100 text-amber-800 border-amber-200",
      normal: "bg-gray-100 text-gray-700 border-gray-200",
    };
    const labels: Record<string, string> = {
      urgent: "Khẩn",
      priority: "Ưu tiên",
      normal: "Thường",
    };
    return (
      <Badge variant="outline" className={`text-[9px] ${styles[priority] || ""}`}>
        {labels[priority] || priority}
      </Badge>
    );
  };

  if (!isEmployee) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Công việc của tôi
          </h1>
          <p className="text-muted-foreground text-sm">
            Trang này dành cho Nhân viên (Designer). Vai trò hiện tại: {role}
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">
              Bạn không có task nào ở vai trò hiện tại.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          Công việc của tôi
        </h1>
        <p className="text-muted-foreground text-sm">
          Tổng hợp các task được giao — ảnh, file thiết kế, file sản xuất
        </p>
      </div>

      <Tabs defaultValue="photos" className="w-full">
        <TabsList>
          <TabsTrigger value="photos" className="gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            Ảnh
            {photoTasks.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                {photoTasks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            File thiết kế
            {fileTasks.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                {fileTasks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="layouts" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            File sản xuất
            {layoutRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                {layoutRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Photo Tasks */}
        <TabsContent value="photos" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : photoTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Bạn chưa được giao task làm ảnh nào.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {photoTasks.map((idea) => (
                <Link key={idea.id} href={`/ideas/${idea.id}`} target="_blank">
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="flex items-center gap-3 py-3">
                      <div className="shrink-0 w-10 h-10 rounded bg-muted overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={idea.mainImageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-mono font-semibold text-sm">{idea.msku}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {idea.topicName || ""}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {idea.photoStatus || "—"}
                      </Badge>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: File Design Tasks */}
        <TabsContent value="files" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : fileTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Bạn chưa được giao task làm file thiết kế nào.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {fileTasks.map((idea) => (
                <Link key={idea.id} href={`/ideas/${idea.id}`} target="_blank">
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="flex items-center gap-3 py-3">
                      <div className="shrink-0">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-mono font-semibold text-sm">{idea.msku}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {idea.topicName || ""}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {idea.fileStatus || "—"}
                      </Badge>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Production Layout Requests — query ProductionRequest directly */}
        <TabsContent value="layouts" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : layoutRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Layers className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">
                  Chưa có yêu cầu làm file layout nào.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Khi Quản lý yêu cầu layout mới hoặc Worker báo lỗi file, bạn sẽ thấy task ở đây.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Batch claim toolbar */}
              <div className="flex items-center justify-between mb-2 px-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <Checkbox
                    checked={
                      layoutRequests.filter((r) => !r.layoutAssigneeId).length > 0 &&
                      selectedForClaim.size === layoutRequests.filter((r) => !r.layoutAssigneeId).length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                  Chọn tất cả
                </label>
                {selectedForClaim.size > 0 && (
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                    onClick={handleBatchClaim}
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    Nhận {selectedForClaim.size} việc đã chọn
                  </Button>
                )}
              </div>

              <div className="space-y-2">
              {layoutRequests.map((req) => {
                const isClaimedByMe = req.layoutAssigneeId === userId;
                const isClaimedByOther =
                  req.layoutAssigneeId && req.layoutAssigneeId !== userId;
                const isUnclaimed = !req.layoutAssigneeId;

                return (
                  <Card
                    key={req.id}
                    className={`transition-colors ${
                      isClaimedByMe
                        ? "border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-950/20"
                        : isClaimedByOther
                        ? "opacity-60"
                        : "border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
                    }`}
                  >
                    <CardContent className="flex items-start gap-3 py-3">
                      {/* Checkbox for unclaimed tasks */}
                      {isUnclaimed && (
                        <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedForClaim.has(req.id)}
                            onCheckedChange={() => toggleSelectForClaim(req.id)}
                          />
                        </div>
                      )}
                      {!isUnclaimed && <div className="w-4 shrink-0" />}

                      <div
                        className={`mt-0.5 flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                          isClaimedByMe
                            ? "bg-green-100 text-green-600"
                            : isClaimedByOther
                            ? "bg-gray-100 text-gray-500"
                            : req.priority === "urgent"
                            ? "bg-red-100 text-red-600"
                            : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        {isClaimedByMe ? (
                          <UserCheck className="h-4 w-4" />
                        ) : isClaimedByOther ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {priorityBadge(req.priority)}
                          <Badge
                            variant="outline"
                            className={`text-[9px] ${
                              isClaimedByMe
                                ? "border-green-200 text-green-700"
                                : isClaimedByOther
                                ? "border-gray-200 text-gray-500"
                                : "border-blue-200 text-blue-700"
                            }`}
                          >
                            {isClaimedByMe
                              ? "Tôi đang làm"
                              : isClaimedByOther
                              ? `Đã nhận bởi ${req.layoutAssignee?.fullName || "..."}`
                              : "Cần người nhận"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(req.requestedAt), "dd/MM HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm mt-1">
                          <button
                            type="button"
                            className="font-mono font-semibold text-blue-600 hover:underline cursor-pointer text-left"
                            onClick={(e) => {
                              e.preventDefault();
                              setViewingRequest(req);
                            }}
                            title="Xem chi tiết sản phẩm"
                          >
                            {req.idea?.msku || req.ideaId}
                          </button>
                          {req.idea?.amazonListing?.itemName && (
                            <span className="text-muted-foreground ml-2">
                              {req.idea.amazonListing.itemName.slice(0, 60)}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span>SL: {req.requestedQty}</span>
                          {req.noteForWorkers && (
                            <span className="truncate max-w-[200px]">
                              📝 {req.noteForWorkers}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isUnclaimed && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleClaim(req.id)}
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Nhận việc
                          </Button>
                        )}
                        {isClaimedByMe && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-green-600 hover:bg-green-700"
                              onClick={() => openQuickSubmit()}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Nộp file
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              asChild
                            >
                              <Link href={`/production/layouts?requestId=${req.id}`}>
                                <Layers className="h-3 w-3 mr-1" />
                                Batch
                              </Link>
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick View Drawer — Xem chi tiết sản phẩm tại chỗ */}
      <Sheet open={!!viewingRequest} onOpenChange={(v) => { if (!v) setViewingRequest(null); }}>
        <SheetContent side="right" className="w-[400px] sm:w-[480px] overflow-y-auto">
          {viewingRequest?.idea && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono">{viewingRequest.idea.msku}</SheetTitle>
                <SheetDescription>
                  {viewingRequest.idea.amazonListing?.itemName || "Chi tiết sản phẩm"}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                {/* Main image */}
                {viewingRequest.idea.mainImageUrl && (
                  <div className="rounded-md overflow-hidden border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewingRequest.idea.mainImageUrl}
                      alt={viewingRequest.idea.msku}
                      className="w-full object-cover max-h-[250px]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}

                {/* Dimensions */}
                {(viewingRequest.idea.widthCm || viewingRequest.idea.heightCm || viewingRequest.idea.thicknessMm) && (
                  <div className="border rounded-md p-3 space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kích thước</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {viewingRequest.idea.widthCm && (
                        <div><span className="text-muted-foreground">Rộng:</span> <strong>{viewingRequest.idea.widthCm} cm</strong></div>
                      )}
                      {viewingRequest.idea.heightCm && (
                        <div><span className="text-muted-foreground">Cao:</span> <strong>{viewingRequest.idea.heightCm} cm</strong></div>
                      )}
                      {viewingRequest.idea.thicknessMm && (
                        <div><span className="text-muted-foreground">Dày:</span> <strong>{viewingRequest.idea.thicknessMm} mm</strong></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Material */}
                {viewingRequest.idea.material && (
                  <div className="border rounded-md p-3 space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vật liệu</h4>
                    <p className="text-sm font-medium">{viewingRequest.idea.material}</p>
                  </div>
                )}

                {/* Description (from Amazon listing) */}
                {viewingRequest.idea.amazonListing?.description && (
                  <div className="border rounded-md p-3 space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mô tả</h4>
                    <p className="text-sm text-muted-foreground">{viewingRequest.idea.amazonListing.description}</p>
                  </div>
                )}

                {/* Design file */}
                {viewingRequest.idea.designFileUrl && (
                  <div className="border rounded-md p-3 space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">File thiết kế gốc</h4>
                    <a
                      href={viewingRequest.idea.designFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Tải file thiết kế
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Request info */}
                <div className="border rounded-md p-3 space-y-1.5 bg-muted/30">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thông tin lệnh</h4>
                  <div className="text-sm space-y-1">
                    <div>SL yêu cầu: <strong>{viewingRequest.requestedQty}</strong></div>
                    <div>Ưu tiên: {priorityBadge(viewingRequest.priority)}</div>
                    {viewingRequest.noteForWorkers && (
                      <div className="text-muted-foreground">📝 {viewingRequest.noteForWorkers}</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Nộp file & Ghép Layout — Modal mới với chọn SKU */}
      <Dialog open={quickSubmitOpen} onOpenChange={setQuickSubmitOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-green-600" />
              Nộp file & Ghép Layout
            </DialogTitle>
            <DialogDescription>
              Tick chọn SKU sẽ được giải quyết trong file này. SKU không tick sẽ giữ lại chờ file khác.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 min-h-0">
            {/* Phần A: Thông tin File */}
            <div className="border rounded-md p-3 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Thông tin File
              </h4>
              <div className="space-y-1.5">
                <Label className="text-[11px]">
                  Link file DXF (cắt laser) <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="https://drive.google.com/file/d/..."
                  value={quickDxfUrl}
                  onChange={(e) => setQuickDxfUrl(e.target.value)}
                  className="text-xs h-8"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Link file PDF (in UV, tuỳ chọn)</Label>
                <Input
                  placeholder="https://drive.google.com/file/d/..."
                  value={quickPdfUrl}
                  onChange={(e) => setQuickPdfUrl(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Mã vật liệu</Label>
                  <Input
                    placeholder="BW-3-MXL"
                    value={quickMaterial}
                    onChange={(e) => setQuickMaterial(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Rộng (mm)</Label>
                  <Input
                    type="number"
                    placeholder="910"
                    value={quickWidth}
                    onChange={(e) => setQuickWidth(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Dài (mm)</Label>
                  <Input
                    type="number"
                    placeholder="600"
                    value={quickLength}
                    onChange={(e) => setQuickLength(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            {/* Phần B: Chọn SKU sẽ giải quyết */}
            <div className="border rounded-md overflow-hidden flex flex-col max-h-[350px]">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Chọn SKU giải quyết ({selectedSkusForSubmit.size} đã chọn)
                </h4>
              </div>
              <ScrollArea className="flex-1">
                {claimedTasksForSubmit.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                    <p className="text-sm text-muted-foreground">
                      Bạn chưa nhận task nào. Hãy nhận việc trước khi nộp file.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/20 sticky top-0">
                        <th className="text-center px-2 py-1.5 w-8">✓</th>
                        <th className="text-left px-2 py-1.5">SKU</th>
                        <th className="text-center px-2 py-1.5 w-16">Cần</th>
                        <th className="text-center px-2 py-1.5 w-24">SL/tấm *</th>
                        <th className="text-center px-2 py-1.5 w-20">Cảnh báo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {claimedTasksForSubmit.map((req) => {
                        const isSelected = selectedSkusForSubmit.has(req.id);
                        const qtyPerRun = skuQtyPerRun[req.id] || 1;
                        const underProduced = isSelected && qtyPerRun < req.requestedQty;
                        return (
                          <tr
                            key={req.id}
                            className={`hover:bg-muted/30 ${isSelected ? "bg-blue-50/30 dark:bg-blue-950/20" : ""}`}
                          >
                            <td className="px-2 py-1 text-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSkuForSubmit(req.id)}
                              />
                            </td>
                            <td className="px-2 py-1 font-mono font-medium">
                              {req.idea?.msku || req.ideaId.slice(0, 8)}
                            </td>
                            <td className="px-2 py-1 text-center">{req.requestedQty}</td>
                            <td className="px-2 py-1">
                              {isSelected ? (
                                <Input
                                  type="number"
                                  min={1}
                                  className="h-6 w-18 text-[11px] text-center mx-auto"
                                  value={qtyPerRun}
                                  onChange={(e) =>
                                    setSkuQtyPerRun((prev) => ({
                                      ...prev,
                                      [req.id]: Math.max(1, parseInt(e.target.value) || 1),
                                    }))
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-2 py-1 text-center">
                              {underProduced && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600" title="SL/tấm < yêu cầu. Cần chạy nhiều lần.">
                                  <AlertTriangle className="h-3 w-3" />
                                  Ít
                                </span>
                              )}
                              {isSelected && !underProduced && (
                                <span className="text-[10px] text-green-600">✓ Đủ</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </ScrollArea>
            </div>

            {/* Summary */}
            {selectedSkusForSubmit.size > 0 && (
              <div className="border rounded-md p-2 bg-blue-50/30 dark:bg-blue-950/20 text-xs">
                <strong>{selectedSkusForSubmit.size} SKU</strong> sẽ được giải quyết.
                {layoutRequests.filter((r) => r.layoutAssigneeId === userId).length - selectedSkusForSubmit.size > 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    Còn{" "}
                    {layoutRequests.filter((r) => r.layoutAssigneeId === userId).length - selectedSkusForSubmit.size}{" "}
                    SKU giữ lại chờ file khác.
                  </span>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setQuickSubmitOpen(false)}>
              Huỷ
            </Button>
            <Button
              onClick={handleQuickSubmit}
              disabled={quickSubmitting || !quickDxfUrl.trim() || selectedSkusForSubmit.size === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {quickSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Nộp file & Hoàn thành ({selectedSkusForSubmit.size} SKU)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
