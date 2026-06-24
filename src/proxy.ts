export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    // Skip auth for static files, api auth routes, and login page
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
