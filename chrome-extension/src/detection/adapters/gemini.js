/* ==========================================================
   Adapter: Google Gemini / Veo – Thread-aware extraction
   Handles gemini.google.com + aistudio.google.com
   ========================================================== */

const URL_PATTERNS = [
  /^https?:\/\/gemini\.google\.com/i,
  /^https?:\/\/aistudio\.google\.com/i,
  /^https?:\/\/deepmind\.google.*veo/i,
  /^https?:\/\/labs\.google.*video/i,
];

// ── Selectors ────────────────────────────────────────────

const PROMPT_SELECTORS = [
  'div.ql-editor[contenteditable="true"]',
  '[data-testid="text-input-field"]',
  "rich-textarea textarea",
  'textarea[aria-label*="Enter a prompt" i]',
  'textarea[aria-label*="Type something" i]',
  'textarea[placeholder*="Enter a prompt" i]',
  'textarea[aria-label*="prompt" i]',
  ".prompt-input textarea",
  '[data-testid="prompt-textarea"]',
  '[contenteditable="true"][aria-label*="prompt" i]',
  '[contenteditable="true"][data-placeholder*="Enter" i]',
];

const MODEL_SELECTORS = [
  '[data-testid="model-selector"]',
  'button[aria-label*="model" i]',
  '[class*="model-selector"]',
  '[class*="ModelPicker"]',
  ".model-dropdown",
];

const VIDEO_OUTPUT_SELECTORS = [
  '[data-testid="generated-video"] video',
  '[class*="video-result"] video',
  '[class*="generation-output"] video',
  '[class*="media-container"] video',
  'video[src*="googleusercontent"]',
  'video[src*="storage.googleapis"]',
];

const IMAGE_OUTPUT_SELECTORS = [
  '[data-testid="generated-image"] img',
  '[class*="image-result"] img',
  '[class*="generation-output"] img',
  '[class*="media-container"] img:not([class*="avatar"])',
  'img[src*="googleusercontent"]:not([width="24"]):not([width="32"])',
  'img[src*="storage.googleapis"]:not([class*="icon"])',
];

// Gemini conversation turn containers
const TURN_SELECTORS = [
  "model-response", // Gemini uses custom elements
  "user-query",
  '[data-testid="user-message"]',
  '[data-testid="model-response"]',
  ".conversation-turn",
  '[class*="conversation-container"] > div',
  "message-content",
];

// ── Helpers ──────────────────────────────────────────────

function querySelector(doc, selectors) {
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function readText(el) {
  if (!el) return "";
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)
    return el.value?.trim() || "";
  return el.textContent?.trim() || "";
}

function extractOutputsFromContainer(container) {
  const outputs = [];
  const seen = new Set();

  // Videos
  container.querySelectorAll("video[src], video source[src]").forEach((el) => {
    const video = el.tagName === "SOURCE" ? el.closest("video") : el;
    const src = video?.currentSrc || video?.src || el.src;
    if (src?.startsWith("http") && !seen.has(src)) {
      seen.add(src);
      outputs.push({
        type: "video",
        url: src,
        thumbnailUrl: video?.poster || null,
        metadata: {
          duration: video?.duration || null,
          width: video?.videoWidth || null,
          height: video?.videoHeight || null,
        },
      });
    }
  });

  // Images
  container.querySelectorAll("img[src]").forEach((el) => {
    const src = el.currentSrc || el.src;
    if (
      src?.startsWith("http") &&
      !seen.has(src) &&
      (el.naturalWidth > 100 || !el.complete)
    ) {
      seen.add(src);
      outputs.push({
        type: "image",
        url: src,
        thumbnailUrl: src,
        metadata: {
          width: el.naturalWidth || null,
          height: el.naturalHeight || null,
        },
      });
    }
  });

  return outputs;
}

function extractSettings(doc) {
  const settings = {};

  const modelEl = querySelector(doc, MODEL_SELECTORS);
  if (modelEl?.textContent?.trim())
    settings.modelName = modelEl.textContent.trim();

  const tempEl =
    doc.querySelector('input[aria-label*="Temperature" i]') ||
    doc.querySelector('[data-testid="temperature-slider"]');
  if (tempEl?.value) settings.temperature = parseFloat(tempEl.value);

  const ratioEl =
    doc.querySelector('[data-testid="aspect-ratio-selector"]') ||
    doc.querySelector('button[class*="aspect"][aria-pressed="true"]');
  if (ratioEl?.textContent?.trim())
    settings.aspectRatio = ratioEl.textContent.trim();

  return Object.keys(settings).length > 0 ? settings : null;
}

function inferAssetType(outputs) {
  if (outputs.some((o) => o.type === "video")) return "VIDEO";
  return "IMAGE";
}

// ── Thread parsing ───────────────────────────────────────

function parseGeminiTurns(doc) {
  // Gemini uses custom elements: <user-query> and <model-response>
  // Use a combined selector to get elements in DOM order
  const combined = doc.querySelectorAll("user-query, model-response");
  if (combined.length > 0) {
    return Array.from(combined).map((el) => ({
      role: el.tagName.toLowerCase() === "user-query" ? "user" : "assistant",
      el,
    }));
  }

  // Fallback: generic turn selectors
  const generic = doc.querySelectorAll(
    '[data-testid="user-message"], [data-testid="model-response"]',
  );
  if (generic.length > 0) {
    return Array.from(generic).map((el) => ({
      role: el.getAttribute("data-testid")?.includes("user")
        ? "user"
        : "assistant",
      el,
    }));
  }

  return [];
}

// ── Adapter ──────────────────────────────────────────────

const GeminiAdapter = {
  platformKey: "google-veo",
  displayName: "Google Gemini / Veo",

  match(url) {
    return URL_PATTERNS.some((p) => p.test(url));
  },

  extractLatest(doc) {
    const turns = parseGeminiTurns(doc);

    if (turns.length >= 2) {
      // Find last assistant turn with a preceding user turn
      for (let i = turns.length - 1; i >= 0; i--) {
        if (turns[i].role === "assistant") {
          for (let j = i - 1; j >= 0; j--) {
            if (turns[j].role === "user") {
              const prompt = readText(turns[j].el);
              const outputs = extractOutputsFromContainer(turns[i].el);
              if (prompt) {
                return {
                  prompt,
                  negativePrompt: null,
                  outputs,
                  settings: extractSettings(doc),
                  assetType: inferAssetType(outputs),
                  timestamp: 0,
                };
              }
              break;
            }
          }
        }
      }
    }

    // Fallback: input bar + page outputs
    const inputEl = querySelector(doc, PROMPT_SELECTORS);
    const prompt = readText(inputEl);

    // Collect outputs from known selectors
    const outputs = [];
    const seen = new Set();

    for (const sel of [...VIDEO_OUTPUT_SELECTORS, ...IMAGE_OUTPUT_SELECTORS]) {
      doc.querySelectorAll(sel).forEach((el) => {
        const src = el.currentSrc || el.src || el.querySelector("source")?.src;
        if (src?.startsWith("http") && !seen.has(src)) {
          seen.add(src);
          const isVideo = el.tagName === "VIDEO" || el.closest("video");
          outputs.push({
            type: isVideo ? "video" : "image",
            url: src,
            thumbnailUrl: isVideo ? el.poster || null : src,
            metadata: {},
          });
        }
      });
    }

    return {
      prompt,
      negativePrompt: null,
      outputs: outputs.slice(0, 10),
      settings: extractSettings(doc),
      assetType: inferAssetType(outputs),
      timestamp: 0,
    };
  },

  extractCandidates(doc) {
    const candidates = [];
    const turns = parseGeminiTurns(doc);

    // Walk backwards pairing user->assistant
    let i = turns.length - 1;
    while (i >= 0) {
      if (turns[i].role === "assistant") {
        for (let j = i - 1; j >= 0; j--) {
          if (turns[j].role === "user") {
            const prompt = readText(turns[j].el);
            const outputs = extractOutputsFromContainer(turns[i].el);
            if (prompt || outputs.length > 0) {
              candidates.push({
                prompt,
                negativePrompt: null,
                outputs,
                settings: extractSettings(doc),
                assetType: inferAssetType(outputs),
                timestamp: 0,
              });
            }
            i = j - 1;
            break;
          }
          if (j === 0) i = -1;
        }
      } else {
        i--;
      }
    }

    if (candidates.length === 0) {
      candidates.push(this.extractLatest(doc));
    }

    return candidates.slice(0, 20);
  },

  applyPrompt(doc, text) {
    if (!text?.trim()) return { ok: false, error: "Prompt is empty" };

    const target = querySelector(doc, PROMPT_SELECTORS);
    if (!target) return { ok: false, error: "No prompt input found" };

    if (
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLInputElement
    ) {
      target.focus();
      target.value = text;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true };
    }

    if (target instanceof HTMLElement && target.isContentEditable) {
      target.focus();
      target.textContent = text;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      return { ok: true };
    }

    return { ok: false, error: "Unsupported input field" };
  },
};

export default GeminiAdapter;
