/**
 * Shared OAuth utilities.
 */

/**
 * Derive the external base URL from request headers.
 * Works correctly behind Cloudflare Tunnel, nginx, etc.
 */
export function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto") ||
    url.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    url.host;
  return `${proto}://${host}`;
}

/** Standard CORS headers for OAuth endpoints. */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Mcp-Session-Id",
} as const;
