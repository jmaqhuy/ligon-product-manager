"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Image as ImageIcon,
  FileText,
  Settings2,
  Loader2,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

function categoryIcon(category: string) {
  switch (category) {
    case "photo": return <ImageIcon className="h-4 w-4" />;
    case "production_file": return <FileText className="h-4 w-4" />;
    case "processing_file": return <Settings2 className="h-4 w-4" />;
    default: return <Bell className="h-4 w-4" />;
  }
}

function priorityBadge(priority: string) {
  const styles: Record<string, string> = {
    urgent: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
    priority: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    normal: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
  };
  const labels: Record<string, string> = { urgent: "Khẩn cấp", priority: "Ưu tiên", normal: "Bình thường" };
  return <Badge variant="outline" className={styles[priority] || ""}>{labels[priority] || priority}</Badge>;
}

const categoryLabels: Record<string, string> = {
  all: "Tất cả",
  photo: "Ảnh",
  production_file: "File sản xuất",
  processing_file: "File xử lý",
  general: "Chung",
};

export default function NotificationsPage() {
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort: sortBy });
      if (category !== "all") params.set("category", category);
      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      console.error("Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  }, [category, sortBy]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      fetchNotifications();
    } catch {
      toast.error("Lỗi");
    }
  };



  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Thông báo</h1>
          <p className="text-muted-foreground text-sm">
            {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Không có thông báo chưa đọc"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Loại" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px]">
            <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Mới nhất trước</SelectItem>
            <SelectItem value="oldest">Cũ nhất trước</SelectItem>
            <SelectItem value="priority">Ưu tiên cao trước</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <BellOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Không có thông báo</h3>
          <p className="text-sm text-muted-foreground">Bạn sẽ nhận thông báo khi có việc cần làm</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const isUnread = !n.isRead;
            return (
              <div key={n.id} className="relative group">
                <Link href={n.actionUrl || "#"} onClick={() => { if (isUnread) markAsRead(n.id); }}>
                  <Card
                    className={`transition-colors cursor-pointer hover:bg-muted/50 ${
                      isUnread ? "border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20" : ""
                    }`}
                  >
                    <CardContent className="flex items-start gap-3 py-3">
                      <div className={`mt-0.5 flex items-center justify-center w-8 h-8 rounded-full ${
                        isUnread ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400" : "bg-muted text-muted-foreground"
                      }`}>
                        {categoryIcon(n.category)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {priorityBadge(n.priority)}
                          <span className="text-xs text-muted-foreground">
                            {new Date(n.createdAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                        <p className={`text-sm mt-1 ${isUnread ? "font-medium" : "text-muted-foreground"}`}>{n.message}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 z-10">
                        {isUnread && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}>
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
