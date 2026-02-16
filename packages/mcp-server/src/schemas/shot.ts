import { z } from "zod";

export const ShotListSchema = z.object({
  sceneId: z.string().describe("Scene CUID"),
});

export const ShotGetSchema = z.object({
  shotId: z.string().describe("Shot CUID"),
});

export const ShotCreateSchema = z.object({
  sceneId: z.string().describe("Scene CUID"),
  description: z.string().describe("Shot description"),
  angle: z
    .string()
    .optional()
    .describe(
      "Camera angle (wide, medium, close-up, OTS, POV, aerial, insert)",
    ),
  framing: z.string().optional().describe("Framing notes"),
  movement: z
    .string()
    .optional()
    .describe(
      "Camera movement (pan, tilt, dolly, crane, handheld, steadicam, static)",
    ),
  lensNotes: z.string().optional().describe("Lens/focal length notes"),
  references: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Reference images/style refs (JSON)"),
});

export const ShotUpdateSchema = z.object({
  shotId: z.string().describe("Shot CUID"),
  description: z.string().optional(),
  angle: z.string().optional(),
  framing: z.string().optional(),
  movement: z.string().optional(),
  lensNotes: z.string().optional(),
  references: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const ShotDeleteSchema = z.object({
  shotId: z.string().describe("Shot CUID to delete"),
});

export const ShotReorderSchema = z.object({
  sceneId: z.string().describe("Scene CUID"),
  shotIds: z.array(z.string()).describe("Shot CUIDs in desired order"),
});
