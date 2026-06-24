/**
 * Google Drive link utilities
 * Convert drive.google.com links to direct preview URLs
 */

/**
 * Extract file ID from various Google Drive URL formats
 */
export function extractDriveFileId(url: string): string | null {
  if (!url) return null;

  // Format: https://drive.google.com/file/d/{fileId}/view
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  // Format: https://drive.google.com/open?id={fileId}
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];

  // Format: https://docs.google.com/document/d/{fileId}
  const docsMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) return docsMatch[1];

  return null;
}

/**
 * Check if URL is a Google Drive link
 */
export function isDriveLink(url: string): boolean {
  if (!url) return false;
  return (
    url.includes("drive.google.com") ||
    url.includes("docs.google.com") ||
    url.includes("sheets.google.com")
  );
}

/**
 * Convert Google Drive link to direct image preview URL
 * Used for displaying images from Drive without downloading
 */
export function driveToPreviewUrl(url: string): string {
  if (!url) return url;

  // If not a Drive link, return as-is
  if (!isDriveLink(url)) return url;

  const fileId = extractDriveFileId(url);
  if (!fileId) return url;

  // Use lh3.googleusercontent.com for direct image display
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Convert Google Drive link to thumbnail URL (smaller preview)
 */
export function driveToThumbnailUrl(url: string, size: number = 200): string {
  if (!url) return url;

  if (!isDriveLink(url)) return url;

  const fileId = extractDriveFileId(url);
  if (!fileId) return url;

  return `https://lh3.googleusercontent.com/d/${fileId}=s${size}`;
}

/**
 * Convert Google Drive link to folder URL
 */
export function driveFolderUrl(url: string): string {
  if (!url) return url;
  // If already a valid Drive folder URL, return as-is
  if (url.includes("drive.google.com/drive/folders/")) return url;
  return url;
}

/**
 * Strip query string from URLs (for storing clean source links)
 */
export function stripQueryString(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

/**
 * Convert Google Drive link to direct download URL
 */
export function driveToDownloadUrl(url: string): string {
  if (!url) return url;
  if (!isDriveLink(url)) return url;
  const fileId = extractDriveFileId(url);
  if (!fileId) return url;
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Alias for driveToPreviewUrl — used in UI components to show Drive images
 */
export function convertToDirectImageUrl(url: string): string | null {
  if (!url) return null;
  return driveToPreviewUrl(url);
}
