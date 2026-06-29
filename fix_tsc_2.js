const fs = require('fs');
const path = require('path');

// 1. Fix page.tsx (remove setAmzForm and setEtsyForm inside useEffect)
const pagePath = path.join(__dirname, 'src/app/(dashboard)/ideas/[id]/page.tsx');
let pageContent = fs.readFileSync(pagePath, 'utf8');
pageContent = pageContent.replace(/setAmzForm\(prev => \(\{ \.\.\.prev, listingStatus: data\.amazonListing\?.listingStatus \|\| "ready" \}\)\);/g, '');
pageContent = pageContent.replace(/setAmzForm\(\{[\s\S]*?\}\);/g, '');
pageContent = pageContent.replace(/setEtsyForm\(prev => \(\{ \.\.\.prev, listingStatus: data\.etsyListing\?.listingStatus \|\| "ready" \}\)\);/g, '');
pageContent = pageContent.replace(/setEtsyForm\(\{[\s\S]*?\}\);/g, '');
fs.writeFileSync(pagePath, pageContent);

// 2. Fix amazon-edit-sheet.tsx (add sku and campAuto to the useEffect initialization)
const amzEditSheetPath = path.join(__dirname, 'src/components/ideas/amazon-edit-sheet.tsx');
let amzEditContent = fs.readFileSync(amzEditSheetPath, 'utf8');
amzEditContent = amzEditContent.replace(
  'photosUploaded: initialData?.photosUploaded || false,',
  'photosUploaded: initialData?.photosUploaded || false,\n        sku: initialData?.sku || "",\n        campAuto: initialData?.campAuto || false,'
);
fs.writeFileSync(amzEditSheetPath, amzEditContent);

// 3. Fix amazon-listing-tab.tsx and etsy-listing-tab.tsx (add statusColors)
const statusColorsMap = `
const statusColors: Record<string, string> = {
  ready: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/50 dark:text-gray-300",
  uploading: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300",
  selling: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300",
  error: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300",
  delisted: "bg-red-200 text-red-900 border-red-300 dark:bg-red-900/50 dark:text-red-400",
};
`;
const amzTabPath = path.join(__dirname, 'src/components/ideas/amazon-listing-tab.tsx');
let amzTabContent = fs.readFileSync(amzTabPath, 'utf8');
amzTabContent = amzTabContent.replace('import { statusColors } from "@/types";', '');
amzTabContent = amzTabContent.replace('function statusBadge', statusColorsMap + '\nfunction statusBadge');
fs.writeFileSync(amzTabPath, amzTabContent);

const etsyTabPath = path.join(__dirname, 'src/components/ideas/etsy-listing-tab.tsx');
let etsyTabContent = fs.readFileSync(etsyTabPath, 'utf8');
etsyTabContent = etsyTabContent.replace('import { statusColors } from "@/types";', '');
etsyTabContent = etsyTabContent.replace('function statusBadge', statusColorsMap + '\nfunction statusBadge');
fs.writeFileSync(etsyTabPath, etsyTabContent);
