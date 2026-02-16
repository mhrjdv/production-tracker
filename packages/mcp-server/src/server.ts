import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrismaClient } from "@prisma/client";
import type { McpAuthContext } from "./auth/context.js";
import { registerProjectTools } from "./tools/project-tools.js";
import { registerSceneTools } from "./tools/scene-tools.js";
import { registerShotTools } from "./tools/shot-tools.js";
import { registerCharacterTools } from "./tools/character-tools.js";
import { registerRelationshipTools } from "./tools/relationship-tools.js";
import { registerIdentityTools } from "./tools/identity-tools.js";
import { registerAssetTools } from "./tools/asset-tools.js";
import { registerPromptPackageTools } from "./tools/prompt-package-tools.js";
import { registerPlatformTools } from "./tools/platform-tools.js";
import { registerSearchTools } from "./tools/search-tools.js";
import { registerWorkflowTools } from "./tools/workflow-tools.js";
import { registerAllResources } from "./resources/index.js";
import { registerAllPrompts } from "./prompts/index.js";

export interface ServerDependencies {
  prisma: PrismaClient;
  authContext: McpAuthContext;
}

/**
 * Create and configure the Lazer MCP server.
 * Registers all tools, resources, and prompts.
 *
 * @param deps - Prisma client and authenticated context
 * @returns Configured McpServer ready to connect to a transport
 */
export function createServer(deps: ServerDependencies): McpServer {
  const server = new McpServer({
    name: "lazer",
    version: "0.1.0",
  });

  registerTools(server, deps);
  registerResources(server, deps);
  registerPrompts(server, deps);

  return server;
}

function registerTools(server: McpServer, deps: ServerDependencies): void {
  // Phase 2
  registerProjectTools(server, deps);
  registerSceneTools(server, deps);
  registerShotTools(server, deps);
  // Phase 3
  registerCharacterTools(server, deps);
  registerRelationshipTools(server, deps);
  registerIdentityTools(server, deps);
  // Phase 4
  registerAssetTools(server, deps);
  registerPromptPackageTools(server, deps);
  registerPlatformTools(server, deps);
  // Phase 5
  registerSearchTools(server, deps);
  registerWorkflowTools(server, deps);
}

function registerResources(server: McpServer, deps: ServerDependencies): void {
  registerAllResources(server, deps);
}

function registerPrompts(server: McpServer, deps: ServerDependencies): void {
  registerAllPrompts(server, deps);
}
