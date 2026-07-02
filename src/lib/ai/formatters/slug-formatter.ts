/**
 * Converts raw AI keywords into SEO-friendly hyphenated slugs for image naming.
 * Example: "wooden baby sign" -> "wooden-baby-sign"
 */
export function formatSlugs(slugKeywords: string[]): string[] {
  if (!Array.isArray(slugKeywords)) return [];

  const formatted = slugKeywords
    .map((s) => {
      return s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-"); // Collapse multiple hyphens
    })
    .filter((s) => s && s.length > 2);

  // Remove duplicates and slice to exactly 12 slugs
  return Array.from(new Set(formatted)).slice(0, 12);
}

/**
 * Formats tags array into clean individual tags without semicolons,
 * returning a JSON stringified array or joined string as needed by DB schema.
 */
export function formatTagsArray(tags: string[]): string[] {
  if (!Array.isArray(tags)) return [];

  const cleaned = tags
    .map((t) => t.replace(/;/g, "").trim())
    .filter((t) => t && t.length > 1);

  return Array.from(new Set(cleaned));
}
