import { NextRequest } from "next/server";
import { getBaseUrl, CORS_HEADERS } from "@/lib/oauth/utils";

/**
 * RFC 9728 — Protected Resource Metadata.
 *
 * MCP clients (ChatGPT) discover the authorization server from this endpoint.
 * GET /.well-known/oauth-protected-resource
 */
export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  return Response.json(
    {
      resource: baseUrl,
      authorization_servers: [baseUrl],
      scopes_supported: ["mcp:full"],
      bearer_methods_supported: ["header"],
    },
    { headers: CORS_HEADERS },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
