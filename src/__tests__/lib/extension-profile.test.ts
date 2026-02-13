import { describe, expect, it } from "vitest";
import { mergeExtensionPreferences, sanitizeExtensionPreferencesUpdate } from "@/lib/extension-profile";

describe("extension-profile", () => {
    it("sanitizes and trims string fields", () => {
        const sanitized = sanitizeExtensionPreferencesUpdate({
            lastProjectId: "  project_1  ",
            lastSceneId: "  S010 ",
            lastPlatform: " midjourney ",
            preferredAssetType: "IMAGE",
            preferredStatus: "GENERATED",
            openAiBaseUrl: " https://api.openai.com/v1/ ",
            openAiModel: " gpt-5-mini ",
        });

        expect(sanitized).toEqual({
            lastProjectId: "project_1",
            lastSceneId: "S010",
            lastPlatform: "midjourney",
            preferredAssetType: "IMAGE",
            preferredStatus: "GENERATED",
            openAiBaseUrl: "https://api.openai.com/v1/",
            openAiModel: "gpt-5-mini",
        });
    });

    it("drops empty string values", () => {
        const sanitized = sanitizeExtensionPreferencesUpdate({
            lastProjectId: "   ",
            openAiModel: "",
        });

        expect(sanitized).toEqual({});
    });

    it("merges updates over existing preferences while preserving untouched values", () => {
        const merged = mergeExtensionPreferences(
            {
                lastProjectId: "p1",
                lastSceneId: "S001",
                lastPlatform: "openai-sora",
                preferredAssetType: "VIDEO",
                preferredStatus: "GENERATED",
                openAiBaseUrl: "https://api.openai.com/v1",
                openAiModel: "gpt-4.1-mini",
            },
            {
                lastSceneId: "S002",
                preferredAssetType: "IMAGE",
            }
        );

        expect(merged).toEqual({
            lastProjectId: "p1",
            lastSceneId: "S002",
            lastPlatform: "openai-sora",
            preferredAssetType: "IMAGE",
            preferredStatus: "GENERATED",
            openAiBaseUrl: "https://api.openai.com/v1",
            openAiModel: "gpt-4.1-mini",
        });
    });
});
