"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  ShoppingCart,
  Truck,
  Package,
  Factory,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { orderProductionStatusLabels, type OrderProductionStatus } from "@/types";

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    producing: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    produced: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    awaiting_fulfillment: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300",
    fulfilled: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
    ff_amz: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
  };
  return (
    <Badge variant="outline" className={styles[status] || ""}>
      {orderProductionStatusLabels[status as OrderProductionStatus] || status}
    </Badge>
  );
}

function platformBadge(platform: string) {
  if (platform === "amazon") {
    return <Badge className="bg-orange-600 hover:bg-orange-700 text-white text-[10px] px-1.5">Amazon</Badge>;
  }
  return <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] px-1.5">Etsy</Badge>;
}

export default function OrdersPage() {
  const [tab, setTab] = useState("producing");
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: tab });
      if (search) params.set("search", search);
      if (platformFilter !== "all") params.set("platform", platformFilter);
      const res = await fetch(`/api/orders?${params}`);
      if (res.ok) {
        setOrders(await res.json());
      }
    } catch {
      console.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [tab, search, platformFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productionStatus: newStatus }),
      });
      if (res.ok) fetchOrders();
    } catch {
      console.error("Failed to update order");
    }
  };

  const renderTable = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (orders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Chưa có đơn hàng nào</h3>
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sàn</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="hidden md:table-cell">Khách hàng</TableHead>
              <TableHead className="hidden lg:table-cell">SL</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="hidden md:table-cell">Tracking</TableHead>
              <TableHead className="hidden sm:table-cell">Ngày</TableHead>
              <TableHead className="w-[120px]">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{platformBadge(order.platform)}</TableCell>
                <TableCell className="font-mono text-sm">
                  <Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline">
                    {order.orderId}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-sm">{order.sku}</TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  <div>
                    <p>{order.customerName}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {order.city}, {order.state} {order.country}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{order.quantity}</TableCell>
                <TableCell>{statusBadge(order.productionStatus)}</TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  {order.trackingNumber ? (
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{order.trackingNumber}</code>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {new Date(order.orderDate).toLocaleDateString("vi-VN")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Select
                      value={order.productionStatus}
                      onValueChange={(v) => handleStatusChange(order.id, v)}
                    >
                      <SelectTrigger className="h-7 text-xs w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(orderProductionStatusLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <Link href={`/orders/${order.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Đơn hàng</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý đơn hàng FBM, Etsy, và Personalize
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm Order ID / SKU / Khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Sàn" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả sàn</SelectItem>
            <SelectItem value="amazon">Amazon</SelectItem>
            <SelectItem value="etsy">Etsy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="producing" className="text-xs sm:text-sm">
            <Factory className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
            Đang SX
          </TabsTrigger>
          <TabsTrigger value="produced" className="text-xs sm:text-sm">
            <Package className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
            Đã SX
          </TabsTrigger>
          <TabsTrigger value="awaiting_fulfillment" className="text-xs sm:text-sm">
            <Truck className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
            Chờ FF
          </TabsTrigger>
          <TabsTrigger value="fulfilled" className="text-xs sm:text-sm">
            <ShoppingCart className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
            Đã FF
          </TabsTrigger>
        </TabsList>

        {["producing", "produced", "awaiting_fulfillment", "fulfilled"].map((tabVal) => (
          <TabsContent key={tabVal} value={tabVal} className="mt-4">
            {renderTable()}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
