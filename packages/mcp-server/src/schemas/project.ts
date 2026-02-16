import { z } from "zod";

export const ProjectListSchema = z.object({});

export const ProjectGetSchema = z.object({
  projectId: z.string().describe("Project CUID"),
});

export const ProjectCreateSchema = z.object({
  name: z.string().min(1).describe("Project name"),
  description: z.string().optional().describe("Project description"),
  genre: z.string().optional().describe("Genre (e.g. sci-fi, drama)"),
  identity: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Film identity data (JSON object)"),
  characters: z
    .array(
      z.object({
        name: z.string().min(1),
        role: z.string().min(1),
        coreIdentity: z.string().optional(),
      }),
    )
    .optional()
    .describe("Initial characters to create with the project"),
});

export const ProjectUpdateSchema = z.object({
  projectId: z.string().describe("Project CUID"),
  name: z.string().min(1).optional().describe("New project name"),
  description: z.string().optional().describe("New description"),
  genre: z.string().optional().describe("New genre"),
  status: z
    .enum(["active", "archived", "completed"])
    .optional()
    .describe("Project status"),
  coverImage: z.string().url().optional().describe("Cover image URL"),
});

export const ProjectDeleteSchema = z.object({
  projectId: z.string().describe("Project CUID to delete (cascade)"),
});
