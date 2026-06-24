"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Eye,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/copy-button";
import {
  ideaStatusLabels,
  photoStatusLabels,
  type IdeaStatus,
  type PhotoStatus,
  type FulfillmentType,
} from "@/types";
import type { Role } from "@/lib/permissions";
import { convertToDirectImageUrl } from "@/lib/google-drive";

// Status badge colors
function getStatusBadge(status: IdeaStatus) {
  const variants: Record<IdeaStatus, { className: string; label: string }> = {
    reviewing: { className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300", label: ideaStatusLabels.reviewing },
    approved: { className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300", label: ideaStatusLabels.approved },
    published: { className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300", label: ideaStatusLabels.published },
    rejected: { className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300", label: ideaStatusLabels.rejected },
  };
  const v = variants[status] || { className: "bg-gray-100 text-gray-800", label: status };
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
}

function getPhotoStatusBadge(status: PhotoStatus) {
  const variants: Record<PhotoStatus, { className: string; label: string }> = {
    not_requested: { className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400", label: photoStatusLabels.not_requested },
    awaiting_photos: { className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300", label: photoStatusLabels.awaiting_photos },
    pending_approval: { className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300", label: photoStatusLabels.pending_approval },
    revision_requested: { className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300", label: photoStatusLabels.revision_requested },
    approved: { className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300", label: photoStatusLabels.approved },
  };
  const v = variants[status];
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
}

function getFulfillmentBadge(type: FulfillmentType) {
  if (type === "FBA") {
    return <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-1.5">FBA</Badge>;
  }
  return <Badge variant="secondary" className="text-[10px] px-1.5">FBM</Badge>;
}

interface IdeaRow {
  id: string;
  msku: string;
  sku: string;
  mainImageUrl: string;
  status: IdeaStatus;
  photoStatus: PhotoStatus;
  fulfillmentType: FulfillmentType;
  topicName: string;
  createdByName: string;
  createdAt: string;
  title: string | null;
  needsReReview: boolean;
}

function IdeaTable({ ideas, loading }: { ideas: IdeaRow[]; loading: boolean }) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Eye className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Chưa có ý tưởng nào</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Bấm nút &ldquo;Tạo ý tưởng&rdquo; để bắt đầu
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Ảnh</TableHead>
            <TableHead>MSKU</TableHead>
            <TableHead className="hidden md:table-cell">Chủ đề</TableHead>
            <TableHead className="hidden lg:table-cell">Người tạo</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="hidden md:table-cell">Ảnh</TableHead>
            <TableHead className="w-[100px] hidden sm:table-cell">Ngày tạo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ideas.map((idea) => {
            const thumbUrl = convertToDirectImageUrl(idea.mainImageUrl);
            return (
              <TableRow
                key={idea.id}
                className="cursor-pointer hover:bg-muted/50 group/row"
                onClick={() => router.push(`/ideas/${idea.id}`)}
              >
                <TableCell>
                  {thumbUrl ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <div
                          className="w-10 h-10 rounded border border-dashed border-muted-foreground/30 overflow-hidden bg-muted flex items-center justify-center cursor-pointer group/img"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={thumbUrl}
                            alt={idea.msku}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-125"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] w-fit bg-transparent border-none shadow-none" showCloseButton={false} onClick={(e) => e.stopPropagation()}>
                        <div className="relative flex justify-center items-center p-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={thumbUrl} alt="Full view" className="max-h-[95vh] max-w-[95vw] w-auto h-auto rounded-md object-contain" />
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <div className="w-10 h-10 rounded border border-dashed border-muted-foreground/30 overflow-hidden bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">N/A</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-sm font-medium">{idea.msku}</span>
                      {idea.title && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{idea.title}</p>
                      )}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <CopyButton text={idea.msku} className="h-6 w-6 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm hidden md:table-cell">{idea.topicName}</TableCell>
                <TableCell className="text-sm hidden lg:table-cell">{idea.createdByName}</TableCell>
                <TableCell>{getFulfillmentBadge(idea.fulfillmentType)}</TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    {getStatusBadge(idea.status)}
                    {idea.needsReReview && (
                      <Badge variant="destructive" className="bg-red-500 text-white animate-pulse text-[10px] px-1 py-0 h-4">
                        Sửa đổi mới
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{getPhotoStatusBadge(idea.photoStatus)}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                  {new Date(idea.createdAt).toLocaleDateString("vi-VN")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default function IdeasPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const role = session?.user?.role as Role | undefined;
  const isEmployee = role === "employee";

  const urlTab = searchParams.get("tab") || "reviewing";
  const [search, setSearch] = useState("");
  const [showMine, setShowMine] = useState(isEmployee);
  const [activeTab, setActiveTab] = useState(urlTab);
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicId, setTopicId] = useState("");
  const [month, setMonth] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [topics, setTopics] = useState<any[]>([]);

  // Fetch topics for filter
  useEffect(() => {
    fetch("/api/topics").then(r => r.json()).then(setTopics).catch(() => {});
  }, []);

  // Sync URL tab param when it changes
  useEffect(() => {
    const newTab = searchParams.get("tab") || "reviewing";
    setActiveTab(newTab);
  }, [searchParams]);

  // Sync showMine with role changes
  useEffect(() => {
    setShowMine(isEmployee);
  }, [isEmployee]);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab: activeTab });
      if (search) params.set("search", search);
      if (showMine) params.set("mine", "true");
      if (topicId) params.set("topicId", topicId);
      if (month) params.set("month", month);

      const res = await fetch(`/api/ideas?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIdeas(data);
      }
    } catch {
      console.error("Failed to fetch ideas");
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, showMine, topicId, month]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search && activeTab !== "all") {
        setActiveTab("all");
      } else {
        fetchIdeas();
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý ý tưởng</h1>
          <p className="text-muted-foreground text-sm">
            Theo dõi toàn bộ ý tưởng từ đề xuất đến đăng bán
          </p>
        </div>
        <Button asChild>
          <Link href="/ideas/new">
            <Plus className="mr-2 h-4 w-4" />
            Tạo ý tưởng
          </Link>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo SKU / MSKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={topicId} onValueChange={setTopicId}>
          <SelectTrigger className="w-[150px] h-9 text-xs">
            <SelectValue placeholder="Chủ đề" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả chủ đề</SelectItem>
            {topics.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-[160px] h-9 text-xs"
        />

        <div className="flex items-center gap-2 ml-auto">
          <Switch
            id="show-mine"
            checked={showMine}
            onCheckedChange={setShowMine}
          />
          <Label htmlFor="show-mine" className="text-sm cursor-pointer">
            Của tôi
          </Label>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            Tất cả
          </TabsTrigger>
          <TabsTrigger value="reviewing" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            Chờ xem xét
          </TabsTrigger>
          <TabsTrigger value="photos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            Chờ làm ảnh
          </TabsTrigger>
          <TabsTrigger value="ready" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            Sẵn sàng đăng
          </TabsTrigger>
          <TabsTrigger value="published" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            Đã đăng bán
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            Đã bị từ chối
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <IdeaTable ideas={ideas} loading={loading} />
        </TabsContent>

        <TabsContent value="reviewing" className="mt-4">
          <IdeaTable ideas={ideas} loading={loading} />
        </TabsContent>
        <TabsContent value="photos" className="mt-4">
          <IdeaTable ideas={ideas} loading={loading} />
        </TabsContent>
        <TabsContent value="ready" className="mt-4">
          <IdeaTable ideas={ideas} loading={loading} />
        </TabsContent>
        <TabsContent value="published" className="mt-4">
          <IdeaTable ideas={ideas} loading={loading} />
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <IdeaTable ideas={ideas} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
