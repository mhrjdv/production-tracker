import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Prisma } from "@prisma/client";
import type { ServerDependencies } from "../server.js";
import { IdentityGetSchema, IdentityUpsertSchema } from "../schemas/identity.js";
import { ok, notFound, forbidden, fromCatch } from "../utils/errors.js";
import { verifyProjectOwnership } from "../utils/ownership.js";

export function registerIdentityTools(
  server: McpServer,
  { prisma, authContext }: ServerDependencies,
): void {
  const userId = authContext.userId;

  // ── identity_get ──────────────────────────────────────────
  server.tool(
    "identity_get",
    "Get the film identity for a project",
    IdentityGetSchema.shape,
    async ({ projectId }) => {
      try {
        const owned = await verifyProjectOwnership(prisma, projectId, userId);
        if (!owned) return forbidden();

        const identity = await prisma.filmIdentity.findUnique({
          where: { projectId },
        });
        if (!identity) return notFound("FilmIdentity", projectId);
        return ok(identity);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── identity_upsert ──────────────────────────────────────
  server.tool(
    "identity_upsert",
    "Create or update the film identity for a project",
    IdentityUpsertSchema.shape,
    async ({ projectId, data }) => {
      try {
        const owned = await verifyProjectOwnership(prisma, projectId, userId);
        if (!owned) return forbidden();

        const jsonData = data as Prisma.InputJsonValue;
        const identity = await prisma.filmIdentity.upsert({
          where: { projectId },
          create: { projectId, data: jsonData },
          update: { data: jsonData },
        });
        return ok(identity);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );
}
