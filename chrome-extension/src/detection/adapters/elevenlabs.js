/* ==========================================================
   Adapter: ElevenLabs – Multi-mode (TTS/SFX/Music) extraction
   ========================================================== */

const URL_PATTERNS = [
  /^https?:\/\/(www\.)?elevenlabs\.io/i,
  /^https?:\/\/beta\.elevenlabs\.io/i,
];

const PROMPT_SELECTORS = [
  'textarea[data-testid="prompt-input"]',
  'textarea[placeholder*="Describe" i]',
  'textarea[placeholder*="sound" i]',
  'textarea[placeholder*="effect" i]',
  'textarea[aria-label*="prompt" i]',
  'textarea[data-testid="tts-input"]',
  'textarea[data-testid="text-input"]',
  'textarea[placeholder*="Enter text" i]',
  'textarea[placeholder*="Type or paste" i]',
  'textarea[aria-label*="text to speech" i]',
  '[data-testid="synthesis-input"] textarea',
  '[contenteditable="true"][data-testid="text-input"]',
  '[contenteditable="true"][class*="text-input"]',
  '[contenteditable="true"][role="textbox"]',
  '[class*="prompt-editor"] textarea',
];

const HISTORY_SELECTORS = [
  '[data-testid="history-item"]',
  '[class*="history-item"]',
  '[class*="GenerationCard"]',
  '[class*="generation-item"]',
];

const VOICE_SELECTORS = [
  '[data-testid="voice-selector"]',
  '[data-testid="selected-voice"]',
  '[class*="voice-selector"]',
  '[class*="voice-name"]',
];

const MODEL_SELECTORS = [
  '[data-testid="model-selector"]',
  '[class*="model-select"]',
  '[class*="ModelSelector"]',
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

function extractAudioOutputsFromContainer(container) {
  const outputs = [];
  const seen = new Set();

  container.querySelectorAll("audio[src], audio source[src]").forEach((el) => {
    const audio = el.tagName === "SOURCE" ? el.closest("audio") : el;
    const src = audio?.currentSrc || audio?.src || el.src;
    if (src?.startsWith("http") && !seen.has(src)) {
      seen.add(src);
      outputs.push({
        type: "audio", url: src, thumbnailUrl: null,
        metadata: { duration: audio?.duration || null },
      });
    }
  });

  // Blob URLs
  container.querySelectorAll('audio[src^="blob:"]').forEach((el) => {
    const src = el.currentSrc || el.src;
    if (src && !seen.has(src)) {
      seen.add(src);
      outputs.push({
        type: "audio", url: src, thumbnailUrl: null,
        metadata: { duration: el.duration || null, note: "blob-url" },
      });
    }
  });

  return outputs;
}

function extractSettings(doc) {
  const settings = {};

  const voiceEl = querySelector(doc, VOICE_SELECTORS);
  if (voiceEl?.textContent?.trim()) settings.voiceName = voiceEl.textContent.trim();

  const modelEl = querySelector(doc, MODEL_SELECTORS);
  if (modelEl?.textContent?.trim()) settings.modelName = modelEl.textContent.trim();

  const stabilityEl = doc.querySelector('input[data-testid="stability-slider"]') ||
    doc.querySelector('input[aria-label*="stability" i]');
  if (stabilityEl?.value) settings.stability = parseFloat(stabilityEl.value);

  const simEl = doc.querySelector('input[data-testid="similarity-slider"]') ||
    doc.querySelector('input[aria-label*="similarity" i]');
  if (simEl?.value) settings.similarity = parseFloat(simEl.value);

  return Object.keys(settings).length > 0 ? settings : null;
}

function inferMode(doc) {
  const url = doc.location?.href || "";
  if (url.includes("/sound-effects") || url.includes("/sfx")) return "SFX";
  if (url.includes("/music")) return "MUSIC";
  return "VOICE";
}

function modeToAssetType(mode) {
  if (mode === "MUSIC") return "MUSIC";
  if (mode === "SFX") return "SFX";
  return "VOICE";
}

// ── Adapter ──────────────────────────────────────────────

const ElevenLabsAdapter = {
  platformKey: "elevenlabs",
  displayName: "ElevenLabs",

  match(url) {
    return URL_PATTERNS.some((p) => p.test(url));
  },

  extractLatest(doc) {
    const mode = inferMode(doc);

    // Try input bar
    const inputEl = querySelector(doc, PROMPT_SELECTORS);
    const prompt = readText(inputEl);

    // Try history items for most recent
    const historyItems = [];
    for (const sel of HISTORY_SELECTORS) {
      doc.querySelectorAll(sel).forEach((el) => historyItems.push(el));
      if (historyItems.length > 0) break;
    }

    // Get prompt from latest history item if input is empty
    let historyPrompt = "";
    if (historyItems.length > 0) {
      const latest = historyItems[0];
      const textEl = latest.querySelector('[class*="text"]') ||
        latest.querySelector('[data-testid*="text"]');
      historyPrompt = readText(textEl);
    }

    // Collect audio outputs
    const outputs = extractAudioOutputsFromContainer(doc.body);

    return {
      prompt: prompt || historyPrompt,
      negativePrompt: null,
      outputs: outputs.slice(0, 10),
      settings: extractSettings(doc),
      assetType: modeToAssetType(mode),
      timestamp: 0,
    };
  },

  extractCandidates(doc) {
    const candidates = [];
    const mode = inferMode(doc);

    // Parse history items as candidates
    const historyItems = [];
    for (const sel of HISTORY_SELECTORS) {
      doc.querySelectorAll(sel).forEach((el) => historyItems.push(el));
      if (historyItems.length > 0) break;
    }

    for (const item of historyItems) {
      const textEl = item.querySelector('[class*="text"]') ||
        item.querySelector('[data-testid*="text"]') ||
        item.querySelector("p");
      const prompt = readText(textEl);
      const outputs = extractAudioOutputsFromContainer(item);

      if (prompt || outputs.length > 0) {
        candidates.push({
          prompt, negativePrompt: null, outputs,
          settings: extractSettings(doc), assetType: modeToAssetType(mode), timestamp: 0,
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

export default ElevenLabsAdapter;
