import { z } from "zod";

const AssetTypeEnum = z.enum([
  "SCRIPT",
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "MUSIC",
  "VOICE",
  "NARRATION",
  "STORYBOARD",
  "OTHER",
]);

const AssetStatusEnum = z.enum([
  "DRAFT",
  "GENERATED",
  "NEEDS_REVIEW",
  "REVIEWED",
  "APPROVED",
  "SELECTED",
  "REJECTED",
  "ARCHIVED",
  "FINAL",
]);

const RightsStateEnum = z.enum([
  "UNKNOWN",
  "NON_COMMERCIAL",
  "COMMERCIAL_ALLOWED",
  "RESTRICTED",
]);

export const AssetListSchema = z.object({
  sceneId: z.string().describe("Scene CUID"),
  assetType: AssetTypeEnum.optional().describe("Filter by asset type"),
  status: AssetStatusEnum.optional().describe("Filter by status"),
  shotId: z.string().optional().describe("Filter by shot CUID"),
});

export const AssetGetSchema = z.object({
  assetId: z.string().describe("Asset CUID"),
});

export const AssetCreateSchema = z.object({
  sceneId: z.string().describe("Scene CUID"),
  shotId: z.string().optional().describe("Shot CUID"),
  platformKey: z.string().describe("Platform slug (e.g. sora, veo)"),
  platformLabel: z.string().describe("Platform display name"),
  platformId: z.string().optional().describe("AiPlatform CUID"),
  assetType: AssetTypeEnum.describe("Asset type"),
  prompt: z.string().describe("Generation prompt"),
  negativePrompt: z.string().optional(),
  modelName: z.string().optional(),
  sourceUrl: z.string().optional(),
  externalAssetId: z.string().optional(),
  outputUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  provenance: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  title: z.string().optional(),
  status: AssetStatusEnum.optional(),
  rightsState: RightsStateEnum.optional(),
  selected: z.boolean().optional(),
  promptPackageId: z.string().optional(),
  parentVersionId: z.string().optional(),
  compareGroup: z.string().optional(),
  costEstimateUsd: z.number().optional(),
  generationSeconds: z.number().int().optional(),
  queueWaitSeconds: z.number().int().optional(),
});

export const AssetUpdateSchema = z.object({
  assetId: z.string().describe("Asset CUID"),
  title: z.string().optional(),
  prompt: z.string().optional(),
  negativePrompt: z.string().optional(),
  modelName: z.string().optional(),
  sourceUrl: z.string().optional(),
  externalAssetId: z.string().optional(),
  outputUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  provenance: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  status: AssetStatusEnum.optional().describe("New status (validated transition)"),
  rightsState: RightsStateEnum.optional(),
  selected: z.boolean().optional(),
  promptPackageId: z.string().optional(),
  parentVersionId: z.string().optional(),
  compareGroup: z.string().optional(),
  costEstimateUsd: z.number().optional(),
  generationSeconds: z.number().int().optional(),
  queueWaitSeconds: z.number().int().optional(),
});

export const AssetDeleteSchema = z.object({
  assetId: z.string().describe("Asset CUID to delete"),
});

export const AssetSelectSchema = z.object({
  assetId: z.string().describe("Asset CUID to toggle selection"),
  selected: z.boolean().describe("True to select, false to deselect"),
});

export const AssetFanoutSchema = z.object({
  sceneId: z.string().describe("Scene CUID"),
  platformIds: z.array(z.string()).min(1).describe("AiPlatform CUIDs"),
  assetType: AssetTypeEnum,
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  modelName: z.string().optional(),
  sourceUrl: z.string().optional(),
  outputUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  externalAssetId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  provenance: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  title: z.string().optional(),
  status: AssetStatusEnum.optional(),
  selected: z.boolean().optional(),
  rightsState: RightsStateEnum.optional(),
  promptPackageId: z.string().optional(),
  parentVersionId: z.string().optional(),
  compareGroup: z.string().optional(),
  costEstimateUsd: z.number().optional(),
  generationSeconds: z.number().int().optional(),
  queueWaitSeconds: z.number().int().optional(),
});

export const AssetCompareSchema = z.object({
  sceneId: z.string().describe("Scene CUID"),
  compareGroup: z.string().describe("Compare group identifier"),
});
