import type { AssetType } from "@prisma/client";

// ─── Constants ──────────────────────────────────────────────

export const ASSET_TYPES = [
  "SCRIPT",
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "MUSIC",
  "VOICE",
  "NARRATION",
  "STORYBOARD",
  "OTHER",
] as const;

export const ASSET_STATUSES = [
  "DRAFT",
  "GENERATED",
  "NEEDS_REVIEW",
  "REVIEWED",
  "APPROVED",
  "SELECTED",
  "REJECTED",
  "ARCHIVED",
  "FINAL",
] as const;
export const RIGHTS_STATES = [
  "UNKNOWN",
  "NON_COMMERCIAL",
  "COMMERCIAL_ALLOWED",
  "RESTRICTED",
] as const;

// ─── Type Aliases ───────────────────────────────────────────

export type AssetTypeValue = (typeof ASSET_TYPES)[number];
export type AssetStatusValue = (typeof ASSET_STATUSES)[number];
export type RightsStateValue = (typeof RIGHTS_STATES)[number];

// ─── Interfaces ─────────────────────────────────────────────

export interface SceneAssetItem {
  id: string;
  shotId: string | null;
  promptPackageId: string | null;
  parentVersionId: string | null;
  platformId: string | null;
  platformKey: string;
  platformLabel: string;
  assetType: AssetTypeValue;
  status: AssetStatusValue;
  rightsState: RightsStateValue;
  versionNumber: number;
  title: string | null;
  prompt: string;
  negativePrompt: string | null;
  modelName: string | null;
  sourceUrl: string | null;
  externalAssetId: string | null;
  outputUrl: string | null;
  thumbnailUrl: string | null;
  costEstimateUsd: number | null;
  generationSeconds: number | null;
  queueWaitSeconds: number | null;
  compareGroup: string | null;
  metadata: Record<string, unknown> | null;
  provenance: Record<string, unknown> | null;
  tags: string[];
  notes: string | null;
  selected: boolean;
  createdAt: string;
  createdByName: string | null;
}

export interface PlatformItem {
  id: string;
  slug: string;
  name: string;
  provider: string | null;
  specialties: string[];
  supportedOutput: AssetType[];
}

export interface PromptPackageItem {
  id: string;
  versionNumber: number;
  name: string | null;
  prompt: string;
  negativePrompt: string | null;
  targetAspectRatio: string | null;
  targetDurationSec: number | null;
  styleProfile: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────

export function parseOptionalNumber(raw: string, label: string): number | null {
  const value = raw.trim();
  if (!value) return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a positive number`);
  }

  return parsed;
}

const URL_PATTERN = /^https?:\/\/.+/i;

export function validateOptionalUrl(raw: string, label: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (!URL_PATTERN.test(value)) {
    throw new Error(
      `${label} must be a valid URL starting with http:// or https://`,
    );
  }

  return value;
}
