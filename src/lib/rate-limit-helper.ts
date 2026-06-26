import { NextResponse } from "next/server";
import { checkRateLimit, getRateLimitTier, type RateLimitResult } from "./rate-limit";

/**
 * Apply rate limiting to an API route.
 * Call this at the top of each route handler.
 *
 * @returns NextResponse with 429 if rate limited, or the result with headers to set.
 */
export function withRateLimit(
  userId: string,
  method: string,
  path: string
): { blocked: NextResponse | null; headers: Record<string, string> } {
  const tier = getRateLimitTier(method, path);

  // No rate limit for this path
  if (!tier) {
    return { blocked: null, headers: {} };
  }

  const result = checkRateLimit(userId, tier);

  const headers: Record<string, string> = {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetAt),
  };

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    return {
      blocked: NextResponse.json(
        { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau.", retryAfter },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(retryAfter),
          },
        }
      ),
      headers,
    };
  }

  return { blocked: null, headers };
}
