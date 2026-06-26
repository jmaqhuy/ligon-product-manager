"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Search,
  Package,
  Truck,
  ExternalLink,
  Plus,
  Calendar,
  ChevronRight,
  Box,
  MapPin,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  packing: "Đóng gói",
  ready: "Sẵn sàng",
  in_transit: "Đang vận chuyển",
  received: "Đã nhận",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  packing: "bg-amber-100 text-amber-800 border-amber-200",
  ready: "bg-blue-100 text-blue-800 border-blue-200",
  in_transit: "bg-cyan-100 text-cyan-800 border-cyan-200",
  received: "bg-green-100 text-green-800 border-green-200",
};

function statusBadge(status: string) {
  return (
    <Badge variant="outline" className={STATUS_COLORS[status] || ""}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}

interface ShipmentItemData {
  id: string;
  totalQty: number;
  idea: { id: string; msku: string; sku: string; title: string | null; mainImageUrl: string; fulfillmentType: string };
  productionRequest: { id: string; completedAt: string } | null;
  boxItems: { shipmentBox: { id: string; boxName: string } }[];
}

interface ShipmentBoxData {
  id: string;
  boxName: string;
  amazonShipmentId: string | null;
  warehouseCode: string | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  weightKg: number | null;
  labelFileUrl: string | null;
  trackingNumber: string | null;
  items: { id: string; qtyPerBox: number; shipmentItem: { id: string; idea: { msku: string } } }[];
}

interface ShipmentData {
  id: string;
  status: string;
  plannedShipDate: string;
  actualShipDate: string | null;
  amazonAccount: { id: string; name: string; platform: string };
  items: ShipmentItemData[];
  boxes: ShipmentBoxData[];
  createdAt: string;
}

export default function ShipmentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [shipments, setShipments] = useState<ShipmentData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      const { data } = await apiFetch(`/api/shipments?${params}`);
      if (data) setShipments(data);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const getTotalItems = (s: ShipmentData) => s.items.reduce((sum, i) => sum + i.totalQty, 0);
  const getTotalBoxes = (s: ShipmentData) => s.boxes.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shipment FBA</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý lô hàng gửi vào kho Amazon
          </p>
        </div>
        <Button asChild>
          <Link href="/shipments/new">
            <Plus className="mr-2 h-4 w-4" /> Tạo lô hàng mới
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên account, box, tracking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="draft">Nháp</TabsTrigger>
          <TabsTrigger value="packing">Đóng gói</TabsTrigger>
          <TabsTrigger value="ready">Sẵn sàng</TabsTrigger>
          <TabsTrigger value="in_transit">Đang vận chuyển</TabsTrigger>
          <TabsTrigger value="received">Đã nhận</TabsTrigger>
        </TabsList>

        {["all", "draft", "packing", "ready", "in_transit", "received"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : shipments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Truck className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Chưa có lô hàng nào</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Tạo lô hàng mới để bắt đầu gửi hàng FBA
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {shipments.map((shipment) => (
                  <Card
                    key={shipment.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/shipments/${shipment.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Truck className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {shipment.amazonAccount.name}
                              {statusBadge(shipment.status)}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              <Calendar className="h-3 w-3" />
                              {new Date(shipment.plannedShipDate).toLocaleDateString("vi-VN")}
                              {shipment.actualShipDate && (
                                <> → {new Date(shipment.actualShipDate).toLocaleDateString("vi-VN")}</>
                              )}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>
                            <strong>{shipment.items.length}</strong> SKU ·{" "}
                            <strong>{getTotalItems(shipment)}</strong> sản phẩm
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Box className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>
                            <strong>{getTotalBoxes(shipment)}</strong> thùng
                          </span>
                        </div>
                        {shipment.boxes.some((b) => b.warehouseCode) && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>
                              {[...new Set(shipment.boxes.filter((b) => b.warehouseCode).map((b) => b.warehouseCode!))].join(", ")}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {shipment.items.slice(0, 8).map((item) => (
                          <Badge key={item.id} variant="secondary" className="text-[10px] font-mono">
                            {item.idea.msku} ×{item.totalQty}
                          </Badge>
                        ))}
                        {shipment.items.length > 8 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{shipment.items.length - 8}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
