import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getClient, createAuthCode } from "@/lib/oauth/store";
import { getBaseUrl } from "@/lib/oauth/utils";

/**
 * OAuth 2.0 Authorization Endpoint.
 *
 * GET /oauth/authorize?response_type=code&client_id=...&redirect_uri=...
 *     &state=...&code_challenge=...&code_challenge_method=S256&scope=...
 *
 * Flow:
 * 1. Validate parameters
 * 2. If user is not logged in → redirect to /login with return URL
 * 3. If user is logged in → auto-approve, generate auth code, redirect back
 *
 * Auto-approve is appropriate because the user explicitly added this MCP
 * server to their client (ChatGPT, etc.) — the intent is clear.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const baseUrl = getBaseUrl(request);

  // ── Extract OAuth parameters ───────────────────────────
  const responseType = searchParams.get("response_type");
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method");
  const scope = searchParams.get("scope") || "mcp:full";

  // ── Validate required parameters ───────────────────────
  if (responseType !== "code") {
    return oauthError(
      redirectUri,
      state,
      "unsupported_response_type",
      "Only response_type=code is supported",
    );
  }

  if (!clientId) {
    return oauthError(
      redirectUri,
      state,
      "invalid_request",
      "client_id is required",
    );
  }

  if (!redirectUri) {
    return oauthError(
      null,
      state,
      "invalid_request",
      "redirect_uri is required",
    );
  }

  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return oauthError(
      redirectUri,
      state,
      "invalid_request",
      "PKCE with code_challenge_method=S256 is required",
    );
  }

  // ── Validate client registration ───────────────────────
  const client = getClient(clientId);
  if (!client) {
    return oauthError(
      redirectUri,
      state,
      "invalid_client",
      "Unknown client_id. Register at /oauth/register first.",
    );
  }

  // Validate redirect_uri matches registered URIs
  if (!client.redirect_uris.includes(redirectUri)) {
    // Do NOT redirect — return error directly to prevent open redirect
    return Response.json(
      {
        error: "invalid_request",
        error_description: "redirect_uri does not match any registered URI",
      },
      { status: 400 },
    );
  }

  // ── Check user session ─────────────────────────────────
  const session = await auth();

  if (!session?.user?.id) {
    // Redirect to login, preserving the full authorize URL as return target
    const authorizeUrl = `${baseUrl}/oauth/authorize?${searchParams.toString()}`;
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("redirect", `/oauth/authorize?${searchParams.toString()}`);
    return NextResponse.redirect(loginUrl);
  }

  // ── Auto-approve: generate authorization code ──────────
  const code = createAuthCode({
    userId: session.user.id,
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    scope,
  });

  // Redirect back to client with code + state
  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set("code", code);
  if (state) {
    callbackUrl.searchParams.set("state", state);
  }

  return NextResponse.redirect(callbackUrl);
}

/**
 * Return an OAuth error, either as a redirect or as JSON.
 */
function oauthError(
  redirectUri: string | null,
  state: string | null,
  error: string,
  description: string,
): Response {
  // If we have a valid redirect_uri, redirect with error params
  if (redirectUri) {
    try {
      const url = new URL(redirectUri);
      url.searchParams.set("error", error);
      url.searchParams.set("error_description", description);
      if (state) url.searchParams.set("state", state);
      return NextResponse.redirect(url);
    } catch {
      // Invalid redirect_uri — fall through to JSON response
    }
  }

  // Otherwise return JSON error
  return Response.json(
    { error, error_description: description },
    { status: 400 },
  );
}
