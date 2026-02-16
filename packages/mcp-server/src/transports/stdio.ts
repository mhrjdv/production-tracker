#!/usr/bin/env node

/**
 * STDIO transport entry point for Lazer MCP server.
 * Used by Claude Desktop, Cursor, and other local MCP clients.
 *
 * Token sources (checked in order):
 *   1. --token CLI argument
 *   2. LAZER_TOKEN environment variable
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getPrismaClient, disconnectPrisma } from "../db/client.js";
import { authenticateMcpToken } from "../auth/token-auth.js";
import { createServer } from "../server.js";

function getToken(): string {
  // Check --token CLI arg
  const tokenArgIdx = process.argv.indexOf("--token");
  if (tokenArgIdx !== -1 && process.argv[tokenArgIdx + 1]) {
    return process.argv[tokenArgIdx + 1];
  }

  // Check environment variable
  if (process.env.LAZER_TOKEN) {
    return process.env.LAZER_TOKEN;
  }

  console.error(
    "Error: No token provided. Use --token <lzr_...> or set LAZER_TOKEN.",
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const token = getToken();
  const prisma = getPrismaClient();

  // Authenticate once at startup
  const authContext = await authenticateMcpToken(token, prisma);
  if (!authContext) {
    console.error("Error: Invalid or expired token.");
    await disconnectPrisma();
    process.exit(1);
  }

  const server = createServer({ prisma, authContext });
  const transport = new StdioServerTransport();

  // Graceful shutdown
  const shutdown = async () => {
    await server.close();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
