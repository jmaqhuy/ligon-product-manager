import OpenAI from "openai";
import { db } from "@/lib/db";

// Singleton OpenAI client
const globalForOpenAI = globalThis as unknown as { openai?: OpenAI };

export const openai =
  globalForOpenAI.openai ||
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-build",
  });

if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = openai;

export const DEFAULT_AI_MODEL = "gpt-4o-mini";
export const PROMPT_VERSION = "v1.0.0-bigtech";

import { AI_MODEL_PRICING_LIST, AiModelPricing } from "./constants";
export { AI_MODEL_PRICING_LIST, type AiModelPricing };

export interface TokenUsageLog {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens?: number;
}

export interface AiAuditLogParams {
  action: string;
  ideaId?: string;
  userId?: string;
  model: string;
  promptVersion: string;
  latencyMs: number;
  tokens: TokenUsageLog;
  costEstimatedUsd: number;
  retryCount: number;
  status: "success" | "error" | "fixed";
  errorMessage?: string;
}

/**
 * Estimate USD cost based on model and token usage using AI_MODEL_PRICING_LIST from pricing.md.
 */
export function estimateTokenCost(tokens: TokenUsageLog): number {
  const pricing = AI_MODEL_PRICING_LIST.find(
    (p) => p.model.toLowerCase() === tokens.model.toLowerCase()
  ) || {
    inputPricePerM: 2.5,
    cachedInputPricePerM: 1.25,
    outputPricePerM: 10.0,
  };

  const cached = tokens.cachedTokens || 0;
  const normalInput = Math.max(0, tokens.promptTokens - cached);
  const output = tokens.completionTokens;

  const cost =
    (normalInput / 1_000_000) * pricing.inputPricePerM +
    (cached / 1_000_000) * pricing.cachedInputPricePerM +
    (output / 1_000_000) * pricing.outputPricePerM;

  return Number(cost.toFixed(6));
}

/**
 * Log AI API calls for observability and debugging.
 */
export async function logAiCall(params: AiAuditLogParams): Promise<void> {
  try {
    const details = JSON.stringify({
      model: params.model,
      promptVersion: params.promptVersion,
      latencyMs: params.latencyMs,
      tokens: params.tokens,
      costEstimatedUsd: params.costEstimatedUsd,
      retryCount: params.retryCount,
      status: params.status,
      errorMessage: params.errorMessage,
    });

    console.log(`[AI_LOG] ${params.action} | Model: ${params.model} | Latency: ${params.latencyMs}ms | Tokens: ${params.tokens.totalTokens} | Cost: $${params.costEstimatedUsd}`);

    if (params.ideaId && params.userId) {
      await db.auditLog.create({
        data: {
          entityType: "AI_GENERATION",
          entityId: params.ideaId,
          fieldName: params.action,
          oldValue: null,
          newValue: details,
          changedById: params.userId,
        },
      });
    }
  } catch (error) {
    console.error("Failed to write AI audit log:", error);
  }
}
