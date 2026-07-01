"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useForm, useWatch, useFieldArray, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription
} from "@/components/ui/form";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Loader2, Save, Plus, X, Settings as SettingsIcon, RefreshCw, Image as ImageIcon, History, CheckCircle2, Check
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { ImagePreviewDialog } from "@/components/image-preview-dialog";
import { convertToDirectImageUrl } from "@/lib/google-drive";

// Types
interface TopicOption { id: string; name: string; }
interface AiModelOption { id: string; name: string; }
interface PartnerOption { id: string; name: string; }

const getFormSchema = (isManagement: boolean, rules: Record<string, string>) => {
  const maxTitleLen = parseInt(rules.idea_title_max_length || "75", 10);
  const maxPromptLen = parseInt(rules.idea_prompt_max_length || "500", 10);

  return z.object({
    autoGenerateMsku: z.boolean().default(true),
    manualMsku: z.string().max(30, "Tối đa 30 ký tự").optional(),
    topicId: z.string().min(1, "Vui lòng chọn chủ đề"),
    aiModelId: z.string().min(1, "Vui lòng chọn AI model"),
    ideaSource: z.enum(["employee", "partner"]).default("employee"),
    partnerId: z.string().optional(),
    mainImageUrl: z.string().optional(),
    designFileUrl: z.string().optional(),
    prompt: z.string().max(maxPromptLen, `Tối đa ${maxPromptLen} ký tự`).optional(),
    sourceLinks: z.array(z.string()),
    title: z.string().max(maxTitleLen, `Tối đa ${maxTitleLen} ký tự`).optional(),
    description: z.string().optional(),
    bulletPoints: z.array(z.string()).max(5),
    tags: z.string().optional(),
    slugs: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional(),
    thickness: z.string().optional(),
    material: z.string().optional(),
    itemHighlights: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (!data.autoGenerateMsku && (!data.manualMsku || data.manualMsku.trim() === "")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["manualMsku"], message: "Vui lòng nhập MSKU" });
    }
    if (data.ideaSource === "partner") {
      if (!data.partnerId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["partnerId"], message: "Vui lòng chọn đối tác" });
      }
      if (!data.mainImageUrl || data.mainImageUrl.trim() === "") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mainImageUrl"], message: "Vui lòng nhập link ảnh" });
      }
      if (!data.designFileUrl || data.designFileUrl.trim() === "") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["designFileUrl"], message: "Đối tác bắt buộc phải có file thiết kế" });
      }
    } else {
      if (!data.mainImageUrl || data.mainImageUrl.trim() === "") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mainImageUrl"], message: "Vui lòng nhập link ảnh" });
      }
      if (!isManagement && (!data.prompt || data.prompt.trim() === "")) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["prompt"], message: "Vui lòng nhập prompt" });
      }
    }

    if (!data.width || data.width.trim() === "" || isNaN(parseFloat(data.width))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["width"], message: "Bắt buộc" });
    }
    if (!data.height || data.height.trim() === "" || isNaN(parseFloat(data.height))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["height"], message: "Bắt buộc" });
    }
    if (!data.thickness || data.thickness.trim() === "" || isNaN(parseFloat(data.thickness))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["thickness"], message: "Bắt buộc" });
    }
  });
};



function SourceLinksField() {
  const { control, setValue } = useFormContext();
  const sourceLinks = useWatch({ control, name: "sourceLinks" }) || [""];

  return (
    <div className="space-y-2">
      <Label className="text-sm">Liên kết nguồn (Hỗ trợ internal:ID cho sao chép)</Label>
      {sourceLinks.map((link: string, i: number) => (
        <div key={`link-${i}`} className="flex gap-2">
          <Input
            value={link}
            onChange={(e) => {
              const u = [...sourceLinks];
              u[i] = e.target.value;
              setValue("sourceLinks", u, { shouldDirty: true });
            }}
            placeholder="https:// hoặc internal:ID"
          />
          {sourceLinks.length > 1 && (
            <Button type="button" variant="ghost" size="icon" onClick={() => {
              setValue("sourceLinks", sourceLinks.filter((_: any, j: number) => j !== i), { shouldDirty: true });
            }}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {sourceLinks.length < 5 && (
        <Button type="button" variant="outline" size="sm" onClick={() => setValue("sourceLinks", [...sourceLinks, ""], { shouldDirty: true })}>
          <Plus className="mr-1 h-3 w-3" />Thêm link
        </Button>
      )}
    </div>
  );
}

function BulletPointsField({ isFlashing }: { isFlashing: boolean }) {
  const { control, setValue } = useFormContext();
  const bulletPoints = useWatch({ control, name: "bulletPoints" }) || ["", "", "", "", ""];

  const getHighlight = (val: string) => {
    const baseTrans = "transition-shadow duration-1000 ease-out";
    if (!isFlashing) return baseTrans;
    return val ? `${baseTrans} ring-2 ring-amber-500 ring-offset-1` : baseTrans;
  };

  return (
    <div className="space-y-3">
      {bulletPoints.map((bp: string, i: number) => (
        <FormItem key={`bp-${i}`}>
          <FormControl>
            <Input
              value={bp}
              onChange={(e) => {
                const b = [...bulletPoints];
                b[i] = e.target.value;
                setValue("bulletPoints", b, { shouldDirty: true });
              }}
              placeholder={`Bullet point ${i + 1}...`}
              className={getHighlight(bp)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      ))}
    </div>
  );
}

function LivePreviewImage({ control }: { control: any }) {
  const mainImageValue = useWatch({ control, name: "mainImageUrl" });
  return (
    <div className="md:col-span-5 lg:col-span-4 space-y-2">
      <Label className="text-sm font-medium">Live Preview</Label>
      {mainImageValue ? (
        <ImagePreviewDialog url={convertToDirectImageUrl(mainImageValue) || ""}>
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted cursor-pointer group shadow-sm">
            <img
              src={convertToDirectImageUrl(mainImageValue) || ""}
              alt="Preview"
              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110 animate-in fade-in duration-500"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes("placeholder")) {
                  target.src = "https://placehold.co/600x600?text=Lỗi+tải+ảnh";
                }
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
          </div>
        </ImagePreviewDialog>
      ) : (
        <div className="aspect-square w-full rounded-xl bg-muted border-2 border-dashed border-muted flex items-center justify-center overflow-hidden">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-2 opacity-40" />
            <span className="text-xs">Chưa có ảnh</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateIdeaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cloneFrom = searchParams.get("cloneFrom");
  const { data: session } = useSession();

  const isManagement = session?.user?.role === "boss" || session?.user?.role === "manager";


  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [aiModels, setAiModels] = useState<AiModelOption[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [rules, setRules] = useState<Record<string, string>>({});

  // V4 Features
  const [useMetrics, setUseMetrics] = useState(true); // true = mm, false = inches
  const [isFlashing, setIsFlashing] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const latestDataRef = useRef<any>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const getHighlight = (val: any) => {
    const baseTrans = "transition-shadow duration-1000 ease-out";
    if (!isFlashing) return baseTrans;
    const hasValue = Array.isArray(val) ? val.some(v => !!v) : !!val;
    return hasValue ? `${baseTrans} ring-2 ring-amber-500 ring-offset-1` : baseTrans;
  };

  const isReady = Object.keys(rules).length > 0;

  const form = useForm({
    resolver: isReady ? (zodResolver(getFormSchema(isManagement, rules)) as any) : undefined,
    defaultValues: {
      autoGenerateMsku: true,
      manualMsku: "",
      topicId: "",
      aiModelId: "",
      ideaSource: "employee",
      partnerId: "",
      mainImageUrl: "",
      designFileUrl: "",
      prompt: "",
      sourceLinks: [""],
      title: "",
      description: "",
      bulletPoints: ["", "", "", "", ""],
      tags: "",
      slugs: "",
      width: "",
      height: "",
      thickness: "",
      material: "",
      itemHighlights: "",
    },
  });

  const ideaSource = useWatch({ control: form.control, name: "ideaSource" });
  const autoGenerateMsku = useWatch({ control: form.control, name: "autoGenerateMsku" });

  const fetchTopics = () => fetch("/api/topics").then(r => r.json()).then(setTopics).catch(() => { });
  const fetchAiModels = () => fetch("/api/ai-models").then(r => r.json()).then(setAiModels).catch(() => { });
  const fetchPartners = async () => {
    try {
      const res = await fetch("/api/partners");
      if (res.ok) setPartners(await res.json());
    } catch { }
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
            form.setValue("topicId", data.topicId || "");
            form.setValue("aiModelId", data.aiModelId || "");
            form.setValue("width", data.widthCm ? (data.widthCm * 10).toString() : "");
            form.setValue("height", data.heightCm ? (data.heightCm * 10).toString() : "");
            form.setValue("thickness", data.thicknessMm ? data.thicknessMm.toString() : "");
            form.setValue("material", data.material || "");
            form.setValue("sourceLinks", [`internal:${data.id}`]);
            form.setValue("ideaSource", "partner");
            toast.info("Đã tải kích thước từ ý tưởng gốc");
          }
        })
        .catch(() => toast.error("Không thể tải thông tin ý tưởng gốc"));
    }
  }, [cloneFrom, form]);

  useEffect(() => {
    if (!cloneFrom) {
      apiFetch("/api/ideas/draft").then((res) => {
        if (res.data?.data) {
          form.reset(res.data.data);
          const draftTime = new Date(res.data.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          setLastSaved(draftTime);
          setShowDraftBanner(true);
          setIsFlashing(true);
          setTimeout(() => setIsFlashing(false), 1500);
        }
      });
    }
  }, [cloneFrom, form]);

  const handleClearDraft = () => {
    apiFetch("/api/ideas/draft", { method: "DELETE" }).then(() => {
      form.reset({
        autoGenerateMsku: true, manualMsku: "", topicId: "", aiModelId: "", ideaSource: "employee",
        partnerId: "", mainImageUrl: "", designFileUrl: "", prompt: "", sourceLinks: [""],
        title: "", description: "", bulletPoints: ["", "", "", "", ""], tags: "", slugs: "",
        width: "", height: "", thickness: "", material: ""
      });
      setShowDraftBanner(false);
      setLastSaved(null);
    });
  };

  useEffect(() => {
    const subscription = form.watch((value, { type }) => {
      if (!type) return;

      const isBasicallyEmpty = !value.topicId && !value.aiModelId && !value.title && !value.description && !value.tags && !value.slugs && !value.itemHighlights && !value.width && !value.height && !value.thickness && !value.material && (!value.sourceLinks || value.sourceLinks.join("") === "") && (!value.bulletPoints || value.bulletPoints.join("") === "") && !value.prompt && !value.mainImageUrl && !value.designFileUrl && !value.partnerId && !value.manualMsku;
      if (isBasicallyEmpty) return;

      latestDataRef.current = value;
      setShowDraftBanner(false);
      setIsSavingDraft(true);

      if (saveTimeout.current) clearTimeout(saveTimeout.current);

      saveTimeout.current = setTimeout(() => {
        const timeString = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        apiFetch("/api/ideas/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(value)
        }).then(() => {
          setLastSaved(timeString);
          setIsSavingDraft(false);
        });
      }, 1500);
    });
    return () => {
      subscription.unsubscribe();
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [form.watch]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (form.formState.isDirty && latestDataRef.current) {
        const blob = new Blob([JSON.stringify(latestDataRef.current)], { type: 'application/json' });
        navigator.sendBeacon('/api/ideas/draft', blob);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form.formState.isDirty]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        const submitBtn = document.getElementById("submit-btn");
        if (submitBtn) submitBtn.click();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [form]);


  const onSubmit = async (values: any) => {
    let hasError = false;

    // Manual Validations
    if (!values.autoGenerateMsku && (!values.manualMsku || values.manualMsku.trim() === "")) {
      form.setError("manualMsku", { message: "Vui lòng nhập MSKU" });
      hasError = true;
    }
    if (values.ideaSource === "partner") {
      if (!values.partnerId) {
        form.setError("partnerId", { message: "Vui lòng chọn đối tác" });
        hasError = true;
      }
      if (!values.mainImageUrl || values.mainImageUrl.trim() === "") {
        form.setError("mainImageUrl", { message: "Vui lòng nhập link ảnh" });
        hasError = true;
      }
      if (!values.designFileUrl || values.designFileUrl.trim() === "") {
        form.setError("designFileUrl", { message: "Đối tác bắt buộc phải có file thiết kế" });
        hasError = true;
      }
    } else {
      // Nội bộ
      if (!values.mainImageUrl || values.mainImageUrl.trim() === "") {
        form.setError("mainImageUrl", { message: "Vui lòng nhập link ảnh" });
        hasError = true;
      }
      if (!isManagement && (!values.prompt || values.prompt.trim() === "")) {
        form.setError("prompt", { message: "Vui lòng nhập prompt" });
        hasError = true;
      }
    }

    // Dimensions are mandatory for all sources
    if (!values.width || values.width.trim() === "" || isNaN(parseFloat(values.width))) {
      form.setError("width", { message: "Bắt buộc" });
      hasError = true;
    }
    if (!values.height || values.height.trim() === "" || isNaN(parseFloat(values.height))) {
      form.setError("height", { message: "Bắt buộc" });
      hasError = true;
    }
    if (!values.thickness || values.thickness.trim() === "" || isNaN(parseFloat(values.thickness))) {
      form.setError("thickness", { message: "Bắt buộc" });
      hasError = true;
    }

    if (hasError) return;

    // Translation Layer: UI Units -> DB Units
    let dbWidthCm: number | undefined = undefined;
    let dbHeightCm: number | undefined = undefined;
    let dbThicknessMm: number | undefined = undefined;

    if (values.width && !isNaN(parseFloat(values.width))) {
      dbWidthCm = useMetrics ? parseFloat(values.width) / 10 : parseFloat(values.width) * 2.54;
    }
    if (values.height && !isNaN(parseFloat(values.height))) {
      dbHeightCm = useMetrics ? parseFloat(values.height) / 10 : parseFloat(values.height) * 2.54;
    }
    if (values.thickness && !isNaN(parseFloat(values.thickness))) {
      dbThicknessMm = useMetrics ? parseFloat(values.thickness) : parseFloat(values.thickness) * 25.4;
    }

    setLoading(true);
    try {
      const { data, error } = await apiFetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoGenerateMsku: values.autoGenerateMsku,
          manualMsku: values.autoGenerateMsku ? undefined : values.manualMsku,
          topicId: values.topicId,
          aiModelId: values.aiModelId,
          prompt: values.prompt || "Từ đối tác",
          mainImageUrl: values.mainImageUrl,
          designFileUrl: values.designFileUrl || undefined,
          sourceLinks: values.sourceLinks.filter((l: string) => l.trim()),
          title: values.title || undefined,
          description: values.description || undefined,
          bulletPoints: values.bulletPoints.filter((b: string) => b.trim()),
          tags: values.tags || undefined,
          slugs: values.slugs || undefined,
          widthCm: dbWidthCm,
          heightCm: dbHeightCm,
          thicknessMm: dbThicknessMm,
          material: values.material || undefined,
          source: values.ideaSource,
          partnerId: values.ideaSource === "partner" ? values.partnerId : undefined,
        })
      });

      if (data) {
        await apiFetch("/api/ideas/draft", { method: "DELETE" });
        form.reset();
        setShowDraftBanner(false);
        setLastSaved(null);
        import("canvas-confetti").then((confetti) => {
          confetti.default({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        });
        setTimeout(() => router.push("/ideas"), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const onError = (errors: any) => {
    toast.error("Vui lòng điền đầy đủ các thông tin bắt buộc", { position: "top-center" });
  };


if (!isReady) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-background items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">Đang tải cấu hình hệ thống...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10 max-w-5xl mx-auto">

      {/* Hybrid UX Draft Banner */}
      {showDraftBanner && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] bg-background/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-xl flex flex-col gap-3 animate-in slide-in-from-bottom-8 fade-in duration-500">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-full shrink-0">
              <RefreshCw className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 pr-6">
              <p className="text-sm font-medium text-foreground leading-tight">Khôi phục bản nháp tự động</p>
              <p className="text-xs text-muted-foreground mt-1">Tiếp tục chỉnh sửa hoặc làm mới để tạo ý tưởng khác.</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-1">
            <Button variant="outline" size="sm" onClick={handleClearDraft} className="h-8">
              Làm mới từ đầu
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDraftBanner(false)}
              className="h-8 text-muted-foreground"
            >
              Tiếp tục nháp
            </Button>
          </div>
          
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground rounded-full"
            onClick={() => setShowDraftBanner(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/ideas"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex items-baseline gap-4">
          <h1 className="text-2xl font-bold tracking-tight">
            {cloneFrom ? "Sao chép ý tưởng" : "Tạo ý tưởng mới"}
          </h1>
          {(isSavingDraft || lastSaved) && (
            <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5 transition-all">
              {isSavingDraft ? (
                <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              )}
              {isSavingDraft ? "Đang lưu nháp..." : `Đã lưu lên đám mây lúc ${lastSaved}`}
            </span>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Cột Trái (Col 8) */}
            <div className="lg:col-span-8 space-y-6">

              <Card>
                <CardHeader><CardTitle className="text-base">Nguồn ý tưởng & Ảnh</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-6">

                  {/* Left: Preview Square */}
                  <LivePreviewImage control={form.control} />

                  {/* Right: Inputs */}
                  <div className="md:col-span-7 lg:col-span-8 space-y-4">
                    <FormField
                      control={form.control}
                      name="mainImageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ảnh main (Google Drive) <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="https://drive.google.com/file/d/..." {...field} className={getHighlight(field.value)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="designFileUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            File thiết kế
                            {ideaSource === "partner" ? <span className="text-destructive ml-1">*</span> : <span className="text-muted-foreground ml-1 font-normal">(Tuỳ chọn)</span>}
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Link Google Drive file DXF/Ai..." {...field} className={getHighlight(field.value)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="prompt"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>
                            Prompt {ideaSource !== "partner" && !isManagement && <span className="text-destructive">*</span>}
                            {isManagement && ideaSource !== "partner" && <span className="text-muted-foreground font-normal ml-1">(Tuỳ chọn đối với Quản lý)</span>}
                          </FormLabel>
                          <FormControl>
                            <ScrollArea className={`h-[120px] w-full rounded-md border ${fieldState.error ? 'border-destructive ring-1 ring-destructive' : 'border-input'} ${getHighlight(field.value)}`}>
                              <Textarea placeholder="Prompt..." className="min-h-[120px] border-0 focus-visible:ring-0 resize-none p-3" {...field} />
                            </ScrollArea>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <SourceLinksField />
                  </div>
                </CardContent>
              </Card>

              <div
                className="overflow-hidden transition-all duration-500 ease-in-out"
                style={{
                  maxHeight: ideaSource === "partner" ? "0px" : "2000px",
                  opacity: ideaSource === "partner" ? 0 : 1,
                }}
              >
                <Card>
                  <CardHeader><CardTitle className="text-base">Nội dung sản phẩm</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tiêu đề</FormLabel>
                          <FormControl><Input placeholder="Tiêu đề..." {...field} className={getHighlight(field.value)} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="itemHighlights"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Highlights</FormLabel>
                          <FormControl><Input placeholder="Điểm nổi bật đặc biệt cho Amazon..." {...field} className={getHighlight(field.value)} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mô tả</FormLabel>
                          <FormControl><Textarea placeholder="Mô tả..." rows={3} {...field} className={getHighlight(field.value)} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <Label className="text-sm">5 Bullet Points</Label>
                      <BulletPointsField isFlashing={isFlashing} />
                    </div>
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tags (Cách nhau bằng dấu chấm phẩy)</FormLabel>
                          <FormControl><Input placeholder="tag1; tag2; tag3" {...field} className={getHighlight(field.value)} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="slugs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slugs (SEO ảnh - mỗi slug 1 dòng)</FormLabel>
                          <FormControl><Textarea placeholder="slug-1&#10;slug-2" rows={4} {...field} className={`font-mono ${getHighlight(field.value)}`} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Cột Phải (Col 4) - Sticky */}
            <div className="lg:col-span-4 space-y-6 sticky top-4 self-start">

              <Card>
                <CardHeader><CardTitle className="text-base">Cài đặt chung</CardTitle></CardHeader>
                <CardContent>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="autoGenerateMsku"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel>Tự động sinh MSKU</FormLabel>
                        </FormItem>
                      )}
                    />

                    {!autoGenerateMsku && (
                      <FormField
                        control={form.control}
                        name="manualMsku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>MSKU thủ công</FormLabel>
                            <FormControl><Input placeholder="VD: MSKU-123" {...field} className={getHighlight(field.value)} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="topicId"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between mb-1">
                            <FormLabel>Chủ đề <span className="text-destructive">*</span></FormLabel>
                            <Button type="button" variant="ghost" size="icon" className="h-4 w-4" onClick={fetchTopics}><RefreshCw className="h-3 w-3 text-muted-foreground" /></Button>
                          </div>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={getHighlight(field.value)}><SelectValue placeholder="Chọn chủ đề" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {topics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="aiModelId"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between mb-1">
                            <FormLabel>AI Model <span className="text-destructive">*</span></FormLabel>
                            <Button type="button" variant="ghost" size="icon" className="h-4 w-4" onClick={fetchAiModels}><RefreshCw className="h-3 w-3 text-muted-foreground" /></Button>
                          </div>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={getHighlight(field.value)}><SelectValue placeholder="Chọn AI model" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {aiModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ideaSource"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 py-1">
                          <FormControl>
                            <Switch
                              checked={field.value === "partner"}
                              onCheckedChange={(v) => field.onChange(v ? "partner" : "employee")}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal cursor-pointer select-none">
                            Sản phẩm của đối tác?
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <div
                      className="overflow-hidden transition-all duration-300 ease-in-out"
                      style={{ maxHeight: ideaSource === "partner" ? "120px" : "0px", opacity: ideaSource === "partner" ? 1 : 0 }}
                    >
                      <FormField
                        control={form.control}
                        name="partnerId"
                        render={({ field }) => (
                          <FormItem className="pt-2">
                            <FormLabel className="text-sm font-medium">Đối tác <span className="text-destructive">*</span></FormLabel>
                            <div className="flex gap-2 items-center">
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className={`flex-1 ${getHighlight(field.value)}`}><SelectValue placeholder="Chọn đối tác..." /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={fetchPartners}>
                                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Thông số kỹ thuật</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Sửa items-end thành items-start để các label luôn thẳng hàng từ trên xuống */}
                  <div className="grid grid-cols-[1fr_1fr_1fr_90px] gap-2 items-start">
                    <FormField
                      control={form.control}
                      name="width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Rộng <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder={useMetrics ? "200" : "8"} {...field} className={getHighlight(field.value)} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Cao <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder={useMetrics ? "250" : "10"} {...field} className={getHighlight(field.value)} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="thickness"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Dày <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder={useMetrics ? "3" : "0.12"} {...field} className={getHighlight(field.value)} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    
                    {/* Sửa lại cột Đơn vị: Dùng space-y-2 giống hệt FormItem để canh đều hoàn hảo */}
                    <div className="space-y-2">
                      <Label className="text-xs block">Đơn vị</Label>
                      <Select
                        value={useMetrics ? "mm" : "in"}
                        onValueChange={(v) => setUseMetrics(v === "mm")}
                      >
                        <SelectTrigger className="h-10"> {/* Ép chiều cao bằng với Input mặc định */}
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="min-w-[90px]">
                          <SelectItem value="mm">mm</SelectItem>
                          <SelectItem value="in">inches</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="material"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Vật liệu</FormLabel>
                        <FormControl><Input placeholder="VD: Gỗ MDF, Acrylic..." {...field} className={getHighlight(field.value)} /></FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-3">
                  <Button id="submit-btn" type="submit" disabled={loading} className="w-full h-12 text-md font-medium">
                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Lưu ý tưởng (⌘ ↵)
                  </Button>
                  <Button type="button" variant="outline" asChild className="w-full">
                    <Link href="/ideas">Huỷ</Link>
                  </Button>
                </CardContent>
              </Card>

            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
