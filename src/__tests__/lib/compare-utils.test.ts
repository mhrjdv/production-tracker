import { describe, expect, it } from "vitest";
import {
    autoCompareGroup,
    computeCompareMetrics,
    findWinner,
    groupByCompareGroup,
    selectWinner,
    type CompareVersion,
} from "@/lib/compare-utils";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function makeVersion(overrides: Partial<CompareVersion> = {}): CompareVersion {
    return {
        id: "v1",
        platformKey: "midjourney",
        modelName: null,
        selected: false,
        costEstimateUsd: null,
        generationSeconds: null,
        compareGroup: null,
        promptPackageId: null,
        shotId: null,
        createdAt: new Date("2026-02-14T12:00:00.000Z"),
        ...overrides,
    };
}

/* ------------------------------------------------------------------ */
/*  groupByCompareGroup                                               */
/* ------------------------------------------------------------------ */

describe("groupByCompareGroup", () => {
    it("groups versions with the same compareGroup together", () => {
        const versions: CompareVersion[] = [
            makeVersion({ id: "v1", compareGroup: "cmp_a" }),
            makeVersion({ id: "v2", compareGroup: "cmp_b" }),
            makeVersion({ id: "v3", compareGroup: "cmp_a" }),
        ];

        const groups = groupByCompareGroup(versions);

        expect(Object.keys(groups)).toHaveLength(2);
        expect(groups["cmp_a"]).toHaveLength(2);
        expect(groups["cmp_a"]!.map((v) => v.id)).toEqual(["v1", "v3"]);
        expect(groups["cmp_b"]).toHaveLength(1);
        expect(groups["cmp_b"]![0]!.id).toBe("v2");
    });

    it("puts versions without compareGroup into individual groups", () => {
        const versions: CompareVersion[] = [
            makeVersion({ id: "v1", compareGroup: null }),
            makeVersion({ id: "v2", compareGroup: null }),
        ];

        const groups = groupByCompareGroup(versions);

        // Each null-group version should be in its own group keyed by its id
        expect(Object.keys(groups)).toHaveLength(2);
        for (const key of Object.keys(groups)) {
            expect(groups[key]).toHaveLength(1);
        }
    });

    it("returns empty object for empty input", () => {
        const groups = groupByCompareGroup([]);

        expect(groups).toEqual({});
    });
});

/* ------------------------------------------------------------------ */
/*  autoCompareGroup                                                  */
/* ------------------------------------------------------------------ */

describe("autoCompareGroup", () => {
    it("generates key from promptPackageId + shotId + timestamp window (rounded to nearest hour)", () => {
        const t1 = new Date("2026-02-14T12:15:00.000Z");
        const t2 = new Date("2026-02-14T12:45:00.000Z");

        const key1 = autoCompareGroup("pp1", "shot1", t1);
        const key2 = autoCompareGroup("pp1", "shot1", t2);

        // Both timestamps round to the same hour, so keys should match
        expect(key1).toBe(key2);
        expect(key1).toContain("pp1");
        expect(key1).toContain("shot1");
    });

    it("uses 'none' for null promptPackageId", () => {
        const key = autoCompareGroup(null, "shot1", new Date("2026-02-14T12:00:00.000Z"));

        expect(key).toContain("none");
        expect(key).not.toContain("null");
    });

    it("uses 'unassigned' for null shotId", () => {
        const key = autoCompareGroup("pp1", null, new Date("2026-02-14T12:00:00.000Z"));

        expect(key).toContain("unassigned");
        expect(key).not.toContain("null");
    });
});

/* ------------------------------------------------------------------ */
/*  findWinner                                                        */
/* ------------------------------------------------------------------ */

describe("findWinner", () => {
    it("returns the version with selected=true", () => {
        const versions: CompareVersion[] = [
            makeVersion({ id: "v1", selected: false }),
            makeVersion({ id: "v2", selected: true }),
            makeVersion({ id: "v3", selected: false }),
        ];

        const winner = findWinner(versions);

        expect(winner).not.toBeNull();
        expect(winner!.id).toBe("v2");
    });

    it("returns null if no winner", () => {
        const versions: CompareVersion[] = [
            makeVersion({ id: "v1", selected: false }),
            makeVersion({ id: "v2", selected: false }),
        ];

        const winner = findWinner(versions);

        expect(winner).toBeNull();
    });
});

/* ------------------------------------------------------------------ */
/*  selectWinner                                                      */
/* ------------------------------------------------------------------ */

describe("selectWinner", () => {
    it("marks winnerId as selected, deselects others", () => {
        const versions: CompareVersion[] = [
            makeVersion({ id: "v1", selected: false }),
            makeVersion({ id: "v2", selected: false }),
            makeVersion({ id: "v3", selected: false }),
        ];

        const updated = selectWinner(versions, "v2");

        expect(updated.find((v) => v.id === "v2")!.selected).toBe(true);
        expect(updated.find((v) => v.id === "v1")!.selected).toBe(false);
        expect(updated.find((v) => v.id === "v3")!.selected).toBe(false);
    });

    it("throws if winnerId not found in versions", () => {
        const versions: CompareVersion[] = [
            makeVersion({ id: "v1", selected: false }),
        ];

        expect(() => selectWinner(versions, "nonexistent")).toThrow();
    });

    it("handles deselecting current winner when selecting new one", () => {
        const versions: CompareVersion[] = [
            makeVersion({ id: "v1", selected: true }),
            makeVersion({ id: "v2", selected: false }),
        ];

        const updated = selectWinner(versions, "v2");

        expect(updated.find((v) => v.id === "v1")!.selected).toBe(false);
        expect(updated.find((v) => v.id === "v2")!.selected).toBe(true);
    });
});

/* ------------------------------------------------------------------ */
/*  computeCompareMetrics                                             */
/* ------------------------------------------------------------------ */

describe("computeCompareMetrics", () => {
    it("returns platform count, avg cost, avg generation time", () => {
        const versions: CompareVersion[] = [
            makeVersion({
                id: "v1",
                platformKey: "midjourney",
                costEstimateUsd: 0.10,
                generationSeconds: 20,
            }),
            makeVersion({
                id: "v2",
                platformKey: "openai-sora",
                costEstimateUsd: 0.50,
                generationSeconds: 40,
            }),
            makeVersion({
                id: "v3",
                platformKey: "runway",
                costEstimateUsd: 0.30,
                generationSeconds: 30,
            }),
        ];

        const metrics = computeCompareMetrics(versions);

        expect(metrics.platformCount).toBe(3);
        expect(metrics.avgCostUsd).toBeCloseTo(0.30, 5);
        expect(metrics.avgGenerationSeconds).toBeCloseTo(30, 5);
    });

    it("handles null cost/time values gracefully", () => {
        const versions: CompareVersion[] = [
            makeVersion({
                id: "v1",
                platformKey: "midjourney",
                costEstimateUsd: 0.20,
                generationSeconds: null,
            }),
            makeVersion({
                id: "v2",
                platformKey: "runway",
                costEstimateUsd: null,
                generationSeconds: 60,
            }),
            makeVersion({
                id: "v3",
                platformKey: "openai-sora",
                costEstimateUsd: null,
                generationSeconds: null,
            }),
        ];

        const metrics = computeCompareMetrics(versions);

        expect(metrics.platformCount).toBe(3);
        // Only v1 has cost, avg of [0.20] = 0.20
        expect(metrics.avgCostUsd).toBeCloseTo(0.20, 5);
        // Only v2 has generationSeconds, avg of [60] = 60
        expect(metrics.avgGenerationSeconds).toBeCloseTo(60, 5);
    });
});
