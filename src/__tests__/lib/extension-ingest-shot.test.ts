// ============================================================
// TDD Tests for Extension Ingest Schema V2 — Shot-level Support
// Tests written FIRST — implementation at @/lib/extension-ingest-schema follows
// ============================================================

import { describe, expect, it } from "vitest";
import {
    ingestSchemaV2,
    computeVersionScope,
    buildIngestCompareGroup,
} from "@/lib/extension-ingest-schema";

// ─── Minimal valid payload for reuse ────────────────────────

const minimalPayload = {
    projectId: "proj_abc123",
    sceneId: "S001",
    platformKey: "midjourney",
    assetType: "IMAGE" as const,
    prompt: "A hero standing on a cliff at sunset",
};

// ─── ingestSchemaV2 ─────────────────────────────────────────

describe("ingestSchemaV2", () => {
    it("accepts payload with shotId field", () => {
        const result = ingestSchemaV2.safeParse({
            ...minimalPayload,
            shotId: "shot_001",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.shotId).toBe("shot_001");
        }
    });

    it("accepts payload without shotId (backward compat)", () => {
        const result = ingestSchemaV2.safeParse(minimalPayload);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.shotId).toBeUndefined();
        }
    });

    it("validates shotId is a non-empty string when provided", () => {
        const emptyString = ingestSchemaV2.safeParse({
            ...minimalPayload,
            shotId: "",
        });
        expect(emptyString.success).toBe(false);

        const whitespaceOnly = ingestSchemaV2.safeParse({
            ...minimalPayload,
            shotId: "   ",
        });
        // Either reject whitespace-only or trim to empty and reject
        if (whitespaceOnly.success) {
            // If the schema trims, the trimmed value should still be non-empty
            expect(whitespaceOnly.data.shotId!.trim().length).toBeGreaterThan(0);
        }

        const nullValue = ingestSchemaV2.safeParse({
            ...minimalPayload,
            shotId: null,
        });
        expect(nullValue.success).toBe(false);

        const numericValue = ingestSchemaV2.safeParse({
            ...minimalPayload,
            shotId: 42,
        });
        expect(numericValue.success).toBe(false);
    });

    it("accepts full payload with all fields including shotId", () => {
        const fullPayload = {
            projectId: "proj_abc123",
            sceneId: "S001",
            shotId: "shot_wide_001",
            platformId: "plat_mj",
            platformKey: "midjourney",
            platformLabel: "Midjourney v6",
            assetType: "IMAGE" as const,
            prompt: "A hero standing on a cliff at sunset",
            negativePrompt: "blurry, low quality",
            modelName: "midjourney-v6",
            sourceUrl: "https://midjourney.com/jobs/abc123",
            externalAssetId: "mj_abc123",
            outputUrl: "https://cdn.example.com/output.png",
            thumbnailUrl: "https://cdn.example.com/thumb.png",
            metadata: { width: 1920, height: 1080 },
            provenance: { capturedBy: "chrome-extension", version: "1.2.0" },
            tags: ["hero", "sunset", "cliff"],
            notes: "First attempt at hero shot",
            title: "Hero Cliff Shot v1",
            rightsState: "COMMERCIAL_ALLOWED" as const,
            promptPackageId: "pp_xyz",
            createPromptPackage: false,
            promptPackage: {
                name: "Hero Shot Package",
                prompt: "A hero standing on a cliff at sunset",
                negativePrompt: "blurry",
                constraints: { aspectRatio: "16:9" },
                targetAspectRatio: "16:9",
                targetDurationSec: 5,
                styleProfile: "cinematic",
                tags: ["hero"],
                metadata: { source: "manual" },
            },
            parentVersionId: "ver_prev",
            costEstimateUsd: 0.05,
            generationSeconds: 30,
            queueWaitSeconds: 5,
            compareGroup: "cmp_hero_001",
            selected: true,
            status: "SELECTED" as const,
        };

        const result = ingestSchemaV2.safeParse(fullPayload);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.shotId).toBe("shot_wide_001");
            expect(result.data.projectId).toBe("proj_abc123");
            expect(result.data.sceneId).toBe("S001");
            expect(result.data.platformKey).toBe("midjourney");
            expect(result.data.assetType).toBe("IMAGE");
            expect(result.data.prompt).toBe("A hero standing on a cliff at sunset");
            expect(result.data.promptPackageId).toBe("pp_xyz");
            expect(result.data.rightsState).toBe("COMMERCIAL_ALLOWED");
        }
    });

    it("still validates existing required fields", () => {
        const missingProjectId = ingestSchemaV2.safeParse({
            sceneId: "S001",
            platformKey: "midjourney",
            assetType: "IMAGE",
            prompt: "some prompt",
        });
        expect(missingProjectId.success).toBe(false);

        const missingPrompt = ingestSchemaV2.safeParse({
            projectId: "proj_1",
            sceneId: "S001",
            platformKey: "midjourney",
            assetType: "IMAGE",
        });
        expect(missingPrompt.success).toBe(false);

        const invalidAssetType = ingestSchemaV2.safeParse({
            ...minimalPayload,
            assetType: "HOLOGRAM",
        });
        expect(invalidAssetType.success).toBe(false);
    });
});

// ─── computeVersionScope ────────────────────────────────────

describe("computeVersionScope", () => {
    it("includes shotId in scope when provided", () => {
        const scope = computeVersionScope("scene_001", "shot_wide", "midjourney", "IMAGE");

        expect(scope).toContain("shot_wide");
        expect(scope).toContain("scene_001");
        expect(scope).toContain("midjourney");
        expect(scope).toContain("IMAGE");
    });

    it("falls back to sceneId-only scope when shotId is null", () => {
        const scope = computeVersionScope("scene_001", null, "midjourney", "IMAGE");

        expect(scope).toContain("scene_001");
        expect(scope).toContain("midjourney");
        expect(scope).toContain("IMAGE");
        expect(scope).not.toContain("null");
    });

    it("returns consistent key format", () => {
        const scopeA = computeVersionScope("scene_001", "shot_wide", "midjourney", "IMAGE");
        const scopeB = computeVersionScope("scene_001", "shot_wide", "midjourney", "IMAGE");

        expect(scopeA).toBe(scopeB);

        // Different inputs produce different keys
        const scopeC = computeVersionScope("scene_001", "shot_close", "midjourney", "IMAGE");
        expect(scopeA).not.toBe(scopeC);

        const scopeD = computeVersionScope("scene_002", "shot_wide", "midjourney", "IMAGE");
        expect(scopeA).not.toBe(scopeD);
    });

    it("produces different keys for shot-scoped vs scene-only scope", () => {
        const withShot = computeVersionScope("scene_001", "shot_wide", "midjourney", "IMAGE");
        const withoutShot = computeVersionScope("scene_001", null, "midjourney", "IMAGE");

        expect(withShot).not.toBe(withoutShot);
    });
});

// ─── buildIngestCompareGroup ────────────────────────────────

describe("buildIngestCompareGroup", () => {
    it("includes shotId in compare group", () => {
        const group = buildIngestCompareGroup("pp_123", "shot_wide", new Date("2026-02-14T10:30:00Z"));

        expect(group).toContain("shot_wide");
        expect(group).toContain("pp_123");
    });

    it("rounds timestamp to nearest hour", () => {
        const earlyInHour = buildIngestCompareGroup(
            "pp_123",
            "shot_wide",
            new Date("2026-02-14T10:05:00Z")
        );
        const lateInHour = buildIngestCompareGroup(
            "pp_123",
            "shot_wide",
            new Date("2026-02-14T10:55:00Z")
        );

        // Both timestamps within the same hour should produce the same compare group
        expect(earlyInHour).toBe(lateInHour);

        // A timestamp in a different hour should produce a different group
        const differentHour = buildIngestCompareGroup(
            "pp_123",
            "shot_wide",
            new Date("2026-02-14T11:05:00Z")
        );
        expect(earlyInHour).not.toBe(differentHour);
    });

    it("handles null promptPackageId", () => {
        const group = buildIngestCompareGroup(null, "shot_wide", new Date("2026-02-14T10:30:00Z"));

        expect(group).toBeDefined();
        expect(typeof group).toBe("string");
        expect(group.length).toBeGreaterThan(0);
        expect(group).toContain("shot_wide");
        // Should not contain literal "null" string
        expect(group).not.toContain("null");
    });

    it("handles null shotId", () => {
        const group = buildIngestCompareGroup("pp_123", null, new Date("2026-02-14T10:30:00Z"));

        expect(group).toBeDefined();
        expect(typeof group).toBe("string");
        expect(group.length).toBeGreaterThan(0);
        expect(group).toContain("pp_123");
        expect(group).not.toContain("null");
    });

    it("handles both null promptPackageId and null shotId", () => {
        const group = buildIngestCompareGroup(null, null, new Date("2026-02-14T10:30:00Z"));

        expect(group).toBeDefined();
        expect(typeof group).toBe("string");
        expect(group.length).toBeGreaterThan(0);
        expect(group).not.toContain("null");
    });
});
