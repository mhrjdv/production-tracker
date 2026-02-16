// Public API for @lazer/mcp-server

export { createServer } from "./server.js";
export type { ServerDependencies } from "./server.js";
export type { McpAuthContext } from "./auth/context.js";
export { authenticateMcpToken, hashToken } from "./auth/token-auth.js";
export { getPrismaClient, disconnectPrisma } from "./db/client.js";
export { startMcpHttpServer } from "./transports/http.js";
export type { McpHttpServerOptions } from "./transports/http.js";
export {
  isValidTransition,
  validateStatusTransition,
  getValidTransitions,
  ALL_STATUSES,
} from "./utils/status-machine.js";
export type { AssetStatus } from "./utils/status-machine.js";
