"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { can, type Role } from "@/lib/permissions";
import { productionPriorityLabels, type ProductionPriority } from "@/types";

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
    fetch("/api/workers").then(r => r.json()).then(setWorkers).catch(() => {});
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
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isFinished
                ? "bg-green-50 dark:bg-green-950/30"
                : isStarted
                  ? "bg-blue-50 dark:bg-blue-950/30"
                  : "bg-muted/50"
            }`}
          >
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
              isFinished
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
      const res = await fetch(`/api/ideas?tab=reviewing&search=${encodeURIComponent(q)}`);
      // Also search approved
      const res2 = await fetch(`/api/ideas?tab=photos&search=${encodeURIComponent(q)}`);
      const data1 = res.ok ? await res.json() : [];
      const data2 = res2.ok ? await res2.json() : [];
      const all = [...data1, ...data2];
      // dedupe by id
      const unique = all.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      setIdeaResults(unique.slice(0, 10));
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
      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId: selectedIdeaId,
          type,
          priority,
          requestedQty: parseInt(qty),
          noteForWorkers: note || null,
        }),
      });
      if (res.ok) {
        toast.success("Đã tạo yêu cầu sản xuất!");
        setOpen(false);
        setSelectedIdeaId("");
        setSelectedIdeaName("");
        setIdeaSearch("");
        setQty("1");
        setNote("");
        onCreated();
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi tạo yêu cầu");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Tạo yêu cầu SX
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
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {ideaResults.map((idea) => (
                      <button
                        key={idea.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                        onClick={() => {
                          setSelectedIdeaId(idea.id);
                          setSelectedIdeaName(idea.msku);
                          setIdeaSearch("");
                          setIdeaResults([]);
                        }}
                      >
                        <span className="font-mono font-medium">{idea.msku}</span>
                        <span className="text-muted-foreground ml-2">{idea.topicName}</span>
                      </button>
                    ))}
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

// ─── Main page ──────────────────────────────────────────────────────
export default function ProductionPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;

  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: tab });
      if (search) params.set("search", search);
      const res = await fetch(`/api/production?${params}`);
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch {
      console.error("Failed to fetch production requests");
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleStepAction = async (stepId: string, action: string, workerName?: string) => {
    try {
      const res = await fetch(`/api/production/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, workerName }),
      });
      if (res.ok) {
        toast.success(action === "start" ? "Đã bắt đầu!" : "Đã hoàn thành bước!");
        fetchRequests();
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi cập nhật");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    }
  };

  const handleComplete = async (requestId: string) => {
    try {
      const res = await fetch(`/api/production/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (res.ok) {
        toast.success("Đã hoàn thành sản xuất!");
        fetchRequests();
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    }
  };

  const canCreate = role && can(role, "create_production_request");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sản xuất</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý yêu cầu sản xuất và theo dõi tiến độ
          </p>
        </div>
        {canCreate && <CreateProductionDialog onCreated={fetchRequests} />}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo MSKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            <Clock className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
            Chờ sản xuất
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="text-xs sm:text-sm">
            <Factory className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
            Đang làm
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm">
            <Package className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
            Hoàn thành
          </TabsTrigger>
        </TabsList>

        {["pending", "in_progress", "completed"].map((tabVal) => (
          <TabsContent key={tabVal} value={tabVal} className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Factory className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">
                  {tabVal === "pending" ? "Không có yêu cầu nào đang chờ" :
                   tabVal === "in_progress" ? "Không có yêu cầu nào đang sản xuất" :
                   "Chưa có yêu cầu hoàn thành"}
                </h3>
              </div>
            ) : (
              <div className="grid gap-4">
                {requests.map((req) => {
                  const allStepsFinished = req.steps.every((s: { finishedAt: string | null }) => s.finishedAt);
                  const someStarted = req.steps.some((s: { startedAt: string | null }) => s.startedAt);

                  return (
                    <Link key={req.id} href={`/production/${req.id}`}>
                      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base font-mono">{req.idea.msku}</CardTitle>
                            {typeBadge(req.type)}
                            {priorityBadge(req.priority)}
                            <Badge variant="outline" className="text-[10px]">{req.idea.fulfillmentType}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>SL: <strong className="text-foreground">{req.requestedQty}</strong></span>
                            {req.completedAt && (
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                ✓ {new Date(req.completedAt).toLocaleDateString("vi-VN")}
                              </span>
                            )}
                          </div>
                        </div>
                        {req.idea.title && (
                          <p className="text-sm text-muted-foreground truncate">{req.idea.title}</p>
                        )}
                        {req.noteForWorkers && (
                          <p className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 px-2 py-1 rounded mt-1">
                            📝 {req.noteForWorkers}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <StepProgress steps={req.steps} onAction={handleStepAction} />
                        
                        {/* Complete button - show when all steps done but not yet completed */}
                        {allStepsFinished && !req.completedAt && someStarted && (
                          <>
                            <Separator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button className="w-full bg-green-600 hover:bg-green-700">
                                  <Check className="mr-2 h-4 w-4" />
                                  Hoàn thành sản xuất
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
                                  <AlertDialogAction onClick={() => handleComplete(req.id)}>
                                    Hoàn thành
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
