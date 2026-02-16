import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Prisma } from "@prisma/client";
import type { ServerDependencies } from "../server.js";
import { SearchAssetsSchema, SearchScenesSchema } from "../schemas/search.js";
import { ok, forbidden, fromCatch } from "../utils/errors.js";
import { verifyProjectOwnership } from "../utils/ownership.js";

export function registerSearchTools(
  server: McpServer,
  { prisma, authContext }: ServerDependencies,
): void {
  const userId = authContext.userId;

  // ── search_assets ─────────────────────────────────────────
  server.tool(
    "search_assets",
    "Search assets by prompt text, tags, platform, status across a project",
    SearchAssetsSchema.shape,
    async ({ projectId, query, assetType, status, platformKey, tags, selected, limit }) => {
      try {
        const owned = await verifyProjectOwnership(prisma, projectId, userId);
        if (!owned) return forbidden();

        const where: Prisma.SceneAssetVersionWhereInput = {
          scene: { projectId },
        };
        if (assetType) where.assetType = assetType;
        if (status) where.status = status;
        if (platformKey) where.platformKey = platformKey;
        if (selected !== undefined) where.selected = selected;
        if (tags && tags.length > 0) {
          where.tags = { hasSome: tags };
        }
        if (query) {
          where.OR = [
            { prompt: { contains: query, mode: "insensitive" } },
            { notes: { contains: query, mode: "insensitive" } },
            { title: { contains: query, mode: "insensitive" } },
          ];
        }

        const assets = await prisma.sceneAssetVersion.findMany({
          where,
          include: {
            scene: { select: { sceneId: true, storyBeat: true } },
            platform: { select: { slug: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit ?? 50,
        });
        return ok(assets);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── search_scenes ─────────────────────────────────────────
  server.tool(
    "search_scenes",
    "Search scenes by storyBeat, sourceText, or emotionalTone",
    SearchScenesSchema.shape,
    async ({ projectId, query, act, emotionalTone, limit }) => {
      try {
        const owned = await verifyProjectOwnership(prisma, projectId, userId);
        if (!owned) return forbidden();

        const where: Prisma.SceneWhereInput = { projectId };
        if (act !== undefined) where.act = act;
        if (emotionalTone) {
          where.emotionalTone = { contains: emotionalTone, mode: "insensitive" };
        }
        if (query) {
          where.OR = [
            { storyBeat: { contains: query, mode: "insensitive" } },
            { sourceText: { contains: query, mode: "insensitive" } },
            { emotionalTone: { contains: query, mode: "insensitive" } },
          ];
        }

        const scenes = await prisma.scene.findMany({
          where,
          include: {
            _count: { select: { shots: true, assets: true } },
          },
          orderBy: { sortOrder: "asc" },
          take: limit ?? 50,
        });
        return ok(scenes);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );
}
