import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerDependencies } from "../server.js";
import {
  PlatformListSchema,
  PlatformGetSchema,
  PlatformCreateSchema,
  PlatformUpdateSchema,
} from "../schemas/platform.js";
import { ok, notFound, fromCatch } from "../utils/errors.js";

export function registerPlatformTools(
  server: McpServer,
  { prisma }: ServerDependencies,
): void {
  // ── platform_list ─────────────────────────────────────────
  server.tool(
    "platform_list",
    "List all registered AI platforms",
    PlatformListSchema.shape,
    async () => {
      try {
        const platforms = await prisma.aiPlatform.findMany({
          include: {
            _count: { select: { sceneAssets: true } },
          },
          orderBy: { name: "asc" },
        });
        return ok(platforms);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── platform_get ──────────────────────────────────────────
  server.tool(
    "platform_get",
    "Get a platform with asset counts",
    PlatformGetSchema.shape,
    async ({ platformId }) => {
      try {
        const platform = await prisma.aiPlatform.findUnique({
          where: { id: platformId },
          include: {
            _count: { select: { sceneAssets: true } },
          },
        });
        if (!platform) return notFound("AiPlatform", platformId);
        return ok(platform);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── platform_create ───────────────────────────────────────
  server.tool(
    "platform_create",
    "Register a new AI platform",
    PlatformCreateSchema.shape,
    async ({ slug, name, provider, homepageUrl, docsUrl, specialties, supportedOutput, notes }) => {
      try {
        const platform = await prisma.aiPlatform.create({
          data: {
            slug,
            name,
            provider: provider ?? null,
            homepageUrl: homepageUrl ?? null,
            docsUrl: docsUrl ?? null,
            specialties: specialties ?? [],
            supportedOutput: supportedOutput ?? [],
            notes: notes ?? null,
          },
        });
        return ok(platform);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── platform_update ───────────────────────────────────────
  server.tool(
    "platform_update",
    "Update an AI platform's details",
    PlatformUpdateSchema.shape,
    async ({ platformId, ...fields }) => {
      try {
        const existing = await prisma.aiPlatform.findUnique({
          where: { id: platformId },
          select: { id: true },
        });
        if (!existing) return notFound("AiPlatform", platformId);

        const data: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(fields)) {
          if (val !== undefined) data[key] = val;
        }

        const updated = await prisma.aiPlatform.update({
          where: { id: platformId },
          data,
        });
        return ok(updated);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );
}
