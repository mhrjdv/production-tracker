import { describe, expect, it } from "vitest";
import { filterSceneAssets, normalizeTagList, parseMetadataInput } from "@/lib/scene-assets-utils";

const baseAssets = [
    {
        id: "a1",
        title: "Hero close-up",
        prompt: "cinematic hero close up with rain",
        platformKey: "midjourney",
        assetType: "IMAGE",
        status: "GENERATED",
        selected: false,
        tags: ["hero", "rain"],
    },
    {
        id: "a2",
        title: "Shot pass",
        prompt: "camera dolly across city street",
        platformKey: "openai-sora",
        assetType: "VIDEO",
        status: "SELECTED",
        selected: true,
        tags: ["city", "dolly"],
    },
    {
        id: "a3",
        title: null,
        prompt: "moody synth soundtrack with pulse bass",
        platformKey: "suno",
        assetType: "MUSIC",
        status: "DRAFT",
        selected: false,
        tags: ["music", "temp"],
    },
] as const;

describe("scene-assets-utils", () => {
    it("normalizes tag input and removes duplicates", () => {
        expect(normalizeTagList(" hero, rain, Hero,  city ")).toEqual([
            "hero",
            "rain",
            "city",
        ]);
    });

    it("parses valid metadata JSON object", () => {
        expect(parseMetadataInput('{ "fps": 24, "duration": 10 }')).toEqual({
            fps: 24,
            duration: 10,
        });
    });

    it("returns null for blank metadata input", () => {
        expect(parseMetadataInput("   ")).toBeNull();
    });

    it("throws for non-object metadata JSON", () => {
        expect(() => parseMetadataInput('["bad"]')).toThrow(
            "Metadata JSON must be an object"
        );
    });

    it("filters assets by platform, status, type, text, tags, and selected-only", () => {
        const filtered = filterSceneAssets(baseAssets, {
            query: "city",
            platformKey: "openai-sora",
            assetType: "VIDEO",
            status: "SELECTED",
            selectedOnly: true,
            tag: "dolly",
        });

        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.id).toBe("a2");
    });
});
