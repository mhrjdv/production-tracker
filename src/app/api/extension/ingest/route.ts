import { NextRequest, NextResponse } from "next/server";
import { AssetStatus, Prisma, RightsState } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  authenticateExtensionRequest,
  getExtensionCorsHeaders,
} from "@/lib/extension-auth";
import { prisma } from "@/lib/db";
import {
  ingestSchemaV2,
  buildIngestCompareGroup,
} from "@/lib/extension-ingest-schema";

const SAFE_ERROR_MESSAGES = new Set([
  "Prompt package not found for scene",
  "Shot not found for scene",
  "Unauthorized",
  "Scene not found",
  "Project not found",
]);

function sanitizeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (SAFE_ERROR_MESSAGES.has(message)) return message;
  console.error("[ingest]", error);
  return "Ingestion failed. Please check your payload and try again.";
}

function toSelectedStatus(
  status: AssetStatus | undefined,
  selected: boolean,
): AssetStatus {
  if (selected) return AssetStatus.SELECTED;
  return status ?? AssetStatus.DRAFT;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getExtensionCorsHeaders(),
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateExtensionRequest(request);

  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: getExtensionCorsHeaders() },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = ingestSchemaV2.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400, headers: getExtensionCorsHeaders() },
    );
  }

  const payload = parsed.data;

  const project = await prisma.project.findFirst({
    where: {
      id: payload.projectId,
      userId: auth.userId,
    },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404, headers: getExtensionCorsHeaders() },
    );
  }

  const scene = await prisma.scene.findUnique({
    where: {
      projectId_sceneId: {
        projectId: project.id,
        sceneId: payload.sceneId.toUpperCase(),
      },
    },
    select: {
      id: true,
      sceneId: true,
      projectId: true,
    },
  });

  if (!scene) {
    return NextResponse.json(
      { error: "Scene not found" },
      { status: 404, headers: getExtensionCorsHeaders() },
    );
  }

  const platformKey = payload.platformKey.trim().toLowerCase();
  const platform = payload.platformId
    ? await prisma.aiPlatform.findUnique({
        where: { id: payload.platformId },
        select: { id: true, slug: true, name: true },
      })
    : await prisma.aiPlatform.findUnique({
        where: { slug: platformKey },
        select: { id: true, slug: true, name: true },
      });

  // Validate shot belongs to scene if shotId is provided
  let shotId: string | null = null;
  if (payload.shotId) {
    const shot = await prisma.shot.findFirst({
      where: { id: payload.shotId, sceneId: scene.id },
      select: { id: true },
    });
    if (!shot) {
      return NextResponse.json(
        { error: "Shot not found for scene" },
        { status: 404, headers: getExtensionCorsHeaders() },
      );
    }
    shotId = shot.id;
  }

  // Version numbers are scoped to (scene, platformKey, assetType) to match
  // the unique constraint — do NOT filter by shotId here.
  const versionAgg = await prisma.sceneAssetVersion.aggregate({
    where: {
      sceneId: scene.id,
      platformKey,
      assetType: payload.assetType,
    },
    _max: { versionNumber: true },
  });

  const versionNumber = (versionAgg._max.versionNumber ?? 0) + 1;
  const isSelected =
    payload.selected || payload.status === AssetStatus.SELECTED;
  const normalizedStatus = toSelectedStatus(payload.status, isSelected);

  try {
    const created = await prisma.$transaction(async (tx) => {
      let promptPackageId: string | null = null;
      if (payload.promptPackageId) {
        const existingPromptPackage = await tx.promptPackage.findFirst({
          where: {
            id: payload.promptPackageId,
            sceneId: scene.id,
          },
          select: { id: true },
        });
        if (!existingPromptPackage) {
          throw new Error("Prompt package not found for scene");
        }
        promptPackageId = existingPromptPackage.id;
      } else if (payload.createPromptPackage || payload.promptPackage) {
        const packageVersionAgg = await tx.promptPackage.aggregate({
          where: { sceneId: scene.id },
          _max: { versionNumber: true },
        });
        const packageVersion = (packageVersionAgg._max.versionNumber ?? 0) + 1;
        const createdPromptPackage = await tx.promptPackage.create({
          data: {
            sceneId: scene.id,
            shotId,
            versionNumber: packageVersion,
            name: payload.promptPackage?.name?.trim() || null,
            prompt: (payload.promptPackage?.prompt || payload.prompt).trim(),
            negativePrompt:
              payload.promptPackage?.negativePrompt ||
              payload.negativePrompt ||
              null,
            constraints: (payload.promptPackage?.constraints ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
            targetAspectRatio: payload.promptPackage?.targetAspectRatio || null,
            targetDurationSec: payload.promptPackage?.targetDurationSec ?? null,
            styleProfile: payload.promptPackage?.styleProfile || null,
            tags: payload.promptPackage?.tags || payload.tags || [],
            metadata: (payload.promptPackage?.metadata ??
              payload.metadata ??
              undefined) as Prisma.InputJsonValue | undefined,
            createdById: auth.userId,
          },
          select: { id: true },
        });
        promptPackageId = createdPromptPackage.id;
      }

      if (isSelected) {
        await tx.sceneAssetVersion.updateMany({
          where: {
            sceneId: scene.id,
            assetType: payload.assetType,
            selected: true,
            ...(shotId ? { shotId } : {}),
          },
          data: {
            selected: false,
            status: AssetStatus.GENERATED,
          },
        });
      }

      const autoCompareGroup =
        payload.compareGroup ||
        buildIngestCompareGroup(promptPackageId, shotId, new Date());

      return tx.sceneAssetVersion.create({
        data: {
          sceneId: scene.id,
          shotId,
          promptPackageId,
          platformId: platform?.id || null,
          parentVersionId: payload.parentVersionId || null,
          platformKey,
          platformLabel:
            payload.platformLabel?.trim() || platform?.name || platformKey,
          assetType: payload.assetType,
          status: normalizedStatus,
          rightsState: payload.rightsState || RightsState.UNKNOWN,
          versionNumber,
          title: payload.title || null,
          prompt: payload.prompt.trim(),
          negativePrompt: payload.negativePrompt || null,
          modelName: payload.modelName || null,
          sourceUrl: payload.sourceUrl || null,
          externalAssetId: payload.externalAssetId || null,
          outputUrl: payload.outputUrl || null,
          thumbnailUrl: payload.thumbnailUrl || null,
          costEstimateUsd: payload.costEstimateUsd ?? null,
          generationSeconds: payload.generationSeconds ?? null,
          queueWaitSeconds: payload.queueWaitSeconds ?? null,
          compareGroup: autoCompareGroup,
          metadata: (payload.metadata ?? undefined) as
            | Prisma.InputJsonValue
            | undefined,
          provenance: (payload.provenance ?? undefined) as
            | Prisma.InputJsonValue
            | undefined,
          tags: payload.tags ?? [],
          notes: payload.notes || null,
          selected: isSelected,
          createdById: auth.userId,
        },
        select: {
          id: true,
          versionNumber: true,
          platformKey: true,
          platformLabel: true,
          assetType: true,
          status: true,
          rightsState: true,
          shotId: true,
          createdAt: true,
        },
      });
    });

    // Bust Next.js cache so dashboard pages show the new asset
    revalidatePath(`/projects/${project.id}/scenes/${scene.sceneId}`);
    revalidatePath(`/projects/${project.id}/gallery`);
    revalidatePath(`/projects/${project.id}/production`);
    revalidatePath(`/projects/${project.id}/timeline`);

    return NextResponse.json(
      {
        asset: created,
        ok: true,
      },
      { headers: getExtensionCorsHeaders() },
    );
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(error) },
      { status: 400, headers: getExtensionCorsHeaders() },
    );
  }
}
