/**
 * Asset status transition machine.
 * Extracted from src/lib/actions/asset-actions.ts.
 */

export type AssetStatus =
  | "DRAFT"
  | "GENERATED"
  | "NEEDS_REVIEW"
  | "REVIEWED"
  | "APPROVED"
  | "SELECTED"
  | "REJECTED"
  | "ARCHIVED"
  | "FINAL";

const VALID_TRANSITIONS: Record<AssetStatus, readonly AssetStatus[]> = {
  DRAFT: ["GENERATED", "SELECTED", "REJECTED", "ARCHIVED"],
  GENERATED: ["NEEDS_REVIEW", "SELECTED", "REJECTED", "ARCHIVED"],
  NEEDS_REVIEW: ["REVIEWED", "REJECTED"],
  REVIEWED: ["APPROVED", "REJECTED"],
  APPROVED: ["SELECTED", "FINAL", "REJECTED"],
  SELECTED: ["FINAL", "REJECTED", "ARCHIVED", "GENERATED"],
  REJECTED: ["DRAFT", "ARCHIVED"],
  ARCHIVED: ["DRAFT", "GENERATED"],
  FINAL: ["ARCHIVED"],
} as const;

/**
 * Check if a status transition is valid.
 */
export function isValidTransition(
  from: AssetStatus,
  to: AssetStatus,
): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Validate a status transition, throwing if invalid.
 */
export function validateStatusTransition(
  from: AssetStatus,
  to: AssetStatus,
): void {
  if (!isValidTransition(from, to)) {
    throw new Error(
      `Invalid status transition: ${from} → ${to}. Allowed: ${VALID_TRANSITIONS[from]?.join(", ") ?? "none"}`,
    );
  }
}

/**
 * Get all valid next statuses from a given status.
 */
export function getValidTransitions(from: AssetStatus): readonly AssetStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}

/**
 * All possible asset statuses.
 */
export const ALL_STATUSES: readonly AssetStatus[] = Object.keys(
  VALID_TRANSITIONS,
) as AssetStatus[];
