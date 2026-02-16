import { z } from "zod";

export const WorkflowIngestSchema = z.object({
  projectId: z.string().describe("Project CUID"),
  sceneId: z.string().describe("Scene user-facing ID (e.g. S001)"),
  platformSlug: z.string().describe("Platform slug (e.g. sora)"),
  assetType: z.enum([
    "SCRIPT", "IMAGE", "VIDEO", "AUDIO", "MUSIC",
    "VOICE", "NARRATION", "STORYBOARD", "OTHER",
  ]),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  outputUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  sourceUrl: z.string().optional(),
  externalAssetId: z.string().optional(),
  modelName: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  title: z.string().optional(),
  status: z.string().optional(),
  selected: z.boolean().optional(),
  shotCode: z.string().optional().describe("Shot code to link (e.g. SH001)"),
  compareGroup: z.string().optional(),
});

export const WorkflowProjectTreeSchema = z.object({
  projectId: z.string().describe("Project CUID"),
});

export const WorkflowSceneSummarySchema = z.object({
  sceneId: z.string().describe("Scene CUID"),
});

export const WorkflowProductionStatusSchema = z.object({
  projectId: z.string().describe("Project CUID"),
});
