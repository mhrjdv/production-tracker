// ============================================================
// Laserman v2 — TypeScript Types
// Complete type definitions for all data structures
// ============================================================

// --- Scene (extracted) ---
export interface SceneExtracted {
    scene_id: string;
    source_text: string;
    reason: string;
    act: number;
    act_title: string;
    macro_scene: string;
    story_beat: string;
}

// --- Scene Setting ---
export interface SceneSetting {
    location: string;
    time_of_day?: string;
    time?: string;
    environment: string;
    atmosphere: string;
}

// --- Camera Intent ---
export interface CameraIntent {
    approach?: string;
    style?: string;
    movement: string;
    framing: string;
}

// --- Character in Scene ---
export interface SceneCharacter {
    character?: string;
    name?: string;
    behavior: string;
    blocking?: string;
}

// --- Scene (description) ---
export interface SceneDescription {
    scene_id: string;
    narrative_purpose: string;
    setting: SceneSetting;
    characters_present: (string | SceneCharacter)[];
    actions: string[];
    emotional_tone: string;
    camera_intent: CameraIntent;
    visual_motifs: string[];
    constraints: string[];
}

// --- Full Scene (merged extracted + description) ---
export interface SceneFull {
    id: string;
    sourceText: string;
    reason: string;
    act: number;
    actTitle: string;
    macroScene: string;
    storyBeat: string;
    narrativePurpose: string | null;
    emotionalTone: string | null;
    setting: SceneSetting | null;
    camera: CameraIntent | null;
    actions: string[];
    visualMotifs: string[];
    constraints: string[];
    charactersPresent: string[];
    keyframeUrl: string | null;
    sortOrder: number;
}

// --- Character ---
export interface CharacterPersonality {
    public?: string;
    private?: string;
    dominant_traits?: string[];
    traits?: string[];
}

export interface CharacterVisualCues {
    body_language?: string;
    eyes?: string;
    costume_fit?: string;
    expressions?: string;
    presence?: string;
    symbolism?: string;
    gestures?: string;
    props?: string;
    movement?: string;
    speech?: string;
    motion?: string;
    form?: string;
    interaction?: string;
    posture?: string;
    appearance?: string;
    tone?: string;
    scale?: string;
}

export interface CharacterData {
    role: string;
    age_range?: string;
    core_identity: string;
    personality?: CharacterPersonality;
    core_conflict?: string;
    emotional_arc?: string;
    strengths?: string[];
    flaws?: string[];
    weakness?: string;
    visual_cues: CharacterVisualCues;
    narrative_function?: string;
    profession?: string;
    species?: string;
}

export interface CharactersJson {
    character_descriptions: Record<string, CharacterData>;
}

// --- Film Identity ---
export interface FilmIdentityCore {
    tone: string;
    genre: string;
    narrative_stance: string;
    emotional_thesis: string;
    pacing_philosophy: string;
}

export interface FilmIdentityJson {
    film_identity: FilmIdentityCore;
    world?: Record<string, unknown>;
    visual_style?: Record<string, unknown>;
    characters?: Record<string, unknown>;
    cinematography?: Record<string, unknown>;
    lighting_rules?: Record<string, unknown>;
}

// --- Act Summary ---
export interface ActSummary {
    act: number;
    title: string;
    sceneCount: number;
    macroScenes: string[];
}

// --- Production Stats ---
export interface ProductionStats {
    totalScenes: number;
    totalCharacters: number;
    totalActs: number;
    scenesWithKeyframes: number;
    progressPercentage: number;
    actBreakdown: ActSummary[];
}
