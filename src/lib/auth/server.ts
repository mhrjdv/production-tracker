// Auth Abstraction — Server-only API
// Use in server components, server actions, and API routes.
// DO NOT import this from client components.

export type { AuthUser, AuthSession, ServerAuth, AuthUserSync } from "./types";

export { serverAuth } from "./providers/supabase/server-auth";
export { supabaseUserSync as userSync } from "./providers/supabase/sync";
export {
  PUBLIC_ROUTES,
  AUTH_ONLY_ROUTES,
  EXTENSION_API_PREFIX,
  POST_LOGIN_REDIRECT,
  LOGIN_REDIRECT,
} from "./constants";

// Drop-in replacement for NextAuth's auth()
import { serverAuth } from "./providers/supabase/server-auth";

export async function auth() {
  return serverAuth.getSession();
}
