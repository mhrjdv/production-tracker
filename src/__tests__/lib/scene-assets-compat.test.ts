import { describe, expect, it } from "vitest";
import { normalizeSceneAssetRecord } from "@/lib/scene-assets-compat";

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

    it("normalizes full schema records with all fields", () => {
        const normalized = normalizeSceneAssetRecord({
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
        });

        expect(normalized.promptPackageId).toBe("pp1");
        expect(normalized.rightsState).toBe("COMMERCIAL_ALLOWED");
        expect(normalized.costEstimateUsd).toBe(0.45);
        expect(normalized.generationSeconds).toBe(40);
        expect(normalized.queueWaitSeconds).toBe(10);
        expect(normalized.compareGroup).toBe("cmp_1");
        expect(normalized.selected).toBe(true);
    });
});
