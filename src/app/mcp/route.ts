import { NextRequest } from "next/server";
import { getBaseUrl } from "@/lib/oauth/utils";

const MCP_ORIGIN = `http://localhost:${process.env.LAZER_MCP_PORT || 3100}`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id",
};

/**
 * Resolve the MCP bearer token from the request.
 * Falls back to LAZER_MCP_DEFAULT_TOKEN for "No Auth" mode (ChatGPT).
 */
function resolveToken(request: NextRequest): string {
  const authHeader = request.headers.get("authorization") ?? "";
  const headerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  return headerToken || process.env.LAZER_MCP_DEFAULT_TOKEN || "";
}

/**
 * Build forwarding headers — copy all except host, add auth if missing.
 */
function buildUpstreamHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key !== "host") headers[key] = value;
  });
  if (!headers["authorization"]) {
    const token = resolveToken(request);
    if (token) {
      headers["authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

/**
 * POST /mcp — Main MCP Streamable HTTP endpoint.
 * Proxies JSON-RPC messages to the embedded MCP server on port 3100.
 * Response may be SSE (text/event-stream) or JSON.
 *
 * On 401, returns proper WWW-Authenticate header for OAuth discovery (RFC 9728).
 */
export async function POST(request: NextRequest) {
  const body = await request.arrayBuffer();
  const headers = buildUpstreamHeaders(request);

  let upstream: Response;
  try {
    upstream = await fetch(`${MCP_ORIGIN}/mcp`, {
      method: "POST",
      headers,
      body,
    });
  } catch {
    return Response.json(
      { error: "MCP server not reachable" },
      { status: 503, headers: CORS_HEADERS },
    );
  }

  // On 401, add WWW-Authenticate header so MCP clients discover our OAuth
  if (upstream.status === 401) {
    const baseUrl = getBaseUrl(request);
    return Response.json(
      { error: "Unauthorized", message: "Valid Bearer token required" },
      {
        status: 401,
        headers: {
          ...CORS_HEADERS,
          "WWW-Authenticate": `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
        },
      },
    );
  }

  // Forward the response as-is (preserves SSE content-type for streaming)
  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    responseHeaders.set(key, value);
  });
  // Ensure CORS headers are present on the response
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    responseHeaders.set(key, value);
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

/**
 * GET /mcp — Health check (proxied to embedded MCP server).
 */
export async function GET() {
  try {
    const upstream = await fetch(`${MCP_ORIGIN}/health`);
    const data = await upstream.json();
    return Response.json(data, { headers: CORS_HEADERS });
  } catch {
    return Response.json(
      { status: "error", message: "MCP server not reachable" },
      { status: 503, headers: CORS_HEADERS },
    );
  }
}

/**
 * DELETE /mcp — Session close (MCP Streamable HTTP protocol).
 * Forwarded to embedded server even in stateless mode.
 */
export async function DELETE(request: NextRequest) {
  const headers = buildUpstreamHeaders(request);

  try {
    const upstream = await fetch(`${MCP_ORIGIN}/mcp`, {
      method: "DELETE",
      headers,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch {
    return Response.json(
      { error: "MCP server not reachable" },
      { status: 503, headers: CORS_HEADERS },
    );
  }
}

/**
 * OPTIONS /mcp — CORS preflight.
 */
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
