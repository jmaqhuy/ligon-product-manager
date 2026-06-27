import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { Lightbulb, Image, CheckCircle, Upload, Factory, ShoppingCart, Bell } from "lucide-react";
import Link from "next/link";
import { can, type Role } from "@/lib/permissions";
import { DashboardCharts } from "./charts";
import { EmployeeMonthlyStats } from "./employee-monthly-stats";
import { SourceLinkStats } from "./source-link-stats";

async function getStats(userId: string, role: Role) {
  const isAdmin = can(role, "view_all_stats");

  const ideaWhere = isAdmin ? {} : { createdById: userId };

  const [reviewing, awaitingPhotos, photoApproved, published, productionPending, productionActive, ordersProducing, unreadNotifications] = await Promise.all([
    db.idea.count({ where: { ...ideaWhere, status: "reviewing" } }),
    db.idea.count({
      where: {
        ...ideaWhere,
        status: "approved",
        OR: [{ amazonListing: { is: { photoStatus: { in: ["not_requested", "awaiting_photos", "pending_approval", "revision_requested"] } } } }, { etsyListing: { is: { photoStatus: { in: ["not_requested", "awaiting_photos", "pending_approval", "revision_requested"] } } } }],
      },
    }),
    db.idea.count({
      where: {
        ...ideaWhere,
        AND: [
          { OR: [{ amazonListing: { is: { photoStatus: "approved" } } }, { etsyListing: { is: { photoStatus: "approved" } } }] },
          { OR: [{ amazonListing: { is: { listingStatus: { not: "published" } } } }, { etsyListing: { is: { listingStatus: { not: "published" } } } }] }
        ],
      },
    }),
    db.idea.count({ where: { ...ideaWhere, OR: [{ amazonListing: { is: { listingStatus: "published" } } }, { etsyListing: { is: { listingStatus: "published" } } }] } }),
    db.productionRequest.count({ where: { completedAt: null, steps: { none: { startedAt: { not: null } } } } }),
    db.productionRequest.count({ where: { completedAt: null, steps: { some: { startedAt: { not: null } } } } }),
    db.order.count({ where: { productionStatus: "producing" } }),
    db.notification.count({ where: { userId, isRead: false } }),
  ]);

  return { reviewing, awaitingPhotos, photoApproved, published, productionPending, productionActive, ordersProducing, unreadNotifications };
}

async function getRecentActivity() {
  const [recentIdeas, recentOrders] = await Promise.all([
    db.idea.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        msku: true,
        status: true,
        createdAt: true,
        createdBy: { select: { nameAbbreviation: true, fullName: true } },
        amazonListing: { select: { itemName: true, sku: true } },
      },
    }),
    db.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderId: true,
        customerName: true,
        platform: true,
        productionStatus: true,
        createdAt: true,
      },
    }),
  ]);

  return { recentIdeas, recentOrders };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const role = session.user.role as Role;
  const stats = await getStats(session.user.id, role);
  const activity = await getRecentActivity();

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

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      reviewing: { label: "Xem xét", className: "bg-amber-100 text-amber-800 border-amber-200" },
      approved: { label: "Đã duyệt", className: "bg-blue-100 text-blue-800 border-blue-200" },
      revision_requested: { label: "Yêu cầu sửa", className: "bg-orange-100 text-orange-800 border-orange-200" },
      producing: { label: "Đang SX", className: "bg-orange-100 text-orange-800 border-orange-200" },
      produced: { label: "Đã SX", className: "bg-cyan-100 text-cyan-800 border-cyan-200" },
      awaiting_fulfillment: { label: "Chờ FF", className: "bg-purple-100 text-purple-800 border-purple-200" },
      fulfilled: { label: "Đã FF", className: "bg-green-100 text-green-800 border-green-200" },
    };
    const s = map[status] || { label: status, className: "" };
    return <Badge variant="outline" className={`text-[10px] ${s.className}`}>{s.label}</Badge>;
  };

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

      {/* Monthly Charts (client component) */}
      <DashboardCharts />

      {/* Employee Monthly Stats (client component) */}
      <EmployeeMonthlyStats />

      {/* Source Link Stats (client component) */}
      <SourceLinkStats />

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Ideas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ý tưởng gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.recentIdeas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Chưa có ý tưởng nào</p>
            ) : (
              <div className="space-y-3">
                {activity.recentIdeas.map((idea) => (
                  <Link
                    key={idea.id}
                    href={`/ideas/${idea.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium truncate block" title={idea.amazonListing?.itemName || idea.amazonListing?.sku || idea.msku}>
                        {idea.amazonListing?.itemName || idea.amazonListing?.sku || idea.msku}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-[10px] bg-muted px-1 py-0.5 rounded font-mono">{idea.msku}</code>
                        <span className="text-[10px] text-muted-foreground">
                          {idea.createdBy.nameAbbreviation}
                        </span>
                      </div>
                    </div>
                    {statusBadge(idea.status)}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Đơn hàng gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Chưa có đơn hàng nào</p>
            ) : (
              <div className="space-y-3">
                {activity.recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">#{order.orderId}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">
                          {order.platform === "amazon" ? "Amazon" : "Etsy"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {order.customerName}
                        </span>
                      </div>
                    </div>
                    {statusBadge(order.productionStatus)}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
