import { zodResponseFormat } from "openai/helpers/zod";
import { openai, DEFAULT_AI_MODEL, PROMPT_VERSION, estimateTokenCost, logAiCall, TokenUsageLog } from "@/lib/ai/client";
import {
  ListingRequest,
  ProductFacts,
  ProductFactsSchema,
  ListingResponse,
  ListingResponseSchema,
  ListingFixSchema,
} from "@/lib/ai/schemas/amazon-schema";
import {
  getDryVisionPrompt,
  getCreativeGenerationSystemPrompt,
  getCreativeGenerationUserPrompt,
  getSurgicalFixPrompt,
} from "@/lib/ai/prompts/amazon-prompts";
import { validateAmazonListing } from "@/lib/ai/validators/amazon-validator";
import { formatSlugs, formatTagsArray } from "@/lib/ai/formatters/slug-formatter";
import { convertToDirectImageUrl } from "@/lib/google-drive";

export interface GeneratedListingResult {
  title: string;
  highlight: string;
  description: string;
  bullets: string[];
  tags: string[];
  slugs: string[];
  facts: ProductFacts;
  meta: {
    model: string;
    promptVersion: string;
    totalLatencyMs: number;
    totalTokens: number;
    estimatedCostUsd: number;
    retryCount: number;
  };
}

/**
 * Helper to call OpenAI with Structured Outputs compatible across all SDK versions.
 */
async function callStructuredAi<T>(
  model: string,
  messages: any[],
  schema: any,
  name: string,
  temperature = 0.7
): Promise<{ parsed: T | null; usage: any }> {
  const isReasoningModel = model.startsWith("o1") || model.startsWith("o3") || model.includes("gpt-5.5");
  const payload: any = {
    model,
    messages,
    response_format: zodResponseFormat(schema, name),
  };
  
  // Reasoning models do not support custom temperature
  if (!isReasoningModel) {
    payload.temperature = temperature;
  }

  const resp = await openai.chat.completions.create(payload);
  const content = resp.choices[0]?.message?.content || "";
  let parsed: T | null = null;
  try {
    if (content) parsed = JSON.parse(content) as T;
  } catch (e) {
    console.warn(`Failed to parse JSON for ${name}:`, e);
  }
  return { parsed, usage: resp.usage };
}

/**
 * Converts any Drive share link or web image link into a direct, accessible format for OpenAI Vision.
 * If possible, fetches the image buffer and converts it to a data:image/...;base64 URI to avoid
 * CDNs/Google Drive returning 403 Forbidden or CORS/bot-protection against OpenAI's data center scrapers.
 */
async function resolveImageUrlForVision(rawUrl?: string): Promise<string> {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("data:image/")) return rawUrl;

  // 1. Convert Drive share link to direct web preview URL (just like how <img /> displays on our web app)
  const directUrl = convertToDirectImageUrl(rawUrl) || rawUrl;

  if (!directUrl.startsWith("http://") && !directUrl.startsWith("https://")) {
    return directUrl;
  }

  // 2. Fetch image buffer from our backend server to convert to base64 data URI for ChatGPT
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
    const res = await fetch(directUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const contentType = res.headers.get("content-type") || "image/jpeg";
      if (contentType.startsWith("image/")) {
        const arrayBuffer = await res.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return `data:${contentType};base64,${base64}`;
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch image buffer for vision (${directUrl}), falling back to direct web URL:`, err);
  }

  // Fallback to direct web URL if buffer fetch fails
  return directUrl;
}

/**
 * Master Big Tech 10/10 Orchestrator Pipeline:
 * Step 1: Dry Vision Facts Extraction
 * Step 2: Creative Generation with Prompt Caching
 * Step 3: Surgical Auto-Fix Merge Loop (up to 2 retries)
 * Step 4: Formatting & Observability Logging
 */
export async function generateAmazonListingPipeline(
  req: ListingRequest,
  options?: { ideaId?: string; userId?: string; modelOverride?: string }
): Promise<GeneratedListingResult> {
  const startTime = Date.now();
  const model = options?.modelOverride || DEFAULT_AI_MODEL;
  let retryCount = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalCachedTokens = 0;

  function accumulateTokens(usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } }) {
    if (!usage) return;
    totalPromptTokens += usage.prompt_tokens || 0;
    totalCompletionTokens += usage.completion_tokens || 0;
    totalCachedTokens += usage.prompt_tokens_details?.cached_tokens || 0;
  }

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Dry Vision Facts Extraction (No Hallucination)
    // -------------------------------------------------------------------------
    let facts: ProductFacts = {
      shape: "Rectangular / Custom sign",
      colorPalette: ["Natural wood", "Black", "White"],
      materialAppearance: `Smooth wood finish (${req.material})`,
      visibleText: [],
      layerCount: 1,
      decorations: ["Engraved text", "Laser cut details"],
      fontsAndTypography: "Modern clear font",
    };

    const visionImageUrl = await resolveImageUrlForVision(req.imageUrl);
    if (visionImageUrl && (visionImageUrl.startsWith("http://") || visionImageUrl.startsWith("https://") || visionImageUrl.startsWith("data:image/"))) {
      try {
        const visionMsg = getDryVisionPrompt(req.theme, req.material);
        console.log(`\n======================================================`);
        console.log(`[AI_VERBOSE] STEP 1: VISION EXTRACTION (SEND)`);
        console.log(`[AI_VERBOSE] Model: ${model}`);
        console.log(`[AI_VERBOSE] Image URL: ${visionImageUrl}`);
        console.log(`[AI_VERBOSE] Prompt: ${visionMsg}`);
        console.log(`======================================================\n`);

        const visionResp = await callStructuredAi<ProductFacts>(
          model,
          [
            {
              role: "user",
              content: [
                { type: "text", text: visionMsg },
                { type: "image_url", image_url: { url: visionImageUrl, detail: "high" } },
              ],
            },
          ],
          ProductFactsSchema,
          "product_facts",
          0.1
        );

        accumulateTokens(visionResp.usage);
        if (visionResp.parsed) {
          facts = visionResp.parsed;
          console.log(`\n======================================================`);
          console.log(`[AI_VERBOSE] STEP 1: VISION EXTRACTION (RECEIVE)`);
          console.log(`[AI_VERBOSE] Parsed Facts: ${JSON.stringify(facts, null, 2)}`);
          console.log(`======================================================\n`);
        }
      } catch (visionErr) {
        console.warn("Vision extraction failed or timed out, falling back to default facts:", visionErr);
      }
    }

    // -------------------------------------------------------------------------
    // STEP 2: Creative Generation with Prompt Caching
    // -------------------------------------------------------------------------
    const sysPrompt = getCreativeGenerationSystemPrompt();
    const userPrompt = getCreativeGenerationUserPrompt(facts, {
      theme: req.theme,
      material: req.material,
      width: req.width,
      height: req.height,
      thickness: req.thickness,
      unit: req.unit,
    });

    console.log(`\n======================================================`);
    console.log(`[AI_VERBOSE] STEP 2: CREATIVE GENERATION (SEND)`);
    console.log(`[AI_VERBOSE] System Prompt: ${sysPrompt}`);
    console.log(`[AI_VERBOSE] User Prompt:\n${userPrompt}`);
    console.log(`======================================================\n`);


    const genResp = await callStructuredAi<ListingResponse>(
      model,
      [
        { role: "system", content: sysPrompt },
        { role: "user", content: userPrompt },
      ],
      ListingResponseSchema,
      "listing_response",
      0.7
    );

    accumulateTokens(genResp.usage);
    console.log(`\n======================================================`);
    console.log(`[AI_VERBOSE] STEP 2: CREATIVE GENERATION (RECEIVE)`);
    console.log(`[AI_VERBOSE] Raw Parsed JSON: ${JSON.stringify(genResp.parsed, null, 2)}`);
    console.log(`======================================================\n`);
    let currentData: ListingResponse = genResp.parsed || {
      title: `${req.theme} ${req.material} Sign Decor`,
      highlight: `Handcrafted ${req.material} sign perfect for home decor.`,
      description: `Beautiful handcrafted ${req.material} sign designed for ${req.theme}. Made with premium quality craftsmanship, ensuring a smooth and elegant display for any room or celebration. Dimensions: ${req.width || 10} x ${req.height || 10} ${req.unit || "inch"}.`,
      bullets: [
        `Premium ${req.material} Craftsmanship: Made from high-quality natural material with smooth edges and durable build.`,
        `Elegant ${req.theme} Design: Features distinct typography and decorative elements styling any display space.`,
        `Versatile Display: Perfect size measuring ${req.width || 10}x${req.height || 10} ${req.unit || "inch"} to easily hang or place on tables.`,
        `Thoughtful Keepsake: Wonderful commemorative gift for special moments, milestones, and family celebrations.`,
        `Ready to Use: Comes beautifully finished and prepared for immediate decoration and photography props.`,
      ],
      tags: [req.theme, req.material, "wooden sign", "home decor", "gift idea", "keepsake", "wall art", "photo prop", "table decor", "craft sign", "milestone sign", "rustic decor", "modern sign", "custom decor", "nursery decor"],
      slugKeywords: [
        `${req.theme} wooden sign`,
        `${req.material} plaque decor`,
        "milestone photo prop",
        "home decor sign",
        "keepsake gift plaque",
        "nursery wall art",
        "rustic wooden sign",
        "modern table decor",
        "celebration sign prop",
        "handcrafted wood sign",
        "commemorative plaque",
        "decorative display sign",
      ],
    };

    // -------------------------------------------------------------------------
    // STEP 3: Surgical Auto-Fix Merge Loop (up to 2 retries)
    // -------------------------------------------------------------------------
    let validation = validateAmazonListing(currentData);
    const MAX_RETRIES = 2;

    while (!validation.isValid && retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`[AI_VALIDATOR] Attempt ${retryCount} failed with ${validation.errors.length} errors. Calling Surgical Fix...`);

      try {
        const fixPrompt = getSurgicalFixPrompt(validation.errors, currentData);
        console.log(`\n======================================================`);
        console.log(`[AI_VERBOSE] STEP 3: SURGICAL FIX ATTEMPT ${retryCount} (SEND)`);
        console.log(`[AI_VERBOSE] Fix Prompt:\n${fixPrompt}`);
        console.log(`======================================================\n`);

        const fixResp = await callStructuredAi<Partial<ListingResponse>>(
          model,
          [
            { role: "system", content: "You are a surgical JSON repair assistant. Output only the requested schema." },
            { role: "user", content: fixPrompt },
          ],
          ListingFixSchema,
          "listing_fix",
          0.3
        );

        accumulateTokens(fixResp.usage);
        const fixedFields = fixResp.parsed;
        
        console.log(`\n======================================================`);
        console.log(`[AI_VERBOSE] STEP 3: SURGICAL FIX ATTEMPT ${retryCount} (RECEIVE)`);
        console.log(`[AI_VERBOSE] Patched Fields: ${JSON.stringify(fixedFields, null, 2)}`);
        console.log(`======================================================\n`);

        if (fixedFields) {
          if (fixedFields.title) currentData.title = fixedFields.title;
          if (fixedFields.highlight) currentData.highlight = fixedFields.highlight;
          if (fixedFields.description) currentData.description = fixedFields.description;
          if (fixedFields.bullets && fixedFields.bullets.length === 5) currentData.bullets = fixedFields.bullets;
          if (fixedFields.tags && fixedFields.tags.length >= 15) currentData.tags = fixedFields.tags;
          if (fixedFields.slugKeywords && fixedFields.slugKeywords.length >= 10) currentData.slugKeywords = fixedFields.slugKeywords;
        }

        validation = validateAmazonListing(currentData);
      } catch (fixErr) {
        console.warn(`Surgical fix attempt ${retryCount} errored:`, fixErr);
        break;
      }
    }

    // If still invalid after retries, perform deterministic emergency trimming
    if (!validation.isValid) {
      if (currentData.title.length > 75) currentData.title = currentData.title.slice(0, 72) + "...";
      if (currentData.highlight.length > 125) currentData.highlight = currentData.highlight.slice(0, 122) + "...";
      if (currentData.description.length < 1000) {
        currentData.description = currentData.description.padEnd(1005, " Authentic craftsmanship designed to enhance your daily living space with elegance and durability.");
      } else if (currentData.description.length > 2000) {
        currentData.description = currentData.description.slice(0, 1995) + "...";
      }
      currentData.bullets = currentData.bullets.slice(0, 5).map((b) => (b.length > 255 ? b.slice(0, 252) + "..." : b));
      while (currentData.bullets.length < 5) {
        currentData.bullets.push(`Durable Quality Craftsmanship: Made with premium ${req.material} ensuring long-lasting display and satisfaction.`);
      }
    }

    // -------------------------------------------------------------------------
    // STEP 4: Formatting & Observability Logging
    // -------------------------------------------------------------------------
    const cleanedSlugs = formatSlugs(currentData.slugKeywords || []);
    const cleanedTags = formatTagsArray(currentData.tags || []);

    const totalLatencyMs = Date.now() - startTime;
    const tokensLog: TokenUsageLog = {
      model,
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      totalTokens: totalPromptTokens + totalCompletionTokens,
      cachedTokens: totalCachedTokens,
    };
    const estimatedCostUsd = estimateTokenCost(tokensLog);

    await logAiCall({
      action: "GENERATE_AMAZON_LISTING",
      ideaId: options?.ideaId,
      userId: options?.userId,
      model,
      promptVersion: PROMPT_VERSION,
      latencyMs: totalLatencyMs,
      tokens: tokensLog,
      costEstimatedUsd: estimatedCostUsd,
      retryCount,
      status: retryCount > 0 ? "fixed" : "success",
    });

    return {
      title: currentData.title,
      highlight: currentData.highlight,
      description: currentData.description,
      bullets: currentData.bullets,
      tags: cleanedTags,
      slugs: cleanedSlugs,
      facts,
      meta: {
        model,
        promptVersion: PROMPT_VERSION,
        totalLatencyMs,
        totalTokens: tokensLog.totalTokens,
        estimatedCostUsd,
        retryCount,
      },
    };
  } catch (error: unknown) {
    const totalLatencyMs = Date.now() - startTime;
    const errMessage = error instanceof Error ? error.message : String(error);

    await logAiCall({
      action: "GENERATE_AMAZON_LISTING_ERROR",
      ideaId: options?.ideaId,
      userId: options?.userId,
      model,
      promptVersion: PROMPT_VERSION,
      latencyMs: totalLatencyMs,
      tokens: { model, promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens, totalTokens: totalPromptTokens + totalCompletionTokens },
      costEstimatedUsd: 0,
      retryCount,
      status: "error",
      errorMessage: errMessage,
    });

    throw error;
  }
}
