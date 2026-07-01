"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/dialog";
import {
  Layers,
  Loader2,
  Plus,
  Search,
  ExternalLink,
  Download,
  ShieldCheck,
  ShieldOff,
  Archive,
  FileText,
  Ruler,
  AlertTriangle,
  ArrowLeft,
  Link2,
  User,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { can, type Role } from "@/lib/permissions";
import { apiFetch } from "@/lib/api-client";

// ─── Types ──────────────────────────────────────────────────────────
interface LayoutItem {
  id: string;
  ideaId: string;
  quantityPerRun: number;
  idea: { id: string; msku: string; mainImageUrl: string };
}

interface ProductionLayout {
  id: string;
  code: string;
  name: string | null;
  materialCode: string;
  materialWidth: number;
  materialLength: number;
  dxfFileUrl: string;
  pdfFileUrl: string | null;
  status: string;
  isVerified: boolean;
  verifiedById: string | null;
  verifiedBy: { id: string; fullName: string } | null;
  items: LayoutItem[];
  createdAt: string;
}

interface IdeaOption {
  id: string;
  msku: string;
  mainImageUrl: string;
}

interface LinkedRequest {
  id: string;
  ideaId: string;
  idea: {
    id: string;
    msku: string;
    mainImageUrl?: string;
    amazonListing?: { sku: string; itemName?: string } | null;
  } | null;
  requestedQty: number;
  priority: string;
  requestedAt: string;
  layoutAssignee?: {
    id: string;
    fullName: string;
  } | null;
  layoutAssigneeId: string | null;
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function ProductionLayoutsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const searchParams = useSearchParams();
  const requestIdFromUrl = searchParams.get("requestId");

  const [layouts, setLayouts] = useState<ProductionLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [materialFilter, setMaterialFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const canManage = role && can(role, "manage_production_layouts");

  const fetchLayouts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      if (materialFilter !== "all") params.set("materialCode", materialFilter);
      if (verifiedFilter === "true") params.set("isVerified", "true");
      if (verifiedFilter === "false") params.set("isVerified", "false");

      const { data } = await apiFetch(
        `/api/production-layouts?${params.toString()}`
      );
      if (data) setLayouts(data);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, materialFilter, verifiedFilter]);

  useEffect(() => {
    fetchLayouts();
  }, [fetchLayouts]);

  const selectedLayout = layouts.find((l) => l.id === selectedId) || null;

  // ─── Material codes list for filter ───────────────────────────────
  const materialCodes = [
    ...new Set(layouts.map((l) => l.materialCode)),
  ].sort();

  return (
    <div className="h-[calc(100vh-7rem)] border rounded-lg bg-background overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[52px] shrink-0 border-b">
        <div className="flex items-center gap-3">
          <Layers className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-base font-bold">File Sản xuất (Layout)</h1>
          <Badge variant="secondary" className="text-[10px]">
            {layouts.length} file
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setSelectedId(null);
            }}
          >
            <SelectTrigger className="h-7 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Đang dùng</SelectItem>
              <SelectItem value="archived">Đã lưu trữ</SelectItem>
              <SelectItem value="all">Tất cả</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={verifiedFilter}
            onValueChange={(v) => {
              setVerifiedFilter(v);
              setSelectedId(null);
            }}
          >
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue placeholder="Verify" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="true">Đã verify</SelectItem>
              <SelectItem value="false">Chưa verify</SelectItem>
            </SelectContent>
          </Select>
          {canManage && (
            <Button size="sm" className="h-8" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Thêm Layout
            </Button>
          )}
        </div>
      </div>

      {/* Search + Material filter */}
      <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo code layout..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        {materialCodes.length > 1 && (
          <Select
            value={materialFilter}
            onValueChange={(v) => {
              setMaterialFilter(v);
              setSelectedId(null);
            }}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Vật liệu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả vật liệu</SelectItem>
              {materialCodes.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Two-pane layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left: List */}
        <div className="w-[380px] shrink-0 border-r flex flex-col">
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : layouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Layers className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Chưa có file layout nào
                </p>
              </div>
            ) : (
              layouts.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => setSelectedId(layout.id)}
                  className={`w-full text-left px-4 py-3 flex flex-col gap-1.5 border-b transition-colors ${
                    selectedId === layout.id
                      ? "bg-accent"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="font-mono font-semibold text-sm truncate">
                      {layout.code}
                    </span>
                    {layout.isVerified ? (
                      <ShieldCheck className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    ) : (
                      <ShieldOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant="outline"
                      className="text-[9px] font-normal py-0"
                    >
                      {layout.materialCode}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-normal py-0"
                    >
                      {layout.materialWidth}×{layout.materialLength} mm
                    </Badge>
                    <span className="text-[9px] text-muted-foreground">
                      {layout.items.length} SKU
                    </span>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Right: Detail */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedLayout ? (
            <LayoutDetail
              layout={selectedLayout}
              role={role}
              onRefresh={fetchLayouts}
              canManage={canManage}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Layers className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-base font-medium text-muted-foreground mb-1">
                Chưa chọn layout
              </h3>
              <p className="text-sm text-muted-foreground/70 max-w-xs">
                Chọn một file layout từ danh sách bên trái để xem chi tiết.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <CreateLayoutDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          fetchLayouts();
          setCreateOpen(false);
        }}
        initialRequestId={requestIdFromUrl}
      />
    </div>
  );
}

// ─── Detail Pane ────────────────────────────────────────────────────
function LayoutDetail({
  layout,
  role,
  onRefresh,
  canManage,
}: {
  layout: ProductionLayout;
  role: Role | undefined;
  onRefresh: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canManage: any;
}) {
  const [verifying, setVerifying] = useState(false);

  const canVerify = role && (role === "worker" || role === "manager" || role === "boss");

  const handleVerify = async () => {
    setVerifying(true);
    const { data } = await apiFetch(
      `/api/production-layouts/verify/${layout.id}`,
      {
        method: "PATCH",
        successMessage: "Đã xác minh file layout!",
      }
    );
    if (data) onRefresh();
    setVerifying(false);
  };

  const handleArchive = async () => {
    const { data } = await apiFetch(`/api/production-layouts/${layout.id}`, {
      method: "DELETE",
      successMessage: "Đã lưu trữ layout",
    });
    if (data) onRefresh();
  };

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-mono">{layout.code}</h2>
            {layout.name && (
              <p className="text-sm text-muted-foreground">{layout.name}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {layout.isVerified ? (
                <Badge className="bg-green-600 text-white text-[10px]">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Đã verify
                  {layout.verifiedBy && ` bởi ${layout.verifiedBy.fullName}`}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] border-yellow-300 text-yellow-700"
                >
                  <ShieldOff className="h-3 w-3 mr-1" /> Chưa verify
                </Badge>
              )}
              {layout.status === "archived" && (
                <Badge variant="secondary" className="text-[10px]">
                  <Archive className="h-3 w-3 mr-1" /> Đã lưu trữ
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {canVerify && !layout.isVerified && layout.status === "active" && (
              <Button
                size="sm"
                className="h-8 text-xs bg-green-600 hover:bg-green-700"
                onClick={handleVerify}
                disabled={verifying}
              >
                {verifying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                )}
                Verify File
              </Button>
            )}
            {role === "boss" && layout.status === "active" && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={handleArchive}
              >
                <Archive className="h-3.5 w-3.5 mr-1" /> Lưu trữ
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Material & Dimensions */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Vật liệu
            </p>
            <p className="text-sm font-bold text-[--color-craft] dark:text-orange-400">
              {layout.materialCode}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Kích thước phôi
            </p>
            <p className="text-lg font-bold font-mono">
              {layout.materialWidth} × {layout.materialLength}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                mm
              </span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Ngày tạo
            </p>
            <p className="text-sm">
              {format(new Date(layout.createdAt), "dd/MM/yyyy")}
            </p>
          </div>
        </div>

        <Separator />

        {/* Files */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> File gia công
          </h3>
          <div className="flex items-center gap-3">
            <a
              href={layout.dxfFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-md"
            >
              <Download className="h-3.5 w-3.5" />
              Tải file DXF (cắt laser)
              <ExternalLink className="h-3 w-3" />
            </a>
            {layout.pdfFileUrl && (
              <a
                href={layout.pdfFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-md"
              >
                <Download className="h-3.5 w-3.5" />
                Tải file PDF (in UV)
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        <Separator />

        {/* SKU Items */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">
            SKU trong layout ({layout.items.length})
          </h3>
          <div className="border rounded-md divide-y">
            {layout.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {item.idea.msku}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    Mỗi lần chạy:
                  </span>
                  <Badge className="bg-blue-600 text-white text-xs">
                    {item.quantityPerRun} cái
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ─── Create Layout Dialog (Batch Resolve) ──────────────────────────
function CreateLayoutDialog({
  open,
  onOpenChange,
  onCreated,
  initialRequestId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  initialRequestId: string | null;
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [materialCode, setMaterialCode] = useState("");
  const [materialWidth, setMaterialWidth] = useState("");
  const [materialLength, setMaterialLength] = useState("");
  const [dxfFileUrl, setDxfFileUrl] = useState("");
  const [pdfFileUrl, setPdfFileUrl] = useState("");

  // SKU selection (auto-filled + manual)
  const [skuSearch, setSkuSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [skuResults, setSkuResults] = useState<any[]>([]);
  interface SelectedSku {
    ideaId: string;
    msku: string;
    quantityPerRun: number;
  }
  const [selectedSkus, setSelectedSkus] = useState<SelectedSku[]>([]);

  // Pending requests
  const [pendingRequests, setPendingRequests] = useState<LinkedRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(
    new Set()
  );

  // ── Fetch ALL awaiting_layout requests when dialog opens ──
  useEffect(() => {
    if (!open) return;
    setLoadingRequests(true);
    (async () => {
      try {
        const res = await fetch(`/api/production?status=awaiting_layout`);
        if (res.ok) {
          const json = await res.json();
          setPendingRequests(Array.isArray(json) ? json : []);

          // Pre-select initialRequestId if provided
          if (initialRequestId) {
            setSelectedRequestIds(new Set([initialRequestId]));
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoadingRequests(false);
      }
    })();
  }, [open, initialRequestId]);

  // ── Auto-fill SKUs from checked requests ──
  useEffect(() => {
    if (selectedRequestIds.size === 0) return;

    // Build a map of ideaId → max requestedQty among checked requests
    const ideaQtyMap = new Map<string, number>();
    for (const req of pendingRequests) {
      if (selectedRequestIds.has(req.id)) {
        const existing = ideaQtyMap.get(req.ideaId) || 0;
        ideaQtyMap.set(req.ideaId, existing + req.requestedQty);
      }
    }

    // Merge into selectedSkus: add new ones, update qty for existing
    setSelectedSkus((prev) => {
      const existingMap = new Map(prev.map((s) => [s.ideaId, s]));
      const result: SelectedSku[] = [...prev];

      for (const [ideaId, totalQty] of ideaQtyMap) {
        const idea = pendingRequests.find(
          (r) => r.ideaId === ideaId && r.idea
        )?.idea;
        const msku = idea?.msku || ideaId.slice(0, 8);

        if (existingMap.has(ideaId)) {
          // Already in list — don't overwrite user's qty
          continue;
        }
        result.push({ ideaId, msku, quantityPerRun: 1 });
      }
      return result;
    });
  }, [selectedRequestIds, pendingRequests]);

  // ── When unchecking all requests, clear auto-filled SKUs ──
  // (But keep manually-added ones — we track origin via a separate mechanism
  //  For simplicity: when unchecking a request, remove its SKU if no other
  //  checked request references it)

  // ── Under-production warning calculation ──
  const underProductionWarnings = useMemo(() => {
    const warnings: { ideaId: string; msku: string; produced: number; requested: number }[] = [];
    // Compute total requested qty per ideaId from checked requests
    const requestedMap = new Map<string, number>();
    for (const req of pendingRequests) {
      if (selectedRequestIds.has(req.id)) {
        requestedMap.set(
          req.ideaId,
          (requestedMap.get(req.ideaId) || 0) + req.requestedQty
        );
      }
    }
    for (const sku of selectedSkus) {
      const requested = requestedMap.get(sku.ideaId);
      if (requested && sku.quantityPerRun < requested) {
        warnings.push({
          ideaId: sku.ideaId,
          msku: sku.msku,
          produced: sku.quantityPerRun,
          requested,
        });
      }
    }
    return warnings;
  }, [selectedSkus, selectedRequestIds, pendingRequests]);

  const searchIdeas = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setSkuResults([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/ideas?search=${encodeURIComponent(q)}&pageSize=20`
      );
      const json = res.ok ? await res.json() : null;
      setSkuResults((json?.data || []).slice(0, 15));
    } catch {
      setSkuResults([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchIdeas(skuSearch), 300);
    return () => clearTimeout(timer);
  }, [skuSearch, searchIdeas]);

  const addSku = (idea: { id: string; msku: string }) => {
    if (selectedSkus.some((s) => s.ideaId === idea.id)) return;
    setSelectedSkus([
      ...selectedSkus,
      { ideaId: idea.id, msku: idea.msku, quantityPerRun: 1 },
    ]);
    setSkuSearch("");
    setSkuResults([]);
  };

  const removeSku = (ideaId: string) => {
    setSelectedSkus(selectedSkus.filter((s) => s.ideaId !== ideaId));
  };

  const updateQty = (ideaId: string, qty: number) => {
    setSelectedSkus(
      selectedSkus.map((s) =>
        s.ideaId === ideaId ? { ...s, quantityPerRun: Math.max(1, qty) } : s
      )
    );
  };

  const toggleRequestId = (id: string) => {
    const next = new Set(selectedRequestIds);
    if (next.has(id)) {
      next.delete(id);
      // Remove orphan SKUs: SKUs that no longer have any checked request referencing them
      const remainingIdeaIds = new Set<string>();
      for (const req of pendingRequests) {
        if (next.has(req.id)) remainingIdeaIds.add(req.ideaId);
      }
      setSelectedSkus((prev) =>
        prev.filter((s) => remainingIdeaIds.has(s.ideaId))
      );
    } else {
      next.add(id);
    }
    setSelectedRequestIds(next);
  };

  // Select all requests that have the same ideaId as currently selected SKUs
  const handleSelectAllForSku = (ideaId: string) => {
    const next = new Set(selectedRequestIds);
    for (const req of pendingRequests) {
      if (req.ideaId === ideaId) {
        next.add(req.id);
      }
    }
    setSelectedRequestIds(next);
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error("Vui lòng nhập mã layout");
      return;
    }
    if (!materialCode.trim()) {
      toast.error("Vui lòng nhập mã vật liệu");
      return;
    }
    if (!materialWidth || parseFloat(materialWidth) <= 0) {
      toast.error("Chiều rộng phải > 0");
      return;
    }
    if (!materialLength || parseFloat(materialLength) <= 0) {
      toast.error("Chiều dài phải > 0");
      return;
    }
    if (!dxfFileUrl.trim()) {
      toast.error("Vui lòng nhập link file DXF");
      return;
    }
    if (selectedSkus.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 SKU");
      return;
    }

    setSaving(true);
    try {
      const { data } = await apiFetch("/api/production-layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim() || undefined,
          materialCode: materialCode.trim(),
          materialWidth: parseFloat(materialWidth),
          materialLength: parseFloat(materialLength),
          dxfFileUrl: dxfFileUrl.trim(),
          pdfFileUrl: pdfFileUrl.trim() || undefined,
          items: selectedSkus.map((s) => ({
            ideaId: s.ideaId,
            quantityPerRun: s.quantityPerRun,
          })),
          requestIds: Array.from(selectedRequestIds),
        }),
        successMessage: "Đã tạo layout!",
      });
      if (data) {
        const d = data as Record<string, unknown>;
        const resolvedIds = d.resolvedRequestIds as string[] | undefined;
        const message = d.message as string | undefined;
        if (resolvedIds?.length) {
          toast.success(message || `Đã giải quyết ${resolvedIds.length} yêu cầu sản xuất!`);
        }
        resetForm();
        onCreated();
      }
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setCode("");
    setName("");
    setMaterialCode("");
    setMaterialWidth("");
    setMaterialLength("");
    setDxfFileUrl("");
    setPdfFileUrl("");
    setSelectedSkus([]);
    setSkuSearch("");
    setSelectedRequestIds(new Set());
    setPendingRequests([]);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Tạo File Layout Mới — Batch Resolve
          </DialogTitle>
          <DialogDescription>
            Tick chọn lệnh đang chờ → SKU tự động điền → Điền thông số phôi → Lưu
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-[1fr_1fr] gap-4 min-h-0 overflow-hidden py-2">
          {/* ═══ LEFT: Pending Requests Table ═══ */}
          <div className="flex flex-col min-h-0 border rounded-md">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                Lệnh đang chờ File ({pendingRequests.length})
              </Label>
              {loadingRequests && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            <ScrollArea className="flex-1">
              {pendingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Không có lệnh nào đang chờ file layout
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    Quản lý cần tạo yêu cầu sản xuất với trạng thái &quot;Chờ layout&quot;
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-8">✓</TableHead>
                      <TableHead className="text-xs">SKU</TableHead>
                      <TableHead className="text-xs text-right">SL cần</TableHead>
                      <TableHead className="text-xs">Ưu tiên</TableHead>
                      <TableHead className="text-xs">Người nhận</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((req) => (
                      <TableRow
                        key={req.id}
                        className={`cursor-pointer ${
                          selectedRequestIds.has(req.id)
                            ? "bg-blue-50/50 dark:bg-blue-950/20"
                            : ""
                        }`}
                        onClick={() => toggleRequestId(req.id)}
                      >
                        <TableCell className="w-8" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedRequestIds.has(req.id)}
                            onCheckedChange={() => toggleRequestId(req.id)}
                          />
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold">
                              {req.idea?.msku || req.ideaId.slice(0, 8)}
                            </span>
                            {req.idea?.amazonListing?.itemName && (
                              <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                                {req.idea.amazonListing.itemName.slice(0, 30)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          {req.requestedQty}
                        </TableCell>
                        <TableCell>{priorityBadge(req.priority)}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">
                          {req.layoutAssignee?.fullName || (
                            <span className="italic text-muted-foreground/60">
                              Chưa nhận
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </div>

          {/* ═══ RIGHT: Layout Form + SKU config ═══ */}
          <ScrollArea className="min-h-0">
            <div className="space-y-4 pr-1">
              {/* Material & File info */}
              <div className="space-y-3 border rounded-md p-3">
                <Label className="text-xs font-semibold">Thông số phôi & File</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">
                      Mã Layout <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="LAYOUT-BW3MXL-001"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Tên (tuỳ chọn)</Label>
                    <Input
                      placeholder="Tên gợi nhớ"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">
                    Mã vật liệu <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="BW-3-MXL, ACRYLIC-3MM"
                    value={materialCode}
                    onChange={(e) => setMaterialCode(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">
                      Rộng (mm) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      placeholder="910"
                      value={materialWidth}
                      onChange={(e) => setMaterialWidth(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">
                      Dài (mm) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      placeholder="600"
                      value={materialLength}
                      onChange={(e) => setMaterialLength(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">
                    Link file DXF <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="https://drive.google.com/file/d/..."
                    value={dxfFileUrl}
                    onChange={(e) => setDxfFileUrl(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Link file PDF (tuỳ chọn)</Label>
                  <Input
                    placeholder="https://drive.google.com/file/d/..."
                    value={pdfFileUrl}
                    onChange={(e) => setPdfFileUrl(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>

              {/* SKU Config */}
              <div className="space-y-3 border rounded-md p-3">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>SKU trong Layout ({selectedSkus.length})</span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    Tự động từ lệnh đã tick + thêm thủ công
                  </span>
                </Label>

                {/* Manual SKU search */}
                <div className="relative">
                  <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Thêm SKU thủ công..."
                    value={skuSearch}
                    onChange={(e) => setSkuSearch(e.target.value)}
                    className="pl-7 h-7 text-xs"
                  />
                </div>
                {skuResults.length > 0 && (
                  <div className="border rounded-md max-h-[120px] overflow-y-auto divide-y">
                    {skuResults.map(
                      (idea: { id: string; msku: string }) => (
                        <button
                          key={idea.id}
                          type="button"
                          className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted transition-colors"
                          onClick={() => addSku(idea)}
                        >
                          <span className="font-mono font-medium">{idea.msku}</span>
                        </button>
                      )
                    )}
                  </div>
                )}

                {/* SKU list with quantityPerRun + under-production warning */}
                {selectedSkus.length > 0 && (
                  <div className="border rounded-md divide-y max-h-[250px] overflow-y-auto">
                    {selectedSkus.map((s) => {
                      const warning = underProductionWarnings.find(
                        (w) => w.ideaId === s.ideaId
                      );
                      return (
                        <div key={s.ideaId} className="px-2 py-1.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className="font-mono text-[10px] py-0">
                                {s.msku}
                              </Badge>
                              {selectedRequestIds.size > 0 && (
                                <button
                                  type="button"
                                  className="text-[9px] text-blue-600 hover:underline"
                                  onClick={() => handleSelectAllForSku(s.ideaId)}
                                >
                                  Chọn tất cả lệnh
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Label className="text-[9px] text-muted-foreground">
                                SL/tấm:
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                className="w-14 h-6 text-[11px] text-center"
                                value={s.quantityPerRun}
                                onChange={(e) =>
                                  updateQty(
                                    s.ideaId,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-red-500 hover:text-red-700"
                                onClick={() => removeSku(s.ideaId)}
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                          {/* Under-production warning */}
                          {warning && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded px-1.5 py-0.5">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span>
                                SL/tấm ({warning.produced}) &lt; yêu cầu ({warning.requested}).
                                Sẽ cần chạy nhiều lần.
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Batch resolve summary */}
              {selectedRequestIds.size > 0 && (
                <div className="border rounded-md p-2 bg-blue-50/30 dark:bg-blue-950/20">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                    <Link2 className="h-3.5 w-3.5" />
                    Sẽ giải quyết {selectedRequestIds.size} lệnh khi lưu
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Các lệnh đã tick sẽ được chuyển sang trạng thái &quot;Sẵn sàng sản xuất&quot;
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tạo Layout{selectedRequestIds.size > 0 ? ` + Giải quyết ${selectedRequestIds.size} lệnh` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
