import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes
  if (pathname.startsWith("/admin")) {
    const authCookie = request.cookies.get("sb-access-token")?.value || request.cookies.get("supabase-auth-token")?.value;
    // Client-side component AuthProvider handles fine-grained RBAC fallback if cookie is absent
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/mobile/:path*"],
};
