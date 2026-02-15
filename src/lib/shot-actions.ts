// ─── Shot CRUD ─────────────────────────────────────────────
// Pure functions with dependency injection for testability.

// ─── Types ──────────────────────────────────────────────────

export interface Shot {
    id: string;
    shotCode: string;
    sceneId: string;
    description: string;
    angle: string | null;
    framing: string | null;
    movement: string | null;
    lensNotes: string | null;
    references: unknown;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateShotInput {
    description: string;
    angle?: string;
    framing?: string;
    movement?: string;
    lensNotes?: string;
    references?: Record<string, unknown>;
}

export interface UpdateShotInput {
    description?: string;
    angle?: string | null;
    framing?: string | null;
    movement?: string | null;
    lensNotes?: string | null;
    references?: Record<string, unknown> | null;
}

export interface ShotStore {
    findMany: (sceneId: string) => Promise<Shot[]>;
    findUnique: (id: string) => Promise<Shot | null>;
    create: (data: Record<string, unknown>) => Promise<Shot>;
    update: (id: string, data: Record<string, unknown>) => Promise<Shot>;
    delete: (id: string) => Promise<void>;
    updateMany: (
        sceneId: string,
        updates: { id: string; sortOrder: number }[],
    ) => Promise<void>;
    nullifyShotOnAssets: (shotId: string) => Promise<void>;
}

// ─── Helpers ────────────────────────────────────────────────

export function nextShotCode(currentMax: string | null): string {
    if (!currentMax) return "SH001";
    const num = parseInt(currentMax.replace(/^SH/i, ""), 10);
    return `SH${String(num + 1).padStart(3, "0")}`;
}

// ─── Actions ────────────────────────────────────────────────

export async function createShot(
    sceneId: string,
    input: CreateShotInput,
    store: ShotStore,
): Promise<Shot> {
    if (!input.description?.trim()) {
        throw new Error("Description is required");
    }

    const existingShots = await store.findMany(sceneId);

    const maxCode =
        existingShots.length > 0
            ? existingShots.reduce(
                  (max, shot) => (shot.shotCode > max ? shot.shotCode : max),
                  existingShots[0]!.shotCode,
              )
            : null;

    const shotCode = nextShotCode(maxCode);
    const sortOrder = existingShots.length;

    return store.create({
        shotCode,
        sceneId,
        description: input.description.trim(),
        angle: input.angle?.trim() || null,
        framing: input.framing?.trim() || null,
        movement: input.movement?.trim() || null,
        lensNotes: input.lensNotes?.trim() || null,
        references: input.references || null,
        sortOrder,
    });
}

export async function updateShot(
    shotId: string,
    input: UpdateShotInput,
    store: ShotStore,
): Promise<Shot> {
    const data: Record<string, unknown> = {};
    if (input.description !== undefined) data.description = input.description.trim();
    if (input.angle !== undefined) data.angle = input.angle?.trim() || null;
    if (input.framing !== undefined) data.framing = input.framing?.trim() || null;
    if (input.movement !== undefined) data.movement = input.movement?.trim() || null;
    if (input.lensNotes !== undefined) data.lensNotes = input.lensNotes?.trim() || null;
    if (input.references !== undefined) data.references = input.references;

    return store.update(shotId, data);
}

export async function deleteShot(
    shotId: string,
    store: ShotStore,
): Promise<void> {
    await store.nullifyShotOnAssets(shotId);
    await store.delete(shotId);
}

export async function reorderShots(
    sceneId: string,
    orderedIds: string[],
    store: ShotStore,
): Promise<void> {
    const updates = orderedIds.map((id, index) => ({ id, sortOrder: index }));
    await store.updateMany(sceneId, updates);
}

export async function getShotsForScene(
    sceneId: string,
    store: ShotStore,
): Promise<Shot[]> {
    return store.findMany(sceneId);
}
