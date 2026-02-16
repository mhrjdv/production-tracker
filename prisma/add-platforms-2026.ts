/**
 * Upsert new 2026 AI platforms into an existing database.
 *
 * Usage:  npx tsx prisma/add-platforms-2026.ts
 *
 * Safe to re-run — uses upsert keyed on slug.
 */
import "dotenv/config";
import { AssetType, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const NEW_PLATFORMS = [
    // ── Updated existing entry ──
    {
        slug: "openai-sora",
        name: "ChatGPT (Image + Sora)",
        provider: "OpenAI",
        homepageUrl: "https://openai.com/sora",
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
            "ChatGPT image generation (GPT-4o / DALL-E) and Sora video generation.",
    },
    // ── New platforms ──
    {
        slug: "google-gemini",
        name: "Gemini (Nano Banana)",
        provider: "Google",
        homepageUrl: "https://gemini.google.com",
        docsUrl: "https://ai.google.dev/gemini-api/docs",
        specialties: [
            "text-to-image",
            "realistic images",
            "text-in-image",
            "multimodal",
        ],
        supportedOutput: [AssetType.IMAGE, AssetType.STORYBOARD],
        notes:
            "Google Gemini with Imagen 3 / Nano Banana for high-quality image generation.",
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
        specialties: [
            "design assets",
            "social media",
            "template-based generation",
        ],
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
        specialties: [
            "enterprise TTS",
            "clear pronunciation",
            "studio voiceover",
        ],
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
        name: "Grok",
        provider: "xAI",
        homepageUrl: "https://grok.x.ai",
        docsUrl: null,
        specialties: [
            "text-to-image",
            "image generation",
            "creative generation",
        ],
        supportedOutput: [AssetType.IMAGE, AssetType.STORYBOARD],
        notes: "xAI's Grok image generation via Aurora model.",
    },
];

async function main() {
    console.log(`🚀 Upserting ${NEW_PLATFORMS.length} platforms…\n`);

    let created = 0;
    let updated = 0;

    for (const p of NEW_PLATFORMS) {
        const result = await prisma.aiPlatform.upsert({
            where: { slug: p.slug },
            create: p,
            update: {
                name: p.name,
                provider: p.provider,
                homepageUrl: p.homepageUrl,
                docsUrl: p.docsUrl,
                specialties: p.specialties,
                supportedOutput: p.supportedOutput,
                notes: p.notes,
            },
        });
        // Simple heuristic: if updatedAt ≈ createdAt it was just created
        const isNew =
            Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000;
        if (isNew) {
            created++;
            console.log(`  ✨ Created: ${p.name} (${p.slug})`);
        } else {
            updated++;
            console.log(`  🔄 Updated: ${p.name} (${p.slug})`);
        }
    }

    console.log(`\n✅ Done — ${created} created, ${updated} updated.`);
    await prisma.$disconnect();
}

main().catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
});
