// ============================================================
// POST /api/ai/parse-script — Main AI Script Parsing Endpoint
// Accepts raw script text, returns Server-Sent Events stream
// with progress updates and final structured result
// ============================================================

import { NextRequest } from "next/server";
import { runFullPipeline, type PipelineProgress } from "@/lib/ai-pipeline";
import { aiLogger } from "@/lib/ai-logger";

export const maxDuration = 120; // Allow up to 2 minutes for full pipeline

export async function POST(request: NextRequest) {
    const requestStart = Date.now();
    const path = "/api/ai/parse-script";

    try {
        const body = await request.json();
        const { scriptText } = body;

        aiLogger.apiRequest("POST", path, {
            scriptLength: scriptText?.length || 0,
            hasScript: !!scriptText,
            userAgent: request.headers.get("user-agent")?.slice(0, 80),
        });

        if (!scriptText || typeof scriptText !== "string") {
            aiLogger.apiResponse("POST", path, 400, Date.now() - requestStart);
            return Response.json(
                { error: "scriptText is required" },
                { status: 400 }
            );
        }

        if (scriptText.trim().length < 50) {
            aiLogger.apiResponse("POST", path, 400, Date.now() - requestStart);
            return Response.json(
                { error: "Script text is too short. Please provide at least a paragraph." },
                { status: 400 }
            );
        }

        aiLogger.debug("API", `Script accepted, starting SSE stream`, {
            scriptChars: scriptText.length,
            scriptWords: scriptText.split(/\s+/).length,
        });

        // Stream progress via Server-Sent Events
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const onProgress = (progress: PipelineProgress) => {
                        const data = JSON.stringify({
                            type: "progress",
                            ...progress,
                        });
                        controller.enqueue(
                            encoder.encode(`data: ${data}\n\n`)
                        );

                        aiLogger.debug("SSE", `Progress: ${progress.step} (${progress.percentage}%)`, {
                            message: progress.message,
                        });
                    };

                    const result = await runFullPipeline(
                        scriptText,
                        onProgress
                    );

                    // Send final result
                    const finalData = JSON.stringify({
                        type: "result",
                        data: result,
                    });
                    controller.enqueue(
                        encoder.encode(`data: ${finalData}\n\n`)
                    );

                    aiLogger.apiResponse("POST", path, 200, Date.now() - requestStart);
                    aiLogger.debug("SSE", `Stream complete — final payload sent`, {
                        resultSize: finalData.length,
                        scenes: result.scenes.length,
                        characters: result.characters.length,
                    });

                    controller.close();
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : "Pipeline failed";
                    const errorData = JSON.stringify({
                        type: "error",
                        error: errorMsg,
                    });
                    controller.enqueue(
                        encoder.encode(`data: ${errorData}\n\n`)
                    );

                    aiLogger.apiResponse("POST", path, 500, Date.now() - requestStart);
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error) {
        aiLogger.error({
            step: "api:parse-script",
            error: error instanceof Error ? error.message : String(error),
            durationMs: Date.now() - requestStart,
            timestamp: new Date().toISOString(),
        });
        aiLogger.apiResponse("POST", path, 500, Date.now() - requestStart);
        return Response.json(
            { error: "Failed to parse script" },
            { status: 500 }
        );
    }
}
