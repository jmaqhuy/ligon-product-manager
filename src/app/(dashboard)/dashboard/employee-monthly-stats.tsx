"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Users, ChevronDown, ChevronRight } from "lucide-react";

interface MonthlyData {
  ideasCreated: number;
  ideasApproved: number;
  photosDone: number;
  videosDone: number;
  contentAPlusDone: number;
}

interface EmployeeStats {
  employeeId: string;
  employeeName: string;
  employeeAbbr: string;
  months: Record<string, MonthlyData>;
}

export function EmployeeMonthlyStats() {
  const [data, setData] = useState<EmployeeStats[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/employee-monthly-stats")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Thống kê theo nhân viên
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Thống kê theo nhân viên
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Chưa có dữ liệu</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Thống kê theo nhân viên
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((emp) => {
            const months = Object.keys(emp.months).sort().reverse();
            const totalIdeas = months.reduce((s, m) => s + emp.months[m].ideasCreated, 0);
            const totalApproved = months.reduce((s, m) => s + emp.months[m].ideasApproved, 0);
            const isExpanded = expandedEmp === emp.employeeId;

            return (
              <div key={emp.employeeId} className="border rounded-lg">
                <button
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => setExpandedEmp(isExpanded ? null : emp.employeeId)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <span className="font-medium text-sm">{emp.employeeName}</span>
                      <Badge variant="outline" className="ml-2 text-[10px]">{emp.employeeAbbr}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Ý tưởng: <strong className="text-foreground">{totalIdeas}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Đã duyệt: <strong className="text-green-600">{totalApproved}</strong>
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Tháng</TableHead>
                          <TableHead className="text-xs text-center">Đã tạo</TableHead>
                          <TableHead className="text-xs text-center">Đã duyệt</TableHead>
                          <TableHead className="text-xs text-center">Ảnh</TableHead>
                          <TableHead className="text-xs text-center">Video</TableHead>
                          <TableHead className="text-xs text-center">A+</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {months.map((month) => {
                          const m = emp.months[month];
                          return (
                            <TableRow key={month}>
                              <TableCell className="text-xs font-medium">{month}</TableCell>
                              <TableCell className="text-xs text-center">{m.ideasCreated}</TableCell>
                              <TableCell className="text-xs text-center text-green-600 font-medium">{m.ideasApproved}</TableCell>
                              <TableCell className="text-xs text-center">{m.photosDone}</TableCell>
                              <TableCell className="text-xs text-center">{m.videosDone}</TableCell>
                              <TableCell className="text-xs text-center">{m.contentAPlusDone}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
