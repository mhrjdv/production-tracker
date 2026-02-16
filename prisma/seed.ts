import "dotenv/config";
import {
  AssetStatus,
  AssetType,
  Prisma,
  PrismaClient,
  RightsState,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PLATFORM_SEED = [
  {
    slug: "openai-sora",
    name: "ChatGPT Image + Sora",
    provider: "OpenAI",
    homepageUrl: "https://chatgpt.com",
    docsUrl:
      "https://help.openai.com/en/articles/9957612-generating-videos-on-sora",
    specialties: [
      "text-to-video",
      "image-to-video",
      "text-to-image",
      "storyboards",
      "remix",
    ],
    supportedOutput: [AssetType.VIDEO, AssetType.IMAGE, AssetType.STORYBOARD],
    notes:
      "ChatGPT native image generation (GPT Image 1 / GPT-4o) and Sora 2 video generation.",
  },
  {
    slug: "google-veo",
    name: "Veo 3",
    provider: "Google DeepMind",
    homepageUrl: "https://deepmind.google/models/veo/",
    docsUrl: "https://cloud.google.com/vertex-ai/generative-ai/docs/models/veo",
    specialties: [
      "text-to-video",
      "image-to-video",
      "multi-shot control",
      "integrated audio",
      "film-grade",
    ],
    supportedOutput: [AssetType.VIDEO],
    notes:
      "Veo 3 / 3.2 — film-grade video with integrated audio, lighting accuracy, and physical coherence.",
  },
  {
    slug: "runway",
    name: "Runway Gen-4",
    provider: "Runway",
    homepageUrl: "https://runwayml.com",
    docsUrl: "https://help.runwayml.com/hc/en-us",
    specialties: [
      "video generation",
      "editing",
      "inpainting",
      "motion control",
      "VFX",
    ],
    supportedOutput: [AssetType.VIDEO, AssetType.IMAGE],
    notes:
      "Gen-4 — filmmaker-grade video generation with granular creative control.",
  },
  {
    slug: "kling-ai",
    name: "Kling AI",
    provider: "Kuaishou",
    homepageUrl: "https://klingai.com",
    docsUrl: "https://app.klingai.com/global/docs",
    specialties: [
      "text-to-video",
      "image-to-video",
      "motion realism",
      "camera movement",
    ],
    supportedOutput: [AssetType.VIDEO],
    notes: "Used for realistic motion-heavy shot exploration.",
  },
  {
    slug: "luma-dream-machine",
    name: "Luma Ray3",
    provider: "Luma AI",
    homepageUrl: "https://lumalabs.ai",
    docsUrl: "https://lumalabs.ai/learning-hub",
    specialties: [
      "text-to-video",
      "image-to-video",
      "4K HDR",
      "EXR output",
      "ACES workflow",
    ],
    supportedOutput: [AssetType.VIDEO],
    notes:
      "Ray3 HDR — 4K EXR output ready for professional ACES color workflows.",
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
    name: "Midjourney v7",
    provider: "Midjourney",
    homepageUrl: "https://www.midjourney.com",
    docsUrl: "https://docs.midjourney.com/docs/quick-start",
    specialties: [
      "concept art",
      "stylized images",
      "look development",
      "lighting",
      "composition",
    ],
    supportedOutput: [AssetType.IMAGE, AssetType.STORYBOARD],
    notes:
      "V7 — refined lighting, composition, improved hands/anatomy, and cleaner text rendering.",
  },
  {
    slug: "adobe-firefly",
    name: "Adobe Firefly",
    provider: "Adobe",
    homepageUrl: "https://www.adobe.com/products/firefly.html",
    docsUrl: "https://helpx.adobe.com/firefly/get-set-up/learn-the-basics.html",
    specialties: [
      "text-to-image",
      "text-to-video",
      "commercial-safe workflows",
    ],
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
    specialties: [
      "customizable image generation",
      "fine-tuning",
      "open ecosystem",
    ],
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
    specialties: [
      "voice synthesis",
      "narration",
      "dubbing",
      "speech-to-speech",
    ],
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
  {
    slug: "google-gemini",
    name: "Gemini (Nano Banana Pro)",
    provider: "Google",
    homepageUrl: "https://gemini.google.com",
    docsUrl: "https://ai.google.dev/gemini-api/docs/image-generation",
    specialties: [
      "text-to-image",
      "image editing",
      "2K/4K output",
      "text-in-image",
      "multimodal",
    ],
    supportedOutput: [AssetType.IMAGE, AssetType.STORYBOARD],
    notes:
      "Nano Banana Pro (Gemini 3 Pro Image) — 2K/4K images, accurate text, advanced editing.",
  },
  {
    slug: "wan-alibaba",
    name: "WAN",
    provider: "Alibaba",
    homepageUrl: "https://wan-ai.alibaba.com",
    docsUrl: null,
    specialties: ["text-to-video", "image-to-video", "open-source"],
    supportedOutput: [AssetType.VIDEO],
    notes: "Alibaba's open-source video generation model.",
  },
  {
    slug: "canva-ai",
    name: "Canva AI",
    provider: "Canva",
    homepageUrl: "https://www.canva.com/ai-image-generator",
    docsUrl: null,
    specialties: ["design assets", "social media", "template-based generation"],
    supportedOutput: [AssetType.IMAGE, AssetType.VIDEO, AssetType.STORYBOARD],
    notes: "Built-in AI generation within Canva design platform.",
  },
  {
    slug: "seedance",
    name: "Seedance",
    provider: "ByteDance",
    homepageUrl: "https://seedance.ai",
    docsUrl: null,
    specialties: [
      "text-to-video",
      "image-to-video",
      "multi-modal input",
      "character consistency",
    ],
    supportedOutput: [AssetType.VIDEO],
    notes: "Multi-modal video generation with strong character consistency.",
  },
  {
    slug: "minimax-hailuo",
    name: "Hailuo AI",
    provider: "MiniMax",
    homepageUrl: "https://hailuoai.video",
    docsUrl: null,
    specialties: [
      "text-to-video",
      "long-form video",
      "multi-angle consistency",
    ],
    supportedOutput: [AssetType.VIDEO],
    notes: "Generates longer coherent videos with multi-angle consistency.",
  },
  {
    slug: "synthesia",
    name: "Synthesia",
    provider: "Synthesia",
    homepageUrl: "https://www.synthesia.io",
    docsUrl: "https://docs.synthesia.io",
    specialties: [
      "AI avatars",
      "talking head",
      "enterprise video",
      "multilingual",
    ],
    supportedOutput: [AssetType.VIDEO],
    notes: "Digital avatar and AI presenter video generation.",
  },
  {
    slug: "heygen",
    name: "HeyGen",
    provider: "HeyGen",
    homepageUrl: "https://www.heygen.com",
    docsUrl: "https://docs.heygen.com",
    specialties: [
      "talking head",
      "video translation",
      "AI avatars",
      "personalization",
    ],
    supportedOutput: [AssetType.VIDEO],
    notes: "Personalized talking-head videos with AI translation.",
  },
  {
    slug: "descript",
    name: "Descript",
    provider: "Descript",
    homepageUrl: "https://www.descript.com",
    docsUrl: "https://www.descript.com/help",
    specialties: [
      "audio editing",
      "text-based editing",
      "voice cloning",
      "podcast",
    ],
    supportedOutput: [AssetType.AUDIO, AssetType.VOICE, AssetType.NARRATION],
    notes: "AI-powered audio editing and voice generation.",
  },
  {
    slug: "wellsaid",
    name: "WellSaid Labs",
    provider: "WellSaid",
    homepageUrl: "https://wellsaidlabs.com",
    docsUrl: "https://docs.wellsaidlabs.com",
    specialties: ["enterprise TTS", "clear pronunciation", "studio voiceover"],
    supportedOutput: [AssetType.VOICE, AssetType.NARRATION, AssetType.AUDIO],
    notes: "Enterprise AI voice platform for clear, professional speech.",
  },
  {
    slug: "meta-moviegen",
    name: "Movie Gen",
    provider: "Meta",
    homepageUrl: "https://ai.meta.com/research/movie-gen",
    docsUrl: null,
    specialties: ["text-to-video", "video editing", "audio sync"],
    supportedOutput: [AssetType.VIDEO],
    notes: "Meta's foundational video generation model.",
  },
  {
    slug: "pixverse",
    name: "PixVerse",
    provider: "PixVerse",
    homepageUrl: "https://pixverse.ai",
    docsUrl: null,
    specialties: ["text-to-video", "stylized video", "fast generation"],
    supportedOutput: [AssetType.VIDEO],
    notes: "Fast stylized video generation.",
  },
  {
    slug: "stability-video",
    name: "Stable Video",
    provider: "Stability AI",
    homepageUrl: "https://stability.ai",
    docsUrl: "https://platform.stability.ai/docs",
    specialties: ["image-to-video", "video generation", "open ecosystem"],
    supportedOutput: [AssetType.VIDEO],
    notes: "Stability AI's dedicated video generation models.",
  },
  {
    slug: "xai-grok",
    name: "Grok Imagine",
    provider: "xAI",
    homepageUrl: "https://grok.x.ai",
    docsUrl: null,
    specialties: [
      "text-to-image",
      "text-to-video",
      "image generation",
      "audio sync",
      "creative generation",
    ],
    supportedOutput: [AssetType.IMAGE, AssetType.VIDEO, AssetType.STORYBOARD],
    notes:
      "Grok Imagine (Aurora) — image + 10s video generation with synchronized audio.",
  },
  {
    slug: "genmo",
    name: "Genmo",
    provider: "Genmo",
    homepageUrl: "https://www.genmo.ai",
    docsUrl: null,
    specialties: [
      "text-to-video",
      "image-to-video",
      "free tier",
      "creative exploration",
    ],
    supportedOutput: [AssetType.VIDEO],
    notes: "Free-tier video generation for rapid creative exploration.",
  },
  {
    slug: "artlist-ai",
    name: "Artlist AI",
    provider: "Artlist",
    homepageUrl: "https://artlist.io",
    docsUrl: null,
    specialties: [
      "video generation",
      "music generation",
      "voice-over",
      "all-in-one",
    ],
    supportedOutput: [
      AssetType.VIDEO,
      AssetType.MUSIC,
      AssetType.AUDIO,
      AssetType.VOICE,
    ],
    notes:
      "All-in-one AI platform — video, music, and voice-over generation in one subscription.",
  },
  {
    slug: "viggle",
    name: "Viggle",
    provider: "Viggle AI",
    homepageUrl: "https://viggle.ai",
    docsUrl: null,
    specialties: ["character animation", "motion transfer", "pose control"],
    supportedOutput: [AssetType.VIDEO],
    notes: "AI character animation and motion transfer for creative video.",
  },
  {
    slug: "letsenhance",
    name: "Let's Enhance",
    provider: "Let's Enhance",
    homepageUrl: "https://letsenhance.io",
    docsUrl: null,
    specialties: [
      "image-to-video",
      "portrait preservation",
      "identity-consistent video",
    ],
    supportedOutput: [AssetType.VIDEO, AssetType.IMAGE],
    notes:
      "Identity-preserving image-to-video with strong subject consistency.",
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
    fs.readFileSync(path.join(dataDir, "scenes_extracted.json"), "utf-8"),
  );
  const scenesDescription: { scenes: SceneDescription[] } = JSON.parse(
    fs.readFileSync(path.join(dataDir, "scenes_description.json"), "utf-8"),
  );
  const charactersJson: {
    character_descriptions: Record<string, CharacterData>;
  } = JSON.parse(
    fs.readFileSync(path.join(dataDir, "characters.json"), "utf-8"),
  );
  const filmIdentityJson = JSON.parse(
    fs.readFileSync(path.join(dataDir, "film_identity.json"), "utf-8"),
  );

  // --- Build description lookup ---
  const descriptionMap = new Map<string, SceneDescription>();
  for (const desc of scenesDescription.scenes) {
    descriptionMap.set(desc.scene_id, desc);
  }

  // --- Clear existing data ---
  console.log("🧹 Clearing existing data...");
  await prisma.sceneAssetVersion.deleteMany();
  await prisma.promptPackage.deleteMany();
  await prisma.shot.deleteMany();
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

  // --- Create Lazer project ---
  console.log("🎬 Creating Lazer project...");
  const project = await prisma.project.create({
    data: {
      name: "Lazer v2",
      description:
        "A retrofuturist neo-noir science fiction film exploring identity, control, and redemption through the lens of a cybernetic bounty hunter.",
      genre: "sci-fi",
      userId: user.id,
    },
  });

  // --- Seed Scenes ---
  console.log(`📽️  Seeding ${scenesExtracted.scenes.length} scenes...`);
  const sceneData: Prisma.SceneCreateManyInput[] = scenesExtracted.scenes.map(
    (scene, index) => {
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
        setting: (desc?.setting ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        camera: (desc?.camera_intent ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        actions: desc?.actions ?? [],
        visualMotifs: desc?.visual_motifs ?? [],
        constraints: desc?.constraints ?? [],
        charactersPresent,
        sortOrder: index,
      };
    },
  );

  await prisma.scene.createMany({ data: sceneData });
  console.log(`   ✅ ${sceneData.length} scenes seeded`);

  // --- Seed Characters ---
  const characterEntries = Object.entries(
    charactersJson.character_descriptions,
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
    if (data.visual_cues?.motion) bodyLanguage.push(data.visual_cues.motion);
    if (data.visual_cues?.posture) bodyLanguage.push(data.visual_cues.posture);

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

  // --- Lookup scene DB IDs for S001, S002, S003 ---
  const seededScenes = await prisma.scene.findMany({
    where: { projectId: project.id, sceneId: { in: ["S001", "S002", "S003"] } },
    select: { id: true, sceneId: true },
  });
  const sceneMap = new Map(seededScenes.map((s) => [s.sceneId, s.id]));

  // --- Lookup platform DB IDs ---
  const seededPlatforms = await prisma.aiPlatform.findMany({
    select: { id: true, slug: true },
  });
  const platformMap = new Map(seededPlatforms.map((p) => [p.slug, p.id]));

  // ─── Seed Shots for S001, S002, S003 ────────────────────────
  console.log("🎯 Seeding shots for first 3 scenes...");

  const shotSeedData = [
    // S001: The Storm & Lighthouse — establishing shots
    {
      sceneId: sceneMap.get("S001")!,
      shotCode: "SH001",
      description:
        "Wide establishing shot of the lighthouse against a raging storm. Lightning cracks across a bruised sky.",
      angle: "wide",
      movement: "static",
      sortOrder: 0,
    },
    {
      sceneId: sceneMap.get("S001")!,
      shotCode: "SH002",
      description:
        "Medium shot of Lazer emerging from the darkness, rain streaming off cybernetic implants.",
      angle: "medium",
      movement: "dolly",
      sortOrder: 1,
    },
    {
      sceneId: sceneMap.get("S001")!,
      shotCode: "SH003",
      description:
        "Close-up on Lazer's eye — half human, half synthetic lens — reflecting the lighthouse beam.",
      angle: "close-up",
      movement: "static",
      sortOrder: 2,
    },
    // S002: continuation
    {
      sceneId: sceneMap.get("S002")!,
      shotCode: "SH001",
      description:
        "Interior lighthouse, harsh overhead light. Lazer examines a cracked holographic map.",
      angle: "medium",
      movement: "pan",
      sortOrder: 0,
    },
    {
      sceneId: sceneMap.get("S002")!,
      shotCode: "SH002",
      description:
        "Over-the-shoulder shot of the map revealing a target location pulsing red.",
      angle: "OTS",
      movement: "static",
      sortOrder: 1,
    },
    // S003: continuation
    {
      sceneId: sceneMap.get("S003")!,
      shotCode: "SH001",
      description:
        "Drone shot pulling back from the lighthouse to reveal a desolate coastline stretching into fog.",
      angle: "aerial",
      movement: "crane",
      sortOrder: 0,
    },
    {
      sceneId: sceneMap.get("S003")!,
      shotCode: "SH002",
      description:
        "Insert shot of Lazer's hand gripping a worn photo — the only keepsake from before the accident.",
      angle: "insert",
      movement: "static",
      sortOrder: 1,
    },
  ];

  const shots: { id: string; sceneId: string; shotCode: string }[] = [];
  for (const sd of shotSeedData) {
    const shot = await prisma.shot.create({ data: sd });
    shots.push(shot);
  }
  console.log(`   ✅ ${shots.length} shots seeded`);

  // Helper to find shot ID
  const shotId = (sceneCode: string, shotCode: string) => {
    const sceneDbId = sceneMap.get(sceneCode)!;
    return (
      shots.find((s) => s.sceneId === sceneDbId && s.shotCode === shotCode)
        ?.id ?? null
    );
  };

  // ─── Seed Asset Versions — covering ALL scenarios ───────────
  console.log("🖼️  Seeding asset versions across all statuses and types...");

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);

  const assetSeeds: Prisma.SceneAssetVersionCreateInput[] = [
    // ────── S001: Multi-status workflow showcase ──────
    // IMAGE: Draft concept (just captured, not yet generated)
    {
      scene: { connect: { id: sceneMap.get("S001")! } },
      shot: { connect: { id: shotId("S001", "SH001")! } },
      platform: { connect: { id: platformMap.get("midjourney")! } },
      platformKey: "midjourney",
      platformLabel: "Midjourney",
      assetType: AssetType.IMAGE,
      status: AssetStatus.DRAFT,
      versionNumber: 1,
      title: "Lighthouse storm concept — draft",
      prompt:
        "Retrofuturist lighthouse against a raging storm, cyberpunk noir aesthetic, dramatic lightning, 8k cinematic, ultra-wide angle --ar 21:9 --v 6",
      negativePrompt: "cartoon, anime, bright colors, daytime",
      modelName: "Midjourney v6",
      sourceUrl: "https://www.midjourney.com/app/jobs/abc123",
      tags: ["concept", "establishing", "storm"],
      metadata: { seed: 42, steps: 50 } as unknown as Prisma.InputJsonValue,
      notes: "First draft — need more dramatic lightning",
      createdBy: { connect: { id: user.id } },
      createdAt: hoursAgo(48),
    },
    // IMAGE: Generated version from FLUX (ready for review)
    {
      scene: { connect: { id: sceneMap.get("S001")! } },
      shot: { connect: { id: shotId("S001", "SH001")! } },
      platform: { connect: { id: platformMap.get("bfl-flux")! } },
      platformKey: "bfl-flux",
      platformLabel: "FLUX",
      assetType: AssetType.IMAGE,
      status: AssetStatus.GENERATED,
      versionNumber: 2,
      title: "Lighthouse storm — FLUX pass",
      prompt:
        "A massive weathered lighthouse standing against a violent thunderstorm, cybernetic-noir aesthetic, rain-slicked surfaces reflecting neon, lightning arcs, volumetric fog, cinematic 21:9 aspect ratio",
      modelName: "FLUX.1 Pro",
      sourceUrl: "https://blackforestlabs.ai/gen/xyz789",
      outputUrl:
        "https://placehold.co/1920x820/1a1a2e/8bc34a?text=FLUX+Lighthouse",
      thumbnailUrl:
        "https://placehold.co/400x170/1a1a2e/8bc34a?text=FLUX+Thumb",
      tags: ["concept", "establishing", "storm", "pass-2"],
      metadata: {
        seed: 7890,
        guidance: 7.5,
      } as unknown as Prisma.InputJsonValue,
      createdBy: { connect: { id: user.id } },
      createdAt: hoursAgo(24),
    },
    // IMAGE: Selected winner from Midjourney (selected=true)
    {
      scene: { connect: { id: sceneMap.get("S001")! } },
      shot: { connect: { id: shotId("S001", "SH001")! } },
      platform: { connect: { id: platformMap.get("midjourney")! } },
      platformKey: "midjourney",
      platformLabel: "Midjourney",
      assetType: AssetType.IMAGE,
      status: AssetStatus.SELECTED,
      selected: true,
      versionNumber: 3,
      title: "Lighthouse storm — HERO",
      prompt:
        "Retrofuturist lighthouse against a raging storm, cyberpunk noir aesthetic, dramatic forked lightning, rain-slicked rocks, volumetric god-rays, 8k cinematic --ar 21:9 --v 6 --style raw",
      negativePrompt: "cartoon, anime, bright colors, daytime, sunny",
      modelName: "Midjourney v6",
      sourceUrl: "https://www.midjourney.com/app/jobs/hero456",
      outputUrl:
        "https://placehold.co/1920x820/0d1117/8bc34a?text=HERO+Lighthouse",
      thumbnailUrl:
        "https://placehold.co/400x170/0d1117/8bc34a?text=HERO+Thumb",
      tags: ["hero", "establishing", "storm", "selected"],
      rightsState: RightsState.NON_COMMERCIAL,
      metadata: {
        seed: 1337,
        steps: 60,
        quality: 2,
      } as unknown as Prisma.InputJsonValue,
      notes: "Best composition. Lightning fork framing is perfect.",
      createdBy: { connect: { id: user.id } },
      createdAt: hoursAgo(12),
    },
    // VIDEO: Generated from Sora (based on hero image)
    {
      scene: { connect: { id: sceneMap.get("S001")! } },
      shot: { connect: { id: shotId("S001", "SH002")! } },
      platform: { connect: { id: platformMap.get("openai-sora")! } },
      platformKey: "openai-sora",
      platformLabel: "Sora",
      assetType: AssetType.VIDEO,
      status: AssetStatus.GENERATED,
      versionNumber: 1,
      title: "Lazer emerges — Sora v1",
      prompt:
        "Cinematic medium shot: a cybernetic bounty hunter emerges from darkness into pouring rain. Camera dollies forward slowly. Lightning illuminates chrome implants. Neo-noir color palette, 24fps film grain.",
      modelName: "Sora",
      sourceUrl: "https://sora.com/create/vid_abc",
      outputUrl: "https://placehold.co/1920x1080/141b23/34d399?text=Sora+Video",
      thumbnailUrl:
        "https://placehold.co/400x225/141b23/34d399?text=Sora+Thumb",
      tags: ["video", "character-intro", "dolly"],
      metadata: {
        duration_sec: 4,
        resolution: "1080p",
        fps: 24,
      } as unknown as Prisma.InputJsonValue,
      generationSeconds: 180,
      costEstimateUsd: 0.1,
      createdBy: { connect: { id: user.id } },
      createdAt: hoursAgo(6),
    },
    // IMAGE: Rejected version (bad composition)
    {
      scene: { connect: { id: sceneMap.get("S001")! } },
      shot: { connect: { id: shotId("S001", "SH003")! } },
      platform: { connect: { id: platformMap.get("freepik-ai")! } },
      platformKey: "freepik-ai",
      platformLabel: "Freepik AI Suite",
      assetType: AssetType.IMAGE,
      status: AssetStatus.REJECTED,
      versionNumber: 1,
      title: "Eye close-up — rejected",
      prompt:
        "Extreme close-up of a cybernetic eye, half human half synthetic lens, lighthouse beam reflecting in the iris, macro photography, sci-fi noir",
      modelName: "Freepik Mystic v2",
      sourceUrl: "https://www.freepik.com/pikaso/gen/xyz",
      outputUrl: "https://placehold.co/1024x1024/2d1b1b/f87171?text=Rejected",
      thumbnailUrl: "https://placehold.co/400x400/2d1b1b/f87171?text=Rejected",
      tags: ["close-up", "eye", "rejected"],
      notes:
        "Eye detail is good but composition feels too clinical. Need more emotion.",
      createdBy: { connect: { id: user.id } },
      createdAt: hoursAgo(36),
    },

    // ────── S002: Compare scenario — multiple generated versions ──────
    // IMAGE v1: Midjourney interior
    {
      scene: { connect: { id: sceneMap.get("S002")! } },
      shot: { connect: { id: shotId("S002", "SH001")! } },
      platform: { connect: { id: platformMap.get("midjourney")! } },
      platformKey: "midjourney",
      platformLabel: "Midjourney",
      assetType: AssetType.IMAGE,
      status: AssetStatus.GENERATED,
      versionNumber: 1,
      title: "Interior lighthouse — Midjourney",
      prompt:
        "Interior of a weathered lighthouse, harsh overhead light casting dramatic shadows, a cybernetic man examines a cracked holographic map, retrofuturist noir --ar 16:9 --v 6",
      modelName: "Midjourney v6",
      sourceUrl: "https://www.midjourney.com/app/jobs/int_mj1",
      outputUrl:
        "https://placehold.co/1600x900/1a222d/8bc34a?text=MJ+Interior+v1",
      thumbnailUrl:
        "https://placehold.co/400x225/1a222d/8bc34a?text=MJ+Int+Thumb",
      tags: ["interior", "map", "compare-group-a"],
      compareGroup: "S002-interior",
      createdBy: { connect: { id: user.id } },
      createdAt: hoursAgo(20),
    },
    // IMAGE v2: FLUX interior
    {
      scene: { connect: { id: sceneMap.get("S002")! } },
      shot: { connect: { id: shotId("S002", "SH001")! } },
      platform: { connect: { id: platformMap.get("bfl-flux")! } },
      platformKey: "bfl-flux",
      platformLabel: "FLUX",
      assetType: AssetType.IMAGE,
      status: AssetStatus.GENERATED,
      versionNumber: 2,
      title: "Interior lighthouse — FLUX",
      prompt:
        "Inside a cylindrical lighthouse room, harsh white overhead light, a man with visible cybernetic augmentations studies a flickering holographic map, cracks spider-webbing across the projection, dark sci-fi noir atmosphere",
      modelName: "FLUX.1 Pro",
      sourceUrl: "https://blackforestlabs.ai/gen/int_flux1",
      outputUrl:
        "https://placehold.co/1600x900/0d1117/34d399?text=FLUX+Interior+v2",
      thumbnailUrl:
        "https://placehold.co/400x225/0d1117/34d399?text=FLUX+Int+Thumb",
      tags: ["interior", "map", "compare-group-a"],
      compareGroup: "S002-interior",
      createdBy: { connect: { id: user.id } },
      createdAt: hoursAgo(18),
    },
    // IMAGE v3: Ideogram interior
    {
      scene: { connect: { id: sceneMap.get("S002")! } },
      shot: { connect: { id: shotId("S002", "SH001")! } },
      platform: { connect: { id: platformMap.get("ideogram")! } },
      platformKey: "ideogram",
      platformLabel: "Ideogram",
      assetType: AssetType.IMAGE,
      status: AssetStatus.GENERATED,
      versionNumber: 3,
      title: "Interior lighthouse — Ideogram",
      prompt:
        "Moody lighthouse interior, single overhead bulb, a scarred cybernetic figure bends over a glitching hologram map, text overlay 'CLASSIFIED' watermarked across the projection, neo-noir",
      modelName: "Ideogram 2.0",
      sourceUrl: "https://ideogram.ai/g/gen_ideo1",
      outputUrl:
        "https://placehold.co/1600x900/222d3a/fbbf24?text=Ideogram+Interior+v3",
      thumbnailUrl:
        "https://placehold.co/400x225/222d3a/fbbf24?text=Ideo+Int+Thumb",
      tags: ["interior", "map", "compare-group-a", "text-overlay"],
      compareGroup: "S002-interior",
      createdBy: { connect: { id: user.id } },
      createdAt: hoursAgo(16),
    },
    // IMAGE v4: Selected winner from compare
    {
      scene: { connect: { id: sceneMap.get("S002")! } },
      shot: { connect: { id: shotId("S002", "SH001")! } },
      platform: { connect: { id: platformMap.get("midjourney")! } },
      platformKey: "midjourney",
      platformLabel: "Midjourney",
      assetType: AssetType.IMAGE,
      status: AssetStatus.SELECTED,
      selected: true,
      versionNumber: 4,
      title: "Interior lighthouse — HERO (refined MJ)",
      prompt:
        "Interior of a weathered lighthouse, harsh overhead light, a cybernetic man examines a cracked holographic map showing a pulsing red target, dramatic shadows, retrofuturist noir, volumetric light rays --ar 16:9 --v 6 --style raw",
      modelName: "Midjourney v6",
      sourceUrl: "https://www.midjourney.com/app/jobs/int_mj_hero",
      outputUrl:
        "https://placehold.co/1600x900/1a222d/e8ecf2?text=HERO+Interior",
      thumbnailUrl:
        "https://placehold.co/400x225/1a222d/e8ecf2?text=HERO+Int+Thumb",
      tags: ["interior", "map", "hero", "selected"],
      compareGroup: "S002-interior",
      rightsState: RightsState.NON_COMMERCIAL,
      notes: "Winner from compare session. Best lighting and map detail.",
      createdBy: { connect: { id: user.id } },
      createdAt: hoursAgo(10),
    },
    // VIDEO: OTS shot — needs review
    {
      scene: { connect: { id: sceneMap.get("S002")! } },
      shot: { connect: { id: shotId("S002", "SH002")! } },
      platform: { connect: { id: platformMap.get("google-veo")! } },
      platformKey: "google-veo",
      platformLabel: "Veo",
      assetType: AssetType.VIDEO,
      status: AssetStatus.NEEDS_REVIEW,
      versionNumber: 1,
      title: "Map reveal OTS — Veo",
      prompt:
        "Over-the-shoulder shot of a cybernetic man looking at a holographic map. The camera slowly pushes in as a target location pulses red. Dark lighthouse interior, film grain, 24fps.",
      modelName: "Veo 2.0",
      sourceUrl: "https://aistudio.google.com/veo/proj_abc",
      outputUrl:
        "https://placehold.co/1920x1080/141b23/fbbf24?text=Veo+OTS+Video",
      thumbnailUrl:
        "https://placehold.co/400x225/141b23/fbbf24?text=Veo+OTS+Thumb",
      tags: ["video", "OTS", "map-reveal", "needs-review"],
      metadata: {
        duration_sec: 3,
        resolution: "1080p",
      } as unknown as Prisma.InputJsonValue,
      generationSeconds: 240,
      createdBy: { connect: { id: user.id } },
      createdAt: hoursAgo(4),
    },

    // ────── S003: Full workflow + music/voice ──────
    // IMAGE: Final (approved and locked)
    {
      scene: { connect: { id: sceneMap.get("S003")! } },
      shot: { connect: { id: shotId("S003", "SH001")! } },
      platform: { connect: { id: platformMap.get("midjourney")! } },
      platformKey: "midjourney",
      platformLabel: "Midjourney",
      assetType: AssetType.IMAGE,
      status: AssetStatus.FINAL,
      selected: true,
      versionNumber: 1,
      title: "Drone coastline pullback — FINAL",
      prompt:
        "Drone aerial shot looking down at a weathered lighthouse on a desolate rocky coastline, dense fog rolling in from the sea, cyberpunk-noir color grade, ultra-wide cinematic --ar 21:9 --v 6 --style raw",
      modelName: "Midjourney v6",
      sourceUrl: "https://www.midjourney.com/app/jobs/drone_final",
      outputUrl: "https://placehold.co/1920x820/0d1117/8bc34a?text=FINAL+Drone",
      thumbnailUrl:
        "https://placehold.co/400x170/0d1117/8bc34a?text=FINAL+Drone+Thumb",
      tags: ["drone", "establishing", "final", "locked"],
      rightsState: RightsState.COMMERCIAL_ALLOWED,
      notes: "Locked for edit. Approved by director.",
      createdBy: { connect: { id: user.id } },
      createdAt: hoursAgo(72),
    },
    // VIDEO: Approved (ready for final cut)
    {
      scene: { connect: { id: sceneMap.get("S003")! } },
      shot: { connect: { id: shotId("S003", "SH001")! } },
      platform: { connect: { id: platformMap.get("runway")! } },
      platformKey: "runway",
      platformLabel: "Runway",
      assetType: AssetType.VIDEO,
      status: AssetStatus.APPROVED,
      selected: true,
      versionNumber: 1,
      title: "Drone pullback — Runway video",
      prompt:
        "Cinematic drone shot pulling back from a lighthouse to reveal a desolate foggy coastline. Slow, majestic movement. Dark color palette with hints of green from distant ship lights. 24fps, film grain.",
      modelName: "Gen-3 Alpha Turbo",
      sourceUrl: "https://app.runwayml.com/gen/abc",
      outputUrl:
        "https://placehold.co/1920x1080/141b23/34d399?text=Runway+Drone+Video",
      thumbnailUrl:
        "https://placehold.co/400x225/141b23/34d399?text=Runway+Drone+Thumb",
      tags: ["video", "drone", "approved"],
      rightsState: RightsState.COMMERCIAL_ALLOWED,
      metadata: {
        duration_sec: 6,
        resolution: "1080p",
        fps: 24,
      } as unknown as Prisma.InputJsonValue,
      generationSeconds: 300,
      costEstimateUsd: 0.25,
      notes: "Approved for assembly. Beautiful fog roll.",
      createdBy: { connect: { id: user.id } },
      createdAt: hoursAgo(48),
    },
    // MUSIC: Generated ambient score
    {
      scene: { connect: { id: sceneMap.get("S003")! } },
      platform: { connect: { id: platformMap.get("suno")! } },
      platformKey: "suno",
      platformLabel: "Suno",
      assetType: AssetType.MUSIC,
      status: AssetStatus.GENERATED,
      versionNumber: 1,
      title: "Ambient storm underscore",
      prompt:
        "Dark ambient electronic score, low rumbling bass, distant thunder samples, eerie synth pads, tension building, cinematic soundtrack, 120 BPM, minor key, no vocals",
      modelName: "Suno v4",
      sourceUrl: "https://suno.com/song/abc123",
      outputUrl: "https://placehold.co/800x800/1a1a2e/fbbf24?text=Suno+Music",
      thumbnailUrl:
        "https://placehold.co/400x400/1a1a2e/fbbf24?text=Suno+Thumb",
      tags: ["ambient", "underscore", "storm", "tension"],
      metadata: {
        duration_sec: 30,
        bpm: 120,
        key: "Dm",
      } as unknown as Prisma.InputJsonValue,
      createdBy: { connect: { id: user.id } },
      createdAt: hoursAgo(8),
    },
    // NARRATION: Reviewed voiceover
    {
      scene: { connect: { id: sceneMap.get("S003")! } },
      platform: { connect: { id: platformMap.get("elevenlabs")! } },
      platformKey: "elevenlabs",
      platformLabel: "ElevenLabs",
      assetType: AssetType.NARRATION,
      status: AssetStatus.REVIEWED,
      versionNumber: 1,
      title: "Opening narration — ElevenLabs",
      prompt:
        "Deep, gravelly male voice. Slow, contemplative delivery: 'Before the accident, I was just a man. After it... I became something else. Something that hunts in the dark.'",
      modelName: "Eleven Multilingual v2",
      sourceUrl: "https://elevenlabs.io/speech/proj_narr1",
      outputUrl:
        "https://placehold.co/800x200/1a222d/e8ecf2?text=Narration+Audio",
      thumbnailUrl:
        "https://placehold.co/400x100/1a222d/e8ecf2?text=Narr+Thumb",
      tags: ["narration", "opening", "voiceover"],
      metadata: {
        duration_sec: 8,
        voice_id: "onwK4e9ZLuTAKqWW03F9",
        stability: 0.65,
      } as unknown as Prisma.InputJsonValue,
      notes: "Good tone, might need slightly slower pacing.",
      createdBy: { connect: { id: user.id } },
      createdAt: hoursAgo(5),
    },
    // IMAGE: Archived old concept
    {
      scene: { connect: { id: sceneMap.get("S003")! } },
      shot: { connect: { id: shotId("S003", "SH002")! } },
      platform: { connect: { id: platformMap.get("stability-ai")! } },
      platformKey: "stability-ai",
      platformLabel: "Stable Diffusion",
      assetType: AssetType.IMAGE,
      status: AssetStatus.ARCHIVED,
      versionNumber: 1,
      title: "Hand with photo — archived concept",
      prompt:
        "Close-up of a scarred cybernetic hand holding a worn, faded photograph. The edges are burned. Dramatic side lighting. Shallow depth of field.",
      modelName: "SDXL 1.0",
      sourceUrl: "https://stability.ai/gen/old_concept",
      outputUrl: "https://placehold.co/1024x1024/2d2d2d/8b95a5?text=Archived",
      thumbnailUrl:
        "https://placehold.co/400x400/2d2d2d/8b95a5?text=Archived+Thumb",
      tags: ["insert", "hand", "photo", "archived"],
      notes: "Superseded by newer concept direction. Kept for reference.",
      createdBy: { connect: { id: user.id } },
      createdAt: hoursAgo(96),
    },
  ];

  let assetCount = 0;
  for (const assetInput of assetSeeds) {
    await prisma.sceneAssetVersion.create({ data: assetInput });
    assetCount++;
  }
  console.log(`   ✅ ${assetCount} asset versions seeded across S001-S003`);
  console.log(
    "      Statuses covered: DRAFT, GENERATED, SELECTED, NEEDS_REVIEW, REVIEWED, APPROVED, FINAL, REJECTED, ARCHIVED",
  );
  console.log("      Types covered: IMAGE, VIDEO, MUSIC, NARRATION");
  console.log(
    "      Platforms covered: Midjourney, FLUX, Sora, Veo, Runway, Freepik, Ideogram, Suno, ElevenLabs, Stable Diffusion",
  );

  // ─── Seed SceneCharacter junction records ──────────────────────
  console.log("🔗 Seeding scene-character assignments...");

  // Build character name -> DB id lookup
  const seededCharacters = await prisma.character.findMany({
    where: { projectId: project.id },
    select: { id: true, name: true },
  });
  const charNameMap = new Map(seededCharacters.map((c) => [c.name, c.id]));

  // Query all scenes with their charactersPresent arrays
  const allScenes = await prisma.scene.findMany({
    where: { projectId: project.id },
    select: { id: true, sceneId: true, charactersPresent: true },
  });

  let sceneCharCount = 0;
  for (const scene of allScenes) {
    for (const charName of scene.charactersPresent) {
      const characterId = charNameMap.get(charName);
      if (characterId) {
        await prisma.sceneCharacter.create({
          data: { sceneId: scene.id, characterId },
        });
        sceneCharCount++;
      }
    }
  }
  console.log(`   ✅ ${sceneCharCount} scene-character assignments seeded`);

  // ─── Seed ShotCharacter junction records ──────────────────────
  console.log("🔗 Seeding shot-character assignments...");

  const shotCharSeeds: {
    shotSceneCode: string;
    shotCode: string;
    charName: string;
    role?: string;
  }[] = [
    // S001: Lazer is in all shots
    {
      shotSceneCode: "S001",
      shotCode: "SH001",
      charName: "Lazer",
      role: "background",
    },
    {
      shotSceneCode: "S001",
      shotCode: "SH002",
      charName: "Lazer",
      role: "featured",
    },
    {
      shotSceneCode: "S001",
      shotCode: "SH003",
      charName: "Lazer",
      role: "featured",
    },
    // S002: Lazer examining the map
    {
      shotSceneCode: "S002",
      shotCode: "SH001",
      charName: "Lazer",
      role: "featured",
    },
    {
      shotSceneCode: "S002",
      shotCode: "SH002",
      charName: "Lazer",
      role: "featured",
    },
    // S003: Lazer in the pullback + insert
    {
      shotSceneCode: "S003",
      shotCode: "SH001",
      charName: "Lazer",
      role: "background",
    },
    {
      shotSceneCode: "S003",
      shotCode: "SH002",
      charName: "Lazer",
      role: "featured",
    },
  ];

  let shotCharCount = 0;
  for (const sc of shotCharSeeds) {
    const sId = shotId(sc.shotSceneCode, sc.shotCode);
    const cId = charNameMap.get(sc.charName);
    if (sId && cId) {
      await prisma.shotCharacter.create({
        data: { shotId: sId, characterId: cId, role: sc.role ?? null },
      });
      shotCharCount++;
    }
  }
  console.log(`   ✅ ${shotCharCount} shot-character assignments seeded`);

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
