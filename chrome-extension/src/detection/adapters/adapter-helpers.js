/* ==========================================================
   Shared helpers for thin-wrapper adapters.
   Each wraps an existing detector's extract methods into
   the adapter contract with single-candidate return.
   ========================================================== */

/**
 * Create a thin adapter that wraps an existing detector object.
 *
 * @param {Object} detector - Detector with detect, extractPrompt, extractSettings, extractOutputs
 * @param {Object} opts - { platformKey, displayName, defaultAssetType }
 * @returns {import("../engine.js").Adapter}
 */
export function createDetectorAdapter(detector, opts) {
  const { platformKey, displayName, defaultAssetType = "IMAGE" } = opts;

  return {
    platformKey,
    displayName,

    match(url) {
      return detector.detect(url);
    },

    extractLatest(doc) {
      const promptResult = safeCall(() => detector.extractPrompt(doc));
      const settings = safeCall(() => detector.extractSettings(doc));
      const outputs = safeCall(() => detector.extractOutputs(doc)) || [];

      return {
        prompt: promptResult?.prompt || "",
        negativePrompt: promptResult?.negativePrompt || null,
        outputs,
        settings,
        assetType: inferAssetTypeFromOutputs(outputs, defaultAssetType),
        timestamp: 0,
      };
    },

    extractCandidates(doc) {
      return [this.extractLatest(doc)];
    },

    applyPrompt(doc, text) {
      if (!text?.trim()) return { ok: false, error: "Prompt is empty" };

      // Use standard prompt input finding
      const selectors = [
        'textarea[data-testid="prompt-input"]',
        'textarea[placeholder*="Describe" i]',
        'textarea[placeholder*="prompt" i]',
        'textarea[aria-label*="prompt" i]',
        '[contenteditable="true"][class*="prompt"]',
        "textarea",
      ];

      for (const sel of selectors) {
        const el = doc.querySelector(sel);
        if (!el) continue;

        if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
          if (el.disabled || el.readOnly) continue;
          el.focus();
          el.value = text;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          return { ok: true };
        }

        if (el instanceof HTMLElement && el.isContentEditable) {
          el.focus();
          el.textContent = text;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          return { ok: true };
        }
      }

      return { ok: false, error: "No prompt input found" };
    },
  };
}

function safeCall(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

function inferAssetTypeFromOutputs(outputs, defaultType) {
  if (!outputs || outputs.length === 0) return defaultType;
  if (outputs.some((o) => o.type === "video")) return "VIDEO";
  if (outputs.some((o) => o.type === "audio")) return "VOICE";
  if (outputs.some((o) => o.type === "image")) return "IMAGE";
  return defaultType;
}
