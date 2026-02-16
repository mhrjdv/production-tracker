import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Prisma } from "@prisma/client";
import type { ServerDependencies } from "../server.js";
import {
  AssetListSchema,
  AssetGetSchema,
  AssetCreateSchema,
  AssetUpdateSchema,
  AssetDeleteSchema,
  AssetSelectSchema,
  AssetFanoutSchema,
  AssetCompareSchema,
} from "../schemas/asset.js";
import { ok, notFound, forbidden, err, fromCatch } from "../utils/errors.js";
import {
  verifySceneOwnership,
  verifyAssetOwnership,
} from "../utils/ownership.js";
import {
  validateStatusTransition,
  type AssetStatus,
} from "../utils/status-machine.js";

export function registerAssetTools(
  server: McpServer,
  { prisma, authContext }: ServerDependencies,
): void {
  const userId = authContext.userId;

  // ── asset_list ────────────────────────────────────────────
  server.tool(
    "asset_list",
    "List assets in a scene, optionally filtered by type/status/shot",
    AssetListSchema.shape,
    async ({ sceneId, assetType, status, shotId }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return forbidden();

        const where: Prisma.SceneAssetVersionWhereInput = { sceneId };
        if (assetType) where.assetType = assetType;
        if (status) where.status = status;
        if (shotId) where.shotId = shotId;

        const assets = await prisma.sceneAssetVersion.findMany({
          where,
          include: { platform: { select: { slug: true, name: true } } },
          orderBy: [{ createdAt: "desc" }],
        });
        return ok(assets);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── asset_get ─────────────────────────────────────────────
  server.tool(
    "asset_get",
    "Get an asset with prompt package and platform details",
    AssetGetSchema.shape,
    async ({ assetId }) => {
      try {
        const owned = await verifyAssetOwnership(prisma, assetId, userId);
        if (!owned) return notFound("Asset", assetId);

        const asset = await prisma.sceneAssetVersion.findUnique({
          where: { id: assetId },
          include: {
            promptPackage: true,
            platform: true,
            parentVersion: { select: { id: true, versionNumber: true, platformKey: true } },
          },
        });
        return ok(asset);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── asset_create ──────────────────────────────────────────
  server.tool(
    "asset_create",
    "Create an asset version with auto-incremented version number",
    AssetCreateSchema.shape,
    async ({ sceneId, ...fields }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return forbidden();

        const asset = await prisma.$transaction(async (tx) => {
          // Get next version number
          const maxResult = await tx.sceneAssetVersion.aggregate({
            where: {
              sceneId,
              platformKey: fields.platformKey,
              assetType: fields.assetType,
            },
            _max: { versionNumber: true },
          });
          const versionNumber = (maxResult._max.versionNumber ?? 0) + 1;

          // Deselect others if selecting
          const isSelected = fields.selected || fields.status === "SELECTED";
          if (isSelected) {
            await tx.sceneAssetVersion.updateMany({
              where: { sceneId, assetType: fields.assetType, selected: true },
              data: { selected: false, status: "GENERATED" },
            });
          }

          return tx.sceneAssetVersion.create({
            data: {
              sceneId,
              shotId: fields.shotId ?? null,
              platformKey: fields.platformKey,
              platformLabel: fields.platformLabel,
              platformId: fields.platformId ?? null,
              assetType: fields.assetType,
              prompt: fields.prompt,
              negativePrompt: fields.negativePrompt ?? null,
              modelName: fields.modelName ?? null,
              sourceUrl: fields.sourceUrl ?? null,
              externalAssetId: fields.externalAssetId ?? null,
              outputUrl: fields.outputUrl ?? null,
              thumbnailUrl: fields.thumbnailUrl ?? null,
              metadata: (fields.metadata as Prisma.InputJsonValue) ?? undefined,
              provenance: (fields.provenance as Prisma.InputJsonValue) ?? undefined,
              tags: fields.tags ?? [],
              notes: fields.notes ?? null,
              title: fields.title ?? null,
              status: fields.status ?? "DRAFT",
              rightsState: fields.rightsState ?? "UNKNOWN",
              selected: isSelected ?? false,
              versionNumber,
              promptPackageId: fields.promptPackageId ?? null,
              parentVersionId: fields.parentVersionId ?? null,
              compareGroup: fields.compareGroup ?? null,
              costEstimateUsd: fields.costEstimateUsd ?? null,
              generationSeconds: fields.generationSeconds ?? null,
              queueWaitSeconds: fields.queueWaitSeconds ?? null,
              createdById: userId,
            },
          });
        });

        return ok(asset);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── asset_update ──────────────────────────────────────────
  server.tool(
    "asset_update",
    "Update an asset with status transition validation",
    AssetUpdateSchema.shape,
    async ({ assetId, ...fields }) => {
      try {
        const owned = await verifyAssetOwnership(prisma, assetId, userId);
        if (!owned) return forbidden();

        const existing = await prisma.sceneAssetVersion.findUnique({
          where: { id: assetId },
          select: { status: true, sceneId: true, assetType: true },
        });
        if (!existing) return notFound("Asset", assetId);

        // Validate status transition if status is changing
        if (fields.status && fields.status !== existing.status) {
          try {
            validateStatusTransition(
              existing.status as AssetStatus,
              fields.status as AssetStatus,
            );
          } catch (e) {
            return err(
              e instanceof Error ? e.message : "Invalid status transition",
              "INVALID_TRANSITION",
            );
          }
        }

        const asset = await prisma.$transaction(async (tx) => {
          // Deselect others if selecting
          const isSelecting = fields.selected === true || fields.status === "SELECTED";
          if (isSelecting) {
            await tx.sceneAssetVersion.updateMany({
              where: {
                sceneId: existing.sceneId,
                assetType: existing.assetType,
                selected: true,
                id: { not: assetId },
              },
              data: { selected: false },
            });
          }

          const data: Record<string, unknown> = {};
          for (const [key, val] of Object.entries(fields)) {
            if (val !== undefined) {
              if (key === "metadata" || key === "provenance") {
                data[key] = val as Prisma.InputJsonValue;
              } else {
                data[key] = val;
              }
            }
          }

          return tx.sceneAssetVersion.update({
            where: { id: assetId },
            data,
          });
        });

        return ok(asset);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── asset_delete ──────────────────────────────────────────
  server.tool(
    "asset_delete",
    "Delete an asset version",
    AssetDeleteSchema.shape,
    async ({ assetId }) => {
      try {
        const owned = await verifyAssetOwnership(prisma, assetId, userId);
        if (!owned) return forbidden();

        await prisma.sceneAssetVersion.delete({ where: { id: assetId } });
        return ok({ deleted: true, assetId });
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── asset_select ──────────────────────────────────────────
  server.tool(
    "asset_select",
    "Toggle selection on an asset (deselects others of same type in scene)",
    AssetSelectSchema.shape,
    async ({ assetId, selected }) => {
      try {
        const owned = await verifyAssetOwnership(prisma, assetId, userId);
        if (!owned) return forbidden();

        const existing = await prisma.sceneAssetVersion.findUnique({
          where: { id: assetId },
          select: { sceneId: true, assetType: true },
        });
        if (!existing) return notFound("Asset", assetId);

        const asset = await prisma.$transaction(async (tx) => {
          if (selected) {
            await tx.sceneAssetVersion.updateMany({
              where: {
                sceneId: existing.sceneId,
                assetType: existing.assetType,
                selected: true,
                id: { not: assetId },
              },
              data: { selected: false },
            });
          }

          return tx.sceneAssetVersion.update({
            where: { id: assetId },
            data: { selected, status: selected ? "SELECTED" : undefined },
          });
        });

        return ok(asset);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── asset_fanout ──────────────────────────────────────────
  server.tool(
    "asset_fanout",
    "Create one asset per platform (multi-platform fanout)",
    AssetFanoutSchema.shape,
    async ({ sceneId, platformIds, ...fields }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return forbidden();

        const platforms = await prisma.aiPlatform.findMany({
          where: { id: { in: platformIds } },
        });
        if (platforms.length === 0) {
          return err("No valid platforms found", "NOT_FOUND");
        }

        const assets = await prisma.$transaction(async (tx) => {
          // Get version numbers per platform
          const versionRows = await tx.sceneAssetVersion.groupBy({
            by: ["platformKey"],
            where: {
              sceneId,
              assetType: fields.assetType,
              platformKey: { in: platforms.map((p) => p.slug) },
            },
            _max: { versionNumber: true },
          });
          const versionMap = new Map(
            versionRows.map((r) => [r.platformKey, r._max.versionNumber ?? 0]),
          );

          const created = [];
          for (const platform of platforms) {
            const versionNumber = (versionMap.get(platform.slug) ?? 0) + 1;
            const asset = await tx.sceneAssetVersion.create({
              data: {
                sceneId,
                platformKey: platform.slug,
                platformLabel: platform.name,
                platformId: platform.id,
                assetType: fields.assetType,
                prompt: fields.prompt,
                negativePrompt: fields.negativePrompt ?? null,
                modelName: fields.modelName ?? null,
                sourceUrl: fields.sourceUrl ?? null,
                outputUrl: fields.outputUrl ?? null,
                thumbnailUrl: fields.thumbnailUrl ?? null,
                externalAssetId: fields.externalAssetId ?? null,
                metadata: (fields.metadata as Prisma.InputJsonValue) ?? undefined,
                provenance: (fields.provenance as Prisma.InputJsonValue) ?? undefined,
                tags: fields.tags ?? [],
                notes: fields.notes ?? null,
                title: fields.title ?? null,
                status: fields.status ?? "DRAFT",
                rightsState: fields.rightsState ?? "UNKNOWN",
                selected: fields.selected ?? false,
                versionNumber,
                promptPackageId: fields.promptPackageId ?? null,
                parentVersionId: fields.parentVersionId ?? null,
                compareGroup: fields.compareGroup ?? null,
                costEstimateUsd: fields.costEstimateUsd ?? null,
                generationSeconds: fields.generationSeconds ?? null,
                queueWaitSeconds: fields.queueWaitSeconds ?? null,
                createdById: userId,
              },
            });
            created.push(asset);
          }
          return created;
        });

        return ok({ created: assets.length, assets });
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── asset_compare ─────────────────────────────────────────
  server.tool(
    "asset_compare",
    "List all assets in a compare group within a scene",
    AssetCompareSchema.shape,
    async ({ sceneId, compareGroup }) => {
      try {
        const owned = await verifySceneOwnership(prisma, sceneId, userId);
        if (!owned) return forbidden();

        const assets = await prisma.sceneAssetVersion.findMany({
          where: { sceneId, compareGroup },
          include: { platform: { select: { slug: true, name: true } } },
          orderBy: { createdAt: "asc" },
        });
        return ok(assets);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );
}
