"use client";
import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PhotoGallery } from "./photo-gallery";
import { ExternalLink, Pencil, Printer, Download, Copy, ShoppingBag, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import { AIGenerateButton } from "@/components/ai-generate-button";
import { toast } from "sonner";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/copy-button";
import { convertToDirectImageUrl } from "@/lib/google-drive";

import { AmazonEditSheet } from "./amazon-edit-sheet";

function statusBadge(status: string, labels: Record<string, string>) {
  return (
    <Badge variant="outline" className={(({} as any))[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

export interface AmazonListingTabProps {
  fulfillmentToggle?: any;
  idea: any;
  sellingAccounts: any[];
  isNotApproved: boolean;
  isPartner: boolean;
  NEXT_STATUS: Record<string, any[]>;
  listingStatusLabels: any;
  saving: boolean;
  handleListingStatusChange: (type: "amazon" | "etsy", status: string) => void;
  fetchIdea: () => void;
  role?: string;
  session?: any;
  canManagePhotos?: boolean;
}

export function AmazonListingTab({
  idea,
  sellingAccounts,
  isNotApproved,
  isPartner,
  NEXT_STATUS,
  listingStatusLabels,
  saving,
  handleListingStatusChange,
  fetchIdea,
  fulfillmentToggle,
  role,
  session,
  canManagePhotos,
}: AmazonListingTabProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [editSection, setEditSection] = useState<"all" | "info" | "premium" | "content">("all");
  const [labelPrintQty, setLabelPrintQty] = useState(1);
  const [changeFulfillmentOpen, setChangeFulfillmentOpen] = useState(false);
  const [pendingFulfillment, setPendingFulfillment] = useState("");
  const listing = idea.amazonListing;
  const id = idea.id;
  const amzForm = idea.amazonListing || {};

  const handleUpdateIdea = async (data: any) => { };
  const setSaving = (val: boolean) => { };

  const [aiGenerating, setAiGenerating] = useState(false);
  // Combine server-side lock (persists across F5) + local state (instant UI feedback)
  const isAiBusy = idea.aiGeneratingStatus || aiGenerating;

  useEffect(() => {
    if (idea.aiGeneratingStatus === false && aiGenerating) {
      setAiGenerating(false);
    }
  }, [idea.aiGeneratingStatus, aiGenerating]);

  const handleGenerateAiListing = async () => {
    if (isAiBusy) return;
    setAiGenerating(true); // Optimistic UI lock
    const toastId = toast.loading("⏳ AI bắt đầu phân tích ảnh và viết Listing...");
    try {
      const res = await fetch(`/api/ideas/${idea.id}/generate-listing`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi gọi AI");
      }
      toast.success("Tiến trình AI đã khởi chạy! Dữ liệu sẽ tự động hiển thị khi hoàn tất.", {
        id: toastId,
      });
      if (fetchIdea) fetchIdea(); // Fetch to get aiGeneratingStatus = true from server
    } catch (err: any) {
      toast.error(err.message || "Khởi chạy AI thất bại", { id: toastId });
      setAiGenerating(false);
    }
    // No finally { setAiGenerating(false) } — server broadcast will update idea.aiGeneratingStatus
  };

  const [verifying, setVerifying] = useState(false);
  const handleVerifyContent = async () => {
    setVerifying(true);
    try {
      const isVerified = !!listing?.contentVerifiedAt;
      const res = await fetch(`/api/ideas/${idea.id}/amazon-listing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentVerifiedAt: isVerified ? null : new Date().toISOString(),
          contentVerifiedById: isVerified ? null : session?.user?.id,
          version: listing?.version,
        }),
      });
      if (res.ok) {
        toast.success(isVerified ? "Đã bỏ xác nhận nội dung" : "Đã xác nhận nội dung!");
        if (fetchIdea) fetchIdea();
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi xác nhận nội dung");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <TabsContent value="amazon" className="mt-0 space-y-3 data-[state=inactive]:hidden pr-1 relative">
        <fieldset disabled={isNotApproved && !isPartner} className="space-y-3">
          {/* FBA/FBM — belongs to Amazon */}

          <div className="text-sm">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* ─── LEFT COLUMN: INFORMATION & GALLERY & PREMIUM CONTENT ─── */}
              <div className="space-y-6 lg:col-span-2">
                {/* INFORMATION */}
                <div className="bg-card rounded-lg border shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Information</h3>
                    {role !== "employee" && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => { setEditSection("info"); setEditOpen(true); }}>
                        <Pencil className="h-3 w-3 mr-1" /> Sửa
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {/* Row 1: Selling Account, Fulfillment, Status */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="group/acc flex flex-col justify-center rounded-md bg-muted/40 px-2.5 py-1.5 border border-transparent hover:border-border/50 transition-colors min-w-0">
                        <span className="text-[10px] text-muted-foreground block mb-0.5 shrink-0">Selling Account</span>
                        <span className="text-xs font-medium truncate">
                          {sellingAccounts.find(a => a.id === idea.amazonListing?.sellingAccountId)?.name || "—"}
                        </span>
                      </div>
                      <div className="group/ffm flex flex-col justify-center rounded-md bg-muted/40 px-2.5 py-1.5 border border-transparent hover:border-border/50 transition-colors min-w-0">
                        <span className="text-[10px] text-muted-foreground block mb-0.5 shrink-0">Fulfillment</span>
                        <div className="flex items-center gap-1 mt-0.5 truncate">
                          {fulfillmentToggle}
                        </div>
                      </div>
                      <div className="group/status flex flex-col justify-center rounded-md bg-muted/40 px-2.5 py-1.5 border border-transparent hover:border-border/50 transition-colors min-w-0">
                        <span className="text-[10px] text-muted-foreground block mb-0.5 shrink-0">Status</span>
                        <div className="flex items-center gap-1.5 mt-0.5 overflow-x-auto scrollbar-hide pb-0.5 -mb-0.5">
                          <div className="shrink-0">{statusBadge(idea.amazonListing?.listingStatus || "ready", listingStatusLabels)}</div>
                          {((NEXT_STATUS as any)[idea.amazonListing?.listingStatus || "ready"] || []).map((opt: any) => (
                            <Button key={opt.next} size="sm" className={`h-6 px-2 text-[10px] text-white shrink-0 ${opt.className}`}
                              onClick={() => handleListingStatusChange("amazon", opt.next)} disabled={saving}>{opt.label}</Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Row 2: SKU, ASIN, Price */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="group/sku flex flex-col justify-center rounded-md bg-muted/40 px-2.5 py-1.5 border border-transparent hover:border-border/50 transition-colors min-w-0">
                        <span className="text-[10px] text-muted-foreground block mb-0.5 shrink-0">SKU</span>
                        <div className="flex items-center justify-between min-w-0">
                          <span className="text-xs font-mono font-medium truncate">{idea.amazonListing?.sku || idea.sku || "—"}</span>
                          {(idea.amazonListing?.sku || idea.sku) && <CopyButton text={idea.amazonListing?.sku || idea.sku} className="shrink-0 h-4 w-4 opacity-0 group-hover/sku:opacity-100 transition-opacity ml-1" />}
                        </div>
                      </div>
                      <div className="group/asin flex flex-col justify-center rounded-md bg-muted/40 px-2.5 py-1.5 border border-transparent hover:border-border/50 transition-colors min-w-0">
                        <span className="text-[10px] text-muted-foreground block mb-0.5 shrink-0">ASIN</span>
                        <div className="flex items-center justify-between min-w-0">
                          <span className="text-xs font-mono font-medium truncate">{idea.amazonListing?.asin || "—"}</span>
                          {idea.amazonListing?.asin && (
                            <div className="flex items-center gap-1 opacity-0 group-hover/asin:opacity-100 transition-opacity shrink-0 ml-1">
                              <a href={`https://www.amazon.com/dp/${idea.amazonListing.asin}`} target="_blank" rel="noopener noreferrer" className="h-4 w-4 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded"><ExternalLink className="h-3 w-3" /></a>
                              <CopyButton text={idea.amazonListing.asin} className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="group/price flex flex-col justify-center rounded-md bg-muted/40 px-2.5 py-1.5 border border-transparent hover:border-border/50 transition-colors min-w-0">
                        <span className="text-[10px] text-muted-foreground block mb-0.5 shrink-0">Price</span>
                        <span className="text-xs font-medium truncate">${idea.amazonListing?.price || "—"}</span>
                      </div>
                    </div>

                    {/* Row 3: Vine & Auto Camp (Combined), FNSKU */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="group/vine-camp flex flex-col justify-center gap-1.5 rounded-md bg-muted/40 px-2.5 py-1.5 border border-transparent hover:border-border/50 transition-colors min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground shrink-0">Vine Status</span>
                          <span className={`text-[11px] font-medium truncate ml-2 ${idea.amazonListing?.vineStatus === 'not_enrolled' ? 'text-muted-foreground' : 'text-blue-700'}`}>
                            {idea.amazonListing?.vineStatus === 'enrolled' ? 'Enrolled' : idea.amazonListing?.vineStatus === 'reviewing' ? 'Reviewing' : idea.amazonListing?.vineStatus === 'completed' ? 'Completed' : 'Not Enrolled'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground shrink-0">Auto Camp</span>
                          <span className="text-[11px] font-medium truncate ml-2">
                            {idea.amazonListing?.campAuto ? "✅ Đã bật" : "❌ Tắt"}
                          </span>
                        </div>
                      </div>

                      <div className="col-span-2 group/fnsku flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5 border border-transparent hover:border-border/50 transition-colors min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Thumbnail */}
                          {idea.amazonListing?.fnskuLabelFileUrl ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <div className="shrink-0 w-12 h-8 rounded border bg-white cursor-pointer hover:ring-2 hover:ring-primary/50 overflow-hidden">
                                  <img src={convertToDirectImageUrl(idea.amazonListing.fnskuLabelFileUrl) || idea.amazonListing.fnskuLabelFileUrl} alt="Label" className="w-full h-full object-contain" />
                                </div>
                              </DialogTrigger>
                              <DialogContent className="max-w-[90vw] sm:max-w-[90vw] max-h-[90vh] bg-transparent border-none shadow-none !ring-0 p-0" showCloseButton={false}>
                                <img src={convertToDirectImageUrl(idea.amazonListing.fnskuLabelFileUrl) || idea.amazonListing.fnskuLabelFileUrl} alt="Label" className="max-w-[90vw] max-h-[90vh] object-contain rounded-md" />
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <div className="shrink-0 w-12 h-8 rounded border bg-muted/50 flex items-center justify-center">
                              <span className="text-[8px] text-muted-foreground">No Label</span>
                            </div>
                          )}

                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground">FNSKU</span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono font-medium">{idea.amazonListing?.fnskuCode || "—"}</span>
                              {idea.amazonListing?.fnskuCode && <CopyButton text={idea.amazonListing.fnskuCode} className="h-3 w-3 opacity-0 group-hover/fnsku:opacity-100 transition-opacity" />}
                            </div>
                          </div>
                        </div>

                        {/* Print Controls */}
                        {idea.amazonListing?.fnskuCode && idea.amazonListing?.fnskuLabelFileUrl && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Label className="text-[10px] text-muted-foreground shrink-0">SL:</Label>
                              <Input
                                type="number" min={1} max={99}
                                className="w-12 h-7 text-xs text-center px-1"
                                value={labelPrintQty}
                                onChange={(e) => setLabelPrintQty(Math.max(1, parseInt(e.target.value) || 1))}
                              />
                            </div>
                            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => {
                              const li = convertToDirectImageUrl(idea.amazonListing?.fnskuLabelFileUrl || "") || idea.amazonListing?.fnskuLabelFileUrl;
                              const w = window.open("", "_blank", "width=600,height=400");
                              if (w) {
                                const imgs = Array(labelPrintQty).fill(`<img src="${li}" alt="Label" onerror="this.remove()">`).join("");
                                w.document.write('<!DOCTYPE html><html><head><title>Label</title>' +
                                  '<style>' +
                                  '@page{size:5cm 3cm;margin:0}' +
                                  '@media print{html,body{margin:0;padding:0}img{page-break-after:always}}' +
                                  'body{margin:0;padding:0;background:#fff;display:flex;flex-direction:column;align-items:center}' +
                                  'img{display:block;width:5cm;height:3cm;object-fit:contain}' +
                                  '</style></head><body>' + imgs + '<script>' +
                                  'var all=document.querySelectorAll("img"),n=all.length,ok=0;' +
                                  'if(n===0){window.print();window.close()}' +
                                  'all.forEach(function(img){img.onload=function(){ok++;if(ok===n)setTimeout(function(){window.print();window.close()},300)};' +
                                  'img.onerror=function(){img.remove();ok++;if(ok===n)setTimeout(function(){window.print();window.close()},300)}});' +
                                  '<' + '/script></body></html>');
                                w.document.close();
                              }
                            }}>
                              <Printer className="h-3 w-3" /> In
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* GALLERY */}
                <div className="bg-card rounded-lg border shadow-sm p-4">
                  <PhotoGallery
                    platform="amazon"
                    listing={idea.amazonListing}
                    form={amzForm}
                    setEditOpen={setEditOpen}
                    handleUpdateListing={async (data) => {
                      setSaving(true);
                      try {
                        const res = await fetch(`/api/ideas/${id}/amazon-listing`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(data),
                        });
                        if (res.ok) {
                          queryClient.invalidateQueries({ queryKey: ["ideas", id] });
                          router.refresh();
                          fetchIdea();
                        }
                        else toast.error("Lỗi cập nhật ảnh Amazon");
                      } catch {
                        toast.error("Lỗi hệ thống");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    saving={saving}
                    canManagePhotos={!!canManagePhotos}
                    session={session}
                    idea={idea}
                  />
                </div>

                {/* PREMIUM CONTENT */}
                <div className="bg-card rounded-lg border shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Premium Content</h3>
                    {role !== "employee" && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => { setEditSection("premium"); setEditOpen(true); }}>
                        <Pencil className="h-3 w-3 mr-1" /> Sửa
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="group/video rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative flex flex-col justify-center">
                        <span className="text-[10px] text-muted-foreground block mb-1">Video</span>
                        {idea.amazonListing?.videoUrl ? (
                          <a href={idea.amazonListing.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline line-clamp-1 break-all"><ExternalLink className="h-3 w-3 shrink-0" /> <span className="truncate">{idea.amazonListing.videoUrl}</span></a>
                        ) : <p className="text-xs text-muted-foreground">—</p>}
                        {idea.amazonListing?.videoUrl && <CopyButton text={idea.amazonListing.videoUrl} className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/video:opacity-100 transition-opacity bg-background" />}
                      </div>

                      <div className="group/aplus rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative flex flex-col justify-center">
                        <span className="text-[10px] text-muted-foreground block mb-1">Content A+</span>
                        {idea.amazonListing?.contentAPlusUrl ? (
                          <a href={idea.amazonListing.contentAPlusUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline line-clamp-1 break-all"><ExternalLink className="h-3 w-3 shrink-0" /> <span className="truncate">{idea.amazonListing.contentAPlusUrl}</span></a>
                        ) : <p className="text-xs text-muted-foreground">—</p>}
                        {idea.amazonListing?.contentAPlusUrl && <CopyButton text={idea.amazonListing.contentAPlusUrl} className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/aplus:opacity-100 transition-opacity bg-background" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── RIGHT COLUMN: CONTENT ─── */}
              <div className="bg-card rounded-lg border shadow-sm p-4 space-y-3 lg:col-span-3 h-fit">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Content</h3>
                    {listing?.contentSource === "ai" && (
                      listing?.contentVerifiedAt ? (
                        <Badge className="text-[9px] h-4 px-1.5 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          AI • Đã duyệt
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800 gap-1 animate-pulse">
                          <Sparkles className="h-3 w-3" />
                          AI Generated
                        </Badge>
                      )
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {listing?.contentSource === "ai" && (role === "manager" || role === "boss") && (
                      <Button
                        size="sm"
                        variant={listing?.contentVerifiedAt ? "outline" : "default"}
                        className={listing?.contentVerifiedAt
                          ? "h-6 text-[10px] px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                          : "h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        }
                        onClick={handleVerifyContent}
                        disabled={verifying || saving}
                        type="button"
                      >
                        {verifying ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-3 w-3 mr-1" />
                        )}
                        {listing?.contentVerifiedAt ? "Bỏ duyệt" : "Duyệt nội dung"}
                      </Button>
                    )}
                    {(role === "manager" || role === "boss" ? idea.status !== "rejected" : idea.status === "approved") && (
                      <AIGenerateButton
                        isGenerating={isAiBusy}
                        disabled={saving}
                        onClick={handleGenerateAiListing}
                      />
                    )}
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => { setEditSection("content"); setEditOpen(true); }} type="button">
                      <Pencil className="h-3 w-3 mr-1" /> Sửa
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="group/iname flex flex-col justify-center rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative">
                    <div className="flex items-center gap-2 mb-1"><span className="text-xs font-semibold text-muted-foreground block">Title (Item Name)</span><Badge variant="outline" className="text-[9px] font-mono font-medium h-4 px-1.5 border-primary/20 bg-primary/5 text-primary/70">{(idea.amazonListing?.itemName || "").length}/75</Badge></div>
                    <span className="text-xs font-medium pr-6">{idea.amazonListing?.itemName || "—"}</span>
                    {idea.amazonListing?.itemName && <CopyButton text={idea.amazonListing.itemName} className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/iname:opacity-100 transition-opacity bg-background" />}
                  </div>

                  <div className="group/ihigh flex flex-col justify-center rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative">
                    <div className="flex items-center gap-2 mb-1"><span className="text-xs font-semibold text-muted-foreground block">Item Highlights</span><Badge variant="outline" className="text-[9px] font-mono font-medium h-4 px-1.5 border-primary/20 bg-primary/5 text-primary/70">{(idea.amazonListing?.itemHighlights || "").length}/125</Badge></div>
                    <span className="text-xs font-medium pr-6">{idea.amazonListing?.itemHighlights || "—"}</span>
                    {idea.amazonListing?.itemHighlights && <CopyButton text={idea.amazonListing.itemHighlights} className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/ihigh:opacity-100 transition-opacity bg-background" />}
                  </div>
                </div>

                <div className="group/idesc flex flex-col rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative">
                  <div className="flex items-center gap-2 mb-1.5"><span className="text-xs font-semibold text-muted-foreground block">Description</span><Badge variant="outline" className="text-[9px] font-mono font-medium h-4 px-1.5 border-primary/20 bg-primary/5 text-primary/70">{(idea.amazonListing?.description || "").length}/2000</Badge></div>
                  <div className="text-xs font-medium whitespace-pre-wrap pr-6">
                    {idea.amazonListing?.description || "—"}
                  </div>
                  {idea.amazonListing?.description && <CopyButton text={idea.amazonListing.description} className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/idesc:opacity-100 transition-opacity bg-background" />}
                </div>

                <div className="flex flex-col rounded-md bg-muted/40 px-3 py-2 border border-transparent transition-colors relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground block">Bullet Points</span>
                      <Badge variant="outline" className="text-[9px] font-mono font-medium h-4 px-1.5 border-primary/20 bg-primary/5 text-primary/70">{(() => { try { const bps = JSON.parse(idea.amazonListing?.bulletPoints || "[]").filter(Boolean); return `${bps.length}/5 bullets`; } catch { return "0/5 bullets"; } })()}</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="h-5 text-[9px] px-2 py-0" onClick={() => { try { const bps = JSON.parse(idea.amazonListing?.bulletPoints || "[]").filter(Boolean); if (bps.length > 0) { navigator.clipboard.writeText(bps.join("\n")); toast.success("Đã copy toàn bộ Bullets"); } } catch { } }}><Copy className="h-3 w-3 mr-1" /> Copy tất cả</Button>
                  </div>
                  {(() => {
                    try {
                      const bps = JSON.parse(idea.amazonListing?.bulletPoints || "[]").filter(Boolean);
                      if (bps.length === 0) return <p className="text-xs text-muted-foreground">—</p>;
                      return (
                        <div className="space-y-1.5 mt-1">
                          {bps.map((bp: string, i: number) => (
                            <div key={i} className="group/bp rounded-md bg-background/50 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 pr-12">
                                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                                <p className="text-xs leading-relaxed">{bp}</p>
                              </div>
                              <Badge variant="outline" className="text-[9px] font-mono font-medium h-4 px-1.5 border-primary/20 bg-primary/5 text-primary/70 shrink-0">
                                {bp.length}/255
                              </Badge>
                              <CopyButton text={bp} className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/bp:opacity-100 transition-opacity bg-background" />
                            </div>
                          ))}
                        </div>
                      );
                    } catch { return <p className="text-xs text-muted-foreground">—</p>; }
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="group/itags flex flex-col rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative">
                    <div className="flex items-center gap-2 mb-1.5 shrink-0"><span className="text-xs font-semibold text-muted-foreground block">Tags</span><Badge variant="outline" className="text-[9px] font-mono font-medium h-4 px-1.5 border-primary/20 bg-primary/5 text-primary/70">{(() => { let raw = idea.amazonListing?.tags || ""; try { if (raw.trim().startsWith("[")) raw = JSON.parse(raw).join("; "); } catch {} return `${raw.length}/500`; })()}</Badge></div>
                    {(() => {
                      let tags: string[] = [];
                      const rawTags = idea.amazonListing?.tags || "";
                      try {
                        if (rawTags.trim().startsWith("[")) {
                          tags = JSON.parse(rawTags).filter(Boolean);
                        } else {
                          tags = rawTags.split(";").filter(Boolean);
                        }
                      } catch (e) {
                        tags = rawTags.split(";").filter(Boolean);
                      }
                      if (!Array.isArray(tags)) tags = [];
                      if (tags.length === 0) return <p className="text-xs text-muted-foreground">—</p>;
                      return (
                        <div className="flex flex-wrap gap-1 pr-6 content-start">
                          {tags.map((t: string, i: number) => (
                            <div key={i} className="relative group/tag flex items-center hover:z-[60]">
                              <Badge variant="secondary" className="text-xs py-1 px-2.5 font-normal cursor-default shrink-0">
                                {t.trim()}
                              </Badge>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1.5 opacity-0 invisible group-hover/tag:opacity-100 group-hover/tag:visible transition-all duration-200 z-[60] flex flex-col items-center select-none">
                                <div className="flex flex-col bg-popover border border-border shadow-md p-1 rounded-md">
                                  <a title="Search on Amazon" href={`https://www.amazon.com/s?k=${encodeURIComponent(t.trim())}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted px-2 py-1.5 rounded transition-colors whitespace-nowrap">
                                    <ExternalLink className="h-3 w-3 text-blue-500" />
                                    Tìm trên Amazon
                                  </a>
                                  <a title="Search on Etsy" href={`https://www.etsy.com/search?q=${encodeURIComponent(t.trim())}&ref=search_bar&instant_download=false`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted px-2 py-1.5 rounded transition-colors whitespace-nowrap">
                                    <ShoppingBag className="h-3 w-3 text-orange-500" />
                                    Tìm trên Etsy
                                  </a>
                                  <button type="button" onClick={() => { navigator.clipboard.writeText(t.trim()); toast.success("Đã copy tag!"); }} className="flex items-center gap-2 text-[10px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted px-2 py-1.5 rounded transition-colors whitespace-nowrap w-full text-left">
                                    <Copy className="h-3 w-3 text-green-500" />
                                    Copy tag này
                                  </button>
                                </div>
                                <div className="w-2 h-2 bg-popover border-r border-b border-border rotate-45 -mt-[5px] z-[-1]" />
                              </div>
                            </div>
                          ))}
                          <CopyButton text={tags.join("\n")} className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/itags:opacity-100 transition-opacity bg-background" />
                        </div>
                      );
                    })()}
                  </div>
                  <div className="group/islug flex flex-col rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative">
                    <div className="flex items-center gap-2 mb-1.5 shrink-0"><span className="text-xs font-semibold text-muted-foreground block">Slugs</span><Badge variant="outline" className="text-[9px] font-mono font-medium h-4 px-1.5 border-primary/20 bg-primary/5 text-primary/70">{(() => { let raw = idea.amazonListing?.slugs || ""; try { if (raw.trim().startsWith("[")) raw = JSON.parse(raw).join("\n"); } catch {} return `${raw.split("\n").filter(Boolean).length}/12`; })()}</Badge></div>
                    {(() => {
                      let slugs: string[] = [];
                      const rawSlugs = idea.amazonListing?.slugs || "";
                      try {
                        if (rawSlugs.trim().startsWith("[")) {
                          const parsed = JSON.parse(rawSlugs);
                          if (Array.isArray(parsed)) {
                            slugs = parsed.join("\n").split("\n").map((s: string) => s.trim()).filter(Boolean);
                          } else {
                            slugs = rawSlugs.split("\n").map((s: string) => s.trim()).filter(Boolean);
                          }
                        } else {
                          slugs = rawSlugs.split("\n").map((s: string) => s.trim()).filter(Boolean);
                        }
                      } catch (e) {
                        slugs = rawSlugs.split("\n").map((s: string) => s.trim()).filter(Boolean);
                      }

                      if (!Array.isArray(slugs)) slugs = [];
                      if (slugs.length === 0) return <p className="text-xs text-muted-foreground">—</p>;
                      return (
                        <div className="flex flex-col gap-1 pr-6">
                          {slugs.map((s: string, i: number) => (
                            <div key={i} className="relative group/s flex items-center">
                              <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded truncate w-full">{s}</code>
                              <CopyButton text={s} className="absolute right-1 opacity-0 group-hover/s:opacity-100 transition-opacity h-4 w-4 bg-muted" />
                            </div>
                          ))}
                          <CopyButton text={slugs.join("\n")} className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/islug:opacity-100 transition-opacity bg-background" />
                        </div>
                      );
                    })()}
                  </div>
                </div>

              </div>
            </div>
          </div>


          {/* ─── Etsy Tab ─── */}

        </fieldset>
        <AmazonEditSheet
          ideaId={idea.id}
          msku={idea.msku}
          initialData={listing}
          sellingAccounts={sellingAccounts}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={fetchIdea}
          section={editSection}
        />
      </TabsContent>
    </>
  );
}
