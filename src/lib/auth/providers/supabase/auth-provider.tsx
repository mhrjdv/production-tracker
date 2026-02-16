"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "./client";
import { createClientAuth } from "./client-auth";
import type { AuthUser, ClientAuth } from "../../types";
import { LOGIN_REDIRECT } from "../../constants";

interface AuthContextValue {
  readonly user: AuthUser | null;
  readonly loading: boolean;
  readonly auth: ClientAuth;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const clientAuth = useMemo(() => createClientAuth(), []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s?.user) {
        setUser(
          Object.freeze({
            id: s.user.id,
            email: s.user.email ?? "",
            name: (s.user.user_metadata?.name as string) ?? null,
            image: (s.user.user_metadata?.avatar_url as string) ?? null,
            emailVerified: s.user.email_confirmed_at != null,
          }),
        );
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_OUT" || !s?.user) {
        setUser(null);
        router.push(LOGIN_REDIRECT);
        return;
      }

      setUser(
        Object.freeze({
          id: s.user.id,
          email: s.user.email ?? "",
          name: (s.user.user_metadata?.name as string) ?? null,
          image: (s.user.user_metadata?.avatar_url as string) ?? null,
          emailVerified: s.user.email_confirmed_at != null,
        }),
      );

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, auth: clientAuth }),
    [user, loading, clientAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
