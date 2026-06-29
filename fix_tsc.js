const fs = require('fs');
const path = require('path');

// 1. Fix amazon-edit-sheet.tsx
const amzEditSheetPath = path.join(__dirname, 'src/components/ideas/amazon-edit-sheet.tsx');
let amzEditContent = fs.readFileSync(amzEditSheetPath, 'utf8');
amzEditContent = amzEditContent.replace(
  'photosUploaded: false,',
  'photosUploaded: false, sku: "", campAuto: false,'
);
fs.writeFileSync(amzEditSheetPath, amzEditContent);

// 2. Fix field-display.tsx
const fieldDisplayPath = path.join(__dirname, 'src/components/ideas/field-display.tsx');
let fdContent = fs.readFileSync(fieldDisplayPath, 'utf8');
fdContent = fdContent.replace(
  'export function SlugListDisplay({ label, slugsString, badge }: TagListDisplayProps)',
  'export interface SlugListDisplayProps { label: string; slugsString?: string | null; badge?: string; }\nexport function SlugListDisplay({ label, slugsString, badge }: SlugListDisplayProps)'
);
fdContent = fdContent.replace(/const parsed = JSON.parse\(slugsString\);\n      if \(Array.isArray\(parsed\)\) \{\n        slugs = parsed.map\(s => String\(s\).trim\(\)\).filter\(Boolean\);\n      \}/, 
`const parsed = JSON.parse(slugsString);
      if (Array.isArray(parsed)) {
        slugs = parsed.map((s: any) => String(s).trim()).filter(Boolean);
      }`);
fdContent = fdContent.replace(/slugs = slugsString.split\("\\n"\).map\(s => s.trim\(\)\).filter\(Boolean\);/g, `slugs = slugsString.split("\\n").map((s: any) => s.trim()).filter(Boolean);`);
fs.writeFileSync(fieldDisplayPath, fdContent);


// 3. Fix amazon-listing-tab.tsx
const amzTabPath = path.join(__dirname, 'src/components/ideas/amazon-listing-tab.tsx');
let amzTabContent = fs.readFileSync(amzTabPath, 'utf8');
amzTabContent = amzTabContent.replace('import { statusBadge } from "@/lib/utils";', 'import { Badge } from "@/components/ui/badge";\nimport { statusColors } from "@/types";');
amzTabContent = amzTabContent.replace('import { convertToDirectImageUrl } from "@/lib/utils";', 'import { convertToDirectImageUrl } from "@/lib/google-drive";');
// add statusBadge
amzTabContent = amzTabContent.replace('export function AmazonListingTab', `
function statusBadge(status: string, labels: Record<string, string>) {
  return (
    <Badge variant="outline" className={(statusColors as any)[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

export function AmazonListingTab`);
fs.writeFileSync(amzTabPath, amzTabContent);

// 4. Fix etsy-listing-tab.tsx
const etsyTabPath = path.join(__dirname, 'src/components/ideas/etsy-listing-tab.tsx');
let etsyTabContent = fs.readFileSync(etsyTabPath, 'utf8');
etsyTabContent = etsyTabContent.replace('import { statusBadge } from "@/lib/utils";', 'import { Badge } from "@/components/ui/badge";\nimport { statusColors } from "@/types";');
etsyTabContent = etsyTabContent.replace('import { convertToDirectImageUrl } from "@/lib/utils";', 'import { convertToDirectImageUrl } from "@/lib/google-drive";');
// add statusBadge
etsyTabContent = etsyTabContent.replace('export function EtsyListingTab', `
function statusBadge(status: string, labels: Record<string, string>) {
  return (
    <Badge variant="outline" className={(statusColors as any)[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

export function EtsyListingTab`);
fs.writeFileSync(etsyTabPath, etsyTabContent);

// 5. types/index.ts check if statusColors exists, if not, wait I don't know if it exists.
// I will just define statusColors in the tab files!
