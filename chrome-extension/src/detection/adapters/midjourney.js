/* ==========================================================
   Adapter: Midjourney – Job cards/gallery, --param parsing
   ========================================================== */

const URL_PATTERNS = [
  /^https?:\/\/(www\.)?midjourney\.com/i,
  /^https?:\/\/alpha\.midjourney\.com/i,
];

const PROMPT_SELECTORS = [
  'textarea[data-testid="prompt-input"]',
  'textarea[placeholder*="Imagine" i]',
  'textarea[placeholder*="Describe" i]',
  'textarea[aria-label*="prompt" i]',
  '[data-testid="prompt-textarea"]',
  '[contenteditable="true"][data-placeholder*="Imagine" i]',
  '[contenteditable="true"][class*="prompt"]',
];

const PROMPT_DISPLAY_SELECTORS = [
  '[class*="prompt-text"]',
  '[data-testid="job-prompt"]',
  '[class*="PromptText"]',
];

const JOB_CARD_SELECTORS = [
  '[data-testid="job-card"]',
  '[class*="job-card"]',
  '[class*="TaskCard"]',
  '[class*="image-card"]',
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

/**
 * Parse Midjourney --parameters from prompt text.
 * Returns { cleanPrompt, settings }
 */
function parseMjParams(fullText) {
  const settings = {};
  let cleanPrompt = fullText;

  const versionMatch = fullText.match(/--v\s+([\d.]+)/i);
  if (versionMatch) settings.modelName = `Midjourney v${versionMatch[1]}`;

  const arMatch = fullText.match(/--ar\s+([\d:]+)/i);
  if (arMatch) settings.aspectRatio = arMatch[1];

  const seedMatch = fullText.match(/--seed\s+(\d+)/i);
  if (seedMatch) settings.seed = parseInt(seedMatch[1], 10);

  const styleMatch = fullText.match(/--style\s+(\w+)/i);
  if (styleMatch) settings.style = styleMatch[1];

  const qualityMatch = fullText.match(/--q\s+([\d.]+)/i);
  if (qualityMatch) settings.quality = parseFloat(qualityMatch[1]);

  const chaosMatch = fullText.match(/--chaos\s+(\d+)/i);
  if (chaosMatch) settings.chaos = parseInt(chaosMatch[1], 10);

  const stylizeMatch = fullText.match(/--s\s+(\d+)/i) || fullText.match(/--stylize\s+(\d+)/i);
  if (stylizeMatch) settings.stylize = parseInt(stylizeMatch[1], 10);

  // Strip parameters from prompt
  const paramIndex = fullText.search(/\s+--\w/);
  if (paramIndex > 0) cleanPrompt = fullText.substring(0, paramIndex).trim();

  return { cleanPrompt, settings };
}

function extractImagesFromContainer(container) {
  const outputs = [];
  const seen = new Set();

  // Images
  container.querySelectorAll("img[src]").forEach((el) => {
    const src = el.currentSrc || el.src;
    if (src?.startsWith("http") && !seen.has(src) && (el.naturalWidth > 64 || !el.complete)) {
      seen.add(src);
      outputs.push({
        type: "image", url: src, thumbnailUrl: src,
        metadata: { width: el.naturalWidth || null, height: el.naturalHeight || null, alt: el.alt || null },
      });
    }
  });

  // Background-image cards
  container.querySelectorAll('[style*="background-image"]').forEach((el) => {
    const match = el.style.backgroundImage?.match(/url\(["']?(.*?)["']?\)/);
    if (match?.[1]?.startsWith("http") && !seen.has(match[1])) {
      seen.add(match[1]);
      outputs.push({
        type: "image", url: match[1], thumbnailUrl: match[1], metadata: {},
      });
    }
  });

  return outputs;
}

function extractSettings(doc) {
  // Try reading from UI controls (in addition to --params parsed from prompt)
  const settings = {};

  const modelSelectors = [
    '[data-testid="model-selector"]',
    '[class*="version-selector"]',
    '[class*="ModelDropdown"]',
  ];

  for (const sel of modelSelectors) {
    const el = doc.querySelector(sel);
    if (el?.textContent?.trim()) {
      settings.modelName = el.textContent.trim();
      break;
    }
  }

  const ratioSelectors = [
    '[data-testid="aspect-ratio-selector"]',
    '[class*="aspect-ratio"][class*="selected"]',
    'button[class*="ratio"][aria-pressed="true"]',
  ];

  for (const sel of ratioSelectors) {
    const el = doc.querySelector(sel);
    if (el?.textContent?.trim()) {
      settings.aspectRatio = el.textContent.trim();
      break;
    }
  }

  return Object.keys(settings).length > 0 ? settings : null;
}

// ── Adapter ──────────────────────────────────────────────

const MidjourneyAdapter = {
  platformKey: "midjourney",
  displayName: "Midjourney",

  match(url) {
    return URL_PATTERNS.some((p) => p.test(url));
  },

  extractLatest(doc) {
    // Try job cards - most recent first
    const cards = [];
    for (const sel of JOB_CARD_SELECTORS) {
      doc.querySelectorAll(sel).forEach((el) => cards.push(el));
      if (cards.length > 0) break;
    }

    if (cards.length > 0) {
      const latest = cards[0];
      const promptEl = latest.querySelector('[class*="prompt"]') ||
        latest.querySelector('[data-testid="prompt"]');
      const fullText = readText(promptEl);

      if (fullText) {
        const { cleanPrompt, settings: paramSettings } = parseMjParams(fullText);
        const uiSettings = extractSettings(doc);
        const outputs = extractImagesFromContainer(latest);

        return {
          prompt: cleanPrompt,
          negativePrompt: null,
          outputs,
          settings: { ...paramSettings, ...uiSettings },
          assetType: "IMAGE",
          timestamp: 0,
        };
      }
    }

    // Fallback: prompt display + page images
    const displayEl = querySelector(doc, PROMPT_DISPLAY_SELECTORS);
    const displayText = readText(displayEl);

    if (displayText) {
      const { cleanPrompt, settings: paramSettings } = parseMjParams(displayText);
      const outputs = extractImagesFromContainer(doc.body).filter(
        (o) => o.url.includes("midjourney") || o.url.includes("mj-") || o.url.includes("cdn.midjourney")
      );

      return {
        prompt: cleanPrompt,
        negativePrompt: null,
        outputs: outputs.slice(0, 10),
        settings: { ...paramSettings, ...extractSettings(doc) },
        assetType: "IMAGE",
        timestamp: 0,
      };
    }

    // Last resort: input bar
    const inputEl = querySelector(doc, PROMPT_SELECTORS);
    const inputText = readText(inputEl);
    const { cleanPrompt, settings: paramSettings } = parseMjParams(inputText);

    return {
      prompt: cleanPrompt,
      negativePrompt: null,
      outputs: [],
      settings: { ...paramSettings, ...extractSettings(doc) },
      assetType: "IMAGE",
      timestamp: 0,
    };
  },

  extractCandidates(doc) {
    const candidates = [];

    const cards = [];
    for (const sel of JOB_CARD_SELECTORS) {
      doc.querySelectorAll(sel).forEach((el) => cards.push(el));
      if (cards.length > 0) break;
    }

    for (const card of cards) {
      const promptEl = card.querySelector('[class*="prompt"]') ||
        card.querySelector('[data-testid="prompt"]');
      const fullText = readText(promptEl);
      const { cleanPrompt, settings: paramSettings } = parseMjParams(fullText);
      const outputs = extractImagesFromContainer(card);

      if (cleanPrompt || outputs.length > 0) {
        candidates.push({
          prompt: cleanPrompt,
          negativePrompt: null,
          outputs,
          settings: { ...paramSettings, ...extractSettings(doc) },
          assetType: "IMAGE",
          timestamp: 0,
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

export default MidjourneyAdapter;
