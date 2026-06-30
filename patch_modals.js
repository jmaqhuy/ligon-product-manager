const fs = require('fs');
const path = './src/app/(dashboard)/ideas/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const conflictModalStart = content.indexOf('{/* ═══ Conflict Resolution Modal ═══ */}');
const tooltipProviderEnd = content.lastIndexOf('</TooltipProvider>');
if (conflictModalStart === -1 || tooltipProviderEnd === -1) {
  console.log("Could not find boundaries");
  process.exit(1);
}

const replacement = `      {/* ═══ Conflict Resolution Modal ═══ */}
      <Dialog open={conflictModalOpen} onOpenChange={(open) => { if (!open) setConflictModalOpen(false); }}>
        <DialogContent showCloseButton={false} className="sm:max-w-5xl max-h-[90vh] p-0 flex flex-col z-[300] overflow-hidden">
          <div className="shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <GitCompareArrows className="h-5 w-5 text-amber-500" />
                Xung đột dữ liệu
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>{conflictBy}</strong> vừa cập nhật ý tưởng này. Bạn có thể đồng bộ từng trường hoặc ghi đè toàn bộ.
              </p>
            </DialogHeader>
          </div>

          {conflictData && (() => {
            const myTopic = topics.find((t: any) => t.id === ideaForm.topicId)?.name || ideaForm.topicId;
            const serverTopic = conflictData.topic?.name || "";
            const myModel = aiModels.find((m: any) => m.id === ideaForm.aiModelId)?.name || ideaForm.aiModelId;
            const serverModel = conflictData.aiModel?.name || "";
            const myDims = \`\${ideaForm.widthCm || "—"} × \${ideaForm.heightCm || "—"} × \${ideaForm.thicknessMm || "—"} \${dimensionUnit}\`;
            const serverDims = conflictData.widthCm ? \`\${Number(conflictData.widthCm) * 10} × \${Number(conflictData.heightCm) * 10} × \${conflictData.thicknessMm} mm\` : "—";
            const myMaterial = ideaForm.material || "—";
            const serverMaterial = conflictData.material || "—";
            const myLinks = ideaForm.sourceLinks.filter((l: string) => l.trim()).join("\\n") || "—";
            const serverLinks = (() => { try { return (JSON.parse(conflictData.sourceLinks || "[]") as string[]).join("\\n") || "—"; } catch { return "—"; } })();
            const myPrompt = ideaForm.prompt || "—";
            const serverPrompt = conflictData.prompt || "—";

            const fields: DiffField[] = [
              { key: "topicId", label: "Chủ đề sản phẩm", leftVal: myTopic, rightVal: serverTopic },
              { key: "aiModelId", label: "AI Model", leftVal: myModel, rightVal: serverModel },
              { key: "dims", label: "Kích thước", leftVal: myDims, rightVal: serverDims },
              { key: "material", label: "Vật liệu", leftVal: myMaterial, rightVal: serverMaterial },
              { key: "sourceLinks", label: "Source Links", leftVal: myLinks, rightVal: serverLinks },
              { key: "prompt", label: "Prompt", leftVal: myPrompt, rightVal: serverPrompt, isLongText: true },
            ];

            const handleSyncField = (key: string) => {
              if (key === "dims") {
                setIdeaForm(prev => ({
                  ...prev,
                  widthCm: conflictData.widthCm ? (conflictData.widthCm * 10).toString() : "",
                  heightCm: conflictData.heightCm ? (conflictData.heightCm * 10).toString() : "",
                  thicknessMm: conflictData.thicknessMm ? conflictData.thicknessMm.toString() : "",
                }));
                setDimensionUnit("mm");
              } else if (key === "sourceLinks") {
                const parsedLinks = (() => { try { return JSON.parse(conflictData.sourceLinks || "[]"); } catch { return [""]; } })();
                setIdeaForm(prev => ({ ...prev, sourceLinks: parsedLinks.length > 0 ? parsedLinks : [""] }));
              } else {
                setIdeaForm(prev => ({ ...prev, [key]: conflictData[key] || "" }));
              }
            };

            return (
              <DiffViewer 
                fields={fields} 
                onSyncField={handleSyncField} 
              />
            );
          })()}

          <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setConflictModalOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const parsedLinks = (() => { try { return JSON.parse(conflictData.sourceLinks || "[]"); } catch { return [""]; } })();
                setDimensionUnit("mm");
                setIdeaForm({
                  prompt: conflictData.prompt || "",
                  topicId: conflictData.topicId || "",
                  aiModelId: conflictData.aiModelId || "",
                  widthCm: conflictData.widthCm ? (conflictData.widthCm * 10).toString() : "",
                  heightCm: conflictData.heightCm ? (conflictData.heightCm * 10).toString() : "",
                  thicknessMm: conflictData.thicknessMm ? conflictData.thicknessMm.toString() : "",
                  material: conflictData.material || "",
                  source: conflictData.source || "",
                  partnerId: conflictData.partnerId || "",
                  sourceLinks: parsedLinks.length > 0 ? parsedLinks : [""]
                });
                setIdea(conflictData);
                setConflictData(null);
                setConflictModalOpen(false);
                toast.success("Đã áp dụng toàn bộ phiên bản từ server.");
              }}
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Lấy toàn bộ từ Server
            </Button>
            <Button
              variant="default"
              onClick={() => handleSaveIdea(conflictData.version)}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Lưu bản gộp (Merge & Save)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Manager Review Modal ═══ */}
      <Dialog open={reviewModalOpen} onOpenChange={(open) => { if (!open) setReviewModalOpen(false); }}>
        <DialogContent showCloseButton={true} className="sm:max-w-5xl max-h-[90vh] p-0 flex flex-col z-[300] overflow-hidden">
          <div className="shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Check className="h-5 w-5 text-emerald-500" />
                Duyệt thay đổi mới
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Nhân viên đã cập nhật các thông tin sau.
              </p>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto">
            {auditLogs.length > 0 ? (() => {
              const fieldsMap: Record<string, string> = {
                prompt: "Prompt",
                topicId: "Chủ đề sản phẩm",
                aiModelId: "AI Model",
                widthCm: "Chiều dài (cm)",
                heightCm: "Chiều rộng (cm)",
                thicknessMm: "Độ dày (mm)",
                material: "Vật liệu",
                sourceLinks: "Source Links",
                source: "Nguồn ý tưởng",
                partnerId: "Partner",
              };

              const diffFields = auditLogs.map(log => {
                let leftVal = log.oldValue || "—";
                let rightVal = log.newValue || "—";
                
                // Format links
                if (log.fieldName === "sourceLinks") {
                  try {
                    if (leftVal !== "—") leftVal = (JSON.parse(leftVal) as string[]).join("\\n") || "—";
                    if (rightVal !== "—") rightVal = (JSON.parse(rightVal) as string[]).join("\\n") || "—";
                  } catch {}
                }
                
                // Format topics and models if possible (we might not have names here without fetch, so we just show IDs or best effort)
                // Actually we can map using topics array
                if (log.fieldName === "topicId") {
                  leftVal = topics.find((t: any) => t.id === leftVal)?.name || leftVal;
                  rightVal = topics.find((t: any) => t.id === rightVal)?.name || rightVal;
                }
                if (log.fieldName === "aiModelId") {
                  leftVal = aiModels.find((m: any) => m.id === leftVal)?.name || leftVal;
                  rightVal = aiModels.find((m: any) => m.id === rightVal)?.name || rightVal;
                }

                return {
                  key: log.fieldName,
                  label: fieldsMap[log.fieldName] || log.fieldName,
                  leftVal,
                  rightVal,
                  isLongText: log.fieldName === "prompt"
                };
              });

              return (
                <DiffViewer 
                  fields={diffFields} 
                  leftTitle="Bản cũ" 
                  rightTitle="Bản mới cập nhật"
                  readOnly={true}
                />
              );
            })() : (
              <div className="p-8 text-center text-muted-foreground">Không tìm thấy chi tiết thay đổi hoặc dữ liệu cũ.</div>
            )}
          </div>

          <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setReviewModalOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="default"
              onClick={() => {
                handleUpdateIdea({ needsReReview: false });
                setReviewModalOpen(false);
              }}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Xác nhận đã xem
            </Button>
          </div>
        </DialogContent>
      </Dialog>
`;

const newContent = content.substring(0, conflictModalStart) + replacement + "\n    </TooltipProvider>";
fs.writeFileSync(path, newContent, 'utf8');
console.log("Modals patched.");
