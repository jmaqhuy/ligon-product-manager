"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Search,
  Package,
  Truck,
  ExternalLink,
} from "lucide-react";

export default function ShipmentsPage() {
  const [search, setSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBoxes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/shipments?${params}`);
      if (res.ok) setBoxes(await res.json());
    } catch {
      console.error("Failed to fetch shipments");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchBoxes(); }, [fetchBoxes]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shipment</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý thùng hàng và vận chuyển FBA
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm Shipment ID / Box / Tracking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : boxes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Truck className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Chưa có shipment nào</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Các thùng hàng FBA sẽ hiển thị ở đây
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {boxes.map((box) => (
            <Card key={box.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{box.boxName}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Shipment: <code>{box.shipmentId}</code> · {box.amazonAccount.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">
                      {new Date(box.shipDate).toLocaleDateString("vi-VN")}
                    </p>
                    <Badge variant="secondary" className="text-[10px]">{box.warehouseCode}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Dimensions */}
                <div className="flex flex-wrap gap-4 text-sm">
                  {box.shipLine && (
                    <div>
                      <span className="text-muted-foreground">Line: </span>
                      <span className="font-medium">{box.shipLine}</span>
                    </div>
                  )}
                  {(box.lengthCm || box.widthCm || box.heightCm) && (
                    <div>
                      <span className="text-muted-foreground">Kích thước: </span>
                      <span>{box.lengthCm}×{box.widthCm}×{box.heightCm} cm</span>
                    </div>
                  )}
                  {box.weightKg && (
                    <div>
                      <span className="text-muted-foreground">Cân nặng: </span>
                      <span>{box.weightKg} kg</span>
                    </div>
                  )}
                  {box.trackingNumber && (
                    <div>
                      <span className="text-muted-foreground">Tracking: </span>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{box.trackingNumber}</code>
                    </div>
                  )}
                </div>

                {box.labelFileUrl && (
                  <a
                    href={box.labelFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Mở Label File
                  </a>
                )}

                {/* Items table */}
                {box.items.length > 0 && (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>MSKU</TableHead>
                          <TableHead className="text-right">SL/thùng</TableHead>
                          <TableHead className="text-right">Tổng thùng</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {box.items.map((item: { id: string; idea: { msku: string; title: string | null }; qtyPerBox: number; totalBoxCount: number }) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <span className="font-mono text-sm">{item.idea.msku}</span>
                              {item.idea.title && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.idea.title}</p>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{item.qtyPerBox}</TableCell>
                            <TableCell className="text-right">{item.totalBoxCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
