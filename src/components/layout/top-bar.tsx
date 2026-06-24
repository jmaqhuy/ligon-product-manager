"use client";

import { Input } from "@/components/ui/input";
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
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { useSocket } from "@/components/providers/socket-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";

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

export function TopBar() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const { onlineUsers, unreadCount, notifications } = useSocket();

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

      {/* Search & Notifications */}
      <div className="ml-auto flex items-center gap-2">
        <TooltipProvider>
          <div className="flex items-center -space-x-2 mr-4">
            {onlineUsers.map((u) => {
              const isViewingSameIdea = pathname.startsWith("/ideas/") && u.currentPath === pathname;
              return (
                <Tooltip key={u.id}>
                  <TooltipTrigger asChild>
                    <Avatar className={`h-8 w-8 border-2 ${isViewingSameIdea ? 'border-green-500' : 'border-background'} cursor-pointer transition-transform hover:scale-110 z-10 hover:z-20`}>
                      <AvatarImage src={u.avatarUrl || undefined} />
                      <AvatarFallback className="text-[10px]">{u.nameAbbreviation}</AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{u.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {isViewingSameIdea ? "Đang xem ý tưởng này" : "Đang online"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        <Popover>
          <PopoverTrigger asChild>
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
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex flex-col">
              <div className="p-3 border-b">
                <h4 className="font-medium text-sm">Thông báo</h4>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications && notifications.length > 0 ? (
                  notifications.slice(0, 5).map((n) => (
                    <Link
                      key={n.id || Math.random()}
                      href={n.actionUrl || "/notifications"}
                      className={`block p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${!n.isRead ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''}`}
                    >
                      <div className="flex flex-col gap-1">
                        <span className={`text-sm ${!n.isRead ? 'font-medium' : 'text-muted-foreground'}`}>
                          {n.message}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {n.createdAt ? new Date(n.createdAt).toLocaleString("vi-VN") : "Vừa xong"}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Không có thông báo mới</p>
                  </div>
                )}
              </div>
              <div className="p-2 border-t">
                <Button variant="ghost" size="sm" className="w-full text-blue-600" asChild>
                  <Link href="/notifications">Xem tất cả</Link>
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <ModeToggle />
      </div>
    </header>
  );
}
