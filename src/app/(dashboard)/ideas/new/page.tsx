"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CircleHelp,
  Loader2,
  Save,
  Plus,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface TopicOption {
  id: string;
  name: string;
}

interface AiModelOption {
  id: string;
  name: string;
}

export default function CreateIdeaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [aiModels, setAiModels] = useState<AiModelOption[]>([]);

  // Form state
  const [autoGenerateMsku, setAutoGenerateMsku] = useState(true);
  const [manualMsku, setManualMsku] = useState("");
  const [topicId, setTopicId] = useState("");
  const [aiModelId, setAiModelId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [sourceLinks, setSourceLinks] = useState<string[]>([""]);
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState("FBM");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Warnings
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    // Fetch topics and AI models
    fetch("/api/topics")
      .then((r) => r.json())
      .then(setTopics)
      .catch(() => {});

    fetch("/api/ai-models")
      .then((r) => r.json())
      .then(setAiModels)
      .catch(() => {});
  }, []);

  const addSourceLink = () => {
    if (sourceLinks.length < 5) {
      setSourceLinks([...sourceLinks, ""]);
    }
  };

  const removeSourceLink = (index: number) => {
    setSourceLinks(sourceLinks.filter((_, i) => i !== index));
  };

  const updateSourceLink = (index: number, value: string) => {
    const updated = [...sourceLinks];
    updated[index] = value;
    setSourceLinks(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!topicId || !aiModelId || !prompt || !mainImageUrl) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc");
      return;
    }

    if (!autoGenerateMsku && !manualMsku) {
      toast.error("Vui lòng nhập MSKU");
      return;
    }

    // Check warnings (non-blocking)
    const newWarnings: string[] = [];
    const validLinks = sourceLinks.filter((l) => l.trim());
    if (validLinks.length === 0) {
      newWarnings.push("Chưa có liên kết nguồn ý tưởng");
    }
    if (!title) {
      newWarnings.push("Chưa điền tiêu đề sản phẩm");
    }

    if (newWarnings.length > 0 && warnings.length === 0) {
      setWarnings(newWarnings);
      return; // First time: show warnings and stop. User can click again to confirm.
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoGenerateMsku,
          manualMsku: autoGenerateMsku ? undefined : manualMsku,
          topicId,
          aiModelId,
          prompt,
          sourceLinks: sourceLinks.filter((l) => l.trim()),
          mainImageUrl,
          fulfillmentType,
          title,
          description,
        }),
      });

      if (res.ok) {
        const idea = await res.json();
        toast.success(`Ý tưởng ${idea.msku} đã được tạo!`);
        router.push("/ideas");
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi tạo ý tưởng");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/ideas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tạo ý tưởng mới</h1>
          <p className="text-muted-foreground text-sm">
            Điền thông tin ý tưởng sản phẩm để gửi duyệt
          </p>
        </div>
      </div>

      {/* Warnings Banner */}
      {warnings.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Cảnh báo:</strong>
            <ul className="list-disc ml-4 mt-1">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs">Bấm &ldquo;Lưu&rdquo; lần nữa để xác nhận tạo.</p>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* MSKU Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mã sản phẩm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="auto-msku"
                checked={autoGenerateMsku}
                onCheckedChange={(v) => {
                  setAutoGenerateMsku(!!v);
                  setWarnings([]);
                }}
              />
              <Label htmlFor="auto-msku" className="text-sm cursor-pointer">
                Tự sinh MSKU
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CircleHelp className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>MSKU = Mã nội bộ (viết tắt tên + tháng + số thứ tự). Không đổi sau khi tạo. SKU mặc định = MSKU, có thể sửa nếu sàn tự sinh mã khác.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {!autoGenerateMsku && (
              <div className="space-y-2">
                <Label htmlFor="manual-msku">MSKU thủ công *</Label>
                <Input
                  id="manual-msku"
                  value={manualMsku}
                  onChange={(e) => setManualMsku(e.target.value)}
                  placeholder="Nhập MSKU (không quá 30 ký tự, không trùng)"
                  maxLength={30}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Loại</Label>
              <div className="flex gap-2">
                <Select value={fulfillmentType} onValueChange={setFulfillmentType}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FBM">FBM</SelectItem>
                    <SelectItem value="FBA">FBA</SelectItem>
                  </SelectContent>
                </Select>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CircleHelp className="h-4 w-4 text-muted-foreground mt-2.5" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>FBA = Amazon giữ kho, cần sản xuất trước. FBM = tự ship, không cần file sản xuất sẵn. Mặc định FBM, quản lý có thể đổi khi duyệt.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin ý tưởng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="topic">
                  Chủ đề sản phẩm <span className="text-destructive">*</span>
                </Label>
                <Select value={topicId} onValueChange={setTopicId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn chủ đề" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai-model">
                  AI Model <span className="text-destructive">*</span>
                </Label>
                <Select value={aiModelId} onValueChange={setAiModelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">
                Prompt <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Prompt đã dùng để tạo sản phẩm..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="main-image">
                Ảnh main (Google Drive link) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="main-image"
                value={mainImageUrl}
                onChange={(e) => setMainImageUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
              />
              <p className="text-xs text-muted-foreground">
                Ảnh đại diện sản phẩm. Bắt buộc để gửi duyệt.
              </p>
            </div>

            <Separator />

            {/* Source Links */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Liên kết nguồn ý tưởng</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CircleHelp className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Link tới sản phẩm gốc lấy cảm hứng (1-5 link)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {sourceLinks.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={link}
                    onChange={(e) => updateSourceLink(i, e.target.value)}
                    placeholder="https://..."
                  />
                  {sourceLinks.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSourceLink(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {sourceLinks.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSourceLink}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Thêm link
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content (title, description) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nội dung sản phẩm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Tiêu đề sản phẩm</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tiêu đề sẽ dùng cho cả Amazon và Etsy..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả sản phẩm</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chi tiết sản phẩm..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/ideas">Huỷ</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {warnings.length > 0 ? "Xác nhận tạo" : "Lưu ý tưởng"}
          </Button>
        </div>
      </form>
    </div>
  );
}
