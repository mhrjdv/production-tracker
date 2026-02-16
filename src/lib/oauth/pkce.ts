/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0.
 * Implements S256 challenge method per RFC 7636.
 */

import { createHash } from "crypto";

/**
 * Verify a PKCE S256 code verifier against the stored challenge.
 *
 * The code_challenge was computed as: BASE64URL(SHA256(code_verifier))
 * We recompute it from the verifier and compare.
 */
export function verifyPkceS256(
  codeVerifier: string,
  codeChallenge: string,
): boolean {
  if (!codeVerifier || !codeChallenge) return false;
  const computed = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return computed === codeChallenge;
}
