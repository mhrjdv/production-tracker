/**
 * Standard MCP tool response formatters.
 * All tools return { content: [{ type: "text", text }] }.
 */

export interface McpToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

/** Format a successful JSON result. */
export function ok(data: unknown): McpToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

/** Format an error result. */
export function err(message: string, code?: string): McpToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ error: message, code: code ?? "ERROR" }),
      },
    ],
    isError: true,
  };
}

/** Standard error for missing/invalid auth. */
export function authError(): McpToolResult {
  return err(
    "Authentication required. Provide a valid lzr_* token.",
    "UNAUTHORIZED",
  );
}

/** Standard error for resource not found. */
export function notFound(resource: string, id: string): McpToolResult {
  return err(`${resource} not found: ${id}`, "NOT_FOUND");
}

/** Standard error for ownership violation. */
export function forbidden(): McpToolResult {
  return err("You do not own this resource.", "FORBIDDEN");
}

/** Wrap an unknown caught error into an MCP error result. */
export function fromCatch(error: unknown): McpToolResult {
  const message =
    error instanceof Error ? error.message : "Unknown error occurred";
  return err(message, "INTERNAL_ERROR");
}
