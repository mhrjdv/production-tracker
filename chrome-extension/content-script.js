const PROMPT_HINTS = [
  "prompt",
  "describe",
  "idea",
  "scene",
  "shot",
  "lyrics",
  "script",
  "narration",
  "voice",
  "style",
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
    ...Array.from(document.querySelectorAll("textarea")),
    ...Array.from(document.querySelectorAll("input[type='text'], input:not([type])")),
    ...Array.from(document.querySelectorAll("[contenteditable='true']")),
  ];

  const candidates = [];
  for (const node of nodes) {
    if (!isVisible(node)) continue;
    const text =
      node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement
        ? node.value.trim()
        : node.textContent?.trim() || "";
    if (!text) continue;
    candidates.push({
      element: node,
      text,
      score: scorePromptField(node, text),
    });
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
      el.textContent ||
      ""
    ).trim();
    if (model.length >= 2 && model.length <= 100) {
      return model;
    }
  }

  return "";
}

function readBestOutputUrl() {
  const media = [
    ...Array.from(document.querySelectorAll("video[src]")),
    ...Array.from(document.querySelectorAll("img[src]")),
  ].filter((el) => isVisible(el));

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
  if (host.includes("runway") || host.includes("sora") || host.includes("kling") || host.includes("veo") || host.includes("pika")) {
    return "VIDEO";
  }
  return "IMAGE";
}

function extractPageContext() {
  const promptCandidates = getPromptCandidates();
  const prompt = promptCandidates[0]?.text || "";

  return {
    prompt,
    modelName: readLikelyModelName(),
    outputUrl: readBestOutputUrl(),
    sourceUrl: window.location.href,
    assetType: inferAssetTypeFromPage(),
  };
}

function findBestWritablePromptInput() {
  const candidates = [
    ...Array.from(document.querySelectorAll("textarea")),
    ...Array.from(document.querySelectorAll("input[type='text'], input:not([type])")),
    ...Array.from(document.querySelectorAll("[contenteditable='true']")),
  ].filter((el) => isVisible(el));

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

function applyPrompt(prompt) {
  if (!prompt || !prompt.trim()) return { ok: false, error: "Prompt is empty" };

  const target = findBestWritablePromptInput();
  if (!target) {
    return { ok: false, error: "No editable prompt input found on this page" };
  }

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    target.focus();
    target.value = prompt;
    dispatchInputEvents(target);
    return { ok: true };
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    target.focus();
    target.textContent = prompt;
    dispatchInputEvents(target);
    return { ok: true };
  }

  return { ok: false, error: "Unsupported input field type" };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "extract-page-context") {
    sendResponse({ ok: true, context: extractPageContext() });
    return;
  }

  if (message?.type === "apply-prompt") {
    sendResponse(applyPrompt(String(message.prompt || "")));
    return;
  }
});
