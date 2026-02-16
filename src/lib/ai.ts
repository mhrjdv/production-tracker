// ============================================================
// AI Provider Configuration — OpenRouter via Vercel AI SDK
// ============================================================

import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * Create a configured OpenRouter provider instance.
 * Uses environment variables for API key and model selection.
 */
export function getOpenRouter() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error(
            "API_KEY is not set. Add it to your .env file."
        );
    }

    return createOpenRouter({
        apiKey,
        headers: {
            "X-Title": "Lazer",
            "HTTP-Referer": process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000",
        },
    });
}

/**
 * Get the configured AI model from environment or use default.
 */
export function getModel() {
    const openrouter = getOpenRouter();
    const modelId = process.env.AI_MODEL || "anthropic/claude-haiku-4.5";
    return openrouter(modelId);
}

/**
 * Max tokens and generation config defaults
 */
export const AI_CONFIG = {
    maxOutputTokens: 8192,
    temperature: 0.3, // Lower temperature for structured output reliability
    maxRetries: 2,
} as const;
