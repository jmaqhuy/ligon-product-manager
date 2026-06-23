"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Package,
  ShoppingCart,
  Truck,
  User,
  Save,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { orderProductionStatusLabels, type OrderProductionStatus } from "@/types";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Editable fields
  const [trackingNumber, setTrackingNumber] = useState("");
  const [note, setNote] = useState("");
  const [productionStatus, setProductionStatus] = useState("");

  const fetchOrder = useCallback(async () => {
    try {
      // Fetch all orders and find by id (since we don't have a GET endpoint for single order)
      const res = await fetch(`/api/orders?search=`);
      if (res.ok) {
        const orders = await res.json();
        const found = orders.find((o: { id: string }) => o.id === id);
        if (found) {
          setOrder(found);
          setTrackingNumber(found.trackingNumber || "");
          setNote(found.note || "");
          setProductionStatus(found.productionStatus);
        }
      }
    } catch {
      toast.error("Lỗi tải đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: trackingNumber || null,
          note: note || null,
          productionStatus,
        }),
      });
      if (res.ok) {
        toast.success("Đã cập nhật đơn hàng!");
        fetchOrder();
      } else {
        toast.error("Lỗi cập nhật");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  const copyAddress = () => {
    if (!order) return;
    const addr = [
      order.customerName,
      order.addressLine1,
      order.addressLine2,
      `${order.city}, ${order.state || ""} ${order.zipcode || ""}`,
      order.country,
    ]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(addr);
    setCopied(true);
    toast.success("Đã copy địa chỉ!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Không tìm thấy đơn hàng</h2>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/orders")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
      </div>
    );
  }

  const statusStyles: Record<string, string> = {
    producing: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    produced: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    awaiting_fulfillment: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300",
    fulfilled: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
    ff_amz: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orders"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">#{order.orderId}</h1>
              <Badge className={order.platform === "amazon" ? "bg-orange-600 text-white" : "bg-orange-500 text-white"}>
                {order.platform === "amazon" ? "Amazon" : "Etsy"}
              </Badge>
              <Badge variant="outline" className={statusStyles[order.productionStatus] || ""}>
                {orderProductionStatusLabels[order.productionStatus as OrderProductionStatus] || order.productionStatus}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Ngày đặt: {new Date(order.orderDate).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Lưu
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Customer & Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Khách hàng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Tên</Label>
              <p className="text-sm font-medium">{order.customerName}</p>
            </div>
            {order.customerPhone && (
              <div>
                <Label className="text-xs text-muted-foreground">SĐT</Label>
                <p className="text-sm">{order.customerPhone}</p>
              </div>
            )}
            <Separator />
            <div className="flex items-start justify-between">
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Địa chỉ giao hàng
                </Label>
                <p className="text-sm mt-1">{order.addressLine1}</p>
                {order.addressLine2 && <p className="text-sm">{order.addressLine2}</p>}
                <p className="text-sm">{order.city}, {order.state} {order.zipcode}</p>
                <p className="text-sm font-medium">{order.country}</p>
              </div>
              <Button variant="outline" size="sm" onClick={copyAddress}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Product & Order Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Chi tiết sản phẩm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">SKU</Label>
                <code className="block text-sm font-mono bg-muted px-2 py-1 rounded mt-0.5">{order.sku}</code>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Số lượng</Label>
                <p className="text-sm font-bold text-lg">{order.quantity}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Đơn giá</Label>
                <p className="text-sm">{order.unitPrice ? `$${order.unitPrice.toFixed(2)}` : "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Dịch vụ</Label>
                <p className="text-sm">{order.service || "—"}</p>
              </div>
            </div>

            {order.customNote && (
              <>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">Ghi chú cá nhân hoá</Label>
                  <p className="text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-2 rounded mt-1">
                    {order.customNote}
                  </p>
                </div>
              </>
            )}

            {(order.weight || order.length) && (
              <>
                <Separator />
                <div className="grid grid-cols-4 gap-2">
                  {order.weight && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Nặng (oz)</Label>
                      <p className="text-xs">{order.weight}</p>
                    </div>
                  )}
                  {order.length && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Dài</Label>
                      <p className="text-xs">{order.length}"</p>
                    </div>
                  )}
                  {order.width && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Rộng</Label>
                      <p className="text-xs">{order.width}"</p>
                    </div>
                  )}
                  {order.height && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Cao</Label>
                      <p className="text-xs">{order.height}"</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Status & Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" /> Trạng thái & Vận chuyển
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Trạng thái sản xuất</Label>
              <Select value={productionStatus} onValueChange={setProductionStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(orderProductionStatusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tracking Number</Label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="1Z999AA1..."
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ghi chú nội bộ</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú cho team..."
              rows={5}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
