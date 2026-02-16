import { NextRequest } from "next/server";
import { getBaseUrl, CORS_HEADERS } from "@/lib/oauth/utils";

/**
 * RFC 8414 — Authorization Server Metadata.
 *
 * Returns OAuth 2.0 metadata so MCP clients (ChatGPT) can discover
 * authorization, token, and registration endpoints.
 *
 * GET /.well-known/oauth-authorization-server
 */
export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  return Response.json(
    {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["mcp:full"],
      service_documentation: `${baseUrl}/docs`,
    },
    { headers: CORS_HEADERS },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
