"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Loader2, Save, Plus, X, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface TopicOption { id: string; name: string; }
interface AiModelOption { id: string; name: string; }

export default function CreateIdeaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [aiModels, setAiModels] = useState<AiModelOption[]>([]);

  // Form - persistent fields (kept after create)
  const [autoGenerateMsku, setAutoGenerateMsku] = useState(true);
  const [manualMsku, setManualMsku] = useState("");
  const [topicId, setTopicId] = useState("");
  const [aiModelId, setAiModelId] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState("FBM");

  // Form - clearable fields
  const [prompt, setPrompt] = useState("");
  const [sourceLinks, setSourceLinks] = useState<string[]>([""]);
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // New fields
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [thicknessMm, setThicknessMm] = useState("");
  const [material, setMaterial] = useState("");
  const [ideaSource, setIdeaSource] = useState<"employee" | "partner">("employee");
  const [partnerName, setPartnerName] = useState("");
  const [partnerLabel, setPartnerLabel] = useState("");

  useEffect(() => {
    fetch("/api/topics").then(r => r.json()).then(setTopics).catch(() => {});
    fetch("/api/ai-models").then(r => r.json()).then(setAiModels).catch(() => {});
  }, []);

  const resetClearableFields = () => {
    setPrompt(""); setSourceLinks([""]); setMainImageUrl("");
    setTitle(""); setDescription("");
    setWidthCm(""); setHeightCm(""); setThicknessMm(""); setMaterial("");
    setPartnerName(""); setPartnerLabel("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicId || !aiModelId || !prompt || !mainImageUrl) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc"); return;
    }
    if (!autoGenerateMsku && !manualMsku) {
      toast.error("Vui lòng nhập MSKU"); return;
    }
    if (ideaSource === "partner" && !partnerName.trim()) {
      toast.error("Vui lòng nhập tên đối tác"); return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoGenerateMsku,
          manualMsku: autoGenerateMsku ? undefined : manualMsku,
          topicId, aiModelId, prompt,
          sourceLinks: sourceLinks.filter(l => l.trim()),
          mainImageUrl, fulfillmentType,
          title: title || undefined, description: description || undefined,
          widthCm: widthCm ? parseFloat(widthCm) : undefined,
          heightCm: heightCm ? parseFloat(heightCm) : undefined,
          thicknessMm: thicknessMm ? parseFloat(thicknessMm) : undefined,
          material: material || undefined,
          source: ideaSource,
          partnerName: ideaSource === "partner" ? partnerName : undefined,
          partnerLabel: ideaSource === "partner" ? partnerLabel : undefined,
        }),
      });
      if (res.ok) {
        const idea = await res.json();
        toast.success(`Đã tạo ${idea.msku}!`, {
          action: { label: "Xem", onClick: () => router.push(`/ideas/${idea.id}`) },
          duration: 5000,
        });
        resetClearableFields();
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi tạo ý tưởng");
      }
    } catch { toast.error("Lỗi hệ thống"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/ideas"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div><h1 className="text-2xl font-bold tracking-tight">Tạo ý tưởng mới</h1></div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Main Form (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Basic Info */}
            <Card>
              <CardHeader><CardTitle className="text-base">Thông tin cơ bản</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox id="auto-msku" checked={autoGenerateMsku} onCheckedChange={v => setAutoGenerateMsku(!!v)} />
                    <Label htmlFor="auto-msku" className="text-sm cursor-pointer">Tự sinh MSKU</Label>
                  </div>
                  <Select value={fulfillmentType} onValueChange={setFulfillmentType}>
                    <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FBM">FBM</SelectItem>
                      <SelectItem value="FBA">FBA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!autoGenerateMsku && (
                  <Input value={manualMsku} onChange={e => setManualMsku(e.target.value)} placeholder="MSKU thủ công" maxLength={30} className="h-9 text-sm" />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Chủ đề <span className="text-destructive">*</span></Label>
                    <Select value={topicId} onValueChange={setTopicId}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Chọn chủ đề" /></SelectTrigger>
                      <SelectContent>{topics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">AI Model <span className="text-destructive">*</span></Label>
                    <Select value={aiModelId} onValueChange={setAiModelId}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Chọn AI model" /></SelectTrigger>
                      <SelectContent>{aiModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Rộng (cm)</Label>
                    <Input value={widthCm} onChange={e => setWidthCm(e.target.value)} placeholder="VD: 20" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cao (cm)</Label>
                    <Input value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="VD: 25" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dày (mm)</Label>
                    <Input value={thicknessMm} onChange={e => setThicknessMm(e.target.value)} placeholder="VD: 3" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Vật liệu</Label>
                    <Input value={material} onChange={e => setMaterial(e.target.value)} placeholder="VD: Gỗ birch" className="h-9 text-sm" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content */}
            <Card>
              <CardHeader><CardTitle className="text-base">Prompt & Ảnh</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs">Prompt <span className="text-destructive">*</span></Label>
                  <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Prompt đã dùng để tạo ảnh sản phẩm..." rows={3} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ảnh main (Google Drive) <span className="text-destructive">*</span></Label>
                  <Input value={mainImageUrl} onChange={e => setMainImageUrl(e.target.value)} placeholder="https://drive.google.com/file/d/..." className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Liên kết nguồn</Label>
                  {sourceLinks.map((link, i) => (
                    <div key={i} className="flex gap-2 mb-1">
                      <Input value={link} onChange={e => { const u = [...sourceLinks]; u[i] = e.target.value; setSourceLinks(u); }} placeholder="https://..." className="h-9 text-sm" />
                      {sourceLinks.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => setSourceLinks(sourceLinks.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>}
                    </div>
                  ))}
                  {sourceLinks.length < 5 && <Button type="button" variant="outline" size="sm" onClick={() => setSourceLinks([...sourceLinks, ""])}><Plus className="mr-1 h-3 w-3" />Thêm link</Button>}
                </div>
              </CardContent>
            </Card>

            {/* Content fields */}
            <Card>
              <CardHeader><CardTitle className="text-base">Nội dung sản phẩm</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tiêu đề</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tiêu đề sản phẩm..." className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mô tả</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả chi tiết..." rows={3} className="text-sm" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Source + Actions (1 col) */}
          <div className="space-y-4">
            {/* Source selector */}
            <Card>
              <CardHeader><CardTitle className="text-base">Nguồn gốc</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button type="button" variant={ideaSource === "employee" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setIdeaSource("employee")}>Nhân viên</Button>
                  <Button type="button" variant={ideaSource === "partner" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setIdeaSource("partner")}>Đối tác</Button>
                </div>
                {ideaSource === "partner" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Tên đối tác <span className="text-destructive">*</span></Label>
                      <Input value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder="Công ty TNHH ABC" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Mã label đối tác</Label>
                      <Input value={partnerLabel} onChange={e => setPartnerLabel(e.target.value)} placeholder="ABC-LABEL-01" className="h-9 text-sm" />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Sticky Actions */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Lưu ý tưởng
                </Button>
                <Button type="button" variant="outline" asChild className="w-full">
                  <Link href="/ideas">Huỷ</Link>
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Sau khi lưu, bạn có thể tiếp tục tạo ý tưởng mới
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
