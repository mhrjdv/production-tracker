/**
 * Import Script: Upload images to R2 + seed database with full Laserman project
 *
 * Usage:
 *   npx tsx scripts/import-project.ts
 *
 * This script:
 * 1. Uploads all images from project_Laserman_v2/IMAGE GEN/ to Cloudflare R2
 * 2. Clears all existing data
 * 3. Creates the demo user + project
 * 4. Seeds all 246 scenes, 11 characters (with portrait URLs), film identity
 * 5. Creates asset versions for character sheets and environment concept art
 */

import "dotenv/config";
import {
  AssetStatus,
  AssetType,
  Prisma,
  PrismaClient,
  RightsState,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

// ─── Config ────────────────────────────────────────────────

const PROJECT_DIR = path.join(__dirname, "../project_Laserman_v2");
const DATA_DIR = path.join(__dirname, "../src/data");
const IMAGE_DIR = path.join(PROJECT_DIR, "IMAGE GEN");

const R2_BUCKET = process.env.R2_BUCKET_NAME || "production-tracker";
const R2_PUBLIC_URL =
  process.env.R2_PUBLIC_URL ||
  "https://pub-15baef71f1364d1e867fa9a59fcb3717.r2.dev";

// ─── Clients ───────────────────────────────────────────────

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2 credentials in .env");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// ─── Types ─────────────────────────────────────────────────

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

interface UploadedImage {
  localPath: string;
  r2Url: string;
  key: string;
  category: "character" | "environment" | "title";
  characterName: string | null;
  subfolder: string | null;
  filename: string;
}

// ─── Character name mapping (folder -> DB name) ────────────

const CHARACTER_FOLDER_MAP: Record<string, string> = {
  "LASER MAN": "Laser Man",
  "CHASHMEBADOOR ROY": "Chashmebaddur Roy",
  EIGHTDRIAN: "Eightdrian",
  GRANDFATHER: "Grandfather",
  Glitcher: "Glitcher",
  "OZZY THE OWL": "Ozzy the Owl",
  SANDMAN: "Sandman",
  SLEDGEHAMMER: "Sledgehammer",
  SREELATHA: "Shreelatha",
  "Villain Leader": "Villain Leader",
  Vyom: "Vyom Bakshi",
};

// Which image to use as portrait for each character
const PORTRAIT_PREFERENCE: Record<string, string[]> = {
  "Laser Man": ["Updated Logo/Headshot.png", "Updated Logo/Headshot 2.png"],
  "Vyom Bakshi": ["Costume 1.png", "Costume 1/Costume 1 Closeup.png"],
  Shreelatha: ["Studio.png"],
  Grandfather: ["Grandpa Close up.png", "Pass 2/Grandpa_close.png"],
  "Chashmebaddur Roy": [
    "Optometrist_Full_Body.png",
    "Pass 2/Optometrist_Close.png",
  ],
  Eightdrian: ["Eightdrian Close.png"],
  "Ozzy the Owl": ["Ozzy Close.png", "Ozzy_Close.png"],
  Sledgehammer: ["sledgehammer_close.png"],
  Glitcher: ["Glitcher_Close.png"],
  Sandman: ["Sandman_Close.png"],
  "Villain Leader": ["leader_close.png"],
};

// ─── Upload functions ──────────────────────────────────────

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

async function uploadFile(
  r2: S3Client,
  localPath: string,
  r2Key: string,
): Promise<string> {
  const buffer = fs.readFileSync(localPath);
  const contentType = getMimeType(localPath);

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${R2_PUBLIC_URL}/${r2Key}`;
}

function collectImages(projectId: string): {
  localPath: string;
  r2Key: string;
  category: "character" | "environment" | "title";
  characterName: string | null;
  subfolder: string | null;
  filename: string;
}[] {
  const results: ReturnType<typeof collectImages> = [];

  // Title image
  const titlePath = path.join(IMAGE_DIR, "Title.png");
  if (fs.existsSync(titlePath)) {
    results.push({
      localPath: titlePath,
      r2Key: `projects/${projectId}/title/Title.png`,
      category: "title",
      characterName: null,
      subfolder: null,
      filename: "Title.png",
    });
  }

  // Character images
  const charsDir = path.join(IMAGE_DIR, "Characters");
  if (fs.existsSync(charsDir)) {
    for (const entry of fs.readdirSync(charsDir)) {
      const entryPath = path.join(charsDir, entry);
      const stat = fs.statSync(entryPath);

      if (stat.isFile() && /\.(png|jpg|jpeg|webp)$/i.test(entry)) {
        // Top-level character images (Cast.png, Cast 2.png)
        const safeName = entry.replace(/[^a-zA-Z0-9._-]/g, "_");
        results.push({
          localPath: entryPath,
          r2Key: `projects/${projectId}/characters/_cast/${safeName}`,
          category: "character",
          characterName: null,
          subfolder: null,
          filename: entry,
        });
      } else if (stat.isDirectory()) {
        const charName = CHARACTER_FOLDER_MAP[entry] ?? entry;
        collectImagesRecursive(
          entryPath,
          `projects/${projectId}/characters/${slugify(charName)}`,
          charName,
          "character",
          results,
        );
      }
    }
  }

  // Environment images
  const envDir = path.join(IMAGE_DIR, "Environment");
  if (fs.existsSync(envDir)) {
    for (const entry of fs.readdirSync(envDir)) {
      const entryPath = path.join(envDir, entry);
      const stat = fs.statSync(entryPath);

      if (stat.isFile() && /\.(png|jpg|jpeg|webp)$/i.test(entry)) {
        const safeName = entry.replace(/[^a-zA-Z0-9._-]/g, "_");
        results.push({
          localPath: entryPath,
          r2Key: `projects/${projectId}/environments/_root/${safeName}`,
          category: "environment",
          characterName: null,
          subfolder: null,
          filename: entry,
        });
      } else if (stat.isDirectory()) {
        collectImagesRecursive(
          entryPath,
          `projects/${projectId}/environments/${slugify(entry)}`,
          null,
          "environment",
          results,
        );
      }
    }
  }

  return results;
}

function collectImagesRecursive(
  dirPath: string,
  r2Prefix: string,
  characterName: string | null,
  category: "character" | "environment",
  results: {
    localPath: string;
    r2Key: string;
    category: "character" | "environment" | "title";
    characterName: string | null;
    subfolder: string | null;
    filename: string;
  }[],
) {
  for (const entry of fs.readdirSync(dirPath)) {
    if (entry.startsWith(".")) continue;
    const entryPath = path.join(dirPath, entry);
    const stat = fs.statSync(entryPath);

    if (stat.isFile() && /\.(png|jpg|jpeg|webp)$/i.test(entry)) {
      const safeName = entry.replace(/[^a-zA-Z0-9._-]/g, "_");
      results.push({
        localPath: entryPath,
        r2Key: `${r2Prefix}/${safeName}`,
        category,
        characterName,
        subfolder: path.basename(dirPath),
        filename: entry,
      });
    } else if (stat.isDirectory()) {
      collectImagesRecursive(
        entryPath,
        `${r2Prefix}/${slugify(entry)}`,
        characterName,
        category,
        results,
      );
    }
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Platform seed data ────────────────────────────────────

// Import the shared platform catalog from seed.ts-compatible format
// This is the canonical 2026 platform list
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

// ─── Main ──────────────────────────────────────────────────

async function main() {
  console.log("=== Laserman V2 Full Import ===\n");

  // Generate a project ID upfront for R2 key paths
  const projectDbId = randomUUID();

  // ── Step 1: Collect & upload images to R2 ──────────────────

  console.log("📸 Collecting images...");
  const imageList = collectImages(projectDbId);
  console.log(`   Found ${imageList.length} images to upload\n`);

  const r2 = getR2Client();
  const uploaded: UploadedImage[] = [];
  let uploadCount = 0;

  for (const img of imageList) {
    uploadCount++;
    const pct = ((uploadCount / imageList.length) * 100).toFixed(0);
    process.stdout.write(
      `\r   Uploading [${uploadCount}/${imageList.length}] ${pct}% — ${img.filename}`.padEnd(
        80,
      ),
    );

    try {
      const r2Url = await uploadFile(r2, img.localPath, img.r2Key);
      uploaded.push({
        localPath: img.localPath,
        r2Url,
        key: img.r2Key,
        category: img.category,
        characterName: img.characterName,
        subfolder: img.subfolder,
        filename: img.filename,
      });
    } catch (err) {
      console.error(
        `\n   ⚠️  Failed to upload ${img.filename}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
  console.log(
    `\n   ✅ ${uploaded.length}/${imageList.length} images uploaded to R2\n`,
  );

  // Build portrait URL map
  const portraitUrls = new Map<string, string>();
  for (const [charName, prefs] of Object.entries(PORTRAIT_PREFERENCE)) {
    for (const pref of prefs) {
      const found = uploaded.find(
        (u) => u.characterName === charName && u.localPath.endsWith(pref),
      );
      if (found) {
        portraitUrls.set(charName, found.r2Url);
        break;
      }
    }
  }
  console.log(
    `   Portrait URLs resolved: ${portraitUrls.size}/${Object.keys(PORTRAIT_PREFERENCE).length}\n`,
  );

  // ── Step 2: Load JSON data ─────────────────────────────────

  console.log("📄 Loading JSON data files...");
  const scenesExtracted: { scenes: SceneExtracted[] } = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "scenes_extracted.json"), "utf-8"),
  );
  const scenesDescription: { scenes: SceneDescription[] } = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "scenes_description.json"), "utf-8"),
  );
  const charactersJson: {
    character_descriptions: Record<string, CharacterData>;
  } = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "characters.json"), "utf-8"),
  );
  const filmIdentityJson = JSON.parse(
    fs.readFileSync(
      path.join(PROJECT_DIR, "film_identity_context.json"),
      "utf-8",
    ),
  );

  const descriptionMap = new Map<string, SceneDescription>();
  for (const desc of scenesDescription.scenes) {
    descriptionMap.set(desc.scene_id, desc);
  }
  console.log(
    `   ${scenesExtracted.scenes.length} scenes, ${Object.keys(charactersJson.character_descriptions).length} characters loaded\n`,
  );

  // ── Step 3: Clear existing data ────────────────────────────

  console.log("🧹 Clearing existing data...");
  await prisma.sceneAssetVersion.deleteMany();
  await prisma.promptPackage.deleteMany();
  await prisma.shotCharacter.deleteMany();
  await prisma.sceneCharacter.deleteMany();
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
  console.log("   ✅ All data cleared\n");

  // ── Step 4: Create demo user ───────────────────────────────

  console.log("👤 Creating demo user...");
  const passwordHash = await bcrypt.hash("demo1234", 12);
  const user = await prisma.user.create({
    data: {
      name: "Demo User",
      email: "demo@tracker.dev",
      passwordHash,
    },
  });
  console.log("   ✅ demo@tracker.dev / demo1234\n");

  // ── Step 5: Create project ─────────────────────────────────

  console.log("🎬 Creating Laserman V2 project...");

  // Find title image URL
  const titleImage = uploaded.find((u) => u.category === "title");

  const project = await prisma.project.create({
    data: {
      id: projectDbId,
      name: "Laserman V2",
      description:
        "An animated drama about a superhero whose power is tied to his eyesight. When his vision begins to fail, he must confront his identity, find unlikely allies, and learn the science of seeing to earn his return.",
      genre: "animated-drama",
      userId: user.id,
    },
  });
  console.log(`   ✅ Project created: ${project.id}\n`);

  // ── Step 6: Seed platforms ─────────────────────────────────

  console.log(`🧠 Seeding ${PLATFORM_SEED.length} AI platforms...`);
  await prisma.aiPlatform.createMany({ data: PLATFORM_SEED });
  const seededPlatforms = await prisma.aiPlatform.findMany({
    select: { id: true, slug: true },
  });
  const platformMap = new Map(seededPlatforms.map((p) => [p.slug, p.id]));
  console.log(`   ✅ ${PLATFORM_SEED.length} platforms seeded\n`);

  // ── Step 7: Seed scenes ────────────────────────────────────

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
  console.log(`   ✅ ${sceneData.length} scenes seeded\n`);

  // ── Step 8: Seed characters with portraits ─────────────────

  const characterEntries = Object.entries(
    charactersJson.character_descriptions,
  );
  console.log(`🎭 Seeding ${characterEntries.length} characters...`);

  const charDbMap = new Map<string, string>(); // name -> DB id

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

    const portraitUrl = portraitUrls.get(name) ?? null;

    const char = await prisma.character.create({
      data: {
        name,
        projectId: project.id,
        role: data.role,
        designPhilosophy: data.core_identity,
        visualCues,
        bodyLanguage,
        coreIdentity: data.core_identity,
        portraitUrl,
      },
    });
    charDbMap.set(name, char.id);
    console.log(
      `   ${portraitUrl ? "🖼️" : "  "} ${name} (${data.role})${portraitUrl ? " — portrait set" : ""}`,
    );
  }
  console.log();

  // ── Step 9: Seed film identity ─────────────────────────────

  console.log("🎬 Seeding film identity...");
  await prisma.filmIdentity.create({
    data: {
      projectId: project.id,
      data: filmIdentityJson,
    },
  });
  console.log("   ✅ Film identity seeded\n");

  // ── Step 10: Scene-character assignments ────────────────────

  console.log("🔗 Seeding scene-character assignments...");
  const allScenes = await prisma.scene.findMany({
    where: { projectId: project.id },
    select: { id: true, sceneId: true, charactersPresent: true },
  });

  let sceneCharCount = 0;
  for (const scene of allScenes) {
    for (const charName of scene.charactersPresent) {
      const characterId = charDbMap.get(charName);
      if (characterId) {
        await prisma.sceneCharacter.create({
          data: { sceneId: scene.id, characterId },
        });
        sceneCharCount++;
      }
    }
  }
  console.log(`   ✅ ${sceneCharCount} scene-character assignments\n`);

  // ── Step 11: Create asset versions for uploaded images ──────

  console.log("🖼️  Creating asset versions for uploaded images...");

  const mjPlatformId = platformMap.get("midjourney")!;
  let assetCount = 0;

  // Create asset versions for uploaded images on scene S001
  // (concept art is project-level, we attach to first scene for visibility)
  // Track global version counters per (platformKey, assetType) to avoid unique constraint collisions
  const versionCounters = new Map<string, number>();
  function nextVersion(platformKey: string, assetType: AssetType): number {
    const key = `${platformKey}:${assetType}`;
    const next = (versionCounters.get(key) ?? 0) + 1;
    versionCounters.set(key, next);
    return next;
  }

  const s001 = allScenes.find((s) => s.sceneId === "S001");
  if (s001) {
    // Character images
    for (const img of uploaded) {
      if (img.category !== "character" || !img.characterName) continue;

      const charName = img.characterName;
      const isPortrait = portraitUrls.get(charName) === img.r2Url;
      const lowerFilename = img.filename.toLowerCase();
      let assetType: AssetType = AssetType.IMAGE;
      if (lowerFilename.includes("sheet") || lowerFilename.includes("pose")) {
        assetType = AssetType.STORYBOARD;
      }

      const cleanName = img.filename
        .replace(/\.(png|jpg|jpeg|webp)$/i, "")
        .replace(/_/g, " ");
      const title = `${charName} — ${cleanName}`;

      await prisma.sceneAssetVersion.create({
        data: {
          sceneId: s001.id,
          platformId: mjPlatformId,
          platformKey: "midjourney",
          platformLabel: "Midjourney",
          assetType,
          status: isPortrait ? AssetStatus.SELECTED : AssetStatus.GENERATED,
          selected: isPortrait,
          versionNumber: nextVersion("midjourney", assetType),
          title,
          prompt: `Character concept art for ${charName} — ${cleanName}`,
          outputUrl: img.r2Url,
          thumbnailUrl: img.r2Url,
          tags: [
            "character",
            slugify(charName),
            ...(isPortrait ? ["portrait", "selected"] : []),
            ...(lowerFilename.includes("close")
              ? ["close-up"]
              : lowerFilename.includes("full")
                ? ["full-body"]
                : lowerFilename.includes("pose") ||
                    lowerFilename.includes("sheet")
                  ? ["pose-sheet"]
                  : lowerFilename.includes("element")
                    ? ["elements"]
                    : []),
          ],
          rightsState: RightsState.UNKNOWN,
          createdById: user.id,
        },
      });
      assetCount++;
    }

    // Environment images
    for (const img of uploaded) {
      if (img.category !== "environment") continue;

      const cleanName = img.filename
        .replace(/\.(png|jpg|jpeg|webp)$/i, "")
        .replace(/_/g, " ");
      const locationTag = img.subfolder
        ? slugify(img.subfolder)
        : "environment";

      await prisma.sceneAssetVersion.create({
        data: {
          sceneId: s001.id,
          platformId: mjPlatformId,
          platformKey: "midjourney",
          platformLabel: "Midjourney",
          assetType: AssetType.IMAGE,
          status: AssetStatus.GENERATED,
          versionNumber: nextVersion("midjourney", AssetType.IMAGE),
          title: `Environment — ${cleanName}`,
          prompt: `Environment concept art — ${cleanName}`,
          outputUrl: img.r2Url,
          thumbnailUrl: img.r2Url,
          tags: ["environment", locationTag],
          rightsState: RightsState.UNKNOWN,
          createdById: user.id,
        },
      });
      assetCount++;
    }

    // Title image
    for (const img of uploaded) {
      if (img.category !== "title") continue;

      await prisma.sceneAssetVersion.create({
        data: {
          sceneId: s001.id,
          platformId: mjPlatformId,
          platformKey: "midjourney",
          platformLabel: "Midjourney",
          assetType: AssetType.IMAGE,
          status: AssetStatus.GENERATED,
          versionNumber: nextVersion("midjourney", AssetType.IMAGE),
          title: "Title Card",
          prompt: "Laserman V2 — Title card",
          outputUrl: img.r2Url,
          thumbnailUrl: img.r2Url,
          tags: ["title"],
          rightsState: RightsState.UNKNOWN,
          createdById: user.id,
        },
      });
      assetCount++;
    }
  }

  console.log(`   ✅ ${assetCount} asset versions created\n`);

  // ── Done ───────────────────────────────────────────────────

  console.log("═══════════════════════════════════════");
  console.log("🎉 Import complete!");
  console.log(`   Project: Laserman V2 (${project.id})`);
  console.log(`   Scenes: ${sceneData.length}`);
  console.log(
    `   Characters: ${characterEntries.length} (${portraitUrls.size} with portraits)`,
  );
  console.log(`   Images uploaded: ${uploaded.length}`);
  console.log(`   Asset versions: ${assetCount}`);
  console.log(`   Login: demo@tracker.dev / demo1234`);
  console.log("═══════════════════════════════════════");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Import failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
