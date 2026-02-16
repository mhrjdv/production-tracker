import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Prisma } from "@prisma/client";
import type { ServerDependencies } from "../server.js";
import {
  ShotListSchema,
  ShotGetSchema,
  ShotCreateSchema,
  ShotUpdateSchema,
  ShotDeleteSchema,
  ShotReorderSchema,
} from "../schemas/shot.js";
import { ok, notFound, forbidden, fromCatch } from "../utils/errors.js";
import {
  verifySceneOwnership,
  verifyShotOwnership,
} from "../utils/ownership.js";

/**
 * Generate next shot code from current max (e.g. "SH003" -> "SH004").
 */
function nextShotCode(currentMax: string | null): string {
  if (!currentMax) return "SH001";
  const num = parseInt(currentMax.replace(/^SH/i, ""), 10);
  return `SH${String(num + 1).padStart(3, "0")}`;
}

export function registerShotTools(
  server: McpServer,
  { prisma, authContext }: ServerDependencies,
): void {
  const userId = authContext.userId;

  // ── shot_list ─────────────────────────────────────────────
  server.tool(
    "shot_list",
    "List all shots in a scene, ordered by sortOrder",
    ShotListSchema.shape,
    async ({ sceneId }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return notFound("Scene", sceneId);

        const shots = await prisma.shot.findMany({
          where: { sceneId },
          include: {
            _count: { select: { assets: true, characters: true } },
          },
          orderBy: { sortOrder: "asc" },
        });
        return ok(shots);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── shot_get ──────────────────────────────────────────────
  server.tool(
    "shot_get",
    "Get a shot with characters and asset counts",
    ShotGetSchema.shape,
    async ({ shotId }) => {
      try {
        const owned = await verifyShotOwnership(prisma, shotId, userId);
        if (!owned) return notFound("Shot", shotId);

        const shot = await prisma.shot.findUnique({
          where: { id: shotId },
          include: {
            characters: { include: { character: true } },
            _count: {
              select: { assets: true, promptPackages: true },
            },
          },
        });
        return ok(shot);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── shot_create ───────────────────────────────────────────
  server.tool(
    "shot_create",
    "Create a shot with auto-generated shotCode (SH001, SH002...)",
    ShotCreateSchema.shape,
    async ({ sceneId, ...fields }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return forbidden();

        // Get existing shots to compute next code + sort order
        const existing = await prisma.shot.findMany({
          where: { sceneId },
          select: { shotCode: true, sortOrder: true },
          orderBy: { shotCode: "desc" },
        });

        const maxCode = existing.length > 0 ? existing[0].shotCode : null;
        const shotCode = nextShotCode(maxCode);
        const maxSort = existing.reduce(
          (max: number, s: { sortOrder: number }) => Math.max(max, s.sortOrder),
          -1,
        );

        const shot = await prisma.shot.create({
          data: {
            shotCode,
            sceneId,
            description: fields.description,
            angle: fields.angle ?? null,
            framing: fields.framing ?? null,
            movement: fields.movement ?? null,
            lensNotes: fields.lensNotes ?? null,
            references:
              (fields.references as Prisma.InputJsonValue) ?? undefined,
            sortOrder: maxSort + 1,
          },
        });
        return ok(shot);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── shot_update ───────────────────────────────────────────
  server.tool(
    "shot_update",
    "Update shot fields",
    ShotUpdateSchema.shape,
    async ({ shotId, ...fields }) => {
      try {
        const owned = await verifyShotOwnership(prisma, shotId, userId);
        if (!owned) return forbidden();

        const data: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(fields)) {
          if (val !== undefined) {
            data[key] = val === null ? null : val;
          }
        }

        const updated = await prisma.shot.update({
          where: { id: shotId },
          data,
        });
        return ok(updated);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── shot_delete ───────────────────────────────────────────
  server.tool(
    "shot_delete",
    "Delete a shot (nullifies shotId on related assets)",
    ShotDeleteSchema.shape,
    async ({ shotId }) => {
      try {
        const owned = await verifyShotOwnership(prisma, shotId, userId);
        if (!owned) return forbidden();

        // Nullify shotId on assets before deleting
        await prisma.sceneAssetVersion.updateMany({
          where: { shotId },
          data: { shotId: null },
        });

        await prisma.shot.delete({ where: { id: shotId } });
        return ok({ deleted: true, shotId });
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── shot_reorder ──────────────────────────────────────────
  server.tool(
    "shot_reorder",
    "Reorder shots in a scene by providing shot IDs in desired order",
    ShotReorderSchema.shape,
    async ({ sceneId, shotIds }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return forbidden();

        await prisma.$transaction(
          shotIds.map((id, index) =>
            prisma.shot.update({
              where: { id },
              data: { sortOrder: index },
            }),
          ),
        );
        return ok({ reordered: true, count: shotIds.length });
      } catch (e) {
        return fromCatch(e);
      }
    },
  );
}
