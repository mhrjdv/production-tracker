// Auth Abstraction — Client-safe Public API
// Client components import from here.
// Server components/actions import from "@/lib/auth/server".

export type {
  AuthUser,
  AuthSession,
  AuthResult,
  AuthError,
  AuthErrorCode,
  OAuthProvider,
  ClientAuth,
} from "./types";

export { createClientAuth } from "./providers/supabase/client-auth";
export { AuthProvider, useAuth } from "./providers/supabase/auth-provider";
export { createAuthError, mapSupabaseError } from "./errors";
export {
  PUBLIC_ROUTES,
  AUTH_ONLY_ROUTES,
  EXTENSION_API_PREFIX,
  POST_LOGIN_REDIRECT,
  LOGIN_REDIRECT,
} from "./constants";
