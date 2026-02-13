import { AssetType, Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const PLATFORM_SEED = [
    {
        slug: "openai-sora",
        name: "Sora",
        provider: "OpenAI",
        homepageUrl: "https://openai.com/sora",
        docsUrl: "https://help.openai.com/en/articles/9957612-generating-videos-on-sora",
        specialties: ["text-to-video", "image-to-video", "storyboards", "remix"],
        supportedOutput: [AssetType.VIDEO, AssetType.STORYBOARD],
        notes: "High-quality cinematic generation with built-in storyboard tooling.",
    },
    {
        slug: "google-veo",
        name: "Veo",
        provider: "Google DeepMind",
        homepageUrl: "https://deepmind.google/models/veo/",
        docsUrl: "https://cloud.google.com/vertex-ai/generative-ai/docs/models/veo/2-0-generate-videos",
        specialties: ["text-to-video", "image-to-video", "multi-shot control"],
        supportedOutput: [AssetType.VIDEO],
        notes: "Available through Vertex AI model endpoints.",
    },
    {
        slug: "runway",
        name: "Runway",
        provider: "Runway",
        homepageUrl: "https://runwayml.com",
        docsUrl: "https://help.runwayml.com/hc/en-us",
        specialties: ["video generation", "editing", "inpainting", "motion control"],
        supportedOutput: [AssetType.VIDEO, AssetType.IMAGE],
        notes: "Strong generation + post stack for iterative shot work.",
    },
    {
        slug: "kling-ai",
        name: "Kling AI",
        provider: "Kuaishou",
        homepageUrl: "https://klingai.com",
        docsUrl: "https://app.klingai.com/global/docs",
        specialties: ["text-to-video", "image-to-video", "motion realism", "camera movement"],
        supportedOutput: [AssetType.VIDEO],
        notes: "Used for realistic motion-heavy shot exploration.",
    },
    {
        slug: "luma-dream-machine",
        name: "Dream Machine",
        provider: "Luma AI",
        homepageUrl: "https://lumalabs.ai/dream-machine",
        docsUrl: "https://lumalabs.ai/learning-hub",
        specialties: ["text-to-video", "image-to-video", "style consistency"],
        supportedOutput: [AssetType.VIDEO],
        notes: "Fast iteration for concept-to-shot generation.",
    },
    {
        slug: "pika",
        name: "Pika",
        provider: "Pika Labs",
        homepageUrl: "https://pika.art",
        docsUrl: "https://help.pika.art",
        specialties: ["text-to-video", "image-to-video", "camera effects"],
        supportedOutput: [AssetType.VIDEO],
        notes: "Quick short-form shot ideation and variants.",
    },
    {
        slug: "haiper",
        name: "Haiper",
        provider: "Haiper",
        homepageUrl: "https://haiper.ai",
        docsUrl: null,
        specialties: ["text-to-video", "image-to-video", "fast preview"],
        supportedOutput: [AssetType.VIDEO],
        notes: "Rapid ideation path for alternate takes.",
    },
    {
        slug: "midjourney",
        name: "Midjourney",
        provider: "Midjourney",
        homepageUrl: "https://www.midjourney.com",
        docsUrl: "https://docs.midjourney.com/docs/quick-start",
        specialties: ["concept art", "stylized images", "look development"],
        supportedOutput: [AssetType.IMAGE, AssetType.STORYBOARD],
        notes: "Strong aesthetic exploration and style iteration.",
    },
    {
        slug: "adobe-firefly",
        name: "Adobe Firefly",
        provider: "Adobe",
        homepageUrl: "https://www.adobe.com/products/firefly.html",
        docsUrl: "https://helpx.adobe.com/firefly/get-set-up/learn-the-basics.html",
        specialties: ["text-to-image", "text-to-video", "commercial-safe workflows"],
        supportedOutput: [AssetType.IMAGE, AssetType.VIDEO, AssetType.STORYBOARD],
        notes: "Strong fit for studio pipelines tied to Adobe tools.",
    },
    {
        slug: "freepik-ai",
        name: "Freepik AI Suite",
        provider: "Freepik",
        homepageUrl: "https://www.freepik.com/pikaso",
        docsUrl: "https://docs.freepik.com/ai-suite",
        specialties: ["image generation", "video generation", "template speed"],
        supportedOutput: [AssetType.IMAGE, AssetType.VIDEO, AssetType.STORYBOARD],
        notes: "Multi-model creation workflows in one UI.",
    },
    {
        slug: "ideogram",
        name: "Ideogram",
        provider: "Ideogram",
        homepageUrl: "https://ideogram.ai",
        docsUrl: "https://about.ideogram.ai/docs",
        specialties: ["text rendering", "poster visuals", "concept stills"],
        supportedOutput: [AssetType.IMAGE, AssetType.STORYBOARD],
        notes: "Useful when typography-in-image quality matters.",
    },
    {
        slug: "leonardo-ai",
        name: "Leonardo AI",
        provider: "Leonardo",
        homepageUrl: "https://leonardo.ai",
        docsUrl: "https://docs.leonardo.ai",
        specialties: ["concept art", "style transfer", "image variation"],
        supportedOutput: [AssetType.IMAGE, AssetType.STORYBOARD],
        notes: "Broad style exploration for look-dev passes.",
    },
    {
        slug: "bfl-flux",
        name: "FLUX",
        provider: "Black Forest Labs",
        homepageUrl: "https://blackforestlabs.ai",
        docsUrl: "https://docs.bfl.ai",
        specialties: ["high-fidelity image generation", "prompt adherence"],
        supportedOutput: [AssetType.IMAGE, AssetType.STORYBOARD],
        notes: "High-quality prompt-following image model family.",
    },
    {
        slug: "stability-ai",
        name: "Stable Diffusion",
        provider: "Stability AI",
        homepageUrl: "https://stability.ai",
        docsUrl: "https://platform.stability.ai/docs",
        specialties: ["customizable image generation", "fine-tuning", "open ecosystem"],
        supportedOutput: [AssetType.IMAGE, AssetType.STORYBOARD],
        notes: "Flexible open-model workflows and custom training.",
    },
    {
        slug: "recraft",
        name: "Recraft",
        provider: "Recraft",
        homepageUrl: "https://www.recraft.ai",
        docsUrl: "https://www.recraft.ai/docs",
        specialties: ["brand visuals", "vector-first generation", "design assets"],
        supportedOutput: [AssetType.IMAGE, AssetType.STORYBOARD],
        notes: "Design-accurate outputs for production and marketing assets.",
    },
    {
        slug: "suno",
        name: "Suno",
        provider: "Suno",
        homepageUrl: "https://suno.com",
        docsUrl: null,
        specialties: ["music generation", "song ideation", "lyrics-to-track"],
        supportedOutput: [AssetType.MUSIC, AssetType.AUDIO],
        notes: "Music-first generation and rapid soundtrack ideation.",
    },
    {
        slug: "udio",
        name: "Udio",
        provider: "Udio",
        homepageUrl: "https://udio.com",
        docsUrl: null,
        specialties: ["song generation", "genre iteration", "music variation"],
        supportedOutput: [AssetType.MUSIC, AssetType.AUDIO],
        notes: "Alternative music generation lane for compare-and-select.",
    },
    {
        slug: "elevenlabs",
        name: "ElevenLabs",
        provider: "ElevenLabs",
        homepageUrl: "https://elevenlabs.io",
        docsUrl: "https://elevenlabs.io/docs/overview",
        specialties: ["voice synthesis", "narration", "dubbing", "speech-to-speech"],
        supportedOutput: [AssetType.VOICE, AssetType.NARRATION, AssetType.AUDIO],
        notes: "Production-grade voice/narration APIs and workflows.",
    },
    {
        slug: "playht",
        name: "PlayHT",
        provider: "PlayHT",
        homepageUrl: "https://play.ht",
        docsUrl: "https://docs.play.ht",
        specialties: ["text-to-speech", "longform narration", "voice API"],
        supportedOutput: [AssetType.VOICE, AssetType.NARRATION, AssetType.AUDIO],
        notes: "Voice generation stack for narration and dialog tests.",
    },
    {
        slug: "murf",
        name: "Murf",
        provider: "Murf",
        homepageUrl: "https://murf.ai",
        docsUrl: "https://murf.ai/api/docs/introduction/overview",
        specialties: ["studio voiceovers", "narration", "commercial reads"],
        supportedOutput: [AssetType.VOICE, AssetType.NARRATION, AssetType.AUDIO],
        notes: "Voiceover-focused production workflows.",
    },
];

interface SceneExtracted {
    scene_id: string;
    source_text: string;
    reason: string;
    act: number;
    act_title: string;
    macro_scene: string;
    story_beat: string;
}

interface SceneDescription {
    scene_id: string;
    narrative_purpose: string;
    setting: Record<string, unknown>;
    characters_present: (string | { character?: string; name?: string })[];
    actions: string[];
    emotional_tone: string;
    camera_intent: Record<string, unknown>;
    visual_motifs: string[];
    constraints?: string[];
}

interface CharacterData {
    role: string;
    core_identity: string;
    visual_cues: Record<string, string>;
    [key: string]: unknown;
}

async function main() {
    console.log("🌱 Starting database seed...\n");

    const dataDir = path.join(__dirname, "../src/data");

    // --- Load JSON files ---
    const scenesExtracted: { scenes: SceneExtracted[] } = JSON.parse(
        fs.readFileSync(path.join(dataDir, "scenes_extracted.json"), "utf-8")
    );
    const scenesDescription: { scenes: SceneDescription[] } = JSON.parse(
        fs.readFileSync(path.join(dataDir, "scenes_description.json"), "utf-8")
    );
    const charactersJson: {
        character_descriptions: Record<string, CharacterData>;
    } = JSON.parse(
        fs.readFileSync(path.join(dataDir, "characters.json"), "utf-8")
    );
    const filmIdentityJson = JSON.parse(
        fs.readFileSync(path.join(dataDir, "film_identity.json"), "utf-8")
    );

    // --- Build description lookup ---
    const descriptionMap = new Map<string, SceneDescription>();
    for (const desc of scenesDescription.scenes) {
        descriptionMap.set(desc.scene_id, desc);
    }

    // --- Clear existing data ---
    console.log("🧹 Clearing existing data...");
    await prisma.sceneAssetVersion.deleteMany();
    await prisma.extensionApiToken.deleteMany();
    await prisma.aiPlatform.deleteMany();
    await prisma.scene.deleteMany();
    await prisma.character.deleteMany();
    await prisma.filmIdentity.deleteMany();
    await prisma.project.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();

    // --- Create demo user ---
    console.log("👤 Creating demo user...");
    const passwordHash = await bcrypt.hash("demo1234", 12);
    const user = await prisma.user.create({
        data: {
            name: "Demo User",
            email: "demo@tracker.dev",
            passwordHash,
        },
    });
    console.log(`   ✅ User created: demo@tracker.dev / demo1234`);

    // --- Create Laserman project ---
    console.log("🎬 Creating Laserman project...");
    const project = await prisma.project.create({
        data: {
            name: "Laserman v2",
            description:
                "A retrofuturist neo-noir science fiction film exploring identity, control, and redemption through the lens of a cybernetic bounty hunter.",
            genre: "sci-fi",
            userId: user.id,
        },
    });

    // --- Seed Scenes ---
    console.log(
        `📽️  Seeding ${scenesExtracted.scenes.length} scenes...`
    );
    const sceneData: Prisma.SceneCreateManyInput[] = scenesExtracted.scenes.map((scene, index) => {
        const desc = descriptionMap.get(scene.scene_id);

        const charactersPresent: string[] = [];
        if (desc?.characters_present) {
            for (const cp of desc.characters_present) {
                if (typeof cp === "string") {
                    charactersPresent.push(cp);
                } else if (cp.character) {
                    charactersPresent.push(cp.character);
                } else if (cp.name) {
                    charactersPresent.push(cp.name);
                }
            }
        }

        return {
            sceneId: scene.scene_id,
            projectId: project.id,
            sourceText: scene.source_text,
            reason: scene.reason,
            act: scene.act,
            actTitle: scene.act_title,
            macroScene: scene.macro_scene,
            storyBeat: scene.story_beat,
            narrativePurpose: desc?.narrative_purpose ?? null,
            emotionalTone: desc?.emotional_tone ?? null,
            setting: (desc?.setting ?? undefined) as Prisma.InputJsonValue | undefined,
            camera: (desc?.camera_intent ?? undefined) as Prisma.InputJsonValue | undefined,
            actions: desc?.actions ?? [],
            visualMotifs: desc?.visual_motifs ?? [],
            constraints: desc?.constraints ?? [],
            charactersPresent,
            sortOrder: index,
        };
    });

    await prisma.scene.createMany({ data: sceneData });
    console.log(`   ✅ ${sceneData.length} scenes seeded`);

    // --- Seed Characters ---
    const characterEntries = Object.entries(
        charactersJson.character_descriptions
    );
    console.log(`🎭 Seeding ${characterEntries.length} characters...`);

    for (const [name, data] of characterEntries) {
        const visualCues = data.visual_cues
            ? Object.entries(data.visual_cues).map(([k, v]) => `${k}: ${v}`)
            : [];

        const bodyLanguage: string[] = [];
        if (data.visual_cues?.body_language)
            bodyLanguage.push(data.visual_cues.body_language);
        if (data.visual_cues?.movement)
            bodyLanguage.push(data.visual_cues.movement);
        if (data.visual_cues?.motion)
            bodyLanguage.push(data.visual_cues.motion);
        if (data.visual_cues?.posture)
            bodyLanguage.push(data.visual_cues.posture);

        await prisma.character.create({
            data: {
                name,
                projectId: project.id,
                role: data.role,
                designPhilosophy: data.core_identity,
                visualCues,
                bodyLanguage,
                coreIdentity: data.core_identity,
            },
        });
    }
    console.log(`   ✅ ${characterEntries.length} characters seeded`);

    // --- Seed Film Identity ---
    console.log("🎬 Seeding film identity...");
    await prisma.filmIdentity.create({
        data: {
            projectId: project.id,
            data: filmIdentityJson,
        },
    });
    console.log("   ✅ Film identity seeded");

    // --- Seed platform catalog ---
    console.log(`🧠 Seeding ${PLATFORM_SEED.length} AI platforms...`);
    await prisma.aiPlatform.createMany({
        data: PLATFORM_SEED,
    });
    console.log(`   ✅ ${PLATFORM_SEED.length} AI platforms seeded`);

    console.log("\n🎉 Database seeding complete!");
    console.log("   Login: demo@tracker.dev / demo1234");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error("❌ Seed failed:", e);
        await prisma.$disconnect();
        process.exit(1);
    });
