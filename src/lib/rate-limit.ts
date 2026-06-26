/**
 * In-memory Rate Limiter
 *
 * Three tiers:
 * - strict:  10 requests per 15 minutes (auth endpoints)
 * - normal:  60 requests per minute     (mutation endpoints)
 * - relaxed: 300 requests per minute    (query endpoints)
 */

type Tier = "strict" | "normal" | "relaxed";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const TIER_CONFIG: Record<Tier, { windowMs: number; maxRequests: number }> = {
  strict: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  normal: { windowMs: 60 * 1000, maxRequests: 60 },
  relaxed: { windowMs: 60 * 1000, maxRequests: 300 },
};

// In-memory store (per user ID or IP)
const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request is rate limited.
 * @param key - Unique identifier (usually userId)
 * @param tier - Rate limit tier
 */
export function checkRateLimit(key: string, tier: Tier): RateLimitResult {
  const config = TIER_CONFIG[tier];
  const now = Date.now();

  const existing = store.get(key);

  // First request or window expired → reset
  if (!existing || now > existing.resetAt) {
    const entry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    store.set(key, entry);
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: entry.resetAt };
  }

  // Within window, check count
  if (existing.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Get the rate limit tier for an API route based on method and path.
 */
export function getRateLimitTier(method: string, path: string): Tier | null {
  // No rate limit for these
  const skipPaths = ["/api/auth", "/api/internal/socket", "/api/notifications"];
  if (skipPaths.some((p) => path.startsWith(p))) {
    return null;
  }

  // Strict: auth-sensitive operations
  if (
    path === "/api/users/change-password" ||
    (path.startsWith("/api/users") && method === "POST")
  ) {
    return "strict";
  }

  // Normal: mutations (POST, PUT, PATCH, DELETE)
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return "normal";
  }

  // Relaxed: reads (GET, HEAD, OPTIONS)
  return "relaxed";
}
