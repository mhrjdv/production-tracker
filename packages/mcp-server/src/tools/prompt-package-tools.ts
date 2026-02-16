import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Prisma } from "@prisma/client";
import type { ServerDependencies } from "../server.js";
import {
  PromptPackageListSchema,
  PromptPackageGetSchema,
  PromptPackageCreateSchema,
} from "../schemas/prompt-package.js";
import { ok, notFound, forbidden, fromCatch } from "../utils/errors.js";
import { verifySceneOwnership } from "../utils/ownership.js";

export function registerPromptPackageTools(
  server: McpServer,
  { prisma, authContext }: ServerDependencies,
): void {
  const userId = authContext.userId;

  // ── prompt_package_list ───────────────────────────────────
  server.tool(
    "prompt_package_list",
    "List prompt packages for a scene",
    PromptPackageListSchema.shape,
    async ({ sceneId }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return forbidden();

        const packages = await prisma.promptPackage.findMany({
          where: { sceneId },
          include: {
            _count: { select: { assets: true } },
          },
          orderBy: { versionNumber: "desc" },
        });
        return ok(packages);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── prompt_package_get ────────────────────────────────────
  server.tool(
    "prompt_package_get",
    "Get a prompt package with linked asset count",
    PromptPackageGetSchema.shape,
    async ({ promptPackageId }) => {
      try {
        const pkg = await prisma.promptPackage.findFirst({
          where: {
            id: promptPackageId,
            scene: { project: { userId } },
          },
          include: {
            _count: { select: { assets: true } },
            shot: { select: { id: true, shotCode: true } },
          },
        });
        if (!pkg) return notFound("PromptPackage", promptPackageId);
        return ok(pkg);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── prompt_package_create ─────────────────────────────────
  server.tool(
    "prompt_package_create",
    "Create a prompt package with auto-incremented version",
    PromptPackageCreateSchema.shape,
    async ({ sceneId, ...fields }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return forbidden();

        // Get next version number
        const maxResult = await prisma.promptPackage.aggregate({
          where: { sceneId },
          _max: { versionNumber: true },
        });
        const versionNumber = (maxResult._max.versionNumber ?? 0) + 1;

        const pkg = await prisma.promptPackage.create({
          data: {
            sceneId,
            shotId: fields.shotId ?? null,
            versionNumber,
            name: fields.name ?? null,
            prompt: fields.prompt,
            negativePrompt: fields.negativePrompt ?? null,
            constraints: (fields.constraints as Prisma.InputJsonValue) ?? undefined,
            targetAspectRatio: fields.targetAspectRatio ?? null,
            targetDurationSec: fields.targetDurationSec ?? null,
            styleProfile: fields.styleProfile ?? null,
            tags: fields.tags ?? [],
            metadata: (fields.metadata as Prisma.InputJsonValue) ?? undefined,
            createdById: userId,
          },
        });
        return ok(pkg);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );
}
