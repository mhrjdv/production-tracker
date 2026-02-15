// ─── Rights & Provenance Utilities ──────────────────────────
// Pure functions for rights state derivation and provenance validation.

export type RightsState = "UNKNOWN" | "NON_COMMERCIAL" | "COMMERCIAL_ALLOWED" | "RESTRICTED";
export type CommercialStatus = "allowed" | "not-allowed" | "unknown" | "restricted";
export type ChecklistStatus = "green" | "yellow" | "red";

export interface Provenance {
    platform: string;
    platformPlan?: string;
    modelId?: string;
    captureMethod: string;
    captureTimestamp: string;
    synthIdExpected?: boolean;
    c2paPresent?: boolean;
    visibleWatermark?: boolean;
    [key: string]: unknown;
}

export interface ChecklistItem {
    label: string;
    status: ChecklistStatus;
    detail: string;
}

// ─── Derive commercial status ───────────────────────────────

const RIGHTS_TO_COMMERCIAL: Record<RightsState, CommercialStatus> = {
    COMMERCIAL_ALLOWED: "allowed",
    NON_COMMERCIAL: "not-allowed",
    UNKNOWN: "unknown",
    RESTRICTED: "restricted",
};

export function deriveCommercialStatus(
    rightsState: RightsState,
    _provenance?: Provenance | null,
): CommercialStatus {
    return RIGHTS_TO_COMMERCIAL[rightsState] ?? "unknown";
}

// ─── Compute OK-to-ship checklist ───────────────────────────

export function computeShipChecklist(version: {
    rightsState: RightsState;
    provenance?: Provenance | null;
    platformKey: string;
    platformPlan?: string | null;
}): ChecklistItem[] {
    const items: ChecklistItem[] = [];
    const prov = version.provenance;

    // 1. Source platform identified
    items.push({
        label: "Source platform identified",
        status: version.platformKey ? "green" : "yellow",
        detail: version.platformKey
            ? `Platform: ${version.platformKey}`
            : "Platform not identified",
    });

    // 2. Plan level set
    const planLevel = version.platformPlan ?? prov?.platformPlan;
    items.push({
        label: "User plan level set",
        status: planLevel ? (planLevel === "free" ? "yellow" : "green") : "yellow",
        detail: planLevel
            ? `Plan: ${planLevel}${planLevel === "free" ? " (likely non-commercial)" : ""}`
            : "Plan level not set",
    });

    // 3. Commercial rights
    const commercial = deriveCommercialStatus(version.rightsState, prov);
    items.push({
        label: "Commercial rights",
        status:
            commercial === "allowed"
                ? "green"
                : commercial === "not-allowed" || commercial === "restricted"
                  ? "red"
                  : "yellow",
        detail:
            commercial === "allowed"
                ? "Commercial use permitted"
                : commercial === "not-allowed"
                  ? "Non-commercial only"
                  : commercial === "restricted"
                    ? "Restricted — review platform terms"
                    : "Rights state unknown — verify before shipping",
    });

    // 4. Conditional provenance markers
    if (prov?.synthIdExpected) {
        items.push({
            label: "SynthID watermark expected",
            status: "yellow",
            detail: "SynthID embedded — review before distribution",
        });
    }

    if (prov?.c2paPresent) {
        items.push({
            label: "C2PA content credentials present",
            status: "yellow",
            detail: "C2PA metadata attached — review provenance",
        });
    }

    if (prov?.visibleWatermark) {
        items.push({
            label: "Visible watermark detected",
            status: "yellow",
            detail: "Asset has visible watermark — may need removal",
        });
    }

    return items;
}

// ─── Provenance defaults per platform ───────────────────────

const GOOGLE_PLATFORMS = new Set([
    "gemini",
    "veo",
    "gemini-veo",
    "google-veo",
    "imagen",
    "nano-banana",
]);
const ADOBE_PLATFORMS = new Set(["adobe-firefly", "firefly"]);

export function getProvenanceDefaults(platformKey: string): Partial<Provenance> {
    const key = platformKey.toLowerCase();

    if (GOOGLE_PLATFORMS.has(key)) {
        return { synthIdExpected: true };
    }

    if (ADOBE_PLATFORMS.has(key)) {
        return { c2paPresent: true };
    }

    return {};
}

// ─── Validate provenance shape ──────────────────────────────

export function validateProvenance(
    provenance: unknown,
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) {
        return { valid: false, errors: ["Provenance must be an object"] };
    }

    const prov = provenance as Record<string, unknown>;

    if (!prov.platform || typeof prov.platform !== "string") {
        errors.push("Provenance must include a 'platform' string field");
    }

    if (!prov.captureMethod || typeof prov.captureMethod !== "string") {
        errors.push("Provenance must include a 'captureMethod' string field");
    }

    if (!prov.captureTimestamp || typeof prov.captureTimestamp !== "string") {
        errors.push("Provenance must include a 'captureTimestamp' string field");
    }

    return { valid: errors.length === 0, errors };
}
