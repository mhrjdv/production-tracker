import { z } from "zod";

export const PromptPackageListSchema = z.object({
  sceneId: z.string().describe("Scene CUID"),
});

export const PromptPackageGetSchema = z.object({
  promptPackageId: z.string().describe("PromptPackage CUID"),
});

export const PromptPackageCreateSchema = z.object({
  sceneId: z.string().describe("Scene CUID"),
  shotId: z.string().optional().describe("Shot CUID"),
  name: z.string().optional().describe("Package name"),
  prompt: z.string().describe("Generation prompt text"),
  negativePrompt: z.string().optional(),
  constraints: z.record(z.string(), z.unknown()).optional(),
  targetAspectRatio: z.string().optional().describe("e.g. 16:9, 1:1"),
  targetDurationSec: z.number().int().optional(),
  styleProfile: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
