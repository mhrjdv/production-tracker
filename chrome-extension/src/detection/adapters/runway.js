/* ==========================================================
   Adapter: Runway – Generation history as turns
   ========================================================== */

const URL_PATTERNS = [
  /^https?:\/\/app\.runwayml\.com/i,
  /^https?:\/\/(www\.)?runwayml\.com/i,
  /^https?:\/\/runway\.com/i,
];

const PROMPT_SELECTORS = [
  'textarea[data-testid="prompt-input"]',
  'textarea[placeholder*="Describe" i]',
  'textarea[placeholder*="prompt" i]',
  'textarea[aria-label*="text prompt" i]',
  '[data-testid="generation-prompt"] textarea',
  '[contenteditable="true"][data-testid="prompt-editor"]',
  '[contenteditable="true"][class*="prompt"]',
  '[class*="PromptEditor"] textarea',
  '[class*="PromptInput"] textarea',
];

const HISTORY_CARD_SELECTORS = [
  '[data-testid="generation-card"]',
  '[class*="generation-item"]',
  '[class*="HistoryCard"]',
  '[class*="generation-card"]',
];

const MODEL_SELECTORS = [
  '[data-testid="model-selector"]',
  '[class*="model-selector"]',
  '[class*="ModelSelector"]',
  '[class*="model-badge"]',
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
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el.value?.trim() || "";
  return el.textContent?.trim() || "";
}

function extractOutputsFromContainer(container) {
  const outputs = [];
  const seen = new Set();

  container.querySelectorAll("video[src], video source[src]").forEach((el) => {
    const video = el.tagName === "SOURCE" ? el.closest("video") : el;
    const src = video?.currentSrc || video?.src || el.src;
    if (src?.startsWith("http") && !seen.has(src)) {
      seen.add(src);
      outputs.push({
        type: "video", url: src, thumbnailUrl: video?.poster || null,
        metadata: { duration: video?.duration || null, width: video?.videoWidth || null, height: video?.videoHeight || null },
      });
    }
  });

  container.querySelectorAll("img[src]").forEach((el) => {
    const src = el.currentSrc || el.src;
    if (src?.startsWith("http") && !seen.has(src) && (el.naturalWidth > 100 || !el.complete)) {
      seen.add(src);
      outputs.push({
        type: "image", url: src, thumbnailUrl: src,
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

  const durEl = doc.querySelector('[data-testid="duration-slider"]') ||
    doc.querySelector('input[aria-label*="duration" i]');
  if (durEl) {
    const val = durEl.value || durEl.getAttribute("aria-valuenow");
    if (val) settings.duration = val;
  }

  const ratioEl = doc.querySelector('[data-testid="aspect-ratio"]') ||
    doc.querySelector('button[class*="ratio"][aria-pressed="true"]');
  if (ratioEl?.textContent?.trim()) settings.aspectRatio = ratioEl.textContent.trim();

  const seedEl = doc.querySelector('input[data-testid="seed-input"]') ||
    doc.querySelector('input[aria-label*="seed" i]');
  if (seedEl?.value) settings.seed = parseInt(seedEl.value, 10);

  return Object.keys(settings).length > 0 ? settings : null;
}

function inferAssetType(outputs) {
  if (outputs.some((o) => o.type === "video")) return "VIDEO";
  return "IMAGE";
}

// ── Adapter ──────────────────────────────────────────────

const RunwayAdapter = {
  platformKey: "runway",
  displayName: "Runway",

  match(url) {
    return URL_PATTERNS.some((p) => p.test(url));
  },

  extractLatest(doc) {
    // Try latest history card
    const cards = [];
    for (const sel of HISTORY_CARD_SELECTORS) {
      doc.querySelectorAll(sel).forEach((el) => cards.push(el));
      if (cards.length > 0) break;
    }

    if (cards.length > 0) {
      const latest = cards[0];
      const promptEl = latest.querySelector('[class*="prompt"]') || latest.querySelector("p");
      const prompt = readText(promptEl);
      const outputs = extractOutputsFromContainer(latest);

      if (prompt || outputs.length > 0) {
        return {
          prompt, negativePrompt: null, outputs,
          settings: extractSettings(doc), assetType: inferAssetType(outputs), timestamp: 0,
        };
      }
    }

    // Fallback: input bar + page outputs
    const inputEl = querySelector(doc, PROMPT_SELECTORS);
    const prompt = readText(inputEl);
    const outputs = extractOutputsFromContainer(doc.body).filter(
      (o) => o.url.includes("runway") || o.metadata?.width > 200 || o.type === "video"
    );

    return {
      prompt, negativePrompt: null, outputs: outputs.slice(0, 10),
      settings: extractSettings(doc), assetType: inferAssetType(outputs), timestamp: 0,
    };
  },

  extractCandidates(doc) {
    const candidates = [];

    const cards = [];
    for (const sel of HISTORY_CARD_SELECTORS) {
      doc.querySelectorAll(sel).forEach((el) => cards.push(el));
      if (cards.length > 0) break;
    }

    for (const card of cards) {
      const promptEl = card.querySelector('[class*="prompt"]') || card.querySelector("p");
      const prompt = readText(promptEl);
      const outputs = extractOutputsFromContainer(card);

      if (prompt || outputs.length > 0) {
        candidates.push({
          prompt, negativePrompt: null, outputs,
          settings: extractSettings(doc), assetType: inferAssetType(outputs), timestamp: 0,
        });
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

export default RunwayAdapter;
