"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Plus,
  Search,
  Eye,
  Loader2,
} from "lucide-react";
import {
  ideaStatusLabels,
  photoStatusLabels,
  type IdeaStatus,
  type PhotoStatus,
  type FulfillmentType,
} from "@/types";
import { convertToDirectImageUrl } from "@/lib/google-drive";

// Status badge colors
function getStatusBadge(status: IdeaStatus) {
  const variants: Record<IdeaStatus, { className: string; label: string }> = {
    reviewing: { className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300", label: ideaStatusLabels.reviewing },
    approved: { className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300", label: ideaStatusLabels.approved },
    published: { className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300", label: ideaStatusLabels.published },
  };
  const v = variants[status];
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
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/ideas/${idea.id}`)}
              >
                <TableCell>
                  <div className="w-10 h-10 rounded border border-dashed border-muted-foreground/30 overflow-hidden bg-muted flex items-center justify-center">
                    {thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl}
                        alt={idea.msku}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <span className="font-mono text-sm font-medium">{idea.msku}</span>
                    {idea.title && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{idea.title}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm hidden md:table-cell">{idea.topicName}</TableCell>
                <TableCell className="text-sm hidden lg:table-cell">{idea.createdByName}</TableCell>
                <TableCell>{getFulfillmentBadge(idea.fulfillmentType)}</TableCell>
                <TableCell>{getStatusBadge(idea.status)}</TableCell>
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
  const [search, setSearch] = useState("");
  const [showMine, setShowMine] = useState(false);
  const [activeTab, setActiveTab] = useState("reviewing");
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab: activeTab });
      if (search) params.set("search", search);
      if (showMine) params.set("mine", "true");

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
  }, [activeTab, search, showMine]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIdeas();
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="reviewing" className="text-xs sm:text-sm">
            Chờ xem xét
          </TabsTrigger>
          <TabsTrigger value="photos" className="text-xs sm:text-sm">
            Chờ làm ảnh
          </TabsTrigger>
          <TabsTrigger value="ready" className="text-xs sm:text-sm">
            Sẵn sàng đăng
          </TabsTrigger>
          <TabsTrigger value="published" className="text-xs sm:text-sm">
            Đã đăng bán
          </TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
}
