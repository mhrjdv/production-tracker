/* ==========================================================
   Content Script V2 – Delegates to Detection Engine
   Runs in the context of web pages (AI generation platforms).
   Backward-compatible message API + V2 extensions.
   ========================================================== */

import { extractLatest, extractCandidates, applyPrompt, findAdapter } from "./detection/engine.js";

// Guard against double injection (manifest + programmatic).
// In the IIFE bundle, this runs at the top of the wrapper function.
if (!window.__lasermanContentScriptLoaded) {
  window.__lasermanContentScriptLoaded = true;
  setup();
}

function setup() {
  /**
   * Build backward-compatible page context shape from V2 candidate.
   */
  function candidateToLegacyContext(candidate, url) {
    return {
      prompt: candidate.prompt || "",
      modelName: candidate.settings?.modelName || "",
      outputUrl: candidate.outputs?.[0]?.url || "",
      sourceUrl: url,
      assetType: candidate.assetType || "IMAGE",
    };
  }

  /**
   * Serialize page for AI-assist: structured turn text, truncated to maxChars.
   */
  function serializePageContext(maxChars = 12000) {
    const turns = [];
    const turnContainers = document.querySelectorAll(
      "[data-message-author-role], user-query, model-response, " +
      '[data-testid="user-message"], [data-testid="model-response"], ' +
      ".conversation-turn, article[data-testid]"
    );

    if (turnContainers.length > 0) {
      for (const el of turnContainers) {
        const role =
          el.getAttribute("data-message-author-role") ||
          (el.tagName === "USER-QUERY" || el.getAttribute("data-testid")?.includes("user")
            ? "user"
            : "assistant");

        const hasMedia = el.querySelectorAll("img[src], video[src], audio[src]").length;
        const clone = el.cloneNode(true);
        clone.querySelectorAll("svg, img, video, audio, style, script").forEach((n) => n.remove());
        const text = clone.textContent?.trim().substring(0, 800) || "";

        turns.push({ role, text, hasMedia: hasMedia > 0, mediaCount: hasMedia });
      }
    } else {
      // Fallback: dump visible text
      const body = document.body.cloneNode(true);
      body.querySelectorAll("svg, img, video, audio, style, script, nav, header, footer").forEach((n) => n.remove());
      const text = body.textContent?.trim().substring(0, maxChars) || "";
      turns.push({ role: "page", text, hasMedia: false, mediaCount: 0 });
    }

    // Truncate total to maxChars
    let total = 0;
    const truncated = [];
    for (const turn of turns) {
      const serialized = JSON.stringify(turn);
      if (total + serialized.length > maxChars) break;
      total += serialized.length;
      truncated.push(turn);
    }

    return truncated;
  }

  // ── Message handler ──────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const url = window.location.href;

    // Ping for liveness check (used by messaging.js ensureContentScript)
    if (message?.type === "__ping__") {
      sendResponse({ ok: true });
      return;
    }

    // V1 backward-compat: extract-page-context
    if (message?.type === "extract-page-context") {
      try {
        const result = extractLatest(document, url);
        const legacy = candidateToLegacyContext(result.latestCandidate, url);

        sendResponse({
          ok: true,
          context: legacy,
          // V2 extensions
          latestCandidate: result.latestCandidate,
          candidates: result.candidates,
          adapter: result.adapter.platformKey,
          debug: result.debug,
          warnings: result.warnings,
        });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
      return;
    }

    // V2: full thread scan
    if (message?.type === "extract-thread-candidates") {
      try {
        const result = extractCandidates(document, url, {
          maxCandidates: message.maxCandidates || 20,
        });

        sendResponse({
          ok: true,
          candidates: result.candidates,
          adapter: result.adapter.platformKey,
          debug: result.debug,
          warnings: result.warnings,
        });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
      return;
    }

    // V1 backward-compat: apply-prompt
    if (message?.type === "apply-prompt") {
      try {
        sendResponse(applyPrompt(document, url, String(message.prompt || "")));
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
      return;
    }

    // V2: serialize page for AI assist
    if (message?.type === "serialize-page-context") {
      try {
        const turns = serializePageContext(message.maxChars || 12000);
        const adapter = findAdapter(url);

        sendResponse({
          ok: true,
          turns,
          url,
          adapter: adapter.platformKey,
        });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
      return;
    }
  });
}
