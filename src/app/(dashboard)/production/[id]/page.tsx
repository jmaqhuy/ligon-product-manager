"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Factory,
  CheckCircle2,
  Clock,
  Circle,
  Play,
  Save,
  Users,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { productionPriorityLabels, type ProductionPriority } from "@/types";

export default function ProductionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [workers, setWorkers] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [prodRes, workersRes] = await Promise.all([
        fetch(`/api/production?search=`),
        fetch(`/api/workers`),
      ]);
      if (prodRes.ok) {
        const items = await prodRes.json();
        const found = items.find((p: { id: string }) => p.id === id);
        if (found) setRequest(found);
      }
      if (workersRes.ok) {
        setWorkers(await workersRes.json());
      }
    } catch {
      toast.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStartStep = async (stepId: string) => {
    try {
      const res = await fetch(`/api/production/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (res.ok) {
        toast.success("Đã bắt đầu bước sản xuất");
        fetchData();
      }
    } catch {
      toast.error("Lỗi cập nhật");
    }
  };

  const handleFinishStep = async (stepId: string) => {
    try {
      const res = await fetch(`/api/production/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finish" }),
      });
      if (res.ok) {
        toast.success("Đã hoàn thành bước sản xuất");
        fetchData();
      }
    } catch {
      toast.error("Lỗi cập nhật");
    }
  };

  const handleAssignWorker = async (stepId: string, workerName: string) => {
    try {
      const res = await fetch(`/api/production/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ performedBy: workerName }),
      });
      if (res.ok) {
        toast.success("Đã gán công nhân");
        fetchData();
      }
    } catch {
      toast.error("Lỗi cập nhật");
    }
  };

  const handleComplete = async () => {
    try {
      const res = await fetch(`/api/production/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (res.ok) {
        toast.success("Đã hoàn thành yêu cầu sản xuất!");
        fetchData();
      }
    } catch {
      toast.error("Lỗi cập nhật");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Factory className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Không tìm thấy yêu cầu sản xuất</h2>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/production")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
      </div>
    );
  }

  const isCompleted = !!request.completedAt;
  const completedSteps = request.steps?.filter((s: { finishedAt: string | null }) => s.finishedAt) || [];
  const totalSteps = request.steps?.length || 0;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps.length / totalSteps) * 100) : 0;

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
    priority: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    normal: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/30 dark:text-gray-300",
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/production"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">
                {request.idea?.msku || "Yêu cầu SX"}
              </h1>
              <Badge variant="outline" className={priorityColors[request.priority] || ""}>
                {productionPriorityLabels[request.priority as ProductionPriority] || request.priority}
              </Badge>
              <Badge variant={request.type === "sample" ? "secondary" : "default"} className="text-xs">
                {request.type === "sample" ? "Mẫu" : "Batch"}
              </Badge>
              {isCompleted && (
                <Badge className="bg-green-600 text-white">Hoàn thành</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Yêu cầu: {new Date(request.requestedAt || request.createdAt).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
        {!isCompleted && completedSteps.length === totalSteps && totalSteps > 0 && (
          <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="mr-2 h-4 w-4" /> Đánh dấu hoàn thành
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Sản phẩm</Label>
              <p className="text-sm font-medium">{request.idea?.title || request.idea?.msku || "—"}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">SL yêu cầu</Label>
                <p className="text-lg font-bold">{request.requestedQty}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">SL thực tế</Label>
                <p className="text-lg font-bold">{request.actualQty || "—"}</p>
              </div>
            </div>
            {request.noteForWorkers && (
              <>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">Ghi chú cho công nhân</Label>
                  <p className="text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-2 rounded mt-1">
                    {request.noteForWorkers}
                  </p>
                </div>
              </>
            )}
            {isCompleted && (
              <>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">Ngày hoàn thành</Label>
                  <p className="text-sm">{new Date(request.completedAt).toLocaleDateString("vi-VN")}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Steps Timeline */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Factory className="h-4 w-4" /> Các bước sản xuất
              </CardTitle>
              <Badge variant="outline">
                {completedSteps.length}/{totalSteps} ({progressPct}%)
              </Badge>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(request.steps || [])
                .sort((a: { sequenceOrder: number }, b: { sequenceOrder: number }) => a.sequenceOrder - b.sequenceOrder)
                .map((step: {
                  id: string;
                  stepName: string;
                  sequenceOrder: number;
                  performedBy: string | null;
                  startedAt: string | null;
                  finishedAt: string | null;
                }) => {
                  const isDone = !!step.finishedAt;
                  const isInProgress = !!step.startedAt && !step.finishedAt;
                  const isPending = !step.startedAt;

                  return (
                    <div
                      key={step.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        isDone
                          ? "bg-green-50/50 border-green-200 dark:bg-green-950/10 dark:border-green-800"
                          : isInProgress
                          ? "bg-blue-50/50 border-blue-200 dark:bg-blue-950/10 dark:border-blue-800"
                          : "bg-muted/30"
                      }`}
                    >
                      {/* Status icon */}
                      <div className="pt-0.5">
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : isInProgress ? (
                          <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Step info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">#{step.sequenceOrder}</span>
                          <span className="text-sm font-medium">{step.stepName}</span>
                        </div>

                        {/* Times */}
                        <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-muted-foreground">
                          {step.startedAt && (
                            <span>Bắt đầu: {new Date(step.startedAt).toLocaleDateString("vi-VN")}</span>
                          )}
                          {step.finishedAt && (
                            <span>Xong: {new Date(step.finishedAt).toLocaleDateString("vi-VN")}</span>
                          )}
                        </div>

                        {/* Worker assignment */}
                        <div className="flex items-center gap-2 mt-2">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {!isCompleted ? (
                            <Select
                              value={step.performedBy || ""}
                              onValueChange={(v) => handleAssignWorker(step.id, v)}
                            >
                              <SelectTrigger className="h-7 text-xs w-[140px]">
                                <SelectValue placeholder="Gán công nhân" />
                              </SelectTrigger>
                              <SelectContent>
                                {workers.map((w) => (
                                  <SelectItem key={w.id} value={w.name} className="text-xs">
                                    {w.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs">{step.performedBy || "—"}</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      {!isCompleted && (
                        <div className="flex gap-1">
                          {isPending && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleStartStep(step.id)}
                            >
                              <Play className="mr-1 h-3 w-3" /> Bắt đầu
                            </Button>
                          )}
                          {isInProgress && (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-green-600 hover:bg-green-700"
                              onClick={() => handleFinishStep(step.id)}
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Xong
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
