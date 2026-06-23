"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Save,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ideaStatusLabels,
  photoStatusLabels,
  fileStatusLabels,
  listingStatusLabels,
  type IdeaStatus,
  type PhotoStatus,
  type FileStatus,
  type ListingStatus,
} from "@/types";
import type { Role } from "@/lib/permissions";
import { can } from "@/lib/permissions";
import { convertToDirectImageUrl } from "@/lib/google-drive";

// ─── Status badge helpers ───────────────────────────────────────────
function statusBadge(status: string, labels: Record<string, string>) {
  const colors: Record<string, string> = {
    reviewing: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    approved: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
    published: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    not_requested: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
    awaiting_photos: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
    pending_approval: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
    revision_requested: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
    not_started: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
    in_progress: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300",
    pending_review: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
    editing: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300",
    ready_to_publish: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  };
  return (
    <Badge variant="outline" className={colors[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

// ─── Main component ─────────────────────────────────────────────────
export default function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [idea, setIdea] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Amazon listing form state
  const [amzForm, setAmzForm] = useState({
    sellingAccountId: "",
    asin: "",
    fnskuCode: "",
    fnskuLabelFileUrl: "",
    itemName: "",
    itemHighlights: "",
    bulletPoints: ["", "", "", "", ""],
    description: "",
    tags: "",
    slugs: "",
    price: "",
    useSharedMainImage: true,
    galleryImages: [""],
    videoUrl: "",
    contentAPlusUrl: "",
    listingStatus: "pending_review",
  });

  // Etsy listing form state
  const [etsyForm, setEtsyForm] = useState({
    sellingAccountId: "",
    title: "",
    listingId: "",
    tags: [] as string[],
    tagsInput: "",
    description: "",
    price: "",
    useSharedMainImage: true,
    galleryImages: [""],
    useSharedGallery: false,
    videoUrl: "",
    useAmazonVideo: false,
    listingStatus: "pending_review",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sellingAccounts, setSellingAccounts] = useState<any[]>([]);

  const fetchIdea = useCallback(async () => {
    try {
      const res = await fetch(`/api/ideas/${id}`);
      if (!res.ok) {
        toast.error("Không tìm thấy ý tưởng");
        router.push("/ideas");
        return;
      }
      const data = await res.json();
      setIdea(data);

      // Populate Amazon form
      if (data.amazonListing) {
        const a = data.amazonListing;
        setAmzForm({
          sellingAccountId: a.sellingAccountId || "",
          asin: a.asin || "",
          fnskuCode: a.fnskuCode || "",
          fnskuLabelFileUrl: a.fnskuLabelFileUrl || "",
          itemName: a.itemName || "",
          itemHighlights: a.itemHighlights || "",
          bulletPoints: (() => {
            try { const p = JSON.parse(a.bulletPoints || "[]"); return [...p, ...Array(5)].slice(0, 5); } catch { return ["", "", "", "", ""]; }
          })(),
          description: a.description || "",
          tags: a.tags || "",
          slugs: a.slugs || "",
          price: a.price ? String(a.price) : "",
          useSharedMainImage: a.useSharedMainImage ?? true,
          galleryImages: (() => {
            try { const g = JSON.parse(a.galleryImages || "[]"); return g.length ? g : [""]; } catch { return [""]; }
          })(),
          videoUrl: a.videoUrl || "",
          contentAPlusUrl: a.contentAPlusUrl || "",
          listingStatus: a.listingStatus || "pending_review",
        });
      } else {
        // Pre-fill from idea
        setAmzForm((prev) => ({
          ...prev,
          itemName: data.title || "",
          description: data.description || "",
        }));
      }

      // Populate Etsy form
      if (data.etsyListing) {
        const e = data.etsyListing;
        const parsedTags = (() => {
          try { return JSON.parse(e.tags || "[]"); } catch { return []; }
        })();
        setEtsyForm({
          sellingAccountId: e.sellingAccountId || "",
          title: e.title || "",
          listingId: e.listingId || "",
          tags: parsedTags,
          tagsInput: "",
          description: e.description || "",
          price: e.price ? String(e.price) : "",
          useSharedMainImage: e.useSharedMainImage ?? true,
          galleryImages: (() => {
            try { const g = JSON.parse(e.galleryImages || "[]"); return g.length ? g : [""]; } catch { return [""]; }
          })(),
          useSharedGallery: e.useSharedGallery ?? false,
          videoUrl: e.videoUrl || "",
          useAmazonVideo: e.useAmazonVideo ?? false,
          listingStatus: e.listingStatus || "pending_review",
        });
      } else {
        setEtsyForm((prev) => ({
          ...prev,
          title: data.title || "",
          description: data.description || "",
        }));
      }
    } catch {
      toast.error("Lỗi tải ý tưởng");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchIdea();
    fetch("/api/selling-accounts").then((r) => r.json()).then(setSellingAccounts).catch(() => {});
  }, [fetchIdea]);

  // ─── Actions ──────────────────────────────────────────────────────
  const handleApprove = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved", version: idea.version }),
      });
      if (res.ok) {
        toast.success("Đã duyệt ý tưởng!");
        fetchIdea();
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi duyệt ý tưởng");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateIdea = async (fields: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, version: idea.version }),
      });
      if (res.ok) {
        toast.success("Đã cập nhật!");
        fetchIdea();
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi cập nhật");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAmazon = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${id}/amazon-listing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...amzForm,
          bulletPoints: amzForm.bulletPoints.filter((b) => b.trim()),
          galleryImages: amzForm.galleryImages.filter((g) => g.trim()),
        }),
      });
      if (res.ok) {
        toast.success("Đã lưu Amazon Listing!");
        fetchIdea();
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi lưu Amazon Listing");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEtsy = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${id}/etsy-listing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...etsyForm,
          tags: etsyForm.tags,
          galleryImages: etsyForm.galleryImages.filter((g) => g.trim()),
        }),
      });
      if (res.ok) {
        toast.success("Đã lưu Etsy Listing!");
        fetchIdea();
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi lưu Etsy Listing");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!idea) return null;

  const sourceLinks: string[] = (() => {
    try { return JSON.parse(idea.sourceLinks || "[]"); } catch { return []; }
  })();

  const canApprove = role && can(role, "approve_idea") && idea.status === "reviewing";
  const canManagePhotos = role && can(role, "assign_photo_task");
  const mainImageDirectUrl = convertToDirectImageUrl(idea.mainImageUrl);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-1">
          <Link href="/ideas"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{idea.msku}</h1>
            {statusBadge(idea.status, ideaStatusLabels)}
            <Badge variant="outline">{idea.fulfillmentType}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Tạo bởi {idea.createdBy.fullName} · {idea.topic.name} · {idea.aiModel.name}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {canApprove && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Duyệt ý tưởng
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Duyệt ý tưởng này?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ý tưởng <strong>{idea.msku}</strong> sẽ được chuyển sang trạng thái &ldquo;Đã được duyệt&rdquo; và sẵn sàng điền thông tin Listing.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Huỷ</AlertDialogCancel>
                  <AlertDialogAction onClick={handleApprove} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Duyệt
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main image + info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Ảnh main</CardTitle>
            </CardHeader>
            <CardContent>
              {mainImageDirectUrl ? (
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mainImageDirectUrl}
                    alt={idea.msku}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <a
                href={idea.mainImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 mt-2 hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Mở trên Google Drive
              </a>
            </CardContent>
          </Card>

          {/* Quick Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Thông tin</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SKU</span>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{idea.sku}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">MSKU</span>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{idea.msku}</code>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Trạng thái ảnh</span>
                {statusBadge(idea.photoStatus, photoStatusLabels)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Trạng thái file</span>
                {statusBadge(idea.fileStatus, fileStatusLabels)}
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chủ đề</span>
                <span>{idea.topic.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AI Model</span>
                <span>{idea.aiModel.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ngày tạo</span>
                <span>{new Date(idea.createdAt).toLocaleDateString("vi-VN")}</span>
              </div>
            </CardContent>
          </Card>

          {/* Photo & File Management */}
          {canManagePhotos && idea.status !== "reviewing" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Quản lý ảnh & File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Trạng thái ảnh</Label>
                  <Select
                    value={idea.photoStatus}
                    onValueChange={(v) => handleUpdateIdea({ photoStatus: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(photoStatusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Trạng thái file sản xuất</Label>
                  <Select
                    value={idea.fileStatus}
                    onValueChange={(v) => handleUpdateIdea({ fileStatus: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(fileStatusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {canManagePhotos && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Loại Fulfillment</Label>
                    <Select
                      value={idea.fulfillmentType}
                      onValueChange={(v) => handleUpdateIdea({ fulfillmentType: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FBA">FBA</SelectItem>
                        <SelectItem value="FBM">FBM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Tabs for content, amazon, etsy */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="content">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="content">Nội dung</TabsTrigger>
              <TabsTrigger value="amazon">
                Amazon {idea.amazonListing && <Check className="ml-1 h-3 w-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="etsy">
                Etsy {idea.etsyListing && <Check className="ml-1 h-3 w-3 text-green-500" />}
              </TabsTrigger>
            </TabsList>

            {/* Content Tab */}
            <TabsContent value="content" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Prompt & Nội dung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Prompt</Label>
                    <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">{idea.prompt}</div>
                  </div>
                  {sourceLinks.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Liên kết nguồn</Label>
                      <div className="space-y-1">
                        {sourceLinks.map((link: string, i: number) => (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> {link.length > 60 ? link.slice(0, 60) + "..." : link}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <Separator />
                  <div className="space-y-1.5">
                    <Label htmlFor="idea-title">Tiêu đề sản phẩm</Label>
                    <Input
                      id="idea-title"
                      defaultValue={idea.title || ""}
                      onBlur={(e) => {
                        if (e.target.value !== (idea.title || "")) {
                          handleUpdateIdea({ title: e.target.value });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="idea-desc">Mô tả sản phẩm</Label>
                    <Textarea
                      id="idea-desc"
                      defaultValue={idea.description || ""}
                      rows={4}
                      onBlur={(e) => {
                        if (e.target.value !== (idea.description || "")) {
                          handleUpdateIdea({ description: e.target.value });
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Amazon Listing Tab */}
            <TabsContent value="amazon" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    Amazon Listing
                    {idea.amazonListing && statusBadge(idea.amazonListing.listingStatus, listingStatusLabels)}
                  </CardTitle>
                  <CardDescription>Điền thông tin sản phẩm trên Amazon</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Selling Account */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Tài khoản đăng bán</Label>
                      <Select value={amzForm.sellingAccountId} onValueChange={(v) => setAmzForm({ ...amzForm, sellingAccountId: v })}>
                        <SelectTrigger><SelectValue placeholder="Chọn tài khoản" /></SelectTrigger>
                        <SelectContent>
                          {sellingAccounts.filter((a) => a.platform === "amazon" && a.status === "active").map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Trạng thái Listing</Label>
                      <Select value={amzForm.listingStatus} onValueChange={(v) => setAmzForm({ ...amzForm, listingStatus: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(listingStatusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>ASIN</Label>
                      <Input value={amzForm.asin} onChange={(e) => setAmzForm({ ...amzForm, asin: e.target.value })} placeholder="B0..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label>FNSKU Code</Label>
                      <Input value={amzForm.fnskuCode} onChange={(e) => setAmzForm({ ...amzForm, fnskuCode: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Giá ($)</Label>
                      <Input type="number" step="0.01" value={amzForm.price} onChange={(e) => setAmzForm({ ...amzForm, price: e.target.value })} />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-1.5">
                    <Label>Item Name (Tiêu đề)</Label>
                    <Input value={amzForm.itemName} onChange={(e) => setAmzForm({ ...amzForm, itemName: e.target.value })} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Item Highlights</Label>
                    <Input value={amzForm.itemHighlights} onChange={(e) => setAmzForm({ ...amzForm, itemHighlights: e.target.value })} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Bullet Points (tối đa 5)</Label>
                    {amzForm.bulletPoints.map((bp, i) => (
                      <Input
                        key={i}
                        value={bp}
                        onChange={(e) => {
                          const bps = [...amzForm.bulletPoints];
                          bps[i] = e.target.value;
                          setAmzForm({ ...amzForm, bulletPoints: bps });
                        }}
                        placeholder={`Bullet point ${i + 1}`}
                        className="text-sm"
                      />
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Mô tả chi tiết</Label>
                    <Textarea value={amzForm.description} onChange={(e) => setAmzForm({ ...amzForm, description: e.target.value })} rows={3} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Tags (từ khoá, phân cách bởi dấu phẩy)</Label>
                      <Textarea value={amzForm.tags} onChange={(e) => setAmzForm({ ...amzForm, tags: e.target.value })} rows={2} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Slugs (mỗi dòng 1 slug)</Label>
                      <Textarea value={amzForm.slugs} onChange={(e) => setAmzForm({ ...amzForm, slugs: e.target.value })} rows={2} />
                    </div>
                  </div>

                  <Separator />

                  {/* Gallery images */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3 mb-2">
                      <Checkbox
                        id="amz-shared-main"
                        checked={amzForm.useSharedMainImage}
                        onCheckedChange={(v) => setAmzForm({ ...amzForm, useSharedMainImage: !!v })}
                      />
                      <Label htmlFor="amz-shared-main" className="text-sm cursor-pointer">
                        Dùng ảnh main chung (ảnh đầu gallery = ảnh main)
                      </Label>
                    </div>
                    <Label>Gallery Images (Google Drive links, tối đa 9)</Label>
                    {amzForm.galleryImages.map((img, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={img}
                          onChange={(e) => {
                            const imgs = [...amzForm.galleryImages];
                            imgs[i] = e.target.value;
                            setAmzForm({ ...amzForm, galleryImages: imgs });
                          }}
                          placeholder="https://drive.google.com/..."
                          className="text-sm"
                        />
                        {amzForm.galleryImages.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setAmzForm({
                                ...amzForm,
                                galleryImages: amzForm.galleryImages.filter((_, j) => j !== i),
                              });
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {amzForm.galleryImages.length < 9 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAmzForm({ ...amzForm, galleryImages: [...amzForm.galleryImages, ""] })}
                      >
                        + Thêm ảnh
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Video URL</Label>
                      <Input value={amzForm.videoUrl} onChange={(e) => setAmzForm({ ...amzForm, videoUrl: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Content A+ URL</Label>
                      <Input value={amzForm.contentAPlusUrl} onChange={(e) => setAmzForm({ ...amzForm, contentAPlusUrl: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>FNSKU Label File URL</Label>
                    <Input value={amzForm.fnskuLabelFileUrl} onChange={(e) => setAmzForm({ ...amzForm, fnskuLabelFileUrl: e.target.value })} />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveAmazon} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Lưu Amazon Listing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Etsy Listing Tab */}
            <TabsContent value="etsy" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    Etsy Listing
                    {idea.etsyListing && statusBadge(idea.etsyListing.listingStatus, listingStatusLabels)}
                  </CardTitle>
                  <CardDescription>Điền thông tin sản phẩm trên Etsy</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Tài khoản đăng bán</Label>
                      <Select value={etsyForm.sellingAccountId} onValueChange={(v) => setEtsyForm({ ...etsyForm, sellingAccountId: v })}>
                        <SelectTrigger><SelectValue placeholder="Chọn tài khoản" /></SelectTrigger>
                        <SelectContent>
                          {sellingAccounts.filter((a) => a.platform === "etsy" && a.status === "active").map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Trạng thái Listing</Label>
                      <Select value={etsyForm.listingStatus} onValueChange={(v) => setEtsyForm({ ...etsyForm, listingStatus: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(listingStatusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Listing ID (Etsy)</Label>
                      <Input value={etsyForm.listingId} onChange={(e) => setEtsyForm({ ...etsyForm, listingId: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Giá ($)</Label>
                      <Input type="number" step="0.01" value={etsyForm.price} onChange={(e) => setEtsyForm({ ...etsyForm, price: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Tiêu đề</Label>
                    <Input value={etsyForm.title} onChange={(e) => setEtsyForm({ ...etsyForm, title: e.target.value })} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Mô tả</Label>
                    <Textarea value={etsyForm.description} onChange={(e) => setEtsyForm({ ...etsyForm, description: e.target.value })} rows={4} />
                  </div>

                  {/* Tags with chips */}
                  <div className="space-y-1.5">
                    <Label>Tags (tối đa 13, mỗi tag tối đa 20 ký tự)</Label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {etsyForm.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => setEtsyForm({ ...etsyForm, tags: etsyForm.tags.filter((_, j) => j !== i) })}
                            className="hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    {etsyForm.tags.length < 13 && (
                      <Input
                        value={etsyForm.tagsInput}
                        onChange={(e) => setEtsyForm({ ...etsyForm, tagsInput: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            const val = etsyForm.tagsInput.trim().slice(0, 20);
                            if (val && !etsyForm.tags.includes(val)) {
                              setEtsyForm({
                                ...etsyForm,
                                tags: [...etsyForm.tags, val],
                                tagsInput: "",
                              });
                            }
                          }
                        }}
                        placeholder="Nhập tag rồi bấm Enter..."
                        className="text-sm"
                      />
                    )}
                    <p className="text-xs text-muted-foreground">{etsyForm.tags.length}/13 tags</p>
                  </div>

                  <Separator />

                  {/* Gallery */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="etsy-shared-gallery"
                        checked={etsyForm.useSharedGallery}
                        onCheckedChange={(v) => setEtsyForm({ ...etsyForm, useSharedGallery: !!v })}
                      />
                      <Label htmlFor="etsy-shared-gallery" className="text-sm cursor-pointer">
                        Dùng chung gallery ảnh Amazon
                      </Label>
                    </div>

                    {!etsyForm.useSharedGallery && (
                      <>
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="etsy-shared-main"
                            checked={etsyForm.useSharedMainImage}
                            onCheckedChange={(v) => setEtsyForm({ ...etsyForm, useSharedMainImage: !!v })}
                          />
                          <Label htmlFor="etsy-shared-main" className="text-sm cursor-pointer">
                            Dùng ảnh main chung
                          </Label>
                        </div>
                        <Label>Gallery Images</Label>
                        {etsyForm.galleryImages.map((img, i) => (
                          <div key={i} className="flex gap-2">
                            <Input
                              value={img}
                              onChange={(e) => {
                                const imgs = [...etsyForm.galleryImages];
                                imgs[i] = e.target.value;
                                setEtsyForm({ ...etsyForm, galleryImages: imgs });
                              }}
                              placeholder="https://drive.google.com/..."
                              className="text-sm"
                            />
                            {etsyForm.galleryImages.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => setEtsyForm({ ...etsyForm, galleryImages: etsyForm.galleryImages.filter((_, j) => j !== i) })}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {etsyForm.galleryImages.length < 9 && (
                          <Button type="button" variant="outline" size="sm" onClick={() => setEtsyForm({ ...etsyForm, galleryImages: [...etsyForm.galleryImages, ""] })}>
                            + Thêm ảnh
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="etsy-amz-video"
                        checked={etsyForm.useAmazonVideo}
                        onCheckedChange={(v) => setEtsyForm({ ...etsyForm, useAmazonVideo: !!v })}
                      />
                      <Label htmlFor="etsy-amz-video" className="text-sm cursor-pointer">
                        Dùng video Amazon
                      </Label>
                    </div>
                    {!etsyForm.useAmazonVideo && (
                      <div className="space-y-1.5">
                        <Label>Video URL</Label>
                        <Input value={etsyForm.videoUrl} onChange={(e) => setEtsyForm({ ...etsyForm, videoUrl: e.target.value })} />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveEtsy} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Lưu Etsy Listing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
