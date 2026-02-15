import { describe, expect, it } from "vitest";
import {
    adaptPromptForPlatform,
    generateRunCards,
    getDeepLink,
    getPlatformConstraints,
    type PromptPackageInput,
    type PlatformInput,
    type RunCard,
    type PlatformConstraints,
} from "@/lib/fanout-utils";

// ---------------------------------------------------------------------------
// adaptPromptForPlatform
// ---------------------------------------------------------------------------
describe("adaptPromptForPlatform", () => {
    it("truncates prompt to platform max length", () => {
        const longPrompt = "a".repeat(1500);
        const constraints: PlatformConstraints = { maxPromptLength: 1000 };

        const result = adaptPromptForPlatform(longPrompt, "openai-sora", constraints);

        expect(result.length).toBeLessThanOrEqual(1000);
        expect(result).toBe("a".repeat(1000));
    });

    it("appends aspect ratio constraint for platforms that need it", () => {
        const prompt = "cinematic dolly shot of a forest";
        const constraints: PlatformConstraints = {
            supportedAspectRatios: ["16:9", "9:16", "1:1"],
        };

        const result = adaptPromptForPlatform(prompt, "openai-sora", constraints, {
            targetAspectRatio: "16:9",
        });

        expect(result).toContain("16:9");
        expect(result).toContain("cinematic dolly shot of a forest");
    });

    it("returns prompt unchanged for platforms with no constraints", () => {
        const prompt = "a serene mountain landscape at golden hour";
        const constraints: PlatformConstraints = {};

        const result = adaptPromptForPlatform(prompt, "unknown-platform", constraints);

        expect(result).toBe(prompt);
    });

    it("strips negative prompt for platforms that don't support it", () => {
        const prompt = "beautiful sunset --no blurry, distorted";
        const constraints: PlatformConstraints = { supportsNegativePrompt: false };

        const result = adaptPromptForPlatform(prompt, "freepik-pikaso", constraints);

        expect(result).not.toContain("--no");
        expect(result).not.toContain("blurry, distorted");
    });
});

// ---------------------------------------------------------------------------
// generateRunCards
// ---------------------------------------------------------------------------
describe("generateRunCards", () => {
    const promptPackage: PromptPackageInput = {
        prompt: "a cinematic dolly shot through a dense forest",
        negativePrompt: "blurry, low quality",
        targetAspectRatio: "16:9",
        targetDurationSec: 5,
        styleProfile: "cinematic",
    };

    const platforms: PlatformInput[] = [
        { slug: "openai-sora", name: "Sora", homepageUrl: "https://sora.com" },
        { slug: "freepik-pikaso", name: "Freepik Pikaso", homepageUrl: "https://www.freepik.com/pikaso" },
        { slug: "runway", name: "Runway", homepageUrl: "https://app.runwayml.com" },
    ];

    it("creates one run card per platform", () => {
        const cards = generateRunCards(promptPackage, platforms);

        expect(cards).toHaveLength(3);
        const keys = cards.map((c) => c.platformKey);
        expect(keys).toEqual(["openai-sora", "freepik-pikaso", "runway"]);
    });

    it("each run card has adapted prompt, settings checklist, and status NOT_RUN", () => {
        const cards = generateRunCards(promptPackage, platforms);

        for (const card of cards) {
            expect(card.adaptedPrompt).toBeTruthy();
            expect(typeof card.adaptedPrompt).toBe("string");
            expect(Array.isArray(card.settingsChecklist)).toBe(true);
            expect(card.settingsChecklist.length).toBeGreaterThan(0);
            expect(card.status).toBe("NOT_RUN");
        }
    });

    it("includes deep link URL when platform has homepage URL", () => {
        const cards = generateRunCards(promptPackage, platforms);

        const soraCard = cards.find((c) => c.platformKey === "openai-sora");
        expect(soraCard).toBeDefined();
        // Sora is a known deep-link platform, so it should have a deep link
        expect(soraCard!.deepLink).not.toBeNull();
        expect(soraCard!.deepLink).toContain("http");
    });
});

// ---------------------------------------------------------------------------
// getDeepLink
// ---------------------------------------------------------------------------
describe("getDeepLink", () => {
    it("returns null for platforms without known deep link pattern", () => {
        const result = getDeepLink("unknown-platform", "a prompt");

        expect(result).toBeNull();
    });

    it("returns encoded URL for Sora", () => {
        const prompt = "cinematic forest scene";
        const result = getDeepLink("openai-sora", prompt);

        expect(result).not.toBeNull();
        expect(result).toContain("sora");
        expect(result).toContain(encodeURIComponent(prompt));
    });

    it("returns encoded URL for Freepik Pikaso", () => {
        const prompt = "watercolor painting of mountains";
        const result = getDeepLink("freepik-pikaso", prompt);

        expect(result).not.toBeNull();
        expect(result).toContain("freepik");
        expect(result).toContain(encodeURIComponent(prompt));
    });
});

// ---------------------------------------------------------------------------
// getPlatformConstraints
// ---------------------------------------------------------------------------
describe("getPlatformConstraints", () => {
    it("returns maxPromptLength, supportedAspectRatios, supportedDurations for known platforms", () => {
        const sora = getPlatformConstraints("openai-sora");

        expect(sora.maxPromptLength).toBeTypeOf("number");
        expect(sora.maxPromptLength).toBeGreaterThan(0);
        expect(Array.isArray(sora.supportedAspectRatios)).toBe(true);
        expect(sora.supportedAspectRatios!.length).toBeGreaterThan(0);
        expect(Array.isArray(sora.supportedDurations)).toBe(true);
        expect(sora.supportedDurations!.length).toBeGreaterThan(0);
    });

    it("returns empty constraints for unknown platforms", () => {
        const unknown = getPlatformConstraints("totally-unknown-platform");

        expect(unknown.maxPromptLength).toBeUndefined();
        expect(unknown.supportedAspectRatios).toBeUndefined();
        expect(unknown.supportedDurations).toBeUndefined();
        expect(unknown.supportsNegativePrompt).toBeUndefined();
    });
});
