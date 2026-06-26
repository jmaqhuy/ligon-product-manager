"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Loader2, Plus, Minus, Box, AlertTriangle, Search, X, Copy } from "lucide-react";
import { cmToIn, kgToLb } from "@/lib/unit-convert";
import { convertToDirectImageUrl } from "@/lib/google-drive";

// ─── Types ───

export interface ShipmentItemForBox {
  id: string;
  ideaId: string;
  totalQty: number;
  alreadyAllocated: number;
  idea: {
    id: string;
    msku: string;
    sku?: string;
    title?: string;
    mainImageUrl?: string;
    asin?: string;
    fnskuCode?: string;
  };
}

export interface BoxGroupDraft {
  count: number;
  dimension: { lengthCm: string; widthCm: string; heightCm: string; weightKg: string };
  items: { shipmentItemId: string; qtyPerBox: number }[];
}

interface CreateBoxesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ShipmentItemForBox[];
  onCreate: (group: BoxGroupDraft) => Promise<void>;
}

// ─── Helpers ───

function itemKey(item: ShipmentItemForBox) {
  return `${item.idea.msku} ${item.idea.sku || ""} ${item.idea.title || ""} ${item.idea.asin || ""} ${item.idea.fnskuCode || ""}`.toLowerCase();
}

function SkuThumb({ url, msku }: { url?: string; msku: string }) {
  const src = url ? convertToDirectImageUrl(url) : null;
  return (
    <div className="size-10 shrink-0 rounded border overflow-hidden bg-muted">
      {src ? (
        <img src={src} alt={msku} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30"><Box className="h-3.5 w-3.5" /></div>
      )}
    </div>
  );
}

// ─── Component ───

export function CreateBoxesSheet({ open, onOpenChange, items, onCreate }: CreateBoxesSheetProps) {
  const [count, setCount] = useState(1);
  const [dimension, setDimension] = useState({ lengthCm: "", widthCm: "", heightCm: "", weightKg: "" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Items already fully allocated to OTHER boxes (not this group)
  const fullyAllocated = useMemo(() =>
    items.filter(i => !selectedIds.has(i.id) && i.alreadyAllocated >= i.totalQty),
    [items, selectedIds]);

  // Items in THIS group (selected)
  const selectedItems = useMemo(() =>
    items.filter(i => selectedIds.has(i.id)),
    [items, selectedIds]);

  // Available items (not fully allocated, not in this group)
  const availableItems = useMemo(() =>
    items.filter(i => !selectedIds.has(i.id) && i.alreadyAllocated < i.totalQty),
    [items, selectedIds]);

  // Filtered based on search
  const filterItems = (list: ShipmentItemForBox[]) =>
    search ? list.filter(i => itemKey(i).includes(search.toLowerCase())) : list;

  const filteredAvailable = useMemo(() => filterItems(availableItems), [availableItems, search]);
  const filteredAllocated = useMemo(() => filterItems(fullyAllocated), [fullyAllocated, search]);

  const handleToggleItem = (itemId: string) => {
    setWarning(null);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
        setQtys(q => { const n = { ...q }; delete n[itemId]; return n; });
      } else {
        next.add(itemId);
        const item = items.find(i => i.id === itemId);
        if (item) {
          const remaining = item.totalQty - item.alreadyAllocated;
          setQtys(q => ({ ...q, [itemId]: Math.max(1, Math.floor(remaining / count)) }));
        }
      }
      return next;
    });
  };

  const handleCountChange = (newCount: number) => {
    if (newCount < 1) newCount = 1;
    setCount(newCount);
    setWarning(null);
    const newQtys: Record<string, number> = {};
    for (const id of selectedIds) {
      const item = items.find(i => i.id === id);
      if (item) {
        const remaining = item.totalQty - item.alreadyAllocated;
        newQtys[id] = Math.max(0, Math.floor(remaining / newCount));
      }
    }
    setQtys(newQtys);
  };

  const validate = (): string | null => {
    if (selectedIds.size === 0) return "Chọn ít nhất một SKU";
    for (const id of selectedIds) {
      const item = items.find(i => i.id === id);
      if (!item) continue;
      const qtyPerBox = qtys[id] || 0;
      const totalForItem = qtyPerBox * count;
      const needed = item.totalQty - item.alreadyAllocated;
      if (totalForItem > needed) {
        return `${item.idea.msku}: ${qtyPerBox}×${count}=${totalForItem} vượt quá ${needed} còn lại`;
      }
    }
    return null;
  };

  const handleCreate = async () => {
    const err = validate();
    if (err) { setWarning(err); return; }

    setCreating(true);
    const group: BoxGroupDraft = {
      count,
      dimension,
      items: Array.from(selectedIds).map(id => ({
        shipmentItemId: id,
        qtyPerBox: qtys[id] || 0,
      })),
    };
    await onCreate(group);
    setCreating(false);
    setCount(1);
    setDimension({ lengthCm: "", widthCm: "", heightCm: "", weightKg: "" });
    setSelectedIds(new Set());
    setQtys({});
    setWarning(null);
    setSearch("");
  };

  const clearSearch = () => setSearch("");

  const dimPreview = useMemo(() => {
    const l = parseFloat(dimension.lengthCm);
    const w = parseFloat(dimension.widthCm);
    const h = parseFloat(dimension.heightCm);
    const kg = parseFloat(dimension.weightKg);
    return {
      valid: !isNaN(l) && !isNaN(w) && !isNaN(h),
      lIn: isNaN(l) ? "" : cmToIn(l).toFixed(1),
      wIn: isNaN(w) ? "" : cmToIn(w).toFixed(1),
      hIn: isNaN(h) ? "" : cmToIn(h).toFixed(1),
      lb: isNaN(kg) ? "" : kgToLb(kg).toFixed(2),
    };
  }, [dimension]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[720px] sm:max-w-[720px] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
          <SheetTitle>Tạo nhóm thùng</SheetTitle>
          <SheetDescription>
            Tạo một nhóm thùng giống hệt nhau (cùng kích thước, cùng số lượng SKU bên trong).
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-3">
          {/* ─── Box count ─── */}
          <div className="flex items-center gap-3 bg-muted/20 rounded-lg px-3 py-2">
            <span className="text-sm font-medium shrink-0">Số thùng trong nhóm:</span>
            <Button variant="outline" size="icon" className="h-7 w-7"
              onClick={() => handleCountChange(count - 1)} disabled={count <= 1}>
              <Minus className="h-3 w-3" />
            </Button>
            <Input type="number" min={1} className="w-16 h-7 text-center text-sm font-medium"
              value={count}
              onChange={(e) => handleCountChange(Math.max(1, parseInt(e.target.value) || 1))} />
            <Button variant="outline" size="icon" className="h-7 w-7"
              onClick={() => handleCountChange(count + 1)}>
              <Plus className="h-3 w-3" />
            </Button>
            <span className="text-[11px] text-muted-foreground ml-auto">
              {count} thùng giống hệt nhau
            </span>
          </div>

          {/* ─── Selected SKUs in this group ─── */}
          {selectedItems.length > 0 && (
            <div className="border rounded-lg bg-primary/5 border-primary/20">
              <div className="px-2.5 py-1.5 border-b border-primary/10 bg-primary/10">
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <Box className="h-3 w-3" /> SKU trong nhóm này ({selectedItems.length})
                </span>
              </div>
              <div className="p-1.5 space-y-1">
                {selectedItems.map(item => {
                  const remaining = item.totalQty - item.alreadyAllocated;
                  const qpb = qtys[item.id] || 0;
                  return (
                    <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-background border text-[11px]">
                      <SkuThumb url={item.idea.mainImageUrl} msku={item.idea.msku} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono font-semibold text-xs">{item.idea.msku}</code>
                          {item.idea.asin && <Badge variant="outline" className="text-[8px] font-mono">ASIN: {item.idea.asin}</Badge>}
                          {item.idea.fnskuCode && <Badge variant="outline" className="text-[8px] font-mono">FNSKU: {item.idea.fnskuCode}</Badge>}
                        </div>
                        {item.idea.title && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.idea.title}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-muted-foreground">×</span>
                        <Input type="number" min={0} max={remaining}
                          className="w-14 h-6 text-[10px] text-center py-0"
                          value={qpb}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(remaining, parseInt(e.target.value) || 0));
                            setQtys(prev => ({ ...prev, [item.id]: v }));
                            setWarning(null);
                          }} />
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">/thùng</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-red-500"
                          onClick={() => handleToggleItem(item.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Search ─── */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm trong danh sách SKU của shipment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
            {search && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-0.5 h-7 w-7" onClick={clearSearch}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* ─── All shipment SKUs list ─── */}
          <div className="border rounded-lg">
            <div className="px-2.5 py-1.5 border-b bg-muted/20">
              <span className="text-[11px] font-medium">Danh sách SKU trong shipment ({items.length})</span>
            </div>
            <div className="p-1.5 space-y-1 max-h-[360px] overflow-y-auto">
              {/* Available items first */}
              {filteredAvailable.length === 0 && filteredAllocated.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-6">
                  {search ? "Không tìm thấy SKU khớp với tìm kiếm" : "Tất cả SKU đã được thêm vào nhóm này"}
                </p>
              )}

              {filteredAvailable.map(item => {
                const isSelected = selectedIds.has(item.id);
                const remaining = item.totalQty - item.alreadyAllocated;
                return (
                  <div key={item.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-[11px] border cursor-pointer transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"}`}
                    onClick={() => handleToggleItem(item.id)}
                  >
                    <input type="checkbox" checked={isSelected} onChange={() => {}} className="h-3 w-3 shrink-0" />
                    <SkuThumb url={item.idea.mainImageUrl} msku={item.idea.msku} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono font-semibold text-xs">{item.idea.msku}</code>
                        {item.idea.asin && (
                          <Badge variant="outline" className="text-[8px] font-mono cursor-pointer hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); copyText(item.idea.asin!); }}>
                            ASIN: {item.idea.asin} <Copy className="h-2 w-2 ml-0.5" />
                          </Badge>
                        )}
                        {item.idea.fnskuCode && (
                          <Badge variant="outline" className="text-[8px] font-mono cursor-pointer hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); copyText(item.idea.fnskuCode!); }}>
                            FNSKU: {item.idea.fnskuCode} <Copy className="h-2 w-2 ml-0.5" />
                          </Badge>
                        )}
                      </div>
                      {item.idea.title && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.idea.title}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="secondary" className="text-[9px]">
                        {item.alreadyAllocated > 0 ? `${item.alreadyAllocated}/` : ""}{item.totalQty}
                      </Badge>
                      {isSelected && (
                        <Input type="number" min={0} max={remaining}
                          className="w-12 h-5 text-[9px] text-center py-0 shrink-0"
                          value={qtys[item.id] ?? 0}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(remaining, parseInt(e.target.value) || 0));
                            setQtys(prev => ({ ...prev, [item.id]: v }));
                            setWarning(null);
                          }} />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Divider: already allocated to other boxes */}
              {filteredAllocated.length > 0 && (
                <div className="pt-2 mt-1 border-t border-dashed">
                  <div className="px-2 pb-1">
                    <span className="text-[10px] text-muted-foreground font-medium">Đã phân bổ hết vào thùng khác</span>
                  </div>
                  {filteredAllocated.map(item => (
                    <div key={item.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-[11px] bg-muted/30 opacity-50 cursor-not-allowed mt-0.5">
                      <SkuThumb url={item.idea.mainImageUrl} msku={item.idea.msku} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono font-semibold text-xs">{item.idea.msku}</code>
                          {item.idea.asin && <Badge variant="outline" className="text-[8px] font-mono">ASIN: {item.idea.asin}</Badge>}
                        </div>
                        {item.idea.title && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.idea.title}</p>}
                      </div>
                      <Badge variant="secondary" className="text-[9px] shrink-0">{item.totalQty}/{item.totalQty} ✓</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── Dimensions ─── */}
          <div className="border rounded-lg p-3 space-y-2">
            <span className="text-[11px] font-medium">Kích thước thùng (tùy chọn)</span>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[9px] text-muted-foreground">Dài (cm)</label>
                <Input placeholder="30" className="h-7 text-xs mt-0.5"
                  value={dimension.lengthCm}
                  onChange={(e) => setDimension(d => ({ ...d, lengthCm: e.target.value }))} />
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground">Rộng (cm)</label>
                <Input placeholder="20" className="h-7 text-xs mt-0.5"
                  value={dimension.widthCm}
                  onChange={(e) => setDimension(d => ({ ...d, widthCm: e.target.value }))} />
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground">Cao (cm)</label>
                <Input placeholder="15" className="h-7 text-xs mt-0.5"
                  value={dimension.heightCm}
                  onChange={(e) => setDimension(d => ({ ...d, heightCm: e.target.value }))} />
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground">Nặng (kg)</label>
                <Input placeholder="2.5" className="h-7 text-xs mt-0.5"
                  value={dimension.weightKg}
                  onChange={(e) => setDimension(d => ({ ...d, weightKg: e.target.value }))} />
              </div>
            </div>
            {dimPreview.valid && (
              <p className="text-[10px] text-muted-foreground">
                ≈ {dimPreview.lIn}×{dimPreview.wIn}×{dimPreview.hIn} inches
                {dimPreview.lb && <> · {dimPreview.lb} lb</>}
              </p>
            )}
          </div>

          {/* ─── Summary ─── */}
          {selectedItems.length > 0 && (
            <div className="border rounded-lg p-3 space-y-1.5 bg-muted/10">
              <span className="text-[11px] font-medium">Tổng kết</span>
              {selectedItems.map(item => {
                const qpb = qtys[item.id] || 0;
                const total = qpb * count;
                const needed = item.totalQty - item.alreadyAllocated;
                const ok = total === needed;
                return (
                  <div key={item.id} className="flex items-center gap-2 text-[10px]">
                    <code className="font-mono">{item.idea.msku}</code>
                    <span className={ok ? "text-green-600" : "text-amber-600"}>
                      {qpb}/thùng × {count} thùng = {total} sp {ok ? "✓" : `/ ${needed} cần`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── Warning ─── */}
          {warning && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{warning}</span>
            </div>
          )}
        </div>

        {/* ─── Bottom actions ─── */}
        <div className="shrink-0 flex justify-end gap-2 px-4 py-3 border-t mt-1">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button size="sm" onClick={handleCreate} disabled={creating || selectedIds.size === 0}>
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Box className="h-3.5 w-3.5 mr-1" />}
            Tạo {count} thùng
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
