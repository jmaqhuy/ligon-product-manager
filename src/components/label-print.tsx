"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import { convertToDirectImageUrl } from "@/lib/google-drive";

interface LabelPrintProps {
  labelUrl: string;
  fnskuCode: string;
  /** Render as a standalone card (idea detail) or compact button (shipment) */
  variant?: "card" | "button";
}

function printLabels(labelUrl: string, qty: number) {
  const directUrl = convertToDirectImageUrl(labelUrl) || labelUrl;
  const w = window.open("", "_blank", "width=600,height=400");
  if (!w) return;

  const imgs = Array(qty)
    .fill(`<img src="${directUrl}" alt="Label" onerror="this.remove()">`)
    .join("");

  w.document.write(
    "<!DOCTYPE html><html><head><title>Label</title>" +
      "<style>" +
      "@page{size:5cm 3cm;margin:0}" +
      "@media print{html,body{margin:0;padding:0}img{page-break-after:always}}" +
      "body{margin:0;padding:0;background:#fff;display:flex;flex-direction:column;align-items:center}" +
      "img{display:block;width:5cm;height:3cm;object-fit:contain}" +
      "</style></head><body>" +
      imgs +
      "<script>" +
      "var all=document.querySelectorAll('img'),n=all.length,ok=0;" +
      "if(n===0){window.print();window.close()}" +
      "all.forEach(function(img){" +
      "img.onload=function(){ok++;if(ok===n)setTimeout(function(){window.print();window.close()},300)};" +
      "img.onerror=function(){img.remove();ok++;if(ok===n)setTimeout(function(){window.print();window.close()},300)}" +
      "});" +
      "<" + "/script></body></html>"
  );
  w.document.close();
}

export function LabelPrint({ labelUrl, fnskuCode, variant = "card" }: LabelPrintProps) {
  const [qty, setQty] = useState(1);
  const directUrl = convertToDirectImageUrl(labelUrl) || labelUrl;

  if (variant === "button") {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 text-[10px] px-2.5 w-[72px]">
            <Printer className="h-2.5 w-2.5 mr-0.5" />In label
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <div className="flex items-start gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <div className="shrink-0 w-16 h-10 rounded border overflow-hidden bg-white cursor-pointer hover:ring-2 hover:ring-primary/50">
                  <img
                    src={directUrl}
                    alt="Label"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (img.src !== labelUrl) img.src = labelUrl;
                      else img.style.display = "none";
                    }}
                  />
                </div>
              </DialogTrigger>
              <DialogContent
                className="max-w-[90vw] max-h-[90vh] bg-transparent border-none shadow-none p-0"
                showCloseButton={false}
              >
                <img src={directUrl} alt="Label" className="max-w-[90vw] max-h-[90vh] object-contain rounded-md" />
              </DialogContent>
            </Dialog>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">In Label</span>
                <Badge variant="outline" className="text-[10px]">5×3cm</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                FNSKU: <span className="font-mono font-medium">{fnskuCode}</span>
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Label className="text-[10px] shrink-0">SL:</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  className="w-14 h-7 text-center text-xs"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <Button size="sm" className="h-7 text-xs gap-1" onClick={() => printLabels(labelUrl, qty)}>
                  <Printer className="h-3 w-3" /> In {qty} label
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Card variant (idea detail page)
  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <div className="shrink-0 w-16 h-10 rounded border overflow-hidden bg-white cursor-pointer hover:ring-2 hover:ring-primary/50">
                <img
                  src={directUrl}
                  alt="Label"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (img.src !== labelUrl) img.src = labelUrl;
                    else img.style.display = "none";
                  }}
                />
              </div>
            </DialogTrigger>
            <DialogContent
              className="max-w-[90vw] max-h-[90vh] bg-transparent border-none shadow-none p-0"
              showCloseButton={false}
            >
              <img src={directUrl} alt="Label" className="max-w-[90vw] max-h-[90vh] object-contain rounded-md" />
            </DialogContent>
          </Dialog>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">In Label</span>
              <Badge variant="outline" className="text-[10px]">5×3cm</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              FNSKU: <span className="font-mono font-medium">{fnskuCode}</span>
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Label className="text-[10px] shrink-0">Số lượng:</Label>
              <Input
                type="number"
                min={1}
                max={99}
                className="w-14 h-7 text-center text-xs"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <Button size="sm" className="h-7 text-xs gap-1" onClick={() => printLabels(labelUrl, qty)}>
                <Printer className="h-3 w-3" /> In {qty} label
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
