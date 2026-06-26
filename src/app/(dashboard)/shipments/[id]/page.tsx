"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Loader2, Truck, Package, Box, Calendar, MapPin,
  Printer, Plus, X, Save, Trash2, Check, Pencil, Copy,
  Hash, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { convertToDirectImageUrl } from "@/lib/google-drive";
import { LabelPrint } from "@/components/label-print";
import { SkuSelector } from "@/components/sku-selector";
import { CreateBoxesSheet } from "@/components/create-boxes-sheet";
import { cmToIn, kgToLb } from "@/lib/unit-convert";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

const STATUS_LABELS: Record<string, string> = {
  draft: "Nháp", packing: "Đóng gói", ready: "Sẵn sàng",
  in_transit: "Đang vận chuyển", received: "Đã nhận",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  packing: "bg-amber-100 text-amber-800 border-amber-200",
  ready: "bg-blue-100 text-blue-800 border-blue-200",
  in_transit: "bg-cyan-100 text-cyan-800 border-cyan-200",
  received: "bg-green-100 text-green-800 border-green-200",
};

export default function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // Box management — CreateBoxesSheet
  const [boxSheetOpen, setBoxSheetOpen] = useState(false);
  const [creatingBoxes, setCreatingBoxes] = useState(false);

  // SKU add sheet (uses SkuSelector)
  const [skuSheetOpen, setSkuSheetOpen] = useState(false);
  const [addAccountId, setAddAccountId] = useState("");
  const [addSelectedIds, setAddSelectedIds] = useState<Set<string>>(new Set());
  const [addingSku, setAddingSku] = useState(false);

  // Batch edit mode
  const [editMode, setEditMode] = useState(false);
  const [editQtys, setEditQtys] = useState<Record<string, number>>({});
  const [savingQtys, setSavingQtys] = useState(false);

  // Image zoom
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Fetch shipment
  const fetchShipment = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiFetch(`/api/shipments/${id}`);
      if (data) setShipment(data);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchShipment(); }, [fetchShipment]);

  // Status
  const handleStatusChange = async (newStatus: string) => {
    setStatusLoading(true);
    const { data } = await apiFetch(`/api/shipments/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
      successMessage: `Trạng thái: ${STATUS_LABELS[newStatus] || newStatus}`,
    });
    if (data) setShipment(data);
    setStatusLoading(false);
  };

  const handleShipDate = async () => {
    setSaving(true);
    const { data } = await apiFetch(`/api/shipments/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actualShipDate: shipment.actualShipDate ? null : new Date().toISOString().split("T")[0],
        status: shipment.actualShipDate ? shipment.status : "in_transit",
      }),
      successMessage: shipment.actualShipDate ? "Đã huỷ ngày gửi thực tế" : "Đã đánh dấu ngày gửi hàng!",
    });
    if (data) setShipment(data);
    setSaving(false);
  };

  const handleDelete = async () => {
    const { data } = await apiFetch(`/api/shipments/${id}`, {
      method: "DELETE", successMessage: "Đã xoá lô hàng",
    });
    if (data) router.push("/shipments");
  };

  // Boxes — Create group via sheet
  const handleCreateBoxGroup = async (group: {
    count: number;
    dimension: { lengthCm: string; widthCm: string; heightCm: string; weightKg: string };
    items: { shipmentItemId: string; qtyPerBox: number }[];
  }) => {
    setCreatingBoxes(true);
    const dim = {
      lengthCm: group.dimension.lengthCm ? parseFloat(group.dimension.lengthCm) : undefined,
      widthCm: group.dimension.widthCm ? parseFloat(group.dimension.widthCm) : undefined,
      heightCm: group.dimension.heightCm ? parseFloat(group.dimension.heightCm) : undefined,
      weightKg: group.dimension.weightKg ? parseFloat(group.dimension.weightKg) : undefined,
    };
    const { data, error } = await apiFetch(`/api/shipments/${id}/boxes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups: [{ count: group.count, dimension: dim, items: group.items }] }),
    });
    if (error) {
      toast.error(typeof error === "string" ? error : (error as any)?.error || "Lỗi tạo thùng");
    } else if (data) {
      toast.success(`Đã tạo ${group.count} thùng!`);
      fetchShipment();
      setBoxSheetOpen(false);
    }
    setCreatingBoxes(false);
  };

  const handleUpdateBox = async (boxId: string, updates: Record<string, unknown>) => {
    const { data } = await apiFetch(`/api/shipments/${id}/boxes/${boxId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
      successMessage: "Đã cập nhật thùng",
    });
    if (data) fetchShipment();
  };

  const handleDeleteBox = async (boxId: string) => {
    await apiFetch(`/api/shipments/${id}/boxes/${boxId}`, {
      method: "DELETE", successMessage: "Đã xoá thùng",
    });
    fetchShipment();
  };

  // SKU item operations
  const startEditMode = () => {
    const qtys: Record<string, number> = {};
    shipment.items?.forEach((item: any) => { qtys[item.id] = item.totalQty; });
    setEditQtys(qtys);
    setEditMode(true);
  };

  const cancelEditMode = () => { setEditMode(false); setEditQtys({}); };

  const handleBatchSaveQtys = async () => {
    setSavingQtys(true);
    for (const [itemId, qty] of Object.entries(editQtys)) {
      const current = shipment.items.find((i: any) => i.id === itemId);
      if (current && current.totalQty !== qty) {
        await apiFetch(`/api/shipments/${id}/items/${itemId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ totalQty: qty }),
        });
      }
    }
    setSavingQtys(false);
    setEditMode(false);
    setEditQtys({});
    fetchShipment();
  };

  const handleRemoveItem = async (itemId: string) => {
    await apiFetch(`/api/shipments/${id}/items/${itemId}`, {
      method: "DELETE", successMessage: "Đã xoá SKU khỏi lô",
    });
    fetchShipment();
  };

  // SKU add via Sheet
  const openSheet = () => {
    setAddAccountId(shipment.amazonAccountId || "");
    // Pre-highlight existing items
    const existing = new Set<string>(shipment.items?.map((i: any) => i.ideaId) || []);
    setAddSelectedIds(existing);
    setSkuSheetOpen(true);
  };

  const handleAddSkus = async () => {
    // Only add items NOT already in shipment
    const existingIdeaIds = new Set<string>(shipment.items?.map((i: any) => i.ideaId) || []);
    const newIds = Array.from(addSelectedIds).filter(id => !existingIdeaIds.has(id));
    if (newIds.length === 0) { setSkuSheetOpen(false); return; }
    setAddingSku(true);
    const items = newIds.map(ideaId => ({ ideaId, totalQty: 1 }));
    await apiFetch(`/api/shipments/${id}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
      successMessage: `Đã thêm ${newIds.length} SKU`,
    });
    setAddingSku(false);
    setSkuSheetOpen(false);
    fetchShipment();
  };

  // Copy to clipboard
  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`Đã sao chép ${label}`));
  };

  // Accounts for SkuSelector
  const accounts = shipment?.amazonAccountId
    ? [{ id: shipment.amazonAccountId, name: shipment.amazonAccount?.name || "Amazon", platform: "amazon" }]
    : [];

  // Existing qtys map for SkuSelector
  const existingQtys = (() => {
    const m = new Map<string, number>();
    shipment?.items?.forEach((item: any) => m.set(item.ideaId, item.totalQty));
    return m;
  })();

  // Compute already-allocated qty per shipment item for CreateBoxesSheet
  const itemsForBox = (() => {
    if (!shipment) return [];
    const allocMap = new Map<string, number>();
    shipment.boxes?.forEach((box: any) => {
      box.items?.forEach((bi: any) => {
        const prev = allocMap.get(bi.shipmentItemId) || 0;
        allocMap.set(bi.shipmentItemId, prev + (bi.qtyPerBox || 0));
      });
    });
    return (shipment.items || []).map((item: any) => ({
      id: item.id,
      ideaId: item.ideaId,
      totalQty: item.totalQty,
      alreadyAllocated: allocMap.get(item.id) || 0,
      idea: {
        id: item.idea.id,
        msku: item.idea.msku,
        sku: item.idea.sku,
        title: item.idea.title,
        mainImageUrl: item.idea.mainImageUrl,
        asin: item.idea.amazonListing?.asin || undefined,
        fnskuCode: item.idea.amazonListing?.fnskuCode || undefined,
      },
    }));
  })();

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!shipment) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Truck className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-lg font-semibold">Không tìm thấy lô hàng</h2>
      <Button variant="ghost" className="mt-4" asChild><Link href="/shipments"><ArrowLeft className="mr-2 h-4 w-4" /> Quay lại</Link></Button>
    </div>
  );

  const isDraft = shipment.status === "draft";
  const isPacking = shipment.status === "packing";
  const isReady = shipment.status === "ready";
  const isInTransit = shipment.status === "in_transit";
  const isReceived = shipment.status === "received";
  const canEdit = isDraft || isPacking;
  const hasBoxes = shipment.boxes?.length > 0;

  return (
    <TooltipProvider delayDuration={200}>
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">
      {/* ═══ HEADER ═══ */}
      <div className="shrink-0 flex items-center justify-between px-1 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/shipments"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{shipment.amazonAccount?.name}</h1>
              <Badge variant="outline" className={STATUS_COLORS[shipment.status] || ""}>{STATUS_LABELS[shipment.status]}</Badge>              {shipment.shipLine && <Badge variant="outline" className="text-[10px]">{shipment.shipLine}</Badge>}            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
              <Calendar className="h-3 w-3" />
              Dự kiến: {new Date(shipment.plannedShipDate).toLocaleDateString("vi-VN")}
              {shipment.actualShipDate && <> → Thực tế: {new Date(shipment.actualShipDate).toLocaleDateString("vi-VN")}</>}
            </p>
          </div>
        </div>
        {canEdit && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-600"><Trash2 className="mr-1 h-3.5 w-3.5" /> Xoá</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Xoá lô hàng?</AlertDialogTitle><AlertDialogDescription>Lô hàng này và tất cả thùng sẽ bị xoá. Không thể hoàn tác.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Huỷ</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600">Xoá</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* ═══ WORKFLOW ═══ */}
      <div className="shrink-0 flex items-center gap-1 text-[10px] px-1 pb-2">
        {["draft","packing","ready","in_transit","received"].map((step, i) => {
          const idx = ["draft","packing","ready","in_transit","received"].indexOf(shipment.status);
          return (
            <div key={step} className="flex items-center">
              <div className={`px-2 py-0.5 rounded-full font-medium ${i < idx ? "bg-green-100 text-green-700" : i === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i+1}. {STATUS_LABELS[step]}
              </div>
              {i < 4 && <div className="w-3 h-px bg-border mx-0.5" />}
            </div>
          );
        })}
      </div>

      {/* ═══ MAIN: 1/3 SKU + 2/3 Boxes ═══ */}
      <div className="flex-1 flex gap-3 min-h-0 px-1">
        {/* ─── LEFT 1/3: SKU List ─── */}
        <div className="w-1/3 flex flex-col min-h-0 border rounded-lg bg-muted/5">
          <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b bg-background">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" /> SKU ({shipment.items?.length || 0})
            </span>
            {canEdit && (
              <div className="flex items-center gap-1">
                {editMode ? (
                  <>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={cancelEditMode}><X className="h-3 w-3 mr-1" />Huỷ</Button>
                    <Button size="sm" className="h-6 text-[10px] bg-green-600 hover:bg-green-700" onClick={handleBatchSaveQtys} disabled={savingQtys}>
                      {savingQtys ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}Lưu
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={openSheet}><Plus className="h-3 w-3 mr-1" />Thêm</Button>
                    {shipment.items?.length > 0 && (
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={startEditMode}><Pencil className="h-3 w-3 mr-1" />Sửa SL</Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {!shipment.items?.length ? (
              <p className="text-xs text-muted-foreground text-center py-6">Chưa có SKU</p>
            ) : (
              shipment.items.map((item: any) => {
                const idea = item.idea;
                const thumbUrl = idea?.mainImageUrl ? convertToDirectImageUrl(idea.mainImageUrl) : null;
                return (
                  <div key={item.id} className="flex items-center gap-2 py-4 px-2 rounded-md border bg-background text-xs">
                    {/* Avatar — click to zoom */}
                    <button
                      className="size-12 shrink-0 rounded-md border overflow-hidden bg-muted cursor-pointer"
                      onClick={() => { if (thumbUrl) setZoomImage(thumbUrl); }}
                    >
                      {thumbUrl ? (
                        <img src={thumbUrl} alt={idea.msku} className="w-full h-full object-cover hover:scale-110 transition-transform"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground/30" /></div>
                      )}
                    </button>

                    {/* MSKU / ASIN / FNSKU column */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      {/* MSKU — click to open idea detail in new tab */}
                      <a
                        href={`/ideas/${idea.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono font-semibold hover:underline text-sm leading-tight w-fit"
                      >
                        {idea.msku}
                      </a>
                      {/* ASIN — click to copy */}
                      <span
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground group/copy cursor-pointer w-fit"
                        onClick={() => idea.amazonListing?.asin ? copyText(idea.amazonListing.asin, "ASIN") : null}
                      >
                        <span className="text-[10px] text-muted-foreground/60 shrink-0">ASIN:</span>
                        <code className={`font-mono leading-tight ${idea.amazonListing?.asin ? "" : "italic text-muted-foreground/40"}`}>
                          {idea.amazonListing?.asin || "—"}
                        </code>
                        {idea.amazonListing?.asin && <Copy className="h-2.5 w-2.5 opacity-0 group-hover/copy:opacity-100 transition-opacity shrink-0" />}
                      </span>
                      {/* FNSKU — click to copy */}
                      <span
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground group/copy cursor-pointer w-fit"
                        onClick={() => idea.amazonListing?.fnskuCode ? copyText(idea.amazonListing.fnskuCode, "FNSKU") : null}
                      >
                        <span className="text-[10px] text-muted-foreground/60 shrink-0">FNSKU:</span>
                        <code className={`font-mono bg-muted/50 px-0.5 rounded leading-tight ${idea.amazonListing?.fnskuCode ? "" : "italic text-muted-foreground/40"}`}>
                          {idea.amazonListing?.fnskuCode || "—"}
                        </code>
                        {idea.amazonListing?.fnskuCode && <Copy className="h-2.5 w-2.5 opacity-0 group-hover/copy:opacity-100 transition-opacity shrink-0" />}
                      </span>
                    </div>

                    {/* Qty + Action button — pinned right */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {editMode ? (
                        <>
                          <Input
                            type="number" min={1}
                            className="w-14 h-6 text-[10px] text-center py-0"
                            value={editQtys[item.id] ?? item.totalQty}
                            onChange={(e) => setEditQtys(prev => ({ ...prev, [item.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                          />
                          <Button size="sm" variant="destructive" className="h-7 text-[10px] px-2.5 w-[72px]"
                            onClick={() => handleRemoveItem(item.id)}>
                            <Trash2 className="h-3 w-3 mr-1" />Xoá
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge variant="secondary" className="text-[10px] font-mono shrink-0">×{item.totalQty}</Badge>
                          {idea.amazonListing?.fnskuCode && idea.amazonListing?.fnskuLabelFileUrl ? (
                            <LabelPrint labelUrl={idea.amazonListing.fnskuLabelFileUrl} fnskuCode={idea.amazonListing.fnskuCode} variant="button" />
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] px-2.5 w-[72px]" disabled>
                              <Printer className="h-2.5 w-2.5 mr-0.5" />In label
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── RIGHT 2/3: Boxes ─── */}
        <div className="flex-1 flex flex-col min-h-0 border rounded-lg bg-muted/5">
          <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b bg-background">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Box className="h-3.5 w-3.5" /> Thùng hàng ({shipment.boxes?.length || 0})
            </span>
            {canEdit && shipment.items?.length > 0 && (
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setBoxSheetOpen(true)} disabled={creatingBoxes}>
                {creatingBoxes ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                Tạo thùng
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {!hasBoxes ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                {shipment.items?.length > 0 ? "Tạo thùng để phân bổ hàng" : "Thêm SKU trước"}
              </p>
            ) : (
              (() => {
                // Group boxes: source boxes first, then copies indented
                const boxes = shipment.boxes || [];
                const sourceBoxes = boxes.filter((b: any) => !b.sourceBoxId);
                const copiesOf = (sourceId: string) => boxes.filter((b: any) => b.sourceBoxId === sourceId);

                return sourceBoxes.map((box: any) => {
                  const copies = copiesOf(box.id);
                  const allInGroup = [box, ...copies];
                  const groupTotal = allInGroup.reduce((s: number, b: any) =>
                    s + (b.items?.reduce((ss: number, bi: any) => ss + bi.qtyPerBox, 0) || 0), 0);

                  return (
                    <div key={box.id}>
                      {/* Source box */}
                      <BoxCard box={box} total={groupTotal} hasCopies={copies.length > 0} copyCount={copies.length} isSource
                        onUpdate={(updates: any) => handleUpdateBox(box.id, updates)}
                        onDelete={canEdit ? () => handleDeleteBox(box.id) : undefined}
                      />
                      {/* Copies (indented) */}
                      {copies.map((copy: any) => (
                        <div key={copy.id} className="ml-4 mt-1 border-l-2 border-muted-foreground/15 pl-3">
                          <BoxCard box={copy} total={null} hasCopies={false} copyCount={0}
                            onUpdate={(updates: any) => handleUpdateBox(copy.id, updates)}
                            onDelete={canEdit ? () => handleDeleteBox(copy.id) : undefined}
                          />
                        </div>
                      ))}
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM ACTIONS ═══ */}
      <div className="shrink-0 flex items-center gap-2 px-1 py-2 border-t mt-2">
        {isDraft && (
          <Button onClick={() => handleStatusChange("packing")} disabled={statusLoading || !shipment.items?.length} size="sm">
            Bắt đầu đóng gói
          </Button>
        )}
        {isPacking && (
          <Button onClick={() => handleStatusChange("ready")} disabled={statusLoading || !hasBoxes} size="sm" className="bg-blue-600 hover:bg-blue-700">
            Sẵn sàng gửi
          </Button>
        )}
        {isReady && (
          <Button onClick={handleShipDate} disabled={saving} size="sm" className="bg-green-600 hover:bg-green-700">
            <Truck className="mr-2 h-4 w-4" /> Đánh dấu đã gửi hàng
          </Button>
        )}
        {isInTransit && (
          <Button onClick={() => handleStatusChange("received")} disabled={statusLoading} size="sm" className="bg-green-600 hover:bg-green-700">
            <Check className="mr-2 h-4 w-4" /> Đã nhận hàng tại kho Amazon
          </Button>
        )}
        {isReceived && (
          <p className="text-sm text-green-600 font-medium flex items-center gap-2"><Check className="h-4 w-4" /> Hàng đã vào kho Amazon FBA</p>
        )}
      </div>

      {/* ═══ Image Zoom Dialog ═══ */}
      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
        <DialogContent className="max-w-[95vw] w-fit bg-transparent border-none shadow-none" showCloseButton={false}>
          {zoomImage && <img src={zoomImage} alt="Preview" className="max-h-[95vh] max-w-[95vw] rounded-md object-contain" />}
        </DialogContent>
      </Dialog>

      {/* ═══ SKU Add Sheet ═══ */}
      <Sheet open={skuSheetOpen} onOpenChange={(o) => { if (!o) { setSkuSheetOpen(false); setAddSelectedIds(new Set()); } }}>
        <SheetContent side="right" className="w-[480px] sm:max-w-[480px] flex flex-col p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle>Thêm SKU vào lô</SheetTitle>
            <SheetDescription>Chọn SKU FBA đã đăng bán. SKU đã có sẵn được đánh dấu.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 min-h-0 px-2">
            <SkuSelector
              amazonAccountId={addAccountId}
              accounts={accounts}
              selectedIds={addSelectedIds}
              onToggle={(idea) => {
                setAddSelectedIds(prev => {
                  const next = new Set(prev);
                  if (next.has(idea.id)) next.delete(idea.id); else next.add(idea.id);
                  return next;
                });
              }}
              onAccountChange={setAddAccountId}
              existingQtys={existingQtys}
              compact
            />
          </div>
          <div className="shrink-0 flex justify-end gap-2 px-4 py-3 border-t">
            <Button variant="outline" size="sm" onClick={() => { setSkuSheetOpen(false); setAddSelectedIds(new Set()); }}>Huỷ</Button>
            <Button size="sm" onClick={handleAddSkus} disabled={addingSku || addSelectedIds.size === 0}>
              {addingSku ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Thêm ({Array.from(addSelectedIds).filter(id => !(shipment.items?.some((i: any) => i.ideaId === id))).length} SKU mới)
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ═══ Create Boxes Sheet ═══ */}
      <CreateBoxesSheet
        open={boxSheetOpen}
        onOpenChange={setBoxSheetOpen}
        items={itemsForBox}
        onCreate={handleCreateBoxGroup}
      />
    </div>
    </TooltipProvider>
  );
}

// ─── Box Card (reusable) ───
function BoxCard({ box, total, hasCopies, copyCount, isSource, onUpdate, onDelete }: {
  box: any;
  total: number | null;
  hasCopies: boolean;
  copyCount: number;
  isSource?: boolean;
  onUpdate: (u: any) => void;
  onDelete?: () => void;
}) {
  const boxTotal = box.items?.reduce((s: number, bi: any) => s + bi.qtyPerBox, 0) || 0;
  const skuCount = box.items?.length || 0;
  const [showAllImages, setShowAllImages] = useState(false);
  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`Đã sao chép ${label}`));
  };

  // Collect ASIN images from box items
  const itemImages = (box.items || []).map((bi: any) => ({
    msku: bi.shipmentItem?.idea?.msku || "?",
    asin: bi.shipmentItem?.idea?.amazonListing?.asin || null,
    imageUrl: bi.shipmentItem?.idea?.mainImageUrl
      ? convertToDirectImageUrl(bi.shipmentItem.idea.mainImageUrl)
      : null,
    qty: bi.qtyPerBox,
  }));

  // Dimension string for Excel copy (tab-separated inches)
  const dimCopy = box.lengthCm
    ? `${cmToIn(box.lengthCm)}\t×\t${cmToIn(box.widthCm)}\t×\t${cmToIn(box.heightCm)}\tin`
    : "";
  const dimDisplay = box.lengthCm
    ? `${box.lengthCm}×${box.widthCm}×${box.heightCm} cm (${cmToIn(box.lengthCm)}×${cmToIn(box.widthCm)}×${cmToIn(box.heightCm)} in)`
    : "Chưa có";
  const weightDisplay = box.weightKg
    ? `${box.weightKg} kg (${kgToLb(box.weightKg)} lb)`
    : "Chưa có";
  const weightCopy = box.weightKg
    ? `${kgToLb(box.weightKg)}\tlb`
    : "";

  // ─── COPY BOX (compact) ───
  if (!isSource && hasCopies === false && copyCount === 0 && total === null) {
    return (
      <div className="border rounded-lg overflow-hidden bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-2.5 py-1 bg-muted/20">
          <div className="flex items-center gap-1.5 min-w-0">
            <Box className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-[12px] font-medium">{box.boxName}</span>
            <Badge variant="secondary" className="text-[11px]">{boxTotal} sp</Badge>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <AmazonInfoPopover box={box} onSave={onUpdate} />
            {onDelete && (
              <Button size="sm" variant="ghost" className="h-5 text-[11px] px-1 text-red-500" onClick={onDelete}>
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
        </div>
        {/* Body: Kho | Shipment ID | Tracking | Label — compact single line, shadcn Tooltip on hover */}
        <div className="px-2.5 py-1.5 flex items-center gap-2 text-sm font-semibold flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => box.warehouseCode && copyText(box.warehouseCode, "Mã kho")}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded group/copy ${box.warehouseCode ? "hover:bg-muted cursor-pointer" : "cursor-default"}`}
              >
                <MapPin className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                {box.warehouseCode ? (
                  <>
                    <code className="font-mono bg-muted/50 px-1 py-0.5 rounded">{box.warehouseCode}</code>
                    <Copy className="h-2 w-2 opacity-0 group-hover/copy:opacity-100 text-muted-foreground" />
                  </>
                ) : <span className="text-muted-foreground/50 italic">Không có</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px] py-1 px-2">Kho</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => box.amazonShipmentId && copyText(box.amazonShipmentId, "Shipment ID")}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded group/copy ${box.amazonShipmentId ? "hover:bg-muted cursor-pointer" : "cursor-default"}`}
              >
                <Truck className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                {box.amazonShipmentId ? (
                  <>
                    <code className="font-mono bg-muted/50 px-1 py-0.5 rounded">{box.amazonShipmentId}</code>
                    <Copy className="h-2 w-2 opacity-0 group-hover/copy:opacity-100 text-muted-foreground" />
                  </>
                ) : <span className="text-muted-foreground/50 italic">Không có</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px] py-1 px-2">Shipment ID</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => box.trackingNumber && copyText(box.trackingNumber, "Tracking")}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded group/copy ${box.trackingNumber ? "hover:bg-muted cursor-pointer" : "cursor-default"}`}
              >
                <Hash className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                {box.trackingNumber ? (
                  <>
                    <code className="font-mono bg-muted/50 px-1 py-0.5 rounded">{box.trackingNumber}</code>
                    <Copy className="h-2 w-2 opacity-0 group-hover/copy:opacity-100 text-muted-foreground" />
                  </>
                ) : <span className="text-muted-foreground/50 italic">Không có</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px] py-1 px-2">Tracking</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => box.labelFileUrl && copyText(box.labelFileUrl, "Label link")}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded group/copy ${box.labelFileUrl ? "hover:bg-muted cursor-pointer" : "cursor-default"}`}
              >
                <Printer className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                {box.labelFileUrl ? (
                  <>
                    <code className="font-mono bg-muted/50 px-1 py-0.5 rounded max-w-[100px] truncate">{box.labelFileUrl}</code>
                    <Copy className="h-2 w-2 opacity-0 group-hover/copy:opacity-100 text-muted-foreground" />
                  </>
                ) : <span className="text-muted-foreground/50 italic">Không có</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px] py-1 px-2">Label</TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  }

  // ─── SOURCE BOX (full) ───
  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/30">
        <div className="flex items-center gap-1.5 min-w-0">
          <Box className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[12px] font-medium">{box.boxName}</span>
          <Badge variant="secondary" className="text-[11px]">{boxTotal} sp</Badge>
          {hasCopies && (
            <Badge variant="outline" className="text-[11px] text-muted-foreground">
              +{copyCount} bản sao
            </Badge>
          )}
          {total !== null && (
            <Badge variant="outline" className="text-[11px]">Tổng: {total} sp</Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <AmazonInfoPopover box={box} onSave={onUpdate} />
          {onDelete && (
            <Button size="sm" variant="ghost" className="h-5 text-[9px] px-1 text-red-500" onClick={onDelete}>
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Body: Kho | Shipment ID | Tracking on one line, then left info + right images below */}
      <div className="px-2.5 py-2 space-y-2">
        {/* Row 1: Kho | Shipment ID | Tracking — shadcn Tooltip, click to copy */}
        <div className="flex items-center gap-2 text-[11px] flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => box.warehouseCode && copyText(box.warehouseCode, "Mã kho")}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded group/copy ${box.warehouseCode ? "hover:bg-muted cursor-pointer" : "cursor-default"}`}
              >
                <MapPin className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                {box.warehouseCode ? (
                  <>
                    <code className="font-mono bg-muted/50 px-1 py-0.5 rounded">{box.warehouseCode}</code>
                    <Copy className="h-2 w-2 opacity-0 group-hover/copy:opacity-100 text-muted-foreground" />
                  </>
                ) : <span className="text-muted-foreground/50 italic">Không có</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs py-1 px-2">Kho</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => box.amazonShipmentId && copyText(box.amazonShipmentId, "Shipment ID")}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded group/copy ${box.amazonShipmentId ? "hover:bg-muted cursor-pointer" : "cursor-default"}`}
              >
                <Truck className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                {box.amazonShipmentId ? (
                  <>
                    <code className="font-mono bg-muted/50 px-1 py-0.5 rounded">{box.amazonShipmentId}</code>
                    <Copy className="h-2 w-2 opacity-0 group-hover/copy:opacity-100 text-muted-foreground" />
                  </>
                ) : <span className="text-muted-foreground/50 italic">Không có</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs py-1 px-2">Shipment ID</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => box.trackingNumber && copyText(box.trackingNumber, "Tracking")}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded group/copy ${box.trackingNumber ? "hover:bg-muted cursor-pointer" : "cursor-default"}`}
              >
                <Hash className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                {box.trackingNumber ? (
                  <>
                    <code className="font-mono bg-muted/50 px-1 py-0.5 rounded">{box.trackingNumber}</code>
                    <Copy className="h-2 w-2 opacity-0 group-hover/copy:opacity-100 text-muted-foreground" />
                  </>
                ) : <span className="text-muted-foreground/50 italic">Không có</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs py-1 px-2">Tracking</TooltipContent>
          </Tooltip>
        </div>

        {/* Row 2: Left info + Right images */}
        <div className="flex gap-3">
          {/* ─── LEFT: Info stack ─── */}
          <div className="flex-1 min-w-0 space-y-1.5 text-[11px]">
            {/* SKU count + Total sp — each on its own row, bold & larger */}
            <div className="space-y-1 text-sm font-semibold">
              <div className="flex items-center gap-1">
                <Package className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground font-normal">Số SKU:</span>
                <span>{skuCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Box className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground font-normal">Tổng sp:</span>
                <span>{boxTotal}</span>
              </div>
            </div>

            {/* Dimensions + Label */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 group/copy text-muted-foreground">
                <span className="shrink-0">KT:</span>
                <span>{dimDisplay}</span>
                {box.lengthCm && (
                  <button onClick={() => copyText(dimCopy, "Kích thước (inch)")}
                    className="opacity-0 group-hover/copy:opacity-100">
                    <Copy className="h-2.5 w-2.5 hover:text-foreground" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 text-muted-foreground ml-[22px] group/copy">
                <span>Nặng:</span>
                <span>{weightDisplay}</span>
                {box.weightKg && (
                  <button onClick={() => copyText(weightCopy, "Cân nặng (lb)")}
                    className="opacity-0 group-hover/copy:opacity-100">
                    <Copy className="h-2.5 w-2.5 hover:text-foreground" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Printer className="h-2.5 w-2.5 shrink-0" />
                <span className="shrink-0">Label:</span>
                {box.labelFileUrl ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => copyText(box.labelFileUrl, "Label link")}
                      className="flex items-center gap-0.5 hover:text-foreground group/copy">
                      <code className="font-mono bg-muted/50 px-1 py-0.5 rounded max-w-[180px] truncate">{box.labelFileUrl}</code>
                      <Copy className="h-2 w-2 opacity-0 group-hover/copy:opacity-100" />
                    </button>
                    <a href={box.labelFileUrl} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline shrink-0">
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                ) : <span className="italic">Không có</span>}
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Product images ─── */}
          {itemImages.length > 0 && (
            <div className="shrink-0 flex flex-col gap-1">
              <div className="flex flex-wrap gap-1">
                {(showAllImages ? itemImages : itemImages.slice(0, 4)).map((img: typeof itemImages[number], i: number) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    {img.imageUrl ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <div className="size-[60px] rounded border overflow-hidden bg-muted cursor-pointer hover:ring-1 hover:ring-primary/50">
                            <img src={img.imageUrl} alt={img.msku} className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] bg-transparent border-none shadow-none" showCloseButton={false}>
                          <img src={img.imageUrl} alt={img.msku} className="max-h-[95vh] max-w-[95vw] object-contain rounded-md" />
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <div className="size-[60px] rounded border bg-muted flex items-center justify-center">
                        <Box className="h-4 w-4 text-muted-foreground/30" />
                      </div>
                    )}
                    <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[60px] truncate">
                      {img.msku}{img.asin ? ` · ${img.asin}` : ""}
                    </span>
                  </div>
                ))}
                {itemImages.length > 4 && !showAllImages && (
                  <button onClick={() => setShowAllImages(true)}
                    className="size-[60px] rounded border border-dashed flex items-center justify-center text-xs text-primary hover:bg-muted/50">
                    +{itemImages.length - 4}
                  </button>
                )}
              </div>
              {showAllImages && itemImages.length > 4 && (
                <button onClick={() => setShowAllImages(false)}
                  className="text-[11px] text-muted-foreground hover:underline self-end">
                  Thu gọn
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Amazon Info Popover (inline expand) ───
function AmazonInfoPopover({ box, onSave }: { box: any; onSave: (u: any) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    amazonShipmentId: box.amazonShipmentId || "",
    warehouseCode: box.warehouseCode || "",
    labelFileUrl: box.labelFileUrl || "",
    trackingNumber: box.trackingNumber || "",
  });

  if (!open) {
    return (
      <Button size="sm" variant="ghost" className="h-5 text-[9px] px-1" onClick={() => setOpen(true)}>
        <Pencil className="h-2.5 w-2.5 mr-0.5" />Info
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input className="h-5 w-28 text-[9px]" placeholder="Shipment ID" value={form.amazonShipmentId}
        onChange={(e) => setForm({ ...form, amazonShipmentId: e.target.value })} />
      <Input className="h-5 w-12 text-[9px]" placeholder="Kho" value={form.warehouseCode}
        onChange={(e) => setForm({ ...form, warehouseCode: e.target.value })} />
      <Input className="h-5 w-16 text-[9px]" placeholder="Tracking" value={form.trackingNumber}
        onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} />
      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => { onSave(form); setOpen(false); }}>
        <Check className="h-3 w-3 text-green-600" />
      </Button>
      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setOpen(false)}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
