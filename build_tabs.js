const fs = require('fs');

const oldPage = fs.readFileSync('/tmp/old_page.tsx', 'utf8');

const amzStartIdx = oldPage.indexOf('<TabsContent value="amazon"');
const etsyStartIdx = oldPage.indexOf('<TabsContent value="etsy"');
const tabsEndIdx = oldPage.indexOf('</Tabs>', etsyStartIdx);

let amzTabHtml = oldPage.substring(amzStartIdx, etsyStartIdx);
let etsyTabHtml = oldPage.substring(etsyStartIdx, tabsEndIdx);

// Remove the `</TabsContent>` and `</fieldset>` from amzTabHtml
amzTabHtml = amzTabHtml.replace('</fieldset></TabsContent>', '');
etsyTabHtml = etsyTabHtml.replace('</fieldset></TabsContent>', '');

// Fix setAmzForm/setEtsyForm in onClick
amzTabHtml = amzTabHtml.replace(/onClick=\{[^}]*setAmzForm[^}]*\}\}/g, 'onClick={() => setEditOpen(true)}');
etsyTabHtml = etsyTabHtml.replace(/onClick=\{[^}]*setEtsyForm[^}]*\}\}/g, 'onClick={() => setEditOpen(true)}');

// Fix renderPhotoGallery
amzTabHtml = amzTabHtml.replace(/\{renderPhotoGallery\("amazon"[^}]*\}\)}\}/, '<div className="text-xs text-muted-foreground p-2 bg-muted/40 rounded-md border border-dashed text-center mt-2">Ảnh sản phẩm Amazon (Quản lý tại bảng Sửa hoặc Trang chính)</div>');
etsyTabHtml = etsyTabHtml.replace(/\{renderPhotoGallery\("etsy"[^}]*\}\)}\}/, '<div className="text-xs text-muted-foreground p-2 bg-muted/40 rounded-md border border-dashed text-center mt-2">Ảnh sản phẩm Etsy (Quản lý tại bảng Sửa hoặc Trang chính)</div>');

// Replace {role !== "employee" ...} with just rendering the button but passing role="manager" later.

const amzTemplate = `"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Pencil, Printer, Download } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/copy-button";
import { convertToDirectImageUrl } from "@/lib/google-drive";
import { statusColors } from "@/types";
import { AmazonEditSheet } from "./amazon-edit-sheet";

function statusBadge(status: string, labels: Record<string, string>) {
  return (
    <Badge variant="outline" className={(statusColors as any)[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

export interface AmazonListingTabProps {
  idea: any;
  sellingAccounts: any[];
  isNotApproved: boolean;
  isPartner: boolean;
  NEXT_STATUS: any;
  listingStatusLabels: any;
  saving: boolean;
  handleListingStatusChange: (type: "amazon" | "etsy", status: string) => void;
  fetchIdea: () => void;
}

export function AmazonListingTab({
  idea,
  sellingAccounts,
  isNotApproved,
  isPartner,
  NEXT_STATUS,
  listingStatusLabels,
  saving,
  handleListingStatusChange,
  fetchIdea,
}: AmazonListingTabProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [labelPrintQty, setLabelPrintQty] = useState(1);
  const [changeFulfillmentOpen, setChangeFulfillmentOpen] = useState(false);
  const [pendingFulfillment, setPendingFulfillment] = useState("");
  const listing = idea.amazonListing;
  const role = "manager"; // Temp default role
  const id = idea.id;
  const amzForm = idea.amazonListing || {};

  const handleUpdateIdea = async (data: any) => {};

  return (
    <>
      ${amzTabHtml}
      </fieldset>
      <AmazonEditSheet
        ideaId={idea.id}
        msku={idea.msku}
        initialData={listing}
        sellingAccounts={sellingAccounts}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={fetchIdea}
      />
    </TabsContent>
    </>
  );
}
`;


const etsyTemplate = `"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Pencil, Printer, Download } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/copy-button";
import { convertToDirectImageUrl } from "@/lib/google-drive";
import { statusColors } from "@/types";
import { EtsyEditSheet } from "./etsy-edit-sheet";

function statusBadge(status: string, labels: Record<string, string>) {
  return (
    <Badge variant="outline" className={(statusColors as any)[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

export interface EtsyListingTabProps {
  idea: any;
  sellingAccounts: any[];
  isNotApproved: boolean;
  isPartner: boolean;
  NEXT_STATUS: any;
  listingStatusLabels: any;
  saving: boolean;
  handleListingStatusChange: (type: "amazon" | "etsy", status: string) => void;
  fetchIdea: () => void;
}

export function EtsyListingTab({
  idea,
  sellingAccounts,
  isNotApproved,
  isPartner,
  NEXT_STATUS,
  listingStatusLabels,
  saving,
  handleListingStatusChange,
  fetchIdea,
}: EtsyListingTabProps) {
  const [editOpen, setEditOpen] = useState(false);
  const listing = idea.etsyListing;
  const role = "manager"; // Temp default role
  const id = idea.id;
  const etsyForm = idea.etsyListing || {};
  
  const amazonGalleryImages = (() => {
    try {
      if (typeof idea.amazonListing?.galleryImages === "string") {
        return JSON.parse(idea.amazonListing.galleryImages).filter(Boolean);
      }
      return (idea.amazonListing?.galleryImages || []).filter(Boolean);
    } catch {
      return [];
    }
  })();

  return (
    <>
      ${etsyTabHtml}
      </fieldset>
      <EtsyEditSheet
        ideaId={idea.id}
        msku={idea.msku}
        initialData={listing}
        amazonGalleryImages={amazonGalleryImages}
        sellingAccounts={sellingAccounts}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={fetchIdea}
      />
    </TabsContent>
    </>
  );
}
`;

fs.writeFileSync('src/components/ideas/amazon-listing-tab.tsx', amzTemplate);
fs.writeFileSync('src/components/ideas/etsy-listing-tab.tsx', etsyTemplate);

// We must also update page.tsx to pass listingStatusLabels!
const pagePath = 'src/app/(dashboard)/ideas/[id]/page.tsx';
let pageContent = fs.readFileSync(pagePath, 'utf8');
pageContent = pageContent.replace(/NEXT_STATUS=\{NEXT_STATUS\}/g, 'NEXT_STATUS={NEXT_STATUS}\n                    listingStatusLabels={listingStatusLabels}');
fs.writeFileSync(pagePath, pageContent);

console.log('Tabs rebuilt.');
