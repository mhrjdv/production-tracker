import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerDependencies } from "../server.js";
import {
  CharacterListSchema,
  CharacterGetSchema,
  CharacterCreateSchema,
  CharacterUpdateSchema,
  CharacterUpdatePortraitSchema,
  CharacterDeleteSchema,
} from "../schemas/character.js";
import { ok, notFound, forbidden, fromCatch } from "../utils/errors.js";
import {
  verifyProjectOwnership,
  verifyCharacterOwnership,
} from "../utils/ownership.js";

export function registerCharacterTools(
  server: McpServer,
  { prisma, authContext }: ServerDependencies,
): void {
  const userId = authContext.userId;

  // ── character_list ────────────────────────────────────────
  server.tool(
    "character_list",
    "List all characters in a project",
    CharacterListSchema.shape,
    async ({ projectId }) => {
      try {
        const owned = await verifyProjectOwnership(prisma, projectId, userId);
        if (!owned) return forbidden();

        const characters = await prisma.character.findMany({
          where: { projectId },
          orderBy: { name: "asc" },
        });
        return ok(characters);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── character_get ─────────────────────────────────────────
  server.tool(
    "character_get",
    "Get a character with scene/shot assignments",
    CharacterGetSchema.shape,
    async ({ characterId }) => {
      try {
        const owned = await verifyCharacterOwnership(
          prisma,
          characterId,
          userId,
        );
        if (!owned) return notFound("Character", characterId);

        const character = await prisma.character.findUnique({
          where: { id: characterId },
          include: {
            scenes: { include: { scene: { select: { id: true, sceneId: true, storyBeat: true } } } },
            shots: { include: { shot: { select: { id: true, shotCode: true, description: true } } } },
          },
        });
        return ok(character);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── character_create ──────────────────────────────────────
  server.tool(
    "character_create",
    "Create a new character in a project",
    CharacterCreateSchema.shape,
    async ({ projectId, name, role, coreIdentity, designPhilosophy }) => {
      try {
        const owned = await verifyProjectOwnership(prisma, projectId, userId);
        if (!owned) return forbidden();

        const character = await prisma.character.create({
          data: {
            name,
            role,
            projectId,
            coreIdentity: coreIdentity ?? null,
            designPhilosophy: designPhilosophy ?? null,
          },
        });
        return ok(character);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── character_update ──────────────────────────────────────
  server.tool(
    "character_update",
    "Update character fields",
    CharacterUpdateSchema.shape,
    async ({ characterId, ...fields }) => {
      try {
        const owned = await verifyCharacterOwnership(
          prisma,
          characterId,
          userId,
        );
        if (!owned) return forbidden();

        const data: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(fields)) {
          if (val !== undefined) data[key] = val;
        }

        const updated = await prisma.character.update({
          where: { id: characterId },
          data,
        });
        return ok(updated);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── character_update_portrait ─────────────────────────────
  server.tool(
    "character_update_portrait",
    "Update a character's portrait image URL",
    CharacterUpdatePortraitSchema.shape,
    async ({ characterId, portraitUrl }) => {
      try {
        const owned = await verifyCharacterOwnership(
          prisma,
          characterId,
          userId,
        );
        if (!owned) return forbidden();

        const updated = await prisma.character.update({
          where: { id: characterId },
          data: { portraitUrl },
        });
        return ok(updated);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── character_delete ──────────────────────────────────────
  server.tool(
    "character_delete",
    "Delete a character (removes from all scene/shot assignments)",
    CharacterDeleteSchema.shape,
    async ({ characterId }) => {
      try {
        const owned = await verifyCharacterOwnership(
          prisma,
          characterId,
          userId,
        );
        if (!owned) return forbidden();

        await prisma.character.delete({ where: { id: characterId } });
        return ok({ deleted: true, characterId });
      } catch (e) {
        return fromCatch(e);
      }
    },
  );
}
