import type { AssetStatus, AssetType, RightsState } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isPrismaSchemaMismatchError } from "@/lib/prisma-compat";

export interface SceneAssetCompatRecord {
    id: string;
    promptPackageId: string | null;
    parentVersionId: string | null;
    platformId: string | null;
    platformKey: string;
    platformLabel: string;
    assetType: AssetType;
    status: AssetStatus;
    rightsState: RightsState;
    versionNumber: number;
    title: string | null;
    prompt: string;
    negativePrompt: string | null;
    modelName: string | null;
    sourceUrl: string | null;
    externalAssetId: string | null;
    outputUrl: string | null;
    thumbnailUrl: string | null;
    costEstimateUsd: number | null;
    generationSeconds: number | null;
    queueWaitSeconds: number | null;
    compareGroup: string | null;
    metadata: Record<string, unknown> | null;
    provenance: Record<string, unknown> | null;
    tags: string[];
    notes: string | null;
    selected: boolean;
    createdAt: Date;
}

export interface PromptPackageCompatRecord {
    id: string;
    versionNumber: number;
    name: string | null;
    prompt: string;
    negativePrompt: string | null;
    targetAspectRatio: string | null;
    targetDurationSec: number | null;
    styleProfile: string | null;
    tags: string[];
    metadata: Record<string, unknown> | null;
    createdAt: Date;
}

type QueryRunner = () => Promise<Array<Record<string, unknown>>>;

const FULL_SCENE_ASSET_SELECT = {
    id: true,
    promptPackageId: true,
    parentVersionId: true,
    platformId: true,
    platformKey: true,
    platformLabel: true,
    assetType: true,
    status: true,
    rightsState: true,
    versionNumber: true,
    title: true,
    prompt: true,
    negativePrompt: true,
    modelName: true,
    sourceUrl: true,
    externalAssetId: true,
    outputUrl: true,
    thumbnailUrl: true,
    costEstimateUsd: true,
    generationSeconds: true,
    queueWaitSeconds: true,
    compareGroup: true,
    metadata: true,
    provenance: true,
    tags: true,
    notes: true,
    selected: true,
    createdAt: true,
} as const;

const LEGACY_SCENE_ASSET_SELECT = {
    id: true,
    platformId: true,
    platformKey: true,
    platformLabel: true,
    assetType: true,
    status: true,
    versionNumber: true,
    title: true,
    prompt: true,
    negativePrompt: true,
    modelName: true,
    sourceUrl: true,
    externalAssetId: true,
    outputUrl: true,
    thumbnailUrl: true,
    metadata: true,
    tags: true,
    notes: true,
    selected: true,
    createdAt: true,
} as const;

const FULL_PROMPT_PACKAGE_SELECT = {
    id: true,
    versionNumber: true,
    name: true,
    prompt: true,
    negativePrompt: true,
    targetAspectRatio: true,
    targetDurationSec: true,
    styleProfile: true,
    tags: true,
    metadata: true,
    createdAt: true,
} as const;

export async function fetchSceneAssetsWithFallback(input: {
    runFullQuery: QueryRunner;
    runLegacyQuery: QueryRunner;
}): Promise<SceneAssetCompatRecord[]> {
    try {
        const full = await input.runFullQuery();
        return full.map(normalizeSceneAssetRecord);
    } catch (error) {
        if (!isPrismaSchemaMismatchError(error)) {
            throw error;
        }

        const legacy = await input.runLegacyQuery();
        return legacy.map(normalizeSceneAssetRecord);
    }
}

export async function fetchPromptPackagesWithFallback(input: {
    runFullQuery: QueryRunner;
    runLegacyQuery: QueryRunner;
}): Promise<PromptPackageCompatRecord[]> {
    try {
        const full = await input.runFullQuery();
        return full.map(normalizePromptPackageRecord);
    } catch (error) {
        if (!isPrismaSchemaMismatchError(error)) {
            throw error;
        }
        const fallback = await input.runLegacyQuery();
        return fallback.map(normalizePromptPackageRecord);
    }
}

export function normalizeSceneAssetRecord(
    raw: Record<string, unknown>
): SceneAssetCompatRecord {
    const rawRights = String(raw.rightsState || "UNKNOWN") as RightsState;

    return {
        id: String(raw.id || ""),
        promptPackageId: (raw.promptPackageId as string | null | undefined) ?? null,
        parentVersionId: (raw.parentVersionId as string | null | undefined) ?? null,
        platformId: (raw.platformId as string | null | undefined) ?? null,
        platformKey: String(raw.platformKey || ""),
        platformLabel: String(raw.platformLabel || ""),
        assetType: raw.assetType as AssetType,
        status: raw.status as AssetStatus,
        rightsState: rawRights,
        versionNumber: Number(raw.versionNumber || 0),
        title: (raw.title as string | null | undefined) ?? null,
        prompt: String(raw.prompt || ""),
        negativePrompt: (raw.negativePrompt as string | null | undefined) ?? null,
        modelName: (raw.modelName as string | null | undefined) ?? null,
        sourceUrl: (raw.sourceUrl as string | null | undefined) ?? null,
        externalAssetId: (raw.externalAssetId as string | null | undefined) ?? null,
        outputUrl: (raw.outputUrl as string | null | undefined) ?? null,
        thumbnailUrl: (raw.thumbnailUrl as string | null | undefined) ?? null,
        costEstimateUsd:
            typeof raw.costEstimateUsd === "number" ? raw.costEstimateUsd : null,
        generationSeconds:
            typeof raw.generationSeconds === "number" ? raw.generationSeconds : null,
        queueWaitSeconds:
            typeof raw.queueWaitSeconds === "number" ? raw.queueWaitSeconds : null,
        compareGroup: (raw.compareGroup as string | null | undefined) ?? null,
        metadata: (raw.metadata as Record<string, unknown> | null | undefined) ?? null,
        provenance:
            (raw.provenance as Record<string, unknown> | null | undefined) ?? null,
        tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
        notes: (raw.notes as string | null | undefined) ?? null,
        selected: Boolean(raw.selected),
        createdAt:
            raw.createdAt instanceof Date
                ? raw.createdAt
                : new Date(String(raw.createdAt || new Date().toISOString())),
    };
}

function normalizePromptPackageRecord(
    raw: Record<string, unknown>
): PromptPackageCompatRecord {
    return {
        id: String(raw.id || ""),
        versionNumber: Number(raw.versionNumber || 0),
        name: (raw.name as string | null | undefined) ?? null,
        prompt: String(raw.prompt || ""),
        negativePrompt: (raw.negativePrompt as string | null | undefined) ?? null,
        targetAspectRatio: (raw.targetAspectRatio as string | null | undefined) ?? null,
        targetDurationSec:
            typeof raw.targetDurationSec === "number" ? raw.targetDurationSec : null,
        styleProfile: (raw.styleProfile as string | null | undefined) ?? null,
        tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
        metadata: (raw.metadata as Record<string, unknown> | null | undefined) ?? null,
        createdAt:
            raw.createdAt instanceof Date
                ? raw.createdAt
                : new Date(String(raw.createdAt || new Date().toISOString())),
    };
}

export async function findSceneAssetsBySceneId(sceneId: string) {
    return fetchSceneAssetsWithFallback({
        runFullQuery: () =>
            prisma.sceneAssetVersion.findMany({
                where: { sceneId },
                orderBy: [{ createdAt: "desc" }],
                select: FULL_SCENE_ASSET_SELECT,
            }) as unknown as Promise<Array<Record<string, unknown>>>,
        runLegacyQuery: () =>
            prisma.sceneAssetVersion.findMany({
                where: { sceneId },
                orderBy: [{ createdAt: "desc" }],
                select: LEGACY_SCENE_ASSET_SELECT,
            }) as unknown as Promise<Array<Record<string, unknown>>>,
    });
}

export async function findExtensionSceneAssets(params: {
    sceneId: string;
    assetType?: AssetType;
    limit: number;
}) {
    const { sceneId, assetType, limit } = params;
    return fetchSceneAssetsWithFallback({
        runFullQuery: () =>
            prisma.sceneAssetVersion.findMany({
                where: {
                    sceneId,
                    ...(assetType && { assetType }),
                },
                orderBy: [{ selected: "desc" }, { createdAt: "desc" }],
                take: limit,
                select: FULL_SCENE_ASSET_SELECT,
            }) as unknown as Promise<Array<Record<string, unknown>>>,
        runLegacyQuery: () =>
            prisma.sceneAssetVersion.findMany({
                where: {
                    sceneId,
                    ...(assetType && { assetType }),
                },
                orderBy: [{ selected: "desc" }, { createdAt: "desc" }],
                take: limit,
                select: LEGACY_SCENE_ASSET_SELECT,
            }) as unknown as Promise<Array<Record<string, unknown>>>,
    });
}

export async function findPromptPackagesBySceneId(sceneId: string) {
    return fetchPromptPackagesWithFallback({
        runFullQuery: () =>
            prisma.promptPackage.findMany({
                where: { sceneId },
                orderBy: { versionNumber: "desc" },
                select: FULL_PROMPT_PACKAGE_SELECT,
            }) as unknown as Promise<Array<Record<string, unknown>>>,
        runLegacyQuery: async () => [],
    });
}
