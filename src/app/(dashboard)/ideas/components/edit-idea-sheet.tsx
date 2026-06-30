"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Search, Sparkles, X, Save, Pencil, GitCompareArrows, RefreshCw } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DiffViewer, DiffField } from "@/components/ui/diff-viewer";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  prompt: z.string().optional(),
  topicId: z.string().optional(),
  aiModelId: z.string().optional(),
  widthCm: z.string().optional(),
  heightCm: z.string().optional(),
  thicknessMm: z.string().optional(),
  material: z.string().optional(),
  sourceLinks: z.array(z.object({ value: z.string() })).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditIdeaSheetProps {
  idea: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topics: { id: string; name: string }[];
  aiModels: { id: string; name: string }[];
  onSuccess: (updatedIdea: any) => void;
  onConflict?: () => void;
  externalConflictData?: any;
  externalConflictBy?: string;
  onClearConflict?: () => void;
}

export function EditIdeaSheet({
  idea,
  open,
  onOpenChange,
  topics,
  aiModels,
  onSuccess,
  onConflict,
  externalConflictData,
  externalConflictBy,
  onClearConflict,
}: EditIdeaSheetProps) {
  const [dimensionUnit, setDimensionUnit] = useState<"mm" | "cm" | "in">("cm");
  const [internalSearch, setInternalSearch] = useState("");
  const [internalResults, setInternalResults] = useState<any[]>([]);
  const [isSearchingInternal, setIsSearchingInternal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tick, setTick] = useState(0);

  const [localConflictData, setLocalConflictData] = useState<any>(null);
  const [localConflictBy, setLocalConflictBy] = useState<string>("");

  const activeConflictData = externalConflictData || localConflictData;
  const activeConflictBy = externalConflictBy || localConflictBy;

  const handleCloseConflict = () => {
    setLocalConflictData(null);
    setLocalConflictBy("");
    if (onClearConflict) onClearConflict();
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      topicId: "",
      aiModelId: "",
      widthCm: "",
      heightCm: "",
      thicknessMm: "",
      material: "",
      sourceLinks: [{ value: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sourceLinks",
  });

  // Reset form when opened or idea changes
  useEffect(() => {
    if (open && idea) {
      let parsedLinks = [""];
      if (idea.sourceLinks) {
        try {
          parsedLinks = JSON.parse(idea.sourceLinks);
          if (!Array.isArray(parsedLinks) || parsedLinks.length === 0) {
            parsedLinks = [""];
          }
        } catch { }
      }
      
      // Default to mm to keep all dimensions in the same unit
      setDimensionUnit("mm");
      form.reset({
        prompt: idea.prompt || "",
        topicId: idea.topicId || "",
        aiModelId: idea.aiModelId || "",
        widthCm: idea.widthCm ? (Number(idea.widthCm) * 10).toString() : "", // DB cm → form mm
        heightCm: idea.heightCm ? (Number(idea.heightCm) * 10).toString() : "", // DB cm → form mm
        thicknessMm: idea.thicknessMm ? idea.thicknessMm.toString() : "", // DB mm → form mm (no conversion)
        material: idea.material || "",
        sourceLinks: parsedLinks.map(l => ({ value: l })),
      });
    }
  }, [open, idea, form]);

  const handleSearchInternal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalSearch.trim()) return;
    setIsSearchingInternal(true);
    try {
      const res = await fetch(`/api/ideas?search=${encodeURIComponent(internalSearch)}&pageSize=5`);
      if (res.ok) {
        const data = await res.json();
        setInternalResults(data.data || []);
      }
    } finally {
      setIsSearchingInternal(false);
    }
  };

  const handleUnitChange = (v: "mm" | "cm" | "in") => {
    if (v === dimensionUnit) return;
    
    const w = form.getValues("widthCm");
    const h = form.getValues("heightCm");
    const t = form.getValues("thicknessMm");

    const convert = (val: string | undefined) => {
      if (!val) return "";
      const num = Number(val);
      const mm = dimensionUnit === "mm" ? num : dimensionUnit === "cm" ? num * 10 : num * 25.4;
      const target = v === "mm" ? mm : v === "cm" ? mm / 10 : mm / 25.4;
      return Number.isInteger(target) ? target.toString() : target.toFixed(2);
    };

    form.setValue("widthCm", convert(w));
    form.setValue("heightCm", convert(h));
    form.setValue("thicknessMm", convert(t));
    setDimensionUnit(v);
  };

  const handleSaveData = async (values: FormValues, overrideVersion?: number) => {
    setSaving(true);
    try {
      let w = values.widthCm ? Number(values.widthCm) : null;
      let h = values.heightCm ? Number(values.heightCm) : null;
      let t = values.thicknessMm ? Number(values.thicknessMm) : null;

      // Convert UI unit to mm
      if (w !== null) w = dimensionUnit === "mm" ? w : dimensionUnit === "cm" ? w * 10 : w * 25.4;
      if (h !== null) h = dimensionUnit === "mm" ? h : dimensionUnit === "cm" ? h * 10 : h * 25.4;
      if (t !== null) t = dimensionUnit === "mm" ? t : dimensionUnit === "cm" ? t * 10 : t * 25.4;

      // Convert mm to DB unit (w, h in cm; t in mm)
      if (w !== null) w = Number((w / 10).toFixed(2));
      if (h !== null) h = Number((h / 10).toFixed(2));
      if (t !== null) t = Number(t.toFixed(2));

      const sourceLinks = values.sourceLinks?.map(l => l.value).filter(l => l.trim()) || [];

      const payload = {
        prompt: values.prompt,
        topicId: values.topicId,
        aiModelId: values.aiModelId,
        widthCm: w,
        heightCm: h,
        thicknessMm: t,
        material: values.material,
        sourceLinks: JSON.stringify(sourceLinks),
        version: overrideVersion ?? idea.version
      };

      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedIdea = await res.json();
        onSuccess(updatedIdea);
        toast.success("Lưu thành công");
        onOpenChange(false);
      } else if (res.status === 409) {
        toast.error("Dữ liệu đã bị thay đổi bởi người khác. Đang tải phiên bản mới nhất...");
        try {
          const fetchRes = await fetch(`/api/ideas/${idea.id}`, { cache: "no-store" });
          if (fetchRes.ok) {
            const serverData = await fetchRes.json();
            setLocalConflictData(serverData);
            setLocalConflictBy("Người dùng khác");
          }
        } catch {
          toast.error("Không thể tải dữ liệu mới nhất.");
        }
        if (onConflict) onConflict();
      } else {
        const error = await res.json();
        toast.error(error.error || "Lỗi lưu dữ liệu");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    return handleSaveData(values);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                disabled={(idea?.amazonListing?.listingStatus === "published" || idea?.etsyListing?.listingStatus === "published")}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </SheetTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent sideOffset={5} className="z-[100]">Sửa prompt & ảnh</TooltipContent>
      </Tooltip>
      
      <SheetContent side="right" className="w-[800px] sm:max-w-[800px] p-0 z-[100] flex flex-col h-full" onInteractOutside={(e) => e.preventDefault()}>
        <SheetHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <SheetTitle className="text-xl">Chỉnh sửa thông tin</SheetTitle>
          <SheetDescription className="text-sm mt-1">{idea?.msku}</SheetDescription>
        </SheetHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">
              
              <FormField
                control={form.control}
                name="topicId"
                render={({ field }: { field: any }) => (
                  <FormItem className="space-y-1.5">
                    <Label className="text-xs font-medium">Chủ đề sản phẩm</Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Chọn chủ đề" /></SelectTrigger>
                      </FormControl>
                      <SelectContent className="z-[200]">
                        {topics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="aiModelId"
                render={({ field }: { field: any }) => (
                  <FormItem className="space-y-1.5">
                    <Label className="text-xs font-medium">AI Model</Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Chọn model" /></SelectTrigger>
                      </FormControl>
                      <SelectContent className="z-[200]">
                        {aiModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Kích thước</Label>
                <div className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name="widthCm"
                    render={({ field }: { field: any }) => (
                      <Input type="number" placeholder="Rộng" className="h-8 text-sm flex-1" {...field} />
                    )}
                  />
                  <span className="text-muted-foreground text-xs">x</span>
                  <FormField
                    control={form.control}
                    name="heightCm"
                    render={({ field }: { field: any }) => (
                      <Input type="number" placeholder="Cao" className="h-8 text-sm flex-1" {...field} />
                    )}
                  />
                  <span className="text-muted-foreground text-xs">x</span>
                  <FormField
                    control={form.control}
                    name="thicknessMm"
                    render={({ field }: { field: any }) => (
                      <Input type="number" placeholder="Dày" className="h-8 text-sm flex-1" {...field} />
                    )}
                  />
                  <Select value={dimensionUnit} onValueChange={handleUnitChange}>
                    <SelectTrigger className="h-8 w-20 text-xs shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[200]">
                      <SelectItem value="mm">mm</SelectItem>
                      <SelectItem value="cm">cm</SelectItem>
                      <SelectItem value="in">in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <FormField
                control={form.control}
                name="material"
                render={({ field }: { field: any }) => (
                  <FormItem className="space-y-1.5">
                    <Label className="text-xs font-medium">Vật liệu</Label>
                    <FormControl>
                      <Input className="h-8 text-sm" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Source Links</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2">
                        <Search className="h-3 w-3 mr-1" /> Tìm nội bộ
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3 z-[200]" align="end" side="right">
                      <div className="flex gap-2">
                        <Input 
                          value={internalSearch} 
                          onChange={e => setInternalSearch(e.target.value)} 
                          onKeyDown={e => e.key === "Enter" && handleSearchInternal(e as any)}
                          placeholder="Nhập MSKU hoặc Tên..." 
                          className="h-8 text-xs" 
                        />
                        <Button type="button" onClick={handleSearchInternal} size="sm" className="h-8 px-2" disabled={isSearchingInternal}>
                          {isSearchingInternal ? <Loader2 className="h-3 w-3 animate-spin" /> : "Tìm"}
                        </Button>
                      </div>
                      <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                        {internalResults.map(res => (
                          <div key={res.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-xs">
                            <span className="font-medium truncate max-w-[150px]" title={res.msku}>{res.msku}</span>
                            <Button 
                              type="button" 
                              size="sm" 
                              variant="outline" 
                              className="h-6 px-2 text-[10px]" 
                              onClick={() => {
                                const current = form.getValues("sourceLinks") || [];
                                const last = current[current.length - 1];
                                if (!last || !last.value) {
                                  form.setValue(`sourceLinks.${current.length > 0 ? current.length - 1 : 0}.value`, `internal:${res.id}`);
                                } else {
                                  append({ value: `internal:${res.id}` });
                                }
                                toast.success("Đã thêm link nội bộ");
                              }}
                            >
                              Thêm
                            </Button>
                          </div>
                        ))}
                        {internalResults.length === 0 && !isSearchingInternal && internalSearch && (
                          <div className="text-xs text-muted-foreground text-center py-2">Không tìm thấy kết quả phù hợp</div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <FormField
                      control={form.control}
                      name={`sourceLinks.${index}.value`}
                      render={({ field }: { field: any }) => (
                        <Input placeholder="https:// hoặc internal:ID" className="h-8 text-sm" {...field} />
                      )}
                    />
                    {fields.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 shrink-0" 
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {fields.length < 5 && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs" 
                    onClick={() => append({ value: "" })}
                  >
                    <Plus className="mr-1 h-3 w-3" />Thêm link
                  </Button>
                )}
              </div>

              <FormField
                control={form.control}
                name="prompt"
                render={({ field }: { field: any }) => (
                  <FormItem className="flex-1 flex flex-col min-h-[150px] mt-2 space-y-0">
                    <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5 shrink-0">
                      <Sparkles className="h-3 w-3 text-amber-500" /> Prompt
                    </Label>
                    <FormControl>
                      <Textarea placeholder="Nhập prompt..." className="flex-1 resize-none text-sm p-3" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t bg-muted/20">
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                <X className="h-4 w-4 mr-1" /> Đặt lại
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} 
                Lưu
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>

      <Dialog open={!!activeConflictData} onOpenChange={(open) => { if (!open) handleCloseConflict(); }}>
        <DialogContent showCloseButton={false} className="sm:max-w-5xl max-h-[90vh] p-0 flex flex-col z-[300] overflow-hidden">
          <div className="shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <GitCompareArrows className="h-5 w-5 text-amber-500" />
                Xung đột dữ liệu
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>{activeConflictBy}</strong> vừa cập nhật ý tưởng này. Bạn có thể đồng bộ từng trường hoặc ghi đè toàn bộ.
              </p>
            </DialogHeader>
          </div>

          {activeConflictData && (() => {
            const formValues = form.getValues();
            const myTopic = topics.find((t: any) => t.id === formValues.topicId)?.name || formValues.topicId || "";
            const serverTopic = activeConflictData.topic?.name || "";
            const myModel = aiModels.find((m: any) => m.id === formValues.aiModelId)?.name || formValues.aiModelId || "";
            const serverModel = activeConflictData.aiModel?.name || "";
            // Convert form values to mm for consistent display
            const formToMm = (val: string | undefined, isMm: boolean) => {
              if (!val) return "—";
              const num = Number(val);
              if (isMm) return num; // thicknessMm field is already the value in current unit
              const mm = dimensionUnit === "mm" ? num : dimensionUnit === "cm" ? num * 10 : num * 25.4;
              return mm;
            };
            const myW = formToMm(formValues.widthCm, false);
            const myH = formToMm(formValues.heightCm, false);
            const myT = formToMm(formValues.thicknessMm, false);
            const myDims = myW !== "—" ? `${myW} × ${myH} × ${myT} mm` : "—";
            const serverDims = activeConflictData.widthCm 
              ? `${Number(activeConflictData.widthCm) * 10} × ${Number(activeConflictData.heightCm) * 10} × ${activeConflictData.thicknessMm} mm` 
              : "—";
            const myMaterial = formValues.material || "—";
            const serverMaterial = activeConflictData.material || "—";
            const myLinks = formValues.sourceLinks?.map(l => l.value).filter(l => l.trim()).join("\n") || "—";
            const serverLinks = (() => { try { return (JSON.parse(activeConflictData.sourceLinks || "[]") as string[]).join("\n") || "—"; } catch { return "—"; } })();
            const myPrompt = formValues.prompt || "—";
            const serverPrompt = activeConflictData.prompt || "—";

            const fields: DiffField[] = [
              { key: "topicId", label: "Chủ đề sản phẩm", leftVal: myTopic, rightVal: serverTopic },
              { key: "aiModelId", label: "AI Model", leftVal: myModel, rightVal: serverModel },
              { key: "dims", label: "Kích thước", leftVal: myDims, rightVal: serverDims },
              { key: "material", label: "Vật liệu", leftVal: myMaterial, rightVal: serverMaterial },
              { key: "sourceLinks", label: "Source Links", leftVal: myLinks, rightVal: serverLinks },
              { key: "prompt", label: "Prompt", leftVal: myPrompt, rightVal: serverPrompt, isLongText: true },
            ];

            const handleSyncField = (key: string) => {
              const opts = { shouldDirty: true, shouldValidate: true };
              if (key === "dims") {
                form.setValue("widthCm", activeConflictData.widthCm ? (activeConflictData.widthCm * 10).toString() : "", opts);
                form.setValue("heightCm", activeConflictData.heightCm ? (activeConflictData.heightCm * 10).toString() : "", opts);
                form.setValue("thicknessMm", activeConflictData.thicknessMm ? activeConflictData.thicknessMm.toString() : "", opts);
                setDimensionUnit("mm");
              } else if (key === "sourceLinks") {
                const parsedLinks = (() => { try { return JSON.parse(activeConflictData.sourceLinks || "[]"); } catch { return [""]; } })();
                form.setValue("sourceLinks", parsedLinks.length > 0 ? parsedLinks.map((l: string) => ({ value: l })) : [{ value: "" }], opts);
              } else {
                form.setValue(key as any, activeConflictData[key] || "", opts);
              }
              setTick(t => t + 1); // Force re-render to update DiffViewer
            };

            return (
              <DiffViewer 
                fields={fields} 
                onSyncField={handleSyncField} 
              />
            );
          })()}

          <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t bg-muted/20">
            <Button variant="outline" onClick={handleCloseConflict}>
              Đóng
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const parsedLinks = (() => { try { return JSON.parse(activeConflictData.sourceLinks || "[]"); } catch { return [""]; } })();
                setDimensionUnit("mm");
                form.reset({
                  prompt: activeConflictData.prompt || "",
                  topicId: (activeConflictData.topicId || "") as string,
                  aiModelId: (activeConflictData.aiModelId || "") as string,
                  widthCm: activeConflictData.widthCm ? (activeConflictData.widthCm * 10).toString() : "",
                  heightCm: activeConflictData.heightCm ? (activeConflictData.heightCm * 10).toString() : "",
                  thicknessMm: activeConflictData.thicknessMm ? activeConflictData.thicknessMm.toString() : "",
                  material: activeConflictData.material || "",
                  sourceLinks: parsedLinks.length > 0 ? parsedLinks.map((l: string) => ({ value: l })) : [{ value: "" }]
                });
                handleCloseConflict();
                toast.success("Đã áp dụng toàn bộ phiên bản từ server.");
              }}
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Lấy toàn bộ từ Server
            </Button>
            <Button
              variant="default"
              onClick={() => handleSaveData(form.getValues(), activeConflictData.version)}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Lưu bản gộp (Merge & Save)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
