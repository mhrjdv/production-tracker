import type { AssetStatus, AssetType } from "@prisma/client";

export interface SceneAssetFilterState {
    query?: string;
    platformKey?: string;
    assetType?: AssetType | "ALL";
    status?: AssetStatus | "ALL";
    selectedOnly?: boolean;
    tag?: string;
}

export interface SceneAssetFilterableItem {
    id: string;
    title?: string | null;
    prompt: string;
    platformKey: string;
    assetType: AssetType;
    status: AssetStatus;
    selected: boolean;
    tags?: readonly string[];
}

export function normalizeTagList(raw: string): string[] {
    if (!raw.trim()) return [];

    const seen = new Set<string>();
    const tags: string[] = [];

    for (const part of raw.split(",")) {
        const normalized = part.trim().toLowerCase();
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        tags.push(normalized);
    }

    return tags;
}

export function parseMetadataInput(raw: string): Record<string, unknown> | null {
    const input = raw.trim();
    if (!input) return null;

    let parsed: unknown;
    try {
        parsed = JSON.parse(input);
    } catch {
        throw new Error("Metadata must be valid JSON");
    }

    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        throw new Error("Metadata JSON must be an object");
    }

    return parsed as Record<string, unknown>;
}

function includesQuery(asset: SceneAssetFilterableItem, query: string): boolean {
    const q = query.toLowerCase();
    const haystack = [asset.title ?? "", asset.prompt, asset.platformKey, ...(asset.tags ?? [])]
        .join(" ")
        .toLowerCase();
    return haystack.includes(q);
}

export function filterSceneAssets<T extends SceneAssetFilterableItem>(
    assets: readonly T[],
    filters: SceneAssetFilterState
): T[] {
    const query = filters.query?.trim().toLowerCase() || "";
    const platformKey = filters.platformKey?.trim().toLowerCase() || "";
    const tag = filters.tag?.trim().toLowerCase() || "";

    return assets.filter((asset) => {
        if (query && !includesQuery(asset, query)) return false;
        if (platformKey && platformKey !== "all" && asset.platformKey.toLowerCase() !== platformKey) return false;
        if (filters.assetType && filters.assetType !== "ALL" && asset.assetType !== filters.assetType) return false;
        if (filters.status && filters.status !== "ALL" && asset.status !== filters.status) return false;
        if (filters.selectedOnly && !asset.selected) return false;
        if (tag && !(asset.tags ?? []).some((assetTag) => assetTag.toLowerCase() === tag)) return false;
        return true;
    });
}
