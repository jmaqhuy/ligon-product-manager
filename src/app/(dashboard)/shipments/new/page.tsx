"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Save, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { SkuSelector, type AvailableIdea } from "@/components/sku-selector";

interface SellingAccount { id: string; name: string; platform: string; status: string; }

export default function NewShipmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<SellingAccount[]>([]);
  const [amazonAccountId, setAmazonAccountId] = useState("");
  const [allIdeas, setAllIdeas] = useState<AvailableIdea[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/selling-accounts").then(r => r.json()).then((data: SellingAccount[]) => {
      const amazon = data.filter(a => a.platform === "amazon" && a.status === "active");
      setAccounts(amazon);
      if (amazon.length > 0 && !amazonAccountId) setAmazonAccountId(amazon[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/shipments/available-ideas?amazonAccountId=${amazonAccountId}`).then(({ data }) => {
      if (!cancelled && data) setAllIdeas(data);
    });
    return () => { cancelled = true; };
  }, [amazonAccountId]);

  const toggleItem = (idea: AvailableIdea) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(idea.id)) next.delete(idea.id);
      else {
        next.add(idea.id);
        if (idea.sellingAccountId && idea.sellingAccountId !== amazonAccountId) setAmazonAccountId(idea.sellingAccountId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!amazonAccountId) { toast.error("Vui lòng chọn tài khoản Amazon"); return; }
    if (selectedIds.size === 0) { toast.error("Vui lòng chọn ít nhất một SKU"); return; }
    const selected = allIdeas.filter(i => selectedIds.has(i.id));
    setLoading(true);
    try {
      const { data } = await apiFetch("/api/shipments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amazonAccountId, items: selected.map(item => ({
          ideaId: item.id, totalQty: item.availableQty || 1,
          productionRequestId: item.latestProductionRequest?.id || undefined,
        })) }),
        successMessage: "Đã tạo lô hàng!",
      });
      if (data) router.push(`/shipments/${data.id}`);
    } finally { setLoading(false); }
  };

  const totalQty = useMemo(() =>
    allIdeas.filter(i => selectedIds.has(i.id)).reduce((s, i) => s + (i.availableQty || 0), 0),
  [allIdeas, selectedIds]);

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">
      <div className="shrink-0 flex items-center gap-3 px-1 py-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0"><Link href="/shipments"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1 min-w-0"><h1 className="text-xl font-bold tracking-tight">Tạo lô hàng mới</h1></div>
      </div>

      <SkuSelector amazonAccountId={amazonAccountId} accounts={accounts} selectedIds={selectedIds} onToggle={toggleItem} onAccountChange={setAmazonAccountId} />

      <div className="shrink-0 mt-3 flex items-center gap-3">
        <div className="flex-1 min-w-0 overflow-x-auto">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1.5 pb-1">
              {allIdeas.filter(i => selectedIds.has(i.id)).map(idea => (
                <Badge key={idea.id} variant="secondary" className="shrink-0 gap-1 text-[11px] py-1 px-2">
                  <code className="text-[10px]">{idea.msku}</code><span className="text-muted-foreground">×{idea.availableQty || 0}</span>
                  <button className="ml-0.5 hover:text-destructive rounded-full" onClick={e => { e.stopPropagation(); toggleItem(idea); }}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
              <Badge variant="outline" className="shrink-0 text-[11px]">{totalQty} sp</Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild><Link href="/shipments">Huỷ</Link></Button>
          <Button onClick={handleCreate} disabled={loading || selectedIds.size === 0} size="sm">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Tạo lô hàng ({selectedIds.size} SKU, {totalQty} sp)
          </Button>
        </div>
      </div>
    </div>
  );
}


