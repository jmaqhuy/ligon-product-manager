import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { Lightbulb, Image, CheckCircle, Upload, Factory, ShoppingCart, Truck, Bell } from "lucide-react";
import Link from "next/link";
import { can, type Role } from "@/lib/permissions";

async function getStats(userId: string, role: Role) {
  const isAdmin = can(role, "view_all_stats");

  const ideaWhere = isAdmin ? {} : { createdById: userId };

  const [reviewing, awaitingPhotos, photoApproved, published, productionPending, productionActive, ordersProducing, unreadNotifications] = await Promise.all([
    db.idea.count({ where: { ...ideaWhere, status: "reviewing" } }),
    db.idea.count({
      where: {
        ...ideaWhere,
        status: "approved",
        photoStatus: { in: ["not_requested", "awaiting_photos", "pending_approval", "revision_requested"] },
      },
    }),
    db.idea.count({
      where: {
        ...ideaWhere,
        photoStatus: "approved",
        status: { not: "published" },
      },
    }),
    db.idea.count({ where: { ...ideaWhere, status: "published" } }),
    db.productionRequest.count({ where: { completedAt: null, steps: { none: { startedAt: { not: null } } } } }),
    db.productionRequest.count({ where: { completedAt: null, steps: { some: { startedAt: { not: null } } } } }),
    db.order.count({ where: { productionStatus: "producing" } }),
    db.notification.count({ where: { userId, isRead: false } }),
  ]);

  return { reviewing, awaitingPhotos, photoApproved, published, productionPending, productionActive, ordersProducing, unreadNotifications };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const role = session.user.role as Role;
  const stats = await getStats(session.user.id, role);

  const ideaCards = [
    { title: "Chờ xem xét", value: stats.reviewing, icon: Lightbulb, href: "/ideas?tab=reviewing", color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
    { title: "Chờ làm ảnh", value: stats.awaitingPhotos, icon: Image, href: "/ideas?tab=photos", color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
    { title: "Sẵn sàng đăng", value: stats.photoApproved, icon: CheckCircle, href: "/ideas?tab=ready", color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-950/30" },
    { title: "Đã đăng bán", value: stats.published, icon: Upload, href: "/ideas?tab=published", color: "text-primary", bgColor: "bg-primary/5" },
  ];

  const operationCards = [
    { title: "SX chờ làm", value: stats.productionPending, icon: Factory, href: "/production?tab=pending", color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
    { title: "Đang sản xuất", value: stats.productionActive, icon: Factory, href: "/production?tab=in_progress", color: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30" },
    { title: "Đơn đang SX", value: stats.ordersProducing, icon: ShoppingCart, href: "/orders?tab=producing", color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
    { title: "Thông báo", value: stats.unreadNotifications, icon: Bell, href: "/notifications", color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Xin chào, {session.user.fullName}!{" "}
          <Badge variant="outline" className="ml-1">
            {role === "boss" ? "Sếp" : role === "manager" ? "Quản lý" : "Nhân viên"}
          </Badge>
        </p>
      </div>

      {/* Idea Stats */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Ý tưởng & Listing</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {ideaCards.map((card) => (
            <Link key={card.title} href={card.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Operation Stats */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Sản xuất & Vận hành</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {operationCards.map((card) => (
            <Link key={card.title} href={card.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

