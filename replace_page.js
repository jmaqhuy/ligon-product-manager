const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'src/app/(dashboard)/ideas/[id]/page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// 1. Add imports
const importsToAdd = `
import { AmazonListingTab } from "@/components/ideas/amazon-listing-tab";
import { EtsyListingTab } from "@/components/ideas/etsy-listing-tab";
`;
content = content.replace('import { AuditLogViewer } from "@/components/audit-log-viewer";', `import { AuditLogViewer } from "@/components/audit-log-viewer";${importsToAdd}`);

// 2. Remove amzForm, setAmzForm, amzEditOpen, etsyForm, etsyEditOpen states
content = content.replace(/const \[amzForm, setAmzForm\] = useState\(\{[\s\S]*?\}\);\n/g, '');
content = content.replace(/const \[etsyForm, setEtsyForm\] = useState\(\{[\s\S]*?\}\);\n/g, '');
content = content.replace(/const \[amzEditOpen, setAmzEditOpen\] = useState\(false\);\n/g, '');
content = content.replace(/const \[etsyEditOpen, setEtsyEditOpen\] = useState\(false\);\n/g, '');

// 3. Remove handleSaveAmazon and handleSaveEtsy
content = content.replace(/const handleSaveAmazon = async \(\) => \{[\s\S]*?\}\n  };\n/g, '');
content = content.replace(/const handleSaveEtsy = async \(\) => \{[\s\S]*?\}\n  };\n/g, '');

// 4. Simplify handleListingStatusChange
const simplifiedHandleListingStatusChange = `
  const handleListingStatusChange = async (platform: "amazon" | "etsy", newStatus: string) => {
    try {
      const res = await fetch(\`/api/ideas/\${id}/\${platform}-listing\`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingStatus: newStatus }),
      });
      if (res.ok) {
        toast.success(\`Trạng thái: \${(listingStatusLabels as Record<string, string>)[newStatus] || newStatus}\`);
        fetchIdea();
      } else {
        const err = await res.json();
        toast.error(err.error || "Lỗi cập nhật trạng thái");
        if (err.error?.includes("Lý do") || err.error?.includes("Thiếu") || err.error?.includes("Vui lòng")) {
          toast.info("Vui lòng click Sửa và nhập đầy đủ thông tin");
        }
      }
    } catch (err) {
      toast.error("Lỗi hệ thống");
    }
  };
`;
// find the handleListingStatusChange block and replace it
content = content.replace(/const handleListingStatusChange = async \([\s\S]*?catch \(err\) \{[\s\S]*?\}\n    \}\n  \};/g, simplifiedHandleListingStatusChange.trim());


// 5. Replace Tabs Content
// We need to replace everything from <TabsContent value="amazon"... to the end of the Tabs.
// It's safer to use regex that matches the start and end of these sections.
const tabsReplacement = `
                  {/* ─── Amazon Tab ─── */}
                  <AmazonListingTab
                    idea={idea}
                    sellingAccounts={sellingAccounts}
                    isNotApproved={isNotApproved}
                    isPartner={isPartner}
                    NEXT_STATUS={NEXT_STATUS}
                    saving={saving}
                    handleListingStatusChange={handleListingStatusChange}
                    fetchIdea={fetchIdea}
                    fulfillmentToggle={
                      <>
                        {idea.amazonListing?.fulfillmentType && (
                          <Badge variant="outline" className="text-[11px] ml-1 font-normal bg-muted/50">
                            {idea.amazonListing.fulfillmentType}
                          </Badge>
                        )}
                        {role !== "employee" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            disabled={saving}
                            onClick={() => {
                              const target = idea.amazonListing?.fulfillmentType === "FBA" ? "FBM" : "FBA";
                              if (idea.status !== "reviewing") {
                                setPendingFulfillment(target);
                                setChangeFulfillmentOpen(true);
                              } else {
                                handleUpdateIdea({ fulfillmentType: target });
                              }
                            }}
                          >
                            Chuyển sang {idea.amazonListing?.fulfillmentType === "FBA" ? "FBM" : "FBA"}?
                          </Button>
                        )}
                      </>
                    }
                  />

                  {/* ─── Etsy Tab ─── */}
                  <EtsyListingTab
                    idea={idea}
                    sellingAccounts={sellingAccounts}
                    isNotApproved={isNotApproved}
                    isPartner={isPartner}
                    NEXT_STATUS={NEXT_STATUS}
                    saving={saving}
                    handleListingStatusChange={handleListingStatusChange}
                    fetchIdea={fetchIdea}
                  />
`;

content = content.replace(/<TabsContent value="amazon"[\s\S]*?<\/fieldset><\/TabsContent>\n\n                  \{\/\* ─── Etsy Tab ─── \*\/\}[\s\S]*?<\/fieldset><\/TabsContent>/g, tabsReplacement.trim());


// 6. Update File Design UI to include actions
const fileDesignReplacement = `
            {/* File Management */}
            <div className="p-3 space-y-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">File Thiết Kế & Sản Xuất</span>
              <div className="space-y-2 mt-1">
                <div className="flex items-center justify-between text-[11px] px-1">
                  <span className="text-muted-foreground font-medium">Trạng thái file:</span>
                  {statusBadge(idea.fileStatus || "not_requested", fileStatusLabels)}
                </div>
                {idea.fileAssignee && (
                  <div className="flex items-center justify-between text-[11px] px-1">
                    <span className="text-muted-foreground font-medium">Người nhận file:</span>
                    <span className="font-medium truncate max-w-[150px] text-right">{idea.fileAssignee.fullName}</span>
                  </div>
                )}
                {idea.designFileUrl && (
                  <div className="flex items-center justify-between text-[11px] px-1">
                    <span className="text-muted-foreground font-medium">Link file:</span>
                    <a href={idea.designFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                      <ExternalLink className="h-3 w-3" /> Xem file thiết kế
                    </a>
                  </div>
                )}
                {idea.fileRevisionNote && (
                  <div className="text-[11px] px-1.5 py-1.5 mt-1 bg-amber-50 text-amber-800 rounded border border-amber-200">
                    <span className="font-semibold block mb-0.5">Ghi chú sửa:</span>
                    <span className="block whitespace-pre-wrap">{idea.fileRevisionNote}</span>
                  </div>
                )}

                {/* Workflow Actions for Design File */}
                <div className="pt-2 space-y-1.5 border-t mt-2">
                  {idea.fileStatus === "awaiting_file" && !idea.fileAssigneeId && (
                    <Button size="sm" className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleUpdateIdea({ fileAssigneeId: session?.user?.id })} disabled={saving}>
                      Nhận nhiệm vụ thiết kế
                    </Button>
                  )}
                  {idea.fileStatus === "awaiting_file" && idea.fileAssigneeId === session?.user?.id && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Input
                          placeholder="Nhập link file (Google Drive, Dropbox...)"
                          className="h-7 text-xs"
                          id="upload-file-url"
                          onBlur={(e) => {
                            if (e.target.value) handleUpdateIdea({ designFileUrl: e.target.value });
                          }}
                          defaultValue={idea.designFileUrl || ""}
                        />
                        <Button size="sm" className="w-full h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={() => {
                          const input = document.getElementById('upload-file-url') as HTMLInputElement;
                          if (!input?.value) { toast.error("Vui lòng nhập link file!"); return; }
                          handleUpdateIdea({ designFileUrl: input.value, fileStatus: "pending_approval" });
                        }} disabled={saving}>
                          Nộp file thiết kế
                        </Button>
                      </div>
                      <Button size="sm" variant="outline" className="w-full h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleUpdateIdea({ fileAssigneeId: null })} disabled={saving}>
                        Hủy nhận việc
                      </Button>
                    </>
                  )}
                  {idea.fileStatus === "revision_requested" && idea.fileAssigneeId === session?.user?.id && (
                    <div className="flex flex-col gap-1.5 mt-2">
                        <Input
                          placeholder="Cập nhật link file..."
                          className="h-7 text-xs"
                          id="update-file-url"
                          onBlur={(e) => {
                            if (e.target.value) handleUpdateIdea({ designFileUrl: e.target.value });
                          }}
                          defaultValue={idea.designFileUrl || ""}
                        />
                        <Button size="sm" className="w-full h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleUpdateIdea({ fileStatus: "pending_approval" })} disabled={saving}>
                          Nộp lại file đã sửa
                        </Button>
                    </div>
                  )}
                  {(role === "manager" || role === "boss" || idea.createdById === session?.user?.id) && idea.fileStatus === "pending_approval" && (
                    <div className="flex flex-col gap-1.5">
                      <Button size="sm" className="w-full h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => handleUpdateIdea({ fileStatus: "approved" })} disabled={saving}>
                        Duyệt file
                      </Button>
                      <div className="flex gap-1">
                        <Input id="file-revision-note" placeholder="Lý do sửa..." className="h-7 text-xs flex-1" />
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => {
                          const note = (document.getElementById('file-revision-note') as HTMLInputElement)?.value;
                          if (!note) { toast.error("Vui lòng nhập lý do sửa!"); return; }
                          handleUpdateIdea({ fileStatus: "revision_requested", fileRevisionNote: note });
                        }} disabled={saving}>
                          Yêu cầu sửa
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
`;
content = content.replace(/\{\/\* File Management \*\/\}[\s\S]*?<\/div>\n            <\/div>/g, fileDesignReplacement.trim());


// 7. Remove renderPhotoGallery since it's unused now (we moved photo logic to Edit Sheets? NO WAIT, the photo workflow is NOT in the Edit Sheets!)
// Wait, is photo workflow in Edit Sheets? No! In the edit sheets, I only included 'galleryImages' which are the product photos, but the photo approval workflow was in renderPhotoGallery.
// Does AmazonListingTab render renderPhotoGallery? No, I completely missed renderPhotoGallery when I extracted!
// Ah, the original code had renderPhotoGallery inside the Amazon and Etsy Tabs!
// Let's add a placeholder for it and keep it, or we need to put renderPhotoGallery back.
// Since we used a node script, I will actually inject renderPhotoGallery inside the page.tsx where it was, OR I can just skip removing it and pass it to AmazonListingTab as a prop? No, renderPhotoGallery can just be a standalone component.
// But we already wrote AmazonListingTab and EtsyListingTab without the photo workflow!
// Let me look at where renderPhotoGallery was called.
// It was called inside TabsContent value="amazon" below the Card.
// \`{renderPhotoGallery("amazon", idea.amazonListing, amzForm, setAmzEditOpen, async (data) => { ... })}\`
// Let's modify AmazonListingTab to include this. But `renderPhotoGallery` uses `session`, `canManagePhotos` etc.
// For now, I'll let the script remove `renderPhotoGallery` and I will write a `PhotoWorkflow` component and add it later.
// Let's just run this script for now and see.
// Wait, I should not delete `renderPhotoGallery` if I haven't extracted it yet!
// But wait, the previous code chunk I extracted DID NOT have `renderPhotoGallery`. It was placed right before the end of the `fieldset` inside `TabsContent`.
// If I don't re-add it, the photo workflow is gone!
// Let me fix that by exporting `PhotoWorkflow` in a new file, and then modifying AmazonListingTab to include it.

fs.writeFileSync(pagePath, content);
console.log('Done replacing chunks in page.tsx');
