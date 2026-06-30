"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Eye,
  Loader2,
  CheckCheck,
  Image as ImageIcon,
  FileText,
  X,
  Printer,
  ExternalLink,
  Trash2,
  MessageSquareWarning,
  ArrowUp,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyButton } from "@/components/copy-button";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  ideaStatusLabels,
  photoStatusLabels,
  type IdeaStatus,
  type PhotoStatus,
  type FulfillmentType,
} from "@/types";
import type { Role } from "@/lib/permissions";
import { convertToDirectImageUrl } from "@/lib/google-drive";
import { apiFetch } from "@/lib/api-client";
import { ExcelUpload } from "@/components/excel-upload";
import { FilterPopover } from "./components/filter-popover";
import { useSocket } from "@/components/providers/socket-provider";

// Status badge colors
function getStatusBadge(idea: any) {
  const status = idea.status;
  const variants: Record<string, { className: string; label: string }> = {
    reviewing: { className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300", label: ideaStatusLabels.reviewing },
    approved: { className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300", label: ideaStatusLabels.approved },
    revision_requested: { className: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300", label: ideaStatusLabels.revision_requested },
    rejected: { className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300", label: ideaStatusLabels.rejected },
  };
  const v = variants[status] || { className: "bg-gray-100 text-gray-800", label: status };
  const badge = <Badge variant="outline" className={v.className}>{v.label}</Badge>;

  if (idea.reviewComment && idea.status !== "approved") {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <span className="cursor-help">{badge}</span>
          </TooltipTrigger>
          <TooltipContent className={`p-3 max-w-xs border shadow-md ${idea.status === "rejected" ? "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900" : "border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900"}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <MessageSquareWarning className={`h-3 w-3 ${idea.status === "rejected" ? "text-red-600" : "text-orange-600"}`} />
            </div>
            <p className={`text-xs whitespace-pre-wrap ${idea.status === "rejected" ? "text-red-800 dark:text-red-300" : "text-orange-800 dark:text-orange-300"}`}>{idea.reviewComment}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return badge;
}

function getPhotoStatusBadge(status: PhotoStatus) {
  const variants: Record<PhotoStatus, { className: string; label: string }> = {
    not_requested: { className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400", label: photoStatusLabels.not_requested },
    awaiting_photos: { className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300", label: photoStatusLabels.awaiting_photos },
    pending_approval: { className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300", label: photoStatusLabels.pending_approval },
    revision_requested: { className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300", label: photoStatusLabels.revision_requested },
    approved: { className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300", label: photoStatusLabels.approved },
  };
  const v = variants[status];
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
}

function getFulfillmentBadge(type: FulfillmentType) {
  if (type === "FBA") {
    return <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-1.5">FBA</Badge>;
  }
  return <Badge variant="secondary" className="text-[10px] px-1.5">FBM</Badge>;
}

interface IdeaRow {
  id: string;
  msku: string;
  sku: string;
  mainImageUrl: string;
  status: IdeaStatus;
  photoStatus: PhotoStatus;
  fulfillmentType: FulfillmentType;
  topicName: string;
  createdByName: string;
  createdAt: string;
  title: string | null;
  needsReReview: boolean;
  source: string;
  partnerName: string | null;
}

function getSourceBadge(source: string) {
  switch (source) {
    case "boss":
      return <Badge variant="default" className="bg-purple-600 hover:bg-purple-700 text-xs">Sếp</Badge>;
    case "partner":
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200 text-xs">Đối tác</Badge>;
    default:
      return null; // employee - no badge needed
  }
}

function IdeaTable({ ideas, loading, selectedIds, onSelectionChange, canSelect, highlightedRowId }: {
  ideas: IdeaRow[];
  loading: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (id: string, checked: boolean) => void;
  canSelect: boolean;
  highlightedRowId?: string | null;
}) {
  const router = useRouter();
  const allSelected = ideas.length > 0 && ideas.every((i) => selectedIds.has(i.id));

  // Track if any ideas are selected for batch operations

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-500">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Eye className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Chưa có ý tưởng nào</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Bấm nút &ldquo;Tạo ý tưởng&rdquo; để bắt đầu
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {canSelect && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => {
                    ideas.forEach((i) => onSelectionChange(i.id, !!checked));
                  }}
                />
              </TableHead>
            )}
            <TableHead className="w-15">Ảnh</TableHead>
            <TableHead>MSKU</TableHead>
            <TableHead className="hidden md:table-cell">Chủ đề</TableHead>
            <TableHead className="hidden lg:table-cell">Người tạo</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="hidden md:table-cell">Ảnh</TableHead>
            <TableHead className="w-25 hidden sm:table-cell">Ngày tạo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ideas.map((idea) => {
            const thumbUrl = convertToDirectImageUrl(idea.mainImageUrl);
            return (
              <TableRow
                key={idea.id}
                className={`cursor-pointer group/row ${idea.id === highlightedRowId ? "bg-blue-100 dark:bg-blue-900/40 transition-none" : "hover:bg-muted/50 transition-colors duration-1000"}`}
                onClick={() => router.push(`/ideas/${idea.id}`)}
              >
                {canSelect && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(idea.id)}
                      onCheckedChange={(checked) => onSelectionChange(idea.id, !!checked)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  {thumbUrl ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Dialog>
                        <DialogTrigger asChild>
                          <div
                            className="w-10 h-10 rounded border border-dashed border-muted-foreground/30 overflow-hidden bg-muted flex items-center justify-center cursor-pointer group/img"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={thumbUrl}
                              alt={idea.msku}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-125"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-fit bg-transparent border-none shadow-none !ring-0 p-0" showCloseButton={false} onClick={(e) => e.stopPropagation()}>
                          <div className="relative flex justify-center items-center p-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={thumbUrl} alt="Full view" className="max-h-[95vh] max-w-[95vw] w-auto h-auto rounded-md object-contain" />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded border border-dashed border-muted-foreground/30 overflow-hidden bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">N/A</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-sm font-medium">{idea.msku}</span>
                      {idea.title && (
                        <p className="text-xs text-muted-foreground truncate max-w-50">{idea.title}</p>
                      )}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <CopyButton text={idea.msku} className="h-6 w-6 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm hidden md:table-cell">{idea.topicName}</TableCell>
                <TableCell className="text-sm hidden lg:table-cell">{idea.createdByName}</TableCell>
                <TableCell>{getFulfillmentBadge(idea.fulfillmentType)}</TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    {getStatusBadge(idea)}
                    {getSourceBadge(idea.source)}
                    {idea.needsReReview && (
                      <Badge variant="destructive" className="bg-red-500 text-white animate-pulse text-[10px] px-1 py-0 h-4">
                        Sửa đổi mới
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-col gap-1">
                    {(idea as any).amazonPhotoStatus && (idea as any).amazonPhotoStatus !== "not_requested" && (
                      <div className="flex items-center gap-1"><span className="text-[10px] text-muted-foreground w-6">AMZ</span> {getPhotoStatusBadge((idea as any).amazonPhotoStatus)}</div>
                    )}
                    {(idea as any).etsyPhotoStatus && (idea as any).etsyPhotoStatus !== "not_requested" && (
                      <div className="flex items-center gap-1"><span className="text-[10px] text-muted-foreground w-6">Etsy</span> {getPhotoStatusBadge((idea as any).etsyPhotoStatus)}</div>
                    )}
                    {(!(idea as any).amazonPhotoStatus || (idea as any).amazonPhotoStatus === "not_requested") && (!(idea as any).etsyPhotoStatus || (idea as any).etsyPhotoStatus === "not_requested") && getPhotoStatusBadge("not_requested")}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                  {new Date(idea.createdAt).toLocaleDateString("vi-VN")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default function IdeasPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = session?.user?.role as Role | undefined;
  const isEmployee = role === "employee";
  const sessionReady = !!session?.user;

  const { socket } = useSocket();

  const queryClient = useQueryClient();

  const searchParams = useSearchParams();
  const ideaStatus = searchParams.get("ideaStatus");
  const photoStatus = searchParams.get("photoStatus");
  const amazonStatus = searchParams.get("amazonStatus");
  const etsyStatus = searchParams.get("etsyStatus");
  const fulfillmentType = searchParams.get("fulfillmentType");
  const urlMine = searchParams.get("mine");
  const topicId = searchParams.get("topicId");
  const month = searchParams.get("month");

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [newItemsCount, setNewItemsCount] = useState(0);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  const effectiveMine = urlMine !== null ? urlMine === "true" : isEmployee;

  const queryKey = useMemo(() => ['ideas', { 
    page, pageSize, search: searchQuery, ideaStatus, photoStatus, amazonStatus, 
    etsyStatus, fulfillmentType, mine: effectiveMine, topicId, month 
  }], [page, pageSize, searchQuery, ideaStatus, photoStatus, amazonStatus, etsyStatus, fulfillmentType, effectiveMine, topicId, month]);

  const { data: queryData, isLoading: loading, refetch: fetchIdeas } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (searchQuery) params.set("search", searchQuery);
      if (ideaStatus) params.set("ideaStatus", ideaStatus);
      if (photoStatus) params.set("photoStatus", photoStatus);
      if (amazonStatus) params.set("amazonStatus", amazonStatus);
      if (etsyStatus) params.set("etsyStatus", etsyStatus);
      if (fulfillmentType) params.set("fulfillmentType", fulfillmentType);
      if (effectiveMine) params.set("mine", "true");
      if (topicId && topicId !== "all") params.set("topicId", topicId);
      if (month) params.set("month", month);

      const res = await fetch(`/api/ideas?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: sessionReady,
  });

  const ideas = queryData?.data || [];
  const total = queryData?.total || 0;
  const totalPages = queryData?.totalPages || 1;

  const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [labelSkusInput, setLabelSkusInput] = useState("");
  const [labelResults, setLabelResults] = useState<{ id: string; msku?: string; fnskuLabelFileUrl?: string; fnskuCode?: string; quantity?: number }[]>([]);
  const [labelLoading, setLabelLoading] = useState(false);
  const [labelQuantities, setLabelQuantities] = useState<Record<string, number>>({});
  
  const canSelect = true;

  const handleSelectionChange = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const canDeleteIdea = (idea: { createdById?: string; status: string; fileStatus?: string; designFileUrl?: string | null; photoStatus?: string }) => {
    // Determine if in production (same as backend logic)
    const inProduction = idea.fileStatus === "approved" || idea.fileStatus === "approved" || !!idea.designFileUrl;
    if (inProduction) return false;

    if (role === "boss" || role === "manager") return true;
    if (idea.createdById !== session?.user?.id) return false;

    if (idea.status === "reviewing") return true;
    if (
      idea.status === "approved" &&
      (idea.photoStatus === "not_requested" || idea.photoStatus === "awaiting_photos") &&
      idea.fileStatus !== "approved" &&
      !idea.designFileUrl
    ) {
      return true;
    }
    return false;
  };


  const handleBatchAction = async (action: "approve" | "request_photos" | "request_file") => {
    if (selectedIds.size === 0) return;
    setBatchProcessing(true);
    const { toast } = await import("sonner");
    try {
      const { error } = await apiFetch("/api/ideas/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action
        })
      });
      if (!error) {
        toast.success(`Đã xử lý ${selectedIds.size} ý tưởng thành công`);
        setSelectedIds(new Set());
        fetchIdeas();
      } else {
        toast.error(error || "Có lỗi xảy ra");
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setBatchProcessing(false);
    }
  };

  const [batchDeleteIdList, setBatchDeleteIdList] = useState<string[]>([]);
  const handleBatchDelete = async () => {
    if (batchDeleteIdList.length === 0) return;
    setIsDeleting(true);
    let successCount = 0;
    try {
      for (const id of batchDeleteIdList) {
        const res = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
      }
      if (successCount > 0) {
        toast.success(`Đã xoá ${successCount} ý tưởng thành công`);
        setSelectedIds(new Set());
        fetchIdeas();
      }
    } catch {
      toast.error("Lỗi kết nối khi xoá");
    } finally {
      setIsDeleting(false);
      setBatchDeleteIdList([]);
    }
  };

  const handleLabelSearch = async () => {
    const skus = labelSkusInput.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (skus.length === 0) return;
    setLabelLoading(true);
    try {
      const { data, error } = await apiFetch("/api/ideas/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skus, quantities: labelQuantities }),
      });

      if (error) {
        setLabelDialogOpen(false); // Đóng modal nếu có lỗi để hiện action toast
        return;
      }

      if (data) {
        setLabelResults(data);
        const qty: Record<string, number> = {};
        data.forEach((item: { id: string; quantity?: number }) => { qty[item.id] = item.quantity || 1; });
        setLabelQuantities(qty);
      }
    } finally { setLabelLoading(false); }
  };

  const handleOpenAllLabels = () => {
    labelResults.forEach((item) => {
      if (item.fnskuLabelFileUrl) {
        window.open(item.fnskuLabelFileUrl, "_blank");
      }
    });
  };

  // Fetch topics for filter
  useEffect(() => {
    fetch("/api/topics").then(r => r.json()).then(setTopics).catch(() => { });
  }, []);

  const handleShowNewIdeas = useCallback(() => {
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ['ideas'] });
    setNewItemsCount(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [queryClient]);

  // Real-time automatic reload on websocket notification
  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (data: any) => {
      const ideaId = data.actionUrl?.split('/').pop();
      if (!ideaId) return;

      if (data.type === "new_idea") {
        setNewItemsCount(prev => prev + 1);
      } else if (
        data.type === "idea_approved" ||
        data.type === "idea_rejected" ||
        data.type === "idea_updated" ||
        data.type === "idea_revision_requested"
      ) {
        if (!data.idea) return; // Fallback if backend doesn't send idea
        
        queryClient.setQueriesData({ queryKey: ['ideas'] }, (oldData: any) => {
          if (!oldData || !oldData.data) return oldData;
          
          const exists = oldData.data.some((i: any) => i.id === data.idea.id);
          if (!exists) return oldData;
          
          return {
            ...oldData,
            data: oldData.data.map((i: any) => i.id === data.idea.id ? data.idea : i)
          };
        });

        setHighlightedRowId(data.idea.id);
        setTimeout(() => setHighlightedRowId(null), 1500);
      }
    };
    socket.on("new_notification", handleNewNotification);
    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket, queryClient]);

  // Debounced search logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setPage(1);
        setSearchQuery(searchInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý ý tưởng</h1>
          <p className="text-muted-foreground text-sm">
            Theo dõi toàn bộ ý tưởng từ đề xuất đến đăng bán
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/ideas/new">
              <Plus className="mr-2 h-4 w-4" />
              Tạo ý tưởng
            </Link>
          </Button>
          <ExcelUpload onSuccess={fetchIdeas} />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-50 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo SKU / MSKU..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>

        <FilterPopover isEmployee={isEmployee} topics={topics} />
      </div>

      {/* Batch Action Bar - Floating bottom */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border shadow-lg rounded-full px-5 py-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-sm font-medium whitespace-nowrap">{selectedIds.size} đã chọn</span>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-1.5">
            {!isEmployee && ideaStatus === "reviewing" && (
              <Button size="sm" variant="default" onClick={() => handleBatchAction("approve")} disabled={batchProcessing} className="rounded-full">
                <CheckCheck className="h-4 w-4 mr-1" /> Duyệt
              </Button>
            )}
            {!isEmployee && (
              <>
                <Button size="sm" variant="outline" onClick={() => handleBatchAction("request_photos")} disabled={batchProcessing} className="rounded-full">
                  <ImageIcon className="h-4 w-4 mr-1" /> Ảnh
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBatchAction("request_file")} disabled={batchProcessing} className="rounded-full">
                  <FileText className="h-4 w-4 mr-1" /> File
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => {
              const selectedIdeas = ideas.filter((i: any) => selectedIds.has(i.id));
              const skus = selectedIdeas.map((i: any) => i.msku).join("\n");
              setLabelSkusInput(skus);
              setLabelDialogOpen(true);
              // Auto-search after dialog opens
              setTimeout(async () => {
                setLabelLoading(true);
                try {
                  const { data, error } = await apiFetch("/api/ideas/labels", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ skus: selectedIdeas.map((i: any) => i.msku) }),
                  });

                  if (error) {
                    setLabelDialogOpen(false);
                  } else if (data) {
                    setLabelResults(data);
                    const qty: Record<string, number> = {};
                    data.forEach((item: { id: string; quantity?: number }) => { qty[item.id] = item.quantity || 1; });
                    setLabelQuantities(qty);
                  }
                } finally { setLabelLoading(false); }
              }, 100);
            }} disabled={batchProcessing} className="rounded-full">
              <Printer className="h-4 w-4 mr-1" /> In Label
            </Button>
            {(() => {
              const selectedIdeas = ideas.filter((i: any) => selectedIds.has(i.id));
              const canDeleteBatch = selectedIdeas.length > 0 && selectedIdeas.every((i: any) => canDeleteIdea(i));
              if (canDeleteBatch) {
                return (
                  <Button size="sm" variant="destructive" onClick={() => setBatchDeleteIdList(Array.from(selectedIds))} disabled={batchProcessing} className="rounded-full ml-2">
                    <Trash2 className="h-4 w-4 mr-1" /> Xoá
                  </Button>
                );
              }
              return null;
            })()}
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} disabled={batchProcessing} className="rounded-full ml-1">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-4 relative">
        {/* Pill Button for new items */}
        {newItemsCount > 0 && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10 animate-in fade-in slide-in-from-top-4">
            <Button
              variant="default"
              className="rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white animate-bounce"
              onClick={handleShowNewIdeas}
            >
              <ArrowUp className="w-4 h-4 mr-2" />
              Có {newItemsCount} ý tưởng mới
            </Button>
          </div>
        )}
        <IdeaTable ideas={ideas} loading={loading} selectedIds={selectedIds} onSelectionChange={handleSelectionChange} canSelect={canSelect} highlightedRowId={highlightedRowId} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">{total} ý tưởng</span>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setPage(pageNum)}
                      isActive={pageNum === page}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Hiển thị</span>
            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setPage(1); }}>
              <SelectTrigger className="w-[70px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Label Print Dialog */}
      <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" /> In Label
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {labelLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {labelResults.length > 0 && (
              <>
                <div className="rounded-md border overflow-auto flex-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-15">Ảnh</TableHead>
                        <TableHead>MSKU</TableHead>
                        <TableHead className="w-20">SL</TableHead>
                        <TableHead>FNSKU</TableHead>
                        <TableHead className="w-20">In</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labelResults.map((item) => {
                        const previewUrl = convertToDirectImageUrl(item.fnskuLabelFileUrl || "");
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              {previewUrl ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <div className="w-14 h-10 rounded border overflow-hidden bg-white cursor-pointer hover:ring-2 hover:ring-primary/50">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={previewUrl} alt={item.msku} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                    </div>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-[90vw] sm:max-w-[90vw] max-h-[90vh] bg-transparent border-none shadow-none !ring-0 p-0" showCloseButton={false}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={previewUrl} alt={item.msku} className="max-w-[90vw] max-h-[90vh] object-contain rounded-md" />
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <div className="w-14 h-10 rounded border bg-muted flex items-center justify-center text-[10px] text-muted-foreground">—</div>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{item.msku}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                max={999}
                                className="w-16 h-8 text-sm text-center"
                                value={labelQuantities[item.id] || 1}
                                onChange={(e) => setLabelQuantities({ ...labelQuantities, [item.id]: parseInt(e.target.value) || 1 })}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">{item.fnskuCode || "—"}</TableCell>
                            <TableCell>
                              {item.fnskuLabelFileUrl ? (
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={item.fnskuLabelFileUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">Chưa có</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{labelResults.length} sản phẩm</span>
                  <Button variant="default" onClick={handleOpenAllLabels} disabled={!labelResults.some((i: { fnskuLabelFileUrl?: string }) => i.fnskuLabelFileUrl)}>
                    <Printer className="h-4 w-4 mr-2" /> Mở tất cả label
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={batchDeleteIdList.length > 0} onOpenChange={(open) => !open && setBatchDeleteIdList([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xoá {batchDeleteIdList.length} ý tưởng?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Toàn bộ thông tin liên quan đến các ý tưởng này sẽ bị xoá vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBatchDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Xoá tất cả
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
