"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, MessageSquareWarning } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyButton } from "@/components/copy-button";
import { convertToDirectImageUrl } from "@/lib/google-drive";
import { ideaStatusLabels, photoStatusLabels, type PhotoStatus, type FulfillmentType, type IdeaStatus } from "@/types";

// Status badge colors
function getStatusBadge(idea: any) {
  const status = idea.status;
  const variants: Record<string, { className: string; label: string }> = {
    reviewing: { className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300", label: ideaStatusLabels.reviewing },
    approved: { className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300", label: ideaStatusLabels.approved },
    revision_requested: { className: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300", label: ideaStatusLabels.revision_requested },
    rejected: { className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300", label: ideaStatusLabels.rejected },
  };
  const v = variants[status] || { className: "bg-gray-100 text-gray-800", label: status };
  const badge = <Badge variant="outline" className={v.className}>{v.label}</Badge>;

  if (idea.reviewComment && idea.status !== "approved") {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <span className="cursor-help">{badge}</span>
          </TooltipTrigger>
          <TooltipContent className={`p-3 max-w-xs border shadow-md ${idea.status === "rejected" ? "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900" : "border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900"}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <MessageSquareWarning className={`h-3 w-3 ${idea.status === "rejected" ? "text-red-600" : "text-orange-600"}`} />
            </div>
            <p className={`text-xs whitespace-pre-wrap ${idea.status === "rejected" ? "text-red-800 dark:text-red-300" : "text-orange-800 dark:text-orange-300"}`}>{idea.reviewComment}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return badge;
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

function getSourceBadge(source: string) {
  switch (source) {
    case "boss":
      return <Badge variant="default" className="bg-purple-600 hover:bg-purple-700 text-xs">Sếp</Badge>;
    case "partner":
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200 text-xs">Đối tác</Badge>;
    default:
      return null;
  }
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
  source: string;
  partnerName: string | null;
}

interface IdeaTableProps {
  ideas: IdeaRow[];
  loading: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (id: string, checked: boolean) => void;
  canSelect: boolean;
  highlightedRowId?: string | null;
}

export function IdeaTable({
  ideas,
  loading,
  selectedIds,
  onSelectionChange,
  canSelect,
  highlightedRowId
}: IdeaTableProps) {
  const router = useRouter();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const allSelected = ideas.length > 0 && ideas.every((i) => selectedIds.has(i.id));

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-500">
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
            {canSelect && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => {
                    ideas.forEach((i) => onSelectionChange(i.id, !!checked));
                  }}
                />
              </TableHead>
            )}
            <TableHead className="w-15">Ảnh</TableHead>
            <TableHead>MSKU</TableHead>
            <TableHead className="hidden md:table-cell">Chủ đề</TableHead>
            <TableHead className="hidden lg:table-cell">Người tạo</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="hidden md:table-cell">Ảnh</TableHead>
            <TableHead className="w-25 hidden sm:table-cell">Ngày tạo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ideas.map((idea) => {
            const thumbUrl = convertToDirectImageUrl(idea.mainImageUrl);
            return (
              <TableRow
                key={idea.id}
                className={`cursor-pointer group/row ${idea.id === highlightedRowId ? "bg-blue-100 dark:bg-blue-900/40 transition-none" : "hover:bg-muted/50 transition-colors duration-1000"}`}
                onClick={() => router.push(`/ideas/${idea.id}`)}
              >
                {canSelect && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(idea.id)}
                      onCheckedChange={(checked) => onSelectionChange(idea.id, !!checked)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  {thumbUrl ? (
                    <div
                      className="w-10 h-10 rounded border border-dashed border-muted-foreground/30 overflow-hidden bg-muted flex items-center justify-center cursor-pointer group/img"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewUrl(thumbUrl);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbUrl}
                        alt={idea.msku}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-125"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
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
                        <p className="text-xs text-muted-foreground truncate max-w-50">{idea.title}</p>
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
                    {getStatusBadge(idea)}
                    {getSourceBadge(idea.source)}
                    {idea.needsReReview && (
                      <Badge variant="destructive" className="bg-red-500 text-white animate-pulse text-[10px] px-1 py-0 h-4">
                        Sửa đổi mới
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-col gap-1">
                    {(idea as any).amazonPhotoStatus && (idea as any).amazonPhotoStatus !== "not_requested" && (
                      <div className="flex items-center gap-1"><span className="text-[10px] text-muted-foreground w-6">AMZ</span> {getPhotoStatusBadge((idea as any).amazonPhotoStatus)}</div>
                    )}
                    {(idea as any).etsyPhotoStatus && (idea as any).etsyPhotoStatus !== "not_requested" && (
                      <div className="flex items-center gap-1"><span className="text-[10px] text-muted-foreground w-6">Etsy</span> {getPhotoStatusBadge((idea as any).etsyPhotoStatus)}</div>
                    )}
                    {(!(idea as any).amazonPhotoStatus || (idea as any).amazonPhotoStatus === "not_requested") && (!(idea as any).etsyPhotoStatus || (idea as any).etsyPhotoStatus === "not_requested") && getPhotoStatusBadge("not_requested")}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                  {new Date(idea.createdAt).toLocaleDateString("vi-VN")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Single Dialog for Image Preview */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-fit bg-transparent border-none shadow-none !ring-0 p-0" showCloseButton={false}>
          <div className="relative flex justify-center items-center p-0" onClick={() => setPreviewUrl(null)}>
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Full view" className="max-h-[95vh] max-w-[95vw] w-auto h-auto rounded-md object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
