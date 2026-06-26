import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, getRateLimitTier } from "@/lib/rate-limit";

describe("rate-limit — checkRateLimit", () => {
  // Use unique keys per test to avoid interference
  let counter = 0;
  function uniqueKey(): string {
    return `test-user-${++counter}`;
  }

  it("allows first request", () => {
    const result = checkRateLimit(uniqueKey(), "normal");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59); // 60 - 1
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it("allows requests up to the limit", () => {
    const key = uniqueKey();
    for (let i = 0; i < 60; i++) {
      const result = checkRateLimit(key, "normal");
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks after exceeding limit", () => {
    const key = uniqueKey();
    // Exhaust the limit
    for (let i = 0; i < 60; i++) {
      checkRateLimit(key, "normal");
    }
    // 61st request should be blocked
    const blocked = checkRateLimit(key, "normal");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("strict tier has 10 requests per 15 minutes", () => {
    const key = uniqueKey();
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(key, "strict").allowed).toBe(true);
    }
    expect(checkRateLimit(key, "strict").allowed).toBe(false);
  });

  it("relaxed tier has 300 requests per minute", () => {
    const key = uniqueKey();
    for (let i = 0; i < 300; i++) {
      expect(checkRateLimit(key, "relaxed").allowed).toBe(true);
    }
    expect(checkRateLimit(key, "relaxed").allowed).toBe(false);
  });

  it("tracks remaining count correctly", () => {
    const key = uniqueKey();
    let result = checkRateLimit(key, "normal");
    expect(result.remaining).toBe(59);

    result = checkRateLimit(key, "normal");
    expect(result.remaining).toBe(58);
  });

  it("different keys don't interfere", () => {
    const key1 = uniqueKey();
    const key2 = uniqueKey();

    // Exhaust key1
    for (let i = 0; i < 60; i++) checkRateLimit(key1, "normal");
    expect(checkRateLimit(key1, "normal").allowed).toBe(false);

    // key2 should still be allowed
    expect(checkRateLimit(key2, "normal").allowed).toBe(true);
  });
});

describe("rate-limit — getRateLimitTier", () => {
  it("returns null for auth paths", () => {
    expect(getRateLimitTier("POST", "/api/auth/signin")).toBeNull();
    expect(getRateLimitTier("GET", "/api/auth/session")).toBeNull();
  });

  it("returns null for socket endpoint", () => {
    expect(getRateLimitTier("POST", "/api/internal/socket")).toBeNull();
  });

  it("returns strict for password change", () => {
    expect(getRateLimitTier("POST", "/api/users/change-password")).toBe("strict");
  });

  it("returns strict for user creation", () => {
    expect(getRateLimitTier("POST", "/api/users")).toBe("strict");
  });

  it("returns normal for POST mutations", () => {
    expect(getRateLimitTier("POST", "/api/ideas")).toBe("normal");
    expect(getRateLimitTier("PUT", "/api/ideas/123")).toBe("normal");
    expect(getRateLimitTier("PATCH", "/api/orders/456")).toBe("normal");
    expect(getRateLimitTier("DELETE", "/api/ideas/789")).toBe("normal");
  });

  it("returns relaxed for GET requests", () => {
    expect(getRateLimitTier("GET", "/api/ideas")).toBe("relaxed");
    expect(getRateLimitTier("GET", "/api/users")).toBe("relaxed");
    expect(getRateLimitTier("GET", "/api/dashboard/monthly")).toBe("relaxed");
  });
});
