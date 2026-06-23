"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Link2,
  Copy,
  Check,
  Calculator,
  FileText,
  Wrench,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { extractDriveFileId, isDriveLink, driveToPreviewUrl, driveToThumbnailUrl } from "@/lib/google-drive";

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tools</h1>
        <p className="text-muted-foreground text-sm">
          Các tiện ích hỗ trợ công việc hàng ngày
        </p>
      </div>

      <Tabs defaultValue="drive">
        <TabsList>
          <TabsTrigger value="drive" className="text-xs sm:text-sm">
            <Link2 className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
            Google Drive
          </TabsTrigger>
          <TabsTrigger value="calc" className="text-xs sm:text-sm">
            <Calculator className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
            Quy đổi kích thước
          </TabsTrigger>
          <TabsTrigger value="text" className="text-xs sm:text-sm">
            <FileText className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
            Xử lý text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drive" className="mt-4">
          <DriveToolCard />
        </TabsContent>
        <TabsContent value="calc" className="mt-4">
          <DimensionCalcCard />
        </TabsContent>
        <TabsContent value="text" className="mt-4">
          <TextToolCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Google Drive Link Converter ─────────────────────────────────────
function DriveToolCard() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const fileId = url ? extractDriveFileId(url) : null;
  const isValid = !!fileId && isDriveLink(url);
  const previewUrl = url ? driveToPreviewUrl(url) : "";
  const thumbUrl = url ? driveToThumbnailUrl(url, 300) : "";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success("Đã copy!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Chuyển đổi Link Google Drive
          </CardTitle>
          <CardDescription>
            Paste link Google Drive để lấy link ảnh trực tiếp (dùng cho listing)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Link Google Drive</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
            />
          </div>

          {url && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={isValid ? "default" : "destructive"} className="text-[10px]">
                  {isValid ? "Link hợp lệ" : "Link không hợp lệ"}
                </Badge>
                {fileId && (
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">ID: {fileId}</code>
                )}
              </div>

              {isValid && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Direct Image URL</Label>
                    <div className="flex gap-2">
                      <Input value={previewUrl} readOnly className="text-xs font-mono" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(previewUrl, "preview")}
                      >
                        {copied === "preview" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Thumbnail URL (300px)</Label>
                    <div className="flex gap-2">
                      <Input value={thumbUrl} readOnly className="text-xs font-mono" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(thumbUrl, "thumb")}
                      >
                        {copied === "thumb" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> Mở ảnh trong tab mới
                  </a>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Xem trước</CardTitle>
        </CardHeader>
        <CardContent>
          {isValid ? (
            <div className="space-y-3">
              <div className="border rounded-lg overflow-hidden bg-muted aspect-square flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    const p = document.createElement("p");
                    p.textContent = "Không thể tải ảnh (file có thể chưa public)";
                    p.className = "text-sm text-muted-foreground text-center p-4";
                    (e.target as HTMLImageElement).parentElement?.appendChild(p);
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Nếu ảnh không hiện, hãy đảm bảo file được share &quot;Anyone with the link&quot;
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wrench className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Paste link Drive vào ô bên trái để xem preview
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Dimension Calculator ────────────────────────────────────────────
function DimensionCalcCard() {
  const [lengthIn, setLengthIn] = useState("");
  const [widthIn, setWidthIn] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightOz, setWeightOz] = useState("");

  const inToCm = (val: string) => val ? (parseFloat(val) * 2.54).toFixed(1) : "—";
  const ozToKg = (val: string) => val ? (parseFloat(val) * 0.0283495).toFixed(3) : "—";
  const ozToLb = (val: string) => val ? (parseFloat(val) / 16).toFixed(2) : "—";

  // Volume weight (dim weight for FedEx/UPS)
  const dimWeight = () => {
    if (!lengthIn || !widthIn || !heightIn) return "—";
    const l = parseFloat(lengthIn);
    const w = parseFloat(widthIn);
    const h = parseFloat(heightIn);
    return (l * w * h / 139).toFixed(1) + " lb";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Quy đổi kích thước & cân nặng
        </CardTitle>
        <CardDescription>
          Chuyển đổi inch/oz sang cm/kg. Tính dim weight cho vận chuyển.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Dài (inch)</Label>
            <Input type="number" step="0.1" value={lengthIn} onChange={(e) => setLengthIn(e.target.value)} placeholder="0" />
            <p className="text-xs text-muted-foreground">{inToCm(lengthIn)} cm</p>
          </div>
          <div className="space-y-2">
            <Label>Rộng (inch)</Label>
            <Input type="number" step="0.1" value={widthIn} onChange={(e) => setWidthIn(e.target.value)} placeholder="0" />
            <p className="text-xs text-muted-foreground">{inToCm(widthIn)} cm</p>
          </div>
          <div className="space-y-2">
            <Label>Cao (inch)</Label>
            <Input type="number" step="0.1" value={heightIn} onChange={(e) => setHeightIn(e.target.value)} placeholder="0" />
            <p className="text-xs text-muted-foreground">{inToCm(heightIn)} cm</p>
          </div>
          <div className="space-y-2">
            <Label>Cân nặng (oz)</Label>
            <Input type="number" step="0.1" value={weightOz} onChange={(e) => setWeightOz(e.target.value)} placeholder="0" />
            <p className="text-xs text-muted-foreground">{ozToKg(weightOz)} kg · {ozToLb(weightOz)} lb</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Dim weight (÷139):</span>
            <span className="font-bold">{dimWeight()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Text Tool ───────────────────────────────────────────────────────
function TextToolCard() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const charCount = input.length;
  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
  const byteCount = new TextEncoder().encode(input).length;

  // Remove extra whitespace, trim each line
  const cleaned = input
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(cleaned);
    setCopied(true);
    toast.success("Đã copy text đã xử lý!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Xử lý Text
        </CardTitle>
        <CardDescription>
          Đếm ký tự, xoá khoảng trắng thừa. Hữu ích khi soạn title/bullet points.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Nhập text</Label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste text cần xử lý..."
            rows={5}
          />
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{charCount} ký tự</span>
            <span>{wordCount} từ</span>
            <span>{byteCount} bytes</span>
            {charCount > 200 && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                &gt; 200 chars
              </Badge>
            )}
          </div>
        </div>

        {input && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Kết quả (đã xoá khoảng trắng thừa)</Label>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                Copy
              </Button>
            </div>
            <Textarea value={cleaned} readOnly rows={4} className="font-mono text-sm bg-muted" />
            <p className="text-xs text-muted-foreground">{cleaned.length} ký tự sau xử lý</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
