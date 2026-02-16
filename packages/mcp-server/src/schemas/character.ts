import { z } from "zod";

export const CharacterListSchema = z.object({
  projectId: z.string().describe("Project CUID"),
});

export const CharacterGetSchema = z.object({
  characterId: z.string().describe("Character CUID"),
});

export const CharacterCreateSchema = z.object({
  projectId: z.string().describe("Project CUID"),
  name: z.string().min(1).describe("Character name"),
  role: z.string().min(1).describe("Character role"),
  coreIdentity: z.string().optional().describe("Core identity description"),
  designPhilosophy: z.string().optional().describe("Visual design philosophy"),
});

export const CharacterUpdateSchema = z.object({
  characterId: z.string().describe("Character CUID"),
  name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  coreIdentity: z.string().optional(),
  designPhilosophy: z.string().optional(),
  visualCues: z.array(z.string()).optional().describe("Visual cue keywords"),
  bodyLanguage: z.array(z.string()).optional().describe("Body language keywords"),
});

export const CharacterUpdatePortraitSchema = z.object({
  characterId: z.string().describe("Character CUID"),
  portraitUrl: z.string().url().describe("Portrait image URL"),
});

export const CharacterDeleteSchema = z.object({
  characterId: z.string().describe("Character CUID to delete"),
});
