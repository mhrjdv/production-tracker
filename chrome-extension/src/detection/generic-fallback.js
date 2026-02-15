/* ==========================================================
   Detection V2 – Generic fallback adapter
   Preserves exact current content-script.js logic for
   unrecognized platforms.
   ========================================================== */

const PROMPT_HINTS = [
  "prompt", "describe", "idea", "scene", "shot",
  "lyrics", "script", "narration", "voice", "style",
];

function isVisible(el) {
  if (!(el instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getElementTextHint(el) {
  const attrs = [
    el.getAttribute("placeholder"),
    el.getAttribute("aria-label"),
    el.getAttribute("name"),
    el.getAttribute("id"),
    el.getAttribute("data-testid"),
    el.getAttribute("data-slot"),
  ];
  return attrs.filter(Boolean).join(" ").toLowerCase();
}

function scorePromptField(el, text) {
  let score = 0;
  const hint = getElementTextHint(el);
  for (const key of PROMPT_HINTS) {
    if (hint.includes(key)) score += 3;
  }
  if (el.tagName === "TEXTAREA") score += 2;
  if (el === document.activeElement) score += 2;
  if (text.length > 30) score += 2;
  if (text.length > 120) score += 2;
  return score;
}

function getPromptCandidates() {
  const nodes = [
    ...document.querySelectorAll("textarea"),
    ...document.querySelectorAll("input[type='text'], input:not([type])"),
    ...document.querySelectorAll("[contenteditable='true']"),
  ];

  const candidates = [];
  for (const node of nodes) {
    if (!isVisible(node)) continue;
    const text =
      node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement
        ? node.value.trim()
        : node.textContent?.trim() || "";
    if (!text) continue;
    candidates.push({ element: node, text, score: scorePromptField(node, text) });
  }
  return candidates.sort((a, b) => b.score - a.score);
}

function readLikelyModelName() {
  const selectors = [
    "[data-model]",
    "[data-testid*='model']",
    "[aria-label*='model' i]",
    "[class*='model']",
  ];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (!el) continue;
    const model = (
      el.getAttribute("data-model") ||
      el.getAttribute("aria-label") ||
      el.textContent || ""
    ).trim();
    if (model.length >= 2 && model.length <= 100) return model;
  }
  return "";
}

function readBestOutputUrl() {
  const media = [
    ...document.querySelectorAll("video[src]"),
    ...document.querySelectorAll("img[src]"),
  ].filter(isVisible);

  let best = "";
  let bestArea = 0;
  for (const item of media) {
    const src = item.currentSrc || item.src || "";
    if (!src.startsWith("http")) continue;
    const rect = item.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area > bestArea) {
      bestArea = area;
      best = src;
    }
  }
  return best;
}

function inferAssetTypeFromPage() {
  const host = window.location.hostname.toLowerCase();
  if (host.includes("suno") || host.includes("udio")) return "MUSIC";
  if (host.includes("elevenlabs") || host.includes("play.ht") || host.includes("murf")) return "VOICE";
  if (host.includes("runway") || host.includes("sora") || host.includes("kling") || host.includes("veo") || host.includes("pika")) return "VIDEO";
  return "IMAGE";
}

function findBestWritablePromptInput() {
  const candidates = [
    ...document.querySelectorAll("textarea"),
    ...document.querySelectorAll("input[type='text'], input:not([type])"),
    ...document.querySelectorAll("[contenteditable='true']"),
  ].filter(isVisible);

  let best = null;
  let bestScore = -1;
  for (const el of candidates) {
    if ("disabled" in el && el.disabled) continue;
    if ("readOnly" in el && el.readOnly) continue;
    const score = scorePromptField(el, "");
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

function dispatchInputEvents(el) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/** @type {import("./engine.js").Adapter} */
const GenericFallback = {
  platformKey: "__generic__",
  displayName: "Generic",

  match(_url) {
    return true; // Always matches as last resort
  },

  extractLatest(_doc) {
    const promptCands = getPromptCandidates();
    const prompt = promptCands[0]?.text || "";
    const outputUrl = readBestOutputUrl();
    const modelName = readLikelyModelName();

    return {
      prompt,
      negativePrompt: null,
      outputs: outputUrl
        ? [{ type: inferAssetTypeFromPage().toLowerCase(), url: outputUrl, thumbnailUrl: null, metadata: {} }]
        : [],
      settings: modelName ? { modelName } : null,
      assetType: inferAssetTypeFromPage(),
      timestamp: 0,
    };
  },

  extractCandidates(_doc) {
    // Generic fallback only returns one candidate
    return [this.extractLatest(_doc)];
  },

  applyPrompt(_doc, text) {
    if (!text?.trim()) return { ok: false, error: "Prompt is empty" };

    const target = findBestWritablePromptInput();
    if (!target) return { ok: false, error: "No editable prompt input found on this page" };

    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      target.focus();
      target.value = text;
      dispatchInputEvents(target);
      return { ok: true };
    }

    if (target instanceof HTMLElement && target.isContentEditable) {
      target.focus();
      target.textContent = text;
      dispatchInputEvents(target);
      return { ok: true };
    }

    return { ok: false, error: "Unsupported input field type" };
  },
};

export default GenericFallback;
