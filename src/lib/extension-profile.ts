import { AssetStatus, AssetType } from "@prisma/client";
import { z } from "zod";

export const extensionPreferencesUpdateSchema = z
    .object({
        lastProjectId: z.string().optional(),
        lastSceneId: z.string().optional(),
        lastPlatform: z.string().optional(),
        preferredAssetType: z.nativeEnum(AssetType).optional(),
        preferredStatus: z.nativeEnum(AssetStatus).optional(),
        openAiBaseUrl: z.string().optional(),
        openAiModel: z.string().optional(),
    })
    .strict();

export type ExtensionPreferences = z.infer<typeof extensionPreferencesUpdateSchema>;

export function sanitizeExtensionPreferencesUpdate(input: unknown): ExtensionPreferences {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return {};
    }

    const source = input as Record<string, unknown>;
    const sanitized: ExtensionPreferences = {};

    const addTrimmed = (key: keyof ExtensionPreferences) => {
        const value = source[key];
        if (typeof value !== "string") return;
        const trimmed = value.trim();
        if (!trimmed) return;
        (sanitized as Record<string, string>)[key] = trimmed;
    };

    addTrimmed("lastProjectId");
    addTrimmed("lastSceneId");
    addTrimmed("lastPlatform");
    addTrimmed("openAiModel");

    const openAiBaseUrl = source.openAiBaseUrl;
    if (typeof openAiBaseUrl === "string") {
        const normalized = openAiBaseUrl.trim();
        if (normalized && /^https?:\/\//i.test(normalized)) {
            sanitized.openAiBaseUrl = normalized;
        }
    }

    if (typeof source.preferredAssetType === "string") {
        const parsedType = z.nativeEnum(AssetType).safeParse(source.preferredAssetType);
        if (parsedType.success) {
            sanitized.preferredAssetType = parsedType.data;
        }
    }

    if (typeof source.preferredStatus === "string") {
        const parsedStatus = z.nativeEnum(AssetStatus).safeParse(source.preferredStatus);
        if (parsedStatus.success) {
            sanitized.preferredStatus = parsedStatus.data;
        }
    }

    return sanitized;
}

export function mergeExtensionPreferences(
    current: unknown,
    update: ExtensionPreferences
): ExtensionPreferences {
    const existing = sanitizeExtensionPreferencesUpdate(current);
    return {
        ...existing,
        ...update,
    };
}
