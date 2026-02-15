import { describe, expect, it, vi, beforeEach } from "vitest";
import {
    createShot,
    updateShot,
    deleteShot,
    reorderShots,
    getShotsForScene,
    type ShotStore,
    type Shot,
} from "@/lib/shot-actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date("2026-02-14T12:00:00.000Z");

function makeShot(overrides: Partial<Shot> = {}): Shot {
    return {
        id: "shot_1",
        shotCode: "SH001",
        sceneId: "scene_1",
        description: "Wide establishing shot of the city skyline at dusk",
        angle: null,
        framing: null,
        movement: null,
        lensNotes: null,
        references: null,
        sortOrder: 0,
        createdAt: NOW,
        updatedAt: NOW,
        ...overrides,
    };
}

function makeStore(overrides: Partial<ShotStore> = {}): ShotStore {
    return {
        findMany: vi.fn(async () => []),
        findUnique: vi.fn(async () => null),
        create: vi.fn(async (data: any) => makeShot(data)),
        update: vi.fn(async (_id: string, data: any) => makeShot(data)),
        delete: vi.fn(async () => {}),
        updateMany: vi.fn(async () => {}),
        nullifyShotOnAssets: vi.fn(async () => {}),
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// createShot
// ---------------------------------------------------------------------------

describe("createShot", () => {
    it("creates the first shot with code SH001", async () => {
        const create = vi.fn(async (data: any) => makeShot({ ...data, id: "shot_new" }));
        const store = makeStore({
            findMany: vi.fn(async () => []),
            create,
        });

        const result = await createShot(
            "scene_1",
            { description: "Opening wide shot of the canyon" },
            store,
        );

        expect(create).toHaveBeenCalledOnce();
        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({
                shotCode: "SH001",
                sceneId: "scene_1",
                description: "Opening wide shot of the canyon",
                sortOrder: 0,
            }),
        );
        expect(result.shotCode).toBe("SH001");
    });

    it("auto-increments to SH002 when SH001 already exists", async () => {
        const existingShot = makeShot({ shotCode: "SH001", sortOrder: 0 });
        const create = vi.fn(async (data: any) =>
            makeShot({ ...data, id: "shot_2" }),
        );
        const store = makeStore({
            findMany: vi.fn(async () => [existingShot]),
            create,
        });

        const result = await createShot(
            "scene_1",
            { description: "Close-up on the hero's face" },
            store,
        );

        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({
                shotCode: "SH002",
                sortOrder: 1,
            }),
        );
        expect(result.shotCode).toBe("SH002");
    });

    it("validates that description is required", async () => {
        const store = makeStore();

        await expect(
            createShot("scene_1", { description: "" }, store),
        ).rejects.toThrow(/description/i);

        await expect(
            createShot("scene_1", { description: "   " }, store),
        ).rejects.toThrow(/description/i);
    });

    it("returns the created shot", async () => {
        const created = makeShot({
            id: "shot_new",
            shotCode: "SH001",
            description: "Dolly across the rooftop",
            angle: "wide",
            movement: "dolly",
        });
        const store = makeStore({
            findMany: vi.fn(async () => []),
            create: vi.fn(async () => created),
        });

        const result = await createShot(
            "scene_1",
            { description: "Dolly across the rooftop", angle: "wide", movement: "dolly" },
            store,
        );

        expect(result).toEqual(created);
        expect(result.id).toBe("shot_new");
        expect(result.angle).toBe("wide");
        expect(result.movement).toBe("dolly");
    });
});

// ---------------------------------------------------------------------------
// updateShot
// ---------------------------------------------------------------------------

describe("updateShot", () => {
    it("updates description and angle", async () => {
        const update = vi.fn(async (_id: string, data: any) =>
            makeShot({
                id: "shot_1",
                description: data.description,
                angle: data.angle,
            }),
        );
        const store = makeStore({ update });

        const result = await updateShot(
            "shot_1",
            { description: "Revised close-up with rain", angle: "close-up" },
            store,
        );

        expect(update).toHaveBeenCalledOnce();
        expect(update).toHaveBeenCalledWith(
            "shot_1",
            expect.objectContaining({
                description: "Revised close-up with rain",
                angle: "close-up",
            }),
        );
        expect(result.description).toBe("Revised close-up with rain");
        expect(result.angle).toBe("close-up");
    });

    it("performs a partial update, only changing provided fields", async () => {
        const update = vi.fn(async (_id: string, data: any) =>
            makeShot({
                id: "shot_1",
                description: "Original description",
                angle: "wide",
                movement: data.movement,
            }),
        );
        const store = makeStore({ update });

        const result = await updateShot(
            "shot_1",
            { movement: "steadicam" },
            store,
        );

        expect(update).toHaveBeenCalledWith(
            "shot_1",
            expect.objectContaining({ movement: "steadicam" }),
        );
        // Fields not in the update payload should not be explicitly set to undefined
        const updatePayload = update.mock.calls[0]![1];
        expect(updatePayload).not.toHaveProperty("description");
        expect(updatePayload).not.toHaveProperty("angle");
        expect(result.movement).toBe("steadicam");
    });
});

// ---------------------------------------------------------------------------
// deleteShot
// ---------------------------------------------------------------------------

describe("deleteShot", () => {
    it("deletes the shot by id", async () => {
        const deleteFn = vi.fn(async () => {});
        const nullifyShotOnAssets = vi.fn(async () => {});
        const store = makeStore({
            delete: deleteFn,
            nullifyShotOnAssets,
        });

        await deleteShot("shot_1", store);

        expect(deleteFn).toHaveBeenCalledOnce();
        expect(deleteFn).toHaveBeenCalledWith("shot_1");
    });

    it("nullifies shotId on related assets before deleting", async () => {
        const deleteFn = vi.fn(async () => {});
        const nullifyShotOnAssets = vi.fn(async () => {});
        const store = makeStore({
            delete: deleteFn,
            nullifyShotOnAssets,
        });

        await deleteShot("shot_1", store);

        expect(nullifyShotOnAssets).toHaveBeenCalledOnce();
        expect(nullifyShotOnAssets).toHaveBeenCalledWith("shot_1");
        // Nullification must happen before deletion
        const nullifyOrder = nullifyShotOnAssets.mock.invocationCallOrder[0]!;
        const deleteOrder = deleteFn.mock.invocationCallOrder[0]!;
        expect(nullifyOrder).toBeLessThan(deleteOrder);
    });
});

// ---------------------------------------------------------------------------
// reorderShots
// ---------------------------------------------------------------------------

describe("reorderShots", () => {
    it("updates sortOrder for all shots in the provided order", async () => {
        const updateMany = vi.fn(async () => {});
        const store = makeStore({ updateMany });

        const orderedIds = ["shot_3", "shot_1", "shot_2"];
        await reorderShots("scene_1", orderedIds, store);

        expect(updateMany).toHaveBeenCalledWith("scene_1", [
            { id: "shot_3", sortOrder: 0 },
            { id: "shot_1", sortOrder: 1 },
            { id: "shot_2", sortOrder: 2 },
        ]);
    });
});

// ---------------------------------------------------------------------------
// getShotsForScene
// ---------------------------------------------------------------------------

describe("getShotsForScene", () => {
    it("returns shots ordered by sortOrder", async () => {
        const shots = [
            makeShot({ id: "shot_a", shotCode: "SH001", sortOrder: 0 }),
            makeShot({ id: "shot_b", shotCode: "SH002", sortOrder: 1 }),
            makeShot({ id: "shot_c", shotCode: "SH003", sortOrder: 2 }),
        ];
        const store = makeStore({
            findMany: vi.fn(async () => shots),
        });

        const result = await getShotsForScene("scene_1", store);

        expect(result).toHaveLength(3);
        expect(result[0]!.sortOrder).toBe(0);
        expect(result[1]!.sortOrder).toBe(1);
        expect(result[2]!.sortOrder).toBe(2);
        expect(store.findMany).toHaveBeenCalledWith("scene_1");
    });

    it("includes asset count per shot", async () => {
        const shotsWithCounts = [
            { ...makeShot({ id: "shot_a", shotCode: "SH001", sortOrder: 0 }), _count: { assets: 3 } },
            { ...makeShot({ id: "shot_b", shotCode: "SH002", sortOrder: 1 }), _count: { assets: 0 } },
        ];
        const store = makeStore({
            findMany: vi.fn(async () => shotsWithCounts),
        });

        const result = await getShotsForScene("scene_1", store);

        expect(result).toHaveLength(2);
        expect((result[0] as any)._count.assets).toBe(3);
        expect((result[1] as any)._count.assets).toBe(0);
    });
});
