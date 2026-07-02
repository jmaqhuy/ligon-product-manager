import { getAmazonRules } from "@/lib/ai/rules/amazon-rule";
import { ProductFacts } from "@/lib/ai/schemas/amazon-schema";

/**
 * Step 1: Dry Vision Facts Extraction Prompt.
 * Highly objective: instructs AI to identify ONLY observable physical attributes without hallucinating business use cases or marketing fluff.
 */
export function getDryVisionPrompt(theme: string, material: string): string {
  return `
You are a precision computer vision analyst for physical e-commerce products.
Your ONLY job is to identify strictly observable physical attributes from the provided product image.

CRITICAL INSTRUCTIONS:
1. DO NOT infer, speculate, or recommend business use cases, occasions, or target audiences.
2. DO NOT write marketing content, ad copy, or subjective praise.
3. IDENTIFY ONLY observable physical facts: shape, colors, material appearance, visible text engravings/print, layer count, decorative motifs (flowers, butterflies, ribbon, stars, etc.), and typography style.
4. If no text is visible on the product, set visibleText to an empty array [].
5. User metadata context: Theme="${theme}", Material="${material}".
Return JSON conforming exactly to the requested ProductFacts schema.
`.trim();
}

/**
 * Step 2: Creative Generation Prompt with Prompt Caching optimization.
 * Places static Amazon compliance rules at the beginning of system instruction to maximize OpenAI prompt caching hits.
 */
export function getCreativeGenerationSystemPrompt(): string {
  const rules = getAmazonRules();
  return `
You are an expert Amazon E-commerce Listing Copywriter and SEO Specialist.
Your mission is to craft high-converting, keyword-optimized Amazon listings that comply 100% with Amazon guidelines.

=== CACHED STATIC COMPLIANCE RULES ===
${rules.general}

${rules.title}

${rules.highlight}

${rules.bullets}

${rules.description}

${rules.tagsAndSlugs}
=== END CACHED RULES ===

INSTRUCTIONS:
- Combine the physical observable facts from Vision Analysis with the user's metadata (dimensions, material, theme) to generate compelling sales copy.
- Never violate character limits.
- Do NOT generate formatted URL slugs; generate 12 distinct SEO keyword phrases in slugKeywords.
Return JSON conforming exactly to the requested ListingResponse schema.
`.trim();
}

export function getCreativeGenerationUserPrompt(
  facts: ProductFacts,
  metadata: {
    theme: string;
    material: string;
    width?: number;
    height?: number;
    thickness?: number;
    unit?: string;
  }
): string {
  const dimStr =
    metadata.width && metadata.height
      ? `${metadata.width} x ${metadata.height} ${metadata.unit || "in"}${metadata.thickness ? ` (Thickness: ${metadata.thickness} ${metadata.unit || "in"})` : ""}`
      : "Standard display size";

  return `
=== PRODUCT OBSERVABLE FACTS (FROM VISION ANALYSIS) ===
Shape: ${facts.shape}
Colors: ${facts.colorPalette.join(", ")}
Material Appearance: ${facts.materialAppearance}
Visible Text / Engravings: ${facts.visibleText.length > 0 ? facts.visibleText.join(" ; ") : "None"}
Layer Count: ${facts.layerCount}
Decorations / Motifs: ${facts.decorations.join(", ")}
Typography Style: ${facts.fontsAndTypography}

=== USER SPECIFICATIONS ===
Theme / Topic: ${metadata.theme}
Specified Material: ${metadata.material}
Dimensions: ${dimStr}

Please generate the complete Amazon Listing JSON now. Ensure Description is between 1000 and 2000 characters and Bullets are 150-255 characters each.
`.trim();
}

/**
 * Step 3: Surgical Fix Prompt.
 * Only sends relevant rule slices and instructs AI to rewrite strictly the failed fields.
 */
export function getSurgicalFixPrompt(
  errors: { field: string; currentLength?: number; message: string }[],
  currentData: Record<string, unknown>
): string {
  const rules = getAmazonRules();
  let relevantRules = rules.general + "\n\n";

  const fieldsFailing = errors.map((e) => e.field);
  if (fieldsFailing.includes("title")) relevantRules += rules.title + "\n\n";
  if (fieldsFailing.includes("highlight")) relevantRules += rules.highlight + "\n\n";
  if (fieldsFailing.includes("bullets")) relevantRules += rules.bullets + "\n\n";
  if (fieldsFailing.includes("description")) relevantRules += rules.description + "\n\n";
  if (fieldsFailing.includes("tags") || fieldsFailing.includes("slugKeywords")) relevantRules += rules.tagsAndSlugs + "\n\n";

  const errorSummary = errors
    .map((e) => `- Field "${e.field}": ${e.message}${e.currentLength ? ` (Current length: ${e.currentLength})` : ""}`)
    .join("\n");

  return `
You are repairing an Amazon Listing that failed strict guideline validation.
Your ONLY job is to rewrite the specific fields that failed validation. Do NOT modify valid fields.

=== RELEVANT RULES FOR FAILED FIELDS ===
${relevantRules}

=== VALIDATION ERRORS ===
${errorSummary}

=== CURRENT DATA (FOR REFERENCE) ===
${JSON.stringify(currentData, null, 2)}

Please fix ONLY the failed fields and return the Partial JSON conforming to ListingFixSchema.
`.trim();
}
