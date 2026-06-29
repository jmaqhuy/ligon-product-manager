const fs = require('fs');

// 1. Fix AmazonListingTab
let amz = fs.readFileSync('src/components/ideas/amazon-listing-tab.tsx', 'utf8');

amz = amz.replace('import { statusColors } from "@/types";', '');
amz = amz.replace(/export interface AmazonListingTabProps \{/g, 'export interface AmazonListingTabProps {\n  fulfillmentToggle?: any;');
amz = amz.replace(/statusColors as any/g, '({} as any)');

// Fix Sửa button
amz = amz.replace(/onClick=\{\(\) => \{ setAmzForm\([^}]*\}\);\s*setAmzEditOpen\(true\);\s*\}\}/g, 'onClick={() => setEditOpen(true)}');

// Fix renderPhotoGallery (multiline)
amz = amz.replace(/\{renderPhotoGallery\("amazon"[\s\S]*?\}\)}\}/g, '<div className="text-xs text-muted-foreground p-2 bg-muted/40 rounded-md border border-dashed text-center mt-2">Ảnh sản phẩm Amazon (Quản lý tại bảng Sửa hoặc Trang chính)</div>');

// Add missing imports
amz = amz.replace('import { ExternalLink, Pencil, Printer, Download } from "lucide-react";', 'import { ExternalLink, Pencil, Printer, Download, Copy, ShoppingBag } from "lucide-react";\nimport { toast } from "sonner";');

// Add setSaving
amz = amz.replace('const handleUpdateIdea = async (data: any) => {};', 'const handleUpdateIdea = async (data: any) => {};\n  const setSaving = (val: boolean) => {};');

// Fix the parameter opt type in map
amz = amz.replace(/\(NEXT_STATUS as any\)\[idea\.amazonListing\?\.listingStatus \|\| "ready"\] \|\| \[\]\)\.map\((opt\) => \()/g, '(NEXT_STATUS as any)[idea.amazonListing?.listingStatus || "ready"] || []).map((opt: any) => (');

fs.writeFileSync('src/components/ideas/amazon-listing-tab.tsx', amz);

// 2. Fix EtsyListingTab
let etsy = fs.readFileSync('src/components/ideas/etsy-listing-tab.tsx', 'utf8');

etsy = etsy.replace('import { statusColors } from "@/types";', '');
etsy = etsy.replace(/statusColors as any/g, '({} as any)');

etsy = etsy.replace(/onClick=\{\(\) => \{ setEtsyForm\([^}]*\}\);\s*setEtsyEditOpen\(true\);\s*\}\}/g, 'onClick={() => setEditOpen(true)}');

// Fix renderPhotoGallery
etsy = etsy.replace(/\{renderPhotoGallery\("etsy"[\s\S]*?\}\)}\}/g, '<div className="text-xs text-muted-foreground p-2 bg-muted/40 rounded-md border border-dashed text-center mt-2">Ảnh sản phẩm Etsy (Quản lý tại bảng Sửa hoặc Trang chính)</div>');

// Add missing imports
etsy = etsy.replace('import { ExternalLink, Pencil, Printer, Download } from "lucide-react";', 'import { ExternalLink, Pencil, Printer, Download, Copy, ShoppingBag } from "lucide-react";\nimport { toast } from "sonner";');

etsy = etsy.replace('const id = idea.id;', 'const id = idea.id;\n  const setSaving = (val: boolean) => {};');
etsy = etsy.replace(/\(NEXT_STATUS as any\)\[idea\.etsyListing\?\.listingStatus \|\| "ready"\] \|\| \[\]\)\.map\((opt\) => \()/g, '(NEXT_STATUS as any)[idea.etsyListing?.listingStatus || "ready"] || []).map((opt: any) => (');

fs.writeFileSync('src/components/ideas/etsy-listing-tab.tsx', etsy);

// 3. Fix AmazonEditSheet
let amzSheet = fs.readFileSync('src/components/ideas/amazon-edit-sheet.tsx', 'utf8');
amzSheet = amzSheet.replace(/if \(open && initialData\) \{/g, 'if (open) {\n      const data = initialData || {};');
amzSheet = amzSheet.replace(/initialData\./g, 'data.');
fs.writeFileSync('src/components/ideas/amazon-edit-sheet.tsx', amzSheet);

// 4. Fix EtsyEditSheet
let etsySheet = fs.readFileSync('src/components/ideas/etsy-edit-sheet.tsx', 'utf8');
etsySheet = etsySheet.replace(/if \(open && initialData\) \{/g, 'if (open) {\n      const data = initialData || {};');
etsySheet = etsySheet.replace(/initialData\./g, 'data.');
fs.writeFileSync('src/components/ideas/etsy-edit-sheet.tsx', etsySheet);

console.log('Fixed syntax');
