import { z } from "zod";

export interface ListingRequest {
  imageUrl?: string;
  theme: string;
  material: string;
  width?: number;
  height?: number;
  thickness?: number;
  unit?: "inch" | "cm" | "in" | string;
  platform?: "amazon" | "etsy" | "walmart";
}

/**
 * Step 1: Dry Vision Facts Extraction Schema.
 * Captures ONLY observable physical attributes without hallucinating business/marketing claims.
 */
export const ProductFactsSchema = z.object({
  shape: z.string().describe("Visible physical shape and geometry of the item (e.g. circle, rectangle, arch, custom cutout)"),
  colorPalette: z.array(z.string()).describe("List of observable colors present in the item"),
  materialAppearance: z.string().describe("Visual texture and material characteristics (e.g. natural wood grain, laser cut edges, painted finish, acrylic overlay)"),
  visibleText: z.array(z.string()).describe("Exact text strings or engravings clearly visible on the product. Empty array if none."),
  layerCount: z.number().int().describe("Estimated number of visible physical layers or stacked elements"),
  decorations: z.array(z.string()).describe("Observable decorative elements (e.g. carved floral motifs, 3D butterfly, ribbon, engraved stars)"),
  fontsAndTypography: z.string().describe("Visual style of lettering if text is present (e.g. script calligraphy, bold serif, clean sans-serif)"),
});
export type ProductFacts = z.infer<typeof ProductFactsSchema>;

/**
 * Step 2: Creative Generation Schema.
 * Generates structured Amazon listing content adhering to strict schemas.
 */
export const ListingResponseSchema = z.object({
  title: z.string().describe("Product title, maximum 75 characters including spaces. Concise, keyword-rich, no promo words or symbols."),
  highlight: z.string().describe("Item highlight/short summary of key features and materials, maximum 125 characters."),
  description: z.string().describe("Detailed product description between 1000 and 2000 characters. Informative, engaging, formatted with <br> if needed."),
  bullets: z.array(z.string()).describe("Exactly 5 bullet points highlighting key features, dimensions, and uses. Each bullet maximum 255 characters."),
  tags: z.array(z.string()).describe("15 to 25 relevant search tags/keywords without semicolons within individual tags."),
  slugKeywords: z.array(z.string()).describe("Exactly 12 distinct SEO search phrases describing the item for image naming (e.g. ['wooden baby sign', 'hello world plaque'])."),
});
export type ListingResponse = z.infer<typeof ListingResponseSchema>;

/**
 * Step 3: Surgical Fix Schema.
 * Used during retry loops to regenerate ONLY the specific fields that failed validation.
 */
export const ListingFixSchema = z.object({
  title: z.string().optional().describe("Fixed product title if it was invalid"),
  highlight: z.string().optional().describe("Fixed highlight if it was invalid"),
  description: z.string().optional().describe("Fixed description if it was invalid"),
  bullets: z.array(z.string()).optional().describe("Fixed 5 bullet points if bullets were invalid"),
  tags: z.array(z.string()).optional().describe("Fixed tags if tags were invalid"),
  slugKeywords: z.array(z.string()).optional().describe("Fixed 12 slug keywords if they were invalid"),
});
export type ListingFix = z.infer<typeof ListingFixSchema>;
