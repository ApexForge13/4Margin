import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  // First, refresh the session
  const response = await updateSession(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Auth pages — redirect logged-in users to dashboard
  const authRoutes = ["/login", "/signup", "/auth/callback", "/auth/confirm"];
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Public content pages — accessible to everyone regardless of auth
  const publicContentRoutes = [
    "/terms",
    "/privacy",
    "/robots.txt",
    "/sitemap.xml",
    "/opengraph-image",
    "/auth/invite",
  ];
  const isPublicContent = publicContentRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // If not logged in and trying to access protected route → redirect to login
  if (!user && !isAuthRoute && !isPublicContent && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If logged in and trying to access auth pages → redirect to dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // If logged in, check if they have a company (onboarding)
  if (user && pathname.startsWith("/dashboard")) {
    const { data: profile } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    // No profile or no company → send to onboarding
    if (!profile?.company_id) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
