const fs = require('fs');

// 1. Update page.tsx
let page = fs.readFileSync('src/app/(dashboard)/ideas/[id]/page.tsx', 'utf8');
page = page.replace(/<AmazonListingTab\s*idea=\{idea\}\s*sellingAccounts=\{sellingAccounts\}/g, '<AmazonListingTab\n                    session={session}\n                    canManagePhotos={canManagePhotos}\n                    idea={idea}\n                    sellingAccounts={sellingAccounts}');
page = page.replace(/<EtsyListingTab\s*idea=\{idea\}\s*sellingAccounts=\{sellingAccounts\}/g, '<EtsyListingTab\n                    session={session}\n                    canManagePhotos={canManagePhotos}\n                    idea={idea}\n                    sellingAccounts={sellingAccounts}');
fs.writeFileSync('src/app/(dashboard)/ideas/[id]/page.tsx', page);

// 2. Update amazon-listing-tab.tsx
let amz = fs.readFileSync('src/components/ideas/amazon-listing-tab.tsx', 'utf8');
amz = amz.replace('role?: string;\n}', 'role?: string;\n  session?: any;\n  canManagePhotos?: boolean;\n}');
amz = amz.replace('role,\n}: AmazonListingTabProps)', 'role,\n  session,\n  canManagePhotos,\n}: AmazonListingTabProps)');

const amzPhotoCode = `
      <PhotoGallery
        platform="amazon"
        listing={idea.amazonListing}
        form={amzForm}
        setEditOpen={setEditOpen}
        handleUpdateListing={async (data) => {
          setSaving(true);
          try {
            const res = await fetch(\`/api/ideas/\${id}/amazon-listing\`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            if (res.ok) fetchIdea();
            else toast.error("Lỗi cập nhật ảnh Amazon");
          } catch {
            toast.error("Lỗi hệ thống");
          } finally {
            setSaving(false);
          }
        }}
        saving={saving}
        canManagePhotos={!!canManagePhotos}
        session={session}
        idea={idea}
      />
`;
amz = amz.replace('<div className="text-xs text-muted-foreground p-2 bg-muted/40 rounded-md border border-dashed text-center mt-2">Ảnh sản phẩm Amazon (Quản lý tại bảng Sửa)</div>', amzPhotoCode.trim());
amz = amz.replace('import { ExternalLink', 'import { PhotoGallery } from "./photo-gallery";\nimport { ExternalLink');
fs.writeFileSync('src/components/ideas/amazon-listing-tab.tsx', amz);

// 3. Update etsy-listing-tab.tsx
let etsy = fs.readFileSync('src/components/ideas/etsy-listing-tab.tsx', 'utf8');
etsy = etsy.replace('role?: string;\n}', 'role?: string;\n  session?: any;\n  canManagePhotos?: boolean;\n}');
etsy = etsy.replace('role,\n}: EtsyListingTabProps)', 'role,\n  session,\n  canManagePhotos,\n}: EtsyListingTabProps)');

const etsyPhotoCode = `
      <PhotoGallery
        platform="etsy"
        listing={idea.etsyListing}
        form={etsyForm}
        setEditOpen={setEditOpen}
        handleUpdateListing={async (data) => {
          setSaving(true);
          try {
            const res = await fetch(\`/api/ideas/\${id}/etsy-listing\`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            if (res.ok) fetchIdea();
            else toast.error("Lỗi cập nhật ảnh Etsy");
          } catch {
            toast.error("Lỗi hệ thống");
          } finally {
            setSaving(false);
          }
        }}
        saving={saving}
        canManagePhotos={!!canManagePhotos}
        session={session}
        idea={idea}
      />
`;
etsy = etsy.replace('<div className="text-xs text-muted-foreground p-2 bg-muted/40 rounded-md border border-dashed text-center mt-2">Ảnh sản phẩm Etsy (Quản lý tại bảng Sửa hoặc Trang chính)</div>', etsyPhotoCode.trim());
etsy = etsy.replace('<div className="text-xs text-muted-foreground p-2 bg-muted/40 rounded-md border border-dashed text-center mt-2">Ảnh sản phẩm Etsy (Quản lý tại bảng Sửa)</div>', etsyPhotoCode.trim());
etsy = etsy.replace('import { ExternalLink', 'import { PhotoGallery } from "./photo-gallery";\nimport { ExternalLink');
fs.writeFileSync('src/components/ideas/etsy-listing-tab.tsx', etsy);

console.log("Done inject props");
