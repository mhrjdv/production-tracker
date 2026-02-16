import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Prisma } from "@prisma/client";
import type { ServerDependencies } from "../server.js";
import {
  WorkflowIngestSchema,
  WorkflowProjectTreeSchema,
  WorkflowSceneSummarySchema,
  WorkflowProductionStatusSchema,
} from "../schemas/workflow.js";
import { ok, notFound, forbidden, err, fromCatch } from "../utils/errors.js";
import {
  verifyProjectOwnership,
  verifySceneOwnership,
} from "../utils/ownership.js";

export function registerWorkflowTools(
  server: McpServer,
  { prisma, authContext }: ServerDependencies,
): void {
  const userId = authContext.userId;

  // ── workflow_ingest ───────────────────────────────────────
  server.tool(
    "workflow_ingest",
    "Full asset ingest: resolve project/scene/platform/shot, create versioned asset",
    WorkflowIngestSchema.shape,
    async ({ projectId, sceneId: sceneUserFacingId, platformSlug, ...fields }) => {
      try {
        const owned = await verifyProjectOwnership(prisma, projectId, userId);
        if (!owned) return forbidden();

        // Resolve scene by user-facing ID
        const scene = await prisma.scene.findUnique({
          where: { projectId_sceneId: { projectId, sceneId: sceneUserFacingId } },
          select: { id: true },
        });
        if (!scene) return notFound("Scene", sceneUserFacingId);

        // Resolve platform
        const platform = await prisma.aiPlatform.findUnique({
          where: { slug: platformSlug },
          select: { id: true, slug: true, name: true },
        });
        if (!platform) return err(`Platform not found: ${platformSlug}`, "NOT_FOUND");

        // Resolve shot if shotCode provided
        let shotId: string | null = null;
        if (fields.shotCode) {
          const shot = await prisma.shot.findFirst({
            where: { sceneId: scene.id, shotCode: fields.shotCode },
            select: { id: true },
          });
          if (shot) shotId = shot.id;
        }

        // Create asset in transaction
        const asset = await prisma.$transaction(async (tx) => {
          // Get next version number
          const maxResult = await tx.sceneAssetVersion.aggregate({
            where: {
              sceneId: scene.id,
              platformKey: platform.slug,
              assetType: fields.assetType,
            },
            _max: { versionNumber: true },
          });
          const versionNumber = (maxResult._max.versionNumber ?? 0) + 1;

          const isSelected = fields.selected || fields.status === "SELECTED";
          if (isSelected) {
            await tx.sceneAssetVersion.updateMany({
              where: { sceneId: scene.id, assetType: fields.assetType, selected: true },
              data: { selected: false, status: "GENERATED" },
            });
          }

          return tx.sceneAssetVersion.create({
            data: {
              sceneId: scene.id,
              shotId,
              platformKey: platform.slug,
              platformLabel: platform.name,
              platformId: platform.id,
              assetType: fields.assetType,
              prompt: fields.prompt,
              negativePrompt: fields.negativePrompt ?? null,
              modelName: fields.modelName ?? null,
              sourceUrl: fields.sourceUrl ?? null,
              externalAssetId: fields.externalAssetId ?? null,
              outputUrl: fields.outputUrl ?? null,
              thumbnailUrl: fields.thumbnailUrl ?? null,
              metadata: (fields.metadata as Prisma.InputJsonValue) ?? undefined,
              tags: fields.tags ?? [],
              notes: fields.notes ?? null,
              title: fields.title ?? null,
              status: (fields.status as Prisma.SceneAssetVersionCreateInput["status"]) ?? "GENERATED",
              selected: isSelected ?? false,
              versionNumber,
              compareGroup: fields.compareGroup ?? null,
              createdById: userId,
            },
          });
        });

        return ok({
          ok: true,
          asset: {
            id: asset.id,
            versionNumber: asset.versionNumber,
            platformKey: asset.platformKey,
            platformLabel: asset.platformLabel,
            assetType: asset.assetType,
            status: asset.status,
            shotId: asset.shotId,
            createdAt: asset.createdAt,
          },
        });
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── workflow_project_tree ─────────────────────────────────
  server.tool(
    "workflow_project_tree",
    "Get complete project hierarchy: project → scenes → shots → asset counts",
    WorkflowProjectTreeSchema.shape,
    async ({ projectId }) => {
      try {
        const project = await prisma.project.findFirst({
          where: { id: projectId, userId },
          include: {
            identity: true,
            characters: { select: { id: true, name: true, role: true } },
            scenes: {
              orderBy: { sortOrder: "asc" },
              include: {
                shots: {
                  orderBy: { sortOrder: "asc" },
                  select: {
                    id: true,
                    shotCode: true,
                    description: true,
                    angle: true,
                    _count: { select: { assets: true } },
                  },
                },
                _count: { select: { assets: true, promptPackages: true } },
              },
            },
          },
        });
        if (!project) return notFound("Project", projectId);
        return ok(project);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── workflow_scene_summary ────────────────────────────────
  server.tool(
    "workflow_scene_summary",
    "Get a scene with all children: shots, characters, assets, prompt packages",
    WorkflowSceneSummarySchema.shape,
    async ({ sceneId }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return notFound("Scene", sceneId);

        const scene = await prisma.scene.findUnique({
          where: { id: sceneId },
          include: {
            shots: {
              orderBy: { sortOrder: "asc" },
              include: {
                characters: { include: { character: { select: { id: true, name: true } } } },
                _count: { select: { assets: true } },
              },
            },
            characters: { include: { character: { select: { id: true, name: true, role: true } } } },
            assets: {
              orderBy: { createdAt: "desc" },
              take: 20,
              select: {
                id: true,
                platformKey: true,
                assetType: true,
                status: true,
                selected: true,
                versionNumber: true,
                title: true,
              },
            },
            promptPackages: {
              orderBy: { versionNumber: "desc" },
              take: 10,
              select: {
                id: true,
                versionNumber: true,
                name: true,
                prompt: true,
                _count: { select: { assets: true } },
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

  // ── workflow_production_status ─────────────────────────────
  server.tool(
    "workflow_production_status",
    "Aggregate production stats: scenes, shots, assets by status/type, selections",
    WorkflowProductionStatusSchema.shape,
    async ({ projectId }) => {
      try {
        const owned = await verifyProjectOwnership(prisma, projectId, userId);
        if (!owned) return forbidden();

        const [sceneCount, shotCount, assetsByStatus, assetsByType, selectedAssets] =
          await Promise.all([
            prisma.scene.count({ where: { projectId } }),
            prisma.shot.count({ where: { scene: { projectId } } }),
            prisma.sceneAssetVersion.groupBy({
              by: ["status"],
              where: { scene: { projectId } },
              _count: true,
            }),
            prisma.sceneAssetVersion.groupBy({
              by: ["assetType"],
              where: { scene: { projectId } },
              _count: true,
            }),
            prisma.sceneAssetVersion.count({
              where: { scene: { projectId }, selected: true },
            }),
          ]);

        return ok({
          projectId,
          scenes: sceneCount,
          shots: shotCount,
          selectedAssets,
          assetsByStatus: Object.fromEntries(
            assetsByStatus.map((r) => [r.status, r._count]),
          ),
          assetsByType: Object.fromEntries(
            assetsByType.map((r) => [r.assetType, r._count]),
          ),
          totalAssets: assetsByStatus.reduce((sum, r) => sum + r._count, 0),
        });
      } catch (e) {
        return fromCatch(e);
      }
    },
  );
}
