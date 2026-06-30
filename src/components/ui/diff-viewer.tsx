import { Fragment } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { TextDiff } from '@/components/ui/text-diff';

export interface DiffField {
  key: string;
  label: string;
  leftVal: string;
  rightVal: string;
  isLongText?: boolean;
}

export interface DiffViewerProps {
  fields: DiffField[];
  leftTitle?: React.ReactNode;
  rightTitle?: React.ReactNode;
  onSyncField?: (key: string) => void;
  syncTooltip?: string;
  readOnly?: boolean;
}

export function DiffViewer({
  fields,
  leftTitle = "🟠 Bản của bạn",
  rightTitle = "🟢 Bản trên Server",
  onSyncField,
  syncTooltip = "Lấy dữ liệu này",
  readOnly = false
}: DiffViewerProps) {
  const shortFields = fields.filter(f => !f.isLongText);
  const longFields = fields.filter(f => f.isLongText);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      {/* Column headers */}
      <div className="grid grid-cols-2 gap-x-6 mb-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-2 border-b">{leftTitle}</div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-2 border-b">{rightTitle}</div>
      </div>

      {/* Short fields */}
      {shortFields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6">
          {shortFields.map(f => {
            const isDiff = f.leftVal !== f.rightVal;
            const isResolved = !isDiff;
            
            return (
              <Fragment key={f.key}>
                {/* Left Column */}
                <div className={`py-2.5 border-b relative ${isDiff ? "border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20 pl-3" : "pl-1"}`}>
                  <div className="text-[10px] text-muted-foreground mb-0.5">{f.label}</div>
                  <div className="text-sm break-words whitespace-pre-wrap">{f.leftVal}</div>
                </div>

                {/* Right Column */}
                <div className={`py-2.5 border-b group relative ${isDiff ? "border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 pl-3 pr-8" : "pl-1"}`}>
                  <div className="text-[10px] text-muted-foreground mb-0.5">{f.label}</div>
                  <div className="text-sm break-words whitespace-pre-wrap">{f.rightVal}</div>
                  
                  {isDiff && !readOnly && onSyncField && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="h-6 w-6 shadow-sm border border-emerald-200 hover:bg-emerald-100 text-emerald-700" 
                        title={syncTooltip}
                        onClick={() => onSyncField(f.key)}
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      )}

      {/* Long fields */}
      {longFields.map(f => {
        const isDiff = f.leftVal !== f.rightVal;
        
        return (
          <div key={f.key} className="mt-5">
            <div className="flex items-center justify-between pb-2 mb-2 border-b">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{f.label}</div>
              {isDiff && !readOnly && onSyncField && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-[10px] border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => onSyncField(f.key)}
                >
                  <ArrowLeft className="h-3 w-3 mr-1" /> Đồng bộ từ Server
                </Button>
              )}
            </div>
            
            {isDiff ? (
              <div className="grid grid-cols-2 gap-x-6">
                <div className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20 pl-3 pr-2 py-3 rounded-r">
                  <div className="text-[10px] text-muted-foreground mb-1.5 font-medium">{leftTitle}</div>
                  <ScrollArea className="max-h-[250px]">
                    <TextDiff oldText={f.rightVal} newText={f.leftVal} />
                  </ScrollArea>
                </div>
                <div className="border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 pl-3 pr-2 py-3 rounded-r">
                  <div className="text-[10px] text-muted-foreground mb-1.5 font-medium">{rightTitle}</div>
                  <ScrollArea className="max-h-[250px]">
                    <div className="text-sm whitespace-pre-wrap break-words pr-3">{f.rightVal}</div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">{f.label} không thay đổi.</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
