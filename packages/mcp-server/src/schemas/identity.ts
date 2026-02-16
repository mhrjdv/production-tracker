import { z } from "zod";

export const IdentityGetSchema = z.object({
  projectId: z.string().describe("Project CUID"),
});

export const IdentityUpsertSchema = z.object({
  projectId: z.string().describe("Project CUID"),
  data: z
    .record(z.string(), z.unknown())
    .describe("Film identity data (JSON object)"),
});
