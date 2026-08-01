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
  let userEmail: string | undefined = undefined;
  let isAuthenticated = false;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      isAuthenticated = true;
      userRole = session.user.user_metadata?.role;
      userEmail = session.user.email;
    }
  } catch {
    // Fallback
  }

  // Fallback to cookie if session cookie isn't stored in @supabase/ssr format
  const cookieRole = request.cookies.get("terra_role")?.value;
  if (cookieRole && cookieRole.trim().length > 0) {
    isAuthenticated = true;
    if (!userRole) {
      userRole = cookieRole;
    }
  }

  const isEmailAdmin = userEmail ? userEmail.toLowerCase().includes("admin") : false;

  const isAdmin =
    userRole === "admin" ||
    userRole === "panchayat_admin" ||
    userRole === "super_admin" ||
    isEmailAdmin;

  const isAdminRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/red-zones");

  const isProtectedTouristRoute = pathname === "/map" || pathname.startsWith("/map/");

  // 3. Route Guard Enforcement:
  // Unauthenticated visits to /map redirect to /login?redirectTo=/map
  if (isProtectedTouristRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    loginUrl.searchParams.set("hint", "tourist");
    return NextResponse.redirect(loginUrl);
  }

  // Non-admin attempts to access admin routes -> redirect directly to /login
  if (isAdminRoute && !isAdmin) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/map",
    "/map/:path*",
    "/admin",
    "/admin/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/red-zones",
    "/red-zones/:path*",
  ],
};
