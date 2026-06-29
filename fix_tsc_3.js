const fs = require('fs');
const path = require('path');

const amzEditSheetPath = path.join(__dirname, 'src/components/ideas/amazon-edit-sheet.tsx');
let amzEditContent = fs.readFileSync(amzEditSheetPath, 'utf8');
amzEditContent = amzEditContent.replace(
  'photosUploaded: initialData.photosUploaded ?? false,',
  'photosUploaded: initialData.photosUploaded ?? false,\n        sku: initialData.sku || "",\n        campAuto: initialData.campAuto || false,'
);
fs.writeFileSync(amzEditSheetPath, amzEditContent);
