"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Check,
  Clock,
  Factory,
  Loader2,
  Play,
  Plus,
  Search,
  Package,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { can, type Role } from "@/lib/permissions";
import { productionPriorityLabels, type ProductionPriority } from "@/types";
import { convertToDirectImageUrl } from "@/lib/google-drive";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// ─── Priority badge ────────────────────────────────────────────────
function priorityBadge(priority: string) {
  const styles: Record<string, string> = {
    urgent: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
    priority: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    normal: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
  };
  return (
    <Badge variant="outline" className={styles[priority] || ""}>
      {productionPriorityLabels[priority as ProductionPriority] || priority}
    </Badge>
  );
}

function typeBadge(type: string) {
  if (type === "sample") {
    return <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-[10px]">Sample</Badge>;
  }
  return <Badge variant="secondary" className="text-[10px]">Batch</Badge>;
}

// ─── Step progress ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StepProgress({ steps, onAction }: { steps: any[]; onAction: (stepId: string, action: string, workerName?: string) => void }) {
  const [selectedWorker, setSelectedWorker] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [workers, setWorkers] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/workers").then(r => r.json()).then(setWorkers).catch(() => { });
  }, []);

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const isStarted = !!step.startedAt;
        const isFinished = !!step.finishedAt;
        const canStart = !isStarted && (i === 0 || steps[i - 1]?.finishedAt);

        return (
          <div
            key={step.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isFinished
              ? "bg-green-50 dark:bg-green-950/30"
              : isStarted
                ? "bg-blue-50 dark:bg-blue-950/30"
                : "bg-muted/50"
              }`}
          >
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${isFinished
              ? "bg-green-500 text-white"
              : isStarted
                ? "bg-blue-500 text-white"
                : "bg-muted-foreground/20 text-muted-foreground"
              }`}>
              {isFinished ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>

            <div className="flex-1 min-w-0">
              <span className={isFinished ? "line-through text-muted-foreground" : ""}>{step.stepName}</span>
              {step.performedBy && (
                <span className="text-xs text-muted-foreground ml-2">({step.performedBy})</span>
              )}
            </div>

            {canStart && !isFinished && (
              <div className="flex items-center gap-1.5">
                <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                  <SelectTrigger className="h-7 w-[100px] text-xs">
                    <SelectValue placeholder="Chọn NV" />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map(w => (
                      <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    onAction(step.id, "start", selectedWorker || undefined);
                    setSelectedWorker("");
                  }}
                >
                  <Play className="h-3 w-3 mr-1" /> Bắt đầu
                </Button>
              </div>
            )}
            {isStarted && !isFinished && (
              <Button
                size="sm"
                className="h-7 text-xs bg-green-600 hover:bg-green-700"
                onClick={() => onAction(step.id, "finish")}
              >
                <Check className="h-3 w-3 mr-1" /> Xong
              </Button>
            )}
            {isFinished && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Hoàn thành</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Create dialog ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CreateProductionDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ideaSearch, setIdeaSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ideaResults, setIdeaResults] = useState<any[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState("");
  const [selectedIdeaName, setSelectedIdeaName] = useState("");
  const [type, setType] = useState("batch");
  const [priority, setPriority] = useState("normal");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");

  const searchIdeas = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setIdeaResults([]); return; }
    try {
      const res = await fetch(`/api/ideas?search=${encodeURIComponent(q)}&pageSize=50`);
      const json = res.ok ? await res.json() : null;
      const allIdeas = json && Array.isArray(json.data) ? json.data : [];

      const sorted = [...allIdeas].sort((a: any, b: any) => {
        if (a.status === "approved" && b.status !== "approved") return -1;
        if (a.status !== "approved" && b.status === "approved") return 1;
        return 0;
      });

      setIdeaResults(sorted.slice(0, 20));
    } catch {
      setIdeaResults([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchIdeas(ideaSearch), 300);
    return () => clearTimeout(timer);
  }, [ideaSearch, searchIdeas]);

  const handleSubmit = async () => {
    if (!selectedIdeaId) { toast.error("Vui lòng chọn ý tưởng"); return; }
    if (!qty || parseInt(qty) < 1) { toast.error("Số lượng phải >= 1"); return; }

    setSaving(true);
    try {
      const { data } = await apiFetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId: selectedIdeaId,
          type,
          priority,
          requestedQty: parseInt(qty),
          noteForWorkers: note || null,
        }),
        successMessage: "Đã tạo yêu cầu sản xuất!",
      });
      if (data) {
        setOpen(false);
        setSelectedIdeaId("");
        setSelectedIdeaName("");
        setIdeaSearch("");
        setQty("1");
        setNote("");
        onCreated();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Tạo yêu cầu
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tạo yêu cầu sản xuất</DialogTitle>
          <DialogDescription>Chọn ý tưởng và cấu hình thông tin sản xuất</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Idea search */}
          <div className="space-y-1.5">
            <Label>Ý tưởng (MSKU)</Label>
            {selectedIdeaId ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">{selectedIdeaName}</Badge>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedIdeaId(""); setSelectedIdeaName(""); }}>
                  Đổi
                </Button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Tìm theo MSKU..."
                  value={ideaSearch}
                  onChange={(e) => setIdeaSearch(e.target.value)}
                />
                {ideaResults.length > 0 && (
                  <div className="border rounded-md max-h-[250px] overflow-y-auto divide-y divide-border">
                    {ideaResults.map((idea) => {
                      const isApproved = idea.status === "approved";
                      let reason = "";
                      if (!isApproved) {
                        if (idea.status === "reviewing") {
                          reason = "sản phẩm chưa được duyệt";
                        } else if (idea.status === "revision_requested") {
                          reason = "sản phẩm đang sửa";
                        } else if (idea.status === "rejected") {
                          reason = "sản phẩm bị loại";
                        } else {
                          reason = "chưa được duyệt";
                        }
                      }

                      return (
                        <button
                          key={idea.id}
                          type="button"
                          disabled={!isApproved}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${isApproved
                              ? "hover:bg-muted cursor-pointer"
                              : "opacity-60 cursor-not-allowed bg-muted/10"
                            }`}
                          onClick={() => {
                            if (!isApproved) return;
                            setSelectedIdeaId(idea.id);
                            setSelectedIdeaName(idea.msku);
                            setIdeaSearch("");
                            setIdeaResults([]);
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-mono font-medium block truncate">{idea.msku}</span>
                            <span className="text-xs text-muted-foreground truncate block">{idea.topicName}</span>
                          </div>
                          {!isApproved && (
                            <Badge variant="destructive" className="text-[10px] whitespace-nowrap ml-2 shrink-0 py-0 h-5">
                              {reason}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Loại</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="batch">Batch</SelectItem>
                  <SelectItem value="sample">Sample</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ưu tiên</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Bình thường</SelectItem>
                  <SelectItem value="priority">Ưu tiên</SelectItem>
                  <SelectItem value="urgent">Khẩn cấp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Số lượng</Label>
              <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Ghi chú cho công nhân</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Lưu ý đặc biệt..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tạo yêu cầu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── List Item ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RequestListItem({ req, isSelected, onSelect }: { req: any; isSelected: boolean; onSelect: () => void }) {
  const stepsTotal = req.steps.length;
  const stepsFinished = req.steps.filter((s: { finishedAt: string | null }) => s.finishedAt).length;
  const progressPercent = stepsTotal > 0 ? Math.round((stepsFinished / stepsTotal) * 100) : 0;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 flex flex-col gap-1.5 border-b transition-colors ${isSelected
          ? "bg-accent"
          : "hover:bg-muted/50"
        }`}
    >
      <div className="flex items-center justify-between w-full gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono font-semibold text-sm truncate">{req.idea.msku}</span>
          {req.priority === "urgent" && (
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 shrink-0" />
          )}
          {req.priority === "priority" && (
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          )}
        </div>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
          {format(new Date(req.createdAt), "dd/MM/yy")}
        </span>
      </div>
      {req.idea.title && (
        <p className="text-xs text-muted-foreground line-clamp-1">{req.idea.title}</p>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {typeBadge(req.type)}
          <Badge variant="outline" className="text-[9px] font-normal">SL: {req.requestedQty}</Badge>
        </div>
        {stepsTotal > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {stepsFinished}/{stepsTotal} bước
          </span>
        )}
      </div>
      {/* Mini progress bar */}
      {stepsTotal > 0 && progressPercent > 0 && progressPercent < 100 && (
        <div className="w-full bg-muted rounded-full h-1 mt-0.5">
          <div
            className="bg-blue-500 h-1 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
      {progressPercent === 100 && !req.completedAt && (
        <div className="w-full bg-muted rounded-full h-1 mt-0.5">
          <div className="bg-green-500 h-1 rounded-full w-full" />
        </div>
      )}
    </button>
  );
}

// ─── Detail Pane ────────────────────────────────────────────────────
function DetailPane({
  req,
  onBack,
  showBackButton,
  onStepAction,
  onComplete,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: any | null;
  onBack: () => void;
  showBackButton: boolean;
  onStepAction: (stepId: string, action: string, workerName?: string) => void;
  onComplete: (requestId: string) => void;
}) {
  if (!req) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Factory className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-base font-medium text-muted-foreground mb-1">Chưa chọn yêu cầu</h3>
        <p className="text-sm text-muted-foreground/70 max-w-xs">
          Chọn một yêu cầu sản xuất từ danh sách bên trái để xem chi tiết.
        </p>
      </div>
    );
  }

  const thumbUrl = convertToDirectImageUrl(req.idea.mainImageUrl);
  const allStepsFinished = req.steps.every((s: { finishedAt: string | null }) => s.finishedAt);
  const someStarted = req.steps.some((s: { startedAt: string | null }) => s.startedAt);

  return (
    <div className="flex flex-col h-full">
      {/* Detail Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
        {showBackButton && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">{req.idea.msku}</h2>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Link href={`/ideas/${req.idea.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Xem ý tưởng">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Detail Body - Scrollable */}
      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 space-y-6">
          {/* Product Header */}
          <div className="flex gap-4">
            <div className="shrink-0">
              {thumbUrl ? (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg border overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbUrl} alt={req.idea.msku} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg border border-dashed border-muted-foreground/30 bg-muted flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <h2 className="text-lg md:text-xl font-bold font-mono">{req.idea.msku}</h2>
              {req.idea.title && (
                <p className="text-sm text-muted-foreground leading-relaxed">{req.idea.title}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {typeBadge(req.type)}
                {priorityBadge(req.priority)}
                <Badge variant="outline" className="text-[10px]">{req.idea.fulfillmentType}</Badge>
                {req.completedAt && (
                  <Badge className="bg-green-600 hover:bg-green-700 text-white text-[10px]">
                    ✓ Hoàn thành {format(new Date(req.completedAt), "dd/MM/yy")}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Số lượng</p>
              <p className="text-sm font-semibold">{req.requestedQty} cái</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Ngày tạo</p>
              <p className="text-sm">{format(new Date(req.createdAt), "dd/MM/yyyy HH:mm")}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">File sản xuất</p>
              {req.idea.designFileUrl ? (
                <a
                  href={req.idea.designFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <FileText className="h-3.5 w-3.5" /> Xem file
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-sm text-muted-foreground italic">Chưa có</p>
              )}
            </div>
          </div>

          {/* Worker Notes */}
          {req.noteForWorkers && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold mb-1">📝 Ghi chú cho xưởng</p>
              <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{req.noteForWorkers}</p>
            </div>
          )}

          <Separator />

          {/* Step Progress */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Tiến độ sản xuất</h3>
            <StepProgress steps={req.steps} onAction={onStepAction} />
          </div>

          {/* Complete Button */}
          {allStepsFinished && !req.completedAt && someStarted && (
            <>
              <Separator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full bg-green-600 hover:bg-green-700 h-10">
                    <Check className="mr-2 h-4 w-4" />
                    Hoàn thành toàn bộ sản xuất
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hoàn thành sản xuất?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Xác nhận hoàn thành đơn sản xuất cho <strong>{req.idea.msku}</strong> (SL: {req.requestedQty})
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Huỷ</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onComplete(req.id)}>
                      Xác nhận
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function ProductionPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const isMobile = useIsMobile();

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const statusParam = searchParams.get("status") || "pending";
  const [tab, setTabState] = useState(statusParam);
  const [search, setSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const setTab = useCallback((newStatus: string) => {
    setTabState(newStatus);
    const params = new URLSearchParams(window.location.search);
    params.set("status", newStatus);
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }, [pathname]);

  useEffect(() => {
    const currentStatus = searchParams.get("status") || "pending";
    if (currentStatus !== tab) {
      setTabState(currentStatus);
    }
  }, [searchParams, tab]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: tab });
      if (search) params.set("search", search);
      const { data } = await apiFetch(`/api/production?${params}`);
      if (data) {
        setRequests(data);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleStepAction = async (stepId: string, action: string, workerName?: string) => {
    const { data } = await apiFetch(`/api/production/steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, workerName }),
      successMessage: action === "start" ? "Đã bắt đầu!" : "Đã hoàn thành bước!",
    });
    if (data) {
      fetchRequests();
    }
  };

  const handleComplete = async (requestId: string) => {
    const { data } = await apiFetch(`/api/production/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
      successMessage: "Đã hoàn thành sản xuất!",
    });
    if (data) {
      fetchRequests();
    }
  };

  const canCreate = role && can(role, "create_production_request");
  const selectedReq = requests.find(r => r.id === selectedId) || null;

  // ─── Left pane content (reusable for both mobile and desktop) ─────
  const listPane = (
    <div className="flex flex-col h-full">
      {/* Header row: Title + Tabs */}
      <div className="flex items-center justify-between px-4 h-[52px] shrink-0 border-b">
        <h1 className="text-base font-bold">Sản xuất</h1>
        <div className="flex items-center gap-2">
          <Tabs value={tab} onValueChange={(v) => { setTab(v); setSelectedId(null); }}>
            <TabsList className="h-7">
              <TabsTrigger value="pending" className="text-[11px] px-2.5 h-6">Chờ SX</TabsTrigger>
              <TabsTrigger value="in_progress" className="text-[11px] px-2.5 h-6">Đang làm</TabsTrigger>
              <TabsTrigger value="completed" className="text-[11px] px-2.5 h-6">Đã xong</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Search + Create */}
      <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm MSKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        {canCreate && <CreateProductionDialog onCreated={fetchRequests} />}
      </div>

      {/* Scrollable List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Factory className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {tab === "pending" ? "Không có yêu cầu nào đang chờ" :
                tab === "in_progress" ? "Không có yêu cầu nào đang sản xuất" :
                  "Chưa có yêu cầu hoàn thành"}
            </p>
          </div>
        ) : (
          <div>
            {requests.map((req) => (
              <RequestListItem
                key={req.id}
                req={req}
                isSelected={selectedId === req.id}
                onSelect={() => setSelectedId(req.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // ─── Right pane content ───────────────────────────────────────────
  const detailPane = (
    <DetailPane
      req={selectedReq}
      onBack={() => setSelectedId(null)}
      showBackButton={isMobile}
      onStepAction={handleStepAction}
      onComplete={handleComplete}
    />
  );

  // ─── Mobile: toggle between list and detail ───────────────────────
  if (isMobile) {
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col border rounded-lg bg-background overflow-hidden">
        {selectedId ? detailPane : listPane}
      </div>
    );
  }

  // ─── Desktop: resizable two-pane layout ───────────────────────────
  return (
    <div className="h-[calc(100vh-7rem)] border rounded-lg bg-background overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="30%" minSize="20%" maxSize="60%">
          {listPane}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize="70%" minSize="40%">
          {detailPane}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

