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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton } from "@/components/copy-button";
import { Loader2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { listingStatusLabels } from "@/types";

interface EtsyEditSheetProps {
  ideaId: string;
  msku: string;
  initialData: any;
  amazonGalleryImages?: string[];
  sellingAccounts: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EtsyEditSheet({
  ideaId,
  msku,
  initialData,
  amazonGalleryImages = [],
  sellingAccounts,
  open,
  onOpenChange,
  onSuccess,
}: EtsyEditSheetProps) {
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState({
    sellingAccountId: "", title: "", listingId: "", tags: [] as string[],
    tagsInput: "", description: "", price: "", useSharedMainImage: true,
    galleryImages: [""], useSharedGallery: false, videoUrl: "",
    useAmazonVideo: false, listingStatus: "ready", listingStatusReason: "",
  });

  useEffect(() => {
    if (open) {
      const data = initialData || {};
      const parsedTags = (() => {
        if (!data.tags) return [];
        try {
          const parsed = JSON.parse(data.tags);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
        return [];
      })();

      setForm({
        sellingAccountId: data.sellingAccountId || "",
        title: data.title || "",
        listingId: data.listingId || "",
        tags: parsedTags,
        tagsInput: "",
        description: data.description || "",
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
        useSharedGallery: data.useSharedGallery ?? false,
        videoUrl: data.videoUrl || "",
        useAmazonVideo: data.useAmazonVideo ?? false,
        listingStatus: data.listingStatus || "ready",
        listingStatusReason: data.listingStatusReason || "",
      });
    }
  }, [open, initialData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let autoStatus = form.listingStatus;
      if (autoStatus === "not_ready") {
        const validGallery = form.galleryImages.filter((g) => g.trim());
        if (
          form.title?.trim() && form.description?.trim() &&
          form.tags?.length > 0 && form.sellingAccountId &&
          (form.useSharedGallery || validGallery.length >= 9)
        ) {
          autoStatus = "ready";
        }
      }

      const payload = {
        ...form,
        listingStatus: autoStatus,
        galleryImages: form.galleryImages.filter((g) => g.trim()),
        tags: form.tags, // Send as JSON array to backend
      };

      const res = await fetch(`/api/ideas/${ideaId}/etsy-listing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Đã lưu Etsy Listing!");
        onSuccess();
        queryClient.invalidateQueries({ queryKey: ["ideas", ideaId] });
        router.refresh();
        onOpenChange(false);
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi lưu Etsy Listing");
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
          <SheetTitle>Sửa Etsy Listing</SheetTitle>
          <SheetDescription>{msku}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-4 pr-1">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tài khoản</Label>
                <Select value={form.sellingAccountId} onValueChange={v => setForm({ ...form, sellingAccountId: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn..." /></SelectTrigger>
                  <SelectContent>
                    {sellingAccounts.filter((a) => a.platform === "etsy" && a.status === "active").map((a) => (
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
                <Label className="text-xs">Title</Label>
                <Input className="h-8 text-xs" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Listing ID</Label>
                <Input className="h-8 text-xs" value={form.listingId} onChange={e => setForm({ ...form, listingId: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Mô tả</Label>
              <Textarea className="text-xs resize-none" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Tags (tối đa 13, mỗi tag ≤20 ký tự)</Label>
                <CopyButton text={form.tags.join("; ")} className="h-5 w-5" />
              </div>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {form.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 text-[10px]">
                    {tag}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, tags: form.tags.filter((_, j) => j !== i) })}
                      className="hover:text-destructive ml-0.5"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              {form.tags.length < 13 && (
                <Input
                  className="h-7 text-xs"
                  value={form.tagsInput}
                  onChange={e => setForm({ ...form, tagsInput: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === "," || e.key === ";") {
                      e.preventDefault();
                      const val = form.tagsInput.trim().slice(0, 20);
                      if (val && !form.tags.includes(val)) {
                        setForm({ ...form, tags: [...form.tags, val], tagsInput: "" });
                      }
                    }
                  }}
                  placeholder="Nhập tag rồi Enter..."
                />
              )}
              <p className="text-[10px] text-muted-foreground">{form.tags.length}/13 tags</p>
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
                <Label className="text-xs">Video URL</Label>
                <Input className="h-8 text-xs" value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} />
              </div>
            </div>

            {(form.listingStatus === "error" || form.listingStatus === "delisted") && (
              <div className="space-y-1">
                <Label className="text-xs">Lý do {form.listingStatus === "error" ? "lỗi" : "bị gỡ"}</Label>
                <Input className="h-8 text-xs" value={form.listingStatusReason} onChange={e => setForm({ ...form, listingStatusReason: e.target.value })} placeholder={form.listingStatus === "error" ? "Mô tả lỗi..." : "Lý do sàn gỡ..."} />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="etsy-shared-gallery" checked={form.useSharedGallery} onCheckedChange={v => setForm({ ...form, useSharedGallery: !!v })} />
                <Label htmlFor="etsy-shared-gallery" className="text-[10px] cursor-pointer">Dùng chung gallery Amazon</Label>
              </div>

              {form.useSharedGallery ? (
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Ảnh từ Amazon (dùng chung)</Label>
                  {amazonGalleryImages.length > 0 ? (
                    amazonGalleryImages.map((img, i) => <Input key={i} className="h-7 text-xs text-muted-foreground bg-muted" value={img} readOnly />)
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic">Chưa có ảnh Amazon</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Checkbox id="etsy-shared-main" checked={form.useSharedMainImage} onCheckedChange={v => setForm({ ...form, useSharedMainImage: !!v })} />
                    <Label htmlFor="etsy-shared-main" className="text-[10px] cursor-pointer">Dùng ảnh main chung</Label>
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
                </>
              )}

              <div className="flex items-center gap-2">
                <Checkbox id="etsy-amz-video" checked={form.useAmazonVideo} onCheckedChange={v => setForm({ ...form, useAmazonVideo: !!v })} />
                <Label htmlFor="etsy-amz-video" className="text-[10px] cursor-pointer">Dùng video Amazon</Label>
              </div>
            </div>

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
