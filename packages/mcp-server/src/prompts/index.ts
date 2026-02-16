import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerDependencies } from "../server.js";

export function registerAllPrompts(
  server: McpServer,
  { prisma, authContext }: ServerDependencies,
): void {
  const userId = authContext.userId;

  // ── scene_breakdown ───────────────────────────────────────
  server.prompt(
    "scene_breakdown",
    "Suggest shots for a scene based on its source text and story beat",
    { projectId: z.string(), sceneId: z.string() },
    async ({ projectId, sceneId }) => {
      const scene = await prisma.scene.findFirst({
        where: { id: sceneId, project: { id: projectId, userId } },
        include: {
          characters: { include: { character: { select: { name: true, role: true } } } },
          shots: { orderBy: { sortOrder: "asc" } },
        },
      });

      if (!scene) {
        return {
          messages: [
            { role: "user" as const, content: { type: "text" as const, text: "Scene not found." } },
          ],
        };
      }

      const existingShots = scene.shots.length > 0
        ? `\n\nExisting shots:\n${scene.shots.map((s) => `- ${s.shotCode}: ${s.description}`).join("\n")}`
        : "";

      const characters = scene.characters.length > 0
        ? `\n\nCharacters in scene:\n${scene.characters.map((sc) => `- ${sc.character.name} (${sc.character.role})`).join("\n")}`
        : "";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Break down this scene into individual shots for AI generation.

Scene ${scene.sceneId} — ${scene.storyBeat}
Act ${scene.act}: ${scene.actTitle}
Emotional Tone: ${scene.emotionalTone ?? "not specified"}

Source Text:
${scene.sourceText}${characters}${existingShots}

For each suggested shot, provide:
1. Shot description (what we see)
2. Camera angle (wide, medium, close-up, OTS, POV, aerial, insert)
3. Camera movement (static, pan, tilt, dolly, crane, handheld, steadicam)
4. Framing notes
5. Lens/focal length suggestions

Focus on visual storytelling and cinematographic variety.`,
            },
          },
        ],
      };
    },
  );

  // ── shot_planning ─────────────────────────────────────────
  server.prompt(
    "shot_planning",
    "Create a shot-by-shot cinematography plan for a scene",
    {
      projectId: z.string(),
      sceneId: z.string(),
      style: z.string().optional(),
    },
    async ({ projectId, sceneId, style }) => {
      const scene = await prisma.scene.findFirst({
        where: { id: sceneId, project: { id: projectId, userId } },
        include: {
          shots: { orderBy: { sortOrder: "asc" } },
        },
      });

      if (!scene) {
        return {
          messages: [
            { role: "user" as const, content: { type: "text" as const, text: "Scene not found." } },
          ],
        };
      }

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Create a detailed shot-by-shot cinematography plan.

Scene: ${scene.sceneId} — ${scene.storyBeat}
Style: ${style ?? "cinematic, professional"}
Existing shots: ${scene.shots.length}

Source Text:
${scene.sourceText}

For each shot provide:
- Shot type and angle
- Lighting direction (key, fill, rim, practical)
- Color palette / mood
- Composition notes (rule of thirds, leading lines, depth)
- Transition from previous shot
- Generation prompt optimized for AI platforms (Sora, Veo, Freepik)`,
            },
          },
        ],
      };
    },
  );

  // ── asset_review ──────────────────────────────────────────
  server.prompt(
    "asset_review",
    "Evaluate generated assets and recommend selections for a scene",
    {
      projectId: z.string(),
      sceneId: z.string(),
      assetType: z.string().optional(),
    },
    async ({ projectId, sceneId, assetType }) => {
      const where: Record<string, unknown> = {
        sceneId,
        scene: { project: { id: projectId, userId } },
      };
      if (assetType) where.assetType = assetType;

      const assets = await prisma.sceneAssetVersion.findMany({
        where,
        include: { platform: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      const assetSummary = assets
        .map(
          (a) =>
            `[${a.id}] v${a.versionNumber} ${a.platformKey}/${a.assetType} — ${a.status} ${a.selected ? "(SELECTED)" : ""}\n  Prompt: ${a.prompt.slice(0, 100)}...`,
        )
        .join("\n\n");

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Review these generated assets and recommend which to select.

Scene: ${sceneId}
Assets (${assets.length}):
${assetSummary || "No assets found."}

For each asset, evaluate:
1. Quality (prompt adherence, visual coherence)
2. Technical quality (resolution indicators, artifacts)
3. Storytelling fit (matches scene mood and narrative)
4. Recommendation: SELECT, NEEDS_REVIEW, or REJECT with reasoning

End with overall selection recommendations.`,
            },
          },
        ],
      };
    },
  );

  // ── prompt_refinement ─────────────────────────────────────
  server.prompt(
    "prompt_refinement",
    "Refine a generation prompt for better results",
    {
      projectId: z.string(),
      sceneId: z.string(),
      currentPrompt: z.string(),
      platform: z.string().optional(),
    },
    async ({ projectId, sceneId, currentPrompt, platform }) => {
      const scene = await prisma.scene.findFirst({
        where: { id: sceneId, project: { id: projectId, userId } },
        select: { sceneId: true, storyBeat: true, emotionalTone: true },
      });

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Refine this AI generation prompt for better results.

Scene context: ${scene ? `${scene.sceneId} — ${scene.storyBeat} (${scene.emotionalTone ?? "neutral"})` : "unknown"}
Target platform: ${platform ?? "general (Sora, Veo, Freepik)"}

Current prompt:
${currentPrompt}

Improve the prompt by:
1. Adding specific visual details (lighting, color, composition)
2. Clarifying camera angle and movement
3. Including style references if helpful
4. Platform-specific optimizations (if target platform specified)
5. Negative prompt suggestions (what to avoid)

Return both the refined prompt and negative prompt.`,
            },
          },
        ],
      };
    },
  );

  // ── production_summary ────────────────────────────────────
  server.prompt(
    "production_summary",
    "Generate a production status summary with next steps",
    { projectId: z.string() },
    async ({ projectId }) => {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId },
        include: {
          _count: { select: { scenes: true, characters: true } },
        },
      });

      if (!project) {
        return {
          messages: [
            { role: "user" as const, content: { type: "text" as const, text: "Project not found." } },
          ],
        };
      }

      const [assetsByStatus, assetsByType, selectedCount] = await Promise.all([
        prisma.sceneAssetVersion.groupBy({
          by: ["status"],
          where: { scene: { projectId } },
          _count: true,
        }),
        prisma.sceneAssetVersion.groupBy({
          by: ["assetType"],
          where: { scene: { projectId } },
          _count: true,
        }),
        prisma.sceneAssetVersion.count({
          where: { scene: { projectId }, selected: true },
        }),
      ]);

      const statusSummary = assetsByStatus
        .map((r) => `  ${r.status}: ${r._count}`)
        .join("\n");
      const typeSummary = assetsByType
        .map((r) => `  ${r.assetType}: ${r._count}`)
        .join("\n");
      const total = assetsByStatus.reduce((s, r) => s + r._count, 0);

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Generate a production status report and recommend next steps.

Project: ${project.name}
Genre: ${project.genre ?? "unspecified"}
Scenes: ${project._count.scenes}
Characters: ${project._count.characters}

Assets (${total} total, ${selectedCount} selected):
By Status:
${statusSummary || "  none"}
By Type:
${typeSummary || "  none"}

Analyze:
1. Overall production progress
2. Scenes that need more assets
3. Assets stuck in review
4. Recommended next actions (which scenes to generate for, what to review)
5. Estimated completeness percentage`,
            },
          },
        ],
      };
    },
  );
}
