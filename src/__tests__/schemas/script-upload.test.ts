// ============================================================
// TDD Tests for Script Upload Zod Schemas
// Tests written FIRST — implementation follows
// ============================================================

import { describe, it, expect } from "vitest";
import {
    SceneExtractedSchema,
    CharacterExtractedSchema,
    FilmIdentitySchema,
    SceneDescriptionSchema,
    FullPipelineResultSchema,
} from "@/lib/schemas/script-upload";

// ─── Scene Extracted Schema ──────────────────────────────────

describe("SceneExtractedSchema", () => {
    it("should validate a correct scene object", () => {
        const scene = {
            scene_id: "S001",
            source_text: "The film opens on a lighthouse.",
            reason: "location introduction",
            act: 1,
            act_title: "THE ACCIDENT / ORIGIN",
            macro_scene: "The Storm & Lighthouse",
            story_beat: "Establish mood, danger, isolation",
        };
        const result = SceneExtractedSchema.safeParse(scene);
        expect(result.success).toBe(true);
    });

    it("should reject missing required fields", () => {
        const incomplete = {
            scene_id: "S001",
            source_text: "Some text",
        };
        const result = SceneExtractedSchema.safeParse(incomplete);
        expect(result.success).toBe(false);
    });

    it("should reject invalid act number", () => {
        const scene = {
            scene_id: "S001",
            source_text: "Text",
            reason: "reason",
            act: -1,
            act_title: "Act",
            macro_scene: "Scene",
            story_beat: "Beat",
        };
        const result = SceneExtractedSchema.safeParse(scene);
        expect(result.success).toBe(false);
    });

    it("should enforce scene_id format (S followed by digits)", () => {
        const scene = {
            scene_id: "INVALID",
            source_text: "Text",
            reason: "reason",
            act: 1,
            act_title: "Act",
            macro_scene: "Scene",
            story_beat: "Beat",
        };
        const result = SceneExtractedSchema.safeParse(scene);
        expect(result.success).toBe(false);
    });
});

// ─── Character Extracted Schema ──────────────────────────────

describe("CharacterExtractedSchema", () => {
    it("should validate a full character object", () => {
        const character = {
            name: "Laser Man",
            role: "Protagonist, reluctant superhero",
            core_identity:
                "A once-flawless superhero whose power is tied directly to his eyesight",
            visual_cues: {
                body_language: "Heroic posture",
                eyes: "Source of power",
            },
        };
        const result = CharacterExtractedSchema.safeParse(character);
        expect(result.success).toBe(true);
    });

    it("should accept minimal character data", () => {
        const character = {
            name: "Guard",
            role: "Background",
            core_identity: "A nameless guard",
        };
        const result = CharacterExtractedSchema.safeParse(character);
        expect(result.success).toBe(true);
    });

    it("should reject missing name", () => {
        const character = {
            role: "Protagonist",
            core_identity: "Some identity",
        };
        const result = CharacterExtractedSchema.safeParse(character);
        expect(result.success).toBe(false);
    });
});

// ─── Film Identity Schema ────────────────────────────────────

describe("FilmIdentitySchema", () => {
    it("should validate a complete film identity", () => {
        const identity = {
            film_identity: {
                tone: "Intimate, restrained",
                genre: "Animated drama",
                narrative_stance:
                    "Human-scale emotions framed against larger forces",
                emotional_thesis: "Inner calm and resilience persist",
                pacing_philosophy: "Deliberate and unhurried",
            },
            world: {
                setting_principle: "Isolated human habitats",
            },
            visual_style: {
                animation_philosophy: "Stylized realism",
            },
        };
        const result = FilmIdentitySchema.safeParse(identity);
        expect(result.success).toBe(true);
    });

    it("should accept minimal identity (just core film_identity)", () => {
        const identity = {
            film_identity: {
                tone: "Dark",
                genre: "Thriller",
                narrative_stance: "First person",
                emotional_thesis: "Fear conquers all",
                pacing_philosophy: "Fast",
            },
        };
        const result = FilmIdentitySchema.safeParse(identity);
        expect(result.success).toBe(true);
    });

    it("should reject missing film_identity", () => {
        const identity = {
            world: { setting_principle: "Something" },
        };
        const result = FilmIdentitySchema.safeParse(identity);
        expect(result.success).toBe(false);
    });
});

// ─── Scene Description Schema ────────────────────────────────

describe("SceneDescriptionSchema", () => {
    it("should validate a full scene description", () => {
        const desc = {
            scene_id: "S001",
            narrative_purpose:
                "Establish isolation and nature's dominance",
            setting: {
                location: "Lighthouse on jagged coastal rocks",
                time_of_day: "Night",
                environment: "Open sea, violent weather",
                atmosphere: "Hostile, vast",
            },
            characters_present: [],
            actions: ["Waves crash against rocks"],
            emotional_tone: "Foreboding and lonely",
            camera_intent: {
                movement: "Slow push-in",
                framing: "Lighthouse kept small in frame",
            },
            visual_motifs: ["Human structures dwarfed by nature"],
            constraints: ["No human characters introduced"],
        };
        const result = SceneDescriptionSchema.safeParse(desc);
        expect(result.success).toBe(true);
    });

    it("should handle both string and object characters_present", () => {
        const desc = {
            scene_id: "S006",
            narrative_purpose: "Introduce human presence",
            setting: {
                location: "Lighthouse interior",
                environment: "Small enclosed room",
                atmosphere: "Protective",
            },
            characters_present: [
                "Guard",
                { character: "Shreelatha", behavior: "Standing near window" },
            ],
            actions: ["She speaks into the phone"],
            emotional_tone: "Quiet concern",
            camera_intent: {
                movement: "Gentle push-in",
                framing: "Window visible behind",
            },
            visual_motifs: ["Interior warmth"],
            constraints: [],
        };
        const result = SceneDescriptionSchema.safeParse(desc);
        expect(result.success).toBe(true);
    });
});

// ─── Full Pipeline Result Schema ─────────────────────────────

describe("FullPipelineResultSchema", () => {
    it("should validate a complete pipeline result", () => {
        const result = FullPipelineResultSchema.safeParse({
            project_name: "Laserman V2",
            project_description: "A sci-fi animated film",
            genre: "sci-fi",
            scenes_extracted: [
                {
                    scene_id: "S001",
                    source_text: "Opening shot",
                    reason: "location",
                    act: 1,
                    act_title: "ACT 1",
                    macro_scene: "Opening",
                    story_beat: "Intro",
                },
            ],
            characters: [
                {
                    name: "Hero",
                    role: "Protagonist",
                    core_identity: "A reluctant hero",
                },
            ],
            film_identity: {
                film_identity: {
                    tone: "Dark",
                    genre: "Sci-fi",
                    narrative_stance: "Third person",
                    emotional_thesis: "Hope prevails",
                    pacing_philosophy: "Measured",
                },
            },
            scenes_described: [
                {
                    scene_id: "S001",
                    narrative_purpose: "Establish the world",
                    setting: {
                        location: "City",
                        environment: "Futuristic",
                        atmosphere: "Tense",
                    },
                    characters_present: [],
                    actions: ["Camera pans"],
                    emotional_tone: "Anticipation",
                    camera_intent: {
                        movement: "Pan left",
                        framing: "Wide",
                    },
                    visual_motifs: [],
                    constraints: [],
                },
            ],
        });
        expect(result.success).toBe(true);
    });

    it("should reject completely empty data", () => {
        const result = FullPipelineResultSchema.safeParse({});
        expect(result.success).toBe(false);
    });
});
