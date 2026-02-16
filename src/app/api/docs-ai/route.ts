import { createFromSource } from "fumadocs-core/search/server";
import type { StructuredData } from "fumadocs-core/mdx-plugins/remark-structure";
import { source } from "@/app/source";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";

const searchServer = createFromSource(source);

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
}

function extractText(msg: ChatMessage): string {
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text!)
      .join("");
  }
  return "";
}

/**
 * Convert a docs URL like "/docs/web-app/scenes#heading" to slugs ["web-app", "scenes"].
 */
function urlToSlugs(url: string): string[] {
  const path = url.replace(/^\/docs\/?/, "").split("#")[0];
  if (!path) return [];
  return path.split("/").filter(Boolean);
}

/**
 * Build readable text from a page's structured data.
 */
function buildPageText(
  title: string,
  description: string | undefined,
  sd: StructuredData,
): string {
  const parts: string[] = [`# ${title}`];
  if (description) parts.push(description);
  for (const section of sd.contents) {
    if (section.heading) {
      const heading = sd.headings.find((h) => h.id === section.heading);
      if (heading) parts.push(`\n## ${heading.content}`);
    }
    parts.push(section.content);
  }
  return parts.join("\n\n");
}

export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages: ChatMessage[] };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Messages are required" }, { status: 400 });
  }

  const lastMessage = messages[messages.length - 1];
  const question = extractText(lastMessage);

  // Search docs to identify relevant pages
  const results = await searchServer.search(question);

  // Deduplicate by page URL (strip anchors) and keep top 5 unique pages
  const seenPages = new Set<string>();
  const pageUrls: string[] = [];
  for (const r of results) {
    const pageUrl = r.url.split("#")[0];
    if (!seenPages.has(pageUrl)) {
      seenPages.add(pageUrl);
      pageUrls.push(pageUrl);
      if (pageUrls.length >= 5) break;
    }
  }

  // Load full content for each relevant page
  const contextParts: string[] = [];
  for (const url of pageUrls) {
    const slugs = urlToSlugs(url);
    const page = source.getPage(slugs);
    if (!page) continue;

    const data = page.data as {
      title?: string;
      description?: string;
      structuredData: StructuredData;
    };

    if (!data.structuredData) continue;

    const text = buildPageText(
      data.title ?? slugs.join("/"),
      data.description,
      data.structuredData,
    );
    contextParts.push(`${text}\n\nSource: ${page.url}`);
  }

  const context = contextParts.join("\n\n---\n\n");

  const openrouter = createOpenRouter({
    apiKey: process.env.API_KEY,
  });

  const model = openrouter(process.env.AI_MODEL || "anthropic/claude-haiku-4.5");

  // Build source references list for the AI to cite
  const sourcesList = pageUrls
    .map((url) => {
      const slugs = urlToSlugs(url);
      const page = source.getPage(slugs);
      return page ? `- [${page.data.title ?? url}](${page.url})` : null;
    })
    .filter(Boolean)
    .join("\n");

  const result = streamText({
    model,
    system: `You are a concise documentation assistant for Lazer (AI film production orchestration tool).

CRITICAL: Keep answers SHORT — 3-5 sentences max for simple questions, 8-10 sentences max for complex ones. Use bullet points, not paragraphs. No filler.

Rules:
- Answer directly, skip preambles like "Great question!" or "Let me explain..."
- Use bullet points and short sentences
- Only include the most relevant details, skip exhaustive lists
- Use inline code for paths/commands, bold for key terms
- End with a compact Sources section

Sources format (always include):
---
**Sources:** ${sourcesList || "None"}

Context:
${context || "No relevant documentation found."}`,
    messages: messages.map((m) => ({
      role: m.role,
      content: extractText(m),
    })),
  });

  return result.toUIMessageStreamResponse();
}
