"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp } from "lucide-react";

interface MonthData {
  label: string;
  ideas: number;
  orders: number;
  production: number;
}

interface StatusBreakdown {
  ideas: { reviewing: number; approved: number; published: number };
  orders: { producing: number; produced: number; fulfilled: number };
}

interface DashboardData {
  months: MonthData[];
  statusBreakdown: StatusBreakdown;
}

export function DashboardCharts() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/monthly")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const maxBarValue = Math.max(
    1,
    ...data.months.map((m) => Math.max(m.ideas, m.orders, m.production))
  );

  const totalIdeas = data.months.reduce((s, m) => s + m.ideas, 0);
  const totalOrders = data.months.reduce((s, m) => s + m.orders, 0);
  const totalProduction = data.months.reduce((s, m) => s + m.production, 0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Monthly Bar Chart */}
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Thống kê 6 tháng
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Tổng: {totalIdeas} ý tưởng · {totalOrders} đơn hàng · {totalProduction} yêu cầu SX
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
              <span className="text-[11px] text-muted-foreground">Ý tưởng</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              <span className="text-[11px] text-muted-foreground">Đơn hàng</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-orange-500" />
              <span className="text-[11px] text-muted-foreground">Sản xuất</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-[180px]">
            {data.months.map((month) => (
              <div key={month.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-end gap-0.5 h-[150px] w-full justify-center">
                  {/* Ideas bar */}
                  <div
                    className="w-[20%] bg-blue-500 rounded-t-sm transition-all duration-500 relative group"
                    style={{ height: `${Math.max(2, (month.ideas / maxBarValue) * 100)}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border">
                      {month.ideas}
                    </div>
                  </div>
                  {/* Orders bar */}
                  <div
                    className="w-[20%] bg-emerald-500 rounded-t-sm transition-all duration-500 relative group"
                    style={{ height: `${Math.max(2, (month.orders / maxBarValue) * 100)}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border">
                      {month.orders}
                    </div>
                  </div>
                  {/* Production bar */}
                  <div
                    className="w-[20%] bg-orange-500 rounded-t-sm transition-all duration-500 relative group"
                    style={{ height: `${Math.max(2, (month.production / maxBarValue) * 100)}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border">
                      {month.production}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{month.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ideas Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ý tưởng tháng này</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatusBar
            label="Đang xem xét"
            value={data.statusBreakdown.ideas.reviewing}
            total={data.statusBreakdown.ideas.reviewing + data.statusBreakdown.ideas.approved + data.statusBreakdown.ideas.published}
            color="bg-amber-500"
          />
          <StatusBar
            label="Đã duyệt"
            value={data.statusBreakdown.ideas.approved}
            total={data.statusBreakdown.ideas.reviewing + data.statusBreakdown.ideas.approved + data.statusBreakdown.ideas.published}
            color="bg-blue-500"
          />
          <StatusBar
            label="Đã đăng bán"
            value={data.statusBreakdown.ideas.published}
            total={data.statusBreakdown.ideas.reviewing + data.statusBreakdown.ideas.approved + data.statusBreakdown.ideas.published}
            color="bg-green-500"
          />
          {data.statusBreakdown.ideas.reviewing + data.statusBreakdown.ideas.approved + data.statusBreakdown.ideas.published === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">Chưa có dữ liệu tháng này</p>
          )}
        </CardContent>
      </Card>

      {/* Orders Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Đơn hàng tháng này</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatusBar
            label="Đang SX"
            value={data.statusBreakdown.orders.producing}
            total={data.statusBreakdown.orders.producing + data.statusBreakdown.orders.produced + data.statusBreakdown.orders.fulfilled}
            color="bg-orange-500"
          />
          <StatusBar
            label="Đã SX"
            value={data.statusBreakdown.orders.produced}
            total={data.statusBreakdown.orders.producing + data.statusBreakdown.orders.produced + data.statusBreakdown.orders.fulfilled}
            color="bg-cyan-500"
          />
          <StatusBar
            label="Đã FF"
            value={data.statusBreakdown.orders.fulfilled}
            total={data.statusBreakdown.orders.producing + data.statusBreakdown.orders.produced + data.statusBreakdown.orders.fulfilled}
            color="bg-green-500"
          />
          {data.statusBreakdown.orders.producing + data.statusBreakdown.orders.produced + data.statusBreakdown.orders.fulfilled === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">Chưa có dữ liệu tháng này</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium">{value}</span>
          {total > 0 && (
            <Badge variant="outline" className="text-[10px]">{pct}%</Badge>
          )}
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
