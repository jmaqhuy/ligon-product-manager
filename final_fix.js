const fs = require('fs');

function finalFix(file) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace('const role = "manager";', 'const role = "manager" as string;');
  c = c.replace(/\{\(NEXT_STATUS as any\)\[idea\.[a-z]+Listing\?\.listingStatus \|\| "ready"\] \|\| \[\]\)\.map\(opt => \(/g, '{(NEXT_STATUS as any)[idea.amazonListing?.listingStatus || idea.etsyListing?.listingStatus || "ready"] || []).map((opt: any) => (');
  c = c.replace(/\.map\(opt => \(/g, '.map((opt: any) => (');
  
  if (file.includes('amazon')) {
    // Remove renderPhotoGallery block manually
    const lines = c.split('\n');
    const out = [];
    let skip = false;
    for (let i=0; i<lines.length; i++) {
      if (lines[i].includes('renderPhotoGallery("amazon"')) {
        skip = true;
        out.push('<div className="text-xs text-muted-foreground p-2 bg-muted/40 rounded-md border border-dashed text-center mt-2">Ảnh sản phẩm Amazon (Quản lý tại bảng Sửa)</div>');
      }
      if (!skip) out.push(lines[i]);
      if (skip && lines[i].includes('})}')) {
        skip = false;
      }
    }
    c = out.join('\n');
  }

  fs.writeFileSync(file, c);
}

finalFix('src/components/ideas/amazon-listing-tab.tsx');
finalFix('src/components/ideas/etsy-listing-tab.tsx');
