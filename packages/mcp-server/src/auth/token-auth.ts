import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { McpAuthContext } from "./context.js";

/**
 * SHA-256 hash a raw lzr_* token to match the stored tokenHash.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Authenticate a raw lzr_* bearer token against the extension_api_tokens table.
 * Pure function — no framework dependencies (no NextRequest, no headers).
 *
 * Returns McpAuthContext on success, null on failure.
 */
export async function authenticateMcpToken(
  token: string,
  prisma: PrismaClient,
): Promise<McpAuthContext | null> {
  if (!token || !token.startsWith("lzr_")) {
    return null;
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  const record = await prisma.extensionApiToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      revokedAt: true,
      expiresAt: true,
    },
  });

  if (!record) {
    return null;
  }

  if (record.revokedAt) {
    return null;
  }

  if (record.expiresAt && record.expiresAt <= now) {
    return null;
  }

  // Update last-used timestamp (fire-and-forget, non-blocking)
  prisma.extensionApiToken
    .update({
      where: { id: record.id },
      data: { lastUsedAt: now },
    })
    .catch(() => {
      // Swallow — audit update is best-effort
    });

  return {
    userId: record.userId,
    tokenId: record.id,
  };
}
