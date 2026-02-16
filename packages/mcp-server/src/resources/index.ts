import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerDependencies } from "../server.js";

/**
 * Safely read a file, returning fallback on failure.
 */
function readFileSafe(path: string, fallback: string): string {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return fallback;
  }
}

export function registerAllResources(
  server: McpServer,
  { prisma, authContext }: ServerDependencies,
): void {
  const userId = authContext.userId;

  // ── lazer://schema/prisma ──────────────────────────────
  server.resource(
    "prisma-schema",
    "lazer://schema/prisma",
    { description: "Full Prisma schema for the Lazer database" },
    async () => {
      const schemaPath = resolve(
        import.meta.dirname ?? ".",
        "../../../prisma/schema.prisma",
      );
      const content = readFileSafe(
        schemaPath,
        "// Schema file not found. Check server installation path.",
      );
      return {
        contents: [
          { uri: "lazer://schema/prisma", mimeType: "text/plain", text: content },
        ],
      };
    },
  );

  // ── lazer://schema/enums ───────────────────────────────
  server.resource(
    "schema-enums",
    "lazer://schema/enums",
    { description: "All Prisma enum values as JSON" },
    async () => {
      const enums = {
        AssetType: [
          "SCRIPT", "IMAGE", "VIDEO", "AUDIO", "MUSIC",
          "VOICE", "NARRATION", "STORYBOARD", "OTHER",
        ],
        AssetStatus: [
          "DRAFT", "GENERATED", "NEEDS_REVIEW", "REVIEWED",
          "APPROVED", "SELECTED", "REJECTED", "ARCHIVED", "FINAL",
        ],
        RightsState: [
          "UNKNOWN", "NON_COMMERCIAL", "COMMERCIAL_ALLOWED", "RESTRICTED",
        ],
      };
      return {
        contents: [
          {
            uri: "lazer://schema/enums",
            mimeType: "application/json",
            text: JSON.stringify(enums, null, 2),
          },
        ],
      };
    },
  );

  // ── lazer://schema/status-transitions ──────────────────
  server.resource(
    "status-transitions",
    "lazer://schema/status-transitions",
    { description: "Valid asset status transitions" },
    async () => {
      const transitions = {
        DRAFT: ["GENERATED", "SELECTED", "REJECTED", "ARCHIVED"],
        GENERATED: ["NEEDS_REVIEW", "SELECTED", "REJECTED", "ARCHIVED"],
        NEEDS_REVIEW: ["REVIEWED", "REJECTED"],
        REVIEWED: ["APPROVED", "REJECTED"],
        APPROVED: ["SELECTED", "FINAL", "REJECTED"],
        SELECTED: ["FINAL", "REJECTED", "ARCHIVED", "GENERATED"],
        REJECTED: ["DRAFT", "ARCHIVED"],
        ARCHIVED: ["DRAFT", "GENERATED"],
        FINAL: ["ARCHIVED"],
      };
      return {
        contents: [
          {
            uri: "lazer://schema/status-transitions",
            mimeType: "application/json",
            text: JSON.stringify(transitions, null, 2),
          },
        ],
      };
    },
  );

  // ── lazer://project/{id}/tree (resource template) ──────
  server.resource(
    "project-tree",
    "lazer://project/{id}/tree",
    { description: "Full project hierarchy tree" },
    async (uri) => {
      const id = uri.pathname.split("/")[1];
      const project = await prisma.project.findFirst({
        where: { id, userId },
        include: {
          identity: true,
          characters: { select: { id: true, name: true, role: true } },
          scenes: {
            orderBy: { sortOrder: "asc" },
            include: {
              shots: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  shotCode: true,
                  description: true,
                  _count: { select: { assets: true } },
                },
              },
              _count: { select: { assets: true } },
            },
          },
        },
      });

      const text = project
        ? JSON.stringify(project, null, 2)
        : JSON.stringify({ error: "Project not found or not owned" });

      return {
        contents: [{ uri: uri.href, mimeType: "application/json", text }],
      };
    },
  );

  // ── Documentation resources ───────────────────────────────
  const docResources = [
    {
      name: "docs-product-research",
      uri: "lazer://docs/product-research",
      description: "Lazer UX + product research (canonical)",
      file: "docs/lazer-ux-product-research-2026.md",
    },
    {
      name: "docs-product-plan",
      uri: "lazer://docs/product-plan",
      description: "AI film product plan 2026",
      file: "docs/ai-film-product-plan-2026.md",
    },
    {
      name: "docs-system-blueprint",
      uri: "lazer://docs/system-blueprint",
      description: "Production AI system architecture blueprint",
      file: "docs/production-ai-system-blueprint-2026.md",
    },
  ] as const;

  for (const doc of docResources) {
    server.resource(
      doc.name,
      doc.uri,
      { description: doc.description },
      async () => {
        const filePath = resolve(
          import.meta.dirname ?? ".",
          `../../../${doc.file}`,
        );
        const content = readFileSafe(filePath, `# Not found\n\n${doc.file} not found.`);
        return {
          contents: [
            { uri: doc.uri, mimeType: "text/markdown", text: content },
          ],
        };
      },
    );
  }
}
