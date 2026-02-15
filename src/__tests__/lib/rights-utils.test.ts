import { describe, expect, it } from "vitest";
import {
    deriveCommercialStatus,
    computeShipChecklist,
    getProvenanceDefaults,
    validateProvenance,
    type RightsState,
    type Provenance,
    type ChecklistItem,
} from "@/lib/rights-utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProv(overrides: Partial<Provenance> = {}): Provenance {
    return {
        platform: "midjourney",
        captureMethod: "extension-capture",
        captureTimestamp: "2026-02-14T12:00:00.000Z",
        ...overrides,
    };
}

function makeVersion(overrides: Record<string, unknown> = {}) {
    return {
        rightsState: "COMMERCIAL_ALLOWED" as RightsState,
        platformKey: "midjourney",
        platformPlan: "pro",
        provenance: makeProv(),
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// deriveCommercialStatus
// ---------------------------------------------------------------------------

describe("deriveCommercialStatus", () => {
    it('returns "allowed" for COMMERCIAL_ALLOWED rights state', () => {
        expect(
            deriveCommercialStatus("COMMERCIAL_ALLOWED", makeProv())
        ).toBe("allowed");
    });

    it('returns "not-allowed" for NON_COMMERCIAL', () => {
        expect(
            deriveCommercialStatus("NON_COMMERCIAL", makeProv())
        ).toBe("not-allowed");
    });

    it('returns "unknown" for UNKNOWN', () => {
        expect(
            deriveCommercialStatus("UNKNOWN", makeProv())
        ).toBe("unknown");
    });

    it('returns "restricted" for RESTRICTED', () => {
        expect(
            deriveCommercialStatus("RESTRICTED", makeProv())
        ).toBe("restricted");
    });
});

// ---------------------------------------------------------------------------
// computeShipChecklist
// ---------------------------------------------------------------------------

describe("computeShipChecklist", () => {
    it("returns all-green checklist for COMMERCIAL_ALLOWED + known platform + no watermark issues", () => {
        const items = computeShipChecklist(makeVersion());

        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(item.status).toBe("green");
        }
    });

    it("returns yellow for UNKNOWN rights state", () => {
        const items = computeShipChecklist(
            makeVersion({ rightsState: "UNKNOWN" })
        );

        const rightsItem = items.find((i: ChecklistItem) =>
            i.label.toLowerCase().includes("rights")
        );
        expect(rightsItem).toBeDefined();
        expect(rightsItem!.status).toBe("yellow");
    });

    it("returns red for RESTRICTED", () => {
        const items = computeShipChecklist(
            makeVersion({ rightsState: "RESTRICTED" })
        );

        const rightsItem = items.find((i: ChecklistItem) =>
            i.label.toLowerCase().includes("rights")
        );
        expect(rightsItem).toBeDefined();
        expect(rightsItem!.status).toBe("red");
    });

    it('flags when platformPlan is "free" (likely non-commercial)', () => {
        const items = computeShipChecklist(
            makeVersion({ platformPlan: "free" })
        );

        const planItem = items.find((i: ChecklistItem) =>
            i.label.toLowerCase().includes("plan")
        );
        expect(planItem).toBeDefined();
        expect(["yellow", "red"]).toContain(planItem!.status);
    });

    it("flags when SynthID is expected (Google platforms)", () => {
        const items = computeShipChecklist(
            makeVersion({
                platformKey: "google-veo",
                provenance: makeProv({
                    platform: "google-veo",
                    synthIdExpected: true,
                }),
            })
        );

        const synthItem = items.find((i: ChecklistItem) =>
            i.label.toLowerCase().includes("synth")
        );
        expect(synthItem).toBeDefined();
        expect(synthItem!.status).not.toBe("green");
    });
});

// ---------------------------------------------------------------------------
// getProvenanceDefaults
// ---------------------------------------------------------------------------

describe("getProvenanceDefaults", () => {
    it("returns synthIdExpected=true for gemini platform", () => {
        const defaults = getProvenanceDefaults("gemini");
        expect(defaults.synthIdExpected).toBe(true);
    });

    it("returns synthIdExpected=true for veo platform", () => {
        const defaults = getProvenanceDefaults("google-veo");
        expect(defaults.synthIdExpected).toBe(true);
    });

    it("returns c2paPresent marker for adobe-firefly", () => {
        const defaults = getProvenanceDefaults("adobe-firefly");
        expect(defaults.c2paPresent).toBe(true);
    });

    it("returns empty provenance defaults for unknown platforms", () => {
        const defaults = getProvenanceDefaults("some-unknown-tool");
        expect(defaults).toEqual({});
    });
});

// ---------------------------------------------------------------------------
// validateProvenance
// ---------------------------------------------------------------------------

describe("validateProvenance", () => {
    it("accepts valid provenance with required fields", () => {
        const result = validateProvenance({
            platform: "midjourney",
            captureMethod: "extension-capture",
            captureTimestamp: "2026-02-14T12:00:00.000Z",
        });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it("rejects provenance missing platform field", () => {
        const result = validateProvenance({
            captureMethod: "extension-capture",
            captureTimestamp: "2026-02-14T12:00:00.000Z",
        } as unknown as Provenance);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(
            result.errors.some((e: string) =>
                e.toLowerCase().includes("platform")
            )
        ).toBe(true);
    });

    it("accepts provenance with optional extra fields", () => {
        const result = validateProvenance({
            platform: "runway",
            captureMethod: "manual-upload",
            captureTimestamp: "2026-02-14T15:30:00.000Z",
            modelId: "gen-3",
            customField: "extra-value",
        });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });
});
