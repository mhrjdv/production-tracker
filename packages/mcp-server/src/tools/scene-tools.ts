import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerDependencies } from "../server.js";
import {
  SceneListSchema,
  SceneGetSchema,
  SceneCreateSchema,
  SceneUpdateSchema,
  SceneDeleteSchema,
  SceneReorderSchema,
  SceneUpdateKeyframeSchema,
} from "../schemas/scene.js";
import { ok, notFound, forbidden, fromCatch } from "../utils/errors.js";
import {
  verifyProjectOwnership,
  verifySceneOwnership,
} from "../utils/ownership.js";

export function registerSceneTools(
  server: McpServer,
  { prisma, authContext }: ServerDependencies,
): void {
  const userId = authContext.userId;

  // ── scene_list ────────────────────────────────────────────
  server.tool(
    "scene_list",
    "List all scenes in a project, ordered by sortOrder",
    SceneListSchema.shape,
    async ({ projectId }) => {
      try {
        const owned = await verifyProjectOwnership(prisma, projectId, userId);
        if (!owned) return forbidden();

        const scenes = await prisma.scene.findMany({
          where: { projectId },
          include: {
            _count: { select: { shots: true, assets: true } },
          },
          orderBy: { sortOrder: "asc" },
        });
        return ok(scenes);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── scene_get ─────────────────────────────────────────────
  server.tool(
    "scene_get",
    "Get a scene with shots, characters, and asset counts",
    SceneGetSchema.shape,
    async ({ sceneId }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return notFound("Scene", sceneId);

        const scene = await prisma.scene.findUnique({
          where: { id: sceneId },
          include: {
            shots: { orderBy: { sortOrder: "asc" } },
            characters: { include: { character: true } },
            _count: {
              select: {
                assets: true,
                promptPackages: true,
              },
            },
          },
        });
        return ok(scene);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── scene_create ──────────────────────────────────────────
  server.tool(
    "scene_create",
    "Create a new scene in a project",
    SceneCreateSchema.shape,
    async ({ projectId, ...fields }) => {
      try {
        const owned = await verifyProjectOwnership(prisma, projectId, userId);
        if (!owned) return forbidden();

        // Get next sort order
        const maxResult = await prisma.scene.aggregate({
          where: { projectId },
          _max: { sortOrder: true },
        });
        const nextOrder = (maxResult._max.sortOrder ?? -1) + 1;

        const scene = await prisma.scene.create({
          data: {
            projectId,
            sceneId: fields.sceneId,
            sourceText: fields.sourceText,
            act: fields.act,
            actTitle: fields.actTitle,
            macroScene: fields.macroScene,
            storyBeat: fields.storyBeat,
            reason: fields.reason ?? "",
            narrativePurpose: fields.narrativePurpose ?? null,
            emotionalTone: fields.emotionalTone ?? null,
            setting: fields.setting ?? undefined,
            camera: fields.camera ?? undefined,
            actions: fields.actions ?? [],
            visualMotifs: fields.visualMotifs ?? [],
            constraints: fields.constraints ?? [],
            charactersPresent: fields.charactersPresent ?? [],
            sortOrder: nextOrder,
          },
        });
        return ok(scene);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── scene_update ──────────────────────────────────────────
  server.tool(
    "scene_update",
    "Update scene fields",
    SceneUpdateSchema.shape,
    async ({ sceneId, ...fields }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return forbidden();

        const data: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(fields)) {
          if (val !== undefined) {
            // Handle JSON null for setting/camera
            data[key] = val === null ? null : val;
          }
        }

        const updated = await prisma.scene.update({
          where: { id: sceneId },
          data,
        });
        return ok(updated);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── scene_delete ──────────────────────────────────────────
  server.tool(
    "scene_delete",
    "Delete a scene and all its children (cascade)",
    SceneDeleteSchema.shape,
    async ({ sceneId }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return forbidden();

        await prisma.scene.delete({ where: { id: sceneId } });
        return ok({ deleted: true, sceneId });
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── scene_reorder ─────────────────────────────────────────
  server.tool(
    "scene_reorder",
    "Reorder scenes in a project by providing scene IDs in desired order",
    SceneReorderSchema.shape,
    async ({ projectId, sceneIds }) => {
      try {
        const owned = await verifyProjectOwnership(prisma, projectId, userId);
        if (!owned) return forbidden();

        await prisma.$transaction(
          sceneIds.map((id, index) =>
            prisma.scene.update({
              where: { id },
              data: { sortOrder: index },
            }),
          ),
        );
        return ok({ reordered: true, count: sceneIds.length });
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── scene_update_keyframe ─────────────────────────────────
  server.tool(
    "scene_update_keyframe",
    "Set the keyframe URL for a scene",
    SceneUpdateKeyframeSchema.shape,
    async ({ sceneId, keyframeUrl }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return forbidden();

        const updated = await prisma.scene.update({
          where: { id: sceneId },
          data: { keyframeUrl },
        });
        return ok(updated);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );
}
