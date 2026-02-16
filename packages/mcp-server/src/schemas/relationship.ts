import { z } from "zod";

// Scene-Character relationships
export const SceneCharacterAssignSchema = z.object({
  sceneId: z.string().describe("Scene CUID"),
  characterId: z.string().describe("Character CUID"),
});

export const SceneCharacterRemoveSchema = z.object({
  sceneId: z.string().describe("Scene CUID"),
  characterId: z.string().describe("Character CUID"),
});

export const SceneCharacterSyncSchema = z.object({
  sceneId: z.string().describe("Scene CUID"),
  characterIds: z
    .array(z.string())
    .describe("Full list of character CUIDs — adds missing, removes extras"),
});

// Shot-Character relationships
export const ShotCharacterAssignSchema = z.object({
  shotId: z.string().describe("Shot CUID"),
  characterId: z.string().describe("Character CUID"),
  role: z.string().optional().describe("Role in this shot"),
});

export const ShotCharacterRemoveSchema = z.object({
  shotId: z.string().describe("Shot CUID"),
  characterId: z.string().describe("Character CUID"),
});

export const ShotCharacterSyncSchema = z.object({
  shotId: z.string().describe("Shot CUID"),
  characterIds: z
    .array(z.string())
    .describe("Full list of character CUIDs for this shot"),
});
