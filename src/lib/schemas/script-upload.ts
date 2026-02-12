// ============================================================
// Zod Schemas for AI-Generated Script Data
// Used with Vercel AI SDK's `generateObject` for type-safe output
// ============================================================

import { z } from "zod";

// ─── Scene Extracted ─────────────────────────────────────────

export const SceneExtractedSchema = z.object({
    scene_id: z
        .string()
        .regex(/^S\d+$/, "scene_id must be S followed by digits (e.g., S001)")
        .describe("Unique scene identifier in format S001, S002, etc."),
    source_text: z
        .string()
        .min(1)
        .describe("The original script text for this scene"),
    reason: z
        .string()
        .min(1)
        .describe("Why this was identified as a separate scene"),
    act: z
        .number()
        .int()
        .min(1)
        .describe("Act number (1-based)"),
    act_title: z
        .string()
        .min(1)
        .describe("Title of the act this scene belongs to"),
    macro_scene: z
        .string()
        .min(1)
        .describe("Macro-level scene grouping"),
    story_beat: z
        .string()
        .min(1)
        .describe("The story beat of this scene"),
});

export type SceneExtracted = z.infer<typeof SceneExtractedSchema>;

// ─── Character Extracted ─────────────────────────────────────

export const CharacterExtractedSchema = z.object({
    name: z
        .string()
        .min(1)
        .describe("Character name"),
    role: z
        .string()
        .min(1)
        .describe("Character role (e.g., Protagonist, Antagonist, Supporting)"),
    core_identity: z
        .string()
        .min(1)
        .describe("Core identity summary of the character"),
    age_range: z
        .string()
        .optional()
        .describe("Approximate age range"),
    personality: z
        .record(z.string(), z.any())
        .optional()
        .describe("Personality traits object"),
    core_conflict: z
        .string()
        .optional()
        .describe("Primary internal or external conflict"),
    emotional_arc: z
        .string()
        .optional()
        .describe("Character arc description"),
    strengths: z
        .array(z.string())
        .optional()
        .describe("Character strengths"),
    flaws: z
        .array(z.string())
        .optional()
        .describe("Character flaws"),
    weakness: z
        .string()
        .optional()
        .describe("Primary weakness"),
    visual_cues: z
        .record(z.string(), z.string())
        .optional()
        .describe("Visual cues for the character"),
    narrative_function: z
        .string()
        .optional()
        .describe("Narrative function of the character"),
});

export type CharacterExtracted = z.infer<typeof CharacterExtractedSchema>;

// ─── Film Identity ───────────────────────────────────────────

export const FilmIdentityCoreSchema = z.object({
    tone: z.string().min(1).describe("Overall tone and mood"),
    genre: z.string().min(1).describe("Film genre"),
    narrative_stance: z.string().min(1).describe("Narrative point of view"),
    emotional_thesis: z.string().min(1).describe("Core emotional theme"),
    pacing_philosophy: z.string().min(1).describe("Pacing approach"),
});

export const FilmIdentitySchema = z.object({
    film_identity: FilmIdentityCoreSchema,
    world: z.record(z.string(), z.any()).optional().describe("World-building rules"),
    visual_style: z
        .record(z.string(), z.any())
        .optional()
        .describe("Visual style guide"),
    characters: z
        .record(z.string(), z.any())
        .optional()
        .describe("Character design philosophy"),
    cinematography: z
        .record(z.string(), z.any())
        .optional()
        .describe("Cinematography rules"),
    lighting_rules: z
        .record(z.string(), z.any())
        .optional()
        .describe("Lighting rules"),
    framing_philosophy: z
        .record(z.string(), z.any())
        .optional()
        .describe("Framing philosophy"),
});

export type FilmIdentity = z.infer<typeof FilmIdentitySchema>;

// ─── Scene Description ───────────────────────────────────────

export const SceneSettingSchema = z.object({
    location: z.string().min(1).describe("Scene location"),
    time_of_day: z.string().optional().describe("Time of day"),
    time: z.string().optional().describe("Narrative time"),
    environment: z.string().min(1).describe("Environmental description"),
    atmosphere: z.string().min(1).describe("Atmospheric quality"),
});

export const CameraIntentSchema = z.object({
    approach: z.string().optional().describe("Camera approach"),
    style: z.string().optional().describe("Camera style"),
    movement: z.string().min(1).describe("Camera movement"),
    framing: z.string().min(1).describe("Framing description"),
});

export const SceneCharacterPresentSchema = z.union([
    z.string(),
    z.object({
        character: z.string().optional(),
        name: z.string().optional(),
        behavior: z.string().describe("Character behavior in scene"),
        blocking: z.string().optional().describe("Physical positioning"),
    }),
]);

export const SceneDescriptionSchema = z.object({
    scene_id: z
        .string()
        .regex(/^S\d+$/)
        .describe("Matching scene_id from extraction"),
    narrative_purpose: z
        .string()
        .min(1)
        .describe("What this scene accomplishes narratively"),
    setting: SceneSettingSchema,
    characters_present: z
        .array(SceneCharacterPresentSchema)
        .describe("Characters in this scene"),
    actions: z
        .array(z.string())
        .describe("Key actions in this scene"),
    emotional_tone: z
        .string()
        .min(1)
        .describe("Emotional quality of the scene"),
    camera_intent: CameraIntentSchema,
    visual_motifs: z
        .array(z.string())
        .describe("Visual motifs present"),
    constraints: z
        .array(z.string())
        .describe("Production or narrative constraints"),
});

export type SceneDescription = z.infer<typeof SceneDescriptionSchema>;

// ─── Full Pipeline Result ────────────────────────────────────

export const FullPipelineResultSchema = z.object({
    project_name: z
        .string()
        .min(1)
        .describe("Auto-generated project name from script"),
    project_description: z
        .string()
        .min(1)
        .describe("Brief project description"),
    genre: z
        .string()
        .min(1)
        .describe("Detected genre"),
    scenes_extracted: z
        .array(SceneExtractedSchema)
        .min(1)
        .describe("All extracted scenes"),
    characters: z
        .array(CharacterExtractedSchema)
        .min(1)
        .describe("All extracted characters"),
    film_identity: FilmIdentitySchema,
    scenes_described: z
        .array(SceneDescriptionSchema)
        .min(1)
        .describe("Detailed descriptions for all scenes"),
});

export type FullPipelineResult = z.infer<typeof FullPipelineResultSchema>;

// ─── Pipeline Step Schemas (individual generation results) ───

export const ScenesExtractionResultSchema = z.object({
    project_name: z.string().min(1),
    project_description: z.string().min(1),
    genre: z.string().min(1),
    scenes: z.array(SceneExtractedSchema).min(1),
});

export const CharactersExtractionResultSchema = z.object({
    characters: z.array(CharacterExtractedSchema).min(1),
});

export const SceneDescriptionBatchSchema = z.object({
    descriptions: z.array(SceneDescriptionSchema).min(1),
});
