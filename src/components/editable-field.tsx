import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";

interface EditableFieldProps {
  label?: string;
  value: string;
  onChange?: (val: string) => void;
  isEditing: boolean;
  type?: "text" | "textarea" | "number";
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function EditableField({
  label,
  value,
  onChange,
  isEditing,
  type = "text",
  placeholder,
  className,
  rows = 3,
}: EditableFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>}
      {isEditing ? (
        type === "textarea" ? (
          <Textarea
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            rows={rows}
          />
        ) : (
          <Input
            type={type}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
          />
        )
      ) : (
        <div className="flex items-start gap-2 bg-muted/50 rounded-md p-2.5 min-h-10 border border-transparent hover:border-border transition-colors group">
          <div className="flex-1 text-sm whitespace-pre-wrap break-words">{value || <span className="text-muted-foreground italic">Trống</span>}</div>
          <CopyButton text={value} className="opacity-0 group-hover:opacity-100 h-6 w-6 mt-[-2px] mr-[-2px]" />
        </div>
      )}
    </div>
  );
}
