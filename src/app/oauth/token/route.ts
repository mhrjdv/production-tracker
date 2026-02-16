import { NextRequest } from "next/server";
import { consumeAuthCode, getClient } from "@/lib/oauth/store";
import { verifyPkceS256 } from "@/lib/oauth/pkce";
import { CORS_HEADERS } from "@/lib/oauth/utils";
import { generateExtensionToken } from "@/lib/extension-tokens";
import { prisma } from "@/lib/db";

/**
 * OAuth 2.0 Token Endpoint.
 *
 * POST /oauth/token
 * Content-Type: application/x-www-form-urlencoded
 *
 * Exchanges an authorization code for an access token (lzr_* format).
 * Validates PKCE code_verifier against the stored code_challenge.
 */
export async function POST(request: NextRequest) {
  let params: URLSearchParams;

  // Accept both form-urlencoded and JSON bodies
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      params = new URLSearchParams(body as Record<string, string>);
    } catch {
      return tokenError("invalid_request", "Invalid JSON body");
    }
  } else {
    const body = await request.text();
    params = new URLSearchParams(body);
  }

  const grantType = params.get("grant_type");
  const code = params.get("code");
  const redirectUri = params.get("redirect_uri");
  const clientId = params.get("client_id");
  const codeVerifier = params.get("code_verifier");

  // ── Validate grant type ────────────────────────────────
  if (grantType !== "authorization_code") {
    return tokenError(
      "unsupported_grant_type",
      "Only grant_type=authorization_code is supported",
    );
  }

  // ── Validate required fields ───────────────────────────
  if (!code) {
    return tokenError("invalid_request", "code is required");
  }
  if (!clientId) {
    return tokenError("invalid_request", "client_id is required");
  }
  if (!codeVerifier) {
    return tokenError("invalid_request", "code_verifier is required for PKCE");
  }

  // ── Validate client exists ─────────────────────────────
  const client = getClient(clientId);
  if (!client) {
    return tokenError("invalid_client", "Unknown client_id");
  }

  // ── Consume the authorization code (single-use) ────────
  const authCode = consumeAuthCode(code);
  if (!authCode) {
    return tokenError(
      "invalid_grant",
      "Invalid, expired, or already-used authorization code",
    );
  }

  // ── Validate code was issued to this client ────────────
  if (authCode.clientId !== clientId) {
    return tokenError("invalid_grant", "Code was not issued to this client");
  }

  // ── Validate redirect_uri matches ──────────────────────
  if (redirectUri && redirectUri !== authCode.redirectUri) {
    return tokenError("invalid_grant", "redirect_uri mismatch");
  }

  // ── Verify PKCE ────────────────────────────────────────
  if (!verifyPkceS256(codeVerifier, authCode.codeChallenge)) {
    return tokenError(
      "invalid_grant",
      "PKCE code_verifier verification failed",
    );
  }

  // ── Generate MCP token (lzr_* format) ──────────────────
  const { token, tokenHash, tokenPrefix } = generateExtensionToken();

  // Find the client name for the token label
  const tokenName = `MCP: ${client.client_name} (OAuth)`;

  try {
    await prisma.extensionApiToken.create({
      data: {
        userId: authCode.userId,
        name: tokenName,
        tokenHash,
        tokenPrefix,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    });
  } catch (err) {
    console.error("Failed to create MCP token via OAuth:", err);
    return tokenError("server_error", "Failed to create access token");
  }

  // ── Return token response ──────────────────────────────
  return Response.json(
    {
      access_token: token,
      token_type: "Bearer",
      expires_in: 90 * 24 * 60 * 60, // 90 days in seconds
      scope: authCode.scope,
    },
    {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}

function tokenError(error: string, description: string): Response {
  return Response.json(
    { error, error_description: description },
    {
      status: 400,
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
