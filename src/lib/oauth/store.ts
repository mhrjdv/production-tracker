/**
 * In-memory OAuth stores for MCP server authentication.
 *
 * Stores OAuth client registrations and short-lived authorization codes.
 * For single-instance deployments. Use Redis/DB for multi-instance.
 */

import { randomBytes } from "crypto";

// ── Types ──────────────────────────────────────────────────

export interface OAuthClient {
  readonly client_id: string;
  readonly client_name: string;
  readonly redirect_uris: readonly string[];
  readonly grant_types: readonly string[];
  readonly response_types: readonly string[];
  readonly token_endpoint_auth_method: string;
  readonly created_at: number;
}

export interface AuthorizationCode {
  readonly code: string;
  readonly userId: string;
  readonly clientId: string;
  readonly redirectUri: string;
  readonly codeChallenge: string;
  readonly codeChallengeMethod: string;
  readonly scope: string;
  readonly expiresAt: number;
  used: boolean;
}

// ── Stores ─────────────────────────────────────────────────

const clients = new Map<string, OAuthClient>();
const codes = new Map<string, AuthorizationCode>();

// Cleanup expired codes every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, code] of codes) {
      if (code.expiresAt < now || code.used) {
        codes.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

// ── Client Registration ────────────────────────────────────

export function registerClient(data: {
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
}): OAuthClient {
  const client_id = `client_${randomBytes(16).toString("hex")}`;
  const client: OAuthClient = {
    client_id,
    client_name: data.client_name || "Unknown Client",
    redirect_uris: data.redirect_uris,
    grant_types: data.grant_types || ["authorization_code"],
    response_types: data.response_types || ["code"],
    token_endpoint_auth_method: data.token_endpoint_auth_method || "none",
    created_at: Date.now(),
  };
  clients.set(client_id, client);
  return client;
}

export function getClient(clientId: string): OAuthClient | undefined {
  return clients.get(clientId);
}

// ── Authorization Codes ────────────────────────────────────

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function createAuthCode(data: {
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
}): string {
  const code = randomBytes(32).toString("hex");
  codes.set(code, {
    ...data,
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
    used: false,
  });
  return code;
}

/**
 * Consume an authorization code (single-use).
 * Returns the code data if valid, null otherwise.
 */
export function consumeAuthCode(code: string): AuthorizationCode | null {
  const authCode = codes.get(code);
  if (!authCode) return null;
  if (authCode.used) return null;
  if (authCode.expiresAt < Date.now()) {
    codes.delete(code);
    return null;
  }
  // Mark as used and delete — single use
  authCode.used = true;
  codes.delete(code);
  return { ...authCode };
}
