import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./server-client";
import { prisma } from "@/lib/db";
import type { AuthSession, AuthUser, ServerAuth } from "../../types";
import { LOGIN_REDIRECT } from "../../constants";

// In-memory cache: Supabase UUID -> Prisma CUID
const idCache = new Map<string, { id: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function resolvePrismaUserId(
  supabaseUserId: string,
): Promise<string | null> {
  const cached = idCache.get(supabaseUserId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.id;
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: supabaseUserId }, { supabaseId: supabaseUserId }],
    },
    select: { id: true },
  });

  if (user) {
    idCache.set(supabaseUserId, {
      id: user.id,
      expiresAt: Date.now() + CACHE_TTL,
    });
  }

  return user?.id ?? null;
}

function mapSupabaseUser(
  supaUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    email_confirmed_at?: string | null;
  },
  prismaUserId: string,
): AuthUser {
  return Object.freeze({
    id: prismaUserId,
    email: supaUser.email ?? "",
    name: (supaUser.user_metadata?.name as string) ?? null,
    image: (supaUser.user_metadata?.avatar_url as string) ?? null,
    emailVerified: supaUser.email_confirmed_at != null,
  });
}

export const serverAuth: ServerAuth = {
  async getSession(): Promise<AuthSession | null> {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const prismaUserId = await resolvePrismaUserId(user.id);
    if (!prismaUserId) {
      return null;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return Object.freeze({
      user: mapSupabaseUser(user, prismaUserId),
      accessToken: session?.access_token ?? "",
      expiresAt: session?.expires_at ?? 0,
    });
  },

  async getUser(): Promise<AuthUser | null> {
    const session = await this.getSession();
    return session?.user ?? null;
  },

  async requireSession(): Promise<AuthSession> {
    const session = await this.getSession();
    if (!session) {
      redirect(LOGIN_REDIRECT);
    }
    return session;
  },

  async requireUserId(): Promise<string> {
    const session = await this.requireSession();
    return session.user.id;
  },
};
