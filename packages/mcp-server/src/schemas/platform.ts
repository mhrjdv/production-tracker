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

export const PlatformListSchema = z.object({});

export const PlatformGetSchema = z.object({
  platformId: z.string().describe("AiPlatform CUID"),
});

export const PlatformCreateSchema = z.object({
  slug: z.string().min(1).describe("Unique slug (e.g. sora, veo, freepik)"),
  name: z.string().min(1).describe("Display name"),
  provider: z.string().optional(),
  homepageUrl: z.string().url().optional(),
  docsUrl: z.string().url().optional(),
  specialties: z.array(z.string()).optional(),
  supportedOutput: z.array(AssetTypeEnum).optional(),
  notes: z.string().optional(),
});

export const PlatformUpdateSchema = z.object({
  platformId: z.string().describe("AiPlatform CUID"),
  name: z.string().optional(),
  provider: z.string().optional(),
  homepageUrl: z.string().url().optional(),
  docsUrl: z.string().url().optional(),
  specialties: z.array(z.string()).optional(),
  supportedOutput: z.array(AssetTypeEnum).optional(),
  notes: z.string().optional(),
});
