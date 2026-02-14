import { describe, expect, it, vi } from "vitest";
import {
    getUserExtensionPreferences,
    saveUserExtensionPreferences,
    type ExtensionPreferencesStore,
} from "@/lib/extension-preferences-compat";

function makeStore(overrides: Partial<ExtensionPreferencesStore> = {}): ExtensionPreferencesStore {
    return {
        getUserPreferences: async () => null,
        getUserById: async () => null,
        setUserPreferences: async () => {},
        ...overrides,
    };
}

describe("extension-preferences-compat", () => {
    it("returns sanitized preferences when column exists", async () => {
        const store = makeStore({
            getUserPreferences: async () => ({
                extensionPreferences: {
                    lastProjectId: "  proj_1 ",
                    openAiBaseUrl: "https://api.openai.com/v1",
                },
            }),
        });

        const preferences = await getUserExtensionPreferences("u1", store);

        expect(preferences).toEqual({
            lastProjectId: "proj_1",
            openAiBaseUrl: "https://api.openai.com/v1",
        });
    });

    it("returns empty preferences on schema mismatch", async () => {
        const store = makeStore({
            getUserPreferences: async () => {
                throw { code: "P2022" };
            },
        });

        const preferences = await getUserExtensionPreferences("u1", store);

        expect(preferences).toEqual({});
    });

    it("merges and persists preferences when schema is current", async () => {
        const setUserPreferences = vi.fn(async () => {});
        const store = makeStore({
            getUserPreferences: async () => ({
                extensionPreferences: {
                    lastProjectId: "proj_1",
                    lastPlatform: "Runway",
                },
            }),
            setUserPreferences,
        });

        const result = await saveUserExtensionPreferences(
            "u1",
            { lastSceneId: "S001" },
            store
        );

        expect(result).toEqual({
            foundUser: true,
            preferences: {
                lastProjectId: "proj_1",
                lastPlatform: "Runway",
                lastSceneId: "S001",
            },
            persisted: true,
        });
        expect(setUserPreferences).toHaveBeenCalledOnce();
    });

    it("returns not-found when user is missing", async () => {
        const result = await saveUserExtensionPreferences(
            "missing",
            { lastSceneId: "S001" },
            makeStore({
                getUserPreferences: async () => null,
            })
        );

        expect(result).toEqual({
            foundUser: false,
            preferences: {},
            persisted: false,
        });
    });

    it("falls back to no-op persistence on schema mismatch", async () => {
        const setUserPreferences = vi.fn(async () => {});
        const store = makeStore({
            getUserPreferences: async () => {
                throw { code: "P2022" };
            },
            getUserById: async () => ({ id: "u1" }),
            setUserPreferences,
        });

        const result = await saveUserExtensionPreferences(
            "u1",
            { lastPlatform: "Sora" },
            store
        );

        expect(result).toEqual({
            foundUser: true,
            preferences: { lastPlatform: "Sora" },
            persisted: false,
        });
        expect(setUserPreferences).not.toHaveBeenCalled();
    });

    it("rethrows non-schema errors", async () => {
        const store = makeStore({
            getUserPreferences: async () => {
                throw new Error("database unavailable");
            },
        });

        await expect(
            saveUserExtensionPreferences("u1", { lastSceneId: "S001" }, store)
        ).rejects.toThrow("database unavailable");
    });
});
