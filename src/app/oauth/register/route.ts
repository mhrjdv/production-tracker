import { NextRequest } from "next/server";
import { registerClient } from "@/lib/oauth/store";
import { CORS_HEADERS } from "@/lib/oauth/utils";

/**
 * RFC 7591 — Dynamic Client Registration.
 *
 * MCP clients (ChatGPT) call this to register themselves and receive a client_id.
 * POST /oauth/register
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_request", error_description: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const redirect_uris = body.redirect_uris;
  if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    return Response.json(
      {
        error: "invalid_client_metadata",
        error_description: "redirect_uris is required and must be a non-empty array",
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Validate all redirect URIs are HTTPS (except localhost for development)
  for (const uri of redirect_uris) {
    if (typeof uri !== "string") {
      return Response.json(
        {
          error: "invalid_client_metadata",
          error_description: "Each redirect_uri must be a string",
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    try {
      const parsed = new URL(uri);
      if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
        return Response.json(
          {
            error: "invalid_client_metadata",
            error_description: `redirect_uri must use HTTPS: ${uri}`,
          },
          { status: 400, headers: CORS_HEADERS },
        );
      }
    } catch {
      return Response.json(
        {
          error: "invalid_client_metadata",
          error_description: `Invalid redirect_uri: ${uri}`,
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }
  }

  const client = registerClient({
    client_name: typeof body.client_name === "string" ? body.client_name : undefined,
    redirect_uris: redirect_uris as string[],
    grant_types: Array.isArray(body.grant_types) ? (body.grant_types as string[]) : undefined,
    response_types: Array.isArray(body.response_types) ? (body.response_types as string[]) : undefined,
    token_endpoint_auth_method:
      typeof body.token_endpoint_auth_method === "string"
        ? body.token_endpoint_auth_method
        : undefined,
  });

  return Response.json(
    {
      client_id: client.client_id,
      client_name: client.client_name,
      redirect_uris: client.redirect_uris,
      grant_types: client.grant_types,
      response_types: client.response_types,
      token_endpoint_auth_method: client.token_endpoint_auth_method,
    },
    { status: 201, headers: CORS_HEADERS },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
