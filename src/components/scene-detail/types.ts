import type { AssetType, RightsState } from "@prisma/client";

export interface SceneDetailData {
  id: string;
  sceneId: string;
  sourceText: string;
  reason: string;
  act: number;
  actTitle: string;
  macroScene: string;
  storyBeat: string;
  narrativePurpose: string | null;
  emotionalTone: string | null;
  setting: Record<string, string> | null;
  camera: Record<string, string> | null;
  actions: string[];
  visualMotifs: string[];
  constraints: string[];
  charactersPresent: string[];
  keyframeUrl: string | null;
  sortOrder: number;
}

export interface ShotItem {
  id: string;
  shotCode: string;
  description: string;
  angle: string | null;
  framing: string | null;
  movement: string | null;
  lensNotes: string | null;
  sortOrder: number;
  _count: { assets: number };
}

export interface AssetItem {
  id: string;
  shotId: string | null;
  promptPackageId: string | null;
  parentVersionId: string | null;
  platformId: string | null;
  platformKey: string;
  platformLabel: string;
  assetType:
    | "SCRIPT"
    | "IMAGE"
    | "VIDEO"
    | "AUDIO"
    | "MUSIC"
    | "VOICE"
    | "NARRATION"
    | "STORYBOARD"
    | "OTHER";
  status:
    | "DRAFT"
    | "GENERATED"
    | "NEEDS_REVIEW"
    | "REVIEWED"
    | "APPROVED"
    | "SELECTED"
    | "REJECTED"
    | "ARCHIVED"
    | "FINAL";
  rightsState: RightsState;
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

export interface CharacterItem {
  id: string;
  name: string;
  role: string;
  portraitUrl: string | null;
}

export interface SceneNavItem {
  sceneId: string;
  storyBeat: string;
}
