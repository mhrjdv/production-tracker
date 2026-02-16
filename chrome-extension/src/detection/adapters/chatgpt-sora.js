/* ==========================================================
   Adapter: ChatGPT / Sora / DALL-E – Thread-aware extraction
   Handles all OpenAI generation platforms:
   - sora.com / sora.chatgpt.com (video)
   - chatgpt.com / chat.openai.com (DALL-E images, Sora video)
   ========================================================== */

const SORA_URL_PATTERNS = [
  /^https?:\/\/(www\.)?sora\.com/i,
  /^https?:\/\/sora\.chatgpt\.com/i,
];

const CHATGPT_URL_PATTERNS = [
  /^https?:\/\/chat\.openai\.com/i,
  /^https?:\/\/chatgpt\.com/i,
];

const ALL_URL_PATTERNS = [...SORA_URL_PATTERNS, ...CHATGPT_URL_PATTERNS];

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
  // ChatGPT prosemirror editor
  'div[id="prompt-textarea"][contenteditable="true"]',
  'div.ProseMirror[contenteditable="true"]',
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

// ── Thread turn selectors (ChatGPT conversation structure) ──

const TURN_SELECTORS = [
  "[data-message-author-role]",
  '[data-testid^="conversation-turn"]',
  "article[data-testid]",
];

// ── URL patterns for generated images/videos ──────────────

const GENERATED_URL_PATTERNS = [
  "oaiusercontent",
  "oaidalleapiprodscus",
  "dalle",
  "blob.core.windows.net",
  "openai.com/file",
];

// ── Helpers ──────────────────────────────────────────────

function isSoraUrl(url) {
  return SORA_URL_PATTERNS.some((p) => p.test(url));
}

function isGeneratedUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return GENERATED_URL_PATTERNS.some((pat) => lower.includes(pat));
}

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

  // Images — broader detection for DALL-E and ChatGPT inline images
  container.querySelectorAll("img[src]").forEach((el) => {
    const src = el.currentSrc || el.src;
    if (!src?.startsWith("http") || seen.has(src)) return;

    // Skip tiny images (avatars, icons) unless they haven't loaded yet
    const isSmall = el.complete && el.naturalWidth > 0 && el.naturalWidth <= 48;
    if (isSmall) return;

    // Skip known UI elements
    const isAvatar = el.closest('[class*="avatar" i]') ||
      el.getAttribute("alt")?.toLowerCase().includes("avatar") ||
      el.closest('[data-testid*="avatar"]');
    if (isAvatar) return;

    // Accept: large images, unloaded images, or known generation URLs
    const isLarge = !el.complete || el.naturalWidth > 64;
    const isGenerated = isGeneratedUrl(src);
    if (isLarge || isGenerated) {
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
  for (const sel of TURN_SELECTORS) {
    const turns = doc.querySelectorAll(sel);
    if (turns.length > 0) return Array.from(turns);
  }
  return [];
}

function turnRole(el) {
  const role = el.getAttribute("data-message-author-role");
  if (role) return role; // "user", "assistant", or "tool"
  // Fallback heuristic
  if (el.querySelector("img[alt*='User']")) return "user";
  return "assistant";
}

function turnPromptText(el) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll("pre, code, img, video, audio, svg, button").forEach((n) => n.remove());
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

  get displayName() {
    // Dynamic: content script runs in page context so we can check URL
    try {
      if (typeof window !== "undefined" && isSoraUrl(window.location.href)) {
        return "Sora";
      }
    } catch {
      // Not in page context
    }
    return "ChatGPT";
  },

  match(url) {
    return ALL_URL_PATTERNS.some((p) => p.test(url));
  },

  /**
   * Resolve display name from a specific URL (used by engine).
   */
  displayNameForUrl(url) {
    if (isSoraUrl(url)) return "Sora";
    return "ChatGPT";
  },

  extractLatest(doc) {
    // Strategy 1: Thread-based – find last user->assistant pair
    const turns = parseTurns(doc);
    if (turns.length >= 2) {
      for (let i = turns.length - 1; i >= 0; i--) {
        const role = turnRole(turns[i]);
        // Skip tool turns (DALL-E generates tool messages before assistant)
        if (role === "assistant" || role === "tool") {
          // Check if this turn has outputs
          const outputs = extractOutputsFromContainer(turns[i]);
          if (outputs.length > 0) {
            // Find the preceding user turn
            for (let j = i - 1; j >= 0; j--) {
              if (turnRole(turns[j]) === "user") {
                const candidate = buildCandidateFromTurnPair(turns[j], turns[i]);
                if (candidate.prompt || candidate.outputs.length > 0) {
                  candidate.settings = extractSettings(doc);
                  return candidate;
                }
                break;
              }
            }
          }
          // No outputs, try the standard user->assistant pairing
          if (role === "assistant") {
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
    const allOutputs = extractOutputsFromContainer(doc.body);

    // Filter to likely generation outputs (not avatars/icons)
    const filteredOutputs = allOutputs.filter((o) =>
      isGeneratedUrl(o.url) || o.metadata?.width > 200 || o.type === "video"
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
      const pairs = [];
      let i = turns.length - 1;

      while (i >= 0) {
        const role = turnRole(turns[i]);
        if (role === "assistant" || role === "tool") {
          // Find preceding user turn
          let found = false;
          for (let j = i - 1; j >= 0; j--) {
            if (turnRole(turns[j]) === "user") {
              pairs.push({ user: turns[j], assistant: turns[i] });
              i = j - 1;
              found = true;
              break;
            }
          }
          if (!found) i--;
        } else if (role === "user") {
          // Orphan user turn (no response yet)
          pairs.push({ user: turns[i], assistant: null });
          i--;
        } else {
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
