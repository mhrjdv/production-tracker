import { NextRequest } from "next/server";
import { getBaseUrl } from "@/lib/oauth/utils";

const MCP_ORIGIN = `http://localhost:${process.env.LAZER_MCP_PORT || 3100}`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id",
};

/**
 * Proxy MCP requests to the embedded MCP HTTP server on port 3100.
 * Secondary endpoint at /api/mcp — primary is /mcp.
 */
export async function POST(request: NextRequest) {
  const body = await request.arrayBuffer();

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key !== "host") headers[key] = value;
  });

  if (!headers["authorization"] && process.env.LAZER_MCP_DEFAULT_TOKEN) {
    headers["authorization"] =
      `Bearer ${process.env.LAZER_MCP_DEFAULT_TOKEN}`;
  }

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

  // On 401, add WWW-Authenticate header for OAuth discovery
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

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    responseHeaders.set(key, value);
  });
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    responseHeaders.set(key, value);
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

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

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
