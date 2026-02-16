"use server";

import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { AssetStatus, AssetType, Prisma, RightsState } from "@prisma/client";

// ─── Status Transition Validation ────────────────────────────

const VALID_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  [AssetStatus.DRAFT]: [
    AssetStatus.GENERATED,
    AssetStatus.SELECTED,
    AssetStatus.REJECTED,
    AssetStatus.ARCHIVED,
  ],
  [AssetStatus.GENERATED]: [
    AssetStatus.NEEDS_REVIEW,
    AssetStatus.SELECTED,
    AssetStatus.REJECTED,
    AssetStatus.ARCHIVED,
  ],
  [AssetStatus.NEEDS_REVIEW]: [AssetStatus.REVIEWED, AssetStatus.REJECTED],
  [AssetStatus.REVIEWED]: [AssetStatus.APPROVED, AssetStatus.REJECTED],
  [AssetStatus.APPROVED]: [
    AssetStatus.SELECTED,
    AssetStatus.FINAL,
    AssetStatus.REJECTED,
  ],
  [AssetStatus.SELECTED]: [
    AssetStatus.FINAL,
    AssetStatus.REJECTED,
    AssetStatus.ARCHIVED,
    AssetStatus.GENERATED,
  ],
  [AssetStatus.REJECTED]: [AssetStatus.DRAFT, AssetStatus.ARCHIVED],
  [AssetStatus.ARCHIVED]: [AssetStatus.DRAFT, AssetStatus.GENERATED],
  [AssetStatus.FINAL]: [AssetStatus.ARCHIVED],
};

function validateStatusTransition(from: AssetStatus, to: AssetStatus): void {
  if (from === to) return;
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new Error(
      `Invalid status transition: ${from} → ${to}. Allowed: ${allowed?.join(", ") ?? "none"}`,
    );
  }
}

// ─── Private Helpers ─────────────────────────────────────────

interface PromptPackageInput {
  name?: string | null;
  prompt?: string;
  negativePrompt?: string | null;
  constraints?: Record<string, unknown> | null;
  targetAspectRatio?: string | null;
  targetDurationSec?: number | null;
  styleProfile?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown> | null;
}

function toSelectedStatus(
  status: AssetStatus | undefined,
  selected: boolean,
): AssetStatus {
  if (selected) return AssetStatus.SELECTED;
  return status ?? AssetStatus.DRAFT;
}

async function createPromptPackageRecord(
  tx: Prisma.TransactionClient,
  sceneId: string,
  userId: string,
  fallbackPrompt: string,
  fallbackNegativePrompt?: string | null,
  fallbackMetadata?: Record<string, unknown> | null,
  input?: PromptPackageInput | null,
) {
  const prompt = (input?.prompt ?? fallbackPrompt).trim();
  if (!prompt) {
    throw new Error("Prompt package requires a prompt");
  }

  const versionAgg = await tx.promptPackage.aggregate({
    where: { sceneId },
    _max: { versionNumber: true },
  });

  const versionNumber = (versionAgg._max.versionNumber ?? 0) + 1;

  return tx.promptPackage.create({
    data: {
      sceneId,
      versionNumber,
      name: input?.name?.trim() || null,
      prompt,
      negativePrompt: input?.negativePrompt ?? fallbackNegativePrompt ?? null,
      constraints: (input?.constraints ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
      targetAspectRatio: input?.targetAspectRatio?.trim() || null,
      targetDurationSec: input?.targetDurationSec ?? null,
      styleProfile: input?.styleProfile?.trim() || null,
      tags: input?.tags ?? [],
      metadata: (input?.metadata ?? fallbackMetadata ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
      createdById: userId,
    },
    select: { id: true },
  });
}

async function resolvePromptPackageId(
  tx: Prisma.TransactionClient,
  sceneId: string,
  userId: string,
  fallbackPrompt: string,
  fallbackNegativePrompt?: string | null,
  fallbackMetadata?: Record<string, unknown> | null,
  input?: {
    promptPackageId?: string | null;
    promptPackage?: PromptPackageInput | null;
    createPromptPackage?: boolean;
  },
) {
  if (input?.promptPackageId) {
    const existing = await tx.promptPackage.findFirst({
      where: { id: input.promptPackageId, sceneId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error("Prompt package not found for scene");
    }
    return existing.id;
  }

  if (input?.promptPackage || input?.createPromptPackage) {
    const created = await createPromptPackageRecord(
      tx,
      sceneId,
      userId,
      fallbackPrompt,
      fallbackNegativePrompt,
      fallbackMetadata,
      input.promptPackage,
    );
    return created.id;
  }

  return null;
}

// ─── Scene Asset Versioning ─────────────────────────────────

export async function createSceneAssetVersion(
  sceneDbId: string,
  data: {
    platformId?: string | null;
    promptPackageId?: string | null;
    promptPackage?: PromptPackageInput | null;
    createPromptPackage?: boolean;
    platformKey: string;
    platformLabel: string;
    assetType: AssetType;
    prompt: string;
    negativePrompt?: string | null;
    modelName?: string | null;
    sourceUrl?: string | null;
    externalAssetId?: string | null;
    outputUrl?: string | null;
    thumbnailUrl?: string | null;
    metadata?: Record<string, unknown> | null;
    provenance?: Record<string, unknown> | null;
    tags?: string[];
    notes?: string | null;
    status?: AssetStatus;
    rightsState?: RightsState;
    parentVersionId?: string | null;
    costEstimateUsd?: number | null;
    generationSeconds?: number | null;
    queueWaitSeconds?: number | null;
    compareGroup?: string | null;
    selected?: boolean;
    title?: string | null;
  },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const scene = await prisma.scene.findFirst({
    where: {
      id: sceneDbId,
      project: { userId: session.user.id },
    },
    select: {
      id: true,
      sceneId: true,
      projectId: true,
    },
  });

  if (!scene) {
    throw new Error("Scene not found");
  }

  const platformKey = data.platformKey.trim().toLowerCase();
  const platformLabel = data.platformLabel.trim() || platformKey;

  const versionAgg = await prisma.sceneAssetVersion.aggregate({
    where: {
      sceneId: scene.id,
      platformKey,
      assetType: data.assetType,
    },
    _max: { versionNumber: true },
  });

  const versionNumber = (versionAgg._max.versionNumber ?? 0) + 1;
  const isSelected = data.selected || data.status === AssetStatus.SELECTED;
  const normalizedStatus = toSelectedStatus(data.status, isSelected);

  const created = await prisma.$transaction(async (tx) => {
    if (isSelected) {
      await tx.sceneAssetVersion.updateMany({
        where: {
          sceneId: scene.id,
          assetType: data.assetType,
          selected: true,
        },
        data: { selected: false, status: AssetStatus.GENERATED },
      });
    }

    const promptPackageId = await resolvePromptPackageId(
      tx,
      scene.id,
      session.user.id,
      data.prompt,
      data.negativePrompt,
      data.metadata ?? null,
      {
        promptPackageId: data.promptPackageId,
        promptPackage: data.promptPackage,
        createPromptPackage: data.createPromptPackage,
      },
    );

    return tx.sceneAssetVersion.create({
      data: {
        sceneId: scene.id,
        promptPackageId,
        platformId: data.platformId || null,
        parentVersionId: data.parentVersionId || null,
        platformKey,
        platformLabel,
        assetType: data.assetType,
        status: normalizedStatus,
        rightsState: data.rightsState || RightsState.UNKNOWN,
        versionNumber,
        title: data.title || null,
        prompt: data.prompt.trim(),
        negativePrompt: data.negativePrompt || null,
        modelName: data.modelName || null,
        sourceUrl: data.sourceUrl || null,
        externalAssetId: data.externalAssetId || null,
        outputUrl: data.outputUrl || null,
        thumbnailUrl: data.thumbnailUrl || null,
        costEstimateUsd: data.costEstimateUsd ?? null,
        generationSeconds: data.generationSeconds ?? null,
        queueWaitSeconds: data.queueWaitSeconds ?? null,
        compareGroup: data.compareGroup || null,
        metadata: (data.metadata ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        provenance: (data.provenance ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        tags: data.tags ?? [],
        notes: data.notes || null,
        selected: isSelected,
        createdById: session.user.id,
      },
    });
  });

  revalidatePath(`/projects/${scene.projectId}/scenes/${scene.sceneId}`);
  revalidatePath(`/projects/${scene.projectId}/timeline`);
  revalidatePath(`/projects/${scene.projectId}/production`);

  return created;
}

export async function updateSceneAssetVersion(
  assetId: string,
  data: {
    title?: string | null;
    prompt?: string;
    negativePrompt?: string | null;
    modelName?: string | null;
    sourceUrl?: string | null;
    externalAssetId?: string | null;
    outputUrl?: string | null;
    thumbnailUrl?: string | null;
    metadata?: Record<string, unknown> | null;
    provenance?: Record<string, unknown> | null;
    tags?: string[];
    notes?: string | null;
    status?: AssetStatus;
    rightsState?: RightsState;
    promptPackageId?: string | null;
    parentVersionId?: string | null;
    costEstimateUsd?: number | null;
    generationSeconds?: number | null;
    queueWaitSeconds?: number | null;
    compareGroup?: string | null;
    selected?: boolean;
  },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.sceneAssetVersion.findFirst({
    where: {
      id: assetId,
      scene: { project: { userId: session.user.id } },
    },
    select: {
      id: true,
      sceneId: true,
      assetType: true,
      status: true,
      scene: {
        select: {
          projectId: true,
          sceneId: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error("Asset version not found");
  }

  const shouldSelect = data.selected || data.status === AssetStatus.SELECTED;
  const normalizedStatus = toSelectedStatus(data.status, shouldSelect);

  // Validate status transition if status is changing
  if (normalizedStatus !== existing.status) {
    validateStatusTransition(existing.status, normalizedStatus);
  }

  await prisma.$transaction(async (tx) => {
    if (shouldSelect) {
      await tx.sceneAssetVersion.updateMany({
        where: {
          sceneId: existing.sceneId,
          assetType: existing.assetType,
          selected: true,
        },
        data: { selected: false, status: AssetStatus.GENERATED },
      });
    }

    let resolvedPromptPackageId: string | null | undefined = undefined;
    if (data.promptPackageId !== undefined) {
      if (!data.promptPackageId) {
        resolvedPromptPackageId = null;
      } else {
        const promptPackage = await tx.promptPackage.findFirst({
          where: {
            id: data.promptPackageId,
            sceneId: existing.sceneId,
          },
          select: { id: true },
        });
        if (!promptPackage) {
          throw new Error("Prompt package not found for scene");
        }
        resolvedPromptPackageId = promptPackage.id;
      }
    }

    await tx.sceneAssetVersion.update({
      where: { id: assetId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.prompt !== undefined && { prompt: data.prompt.trim() }),
        ...(data.negativePrompt !== undefined && {
          negativePrompt: data.negativePrompt,
        }),
        ...(data.modelName !== undefined && { modelName: data.modelName }),
        ...(data.sourceUrl !== undefined && { sourceUrl: data.sourceUrl }),
        ...(data.externalAssetId !== undefined && {
          externalAssetId: data.externalAssetId,
        }),
        ...(data.outputUrl !== undefined && { outputUrl: data.outputUrl }),
        ...(data.thumbnailUrl !== undefined && {
          thumbnailUrl: data.thumbnailUrl,
        }),
        ...(data.metadata !== undefined && {
          metadata: data.metadata as Prisma.InputJsonValue,
        }),
        ...(data.provenance !== undefined && {
          provenance: data.provenance as Prisma.InputJsonValue,
        }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...((data.status !== undefined || shouldSelect) && {
          status: normalizedStatus,
        }),
        ...(data.rightsState !== undefined && {
          rightsState: data.rightsState,
        }),
        ...(resolvedPromptPackageId !== undefined && {
          promptPackageId: resolvedPromptPackageId,
        }),
        ...(data.parentVersionId !== undefined && {
          parentVersionId: data.parentVersionId,
        }),
        ...(data.costEstimateUsd !== undefined && {
          costEstimateUsd: data.costEstimateUsd,
        }),
        ...(data.generationSeconds !== undefined && {
          generationSeconds: data.generationSeconds,
        }),
        ...(data.queueWaitSeconds !== undefined && {
          queueWaitSeconds: data.queueWaitSeconds,
        }),
        ...(data.compareGroup !== undefined && {
          compareGroup: data.compareGroup,
        }),
        ...(data.selected !== undefined && { selected: data.selected }),
      },
    });
  });

  revalidatePath(
    `/projects/${existing.scene.projectId}/scenes/${existing.scene.sceneId}`,
  );
  revalidatePath(`/projects/${existing.scene.projectId}/timeline`);
  revalidatePath(`/projects/${existing.scene.projectId}/production`);
}

export async function deleteSceneAssetVersion(assetId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.sceneAssetVersion.findFirst({
    where: {
      id: assetId,
      scene: { project: { userId: session.user.id } },
    },
    select: {
      id: true,
      scene: {
        select: {
          projectId: true,
          sceneId: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error("Asset version not found");
  }

  await prisma.sceneAssetVersion.delete({
    where: { id: existing.id },
  });

  revalidatePath(
    `/projects/${existing.scene.projectId}/scenes/${existing.scene.sceneId}`,
  );
  revalidatePath(`/projects/${existing.scene.projectId}/timeline`);
  revalidatePath(`/projects/${existing.scene.projectId}/production`);
}

export async function createSceneAssetFanout(
  sceneDbId: string,
  data: {
    platformIds: string[];
    assetType: AssetType;
    prompt: string;
    negativePrompt?: string | null;
    modelName?: string | null;
    sourceUrl?: string | null;
    outputUrl?: string | null;
    thumbnailUrl?: string | null;
    externalAssetId?: string | null;
    metadata?: Record<string, unknown> | null;
    provenance?: Record<string, unknown> | null;
    tags?: string[];
    notes?: string | null;
    title?: string | null;
    status?: AssetStatus;
    selected?: boolean;
    rightsState?: RightsState;
    promptPackageId?: string | null;
    promptPackage?: PromptPackageInput | null;
    createPromptPackage?: boolean;
    parentVersionId?: string | null;
    costEstimateUsd?: number | null;
    generationSeconds?: number | null;
    queueWaitSeconds?: number | null;
    compareGroup?: string | null;
  },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const scene = await prisma.scene.findFirst({
    where: {
      id: sceneDbId,
      project: { userId: session.user.id },
    },
    select: {
      id: true,
      sceneId: true,
      projectId: true,
    },
  });

  if (!scene) {
    throw new Error("Scene not found");
  }

  const platformIds = [
    ...new Set(data.platformIds.map((id) => id.trim()).filter(Boolean)),
  ];
  if (platformIds.length === 0) {
    throw new Error("Select at least one platform");
  }

  const selectedPlatforms = await prisma.aiPlatform.findMany({
    where: { id: { in: platformIds } },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  if (selectedPlatforms.length === 0) {
    throw new Error("No valid platforms selected");
  }

  if (!data.prompt.trim()) {
    throw new Error("Prompt is required");
  }

  const compareGroup =
    data.compareGroup ??
    (selectedPlatforms.length > 1
      ? `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      : null);

  const shouldSelectOne =
    selectedPlatforms.length === 1 &&
    (data.selected || data.status === AssetStatus.SELECTED);
  const normalizedStatus = shouldSelectOne
    ? AssetStatus.SELECTED
    : data.status === AssetStatus.SELECTED
      ? AssetStatus.GENERATED
      : (data.status ?? AssetStatus.DRAFT);

  const created = await prisma.$transaction(async (tx) => {
    const promptPackageId = await resolvePromptPackageId(
      tx,
      scene.id,
      session.user.id,
      data.prompt,
      data.negativePrompt,
      data.metadata ?? null,
      {
        promptPackageId: data.promptPackageId,
        promptPackage: data.promptPackage,
        createPromptPackage: data.createPromptPackage ?? true,
      },
    );

    if (shouldSelectOne) {
      await tx.sceneAssetVersion.updateMany({
        where: {
          sceneId: scene.id,
          assetType: data.assetType,
          selected: true,
        },
        data: { selected: false, status: AssetStatus.GENERATED },
      });
    }

    const versionRows = await tx.sceneAssetVersion.groupBy({
      by: ["platformKey"],
      where: {
        sceneId: scene.id,
        assetType: data.assetType,
        platformKey: { in: selectedPlatforms.map((platform) => platform.slug) },
      },
      _max: { versionNumber: true },
    });

    const versionByPlatform = new Map(
      versionRows.map((row) => [row.platformKey, row._max.versionNumber ?? 0]),
    );

    const items = [];
    for (const platform of selectedPlatforms) {
      const versionNumber = (versionByPlatform.get(platform.slug) ?? 0) + 1;
      versionByPlatform.set(platform.slug, versionNumber);

      const createdAsset = await tx.sceneAssetVersion.create({
        data: {
          sceneId: scene.id,
          promptPackageId,
          platformId: platform.id,
          parentVersionId: data.parentVersionId || null,
          platformKey: platform.slug,
          platformLabel: platform.name,
          assetType: data.assetType,
          status: normalizedStatus,
          rightsState: data.rightsState || RightsState.UNKNOWN,
          versionNumber,
          title: data.title || null,
          prompt: data.prompt.trim(),
          negativePrompt: data.negativePrompt || null,
          modelName: data.modelName || null,
          sourceUrl: data.sourceUrl || null,
          externalAssetId: data.externalAssetId || null,
          outputUrl: data.outputUrl || null,
          thumbnailUrl: data.thumbnailUrl || null,
          costEstimateUsd: data.costEstimateUsd ?? null,
          generationSeconds: data.generationSeconds ?? null,
          queueWaitSeconds: data.queueWaitSeconds ?? null,
          compareGroup,
          metadata: (data.metadata ?? undefined) as
            | Prisma.InputJsonValue
            | undefined,
          provenance: (data.provenance ?? undefined) as
            | Prisma.InputJsonValue
            | undefined,
          tags: data.tags ?? [],
          notes: data.notes || null,
          selected: shouldSelectOne,
          createdById: session.user.id,
        },
        select: {
          id: true,
          platformKey: true,
          platformLabel: true,
          versionNumber: true,
          status: true,
          assetType: true,
        },
      });
      items.push(createdAsset);
    }

    return {
      promptPackageId,
      compareGroup,
      items,
    };
  });

  revalidatePath(`/projects/${scene.projectId}/scenes/${scene.sceneId}`);
  revalidatePath(`/projects/${scene.projectId}/timeline`);
  revalidatePath(`/projects/${scene.projectId}/production`);

  return created;
}
