#!/usr/bin/env node

/**
 * Streamable HTTP transport for Lazer MCP server.
 * Used by remote MCP clients (ChatGPT, web agents).
 *
 * Can run standalone or embedded inside another Node process (e.g. Next.js).
 *
 * Auth: Authorization: Bearer lzr_... header (validated per-request).
 * Port: --port flag or LAZER_MCP_PORT env var (default 3100).
 */

import { createServer as createHttpServer, type Server } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { PrismaClient } from "@prisma/client";
import { getPrismaClient, disconnectPrisma } from "../db/client.js";
import { authenticateMcpToken } from "../auth/token-auth.js";
import { createServer } from "../server.js";

export interface McpHttpServerOptions {
  /** Port to listen on (default: 3100) */
  port?: number;
  /** Existing PrismaClient to reuse (avoids creating a second connection pool) */
  prisma?: PrismaClient;
  /** If true, don't register SIGINT/SIGTERM handlers (caller manages lifecycle) */
  embedded?: boolean;
}

/**
 * Start the MCP HTTP server.
 * Returns the http.Server instance for lifecycle management.
 */
export function startMcpHttpServer(options: McpHttpServerOptions = {}): Server {
  const port = options.port ?? getMcpPort();
  const prisma = options.prisma ?? getPrismaClient();
  const embedded = options.embedded ?? false;

  const httpServer = createHttpServer(async (req, res) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      });
      res.end();
      return;
    }

    // Health check
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", server: "lazer-mcp" }));
      return;
    }

    // MCP endpoint
    if (req.url === "/mcp" && req.method === "POST") {
      // Token resolution: header > env default (for ChatGPT "No Auth" mode)
      const authHeader = req.headers.authorization ?? "";
      const headerToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : "";
      const token = headerToken || process.env.LAZER_MCP_DEFAULT_TOKEN || "";

      const authContext = await authenticateMcpToken(token, prisma);
      if (!authContext) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid or missing token" }));
        return;
      }

      // Per-request MCP server + transport
      const mcpServer = createServer({ prisma, authContext });
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      await mcpServer.connect(transport);
      await transport.handleRequest(req, res);
      await mcpServer.close();
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. Use POST /mcp" }));
  });

  if (!embedded) {
    const shutdown = async () => {
      httpServer.close();
      await disconnectPrisma();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }

  httpServer.listen(port, () => {
    console.log(
      `Lazer MCP server listening on http://localhost:${port}/mcp`,
    );
  });

  return httpServer;
}

function getMcpPort(): number {
  const portArgIdx = process.argv.indexOf("--port");
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    return parseInt(process.argv[portArgIdx + 1], 10);
  }
  if (process.env.LAZER_MCP_PORT) {
    return parseInt(process.env.LAZER_MCP_PORT, 10);
  }
  return 3100;
}

// ── Standalone entry point ──────────────────────────────────
// Only runs when executed directly (not imported)
const isMain =
  process.argv[1]?.endsWith("http.js") || process.argv[1]?.endsWith("http.ts");

if (isMain) {
  startMcpHttpServer();
}
