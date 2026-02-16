/** Routes that do not require authentication */
export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/docs",
] as const;

/** Routes that authenticated users should be redirected away from */
export const AUTH_ONLY_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
] as const;

/** API prefix that uses extension token auth (skip middleware) */
export const EXTENSION_API_PREFIX = "/api/extension";

/** Where to redirect after login */
export const POST_LOGIN_REDIRECT = "/home";

/** Where to redirect unauthenticated users */
export const LOGIN_REDIRECT = "/login";
