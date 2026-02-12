// ============================================================
// AI Logger — Structured request/response logging
//
// Controlled via AI_LOGGING env var (true/false)
// Logs: request payloads, response data, timing, errors
// ============================================================

type LogLevel = "info" | "warn" | "error" | "debug";

interface AIRequestLog {
    step: string;
    model: string;
    promptLength: number;
    systemPromptLength: number;
    temperature: number;
    maxOutputTokens: number;
    timestamp: string;
}

interface AIResponseLog {
    step: string;
    durationMs: number;
    outputKeys?: string[];
    outputSize?: number;
    itemCount?: number;
    timestamp: string;
}

interface AIErrorLog {
    step: string;
    error: string;
    durationMs: number;
    timestamp: string;
}

const COLORS = {
    info: "\x1b[36m",    // cyan
    warn: "\x1b[33m",    // yellow
    error: "\x1b[31m",   // red
    debug: "\x1b[90m",   // gray
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    green: "\x1b[32m",
    magenta: "\x1b[35m",
} as const;

function isLoggingEnabled(): boolean {
    return process.env.AI_LOGGING === "true";
}

function formatTimestamp(): string {
    return new Date().toISOString();
}

function log(level: LogLevel, prefix: string, message: string, data?: Record<string, unknown>) {
    if (!isLoggingEnabled()) return;

    const color = COLORS[level];
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false, fractionalSecondDigits: 3 });
    const tag = `${COLORS.dim}${ts}${COLORS.reset} ${color}[AI:${prefix}]${COLORS.reset}`;

    console.log(`${tag} ${message}`);

    if (data && Object.keys(data).length > 0) {
        for (const [key, value] of Object.entries(data)) {
            const formatted = typeof value === "object"
                ? JSON.stringify(value, null, 2).split("\n").map((l, i) => i === 0 ? l : `         ${l}`).join("\n")
                : String(value);
            console.log(`${COLORS.dim}  ├─ ${key}:${COLORS.reset} ${formatted}`);
        }
    }
}

// ─── Public API ──────────────────────────────────────────────

export const aiLogger = {
    /** Log an outgoing AI request */
    request(data: AIRequestLog) {
        log("info", "REQ", `${COLORS.bold}→ ${data.step}${COLORS.reset}`, {
            model: data.model,
            promptChars: data.promptLength,
            systemChars: data.systemPromptLength,
            temperature: data.temperature,
            maxOutputTokens: data.maxOutputTokens,
        });
    },

    /** Log a successful AI response */
    response(data: AIResponseLog) {
        const duration = data.durationMs < 1000
            ? `${data.durationMs}ms`
            : `${(data.durationMs / 1000).toFixed(2)}s`;

        log("info", "RES", `${COLORS.green}✓ ${data.step}${COLORS.reset} ${COLORS.dim}(${duration})${COLORS.reset}`, {
            ...(data.itemCount !== undefined ? { items: data.itemCount } : {}),
            ...(data.outputSize !== undefined ? { outputChars: data.outputSize } : {}),
            ...(data.outputKeys ? { keys: data.outputKeys } : {}),
        });
    },

    /** Log an AI error */
    error(data: AIErrorLog) {
        const duration = data.durationMs < 1000
            ? `${data.durationMs}ms`
            : `${(data.durationMs / 1000).toFixed(2)}s`;

        log("error", "ERR", `✗ ${data.step} ${COLORS.dim}(${duration})${COLORS.reset}`, {
            error: data.error,
        });
    },

    /** Log pipeline start */
    pipelineStart(scriptLength: number) {
        if (!isLoggingEnabled()) return;
        console.log("");
        console.log(`${COLORS.magenta}${COLORS.bold}━━━ AI Pipeline Started ━━━${COLORS.reset}`);
        log("info", "PIPELINE", "Starting script analysis", {
            scriptChars: scriptLength,
            scriptWords: scriptLength > 0 ? Math.round(scriptLength / 5) : 0,
            model: process.env.AI_MODEL || "x-ai/grok-4.1-fast",
        });
    },

    /** Log pipeline completion */
    pipelineComplete(durationMs: number, result: { scenes: number; characters: number; descriptions: number }) {
        if (!isLoggingEnabled()) return;
        const duration = durationMs < 1000
            ? `${durationMs}ms`
            : `${(durationMs / 1000).toFixed(1)}s`;

        log("info", "PIPELINE", `${COLORS.green}${COLORS.bold}✓ Complete${COLORS.reset} ${COLORS.dim}(${duration} total)${COLORS.reset}`, {
            scenes: result.scenes,
            characters: result.characters,
            descriptions: result.descriptions,
        });
        console.log(`${COLORS.magenta}${COLORS.bold}━━━ AI Pipeline Finished ━━━${COLORS.reset}`);
        console.log("");
    },

    /** Log pipeline failure */
    pipelineFailed(durationMs: number, error: string) {
        if (!isLoggingEnabled()) return;
        const duration = (durationMs / 1000).toFixed(1);
        log("error", "PIPELINE", `✗ Failed after ${duration}s`, { error });
        console.log(`${COLORS.magenta}${COLORS.bold}━━━ AI Pipeline Failed ━━━${COLORS.reset}`);
        console.log("");
    },

    /** Log an API request (incoming HTTP) */
    apiRequest(method: string, path: string, meta?: Record<string, unknown>) {
        log("info", "API", `${COLORS.bold}${method} ${path}${COLORS.reset}`, meta);
    },

    /** Log an API response (outgoing HTTP) */
    apiResponse(method: string, path: string, status: number, durationMs: number) {
        const color = status < 400 ? COLORS.green : COLORS.error;
        const duration = durationMs < 1000
            ? `${durationMs}ms`
            : `${(durationMs / 1000).toFixed(2)}s`;
        log("info", "API", `${color}${status}${COLORS.reset} ${method} ${path} ${COLORS.dim}(${duration})${COLORS.reset}`);
    },

    /** Generic debug log */
    debug(prefix: string, message: string, data?: Record<string, unknown>) {
        log("debug", prefix, message, data);
    },

    /** Check if logging is on */
    get enabled() {
        return isLoggingEnabled();
    },
};
