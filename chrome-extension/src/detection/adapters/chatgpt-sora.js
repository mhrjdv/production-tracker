/* ==========================================================
   Adapter: ChatGPT / Sora – Thread-aware extraction
   Consolidates detectors/sora.js selectors + adds thread parsing.
   ========================================================== */

const URL_PATTERNS = [
  /^https?:\/\/(www\.)?sora\.com/i,
  /^https?:\/\/sora\.chatgpt\.com/i,
  /^https?:\/\/chat\.openai\.com/i,
  /^https?:\/\/chatgpt\.com/i,
];

// ── Selector sets ────────────────────────────────────────

const PROMPT_SELECTORS = [
  'textarea[data-testid="sora-prompt-input"]',
  'textarea[placeholder*="Describe" i]',
  'textarea[placeholder*="prompt" i]',
  'textarea[aria-label*="prompt" i]',
  'div[data-testid="prompt-textarea"] textarea',
  "#prompt-textarea",
  'textarea[data-testid="prompt-textarea"]',
  '[contenteditable="true"][data-placeholder*="Describe" i]',
  '[contenteditable="true"][data-testid="prompt-textarea"]',
];

const PROMPT_DISPLAY_SELECTORS = [
  '[data-testid="generation-prompt"]',
  ".generation-prompt",
  '[class*="prompt-text"]',
  '[class*="PromptDisplay"]',
];

const MODEL_SELECTORS = [
  '[data-testid="model-selector"]',
  '[data-testid="model-badge"]',
  '[class*="model-name"]',
  '[class*="ModelSelector"]',
  '[aria-label*="model" i]',
];

const RATIO_SELECTORS = [
  '[data-testid="aspect-ratio"]',
  '[class*="aspect-ratio"]',
  'button[class*="ratio"][aria-pressed="true"]',
];

const DURATION_SELECTORS = [
  '[data-testid="duration-selector"]',
  '[class*="duration"]',
  '[aria-label*="duration" i]',
];

const VIDEO_SELECTORS = [
  'video[data-testid="sora-output"]',
  'video[data-testid="generation-video"]',
  '[class*="generation-result"] video',
  '[class*="VideoPlayer"] video',
  '[class*="output-container"] video',
  'video[src*="oaiusercontent"]',
];

const IMAGE_SELECTORS = [
  'img[data-testid="sora-output"]',
  'img[data-testid="generation-image"]',
  '[class*="generation-result"] img',
  '[class*="output-container"] img:not([class*="avatar"])',
  'img[src*="oaiusercontent"]',
];

// ── Thread turn selectors (ChatGPT conversation structure) ──

const TURN_SELECTORS = [
  "[data-message-author-role]",
  '[data-testid^="conversation-turn"]',
  "article[data-testid]",
];

// ── Helpers ──────────────────────────────────────────────

function readText(el) {
  if (!el) return "";
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return el.value?.trim() || "";
  }
  return el.textContent?.trim() || "";
}

function querySelector(doc, selectors) {
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function extractOutputsFromContainer(container) {
  const outputs = [];
  const seen = new Set();

  // Videos first
  container.querySelectorAll("video[src], video source[src]").forEach((el) => {
    const video = el.tagName === "SOURCE" ? el.closest("video") : el;
    const src = video?.currentSrc || video?.src || el.src;
    if (src?.startsWith("http") && !seen.has(src)) {
      seen.add(src);
      outputs.push({
        type: "video",
        url: src,
        thumbnailUrl: video?.poster || null,
        metadata: { duration: video?.duration || null, width: video?.videoWidth || null, height: video?.videoHeight || null },
      });
    }
  });

  // Images
  container.querySelectorAll("img[src]").forEach((el) => {
    const src = el.currentSrc || el.src;
    if (src?.startsWith("http") && !seen.has(src) && (el.naturalWidth > 64 || !el.complete)) {
      seen.add(src);
      outputs.push({
        type: "image",
        url: src,
        thumbnailUrl: src,
        metadata: { width: el.naturalWidth || null, height: el.naturalHeight || null },
      });
    }
  });

  return outputs;
}

function extractSettings(doc) {
  const settings = {};

  const modelEl = querySelector(doc, MODEL_SELECTORS);
  if (modelEl?.textContent?.trim()) settings.modelName = modelEl.textContent.trim();

  const ratioEl = querySelector(doc, RATIO_SELECTORS);
  if (ratioEl?.textContent?.trim()) settings.aspectRatio = ratioEl.textContent.trim();

  const durEl = querySelector(doc, DURATION_SELECTORS);
  if (durEl) {
    const val = durEl.value || durEl.textContent?.trim() || durEl.getAttribute("aria-valuenow");
    if (val) settings.duration = val;
  }

  return Object.keys(settings).length > 0 ? settings : null;
}

function inferAssetType(outputs) {
  if (outputs.some((o) => o.type === "video")) return "VIDEO";
  if (outputs.some((o) => o.type === "image")) return "IMAGE";
  return "IMAGE";
}

// ── Thread parsing ───────────────────────────────────────

function parseTurns(doc) {
  // Try ChatGPT-style data-message-author-role turns
  for (const sel of TURN_SELECTORS) {
    const turns = doc.querySelectorAll(sel);
    if (turns.length > 0) return Array.from(turns);
  }
  return [];
}

function turnRole(el) {
  const role = el.getAttribute("data-message-author-role");
  if (role) return role; // "user" or "assistant"
  // Fallback heuristic
  if (el.querySelector("img[alt*='User']")) return "user";
  return "assistant";
}

function turnPromptText(el) {
  // Extract user message text (skip any nested code/pre blocks)
  const clone = el.cloneNode(true);
  clone.querySelectorAll("pre, code, img, video, audio, svg").forEach((n) => n.remove());
  return clone.textContent?.trim() || "";
}

function buildCandidateFromTurnPair(userTurn, assistantTurn) {
  const prompt = turnPromptText(userTurn);
  const outputs = assistantTurn ? extractOutputsFromContainer(assistantTurn) : [];
  const assetType = inferAssetType(outputs);

  return { prompt, negativePrompt: null, outputs, settings: null, assetType, timestamp: 0 };
}

// ── Adapter ──────────────────────────────────────────────

const ChatGPTSoraAdapter = {
  platformKey: "openai-sora",
  displayName: "OpenAI Sora",

  match(url) {
    return URL_PATTERNS.some((p) => p.test(url));
  },

  extractLatest(doc) {
    // Strategy 1: Thread-based – find last user->assistant pair
    const turns = parseTurns(doc);
    if (turns.length >= 2) {
      // Walk backwards to find last user turn with a following assistant turn
      for (let i = turns.length - 1; i >= 0; i--) {
        if (turnRole(turns[i]) === "assistant") {
          // Look for preceding user turn
          for (let j = i - 1; j >= 0; j--) {
            if (turnRole(turns[j]) === "user") {
              const candidate = buildCandidateFromTurnPair(turns[j], turns[i]);
              if (candidate.prompt) {
                candidate.settings = extractSettings(doc);
                return candidate;
              }
              break;
            }
          }
        }
      }
    }

    // Strategy 2: Sora-specific prompt display + outputs
    for (const sel of PROMPT_DISPLAY_SELECTORS) {
      const el = doc.querySelector(sel);
      if (el?.textContent?.trim()) {
        const outputs = [
          ...extractOutputsFromContainer(doc.querySelector('[class*="generation-result"]') || doc.body),
        ];
        return {
          prompt: el.textContent.trim(),
          negativePrompt: null,
          outputs: outputs.slice(0, 10),
          settings: extractSettings(doc),
          assetType: inferAssetType(outputs),
          timestamp: 0,
        };
      }
    }

    // Strategy 3: Input bar fallback (least reliable)
    const inputEl = querySelector(doc, PROMPT_SELECTORS);
    const prompt = readText(inputEl);
    const allOutputs = [
      ...extractOutputsFromContainer(doc.body),
    ];

    // Filter to likely generation outputs (not avatars/icons)
    const filteredOutputs = allOutputs.filter((o) =>
      o.url.includes("oaiusercontent") || o.metadata?.width > 200 || o.type === "video"
    );

    return {
      prompt,
      negativePrompt: null,
      outputs: filteredOutputs.slice(0, 10),
      settings: extractSettings(doc),
      assetType: inferAssetType(filteredOutputs),
      timestamp: 0,
    };
  },

  extractCandidates(doc) {
    const candidates = [];
    const turns = parseTurns(doc);

    if (turns.length >= 2) {
      // Pair user + assistant turns, newest first
      const pairs = [];
      let i = turns.length - 1;

      while (i >= 0) {
        if (turnRole(turns[i]) === "assistant") {
          for (let j = i - 1; j >= 0; j--) {
            if (turnRole(turns[j]) === "user") {
              pairs.push({ user: turns[j], assistant: turns[i] });
              i = j - 1;
              break;
            }
            if (j === 0) i = -1;
          }
          if (pairs[pairs.length - 1]?.assistant !== turns[i]) i--;
        } else {
          // Orphan user turn (no response yet)
          pairs.push({ user: turns[i], assistant: null });
          i--;
        }
      }

      for (const pair of pairs) {
        const cand = buildCandidateFromTurnPair(pair.user, pair.assistant);
        if (cand.prompt || cand.outputs.length > 0) {
          cand.settings = extractSettings(doc);
          candidates.push(cand);
        }
      }
    }

    // If no thread turns found, fall back to single extraction
    if (candidates.length === 0) {
      candidates.push(this.extractLatest(doc));
    }

    return candidates.slice(0, 20);
  },

  applyPrompt(doc, text) {
    if (!text?.trim()) return { ok: false, error: "Prompt is empty" };

    const target = querySelector(doc, PROMPT_SELECTORS);
    if (!target) return { ok: false, error: "No prompt input found on this page" };

    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
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

export default ChatGPTSoraAdapter;
