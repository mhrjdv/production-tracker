import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

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
    const sceneData = scenesExtracted.scenes.map((scene, index) => {
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
            setting: desc?.setting ?? undefined,
            camera: desc?.camera_intent ?? undefined,
            actions: desc?.actions ?? [],
            visualMotifs: desc?.visual_motifs ?? [],
            constraints: desc?.constraints ?? [],
            charactersPresent,
            sortOrder: index,
        };
    });

    await prisma.scene.createMany({ data: sceneData as any });
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
