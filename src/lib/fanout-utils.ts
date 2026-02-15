// ─── Fan-Out Utilities ──────────────────────────────────────
// Pure functions for prompt package fan-out and run card generation.

export interface PromptPackageInput {
    prompt: string;
    negativePrompt?: string | null;
    targetAspectRatio?: string | null;
    targetDurationSec?: number | null;
    styleProfile?: string | null;
}

export interface PlatformInput {
    slug: string;
    name: string;
    homepageUrl?: string | null;
}

export type RunCardStatus = "NOT_RUN" | "IN_PROGRESS" | "CAPTURED" | "SELECTED";

export interface RunCard {
    platformKey: string;
    platformName: string;
    adaptedPrompt: string;
    settingsChecklist: string[];
    deepLink: string | null;
    status: RunCardStatus;
}

export interface PlatformConstraints {
    maxPromptLength?: number;
    supportedAspectRatios?: string[];
    supportedDurations?: number[];
    supportsNegativePrompt?: boolean;
}

// ─── Platform constraints registry ──────────────────────────

const PLATFORM_CONSTRAINTS: Record<string, PlatformConstraints> = {
    sora: {
        maxPromptLength: 1000,
        supportedAspectRatios: ["16:9", "9:16", "1:1"],
        supportedDurations: [5, 10, 15, 20],
        supportsNegativePrompt: false,
    },
    "openai-sora": {
        maxPromptLength: 1000,
        supportedAspectRatios: ["16:9", "9:16", "1:1"],
        supportedDurations: [5, 10, 15, 20],
        supportsNegativePrompt: false,
    },
    "gemini-veo": {
        maxPromptLength: 2000,
        supportedAspectRatios: ["16:9", "9:16", "1:1"],
        supportedDurations: [5, 8],
        supportsNegativePrompt: false,
    },
    veo: {
        maxPromptLength: 2000,
        supportedAspectRatios: ["16:9", "9:16", "1:1"],
        supportedDurations: [5, 8],
        supportsNegativePrompt: false,
    },
    freepik: {
        maxPromptLength: 1500,
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
        supportsNegativePrompt: true,
    },
    "freepik-pikaso": {
        maxPromptLength: 1500,
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
        supportsNegativePrompt: true,
    },
    midjourney: {
        maxPromptLength: 6000,
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "2:3", "3:2"],
        supportsNegativePrompt: true,
    },
    runway: {
        maxPromptLength: 1500,
        supportedAspectRatios: ["16:9", "9:16"],
        supportedDurations: [4, 16],
        supportsNegativePrompt: false,
    },
    kling: {
        maxPromptLength: 2500,
        supportedAspectRatios: ["16:9", "9:16", "1:1"],
        supportedDurations: [5, 10],
        supportsNegativePrompt: false,
    },
    luma: {
        maxPromptLength: 2000,
        supportedAspectRatios: ["16:9", "9:16", "1:1"],
        supportedDurations: [5],
        supportsNegativePrompt: false,
    },
    elevenlabs: {
        maxPromptLength: 5000,
        supportsNegativePrompt: false,
    },
    suno: {
        maxPromptLength: 3000,
        supportsNegativePrompt: false,
    },
    udio: {
        maxPromptLength: 1000,
        supportsNegativePrompt: true,
    },
    "stable-audio": {
        maxPromptLength: 500,
        supportsNegativePrompt: true,
    },
    leonardo: {
        maxPromptLength: 1000,
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "2:3", "3:2"],
        supportsNegativePrompt: true,
    },
    "adobe-firefly": {
        maxPromptLength: 1024,
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
        supportsNegativePrompt: false,
    },
    ideogram: {
        maxPromptLength: 2000,
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "10:16", "16:10"],
        supportsNegativePrompt: true,
    },
    flux: {
        maxPromptLength: 2000,
        supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"],
        supportsNegativePrompt: false,
    },
};

// ─── Get platform constraints ───────────────────────────────

export function getPlatformConstraints(platformKey: string): PlatformConstraints {
    return PLATFORM_CONSTRAINTS[platformKey.toLowerCase()] ?? {};
}

// ─── Adapt prompt for platform ──────────────────────────────

export function adaptPromptForPlatform(
    prompt: string,
    _platformKey: string,
    constraints: PlatformConstraints,
    options?: { targetAspectRatio?: string | null; negativePrompt?: string | null },
): string {
    let adapted = prompt;

    // Truncate to platform max length
    if (constraints.maxPromptLength && adapted.length > constraints.maxPromptLength) {
        adapted = adapted.slice(0, constraints.maxPromptLength);
    }

    // Strip negative prompt syntax for platforms that don't support it
    if (constraints.supportsNegativePrompt === false) {
        adapted = adapted.replace(/\s*--no\s+[^\s,]+/g, "");
    }

    // Append aspect ratio if specified and platform supports it
    if (options?.targetAspectRatio && constraints.supportedAspectRatios?.length) {
        adapted += ` --ar ${options.targetAspectRatio}`;
    }

    return adapted;
}

// ─── Generate deep link ─────────────────────────────────────

const DEEP_LINK_PATTERNS: Record<string, (prompt: string) => string> = {
    sora: (prompt) => `https://sora.com/?prompt=${encodeURIComponent(prompt)}`,
    "openai-sora": (prompt) => `https://sora.com/?prompt=${encodeURIComponent(prompt)}`,
    freepik: (prompt) =>
        `https://www.freepik.com/pikaso#prompt=${encodeURIComponent(prompt)}`,
    "freepik-pikaso": (prompt) =>
        `https://www.freepik.com/pikaso#prompt=${encodeURIComponent(prompt)}`,
    midjourney: () => `https://www.midjourney.com/imagine`,
    runway: () => `https://app.runwayml.com/`,
    luma: () => `https://lumalabs.ai/dream-machine`,
    kling: () => `https://klingai.com/`,
    elevenlabs: () => `https://elevenlabs.io/app/speech-synthesis`,
    suno: () => `https://suno.com/create`,
    udio: () => `https://www.udio.com/create`,
};

export function getDeepLink(platformKey: string, prompt: string): string | null {
    const pattern = DEEP_LINK_PATTERNS[platformKey.toLowerCase()];
    return pattern ? pattern(prompt) : null;
}

// ─── Generate run cards ─────────────────────────────────────

export function generateRunCards(
    promptPackage: PromptPackageInput,
    platforms: readonly PlatformInput[],
): RunCard[] {
    return platforms.map((platform) => {
        const constraints = getPlatformConstraints(platform.slug);
        const adaptedPrompt = adaptPromptForPlatform(
            promptPackage.prompt,
            platform.slug,
            constraints,
            {
                negativePrompt: promptPackage.negativePrompt,
                targetAspectRatio: promptPackage.targetAspectRatio,
            },
        );

        const checklist: string[] = [];

        if (promptPackage.targetAspectRatio) {
            const supported = constraints.supportedAspectRatios ?? [];
            if (supported.length > 0) {
                checklist.push(
                    supported.includes(promptPackage.targetAspectRatio)
                        ? `Aspect ratio: ${promptPackage.targetAspectRatio}`
                        : `Aspect ratio: ${promptPackage.targetAspectRatio} (not natively supported — use closest)`,
                );
            }
        }

        if (promptPackage.targetDurationSec && constraints.supportedDurations) {
            const closest = constraints.supportedDurations.reduce((a, b) =>
                Math.abs(b - (promptPackage.targetDurationSec ?? 0)) <
                Math.abs(a - (promptPackage.targetDurationSec ?? 0))
                    ? b
                    : a,
            );
            checklist.push(`Duration: ${closest}s`);
        }

        if (promptPackage.negativePrompt && constraints.supportsNegativePrompt) {
            checklist.push("Negative prompt: supported");
        } else if (promptPackage.negativePrompt && !constraints.supportsNegativePrompt) {
            checklist.push("Negative prompt: not supported (will be omitted)");
        }

        return {
            platformKey: platform.slug,
            platformName: platform.name,
            adaptedPrompt,
            settingsChecklist: checklist,
            deepLink: getDeepLink(platform.slug, adaptedPrompt) ?? platform.homepageUrl ?? null,
            status: "NOT_RUN" as RunCardStatus,
        };
    });
}
