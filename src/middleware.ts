import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/auth/providers/supabase/server-client";
import {
  PUBLIC_ROUTES,
  AUTH_ONLY_ROUTES,
  EXTENSION_API_PREFIX,
  LOGIN_REDIRECT,
  POST_LOGIN_REDIRECT,
} from "@/lib/auth/constants";

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isAuthOnlyRoute(pathname: string): boolean {
  return AUTH_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip extension API routes (they use token-based auth)
  if (pathname.startsWith(EXTENSION_API_PREFIX)) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });

  // Refresh Supabase session (keeps JWT fresh in cookies)
  const supabase = createSupabaseMiddlewareClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authenticated user on auth-only routes -> redirect to dashboard
  if (user && isAuthOnlyRoute(pathname)) {
    return NextResponse.redirect(new URL(POST_LOGIN_REDIRECT, request.url));
  }

  // Unauthenticated user on protected routes -> redirect to login
  if (!user && !isPublicRoute(pathname) && !pathname.startsWith("/api/")) {
    const loginUrl = new URL(LOGIN_REDIRECT, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
