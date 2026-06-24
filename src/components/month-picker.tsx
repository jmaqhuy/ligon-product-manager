"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const MONTHS = [
  "Thg 1", "Thg 2", "Thg 3", "Thg 4", "Thg 5", "Thg 6",
  "Thg 7", "Thg 8", "Thg 9", "Thg 10", "Thg 11", "Thg 12",
];

interface MonthPickerProps {
  value: string; // "YYYY-MM" or ""
  onChange: (month: string) => void;
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    if (value) return parseInt(value.split("-")[0]);
    return new Date().getFullYear();
  });

  const selectedMonth = value ? parseInt(value.split("-")[1]) - 1 : -1;
  const selectedYear = value ? parseInt(value.split("-")[0]) : -1;

  const handleSelect = (monthIndex: number) => {
    const m = `${viewYear}-${(monthIndex + 1).toString().padStart(2, "0")}`;
    onChange(m);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[170px] h-9 justify-start text-xs font-normal">
          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
          {value ? format(new Date(value + "-01"), "MM/yyyy") : "Chọn tháng"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <div className="flex items-center justify-between px-2 pt-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewYear(viewYear - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{viewYear}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewYear(viewYear + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1 p-2">
          {MONTHS.map((label, i) => {
            const isSelected = i === selectedMonth && viewYear === selectedYear;
            const isCurrent = i === new Date().getMonth() && viewYear === new Date().getFullYear();
            return (
              <Button
                key={i}
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                className={`h-9 text-xs font-normal ${isCurrent && !isSelected ? "border border-primary/30" : ""}`}
                onClick={() => handleSelect(i)}
              >
                {label}
              </Button>
            );
          })}
        </div>
        {value && (
          <div className="px-2 pb-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => { onChange(""); setOpen(false); }}
            >
              Xoá bộ lọc
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
