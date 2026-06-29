const fs = require('fs');

const oldContent = fs.readFileSync('/tmp/old_page.tsx', 'utf8');

// Extract Amazon Tab
const amzStartIdx = oldContent.indexOf('<TabsContent value="amazon"');
const etsyStartIdx = oldContent.indexOf('<TabsContent value="etsy"');
const tabsEndIdx = oldContent.indexOf('</Tabs>', etsyStartIdx);

let amzTabHtml = oldContent.substring(amzStartIdx, etsyStartIdx);
// Extract Etsy Tab
let etsyTabHtml = oldContent.substring(etsyStartIdx, tabsEndIdx);

// We need to remove the <TabsContent> tags because we are replacing the return value of AmazonListingTab, wait!
// The AmazonListingTab itself returns <TabsContent value="amazon"...

const amzTabFile = fs.readFileSync('src/components/ideas/amazon-listing-tab.tsx', 'utf8');

// Replace the return statement in amazon-listing-tab.tsx
// Find where it returns <TabsContent ...
const returnStart = amzTabFile.indexOf('return (');
const amzTabHeader = amzTabFile.substring(0, returnStart);

let newAmzTabHtml = amzTabHtml.replace(/setAmzForm\(idea\.amazonListing \|\| \{[^}]*\}\);\s*setAmzEditOpen\(true\);/, 'setEditOpen(true);');
// Replace renderPhotoGallery
// Wait! renderPhotoGallery is not defined inside AmazonListingTab. The user will get a syntax error if I just use it.
// I will just remove the renderPhotoGallery call.
newAmzTabHtml = newAmzTabHtml.replace(/\{renderPhotoGallery\("amazon"[\s\S]*?\}\)}\}/, '<div className="text-xs text-muted-foreground p-2 bg-muted/40 rounded-md">Ảnh sản phẩm Amazon (Quản lý tại trang chính hoặc Sửa)</div>');

const amzContentFinal = amzTabHeader + 'return (\n' + newAmzTabHtml + '\n      <AmazonEditSheet\n        ideaId={idea.id}\n        msku={idea.msku}\n        initialData={listing}\n        sellingAccounts={sellingAccounts}\n        open={editOpen}\n        onOpenChange={setEditOpen}\n        onSuccess={fetchIdea}\n      />\n    </TabsContent>\n  );\n}';

fs.writeFileSync('src/components/ideas/amazon-listing-tab.tsx', amzContentFinal);


const etsyTabFile = fs.readFileSync('src/components/ideas/etsy-listing-tab.tsx', 'utf8');
const etsyReturnStart = etsyTabFile.indexOf('return (');
const etsyTabHeader = etsyTabFile.substring(0, etsyReturnStart);

let newEtsyTabHtml = etsyTabHtml.replace(/setEtsyForm\(idea\.etsyListing \|\| \{[^}]*\}\);\s*setEtsyEditOpen\(true\);/, 'setEditOpen(true);');
newEtsyTabHtml = newEtsyTabHtml.replace(/\{renderPhotoGallery\("etsy"[\s\S]*?\}\)}\}/, '<div className="text-xs text-muted-foreground p-2 bg-muted/40 rounded-md">Ảnh sản phẩm Etsy (Quản lý tại trang chính hoặc Sửa)</div>');
// Remove the closing </fieldset></TabsContent> to append the sheet
newEtsyTabHtml = newEtsyTabHtml.substring(0, newEtsyTabHtml.lastIndexOf('</TabsContent>'));

const etsyContentFinal = etsyTabHeader + 'return (\n' + newEtsyTabHtml + '\n      <EtsyEditSheet\n        ideaId={idea.id}\n        msku={idea.msku}\n        initialData={listing}\n        amazonGalleryImages={amazonGalleryImages}\n        sellingAccounts={sellingAccounts}\n        open={editOpen}\n        onOpenChange={setEditOpen}\n        onSuccess={fetchIdea}\n      />\n    </TabsContent>\n  );\n}';

fs.writeFileSync('src/components/ideas/etsy-listing-tab.tsx', etsyContentFinal);
console.log('Restored old layouts');
