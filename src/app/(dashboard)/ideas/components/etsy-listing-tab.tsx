"use client";
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PhotoGallery } from "./photo-gallery";
import { ExternalLink, Pencil, Printer, Download, Copy, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/copy-button";
import { convertToDirectImageUrl } from "@/lib/google-drive";

import { EtsyEditSheet } from "./etsy-edit-sheet";

function statusBadge(status: string, labels: Record<string, string>) {
  return (
    <Badge variant="outline" className={(({} as any))[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

export interface EtsyListingTabProps {
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

export function EtsyListingTab({
  idea,
  sellingAccounts,
  isNotApproved,
  isPartner,
  NEXT_STATUS,
  listingStatusLabels,
  saving,
  handleListingStatusChange,
  fetchIdea,
  role,
  session,
  canManagePhotos,
}: EtsyListingTabProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const listing = idea.etsyListing;
  const id = idea.id;
  const setSaving = (val: boolean) => {};
  const etsyForm = idea.etsyListing || {};
  
  const amazonGalleryImages = (() => {
    try {
      if (typeof idea.amazonListing?.galleryImages === "string") {
        return JSON.parse(idea.amazonListing.galleryImages).filter(Boolean);
      }
      return (idea.amazonListing?.galleryImages || []).filter(Boolean);
    } catch {
      return [];
    }
  })();

  return (
    <>
      <TabsContent value="etsy" className="mt-0 space-y-3 data-[state=inactive]:hidden pr-1 relative">
                    <fieldset disabled={isNotApproved && !isPartner} className="space-y-3">
                      <Card>
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-sm">Etsy Listing</CardTitle>
                          <div className="flex items-center gap-1">
                            {role !== "employee" && (
                              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => setEditOpen(true)}>
                                <Pencil className="h-3 w-3 mr-1" /> Sửa
                              </Button>
                            )}
                            {idea.etsyListing && (() => { try { const g = typeof idea.etsyListing.galleryImages === "string" ? JSON.parse(idea.etsyListing.galleryImages) : (idea.etsyListing.galleryImages || []); if (g.filter(Boolean).length > 0) return <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { g.filter(Boolean).forEach((url: string) => window.open(convertToDirectImageUrl(url) || url, "_blank")); }}><Download className="h-3 w-3 mr-1" /> Tải {g.filter(Boolean).length} ảnh</Button>; } catch { } return null; })()}
                            
                          </div>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                          <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                            <div className="group/etitle col-span-2 flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5">
                              <div className="min-w-0 flex-1"><span className="text-[10px] text-muted-foreground block">Title</span><span className="text-xs font-medium truncate block">{idea.etsyListing?.title || "—"}</span></div>
                              {idea.etsyListing?.title && <CopyButton text={idea.etsyListing.title} className="h-4 w-4 opacity-0 group-hover/etitle:opacity-100 transition-opacity shrink-0" />}
                            </div>
                            <div className="rounded-md bg-muted/40 px-2.5 py-1.5">
                              <span className="text-[10px] text-muted-foreground block">Giá</span><span className="text-xs font-medium">${idea.etsyListing?.price || "—"}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                            <div className="group/elid rounded-md bg-muted/40 px-2.5 py-1.5">
                              <div className="flex items-center justify-between">
                                <div><span className="text-[10px] text-muted-foreground block">Listing ID</span><span className="text-xs font-mono font-medium">{idea.etsyListing?.listingId || "—"}</span></div>
                                {idea.etsyListing?.listingId && <CopyButton text={idea.etsyListing.listingId} className="h-4 w-4 opacity-0 group-hover/elid:opacity-100 transition-opacity" />}
                              </div>
                            </div>
                            <div className="rounded-md bg-muted/40 px-2.5 py-1.5">
                              <span className="text-[10px] text-muted-foreground block">Status</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {statusBadge(idea.etsyListing?.listingStatus || "ready", listingStatusLabels)}
                                {((NEXT_STATUS as any)[idea.etsyListing?.listingStatus || "ready"] || []).map((opt: any) => (
                                  <Button key={opt.next} size="sm" className={`h-6 text-[10px] text-white ${opt.className}`}
                                    onClick={() => handleListingStatusChange("etsy", opt.next)} disabled={saving}>{opt.label}</Button>
                                ))}
                              </div>
                            </div>
                          </div>
                          {(idea.etsyListing?.listingStatus === "error" || idea.etsyListing?.listingStatus === "delisted") && idea.etsyListing?.listingStatusReason && (
                            <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-2.5 py-1.5">
                              <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">Lý do {idea.etsyListing.listingStatus === "error" ? "lỗi" : "bị gỡ"}:</span>
                              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{idea.etsyListing.listingStatusReason}</p>
                            </div>
                          )}
                          {idea.etsyListing && (() => { const t = typeof idea.etsyListing.tags === "string" ? JSON.parse(idea.etsyListing.tags) : (idea.etsyListing.tags || []); if (!t.length) return <div className="rounded-md bg-muted/40 px-2.5 py-1.5"><span className="text-[10px] text-muted-foreground block">Tags</span><p className="text-xs text-muted-foreground mt-0.5">—</p></div>; return <div className="rounded-md bg-muted/40 px-2.5 py-1.5"><span className="text-[10px] text-muted-foreground block">Tags ({t.length}) <CopyButton text={t.join(", ")} className="h-4 w-4 inline" /></span><div className="flex items-center gap-1 flex-wrap mt-0.5">{t.map((tag: string, i: number) => <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>)}</div></div>; })()}
                          <div className="rounded-md bg-muted/40 px-2.5 py-1.5">
                            <span className="text-[10px] text-muted-foreground block">Gallery{idea.etsyListing?.useSharedGallery ? " (Dùng chung Amazon)" : ""}</span>
                            {(() => { try { const g = typeof idea.etsyListing?.galleryImages === "string" ? JSON.parse(idea.etsyListing.galleryImages) : (idea.etsyListing?.galleryImages || []); const imgs = g.filter(Boolean); if (imgs.length === 0) return <p className="text-xs text-muted-foreground mt-0.5">—</p>; return <><span className="text-[10px] text-muted-foreground">({imgs.length} ảnh)</span><div className="flex gap-1 flex-wrap mt-0.5">{imgs.slice(0, 6).map((url: string, i: number) => { const directUrl = convertToDirectImageUrl(url) || url; return <Dialog key={i}><DialogTrigger asChild><div className="w-8 h-8 rounded border overflow-hidden bg-muted cursor-pointer hover:ring-1 hover:ring-primary/50"><img src={directUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /></div></DialogTrigger><DialogContent className="max-w-[90vw] sm:max-w-[90vw] w-fit bg-transparent border-none shadow-none !ring-0 p-0" showCloseButton={false}><img src={directUrl} alt="" className="max-h-[80vh] max-w-[90vw] rounded-md object-contain" /></DialogContent></Dialog>; })}{imgs.length > 6 && <span className="text-[10px] text-muted-foreground self-center">+{imgs.length - 6}</span>}</div></>; } catch { return <p className="text-xs text-muted-foreground mt-0.5">—</p>; } })()}
                          </div>
                          <div className="rounded-md bg-muted/40 px-2.5 py-1.5">
                            <span className="text-[10px] text-muted-foreground block">Video URL{idea.etsyListing?.useAmazonVideo ? " (dùng chung Amazon)" : ""}</span>
                            {idea.etsyListing?.videoUrl ? (
                              <a href={idea.etsyListing.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-0.5"><ExternalLink className="h-3 w-3" /> Xem video</a>
                            ) : <p className="text-xs text-muted-foreground mt-0.5">—</p>}
                          </div>
                          <div className="group/edesc rounded-md bg-muted/40 px-2.5 py-1.5">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] text-muted-foreground">Mô tả</span>
                              {idea.etsyListing?.description && <CopyButton text={idea.etsyListing.description} className="h-4 w-4 opacity-0 group-hover/edesc:opacity-100 transition-opacity" />}
                            </div>
                            <p className="text-xs whitespace-pre-wrap line-clamp-3 text-muted-foreground">{idea.etsyListing?.description || "—"}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <div className="bg-card rounded-lg border shadow-sm p-4">
                        <PhotoGallery
                          platform="etsy"
                          listing={idea.etsyListing}
                          form={etsyForm}
                          setEditOpen={setEditOpen}
                          handleUpdateListing={async (data) => {
                            setPhotoSaving(true);
                            try {
                              const res = await fetch(`/api/ideas/${id}/etsy-listing`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(data),
                              });
                              if (res.ok) {
                                queryClient.invalidateQueries({ queryKey: ["ideas", id] });
                                router.refresh();
                                fetchIdea();
                              }
                              else toast.error("Lỗi cập nhật ảnh Etsy");
                            } catch {
                              toast.error("Lỗi hệ thống");
                            } finally {
                              setPhotoSaving(false);
                            }
                          }}
                          saving={saving || photoSaving}
                          canManagePhotos={!!canManagePhotos}
                          session={session}
                          idea={idea}
                        />
                      </div>
      </fieldset>
      <EtsyEditSheet
        ideaId={idea.id}
        msku={idea.msku}
        initialData={listing}
        amazonGalleryImages={amazonGalleryImages}
        sellingAccounts={sellingAccounts}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={fetchIdea}
      />
    </TabsContent>
    </>
  );
}
