"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Bell, BellOff, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useSocket } from "@/components/providers/socket-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "next-themes";
import { useState, useCallback, useEffect } from "react";

const pathLabels: Record<string, string> = {
  dashboard: "Dashboard",
  ideas: "Ý tưởng",
  production: "Sản xuất",
  orders: "Đơn hàng",
  shipments: "Shipment",
  accounts: "Tài khoản",
  tools: "Tools",
  notifications: "Thông báo",
  settings: "Cài đặt",
  new: "Tạo mới",
};

function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <div className="relative group">
      <Button variant="ghost" size="icon">
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>

      <div className="absolute right-0 top-full pt-1 hidden group-hover:block z-50">
        <div className="bg-popover border rounded-md shadow-md p-1 min-w-32">
          <button
            onClick={() => setTheme("light")}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Sun className="h-4 w-4" /> Sáng
          </button>
          <button
            onClick={() => setTheme("dark")}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Moon className="h-4 w-4" /> Tối
          </button>
          <button
            onClick={() => setTheme("system")}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Monitor className="h-4 w-4" /> Hệ thống
          </button>
        </div>
      </div>
    </div>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const segments = pathname.split("/").filter(Boolean);
  const { onlineUsers, unreadCount, notifications: socketNotifications } = useSocket();
  const [notifications, setNotifications] = useState(socketNotifications);

  // Sync local state with socket data when it changes
  useEffect(() => {
    setNotifications(socketNotifications);
  }, [socketNotifications]);

  useEffect(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("initial_history_length")) {
      sessionStorage.setItem("initial_history_length", window.history.length.toString());
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
    } catch {}
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* Breadcrumb */}
      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          {segments.map((segment, index) => {
            const isLast = index === segments.length - 1;
            const href = "/" + segments.slice(0, index + 1).join("/");
            const label = pathLabels[segment] || segment;

            return (
              <span key={href} className="contents">
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={href}>{label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        {/* Online users */}
          <div className="flex items-center -space-x-2 mr-4">
            {onlineUsers.map((u, i) => {
              const isViewingSameIdea =
                pathname.startsWith("/ideas/") && u.currentPath === pathname;
              const userKey = `${u.id}-${i}`;
              return (
                <TooltipProvider key={userKey} delayDuration={0} disableHoverableContent>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar
                        className={`h-8 w-8 border-2 ${isViewingSameIdea ? "border-green-500" : "border-background"} cursor-pointer transition-transform hover:scale-110 z-10 hover:z-20`}
                      >
                        <AvatarImage src={u.avatarUrl || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {u.nameAbbreviation}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent className="pointer-events-none" sideOffset={8}>
                      <p className="font-semibold">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {isViewingSameIdea ? "Đang xem ý tưởng này" : "Đang online"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>

        {/* Notification Bell */}
        <div className="relative group">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
            <span className="sr-only">Thông báo</span>
          </Button>

          <div className="absolute right-0 top-full pt-1 hidden group-hover:block z-50">
            <div className="bg-popover border rounded-md shadow-md w-80">
              <div className="p-3 border-b">
                <h4 className="font-medium text-sm">
                  Thông báo{unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ""}
                </h4>
              </div>
              <div className="max-h-75 overflow-y-auto">
                {notifications && notifications.length > 0 ? (
                  notifications.slice(0, 5).map((n, i) => (
                    <div
                      key={n.id || `notif-${i}-${n.createdAt || ''}`}
                      className={`block p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer ${!n.isRead ? "bg-blue-50/30 dark:bg-blue-950/20" : ""}`}
                      onClick={() => {
                        if (n.id && !n.isRead) markAsRead(n.id);
                        if (n.actionUrl) window.open(n.actionUrl, "_blank");
                        else router.push("/notifications");
                      }}
                    >
                      <div className="flex flex-col gap-1">
                        <span
                          className={`text-sm ${!n.isRead ? "font-medium" : "text-muted-foreground"}`}
                        >
                          {n.message}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {n.createdAt
                            ? new Date(n.createdAt).toLocaleString("vi-VN")
                            : "Vừa xong"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center">
                    <BellOff className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Không có thông báo mới
                    </p>
                  </div>
                )}
              </div>
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-blue-600"
                  asChild
                >
                  <Link href="/notifications">Xem tất cả</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}