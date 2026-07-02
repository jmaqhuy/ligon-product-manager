"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton } from "@/components/copy-button";
import { Loader2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { listingStatusLabels } from "@/types";

interface AmazonEditSheetProps {
  ideaId: string;
  msku: string;
  initialData: any;
  sellingAccounts: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  section?: "all" | "info" | "premium" | "content";
}

export function AmazonEditSheet({
  ideaId,
  msku,
  initialData,
  sellingAccounts,
  open,
  onOpenChange,
  onSuccess,
  section = "all",
}: AmazonEditSheetProps) {
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState({
    sellingAccountId: "", asin: "", fnskuCode: "", fnskuLabelFileUrl: "",
    itemName: "", itemHighlights: "", bulletPoints: ["", "", "", "", ""],
    description: "", tags: "", slugs: "", price: "", useSharedMainImage: true,
    galleryImages: [""], videoUrl: "", contentAPlusUrl: "",
    listingStatus: "ready", listingStatusReason: "", vineStatus: "not_enrolled",
    photosUploaded: false, sku: "", campAuto: false,
  });

  useEffect(() => {
    if (open) {
      const data = initialData || {};
      setForm({
        sellingAccountId: data.sellingAccountId || "",
        asin: data.asin || "",
        fnskuCode: data.fnskuCode || "",
        fnskuLabelFileUrl: data.fnskuLabelFileUrl || "",
        itemName: data.itemName || "",
        itemHighlights: data.itemHighlights || "",
        bulletPoints: (() => {
          try {
            const p = JSON.parse(data.bulletPoints || "[]");
            return [...p, "", "", "", "", ""].slice(0, 5);
          } catch {
            return ["", "", "", "", ""];
          }
        })(),
        description: data.description || "",
        tags: (() => {
          if (!data.tags) return "";
          try {
             // In case it was saved as JSON array string
             const parsed = JSON.parse(data.tags);
             if (Array.isArray(parsed)) return parsed.join("; ");
          } catch {}
          return data.tags;
        })(),
        slugs: (() => {
          if (!data.slugs) return "";
          try {
             const parsed = JSON.parse(data.slugs);
             if (Array.isArray(parsed)) return parsed.join("\\n");
          } catch {}
          return data.slugs;
        })(),
        price: data.price ? String(data.price) : "",
        useSharedMainImage: data.useSharedMainImage ?? true,
        galleryImages: (() => {
          try {
            const g = JSON.parse(data.galleryImages || "[]");
            return g.length ? g : [""];
          } catch {
            return [""];
          }
        })(),
        videoUrl: data.videoUrl || "",
        contentAPlusUrl: data.contentAPlusUrl || "",
        listingStatus: data.listingStatus || "ready",
        listingStatusReason: data.listingStatusReason || "",
        vineStatus: data.vineStatus || "not_enrolled",
        photosUploaded: data.photosUploaded ?? false,
        sku: data.sku || "",
        campAuto: data.campAuto || false,
      });
    }
  }, [open, initialData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let autoStatus = form.listingStatus;
      if (autoStatus === "not_ready") {
        const validBullets = form.bulletPoints.filter((b) => b.trim());
        const validGallery = form.galleryImages.filter((g) => g.trim());
        if (
          form.itemName?.trim() && form.itemHighlights?.trim() &&
          form.description?.trim() && form.tags?.trim() && form.slugs?.trim() &&
          validBullets.length >= 5 && (form.useSharedMainImage || validGallery.length >= 9) &&
          form.sellingAccountId
        ) {
          autoStatus = "ready";
        }
      }

      // Convert tags & slugs to JSON array for backend storage
      const tagsArray = form.tags.split(";").map(t => t.trim()).filter(Boolean);
      const slugsArray = form.slugs.split("\\n").map(s => s.trim()).filter(Boolean);

      let payload: Record<string, any> = {};
      if (section === "info") {
        payload = {
          sellingAccountId: form.sellingAccountId,
          price: form.price,
          sku: form.sku,
          asin: form.asin,
          fnskuCode: form.fnskuCode,
          fnskuLabelFileUrl: form.fnskuLabelFileUrl,
          listingStatus: autoStatus,
          listingStatusReason: form.listingStatusReason,
          vineStatus: form.vineStatus,
          campAuto: form.campAuto,
        };
      } else if (section === "premium") {
        payload = {
          videoUrl: form.videoUrl,
          contentAPlusUrl: form.contentAPlusUrl,
        };
      } else if (section === "content") {
        payload = {
          itemName: form.itemName,
          itemHighlights: form.itemHighlights,
          description: form.description,
          bulletPoints: form.bulletPoints.filter((b) => b.trim()),
          tags: JSON.stringify(tagsArray),
          slugs: JSON.stringify(slugsArray),
          useSharedMainImage: form.useSharedMainImage,
          galleryImages: form.galleryImages.filter((g) => g.trim()),
        };
      } else {
        payload = {
          ...form,
          listingStatus: autoStatus,
          bulletPoints: form.bulletPoints.filter((b) => b.trim()),
          galleryImages: form.galleryImages.filter((g) => g.trim()),
          tags: JSON.stringify(tagsArray),
          slugs: JSON.stringify(slugsArray),
        };
      }

      const res = await fetch(`/api/ideas/${ideaId}/amazon-listing`, {
        method: section === "all" ? "PUT" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Đã lưu Amazon Listing!");
        onSuccess();
        queryClient.invalidateQueries({ queryKey: ["ideas", ideaId] });
        router.refresh();
        onOpenChange(false);
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi lưu Amazon Listing");
      }
    } catch (err) {
      toast.error("Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(92vw,1000px)] sm:max-w-[1000px] p-6 flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle>
            {section === "info" ? "Sửa Information & Advertising - Amazon Listing" :
             section === "premium" ? "Sửa Premium Content - Amazon Listing" :
             section === "content" ? "Sửa Content - Amazon Listing" :
             "Sửa Amazon Listing"}
          </SheetTitle>
          <SheetDescription>{msku}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-4 pr-1">
          <div className="space-y-3">
            {(section === "all" || section === "info") && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tài khoản</Label>
                    <Select value={form.sellingAccountId} onValueChange={v => setForm({ ...form, sellingAccountId: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn..." /></SelectTrigger>
                      <SelectContent>
                        {sellingAccounts.filter((a) => a.platform === "amazon" && a.status === "active").map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Giá ($)</Label>
                    <Input className="h-8 text-xs" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">SKU</Label>
                    <Input className="h-8 text-xs" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ASIN</Label>
                    <Input className="h-8 text-xs" value={form.asin} onChange={e => setForm({ ...form, asin: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">FNSKU Code</Label>
                    <Input className="h-8 text-xs" value={form.fnskuCode} onChange={e => setForm({ ...form, fnskuCode: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">FNSKU Label URL (Ảnh)</Label>
                    <Input className="h-8 text-xs" value={form.fnskuLabelFileUrl} onChange={e => setForm({ ...form, fnskuLabelFileUrl: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={form.listingStatus} onValueChange={v => setForm({ ...form, listingStatus: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(listingStatusLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v as string}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Vine Status</Label>
                    <Select value={form.vineStatus} onValueChange={v => setForm({ ...form, vineStatus: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_enrolled">Not Enrolled</SelectItem>
                        <SelectItem value="enrolled">Enrolled</SelectItem>
                        <SelectItem value="reviewing">Reviewing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(form.listingStatus === "error" || form.listingStatus === "delisted") && (
                  <div className="space-y-1">
                    <Label className="text-xs">Lý do {form.listingStatus === "error" ? "lỗi" : "bị gỡ"}</Label>
                    <Input className="h-8 text-xs" value={form.listingStatusReason} onChange={e => setForm({ ...form, listingStatusReason: e.target.value })} placeholder={form.listingStatus === "error" ? "Mô tả lỗi..." : "Lý do sàn gỡ..."} />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Checkbox id="amz-auto-camp" checked={form.campAuto} onCheckedChange={v => setForm({ ...form, campAuto: !!v })} />
                  <Label htmlFor="amz-auto-camp" className="text-[10px] cursor-pointer">Auto Campaign</Label>
                </div>
              </div>
            )}

            {(section === "all" || section === "content") && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2"><Label className="text-xs">Title (Item Name)</Label><CopyButton text={form.itemName} className="h-5 w-5" /></div>
                  <Input className="h-8 text-xs" value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} />
                  <p className="text-[10px] text-muted-foreground">{form.itemName.length}/75 ký tự</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2"><Label className="text-xs">Item Highlights</Label><CopyButton text={form.itemHighlights} className="h-5 w-5" /></div>
                  <Input className="h-8 text-xs" value={form.itemHighlights} onChange={e => setForm({ ...form, itemHighlights: e.target.value })} />
                  <p className="text-[10px] text-muted-foreground">{form.itemHighlights.length}/125 ký tự</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2"><Label className="text-xs">Mô tả (Description)</Label><CopyButton text={form.description} className="h-5 w-5" /></div>
                  <Textarea className="text-xs resize-none" rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  <p className="text-[10px] text-muted-foreground">{form.description.length} ký tự (Khuyên dùng: 500-2000)</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2"><Label className="text-xs">Bullet Points (5 dòng)</Label><CopyButton text={form.bulletPoints.join("\\n")} className="h-5 w-5" /></div>
                  {form.bulletPoints.map((bp, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <Input className="h-7 text-xs flex-1" value={bp} onChange={e => { const n = [...form.bulletPoints]; n[i] = e.target.value; setForm({ ...form, bulletPoints: n }); }} placeholder={`Bullet ${i + 1}`} />
                      <p className="text-[10px] text-muted-foreground text-right">{bp.length}/255 ký tự</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2"><Label className="text-xs">Tags (ngăn cách bằng dấu ; )</Label><CopyButton text={form.tags} className="h-5 w-5" /></div>
                  <Textarea className="text-xs resize-none" rows={3} value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="tag1; tag2; tag3..." />
                  <p className="text-[10px] text-muted-foreground">{form.tags.length}/500 ký tự</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2"><Label className="text-xs">Slugs (mỗi dòng 1 slug)</Label><CopyButton text={form.slugs} className="h-5 w-5" /></div>
                  <Textarea className="text-xs resize-none" rows={3} value={form.slugs} onChange={e => setForm({ ...form, slugs: e.target.value })} placeholder="slug1\\nslug2\\nslug3..." />
                  <p className="text-[10px] text-muted-foreground">{form.slugs.split("\\n").filter(Boolean).length}/12 slugs</p>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="amz-shared-main" checked={form.useSharedMainImage} onCheckedChange={v => setForm({ ...form, useSharedMainImage: !!v })} />
                    <Label htmlFor="amz-shared-main" className="text-[10px] cursor-pointer">Dùng ảnh main chung</Label>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Gallery ({form.galleryImages.filter(Boolean).length} ảnh)</Label>
                    {form.galleryImages.map((url, i) => (
                      <div key={i} className="flex gap-1">
                        <Input className="h-7 text-xs flex-1" value={url} onChange={e => { const n = [...form.galleryImages]; n[i] = e.target.value; setForm({ ...form, galleryImages: n }); }} placeholder={`Ảnh ${i + 1}`} />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setForm({ ...form, galleryImages: form.galleryImages.filter((_, j) => j !== i) })}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setForm({ ...form, galleryImages: [...form.galleryImages, ""] })}>
                      <Plus className="h-3 w-3 mr-1" /> Thêm ảnh
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {(section === "all" || section === "premium") && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs">Video URL</Label>
                  <Input className="h-8 text-xs" value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">A+ Content URL</Label>
                  <Input className="h-8 text-xs" value={form.contentAPlusUrl} onChange={e => setForm({ ...form, contentAPlusUrl: e.target.value })} />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 pb-4">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Huỷ</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Lưu
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
