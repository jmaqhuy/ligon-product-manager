"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";

interface SourceIdea {
  id: string;
  msku: string;
  title: string | null;
  status: string;
}

interface SourceLinkStat {
  url: string;
  ideaCount: number;
  ideas: SourceIdea[];
}

function getDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    reviewing: "bg-amber-100 text-amber-800",
    approved: "bg-blue-100 text-blue-800",
    published: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    reviewing: "Xem xét",
    approved: "Đã duyệt",
    published: "Đã đăng",
    rejected: "Từ chối",
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${styles[status] || ""}`}>
      {labels[status] || status}
    </Badge>
  );
}

export function SourceLinkStats() {
  const [data, setData] = useState<SourceLinkStat[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLink, setExpandedLink] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/source-link-stats")
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
            <Link2 className="h-4 w-4" />
            Thống kê theo nguồn ý tưởng
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
            <Link2 className="h-4 w-4" />
            Thống kê theo nguồn ý tưởng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Chưa có dữ liệu liên kết nguồn</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Thống kê theo nguồn ý tưởng
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((item) => {
            const isExpanded = expandedLink === item.url;
            const domain = getDomain(item.url);

            return (
              <div key={item.url} className="border rounded-lg">
                <button
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => setExpandedLink(isExpanded ? null : item.url)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{domain}</span>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{item.url}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 ml-2">
                    {item.ideaCount} ý tưởng
                  </Badge>
                </button>

                {isExpanded && (
                  <div className="border-t divide-y">
                    {item.ideas.map((idea) => (
                      <Link
                        key={idea.id}
                        href={`/ideas/${idea.id}`}
                        className="flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-mono">{idea.msku}</span>
                          {idea.title && (
                            <span className="text-xs text-muted-foreground ml-2 truncate">
                              {idea.title}
                            </span>
                          )}
                        </div>
                        {statusBadge(idea.status)}
                      </Link>
                    ))}
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
