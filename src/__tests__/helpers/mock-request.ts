import { NextRequest } from "next/server";

// ─── Mock NextRequest Factory ────────────────────────────────
// Creates NextRequest objects for testing API route handlers

interface MockRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  searchParams?: Record<string, string>;
}

export function createMockRequest(
  path: string,
  options: MockRequestOptions = {},
): NextRequest {
  const { method = "GET", headers = {}, body, searchParams = {} } = options;

  const url = new URL(path, "http://localhost:3000");
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body !== undefined && method !== "GET") {
    init.body = JSON.stringify(body);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(url, init as any);
}

export function createAuthenticatedRequest(
  path: string,
  options: MockRequestOptions = {},
): NextRequest {
  return createMockRequest(path, {
    ...options,
    headers: {
      Authorization: "Bearer lmt_test_token_12345",
      ...options.headers,
    },
  });
}
