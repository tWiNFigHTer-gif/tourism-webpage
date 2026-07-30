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

  // 2. Read role from terra_role cookie or session user metadata
  let userRole = request.cookies.get("terra_role")?.value;

  if (!userRole) {
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
  }

  const isAdmin = userRole === "admin" || userRole === "panchayat_admin" || userRole === "super_admin";
  const isTourist = userRole === "tourist";

  // 3. Route enforcement logic: Only restrict tourists from accessing admin routes
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    if (isTourist) {
      return NextResponse.redirect(new URL("/mobile", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
