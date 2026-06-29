"use client";

import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ShoppingBag } from "lucide-react";
import React from "react";

interface FieldDisplayProps {
  label: string;
  value?: string | null;
  badge?: string;
  copyable?: boolean;
  externalLink?: string;
  isMono?: boolean;
  isTextArea?: boolean;
  className?: string;
}

export function FieldDisplay({
  label,
  value,
  badge,
  copyable = false,
  externalLink,
  isMono = false,
  isTextArea = false,
  className = "",
}: FieldDisplayProps) {
  const hasValue = value && value.trim().length > 0;

  return (
    <div
      className={`group/field flex flex-col justify-center rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative ${className}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-muted-foreground block">{label}</span>
        {badge && (
          <Badge
            variant="outline"
            className="text-[9px] font-mono font-medium h-4 px-1.5 border-primary/20 bg-primary/5 text-primary/70"
          >
            {badge}
          </Badge>
        )}
      </div>

      {!hasValue ? (
        <span className="text-xs text-muted-foreground">—</span>
      ) : isTextArea ? (
        <div className="text-xs whitespace-pre-wrap text-muted-foreground pr-6 max-h-32 overflow-y-auto custom-scrollbar">
          {value}
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs pr-6 truncate ${
              isMono ? "font-mono font-medium" : "font-medium"
            }`}
          >
            {value}
          </span>
          {externalLink && (
            <a
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 bg-background/80 rounded shrink-0 opacity-0 group-hover/field:opacity-100 transition-opacity"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {hasValue && copyable && (
        <CopyButton
          text={value!}
          className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/field:opacity-100 transition-opacity bg-background"
        />
      )}
    </div>
  );
}

// Sub-component for List/Tags
interface TagListDisplayProps {
  label: string;
  tagsString?: string | null;
  badge?: string;
}

export function TagListDisplay({ label, tagsString, badge }: TagListDisplayProps) {
  // Try parsing JSON first, if it fails, try splitting by semicolon
  let tags: string[] = [];
  if (tagsString) {
    try {
      const parsed = JSON.parse(tagsString);
      if (Array.isArray(parsed)) {
        tags = parsed.map(t => String(t).trim()).filter(Boolean);
      } else {
        tags = tagsString.split(";").map(t => t.trim()).filter(Boolean);
      }
    } catch {
      tags = tagsString.split(";").map(t => t.trim()).filter(Boolean);
    }
  }

  return (
    <div className="group/itags flex flex-col rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative overflow-hidden">
      <div className="flex items-center gap-2 mb-1.5 shrink-0">
        <span className="text-[10px] text-muted-foreground block">{label}</span>
        {badge && (
          <Badge
            variant="outline"
            className="text-[9px] font-mono font-medium h-4 px-1.5 border-primary/20 bg-primary/5 text-primary/70"
          >
            {badge}
          </Badge>
        )}
      </div>
      {tags.length === 0 ? (
        <p className="text-xs text-muted-foreground">—</p>
      ) : (
        <div className="flex flex-wrap gap-1 pr-6 max-h-24 overflow-y-auto custom-scrollbar content-start">
          {tags.map((t, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="text-xs py-1 px-2.5 font-normal group/tag flex items-center shrink-0 overflow-hidden transition-all duration-300"
            >
              <span>{t}</span>
              <div className="flex items-center gap-1 w-0 opacity-0 group-hover/tag:w-12 group-hover/tag:opacity-100 group-hover/tag:ml-1.5 transition-all duration-300 overflow-hidden justify-end">
                <a
                  title="Search on Amazon"
                  href={`https://www.amazon.com/s?k=${encodeURIComponent(t)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 bg-background/80 rounded shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  title="Search on Etsy"
                  href={`https://www.etsy.com/search?q=${encodeURIComponent(
                    t
                  )}&ref=search_bar&instant_download=false`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:text-orange-700 bg-background/80 rounded shrink-0"
                >
                  <ShoppingBag className="h-3 w-3" />
                </a>
              </div>
            </Badge>
          ))}
          <CopyButton
            text={tags.join("; ")}
            className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/itags:opacity-100 transition-opacity bg-background"
          />
        </div>
      )}
    </div>
  );
}

// Sub-component for Slugs
export interface SlugListDisplayProps { label: string; slugsString?: string | null; badge?: string; }
export function SlugListDisplay({ label, slugsString, badge }: SlugListDisplayProps) {
  let slugs: string[] = [];
  if (slugsString) {
    try {
      const parsed = JSON.parse(slugsString);
      if (Array.isArray(parsed)) {
        slugs = parsed.map((s: any) => String(s).trim()).filter(Boolean);
      } else {
        slugs = slugsString.split("\n").map((s: any) => s.trim()).filter(Boolean);
      }
    } catch {
      slugs = slugsString.split("\n").map((s: any) => s.trim()).filter(Boolean);
    }
  }

  return (
    <div className="group/islug flex flex-col rounded-md bg-muted/40 px-3 py-2 border border-transparent hover:border-border/50 transition-colors relative">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] text-muted-foreground block">{label}</span>
        {badge && (
          <Badge
            variant="outline"
            className="text-[9px] font-mono font-medium h-4 px-1.5 border-primary/20 bg-primary/5 text-primary/70"
          >
            {badge}
          </Badge>
        )}
      </div>
      {slugs.length === 0 ? (
        <p className="text-xs text-muted-foreground">—</p>
      ) : (
        <div className="flex flex-col gap-1 pr-6 max-h-24 overflow-y-auto custom-scrollbar">
          {slugs.map((s, i) => (
            <code key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded truncate">
              {s}
            </code>
          ))}
          <CopyButton
            text={slugs.join("\n")}
            className="absolute right-2 top-2 h-5 w-5 opacity-0 group-hover/islug:opacity-100 transition-opacity bg-background"
          />
        </div>
      )}
    </div>
  );
}
