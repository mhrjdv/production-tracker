/**
 * Authentication context carried through every MCP tool invocation.
 * Produced by token-auth, consumed by tools for ownership checks.
 */
export interface McpAuthContext {
  /** Internal Prisma user CUID */
  readonly userId: string;
  /** Token record CUID for audit */
  readonly tokenId: string;
}
