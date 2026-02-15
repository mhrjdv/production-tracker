import { z } from "zod";
import { AssetStatus, AssetType, RightsState } from "@prisma/client";

// ─── Ingest Schema V2 (with shotId support) ─────────────────

export const ingestSchemaV2 = z.object({
    projectId: z.string().min(1),
    sceneId: z.string().min(1),
    shotId: z.string().trim().min(1).optional(),
    platformId: z.string().optional(),
    platformKey: z.string().min(1),
    platformLabel: z.string().optional(),
    assetType: z.nativeEnum(AssetType),
    prompt: z.string().min(1),
    negativePrompt: z.string().optional(),
    modelName: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    externalAssetId: z.string().optional(),
    outputUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    provenance: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    title: z.string().optional(),
    rightsState: z.nativeEnum(RightsState).optional(),
    promptPackageId: z.string().optional(),
    createPromptPackage: z.boolean().optional(),
    promptPackage: z
        .object({
            name: z.string().optional(),
            prompt: z.string().optional(),
            negativePrompt: z.string().optional(),
            constraints: z.record(z.string(), z.unknown()).optional(),
            targetAspectRatio: z.string().optional(),
            targetDurationSec: z.number().int().positive().optional(),
            styleProfile: z.string().optional(),
            tags: z.array(z.string()).optional(),
            metadata: z.record(z.string(), z.unknown()).optional(),
        })
        .optional(),
    parentVersionId: z.string().optional(),
    costEstimateUsd: z.number().nonnegative().optional(),
    generationSeconds: z.number().int().nonnegative().optional(),
    queueWaitSeconds: z.number().int().nonnegative().optional(),
    compareGroup: z.string().optional(),
    selected: z.boolean().optional(),
    status: z.nativeEnum(AssetStatus).optional(),
});

export type IngestPayloadV2 = z.infer<typeof ingestSchemaV2>;

// ─── Version scope computation ──────────────────────────────

export function computeVersionScope(
    sceneId: string,
    shotId: string | null | undefined,
    platformKey: string,
    assetType: string
): string {
    const parts = [sceneId];
    if (shotId) parts.push(shotId);
    parts.push(platformKey, assetType);
    return parts.join("_");
}

// ─── Compare group for ingested assets ──────────────────────

export function buildIngestCompareGroup(
    promptPackageId: string | null | undefined,
    shotId: string | null | undefined,
    timestamp: Date
): string {
    const pkgPart = promptPackageId ?? "none";
    const shotPart = shotId ?? "unassigned";
    const hourTimestamp = new Date(timestamp);
    hourTimestamp.setUTCMinutes(0, 0, 0);
    const timePart = hourTimestamp.toISOString();
    return `${pkgPart}_${shotPart}_${timePart}`;
}
