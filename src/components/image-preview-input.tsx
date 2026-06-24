"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { convertToDirectImageUrl } from "@/lib/google-drive";
import { Image as ImageIcon, Maximize2, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ImagePreviewInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export function ImagePreviewInput({ value, onChange, placeholder, className, readOnly }: ImagePreviewInputProps) {
  const [isHovered, setIsHovered] = useState(false);
  const directUrl = convertToDirectImageUrl(value);

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Thumbnail / Preview Trigger */}
      <Dialog>
        <DialogTrigger asChild>
            <button
            type="button"
            className="relative flex-shrink-0 w-10 h-10 rounded border bg-muted flex items-center justify-center overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            disabled={!directUrl}
          >
            {directUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={directUrl}
                  alt="Thumbnail"
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                {isHovered && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity">
                    <Maximize2 className="h-4 w-4 text-white" />
                  </div>
                )}
              </>
            ) : (
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </DialogTrigger>
        
        {/* Lightbox Content */}
        <DialogContent className="max-w-[95vw] w-fit bg-transparent border-none shadow-none" showCloseButton={false}>
          {directUrl && (
            <div className="relative flex flex-col justify-center items-center p-0 gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={directUrl} alt="Full Preview" className="max-h-[95vh] max-w-[95vw] w-auto h-auto rounded-md object-contain" />
              <div className="flex gap-4">
                <Button variant="secondary" asChild>
                  <a href={value} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Mở link gốc
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* URL Input */}
      {!readOnly ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
      ) : (
        <div className="flex-1 text-sm bg-muted/30 p-2 rounded-md border border-transparent truncate" title={value}>
          {value || <span className="text-muted-foreground italic">Chưa có ảnh</span>}
        </div>
      )}
    </div>
  );
}
