"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Lightbulb,
  Factory,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
  Bell,
  ChevronUp,
  Settings,
  Hash,
  Bot,
  Handshake,
  BookOpen,
  Layers,
  ClipboardList,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { signOut, useSession } from "next-auth/react";
import { roleLabels } from "@/types";
import type { Role } from "@/lib/permissions";
import { useSocket } from "@/components/providers/socket-provider";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Ý tưởng",
    href: "/ideas",
    icon: Lightbulb,
  },
  {
    title: "Sản xuất",
    href: "/production",
    icon: Factory,
  },
  {
    title: "File SX",
    href: "/production/layouts",
    icon: Layers,
  },
  {
    title: "Công việc",
    href: "/my-tasks",
    icon: ClipboardList,
  },
  {
    title: "Đơn hàng",
    href: "/orders",
    icon: ShoppingCart,
  },
  {
    title: "Shipment",
    href: "/shipments",
    icon: Truck,
  },
  {
    title: "Tài khoản",
    href: "/accounts",
    icon: Users,
  },
  {
    title: "Tools",
    href: "/tools",
    icon: Wrench,
  },
];

const metadataItems = [
  {
    title: "Chủ đề",
    href: "/metadata/topics",
    icon: Hash,
  },
  {
    title: "AI Models",
    href: "/metadata/ai-models",
    icon: Bot,
  },
  {
    title: "Đối tác",
    href: "/metadata/partners",
    icon: Handshake,
  },
  {
    title: "Quy tắc chung",
    href: "/metadata/rules",
    icon: BookOpen,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { unreadCount } = useSocket();

  const user = session?.user;
  const initials = user?.nameAbbreviation || "LT";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" className="gap-3">
                <div className="flex items-center justify-center h-8 shrink-0">
                  <Image 
                    src="/logo.svg" 
                    alt="Logo" 
                    width={429} 
                    height={512} 
                    className="h-full w-auto object-contain"
                    priority
                    unoptimized
                  />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Ligon Team</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Quản lý sản phẩm
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (user.role === "manager" || user.role === "boss") && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {metadataItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                          <Link href={item.href}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/notifications"} tooltip="Thông báo">
                  <Link href="/notifications">
                    <Bell />
                    <span>Thông báo</span>
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.avatarUrl || undefined} />
                    <AvatarFallback className="rounded-lg text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-semibold text-sm">
                      {user?.fullName || "Ligon User"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.role ? roleLabels[user.role as Role] : ""}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/settings">Cài đặt</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-destructive"
                >
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
