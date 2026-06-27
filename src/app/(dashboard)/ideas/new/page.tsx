"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Loader2, Save, Plus, X, Settings as SettingsIcon, RefreshCw, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

interface TopicOption { id: string; name: string; }
interface AiModelOption { id: string; name: string; }
interface PartnerOption { id: string; name: string; }

export default function CreateIdeaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cloneFrom = searchParams.get("cloneFrom");

  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [aiModels, setAiModels] = useState<AiModelOption[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);

  // Form - persistent fields
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
  const [bulletPoints, setBulletPoints] = useState<string[]>(["", "", "", "", ""]);
  const [tags, setTags] = useState("");
  const [slugs, setSlugs] = useState("");

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [thicknessMm, setThicknessMm] = useState("");
  const [material, setMaterial] = useState("");
  
  const [ideaSource, setIdeaSource] = useState<"employee" | "partner">("employee");
  const [partnerId, setPartnerId] = useState("");
  const [partnerLabel, setPartnerLabel] = useState("");
  const [rules, setRules] = useState<Record<string, string>>({});

  const fetchTopics = () => fetch("/api/topics").then(r => r.json()).then(setTopics).catch(() => {});
  const fetchAiModels = () => fetch("/api/ai-models").then(r => r.json()).then(setAiModels).catch(() => {});
  const fetchPartners = async () => {
    try {
      const res = await fetch("/api/partners");
      if (res.ok) setPartners(await res.json());
    } catch {}
  };
  const fetchRules = async () => {
    const { data } = await apiFetch("/api/metadata/rules");
    if (data) setRules(data);
  };

  useEffect(() => {
    fetchTopics();
    fetchAiModels();
    fetchPartners();
    fetchRules();
  }, []);

  useEffect(() => {
    if (cloneFrom) {
      fetch(`/api/ideas/${cloneFrom}`)
        .then(r => r.json())
        .then(data => {
          if (data.id) {
            setTopicId(data.topicId || "");
            setAiModelId(data.aiModelId || "");
            setWidthCm(data.widthCm ? data.widthCm.toString() : "");
            setHeightCm(data.heightCm ? data.heightCm.toString() : "");
            setThicknessMm(data.thicknessMm ? data.thicknessMm.toString() : "");
            setMaterial(data.material || "");
            
            // Note: per user request, we DO NOT copy prompt, mainImageUrl, title, description, etc.
            // We only add internal link reference
            setSourceLinks([`internal:${data.id}`]);
            
            // Automatically switch to partner if copying (common workflow)
            setIdeaSource("partner");
            setShowAdvanced(true);
            toast.info("Đã tải kích thước từ ý tưởng gốc");
          }
        })
        .catch(() => toast.error("Không thể tải thông tin ý tưởng gốc"));
    }
  }, [cloneFrom]);



  const resetClearableFields = () => {
    setPrompt(""); setSourceLinks([""]); setMainImageUrl("");
    setTitle(""); setDescription(""); setBulletPoints(["", "", "", "", ""]); setTags(""); setSlugs("");
    setWidthCm(""); setHeightCm(""); setThicknessMm(""); setMaterial("");
    setPartnerLabel("");
  };

  const handleSubmit = async (e: React.FormEvent, keepOpen = false) => {
    e.preventDefault();
    // Validations based on source
    if (ideaSource !== "partner") {
      if (!topicId || !aiModelId || !prompt || !mainImageUrl) {
        toast.error("Vui lòng điền đầy đủ: Chủ đề, AI model, prompt, ảnh"); return;
      }
    } else {
      if (!topicId || !aiModelId || !partnerId) {
        toast.error("Vui lòng điền đầy đủ: Chủ đề, AI model, Đối tác"); return;
      }
    }

    if (!autoGenerateMsku && !manualMsku) {
      toast.error("Vui lòng nhập MSKU"); return;
    }

    // Validation bằng Dynamic Rules
    const maxTitleLen = parseInt(rules.idea_title_max_length || "75", 10);
    const maxPromptLen = parseInt(rules.idea_prompt_max_length || "500", 10);

    if (title && title.length > maxTitleLen) {
      toast.error("Tiêu đề không hợp lệ", {
        description: `Tiêu đề hiện tại dài ${title.length} ký tự (Tối đa ${maxTitleLen} ký tự theo quy định).`,
        duration: Infinity,
        action: { label: "Xem Quy tắc", onClick: () => window.open("/metadata/rules", "_blank") }
      });
      return;
    }

    if (prompt && prompt.length > maxPromptLen) {
      toast.error("Prompt không hợp lệ", {
        description: `Prompt hiện tại dài ${prompt.length} ký tự (Tối đa ${maxPromptLen} ký tự theo quy định).`,
        duration: Infinity,
        action: { label: "Xem Quy tắc", onClick: () => window.open("/metadata/rules", "_blank") }
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await apiFetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoGenerateMsku,
          manualMsku: autoGenerateMsku ? undefined : manualMsku,
          topicId, aiModelId, 
          prompt: prompt || "Từ đối tác", 
          mainImageUrl: mainImageUrl || "https://dummyimage.com/600x400/000/fff&text=No+Image", 
          sourceLinks: sourceLinks.filter(l => l.trim()),
          fulfillmentType,
          title: title || undefined, 
          description: description || undefined,
          bulletPoints: bulletPoints.filter(b => b.trim()),
          tags: tags || undefined,
          slugs: slugs || undefined,
          widthCm: widthCm ? parseFloat(widthCm) : undefined,
          heightCm: heightCm ? parseFloat(heightCm) : undefined,
          thicknessMm: thicknessMm ? parseFloat(thicknessMm) : undefined,
          material: material || undefined,
          ideaSource,
          partnerId: ideaSource === "partner" ? partnerId : undefined,
          partnerLabel: ideaSource === "partner" ? partnerLabel || undefined : undefined
        })
      });

      if (data) {
        toast.success(`Đã tạo ${data.msku}!`, {
          action: { label: "Xem", onClick: () => router.push(`/ideas/${data.id}`) },
          duration: 5000,
        });
        
        if (!keepOpen) {
          router.push(`/ideas/${data.id}`);
        } else {
          resetClearableFields();
        }
      }
    } finally { 
      setLoading(false); 
    }
  };

  const updateBullet = (idx: number, val: string) => {
    const newB = [...bulletPoints];
    newB[idx] = val;
    setBulletPoints(newB);
  };

  return (
    <div className="space-y-4 max-w-5xl pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/ideas"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {cloneFrom ? "Sao chép ý tưởng" : "Tạo ý tưởng mới"}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            
            {/* Thông số cơ bản */}
            <Card>
              <CardHeader><CardTitle className="text-base">Thông số kỹ thuật</CardTitle></CardHeader>
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
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Chủ đề <span className="text-destructive">*</span></Label>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={fetchTopics} title="Tải lại danh sách"><RefreshCw className="h-3 w-3 text-muted-foreground" /></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5" asChild title="Quản lý Chủ đề"><Link href="/metadata/topics" target="_blank"><SettingsIcon className="h-3 w-3 text-muted-foreground" /></Link></Button>
                      </div>
                    </div>
                    <Select value={topicId} onValueChange={setTopicId}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Chọn chủ đề" /></SelectTrigger>
                      <SelectContent>{topics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">AI Model <span className="text-destructive">*</span></Label>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={fetchAiModels} title="Tải lại danh sách"><RefreshCw className="h-3 w-3 text-muted-foreground" /></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5" asChild title="Quản lý AI Models"><Link href="/metadata/ai-models" target="_blank"><SettingsIcon className="h-3 w-3 text-muted-foreground" /></Link></Button>
                      </div>
                    </div>
                    <Select value={aiModelId} onValueChange={setAiModelId}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Chọn AI model" /></SelectTrigger>
                      <SelectContent>{aiModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                {showAdvanced && (
                  <div className="grid grid-cols-4 gap-3 pt-2 border-t mt-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Rộng (cm)</Label>
                      <Input value={widthCm} onChange={e => setWidthCm(e.target.value)} placeholder="20" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cao (cm)</Label>
                      <Input value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="25" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Dày (mm)</Label>
                      <Input value={thicknessMm} onChange={e => setThicknessMm(e.target.value)} placeholder="3" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Vật liệu</Label>
                      <Input value={material} onChange={e => setMaterial(e.target.value)} placeholder="VD: Gỗ" className="h-9 text-sm" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prompt & Ảnh (Ẩn khi đối tác nếu không cần, nhưng vẫn giữ để upload ảnh nếu có) */}
            <Card>
              <CardHeader><CardTitle className="text-base">Nguồn ý tưởng & Ảnh</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs">Ảnh main (Google Drive) {ideaSource !== "partner" && <span className="text-destructive">*</span>}</Label>
                  <Input value={mainImageUrl} onChange={e => setMainImageUrl(e.target.value)} placeholder="https://drive.google.com/file/d/..." className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prompt {ideaSource !== "partner" && <span className="text-destructive">*</span>}</Label>
                  <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Prompt..." rows={2} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Liên kết nguồn (Hỗ trợ định dạng internal:ID cho sao chép)</Label>
                  {sourceLinks.map((link, i) => (
                    <div key={i} className="flex gap-2 mb-1">
                      <Input value={link} onChange={e => { const u = [...sourceLinks]; u[i] = e.target.value; setSourceLinks(u); }} placeholder="https:// hoặc internal:ID" className="h-9 text-sm" />
                      {sourceLinks.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => setSourceLinks(sourceLinks.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>}
                    </div>
                  ))}
                  {sourceLinks.length < 5 && <Button type="button" variant="outline" size="sm" onClick={() => setSourceLinks([...sourceLinks, ""])}><Plus className="mr-1 h-3 w-3" />Thêm link</Button>}
                </div>
              </CardContent>
            </Card>

            {/* Content fields (Ẩn nếu là đối tác hoặc chưa mở nâng cao) */}
            {ideaSource !== "partner" && showAdvanced && (
              <Card>
                <CardHeader><CardTitle className="text-base">Nội dung sản phẩm (Dành cho Amazon/Etsy)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Tiêu đề</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tiêu đề..." className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mô tả</Label>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả..." rows={3} className="text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">5 Bullet Points</Label>
                    {bulletPoints.map((bp, idx) => (
                      <Input key={idx} value={bp} onChange={e => updateBullet(idx, e.target.value)} placeholder={`Bullet point ${idx + 1}...`} className="h-9 text-sm" />
                    ))}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tags (Cách nhau bằng dấu phẩy)</Label>
                    <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="tag1, tag2, tag3" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Slugs (SEO ảnh - mỗi slug 1 dòng)</Label>
                    <Textarea value={slugs} onChange={e => setSlugs(e.target.value)} placeholder="slug-1&#10;slug-2" rows={3} className="text-sm font-mono" />
                  </div>
                </CardContent>
              </Card>
            )}

            {!showAdvanced && (
              <Button type="button" variant="outline" className="w-full text-muted-foreground border-dashed" onClick={() => setShowAdvanced(true)}>
                Hiển thị các trường nâng cao (Kích thước, SEO)
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Nguồn gốc</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button type="button" variant={ideaSource === "employee" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setIdeaSource("employee")}>Nội bộ</Button>
                  <Button type="button" variant={ideaSource === "partner" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setIdeaSource("partner")}>Đối tác</Button>
                </div>
                {ideaSource === "partner" && (
                  <div className="space-y-3 mt-4 pt-4 border-t">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Đối tác <span className="text-destructive">*</span></Label>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={fetchPartners} title="Tải lại danh sách"><RefreshCw className="h-3 w-3 text-muted-foreground" /></Button>
                          <Button type="button" variant="ghost" size="icon" className="h-5 w-5" asChild title="Quản lý Đối tác"><Link href="/metadata/partners" target="_blank"><SettingsIcon className="h-3 w-3 text-muted-foreground" /></Link></Button>
                        </div>
                      </div>
                      <Select value={partnerId} onValueChange={setPartnerId}>
                        <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Chọn đối tác" /></SelectTrigger>
                        <SelectContent>
                          {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Mã label đối tác (Tuỳ chọn)</Label>
                      <Input value={partnerLabel} onChange={e => setPartnerLabel(e.target.value)} placeholder="VD: B-01" className="h-9 text-sm" />
                      <p className="text-[10px] text-muted-foreground">Có thể bổ sung sau khi đối tác cung cấp label.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Lưu ý tưởng
                </Button>
                <Button type="button" variant="outline" asChild className="w-full">
                  <Link href="/ideas">Huỷ</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

    </div>
  );
}
