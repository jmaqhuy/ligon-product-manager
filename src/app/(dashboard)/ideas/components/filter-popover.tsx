
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Filter, X } from "lucide-react";
import {
  ideaStatusLabels,
  photoStatusLabels,
  listingStatusLabels,
  fileStatusLabels,
} from "@/types";
import { MonthPicker } from "@/components/month-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FilterPopover({ isEmployee, topics = [] }: { isEmployee: boolean, topics: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Internal state for filters
  const [ideaStatus, setIdeaStatus] = useState<string[]>([]);
  const [fileStatus, setFileStatus] = useState<string[]>([]);
  const [amazonStatus, setAmazonStatus] = useState<string[]>([]);
  const [amazonPhotoStatus, setAmazonPhotoStatus] = useState<string[]>([]);
  const [etsyStatus, setEtsyStatus] = useState<string[]>([]);
  const [etsyPhotoStatus, setEtsyPhotoStatus] = useState<string[]>([]);
  const [fulfillmentType, setFulfillmentType] = useState<string>("");
  const [showMine, setShowMine] = useState(isEmployee);
  const [topicId, setTopicId] = useState("");
  const [month, setMonth] = useState("");

  // Sync from URL on open
  useEffect(() => {
    if (open) {
      setIdeaStatus(searchParams.get("ideaStatus")?.split(",").filter(Boolean) || []);
      setFileStatus(searchParams.get("fileStatus")?.split(",").filter(Boolean) || []);
      setAmazonStatus(searchParams.get("amazonStatus")?.split(",").filter(Boolean) || []);
      setAmazonPhotoStatus(searchParams.get("amazonPhotoStatus")?.split(",").filter(Boolean) || []);
      setEtsyStatus(searchParams.get("etsyStatus")?.split(",").filter(Boolean) || []);
      setEtsyPhotoStatus(searchParams.get("etsyPhotoStatus")?.split(",").filter(Boolean) || []);
      setFulfillmentType(searchParams.get("fulfillmentType") || "all");
      
      const urlMine = searchParams.get("mine");
      setShowMine(urlMine !== null ? urlMine === "true" : isEmployee);
      setTopicId(searchParams.get("topicId") || "");
      setMonth(searchParams.get("month") || "");
    }
  }, [open, searchParams, isEmployee]);

  const activeCount = 
    (searchParams.get("ideaStatus")?.split(",").filter(Boolean).length || 0) +
    (searchParams.get("fileStatus")?.split(",").filter(Boolean).length || 0) +
    (searchParams.get("amazonStatus")?.split(",").filter(Boolean).length || 0) +
    (searchParams.get("amazonPhotoStatus")?.split(",").filter(Boolean).length || 0) +
    (searchParams.get("etsyStatus")?.split(",").filter(Boolean).length || 0) +
    (searchParams.get("etsyPhotoStatus")?.split(",").filter(Boolean).length || 0) +
    (searchParams.get("fulfillmentType") && searchParams.get("fulfillmentType") !== "all" ? 1 : 0) +
    (searchParams.get("mine") === "true" ? 1 : 0) +
    (searchParams.get("topicId") ? 1 : 0) +
    (searchParams.get("month") ? 1 : 0);

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    
    const setParam = (key: string, arr: string[]) => {
      if (arr.length > 0) params.set(key, arr.join(","));
      else params.delete(key);
    };

    setParam("ideaStatus", ideaStatus);
    setParam("fileStatus", fileStatus);
    setParam("amazonStatus", amazonStatus);
    setParam("amazonPhotoStatus", amazonPhotoStatus);
    setParam("etsyStatus", etsyStatus);
    setParam("etsyPhotoStatus", etsyPhotoStatus);

    if (fulfillmentType && fulfillmentType !== "all") params.set("fulfillmentType", fulfillmentType);
    else params.delete("fulfillmentType");

    if (showMine) params.set("mine", "true");
    else params.set("mine", "false");

    if (topicId && topicId !== "all") params.set("topicId", topicId);
    else params.delete("topicId");

    if (month) params.set("month", month);
    else params.delete("month");
    
    params.set("page", "1");
    router.replace(`?${params.toString()}`, { scroll: false });
    setOpen(false);
  };

  const clearAll = () => {
    setIdeaStatus([]);
    setFileStatus([]);
    setAmazonStatus([]);
    setAmazonPhotoStatus([]);
    setEtsyStatus([]);
    setEtsyPhotoStatus([]);
    setFulfillmentType("all");
    setShowMine(false);
    setTopicId("");
    setMonth("");
  };

  const applyTemplate = (tab: string) => {
    setIdeaStatus([]); setFileStatus([]); setAmazonStatus([]); setAmazonPhotoStatus([]); setEtsyStatus([]); setEtsyPhotoStatus([]);
    if (tab === "reviewing") {
      setIdeaStatus(["reviewing"]);
    } else if (tab === "photos") {
      setIdeaStatus(["approved"]);
      setAmazonPhotoStatus(["not_requested", "awaiting_photos", "pending_approval", "revision_requested"]);
      setEtsyPhotoStatus(["not_requested", "awaiting_photos", "pending_approval", "revision_requested"]);
    } else if (tab === "ready") {
      setIdeaStatus(["approved"]);
      setAmazonPhotoStatus(["approved"]);
      setEtsyPhotoStatus(["approved"]);
    } else if (tab === "published") {
      setAmazonStatus(["published"]);
      setEtsyStatus(["published"]);
    }
  };

  const toggle = (list: string[], val: string) =>
    list.includes(val) ? list.filter((i) => i !== val) : [...list, val];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 relative">
          <Filter className="w-4 h-4 mr-2" />
          Lọc ý tưởng
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-2 px-1 py-0 h-5 text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[90vw] max-w-[1000px] p-4" align="start">
        <div className="flex items-center justify-between mb-4 pb-2 border-b">
          <h4 className="font-semibold">Bộ lọc</h4>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 px-2 text-muted-foreground">
                <X className="w-4 h-4 mr-1" /> Bỏ chọn
              </Button>
            )}
            <Button size="sm" className="h-8" onClick={applyFilters}>Áp dụng</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-h-[70vh] overflow-y-auto px-1 pb-4">
          
          {/* Cột 1: Nhóm chung chung */}
          <div className="space-y-4">
            <Label className="text-sm font-bold bg-muted px-2 py-1 rounded block text-center">Chung</Label>
            
            <div className="flex items-center space-x-2 bg-muted/50 p-2 rounded-md border">
              <Checkbox id="show-mine" checked={showMine} onCheckedChange={(checked) => setShowMine(!!checked)} />
              <Label htmlFor="show-mine" className="text-sm font-semibold cursor-pointer">Chỉ ý tưởng của tôi</Label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Chủ đề</Label>
              <Select value={topicId} onValueChange={setTopicId}>
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue placeholder="Tất cả chủ đề" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả chủ đề</SelectItem>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tháng</Label>
              <MonthPicker value={month} onChange={setMonth} />
            </div>

            <div className="space-y-1.5 pt-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Mẫu lọc nhanh</Label>
              <div className="flex flex-col gap-2">
                <Button variant="secondary" size="sm" className="justify-start text-xs h-7" onClick={() => applyTemplate("reviewing")}>
                  Chờ xem xét
                </Button>
                <Button variant="secondary" size="sm" className="justify-start text-xs h-7" onClick={() => applyTemplate("photos")}>
                  Chờ làm ảnh
                </Button>
                <Button variant="secondary" size="sm" className="justify-start text-xs h-7" onClick={() => applyTemplate("ready")}>
                  Sẵn sàng đăng
                </Button>
                <Button variant="secondary" size="sm" className="justify-start text-xs h-7" onClick={() => applyTemplate("published")}>
                  Đang bán
                </Button>
              </div>
            </div>
          </div>

          {/* Cột 2: Thuộc Idea */}
          <div className="space-y-4 border-l pl-4">
            <Label className="text-sm font-bold bg-muted px-2 py-1 rounded block text-center">Idea</Label>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider block border-b pb-1">Trạng thái Idea</Label>
              {Object.entries(ideaStatusLabels).map(([k, v]) => (
                <div key={k} className="flex items-center space-x-2">
                  <Checkbox id={`idea-${k}`} checked={ideaStatus.includes(k)} onCheckedChange={() => setIdeaStatus(toggle(ideaStatus, k))} />
                  <Label htmlFor={`idea-${k}`} className="text-xs font-normal cursor-pointer">{v}</Label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider block border-b pb-1 mt-4">Trạng thái File</Label>
              {Object.entries(fileStatusLabels).map(([k, v]) => (
                <div key={k} className="flex items-center space-x-2">
                  <Checkbox id={`file-${k}`} checked={fileStatus.includes(k)} onCheckedChange={() => setFileStatus(toggle(fileStatus, k))} />
                  <Label htmlFor={`file-${k}`} className="text-xs font-normal cursor-pointer">{v}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Cột 3: Nhóm Amazon */}
          <div className="space-y-4 border-l pl-4">
            <Label className="text-sm font-bold bg-muted px-2 py-1 rounded block text-center">Amazon</Label>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider block border-b pb-1">Product Status</Label>
              {Object.entries(listingStatusLabels).map(([k, v]) => (
                <div key={k} className="flex items-center space-x-2">
                  <Checkbox id={`amazon-${k}`} checked={amazonStatus.includes(k)} onCheckedChange={() => setAmazonStatus(toggle(amazonStatus, k))} />
                  <Label htmlFor={`amazon-${k}`} className="text-xs font-normal cursor-pointer">{v}</Label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider block border-b pb-1 mt-4">Image Status</Label>
              {Object.entries(photoStatusLabels).map(([k, v]) => (
                <div key={k} className="flex items-center space-x-2">
                  <Checkbox id={`amz-img-${k}`} checked={amazonPhotoStatus.includes(k)} onCheckedChange={() => setAmazonPhotoStatus(toggle(amazonPhotoStatus, k))} />
                  <Label htmlFor={`amz-img-${k}`} className="text-xs font-normal cursor-pointer">{v}</Label>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 pt-4">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider block border-b pb-1 mb-2">Fulfillment</Label>
              <RadioGroup value={fulfillmentType || "all"} onValueChange={(v) => setFulfillmentType(v === "all" ? "" : v)} className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="r-all" />
                  <Label htmlFor="r-all" className="text-xs font-normal cursor-pointer">Tất cả</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="FBA" id="r-fba" />
                  <Label htmlFor="r-fba" className="text-xs font-normal cursor-pointer">FBA</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="FBM" id="r-fbm" />
                  <Label htmlFor="r-fbm" className="text-xs font-normal cursor-pointer">FBM</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Cột 4: Nhóm Etsy */}
          <div className="space-y-4 border-l pl-4">
            <Label className="text-sm font-bold bg-muted px-2 py-1 rounded block text-center">Etsy</Label>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider block border-b pb-1">Product Status</Label>
              {Object.entries(listingStatusLabels).map(([k, v]) => (
                <div key={k} className="flex items-center space-x-2">
                  <Checkbox id={`etsy-${k}`} checked={etsyStatus.includes(k)} onCheckedChange={() => setEtsyStatus(toggle(etsyStatus, k))} />
                  <Label htmlFor={`etsy-${k}`} className="text-xs font-normal cursor-pointer">{v}</Label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider block border-b pb-1 mt-4">Image Status</Label>
              {Object.entries(photoStatusLabels).map(([k, v]) => (
                <div key={k} className="flex items-center space-x-2">
                  <Checkbox id={`etsy-img-${k}`} checked={etsyPhotoStatus.includes(k)} onCheckedChange={() => setEtsyPhotoStatus(toggle(etsyPhotoStatus, k))} />
                  <Label htmlFor={`etsy-img-${k}`} className="text-xs font-normal cursor-pointer">{v}</Label>
                </div>
              ))}
            </div>
          </div>

        </div>
      </PopoverContent>
    </Popover>
  );
}
