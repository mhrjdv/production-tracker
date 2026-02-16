// ============================================================
// AI Pipeline — Script Parsing & Generation
// Orchestrates the full AI generation flow:
//   1. Extract scenes from raw script
//   2. Extract characters
//   3. Generate film identity
//   4. Generate detailed scene descriptions
// ============================================================

import { generateObject } from "ai";
import { getModel, AI_CONFIG } from "@/lib/ai";
import { aiLogger } from "@/lib/ai-logger";
import {
    ScenesExtractionResultSchema,
    CharactersExtractionResultSchema,
    FilmIdentitySchema,
    SceneDescriptionBatchSchema,
    type SceneExtracted,
    type CharacterExtracted,
    type FilmIdentity,
    type SceneDescription,
} from "@/lib/schemas/script-upload";

export type PipelineStep =
    | "extracting_scenes"
    | "extracting_characters"
    | "generating_identity"
    | "generating_descriptions"
    | "complete";

export interface PipelineProgress {
    step: PipelineStep;
    message: string;
    detail?: string;
    percentage: number;
}

export interface PipelineResult {
    projectName: string;
    projectDescription: string;
    genre: string;
    scenes: SceneExtracted[];
    characters: CharacterExtracted[];
    filmIdentity: FilmIdentity;
    sceneDescriptions: SceneDescription[];
}

// ─── Step 1: Extract Scenes ──────────────────────────────────

export async function extractScenes(scriptText: string) {
    const model = getModel();
    const modelId = process.env.AI_MODEL || "anthropic/claude-haiku-4.5";
    const systemPrompt = `You are an expert script analyst for film and animation production.
Your task is to break down a script into individual scenes.

Rules:
- Each scene should have a unique scene_id in the format S001, S002, etc.
- Each scene should capture a single visual moment or beat
- Group scenes into acts with clear act_title names
- Identify macro_scene groupings (larger narrative blocks)
- Assign a story_beat that describes what happens in the scene
- The reason should explain why this is a separate scene (location change, POV shift, action change, etc.)
- Be thorough — don't skip any moments from the script
- Also infer a project_name, project_description, and genre from the script content`;
    const prompt = `Analyze the following script and extract all scenes:\n\n${scriptText}`;

    aiLogger.request({
        step: "extractScenes",
        model: modelId,
        promptLength: prompt.length,
        systemPromptLength: systemPrompt.length,
        temperature: AI_CONFIG.temperature,
        maxOutputTokens: AI_CONFIG.maxOutputTokens,
        timestamp: new Date().toISOString(),
    });

    const start = Date.now();
    try {
        const { object } = await generateObject({
            model,
            schema: ScenesExtractionResultSchema,
            maxOutputTokens: AI_CONFIG.maxOutputTokens,
            temperature: AI_CONFIG.temperature,
            maxRetries: AI_CONFIG.maxRetries,
            system: systemPrompt,
            prompt,
        });

        const durationMs = Date.now() - start;
        aiLogger.response({
            step: "extractScenes",
            durationMs,
            itemCount: object.scenes.length,
            outputSize: JSON.stringify(object).length,
            outputKeys: Object.keys(object),
            timestamp: new Date().toISOString(),
        });

        return object;
    } catch (error) {
        const durationMs = Date.now() - start;
        aiLogger.error({
            step: "extractScenes",
            error: error instanceof Error ? error.message : String(error),
            durationMs,
            timestamp: new Date().toISOString(),
        });
        throw error;
    }
}

// ─── Step 2: Extract Characters ──────────────────────────────

export async function extractCharacters(
    scriptText: string,
    sceneSummary: string
) {
    const model = getModel();
    const modelId = process.env.AI_MODEL || "anthropic/claude-haiku-4.5";
    const systemPrompt = `You are an expert character analyst for film and animation production.
Analyze the script to identify all characters — named AND unnamed recurring ones.

For each character provide:
- name: The character's name as it appears in the script
- role: Their narrative role (Protagonist, Antagonist, Supporting, etc.)
- core_identity: A one-sentence summary of who they are
- visual_cues: Physical appearance and behavioral cues (body_language, eyes, costume, etc.)
- Optional fields: age_range, personality traits, core_conflict, emotional_arc, strengths, flaws, weakness, narrative_function

Be thorough — extract every character, even minor ones.`;
    const prompt = `Extract all characters from this script:\n\n${scriptText}\n\nScene summary for context:\n${sceneSummary}`;

    aiLogger.request({
        step: "extractCharacters",
        model: modelId,
        promptLength: prompt.length,
        systemPromptLength: systemPrompt.length,
        temperature: AI_CONFIG.temperature,
        maxOutputTokens: AI_CONFIG.maxOutputTokens,
        timestamp: new Date().toISOString(),
    });

    const start = Date.now();
    try {
        const { object } = await generateObject({
            model,
            schema: CharactersExtractionResultSchema,
            maxOutputTokens: AI_CONFIG.maxOutputTokens,
            temperature: AI_CONFIG.temperature,
            maxRetries: AI_CONFIG.maxRetries,
            system: systemPrompt,
            prompt,
        });

        const durationMs = Date.now() - start;
        aiLogger.response({
            step: "extractCharacters",
            durationMs,
            itemCount: object.characters.length,
            outputSize: JSON.stringify(object).length,
            outputKeys: Object.keys(object),
            timestamp: new Date().toISOString(),
        });

        return object;
    } catch (error) {
        const durationMs = Date.now() - start;
        aiLogger.error({
            step: "extractCharacters",
            error: error instanceof Error ? error.message : String(error),
            durationMs,
            timestamp: new Date().toISOString(),
        });
        throw error;
    }
}

// ─── Step 3: Generate Film Identity ──────────────────────────

export async function generateFilmIdentity(
    scriptText: string,
    genre: string,
    characterNames: string[]
) {
    const model = getModel();
    const modelId = process.env.AI_MODEL || "anthropic/claude-haiku-4.5";
    const systemPrompt = `You are a creative director defining the visual and narrative identity of a film.
Generate a comprehensive film identity document that covers:

1. film_identity (REQUIRED): tone, genre, narrative_stance, emotional_thesis, pacing_philosophy
2. world: World-building rules (setting principles, environmental hierarchy, temporal feel, world rules)
3. visual_style: Animation/visual philosophy, form language, texture strategy, color logic
4. characters: Character design philosophy, proportion rules, facial language
5. cinematography: Camera attitude, lens philosophy, movement rules
6. lighting_rules: Lighting philosophy, interior/exterior rules, shadow language
7. framing_philosophy: Headroom, negative space, compositional discipline

Base everything on the actual script content. Be specific, not generic.`;
    const prompt = `Generate a film identity for a ${genre} production with characters: ${characterNames.join(", ")}.\n\nScript:\n${scriptText.slice(0, 8000)}`;

    aiLogger.request({
        step: "generateFilmIdentity",
        model: modelId,
        promptLength: prompt.length,
        systemPromptLength: systemPrompt.length,
        temperature: 0.5,
        maxOutputTokens: AI_CONFIG.maxOutputTokens,
        timestamp: new Date().toISOString(),
    });

    const start = Date.now();
    try {
        const { object } = await generateObject({
            model,
            schema: FilmIdentitySchema,
            maxOutputTokens: AI_CONFIG.maxOutputTokens,
            temperature: 0.5, // Slightly more creative for identity
            maxRetries: AI_CONFIG.maxRetries,
            system: systemPrompt,
            prompt,
        });

        const durationMs = Date.now() - start;
        aiLogger.response({
            step: "generateFilmIdentity",
            durationMs,
            outputSize: JSON.stringify(object).length,
            outputKeys: Object.keys(object),
            timestamp: new Date().toISOString(),
        });

        return object;
    } catch (error) {
        const durationMs = Date.now() - start;
        aiLogger.error({
            step: "generateFilmIdentity",
            error: error instanceof Error ? error.message : String(error),
            durationMs,
            timestamp: new Date().toISOString(),
        });
        throw error;
    }
}

// ─── Step 4: Generate Scene Descriptions ─────────────────────

export async function generateSceneDescriptions(
    scenes: SceneExtracted[],
    scriptText: string,
    characterNames: string[]
) {
    const model = getModel();
    const modelId = process.env.AI_MODEL || "anthropic/claude-haiku-4.5";

    // Process in batches of 15 to stay within token limits
    const BATCH_SIZE = 15;
    const allDescriptions: SceneDescription[] = [];

    for (let i = 0; i < scenes.length; i += BATCH_SIZE) {
        const batch = scenes.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(scenes.length / BATCH_SIZE);
        const sceneSummary = batch
            .map((s) => `${s.scene_id}: ${s.source_text}`)
            .join("\n");

        const systemPrompt = `You are a scene description specialist for film production.
For each scene, generate a detailed production description including:
- narrative_purpose: What this scene accomplishes in the story
- setting: location, time_of_day, environment, atmosphere
- characters_present: Who is in the scene and what they're doing
- actions: Key actions and events
- emotional_tone: The emotional quality
- camera_intent: movement, framing (and optionally approach/style)
- visual_motifs: Visual themes present
- constraints: Production or narrative constraints

Known characters: ${characterNames.join(", ")}
The scene_id for each description MUST match the provided scene_id.`;
        const prompt = `Generate detailed scene descriptions for these scenes:\n\n${sceneSummary}\n\nScript context:\n${scriptText.slice(0, 4000)}`;

        aiLogger.request({
            step: `generateSceneDescriptions[batch ${batchNum}/${totalBatches}]`,
            model: modelId,
            promptLength: prompt.length,
            systemPromptLength: systemPrompt.length,
            temperature: AI_CONFIG.temperature,
            maxOutputTokens: AI_CONFIG.maxOutputTokens,
            timestamp: new Date().toISOString(),
        });

        const start = Date.now();
        try {
            const { object } = await generateObject({
                model,
                schema: SceneDescriptionBatchSchema,
                maxOutputTokens: AI_CONFIG.maxOutputTokens,
                temperature: AI_CONFIG.temperature,
                maxRetries: AI_CONFIG.maxRetries,
                system: systemPrompt,
                prompt,
            });

            const durationMs = Date.now() - start;
            aiLogger.response({
                step: `generateSceneDescriptions[batch ${batchNum}/${totalBatches}]`,
                durationMs,
                itemCount: object.descriptions.length,
                outputSize: JSON.stringify(object).length,
                timestamp: new Date().toISOString(),
            });

            allDescriptions.push(...object.descriptions);
        } catch (error) {
            const durationMs = Date.now() - start;
            aiLogger.error({
                step: `generateSceneDescriptions[batch ${batchNum}/${totalBatches}]`,
                error: error instanceof Error ? error.message : String(error),
                durationMs,
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    return allDescriptions;
}

// ─── Full Pipeline ───────────────────────────────────────────

export async function runFullPipeline(
    scriptText: string,
    onProgress?: (progress: PipelineProgress) => void
): Promise<PipelineResult> {
    const pipelineStart = Date.now();
    aiLogger.pipelineStart(scriptText.length);

    try {
        // Step 1: Extract scenes
        onProgress?.({
            step: "extracting_scenes",
            message: "Extracting scenes from script...",
            percentage: 10,
        });

        const scenesResult = await extractScenes(scriptText);

        onProgress?.({
            step: "extracting_scenes",
            message: `Found ${scenesResult.scenes.length} scenes`,
            detail: `Project: ${scenesResult.project_name}`,
            percentage: 30,
        });

        // Step 2: Extract characters
        onProgress?.({
            step: "extracting_characters",
            message: "Analyzing characters...",
            percentage: 35,
        });

        const sceneSummary = scenesResult.scenes
            .map((s) => `${s.scene_id}: ${s.source_text}`)
            .join("\n");

        const charactersResult = await extractCharacters(scriptText, sceneSummary);

        onProgress?.({
            step: "extracting_characters",
            message: `Found ${charactersResult.characters.length} characters`,
            percentage: 50,
        });

        // Step 3: Generate film identity
        onProgress?.({
            step: "generating_identity",
            message: "Generating film identity...",
            percentage: 55,
        });

        const characterNames = charactersResult.characters.map((c) => c.name);
        const filmIdentity = await generateFilmIdentity(
            scriptText,
            scenesResult.genre,
            characterNames
        );

        onProgress?.({
            step: "generating_identity",
            message: "Film identity generated",
            percentage: 65,
        });

        // Step 4: Generate scene descriptions
        onProgress?.({
            step: "generating_descriptions",
            message: `Generating ${scenesResult.scenes.length} scene descriptions...`,
            percentage: 70,
        });

        const sceneDescriptions = await generateSceneDescriptions(
            scenesResult.scenes,
            scriptText,
            characterNames
        );

        onProgress?.({
            step: "generating_descriptions",
            message: `Generated ${sceneDescriptions.length} descriptions`,
            percentage: 95,
        });

        // Done
        onProgress?.({
            step: "complete",
            message: "Pipeline complete!",
            percentage: 100,
        });

        const result: PipelineResult = {
            projectName: scenesResult.project_name,
            projectDescription: scenesResult.project_description,
            genre: scenesResult.genre,
            scenes: scenesResult.scenes,
            characters: charactersResult.characters,
            filmIdentity,
            sceneDescriptions,
        };

        aiLogger.pipelineComplete(Date.now() - pipelineStart, {
            scenes: result.scenes.length,
            characters: result.characters.length,
            descriptions: result.sceneDescriptions.length,
        });

        return result;
    } catch (error) {
        aiLogger.pipelineFailed(
            Date.now() - pipelineStart,
            error instanceof Error ? error.message : String(error)
        );
        throw error;
    }
}
