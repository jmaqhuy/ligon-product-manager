"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Package, Check, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { convertToDirectImageUrl } from "@/lib/google-drive";

export interface AvailableIdea {
  id: string;
  msku: string;
  sku: string;
  title: string | null;
  mainImageUrl: string;
  fulfillmentType: string;
  topicName: string;
  asin: string | null;
  fnskuCode: string | null;
  fnskuLabelFileUrl?: string | null;
  sellingAccountId: string | null;
  sellingAccountName: string | null;
  productionStatus: "waiting" | "producing" | "produced" | "none";
  availableQty: number;
  hasShippedProduction: boolean;
  totalShippedQty: number;
  latestProductionRequest: {
    id: string;
    completedAt: string;
    requestedQty: number;
    actualQty: number | null;
  } | null;
  totalProductionRequests: number;
  activeShipment: { id: string; status: string } | null;
  isShipped: boolean;
}

export const PRODUCTION_LABELS: Record<string, { label: string; className: string }> = {
  producing: { label: "Đang SX", className: "bg-amber-500 text-white" },
  produced: { label: "Đã SX", className: "bg-blue-500 text-white" },
  waiting: { label: "Chờ SX", className: "bg-gray-400 text-white" },
  none: { label: "", className: "" },
};

interface SkuSelectorProps {
  amazonAccountId: string;
  accounts: { id: string; name: string; platform: string }[];
  selectedIds: Set<string>;
  onToggle: (idea: AvailableIdea) => void;
  onAccountChange: (id: string) => void;
  compact?: boolean;
  existingQtys?: Map<string, number>;
}

export function SkuSelector({
  amazonAccountId,
  accounts,
  selectedIds,
  onToggle,
  onAccountChange,
  compact,
  existingQtys,
}: SkuSelectorProps) {
  const [searchMsku, setSearchMsku] = useState("");
  const [allIdeas, setAllIdeas] = useState<AvailableIdea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingIdeas(true);
    const params = new URLSearchParams();
    if (amazonAccountId) params.set("amazonAccountId", amazonAccountId);
    if (searchMsku) params.set("search", searchMsku);
    apiFetch(`/api/shipments/available-ideas?${params}`).then(({ data }) => {
      if (!cancelled && data) setAllIdeas(data);
      if (!cancelled) setLoadingIdeas(false);
    });
    return () => { cancelled = true; };
  }, [amazonAccountId, searchMsku]);

  return (
    <div className={`flex flex-col ${compact ? "h-full" : "flex-1 min-h-0"}`}>
      {/* Account selector */}
      {!compact && (
        <div className="shrink-0 flex items-center gap-2 px-1 pb-2">
          <span className="text-xs text-muted-foreground">Tài khoản:</span>
          <Select value={amazonAccountId} onValueChange={onAccountChange}>
            <SelectTrigger className="h-8 w-50 text-xs">
              <SelectValue placeholder="Chọn..." />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden flex flex-col bg-muted/5">
        {/* Search bar */}
        <div className="shrink-0 p-3 border-b bg-background">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo MSKU, SKU, ASIN, tiêu đề..."
              value={searchMsku}
              onChange={(e) => setSearchMsku(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Scrollable SKU list */}
        <div className="flex-1 overflow-y-auto">
          {loadingIdeas ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : allIdeas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
              <Package className="h-8 w-8 mb-2 opacity-40" />
              {searchMsku ? "Không tìm thấy SKU phù hợp" : "Chưa có SKU FBA nào khả dụng"}
            </div>
          ) : (
            <div className="divide-y">
              {allIdeas.map((idea) => {
                const isSelected = selectedIds.has(idea.id);
                const isShipped = idea.isShipped;
                const thumbUrl = convertToDirectImageUrl(idea.mainImageUrl);
                const prodTag = PRODUCTION_LABELS[idea.productionStatus];

                return (
                  <div key={idea.id} className="relative">
                    {/* Shipped overlay */}
                    {isShipped && (
                      <div className="absolute inset-0 bg-background/70 z-10 flex items-center justify-center gap-3">
                        <Badge className="bg-gray-500 text-white text-xs px-2 py-1">Đã ship</Badge>
                        {idea.activeShipment && (
                          <a
                            href={`/shipments/${idea.activeShipment.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline bg-white px-2 py-1 rounded border"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" /> Xem shipment
                          </a>
                        )}
                      </div>
                    )}
                  <button
                    key={idea.id}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3 ${
                      isSelected ? "bg-primary/5 ring-1 ring-primary/20" : ""
                    } ${isShipped ? "opacity-40 pointer-events-none" : ""}`}
                    onClick={() => onToggle(idea)}
                    disabled={isShipped}
                  >
                    <div
                      className="w-12 h-12 shrink-0 rounded-md border overflow-hidden bg-muted cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); if (thumbUrl) setZoomImage(thumbUrl); }}
                    >
                      {thumbUrl ? (
                        <img src={thumbUrl} alt={idea.msku} className="w-full h-full object-cover hover:scale-110 transition-transform"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground/40" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono font-medium">{idea.msku}</code>
                        {prodTag.label && <Badge className={`text-[10px] px-1.5 h-4 ${prodTag.className}`}>{prodTag.label}</Badge>}
                        {idea.availableQty > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-4 font-mono">
                            <Check className="h-2.5 w-2.5 mr-0.5" />{idea.availableQty}
                          </Badge>
                        )}
                        {idea.asin && <span className="text-[10px] text-muted-foreground font-mono">{idea.asin}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground truncate">{idea.title || idea.topicName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{idea.topicName}</span>
                        {idea.sellingAccountName && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal">{idea.sellingAccountName}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      {isSelected && existingQtys?.has(idea.id) && (
                        <Badge variant="secondary" className="text-[10px] font-mono">×{existingQtys.get(idea.id)}</Badge>
                      )}
                      {isSelected ? <Badge className="bg-green-600 text-white text-[10px]">Đã chọn</Badge> : null}
                    </div>
                  </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Image zoom */}
      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
        <DialogContent className="max-w-[95vw] w-fit bg-transparent border-none shadow-none" showCloseButton={false}>
          {zoomImage && <img src={zoomImage} alt="Preview" className="max-h-[95vh] max-w-[95vw] rounded-md object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
