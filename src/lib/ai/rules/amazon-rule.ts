import fs from "fs";
import path from "path";

interface AmazonRuleSlices {
  full: string;
  general: string;
  title: string;
  highlight: string;
  bullets: string;
  description: string;
  tagsAndSlugs: string;
}

let cachedRules: AmazonRuleSlices | null = null;

/**
 * Reads and caches the Amazon listing guidelines into RAM.
 * Granular rule slicing ensures we only inject relevant prompt tokens for each specific task or retry fix.
 */
export function getAmazonRules(): AmazonRuleSlices {
  if (cachedRules) return cachedRules;

  let fullContent = "";
  const dataPath = path.join(process.cwd(), "data", "amazon-rule.md");
  const docsPath = path.join(process.cwd(), "docs", "Amazon", "Amazon Listing Guidelines (1).md");

  if (fs.existsSync(dataPath)) {
    fullContent = fs.readFileSync(dataPath, "utf-8");
  } else if (fs.existsSync(docsPath)) {
    fullContent = fs.readFileSync(docsPath, "utf-8");
  } else {
    fullContent = "Follow standard Amazon listing guidelines. Strictly adhere to character limits and avoid promotional claims or emojis.";
  }

  const general = `
### GENERAL AMAZON COMPLIANCE RULES:
- STRICTLY FORBIDDEN PROMOTIONAL PHRASES: Do NOT use phrases like "free shipping", "100% quality guaranteed", "best seller", "hot deal", "sale", "discount", "cheap", "limited time offer", "#1 rated", "top rated".
- STRICTLY FORBIDDEN SPECIAL SYMBOLS: Do NOT use symbols: !, $, ?, _, {, }, ^, ¬, ¦, ™, ®, €, …, †, ‡.
- ABSOLUTELY NO EMOJIS: Never include any emojis (😊, ✅, 🌸, etc.) anywhere in the listing.
- NO ALL CAPS: Do not use all-caps words unless they are standard abbreviations (e.g., USA, LED, UV, MDF, 3D, USB).
- NO CONTACT INFO / LINKS: Never include website URLs, email addresses, or phone numbers.
- NO RESTRICTED PHRASES: Do not mention "FSA/HSA eligible", medical cure claims, antibacterial, or hypoallergenic unless clinically proven.
`.trim();

  const title = `
### TITLE RULES (MAX 75 CHARACTERS):
- Maximum 75 characters including spaces.
- Order: Brand/Style, Product Type, Key Attribute, Material/Color, Dimensions/Size.
- Keep concise. Avoid repeating words more than twice.
- Use numerals (e.g., "2" instead of "two").
- Capitalize first letter of each word except prepositions/conjunctions.
`.trim();

  const highlight = `
### ITEM HIGHLIGHTS RULES (MAX 125 CHARACTERS):
- Maximum 125 characters total.
- Provide key descriptive details (materials, recommended use cases) as comma-separated phrases, not full sentences.
`.trim();

  const bullets = `
### BULLET POINTS RULES (EXACTLY 5 BULLETS, MAX 255 CHARACTERS EACH):
- Provide exactly 5 bullet points. Each bullet must be between 150 and 255 characters.
- Begin each bullet with a capitalized feature header followed by a colon (e.g., "Premium Wooden Craftsmanship: Made from high-quality natural wood...").
- Focus strictly on observable product features, benefits, and specifications.
- Do NOT repeat information across bullet points. Each bullet must cover a unique aspect.
`.trim();

  const description = `
### DESCRIPTION RULES (1000 - 2000 CHARACTERS):
- Must be between 1000 and 2000 characters total.
- Give a friendly, honest, detailed overview of uses, dimensions, and unique properties.
- Do NOT use HTML tags except <br> for line breaks.
`.trim();

  const tagsAndSlugs = `
### SEARCH TAGS AND SLUG KEYWORDS RULES:
- Tags: Provide 15 to 25 relevant search terms without semicolons within individual tags. Total combined length when joined must be under 500 characters.
- Slug Keywords: Provide exactly 12 distinct SEO search phrases describing the physical item for image naming.
`.trim();

  cachedRules = {
    full: fullContent,
    general,
    title,
    highlight,
    bullets,
    description,
    tagsAndSlugs,
  };

  return cachedRules;
}
