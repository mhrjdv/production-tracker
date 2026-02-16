import { z } from "zod";

export const SearchAssetsSchema = z.object({
  projectId: z.string().describe("Project CUID"),
  query: z.string().optional().describe("Text search in prompt/notes/title"),
  assetType: z
    .enum(["SCRIPT", "IMAGE", "VIDEO", "AUDIO", "MUSIC", "VOICE", "NARRATION", "STORYBOARD", "OTHER"])
    .optional(),
  status: z
    .enum(["DRAFT", "GENERATED", "NEEDS_REVIEW", "REVIEWED", "APPROVED", "SELECTED", "REJECTED", "ARCHIVED", "FINAL"])
    .optional(),
  platformKey: z.string().optional().describe("Filter by platform slug"),
  tags: z.array(z.string()).optional().describe("Filter by tags (any match)"),
  selected: z.boolean().optional().describe("Filter by selection state"),
  limit: z.number().int().min(1).max(100).optional().describe("Max results (default 50)"),
});

export const SearchScenesSchema = z.object({
  projectId: z.string().describe("Project CUID"),
  query: z.string().optional().describe("Text search in storyBeat/sourceText/emotionalTone"),
  act: z.number().int().optional().describe("Filter by act number"),
  emotionalTone: z.string().optional().describe("Filter by emotional tone"),
  limit: z.number().int().min(1).max(100).optional().describe("Max results (default 50)"),
});
