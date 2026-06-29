const fs = require('fs');

function cleanTab(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the Sheet component and remove it
  const sheetStart = content.indexOf('<Sheet ');
  if (sheetStart !== -1) {
    const sheetEnd = content.indexOf('</Sheet>', sheetStart);
    if (sheetEnd !== -1) {
      const beforeSheet = content.substring(0, sheetStart);
      const afterSheet = content.substring(sheetEnd + '</Sheet>'.length);
      content = beforeSheet + afterSheet;
    }
  }

  // Also remove `<Dialog>` missing imports for Etsy if not imported
  // For Etsy, there's no Sheet imported, so let's check if there's any other inline form elements we missed.
  // Actually, Etsy also has a <Sheet ...>...</Sheet> at the end of the Card.
  
  // Fix imports
  if (!content.includes('import { Sheet')) {
    // If it has Sheet but we didn't remove it properly
  }

  fs.writeFileSync(filePath, content);
}

cleanTab('src/components/ideas/amazon-listing-tab.tsx');
cleanTab('src/components/ideas/etsy-listing-tab.tsx');

// In amazon-listing-tab.tsx, we need to fix the NEXT_STATUS type
let amz = fs.readFileSync('src/components/ideas/amazon-listing-tab.tsx', 'utf8');
amz = amz.replace(/NEXT_STATUS: any;/g, 'NEXT_STATUS: Record<string, any[]>;');
amz = amz.replace(/NEXT_STATUS\[/g, '(NEXT_STATUS as any)[');
fs.writeFileSync('src/components/ideas/amazon-listing-tab.tsx', amz);

let etsy = fs.readFileSync('src/components/ideas/etsy-listing-tab.tsx', 'utf8');
etsy = etsy.replace(/NEXT_STATUS: any;/g, 'NEXT_STATUS: Record<string, any[]>;');
etsy = etsy.replace(/NEXT_STATUS\[/g, '(NEXT_STATUS as any)[');
fs.writeFileSync('src/components/ideas/etsy-listing-tab.tsx', etsy);

console.log('Cleaned tabs');
