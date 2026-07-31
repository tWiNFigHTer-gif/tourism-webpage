import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 1. Initialize @supabase/ssr client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 2. Single Source of Truth for Auth & Role Resolution
  let userRole: string | undefined = undefined;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      userRole = session.user.user_metadata?.role;
    }
  } catch {
    // Fallback
  }

  // Fallback to cookie if session cookie isn't stored in @supabase/ssr format
  const cookieRole = request.cookies.get("terra_role")?.value;
  if (!userRole && cookieRole && cookieRole.trim().length > 0) {
    userRole = cookieRole;
  }

  const isAdmin =
    userRole === "admin" ||
    userRole === "panchayat_admin" ||
    userRole === "super_admin";

  const isAdminRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/red-zones");

  // 3. Route Guard Enforcement:
  // Non-admin attempts to access admin routes -> redirect directly to /login (never to /mobile)
  if (isAdminRoute && !isAdmin) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/red-zones",
    "/red-zones/:path*",
  ],
};
