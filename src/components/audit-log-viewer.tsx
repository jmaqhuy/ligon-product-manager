"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  ideaStatusLabels,
  photoStatusLabels,
  fileStatusLabels,
  listingStatusLabels,
} from "@/types";

interface AuditLog {
  id: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  changedBy: {
    fullName: string;
    role: string;
  };
}

export function AuditLogViewer({ ideaId }: { ideaId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ideas/${ideaId}/audit-logs`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLogs(data);
        }
      })
      .finally(() => setLoading(false));
  }, [ideaId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Chưa có lịch sử thay đổi</div>;
  }

  const formatValue = (field: string, val: string | null) => {
    if (!val) return "Trống";
    switch (field) {
      case "status":
        return ideaStatusLabels[val as keyof typeof ideaStatusLabels] || val;
      case "photoStatus":
        return photoStatusLabels[val as keyof typeof photoStatusLabels] || val;
      case "fileStatus":
        return fileStatusLabels[val as keyof typeof fileStatusLabels] || val;
      case "listingStatus":
        return listingStatusLabels[val as keyof typeof listingStatusLabels] || val;
      case "fulfillmentType":
        return val;
      default:
        return val;
    }
  };

  const getFieldLabel = (field: string) => {
    switch (field) {
      case "status": return "Trạng thái ý tưởng";
      case "photoStatus": return "Trạng thái ảnh";
      case "fileStatus": return "Trạng thái file";
      case "fulfillmentType": return "Loại fulfillment";
      case "photoAssigneeId": return "Người làm ảnh";
      default: return field;
    }
  };

  return (
    <div className="space-y-6">
      {logs.map((log) => (
        <div key={log.id} className="relative pl-6 border-l border-muted">
          <div className="absolute w-3 h-3 bg-muted border-2 border-background rounded-full -left-[6.5px] top-1.5" />
          <div className="mb-1 text-sm">
            <span className="font-semibold">{log.changedBy.fullName}</span>
            <span className="text-muted-foreground mx-2">
              {format(new Date(log.changedAt), "HH:mm dd/MM/yyyy")}
            </span>
          </div>
          <div className="text-sm">
            Đổi <span className="font-medium">{getFieldLabel(log.fieldName)}</span>
            {log.oldValue && (
              <>
                {" "}từ <span className="line-through text-muted-foreground">{formatValue(log.fieldName, log.oldValue)}</span>
              </>
            )}
            {" "}sang <span className="font-medium text-primary">{formatValue(log.fieldName, log.newValue)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
