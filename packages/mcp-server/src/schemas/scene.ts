import { z } from "zod";

export const SceneListSchema = z.object({
  projectId: z.string().describe("Project CUID"),
});

export const SceneGetSchema = z.object({
  sceneId: z.string().describe("Scene CUID (database ID)"),
});

export const SceneCreateSchema = z.object({
  projectId: z.string().describe("Project CUID"),
  sceneId: z.string().describe("User-facing scene ID (e.g. S001)"),
  sourceText: z.string().describe("Source script text"),
  act: z.number().int().describe("Act number"),
  actTitle: z.string().describe("Act title"),
  macroScene: z.string().describe("Macro scene label"),
  storyBeat: z.string().describe("Story beat description"),
  reason: z.string().optional().describe("Reason for scene"),
  narrativePurpose: z.string().optional().describe("Narrative purpose"),
  emotionalTone: z.string().optional().describe("Emotional tone"),
  setting: z
    .record(z.string(), z.string())
    .optional()
    .describe("Setting details (JSON object)"),
  camera: z
    .record(z.string(), z.string())
    .optional()
    .describe("Camera notes (JSON object)"),
  actions: z.array(z.string()).optional().describe("Character actions"),
  visualMotifs: z.array(z.string()).optional().describe("Visual motifs"),
  constraints: z.array(z.string()).optional().describe("Constraints"),
  charactersPresent: z
    .array(z.string())
    .optional()
    .describe("Character names present"),
});

export const SceneUpdateSchema = z.object({
  sceneId: z.string().describe("Scene CUID (database ID)"),
  sourceText: z.string().optional(),
  storyBeat: z.string().optional(),
  act: z.number().int().optional(),
  actTitle: z.string().optional(),
  macroScene: z.string().optional(),
  reason: z.string().optional(),
  narrativePurpose: z.string().optional(),
  emotionalTone: z.string().optional(),
  setting: z.record(z.string(), z.string()).nullable().optional(),
  camera: z.record(z.string(), z.string()).nullable().optional(),
  actions: z.array(z.string()).optional(),
  visualMotifs: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  charactersPresent: z.array(z.string()).optional(),
});

export const SceneDeleteSchema = z.object({
  sceneId: z.string().describe("Scene CUID to delete"),
});

export const SceneReorderSchema = z.object({
  projectId: z.string().describe("Project CUID"),
  sceneIds: z.array(z.string()).describe("Scene CUIDs in desired order"),
});

export const SceneUpdateKeyframeSchema = z.object({
  sceneId: z.string().describe("Scene CUID"),
  keyframeUrl: z.string().url().describe("Keyframe image URL"),
});
