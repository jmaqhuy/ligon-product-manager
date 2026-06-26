"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Upload, Download, FileSpreadsheet, Loader2, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

// ─── Types ───

interface MetadataForExcel {
  topics: { id: string; name: string }[];
  aiModels: { id: string; name: string }[];
  partners: { id: string; name: string }[];
}

interface IdeaRow {
  row: number;
  msku: string;
  topic: string;
  aiModel: string;
  fulfillmentType: string;
  prompt: string;
  mainImageUrl: string;
  sourceLinks: string;
  title: string;
  description: string;
  bullet1: string; bullet2: string; bullet3: string; bullet4: string; bullet5: string;
  tags: string;
  slugs: string;
  widthCm: string;
  heightCm: string;
  thicknessMm: string;
  material: string;
  source: string;
  partner: string;
  partnerLabel: string;
  errors: string[];
}

interface BatchResult {
  success: number;
  failed: number;
  created: { msku: string; id: string }[];
  errors: { row: number; msku: string; error: string }[];
}

// ─── Excel column definitions ───

const EXCEL_COLUMNS = [
  // Section: Chung
  { key: "msku", header: "MSKU", section: "Chung", required: false },
  { key: "topic", header: "Chủ đề", section: "Chung", required: true, dropdown: "topics" },
  { key: "aiModel", header: "AI Model", section: "Chung", required: true, dropdown: "aiModels" },
  { key: "fulfillmentType", header: "FBA/FBM", section: "Chung", required: true, dropdown: "static", dropdownValues: ["FBA", "FBM"] },
  { key: "prompt", header: "Prompt", section: "Chung", required: true },
  { key: "mainImageUrl", header: "Ảnh main (URL)", section: "Chung", required: true },
  { key: "sourceLinks", header: "Link nguồn", section: "Chung", required: false },
  { key: "source", header: "Nguồn", section: "Chung", required: false, dropdown: "static", dropdownValues: ["employee", "partner"] },
  { key: "partner", header: "Đối tác", section: "Chung", required: false, dropdown: "partners" },
  { key: "partnerLabel", header: "Mã label ĐT", section: "Chung", required: false },
  { key: "widthCm", header: "Rộng (cm)", section: "Chung", required: false },
  { key: "heightCm", header: "Cao (cm)", section: "Chung", required: false },
  { key: "thicknessMm", header: "Dày (mm)", section: "Chung", required: false },
  { key: "material", header: "Vật liệu", section: "Chung", required: false },
  // Section: Nội dung
  { key: "title", header: "Tiêu đề", section: "Nội dung", required: false },
  { key: "description", header: "Mô tả", section: "Nội dung", required: false },
  { key: "bullet1", header: "Bullet 1", section: "Nội dung", required: false },
  { key: "bullet2", header: "Bullet 2", section: "Nội dung", required: false },
  { key: "bullet3", header: "Bullet 3", section: "Nội dung", required: false },
  { key: "bullet4", header: "Bullet 4", section: "Nội dung", required: false },
  { key: "bullet5", header: "Bullet 5", section: "Nội dung", required: false },
  { key: "tags", header: "Tags (;)", section: "Nội dung", required: false },
  { key: "slugs", header: "Slugs (\\n)", section: "Nội dung", required: false },
];

// ─── Component ───

export function ExcelUpload({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState<MetadataForExcel>({ topics: [], aiModels: [], partners: [] });
  const [rows, setRows] = useState<IdeaRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Fetch metadata for dropdowns
  const fetchMeta = useCallback(async () => {
    try {
      const [topicsRes, aiRes, partnersRes] = await Promise.all([
        fetch("/api/topics"),
        fetch("/api/ai-models"),
        fetch("/api/partners"),
      ]);
      const [topics, aiModels, partners] = await Promise.all([
        topicsRes.ok ? topicsRes.json() : [],
        aiRes.ok ? aiRes.json() : [],
        partnersRes.ok ? partnersRes.json() : [],
      ]);
      setMeta({ topics, aiModels, partners });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (open) {
      fetchMeta();
      setRows([]);
      setResult(null);
      setFileName("");
    }
  }, [open, fetchMeta]);

  // ─── Generate template with exceljs (formatted with colors, dropdowns) ───
  const downloadTemplate = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Ý tưởng");

    ws.columns = EXCEL_COLUMNS.map((col) => ({
      header: col.header + (col.required ? " *" : ""),
      key: col.key,
      width: ["prompt", "description", "mainImageUrl", "sourceLinks"].includes(col.key) ? 45
        : ["title"].includes(col.key) ? 35
        : ["tags", "slugs"].includes(col.key) ? 25
        : col.key === "msku" ? 18 : 16,
    }));

    const headerRow = ws.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2F5496" } };
      cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 11, name: "Calibri" };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } } as any;
    });

    const dropdownMap: Record<string, string[]> = {
      topics: meta.topics.map(t => t.name),
      aiModels: meta.aiModels.map(m => m.name),
      partners: meta.partners.map(p => p.name),
    };

    EXCEL_COLUMNS.forEach((col, ci) => {
      if (!col.dropdown) return;
      let values = col.dropdown === "static" && col.dropdownValues ? col.dropdownValues : (dropdownMap[col.dropdown] || []);
      if (values.length === 0) return;
      const colLetter = String.fromCharCode(65 + ci);
      for (let r = 2; r <= 1000; r++) {
        ws.getCell(`${colLetter}${r}`).dataValidation = {
          type: "list", allowBlank: true, formulae: [`"${values.join(",")}"`],
        };
      }
    });

    // Sample row
    const sampleRow = ws.getRow(2);
    sampleRow.height = 20;
    EXCEL_COLUMNS.forEach((col, ci) => {
      const cell = sampleRow.getCell(ci + 1);
      if (col.key === "topic") cell.value = meta.topics[0]?.name || "";
      else if (col.key === "aiModel") cell.value = meta.aiModels[0]?.name || "";
      else if (col.key === "fulfillmentType") cell.value = "FBM";
      else if (col.key === "prompt") cell.value = "Nhập prompt...";
      else if (col.key === "mainImageUrl") cell.value = "https://drive.google.com/file/d/...";
      else if (col.key === "source") cell.value = "employee";
      cell.font = { size: 10, name: "Calibri", italic: true, color: { argb: "808080" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F2F2F2" } };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } } as any;
    });

    for (let r = 3; r <= 50; r++) {
      const row = ws.getRow(r);
      row.height = 18;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { size: 10, name: "Calibri" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } } as any;
      });
    }

    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: EXCEL_COLUMNS.length } };

    // Sheet 2: valid values
    const metaWs = wb.addWorksheet("Giá trị hợp lệ");
    metaWs.columns = [
      { header: "Trường", key: "field", width: 18 },
      { header: "Giá trị", key: "value", width: 20 },
      { header: "Ghi chú", key: "note", width: 30 },
    ];
    const mhRow = metaWs.getRow(1);
    mhRow.height = 22;
    mhRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2F5496" } };
      cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
    });

    const metaData = [
      { field: "FBA/FBM", value: "FBA, FBM", note: "Bắt buộc" },
      { field: "Nguồn", value: "employee, partner", note: "Mặc định: employee" },
      ...meta.topics.map(t => ({ field: "Chủ đề", value: t.name, note: "" })),
      ...meta.aiModels.map(m => ({ field: "AI Model", value: m.name, note: "" })),
      ...meta.partners.map(p => ({ field: "Đối tác", value: p.name, note: "" })),
    ];
    metaData.forEach((d, i) => {
      const row = metaWs.getRow(i + 2);
      row.getCell(1).value = d.field;
      row.getCell(2).value = d.value;
      row.getCell(3).value = d.note;
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mau-tai-len-y-tuong.xlsx";
    a.click();
    toast.success("Đã tải template");
  };

  // Handle file drop/select
  const processFile = async (file: File) => {
    if (!file.name.endsWith(".xlsx")) {
      toast.error("Vui lòng chọn file .xlsx");
      return;
    }
    setFileName(file.name);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

      if (json.length < 2) {
        toast.error("File Excel trống hoặc không đúng định dạng");
        return;
      }

      // Skip header row (row 0)
      const parsedRows: IdeaRow[] = [];
      
      // Build header map from first row
      const headerRow = json[0] as string[];
      const headerMap: Record<string, number> = {};
      headerRow.forEach((h, i) => {
        const clean = h.replace(" *", "").trim().toLowerCase();
        headerMap[clean] = i;
      });

      // Map Excel columns to our fields
      const fieldMap: Record<string, string> = {};
      for (const col of EXCEL_COLUMNS) {
        fieldMap[col.header.toLowerCase()] = col.key;
        fieldMap[(col.header + " *").toLowerCase()] = col.key;
      }

      for (let r = 1; r < json.length; r++) {
        const rawRow = json[r] as string[];
        if (!rawRow || rawRow.every(c => !c || !c.trim())) continue; // skip empty rows

        const row: IdeaRow = {
          row: r + 1,
          msku: "", topic: "", aiModel: "", fulfillmentType: "FBM",
          prompt: "", mainImageUrl: "", sourceLinks: "",
          title: "", description: "",
          bullet1: "", bullet2: "", bullet3: "", bullet4: "", bullet5: "",
          tags: "", slugs: "",
          widthCm: "", heightCm: "", thicknessMm: "", material: "",
          source: "employee", partner: "", partnerLabel: "",
          errors: [],
        };

        for (const [header, colIdx] of Object.entries(headerMap)) {
          const key = fieldMap[header];
          if (key && rawRow[colIdx] !== undefined && rawRow[colIdx] !== null) {
            (row as any)[key] = String(rawRow[colIdx]).trim();
          }
        }

        // Validate required fields
        for (const col of EXCEL_COLUMNS) {
          if (col.required) {
            const val = (row as any)[col.key];
            if (!val || !val.trim()) {
              row.errors.push(`Thiếu "${col.header}"`);
            }
          }
        }

        // Validate fulfillment type
        if (row.fulfillmentType && !["FBA", "FBM"].includes(row.fulfillmentType)) {
          row.errors.push(`FBA/FBM không hợp lệ: "${row.fulfillmentType}"`);
        }

        // Validate source
        if (row.source && !["employee", "partner"].includes(row.source)) {
          row.errors.push(`Nguồn không hợp lệ: "${row.source}"`);
        }

        // Validate topic exists
        if (row.topic && meta.topics.length > 0 && !meta.topics.find(t => t.name === row.topic)) {
          row.errors.push(`Chủ đề "${row.topic}" không tồn tại`);
        }

        // Validate AI model exists
        if (row.aiModel && meta.aiModels.length > 0 && !meta.aiModels.find(m => m.name === row.aiModel)) {
          row.errors.push(`AI Model "${row.aiModel}" không tồn tại`);
        }

        parsedRows.push(row);
      }

      if (parsedRows.length === 0) {
        toast.error("Không tìm thấy dữ liệu hợp lệ trong file");
        return;
      }

      setRows(parsedRows);
      toast.success(`Đã đọc ${parsedRows.length} dòng từ file`);
    } catch (e) {
      toast.error("Lỗi đọc file Excel. Kiểm tra định dạng file.");
      console.error(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (e.target) e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  // Submit batch
  const handleSubmit = async () => {
    const validRows = rows.filter(r => r.errors.length === 0);
    if (validRows.length === 0) {
      toast.error("Không có dòng nào hợp lệ để tạo");
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await apiFetch("/api/ideas/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideas: validRows.map(r => ({
            msku: r.msku || undefined,
            topic: r.topic,
            aiModel: r.aiModel,
            fulfillmentType: r.fulfillmentType,
            prompt: r.prompt,
            mainImageUrl: r.mainImageUrl,
            sourceLinks: r.sourceLinks ? [r.sourceLinks] : [],
            title: r.title || undefined,
            description: r.description || undefined,
            bulletPoints: [r.bullet1, r.bullet2, r.bullet3, r.bullet4, r.bullet5].filter(Boolean),
            tags: r.tags || undefined,
            slugs: r.slugs || undefined,
            widthCm: r.widthCm ? parseFloat(r.widthCm) : undefined,
            heightCm: r.heightCm ? parseFloat(r.heightCm) : undefined,
            thicknessMm: r.thicknessMm ? parseFloat(r.thicknessMm) : undefined,
            material: r.material || undefined,
            source: r.source || "employee",
            partner: r.partner || undefined,
            partnerLabel: r.partnerLabel || undefined,
          })),
        }),
      });

      if (error) {
        toast.error(typeof error === "string" ? error : "Lỗi tạo hàng loạt");
      } else if (data) {
        setResult(data);
        if (data.failed === 0) {
          toast.success(`Đã tạo ${data.success} ý tưởng thành công!`);
          onSuccess?.();
        } else {
          toast.warning(`Đã tạo ${data.success} ý tưởng, ${data.failed} lỗi`);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const errorCount = rows.filter(r => r.errors.length > 0).length;
  const validCount = rows.length - errorCount;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="mr-2 h-4 w-4" /> Tải lên ý tưởng
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!max-w-[70vw] !w-[70vw] max-h-[98vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" /> Tải lên ý tưởng hàng loạt
              </DialogTitle>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-3.5 w-3.5" /> Tải template tại đây
            </Button>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
            {/* Drop zone */}
            {!fileName && (
              <div
                className={`border-2 border-dashed rounded-lg flex-1 min-h-[250px] flex flex-col items-center justify-center transition-colors cursor-pointer ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
                <Upload className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-base font-medium">Kéo thả file Excel vào đây</p>
                <p className="text-sm text-muted-foreground mt-1">hoặc click để chọn file .xlsx</p>
                <p className="text-xs text-muted-foreground mt-3">Tải template ở trên để có định dạng đúng chuẩn</p>
              </div>
            )}

            {/* File loaded indicator */}
            {fileName && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{fileName}</span>
                <Badge variant="outline" className="text-[10px]">{rows.length} dòng</Badge>
                <Badge variant="outline" className="text-[10px] text-green-600">{validCount} hợp lệ</Badge>
                {errorCount > 0 && <Badge variant="destructive" className="text-[10px]">{errorCount} lỗi</Badge>}
                <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => { setFileName(""); setRows([]); }}>
                  Chọn file khác
                </Button>
              </div>
            )}

            {/* Preview table */}
            {rows.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[380px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-xs">#</TableHead>
                        <TableHead className="text-xs">MSKU</TableHead>
                        <TableHead className="text-xs">Chủ đề</TableHead>
                        <TableHead className="text-xs">AI Model</TableHead>
                        <TableHead className="text-xs">FBA/FBM</TableHead>
                        <TableHead className="text-xs">Nguồn</TableHead>
                        <TableHead className="text-xs">Tiêu đề</TableHead>
                        <TableHead className="w-40 text-xs">Lỗi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, i) => (
                        <TableRow key={i} className={row.errors.length > 0 ? "bg-red-50/30" : ""}>
                          <TableCell className="text-xs text-muted-foreground">{row.row}</TableCell>
                          <TableCell className="text-xs font-mono">{row.msku || "(tự sinh)"}</TableCell>
                          <TableCell className="text-xs">{row.topic}</TableCell>
                          <TableCell className="text-xs">{row.aiModel}</TableCell>
                          <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{row.fulfillmentType}</Badge></TableCell>
                          <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{row.source}</Badge></TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{row.title || "—"}</TableCell>
                          <TableCell className="text-[10px]">
                            {row.errors.length > 0
                              ? row.errors.map((e, j) => <Badge key={j} variant="destructive" className="text-[9px] mr-0.5">{e}</Badge>)
                              : <Check className="h-3.5 w-3.5 text-green-500" />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className={`rounded-lg p-4 ${result.failed > 0 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
                {result.failed === 0 ? (
                  <p className="text-sm text-green-700 flex items-center gap-2"><Check className="h-4 w-4" /> Tất cả {result.success} ý tưởng đã được tạo!</p>
                ) : (
                  <>
                    <p className="text-sm text-amber-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {result.success} thành công, {result.failed} lỗi</p>
                    <div className="mt-2 space-y-0.5">{result.errors.map((e, i) => <p key={i} className="text-xs text-red-600">Dòng {e.row}: {e.error}</p>)}</div>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            {rows.length > 0 && !result && (
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => { setRows([]); setFileName(""); }}>Huỷ</Button>
                <Button onClick={handleSubmit} disabled={submitting || validCount === 0}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Tạo {validCount} ý tưởng
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
