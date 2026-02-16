/**
 * Next.js instrumentation hook.
 * Runs once when the server starts — boots the MCP HTTP server alongside Next.js.
 *
 * The MCP server reuses the app's existing Prisma client (single connection pool)
 * and listens on port 3100 (or LAZER_MCP_PORT).
 */
export async function register() {
  // Only run on the Node.js server runtime (not edge, not client)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prisma } = await import("@/lib/db");
    const { startMcpHttpServer } = await import("@lazer/mcp-server");

    startMcpHttpServer({
      prisma,
      embedded: true, // don't register SIGINT/SIGTERM (Next.js manages lifecycle)
    });
  }
}
