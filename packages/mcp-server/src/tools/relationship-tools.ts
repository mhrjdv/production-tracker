import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerDependencies } from "../server.js";
import {
  SceneCharacterAssignSchema,
  SceneCharacterRemoveSchema,
  SceneCharacterSyncSchema,
  ShotCharacterAssignSchema,
  ShotCharacterRemoveSchema,
  ShotCharacterSyncSchema,
} from "../schemas/relationship.js";
import { ok, forbidden, fromCatch } from "../utils/errors.js";
import {
  verifySceneOwnership,
  verifyShotOwnership,
} from "../utils/ownership.js";

export function registerRelationshipTools(
  server: McpServer,
  { prisma, authContext }: ServerDependencies,
): void {
  const userId = authContext.userId;

  // ── scene_character_assign ────────────────────────────────
  server.tool(
    "scene_character_assign",
    "Assign a character to a scene",
    SceneCharacterAssignSchema.shape,
    async ({ sceneId, characterId }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return forbidden();

        const assignment = await prisma.sceneCharacter.upsert({
          where: { sceneId_characterId: { sceneId, characterId } },
          create: { sceneId, characterId },
          update: {},
        });
        return ok(assignment);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── scene_character_remove ────────────────────────────────
  server.tool(
    "scene_character_remove",
    "Remove a character from a scene",
    SceneCharacterRemoveSchema.shape,
    async ({ sceneId, characterId }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return forbidden();

        await prisma.sceneCharacter.deleteMany({
          where: { sceneId, characterId },
        });
        return ok({ removed: true, sceneId, characterId });
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── scene_character_sync ──────────────────────────────────
  server.tool(
    "scene_character_sync",
    "Sync scene characters: adds missing, removes extras",
    SceneCharacterSyncSchema.shape,
    async ({ sceneId, characterIds }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return forbidden();

        const existing = await prisma.sceneCharacter.findMany({
          where: { sceneId },
          select: { characterId: true },
        });
        const existingIds = new Set(
          existing.map((e: { characterId: string }) => e.characterId),
        );
        const targetIds = new Set(characterIds);

        const toAdd = characterIds.filter((id: string) => !existingIds.has(id));
        const toRemove = existing
          .map((e: { characterId: string }) => e.characterId)
          .filter((id: string) => !targetIds.has(id));

        await Promise.all([
          ...toAdd.map((cId) =>
            prisma.sceneCharacter.create({
              data: { sceneId, characterId: cId },
            }),
          ),
          ...(toRemove.length > 0
            ? [
                prisma.sceneCharacter.deleteMany({
                  where: { sceneId, characterId: { in: toRemove } },
                }),
              ]
            : []),
        ]);

        return ok({
          synced: true,
          added: toAdd.length,
          removed: toRemove.length,
        });
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── shot_character_assign ─────────────────────────────────
  server.tool(
    "shot_character_assign",
    "Assign a character to a shot with optional role",
    ShotCharacterAssignSchema.shape,
    async ({ shotId, characterId, role }) => {
      try {
        const owned = await verifyShotOwnership(prisma, shotId, userId);
        if (!owned) return forbidden();

        const assignment = await prisma.shotCharacter.upsert({
          where: { shotId_characterId: { shotId, characterId } },
          create: { shotId, characterId, role: role ?? null },
          update: { role: role ?? null },
        });
        return ok(assignment);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── shot_character_remove ─────────────────────────────────
  server.tool(
    "shot_character_remove",
    "Remove a character from a shot",
    ShotCharacterRemoveSchema.shape,
    async ({ shotId, characterId }) => {
      try {
        const owned = await verifyShotOwnership(prisma, shotId, userId);
        if (!owned) return forbidden();

        await prisma.shotCharacter.deleteMany({
          where: { shotId, characterId },
        });
        return ok({ removed: true, shotId, characterId });
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── shot_character_sync ───────────────────────────────────
  server.tool(
    "shot_character_sync",
    "Sync shot characters: adds missing, removes extras",
    ShotCharacterSyncSchema.shape,
    async ({ shotId, characterIds }) => {
      try {
        const owned = await verifyShotOwnership(prisma, shotId, userId);
        if (!owned) return forbidden();

        const existing = await prisma.shotCharacter.findMany({
          where: { shotId },
          select: { characterId: true },
        });
        const existingIds = new Set(
          existing.map((e: { characterId: string }) => e.characterId),
        );
        const targetIds = new Set(characterIds);

        const toAdd = characterIds.filter((id: string) => !existingIds.has(id));
        const toRemove = existing
          .map((e: { characterId: string }) => e.characterId)
          .filter((id: string) => !targetIds.has(id));

        await Promise.all([
          ...toAdd.map((cId) =>
            prisma.shotCharacter.create({
              data: { shotId, characterId: cId },
            }),
          ),
          ...(toRemove.length > 0
            ? [
                prisma.shotCharacter.deleteMany({
                  where: { shotId, characterId: { in: toRemove } },
                }),
              ]
            : []),
        ]);

        return ok({
          synced: true,
          added: toAdd.length,
          removed: toRemove.length,
        });
      } catch (e) {
        return fromCatch(e);
      }
    },
  );
}
