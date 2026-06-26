import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security headers applied to all API routes and pages.
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking (internal tool, no need for framing)
  response.headers.set("X-Frame-Options", "DENY");

  // Strict HTTPS (only in production — Vercel handles this)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  // Basic CSP: only allow self + Google Drive for images
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob: https://lh3.googleusercontent.com https://drive.google.com",
      "font-src 'self'",
      "connect-src 'self' ws: wss:",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy (disable features we don't use)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return response;
}

/**
 * Next.js middleware-compatible security headers function.
 * Use in middleware.ts or at the top of route handlers.
 */
export function securityHeaders(request: NextRequest) {
  const response = NextResponse.next();
  return applySecurityHeaders(response);
}
