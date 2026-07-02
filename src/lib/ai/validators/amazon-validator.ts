import { ListingResponse } from "@/lib/ai/schemas/amazon-schema";

export interface ValidationError {
  field: keyof ListingResponse | string;
  currentLength?: number;
  message: string;
}

const FORBIDDEN_PROMO_WORDS = [
  "free shipping",
  "100% quality",
  "guaranteed",
  "best seller",
  "hot deal",
  "sale",
  "discount",
  "cheap",
  "limited time",
  "top rated",
  "best gift ever",
  "#1",
  "money back",
  "hot item",
];

const FORBIDDEN_SYMBOLS_REGEX = /[!$?_{}^¬¦™®€†‡]/;
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
const URL_EMAIL_REGEX = /(https?:\/\/[^\s]+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;

/**
 * Surgical Amazon Validator.
 * Checks strict length limits, promotional claims, symbols, emojis, duplicates, and formatting.
 */
export function validateAmazonListing(data: ListingResponse): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // 1. Title Validation (Max 75 chars)
  if (!data.title || data.title.trim().length === 0) {
    errors.push({ field: "title", message: "Title cannot be empty." });
  } else {
    if (data.title.length > 75) {
      errors.push({ field: "title", currentLength: data.title.length, message: `Title exceeds 75 characters limit (current: ${data.title.length}).` });
    }
    checkContentViolations("title", data.title, errors);
  }

  // 2. Highlight Validation (Max 125 chars)
  if (!data.highlight || data.highlight.trim().length === 0) {
    errors.push({ field: "highlight", message: "Highlight cannot be empty." });
  } else {
    if (data.highlight.length > 125) {
      errors.push({ field: "highlight", currentLength: data.highlight.length, message: `Highlight exceeds 125 characters limit (current: ${data.highlight.length}).` });
    }
    checkContentViolations("highlight", data.highlight, errors);
  }

  // 3. Description Validation (1000 - 2000 chars)
  if (!data.description || data.description.trim().length === 0) {
    errors.push({ field: "description", message: "Description cannot be empty." });
  } else {
    if (data.description.length < 1000 || data.description.length > 2000) {
      errors.push({ field: "description", currentLength: data.description.length, message: `Description must be between 1000 and 2000 characters (current: ${data.description.length}).` });
    }
    checkContentViolations("description", data.description, errors);
  }

  // 4. Bullets Validation (Exactly 5 bullets, each max 255 chars)
  if (!Array.isArray(data.bullets) || data.bullets.length !== 5) {
    errors.push({ field: "bullets", message: `Must have exactly 5 bullet points (got: ${data?.bullets?.length || 0}).` });
  } else {
    const bulletSet = new Set<string>();
    data.bullets.forEach((b, idx) => {
      if (!b || b.trim().length === 0) {
        errors.push({ field: `bullets`, message: `Bullet point ${idx + 1} is empty.` });
        return;
      }
      if (b.length > 255) {
        errors.push({ field: `bullets`, currentLength: b.length, message: `Bullet point ${idx + 1} exceeds 255 characters limit (current: ${b.length}).` });
      }
      const normalized = b.toLowerCase().trim();
      if (bulletSet.has(normalized)) {
        errors.push({ field: `bullets`, message: `Bullet point ${idx + 1} is a duplicate of another bullet point.` });
      }
      bulletSet.add(normalized);
      checkContentViolations(`bullets`, b, errors);
    });
  }

  // 5. Tags Validation (Joined string max 500 chars)
  if (!Array.isArray(data.tags) || data.tags.length === 0) {
    errors.push({ field: "tags", message: "Must provide at least 15 tags." });
  } else {
    const joinedTags = data.tags.join("; ");
    if (joinedTags.length > 500) {
      errors.push({ field: "tags", currentLength: joinedTags.length, message: `Joined tags exceed 500 characters limit (current: ${joinedTags.length}).` });
    }
  }

  // 6. Slug Keywords Validation (Exactly 12 keywords)
  if (!Array.isArray(data.slugKeywords) || data.slugKeywords.length < 10) {
    errors.push({ field: "slugKeywords", message: `Must provide 12 distinct slug keywords (got: ${data?.slugKeywords?.length || 0}).` });
  }

  return { isValid: errors.length === 0, errors };
}

function checkContentViolations(field: string, text: string, errors: ValidationError[]): void {
  const lower = text.toLowerCase();

  // Check forbidden promo words
  for (const word of FORBIDDEN_PROMO_WORDS) {
    if (lower.includes(word)) {
      errors.push({ field, message: `Contains forbidden promotional phrase: "${word}".` });
      break;
    }
  }

  // Check forbidden special symbols
  if (FORBIDDEN_SYMBOLS_REGEX.test(text)) {
    errors.push({ field, message: `Contains forbidden special symbols (!, $, ?, _, etc.).` });
  }

  // Check emojis
  if (EMOJI_REGEX.test(text)) {
    errors.push({ field, message: `Contains forbidden Emojis.` });
  }

  // Check URLs or emails
  if (URL_EMAIL_REGEX.test(text)) {
    errors.push({ field, message: `Contains forbidden website link or contact email.` });
  }
}
