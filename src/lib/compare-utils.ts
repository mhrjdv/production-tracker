// ─── Compare Utilities ──────────────────────────────────────
// Pure functions for version comparison and grouping.

export interface CompareVersion {
    id: string;
    platformKey: string;
    modelName: string | null;
    selected: boolean;
    costEstimateUsd: number | null;
    generationSeconds: number | null;
    compareGroup: string | null;
    promptPackageId: string | null;
    shotId: string | null;
    createdAt: Date;
}

export interface CompareMetrics {
    platformCount: number;
    avgCostUsd: number | null;
    avgGenerationSeconds: number | null;
    totalVersions: number;
}

// ─── Group by compare group ─────────────────────────────────

export function groupByCompareGroup<T extends Pick<CompareVersion, "id" | "compareGroup">>(
    versions: readonly T[],
): Record<string, T[]> {
    const groups: Record<string, T[]> = {};

    for (const version of versions) {
        const key = version.compareGroup ?? `solo_${version.id}`;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(version);
    }

    return groups;
}

// ─── Auto-generate compare group key ────────────────────────

export function autoCompareGroup(
    promptPackageId: string | null,
    shotId: string | null,
    timestamp: Date,
): string {
    const pkgPart = promptPackageId ?? "none";
    const shotPart = shotId ?? "unassigned";
    // Round timestamp to nearest hour for grouping
    const hourTimestamp = new Date(timestamp);
    hourTimestamp.setUTCMinutes(0, 0, 0);
    const timePart = hourTimestamp.toISOString();
    return `${pkgPart}_${shotPart}_${timePart}`;
}

// ─── Find winner in a group ─────────────────────────────────

export function findWinner<T extends Pick<CompareVersion, "id" | "selected">>(
    versions: readonly T[],
): T | null {
    return versions.find((v) => v.selected) ?? null;
}

// ─── Select a new winner ────────────────────────────────────

export function selectWinner<T extends Pick<CompareVersion, "id" | "selected">>(
    versions: readonly T[],
    winnerId: string,
): T[] {
    const found = versions.some((v) => v.id === winnerId);
    if (!found) {
        throw new Error(`Version ${winnerId} not found in compare group`);
    }

    return versions.map((v) => ({
        ...v,
        selected: v.id === winnerId,
    }));
}

// ─── Compute comparison metrics ─────────────────────────────

export function computeCompareMetrics(
    versions: readonly Pick<CompareVersion, "platformKey" | "costEstimateUsd" | "generationSeconds">[],
): CompareMetrics {
    const platforms = new Set(versions.map((v) => v.platformKey));

    const costs = versions
        .map((v) => v.costEstimateUsd)
        .filter((c): c is number => c !== null && c !== undefined);

    const times = versions
        .map((v) => v.generationSeconds)
        .filter((t): t is number => t !== null && t !== undefined);

    return {
        platformCount: platforms.size,
        avgCostUsd: costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : null,
        avgGenerationSeconds: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null,
        totalVersions: versions.length,
    };
}
