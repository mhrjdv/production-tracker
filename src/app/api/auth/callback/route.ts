import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth/providers/supabase/server-client";
import { supabaseUserSync } from "@/lib/auth/providers/supabase/sync";
import { POST_LOGIN_REDIRECT } from "@/lib/auth/constants";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect") ?? POST_LOGIN_REDIRECT;

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
  }

  // Ensure Prisma user exists (first-time OAuth sign-in)
  await supabaseUserSync.ensurePrismaUser({
    id: data.user.id,
    email: data.user.email ?? "",
    name: (data.user.user_metadata?.name as string) ?? null,
    image: (data.user.user_metadata?.avatar_url as string) ?? null,
    emailVerified: data.user.email_confirmed_at != null,
  });

  return NextResponse.redirect(new URL(redirectTo, origin));
}
