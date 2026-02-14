import { describe, expect, it } from "vitest";
import {
    fetchPromptPackagesWithFallback,
    fetchSceneAssetsWithFallback,
    normalizeSceneAssetRecord,
} from "@/lib/scene-assets-compat";

describe("scene-assets-compat", () => {
    it("normalizes legacy records with defaults", () => {
        const normalized = normalizeSceneAssetRecord({
            id: "a1",
            platformKey: "midjourney",
            platformLabel: "Midjourney",
            assetType: "IMAGE",
            status: "GENERATED",
            versionNumber: 1,
            title: null,
            prompt: "hero shot",
            negativePrompt: null,
            modelName: null,
            sourceUrl: null,
            externalAssetId: null,
            outputUrl: null,
            thumbnailUrl: null,
            metadata: null,
            tags: [],
            notes: null,
            selected: false,
            createdAt: new Date("2026-02-13T00:00:00.000Z"),
        });

        expect(normalized.promptPackageId).toBeNull();
        expect(normalized.parentVersionId).toBeNull();
        expect(normalized.rightsState).toBe("UNKNOWN");
        expect(normalized.costEstimateUsd).toBeNull();
        expect(normalized.generationSeconds).toBeNull();
        expect(normalized.queueWaitSeconds).toBeNull();
        expect(normalized.compareGroup).toBeNull();
        expect(normalized.provenance).toBeNull();
    });

    it("falls back to legacy query on schema mismatch", async () => {
        const data = await fetchSceneAssetsWithFallback({
            runFullQuery: async () => {
                throw { code: "P2022" };
            },
            runLegacyQuery: async () => [
                {
                    id: "a1",
                    platformKey: "midjourney",
                    platformLabel: "Midjourney",
                    assetType: "IMAGE",
                    status: "GENERATED",
                    versionNumber: 1,
                    title: null,
                    prompt: "hero shot",
                    negativePrompt: null,
                    modelName: null,
                    sourceUrl: null,
                    externalAssetId: null,
                    outputUrl: null,
                    thumbnailUrl: null,
                    metadata: null,
                    tags: [],
                    notes: null,
                    selected: false,
                    createdAt: new Date("2026-02-13T00:00:00.000Z"),
                },
            ],
        });

        expect(data).toHaveLength(1);
        expect(data[0]?.rightsState).toBe("UNKNOWN");
    });

    it("uses full query when available", async () => {
        const data = await fetchSceneAssetsWithFallback({
            runFullQuery: async () => [
                {
                    id: "a2",
                    promptPackageId: "pp1",
                    parentVersionId: null,
                    platformKey: "openai-sora",
                    platformLabel: "Sora",
                    assetType: "VIDEO",
                    status: "SELECTED",
                    rightsState: "COMMERCIAL_ALLOWED",
                    versionNumber: 2,
                    title: "Shot 2",
                    prompt: "cinematic dolly",
                    negativePrompt: null,
                    modelName: "sora-2",
                    sourceUrl: null,
                    externalAssetId: "job1",
                    outputUrl: null,
                    thumbnailUrl: null,
                    costEstimateUsd: 0.45,
                    generationSeconds: 40,
                    queueWaitSeconds: 10,
                    compareGroup: "cmp_1",
                    metadata: null,
                    provenance: null,
                    tags: [],
                    notes: null,
                    selected: true,
                    createdAt: new Date("2026-02-13T00:00:00.000Z"),
                },
            ],
            runLegacyQuery: async () => {
                throw new Error("should not be called");
            },
        });

        expect(data).toHaveLength(1);
        expect(data[0]?.promptPackageId).toBe("pp1");
        expect(data[0]?.rightsState).toBe("COMMERCIAL_ALLOWED");
    });

    it("returns empty prompt packages on schema mismatch", async () => {
        const packages = await fetchPromptPackagesWithFallback({
            runFullQuery: async () => {
                throw { code: "P2021" };
            },
            runLegacyQuery: async () => [],
        });

        expect(packages).toEqual([]);
    });
});
