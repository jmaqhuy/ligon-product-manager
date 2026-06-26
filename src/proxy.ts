import { auth } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/security-headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Run NextAuth as middleware — it handles session validation and redirects
  const authMiddleware = auth as unknown as (req: NextRequest) => Promise<Response | undefined>;
  const authResponse = await authMiddleware(request);

  // If auth returned a response (e.g., redirect to /login), return it with security headers
  if (authResponse) {
    // We can't modify the response directly, but we can clone headers
    // For redirect responses, just return as-is (browser will follow)
    if (authResponse.headers.get("location")) {
      return authResponse;
    }
    // For next() responses, add security headers by creating a new response
    const newResponse = NextResponse.next();
    applySecurityHeaders(newResponse);
    return newResponse;
  }

  // No auth response — pass through with security headers
  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
