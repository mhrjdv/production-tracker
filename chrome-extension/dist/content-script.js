"use strict";
(() => {
  // chrome-extension/src/detection/adapters/chatgpt-sora.js
  var SORA_URL_PATTERNS = [
    /^https?:\/\/(www\.)?sora\.com/i,
    /^https?:\/\/sora\.chatgpt\.com/i
  ];
  var CHATGPT_URL_PATTERNS = [
    /^https?:\/\/chat\.openai\.com/i,
    /^https?:\/\/chatgpt\.com/i
  ];
  var ALL_URL_PATTERNS = [...SORA_URL_PATTERNS, ...CHATGPT_URL_PATTERNS];
  var PROMPT_SELECTORS = [
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
    'div.ProseMirror[contenteditable="true"]'
  ];
  var PROMPT_DISPLAY_SELECTORS = [
    '[data-testid="generation-prompt"]',
    ".generation-prompt",
    '[class*="prompt-text"]',
    '[class*="PromptDisplay"]'
  ];
  var MODEL_SELECTORS = [
    '[data-testid="model-selector"]',
    '[data-testid="model-badge"]',
    '[class*="model-name"]',
    '[class*="ModelSelector"]',
    '[aria-label*="model" i]'
  ];
  var RATIO_SELECTORS = [
    '[data-testid="aspect-ratio"]',
    '[class*="aspect-ratio"]',
    'button[class*="ratio"][aria-pressed="true"]'
  ];
  var DURATION_SELECTORS = [
    '[data-testid="duration-selector"]',
    '[class*="duration"]',
    '[aria-label*="duration" i]'
  ];
  var TURN_SELECTORS = [
    "[data-message-author-role]",
    '[data-testid^="conversation-turn"]',
    "article[data-testid]"
  ];
  var GENERATED_URL_PATTERNS = [
    "oaiusercontent",
    "oaidalleapiprodscus",
    "dalle",
    "blob.core.windows.net",
    "openai.com/file"
  ];
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
    const seen = /* @__PURE__ */ new Set();
    container.querySelectorAll("video[src], video source[src]").forEach((el) => {
      const video = el.tagName === "SOURCE" ? el.closest("video") : el;
      const src = video?.currentSrc || video?.src || el.src;
      if (src?.startsWith("http") && !seen.has(src)) {
        seen.add(src);
        outputs.push({
          type: "video",
          url: src,
          thumbnailUrl: video?.poster || null,
          metadata: { duration: video?.duration || null, width: video?.videoWidth || null, height: video?.videoHeight || null }
        });
      }
    });
    container.querySelectorAll("img[src]").forEach((el) => {
      const src = el.currentSrc || el.src;
      if (!src?.startsWith("http") || seen.has(src)) return;
      const isSmall = el.complete && el.naturalWidth > 0 && el.naturalWidth <= 48;
      if (isSmall) return;
      const isAvatar = el.closest('[class*="avatar" i]') || el.getAttribute("alt")?.toLowerCase().includes("avatar") || el.closest('[data-testid*="avatar"]');
      if (isAvatar) return;
      const isLarge = !el.complete || el.naturalWidth > 64;
      const isGenerated = isGeneratedUrl(src);
      if (isLarge || isGenerated) {
        seen.add(src);
        outputs.push({
          type: "image",
          url: src,
          thumbnailUrl: src,
          metadata: { width: el.naturalWidth || null, height: el.naturalHeight || null }
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
  function parseTurns(doc) {
    for (const sel of TURN_SELECTORS) {
      const turns = doc.querySelectorAll(sel);
      if (turns.length > 0) return Array.from(turns);
    }
    return [];
  }
  function turnRole(el) {
    const role = el.getAttribute("data-message-author-role");
    if (role) return role;
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
  var ChatGPTSoraAdapter = {
    platformKey: "openai-sora",
    get displayName() {
      try {
        if (typeof window !== "undefined" && isSoraUrl(window.location.href)) {
          return "Sora";
        }
      } catch {
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
      const turns = parseTurns(doc);
      if (turns.length >= 2) {
        for (let i = turns.length - 1; i >= 0; i--) {
          const role = turnRole(turns[i]);
          if (role === "assistant" || role === "tool") {
            const outputs = extractOutputsFromContainer(turns[i]);
            if (outputs.length > 0) {
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
      for (const sel of PROMPT_DISPLAY_SELECTORS) {
        const el = doc.querySelector(sel);
        if (el?.textContent?.trim()) {
          const outputs = [
            ...extractOutputsFromContainer(doc.querySelector('[class*="generation-result"]') || doc.body)
          ];
          return {
            prompt: el.textContent.trim(),
            negativePrompt: null,
            outputs: outputs.slice(0, 10),
            settings: extractSettings(doc),
            assetType: inferAssetType(outputs),
            timestamp: 0
          };
        }
      }
      const inputEl = querySelector(doc, PROMPT_SELECTORS);
      const prompt = readText(inputEl);
      const allOutputs = extractOutputsFromContainer(doc.body);
      const filteredOutputs = allOutputs.filter(
        (o) => isGeneratedUrl(o.url) || o.metadata?.width > 200 || o.type === "video"
      );
      return {
        prompt,
        negativePrompt: null,
        outputs: filteredOutputs.slice(0, 10),
        settings: extractSettings(doc),
        assetType: inferAssetType(filteredOutputs),
        timestamp: 0
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
    }
  };
  var chatgpt_sora_default = ChatGPTSoraAdapter;

  // chrome-extension/src/detection/adapters/gemini.js
  var URL_PATTERNS = [
    /^https?:\/\/gemini\.google\.com/i,
    /^https?:\/\/aistudio\.google\.com/i,
    /^https?:\/\/deepmind\.google.*veo/i,
    /^https?:\/\/labs\.google.*video/i
  ];
  var PROMPT_SELECTORS2 = [
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
    '[contenteditable="true"][data-placeholder*="Enter" i]'
  ];
  var MODEL_SELECTORS2 = [
    '[data-testid="model-selector"]',
    'button[aria-label*="model" i]',
    '[class*="model-selector"]',
    '[class*="ModelPicker"]',
    ".model-dropdown"
  ];
  var VIDEO_OUTPUT_SELECTORS = [
    '[data-testid="generated-video"] video',
    '[class*="video-result"] video',
    '[class*="generation-output"] video',
    '[class*="media-container"] video',
    'video[src*="googleusercontent"]',
    'video[src*="storage.googleapis"]'
  ];
  var IMAGE_OUTPUT_SELECTORS = [
    '[data-testid="generated-image"] img',
    '[class*="image-result"] img',
    '[class*="generation-output"] img',
    '[class*="media-container"] img:not([class*="avatar"])',
    'img[src*="googleusercontent"]:not([width="24"]):not([width="32"])',
    'img[src*="storage.googleapis"]:not([class*="icon"])'
  ];
  function querySelector2(doc, selectors) {
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function readText2(el) {
    if (!el) return "";
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)
      return el.value?.trim() || "";
    return el.textContent?.trim() || "";
  }
  function extractOutputsFromContainer2(container) {
    const outputs = [];
    const seen = /* @__PURE__ */ new Set();
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
            height: video?.videoHeight || null
          }
        });
      }
    });
    container.querySelectorAll("img[src]").forEach((el) => {
      const src = el.currentSrc || el.src;
      if (src?.startsWith("http") && !seen.has(src) && (el.naturalWidth > 100 || !el.complete)) {
        seen.add(src);
        outputs.push({
          type: "image",
          url: src,
          thumbnailUrl: src,
          metadata: {
            width: el.naturalWidth || null,
            height: el.naturalHeight || null
          }
        });
      }
    });
    return outputs;
  }
  function extractSettings2(doc) {
    const settings = {};
    const modelEl = querySelector2(doc, MODEL_SELECTORS2);
    if (modelEl?.textContent?.trim())
      settings.modelName = modelEl.textContent.trim();
    const tempEl = doc.querySelector('input[aria-label*="Temperature" i]') || doc.querySelector('[data-testid="temperature-slider"]');
    if (tempEl?.value) settings.temperature = parseFloat(tempEl.value);
    const ratioEl = doc.querySelector('[data-testid="aspect-ratio-selector"]') || doc.querySelector('button[class*="aspect"][aria-pressed="true"]');
    if (ratioEl?.textContent?.trim())
      settings.aspectRatio = ratioEl.textContent.trim();
    return Object.keys(settings).length > 0 ? settings : null;
  }
  function inferAssetType2(outputs) {
    if (outputs.some((o) => o.type === "video")) return "VIDEO";
    return "IMAGE";
  }
  function parseGeminiTurns(doc) {
    const combined = doc.querySelectorAll("user-query, model-response");
    if (combined.length > 0) {
      return Array.from(combined).map((el) => ({
        role: el.tagName.toLowerCase() === "user-query" ? "user" : "assistant",
        el
      }));
    }
    const generic = doc.querySelectorAll(
      '[data-testid="user-message"], [data-testid="model-response"]'
    );
    if (generic.length > 0) {
      return Array.from(generic).map((el) => ({
        role: el.getAttribute("data-testid")?.includes("user") ? "user" : "assistant",
        el
      }));
    }
    return [];
  }
  var GeminiAdapter = {
    platformKey: "google-gemini",
    displayName: "Google Gemini",
    match(url) {
      return URL_PATTERNS.some((p) => p.test(url));
    },
    extractLatest(doc) {
      const turns = parseGeminiTurns(doc);
      if (turns.length >= 2) {
        for (let i = turns.length - 1; i >= 0; i--) {
          if (turns[i].role === "assistant") {
            for (let j = i - 1; j >= 0; j--) {
              if (turns[j].role === "user") {
                const prompt2 = readText2(turns[j].el);
                const outputs2 = extractOutputsFromContainer2(turns[i].el);
                if (prompt2) {
                  const assetType = inferAssetType2(outputs2);
                  return {
                    prompt: prompt2,
                    negativePrompt: null,
                    outputs: outputs2,
                    settings: extractSettings2(doc),
                    assetType,
                    platformKey: assetType === "VIDEO" ? "google-veo" : void 0,
                    timestamp: 0
                  };
                }
                break;
              }
            }
          }
        }
      }
      const inputEl = querySelector2(doc, PROMPT_SELECTORS2);
      const prompt = readText2(inputEl);
      const outputs = [];
      const seen = /* @__PURE__ */ new Set();
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
              metadata: {}
            });
          }
        });
      }
      const fallbackAssetType = inferAssetType2(outputs);
      return {
        prompt,
        negativePrompt: null,
        outputs: outputs.slice(0, 10),
        settings: extractSettings2(doc),
        assetType: fallbackAssetType,
        platformKey: fallbackAssetType === "VIDEO" ? "google-veo" : void 0,
        timestamp: 0
      };
    },
    extractCandidates(doc) {
      const candidates = [];
      const turns = parseGeminiTurns(doc);
      let i = turns.length - 1;
      while (i >= 0) {
        if (turns[i].role === "assistant") {
          for (let j = i - 1; j >= 0; j--) {
            if (turns[j].role === "user") {
              const prompt = readText2(turns[j].el);
              const outputs = extractOutputsFromContainer2(turns[i].el);
              if (prompt || outputs.length > 0) {
                const candAssetType = inferAssetType2(outputs);
                candidates.push({
                  prompt,
                  negativePrompt: null,
                  outputs,
                  settings: extractSettings2(doc),
                  assetType: candAssetType,
                  platformKey: candAssetType === "VIDEO" ? "google-veo" : void 0,
                  timestamp: 0
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
      const target = querySelector2(doc, PROMPT_SELECTORS2);
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
    }
  };
  var gemini_default = GeminiAdapter;

  // chrome-extension/src/detection/adapters/midjourney.js
  var URL_PATTERNS2 = [
    /^https?:\/\/(www\.)?midjourney\.com/i,
    /^https?:\/\/alpha\.midjourney\.com/i
  ];
  var PROMPT_SELECTORS3 = [
    'textarea[data-testid="prompt-input"]',
    'textarea[placeholder*="Imagine" i]',
    'textarea[placeholder*="Describe" i]',
    'textarea[aria-label*="prompt" i]',
    '[data-testid="prompt-textarea"]',
    '[contenteditable="true"][data-placeholder*="Imagine" i]',
    '[contenteditable="true"][class*="prompt"]'
  ];
  var PROMPT_DISPLAY_SELECTORS2 = [
    '[class*="prompt-text"]',
    '[data-testid="job-prompt"]',
    '[class*="PromptText"]'
  ];
  var JOB_CARD_SELECTORS = [
    '[data-testid="job-card"]',
    '[class*="job-card"]',
    '[class*="TaskCard"]',
    '[class*="image-card"]'
  ];
  function querySelector3(doc, selectors) {
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function readText3(el) {
    if (!el) return "";
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el.value?.trim() || "";
    return el.textContent?.trim() || "";
  }
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
    const paramIndex = fullText.search(/\s+--\w/);
    if (paramIndex > 0) cleanPrompt = fullText.substring(0, paramIndex).trim();
    return { cleanPrompt, settings };
  }
  function extractImagesFromContainer(container) {
    const outputs = [];
    const seen = /* @__PURE__ */ new Set();
    container.querySelectorAll("img[src]").forEach((el) => {
      const src = el.currentSrc || el.src;
      if (src?.startsWith("http") && !seen.has(src) && (el.naturalWidth > 64 || !el.complete)) {
        seen.add(src);
        outputs.push({
          type: "image",
          url: src,
          thumbnailUrl: src,
          metadata: { width: el.naturalWidth || null, height: el.naturalHeight || null, alt: el.alt || null }
        });
      }
    });
    container.querySelectorAll('[style*="background-image"]').forEach((el) => {
      const match = el.style.backgroundImage?.match(/url\(["']?(.*?)["']?\)/);
      if (match?.[1]?.startsWith("http") && !seen.has(match[1])) {
        seen.add(match[1]);
        outputs.push({
          type: "image",
          url: match[1],
          thumbnailUrl: match[1],
          metadata: {}
        });
      }
    });
    return outputs;
  }
  function extractSettings3(doc) {
    const settings = {};
    const modelSelectors = [
      '[data-testid="model-selector"]',
      '[class*="version-selector"]',
      '[class*="ModelDropdown"]'
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
      'button[class*="ratio"][aria-pressed="true"]'
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
  var MidjourneyAdapter = {
    platformKey: "midjourney",
    displayName: "Midjourney",
    match(url) {
      return URL_PATTERNS2.some((p) => p.test(url));
    },
    extractLatest(doc) {
      const cards = [];
      for (const sel of JOB_CARD_SELECTORS) {
        doc.querySelectorAll(sel).forEach((el) => cards.push(el));
        if (cards.length > 0) break;
      }
      if (cards.length > 0) {
        const latest = cards[0];
        const promptEl = latest.querySelector('[class*="prompt"]') || latest.querySelector('[data-testid="prompt"]');
        const fullText = readText3(promptEl);
        if (fullText) {
          const { cleanPrompt: cleanPrompt2, settings: paramSettings2 } = parseMjParams(fullText);
          const uiSettings = extractSettings3(doc);
          const outputs = extractImagesFromContainer(latest);
          return {
            prompt: cleanPrompt2,
            negativePrompt: null,
            outputs,
            settings: { ...paramSettings2, ...uiSettings },
            assetType: "IMAGE",
            timestamp: 0
          };
        }
      }
      const displayEl = querySelector3(doc, PROMPT_DISPLAY_SELECTORS2);
      const displayText = readText3(displayEl);
      if (displayText) {
        const { cleanPrompt: cleanPrompt2, settings: paramSettings2 } = parseMjParams(displayText);
        const outputs = extractImagesFromContainer(doc.body).filter(
          (o) => o.url.includes("midjourney") || o.url.includes("mj-") || o.url.includes("cdn.midjourney")
        );
        return {
          prompt: cleanPrompt2,
          negativePrompt: null,
          outputs: outputs.slice(0, 10),
          settings: { ...paramSettings2, ...extractSettings3(doc) },
          assetType: "IMAGE",
          timestamp: 0
        };
      }
      const inputEl = querySelector3(doc, PROMPT_SELECTORS3);
      const inputText = readText3(inputEl);
      const { cleanPrompt, settings: paramSettings } = parseMjParams(inputText);
      return {
        prompt: cleanPrompt,
        negativePrompt: null,
        outputs: [],
        settings: { ...paramSettings, ...extractSettings3(doc) },
        assetType: "IMAGE",
        timestamp: 0
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
        const promptEl = card.querySelector('[class*="prompt"]') || card.querySelector('[data-testid="prompt"]');
        const fullText = readText3(promptEl);
        const { cleanPrompt, settings: paramSettings } = parseMjParams(fullText);
        const outputs = extractImagesFromContainer(card);
        if (cleanPrompt || outputs.length > 0) {
          candidates.push({
            prompt: cleanPrompt,
            negativePrompt: null,
            outputs,
            settings: { ...paramSettings, ...extractSettings3(doc) },
            assetType: "IMAGE",
            timestamp: 0
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
      const target = querySelector3(doc, PROMPT_SELECTORS3);
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
    }
  };
  var midjourney_default = MidjourneyAdapter;

  // chrome-extension/src/detection/adapters/runway.js
  var URL_PATTERNS3 = [
    /^https?:\/\/app\.runwayml\.com/i,
    /^https?:\/\/(www\.)?runwayml\.com/i,
    /^https?:\/\/runway\.com/i
  ];
  var PROMPT_SELECTORS4 = [
    'textarea[data-testid="prompt-input"]',
    'textarea[placeholder*="Describe" i]',
    'textarea[placeholder*="prompt" i]',
    'textarea[aria-label*="text prompt" i]',
    '[data-testid="generation-prompt"] textarea',
    '[contenteditable="true"][data-testid="prompt-editor"]',
    '[contenteditable="true"][class*="prompt"]',
    '[class*="PromptEditor"] textarea',
    '[class*="PromptInput"] textarea'
  ];
  var HISTORY_CARD_SELECTORS = [
    '[data-testid="generation-card"]',
    '[class*="generation-item"]',
    '[class*="HistoryCard"]',
    '[class*="generation-card"]'
  ];
  var MODEL_SELECTORS3 = [
    '[data-testid="model-selector"]',
    '[class*="model-selector"]',
    '[class*="ModelSelector"]',
    '[class*="model-badge"]'
  ];
  function querySelector4(doc, selectors) {
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function readText4(el) {
    if (!el) return "";
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el.value?.trim() || "";
    return el.textContent?.trim() || "";
  }
  function extractOutputsFromContainer3(container) {
    const outputs = [];
    const seen = /* @__PURE__ */ new Set();
    container.querySelectorAll("video[src], video source[src]").forEach((el) => {
      const video = el.tagName === "SOURCE" ? el.closest("video") : el;
      const src = video?.currentSrc || video?.src || el.src;
      if (src?.startsWith("http") && !seen.has(src)) {
        seen.add(src);
        outputs.push({
          type: "video",
          url: src,
          thumbnailUrl: video?.poster || null,
          metadata: { duration: video?.duration || null, width: video?.videoWidth || null, height: video?.videoHeight || null }
        });
      }
    });
    container.querySelectorAll("img[src]").forEach((el) => {
      const src = el.currentSrc || el.src;
      if (src?.startsWith("http") && !seen.has(src) && (el.naturalWidth > 100 || !el.complete)) {
        seen.add(src);
        outputs.push({
          type: "image",
          url: src,
          thumbnailUrl: src,
          metadata: { width: el.naturalWidth || null, height: el.naturalHeight || null }
        });
      }
    });
    return outputs;
  }
  function extractSettings4(doc) {
    const settings = {};
    const modelEl = querySelector4(doc, MODEL_SELECTORS3);
    if (modelEl?.textContent?.trim()) settings.modelName = modelEl.textContent.trim();
    const durEl = doc.querySelector('[data-testid="duration-slider"]') || doc.querySelector('input[aria-label*="duration" i]');
    if (durEl) {
      const val = durEl.value || durEl.getAttribute("aria-valuenow");
      if (val) settings.duration = val;
    }
    const ratioEl = doc.querySelector('[data-testid="aspect-ratio"]') || doc.querySelector('button[class*="ratio"][aria-pressed="true"]');
    if (ratioEl?.textContent?.trim()) settings.aspectRatio = ratioEl.textContent.trim();
    const seedEl = doc.querySelector('input[data-testid="seed-input"]') || doc.querySelector('input[aria-label*="seed" i]');
    if (seedEl?.value) settings.seed = parseInt(seedEl.value, 10);
    return Object.keys(settings).length > 0 ? settings : null;
  }
  function inferAssetType3(outputs) {
    if (outputs.some((o) => o.type === "video")) return "VIDEO";
    return "IMAGE";
  }
  var RunwayAdapter = {
    platformKey: "runway",
    displayName: "Runway",
    match(url) {
      return URL_PATTERNS3.some((p) => p.test(url));
    },
    extractLatest(doc) {
      const cards = [];
      for (const sel of HISTORY_CARD_SELECTORS) {
        doc.querySelectorAll(sel).forEach((el) => cards.push(el));
        if (cards.length > 0) break;
      }
      if (cards.length > 0) {
        const latest = cards[0];
        const promptEl = latest.querySelector('[class*="prompt"]') || latest.querySelector("p");
        const prompt2 = readText4(promptEl);
        const outputs2 = extractOutputsFromContainer3(latest);
        if (prompt2 || outputs2.length > 0) {
          return {
            prompt: prompt2,
            negativePrompt: null,
            outputs: outputs2,
            settings: extractSettings4(doc),
            assetType: inferAssetType3(outputs2),
            timestamp: 0
          };
        }
      }
      const inputEl = querySelector4(doc, PROMPT_SELECTORS4);
      const prompt = readText4(inputEl);
      const outputs = extractOutputsFromContainer3(doc.body).filter(
        (o) => o.url.includes("runway") || o.metadata?.width > 200 || o.type === "video"
      );
      return {
        prompt,
        negativePrompt: null,
        outputs: outputs.slice(0, 10),
        settings: extractSettings4(doc),
        assetType: inferAssetType3(outputs),
        timestamp: 0
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
        const prompt = readText4(promptEl);
        const outputs = extractOutputsFromContainer3(card);
        if (prompt || outputs.length > 0) {
          candidates.push({
            prompt,
            negativePrompt: null,
            outputs,
            settings: extractSettings4(doc),
            assetType: inferAssetType3(outputs),
            timestamp: 0
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
      const target = querySelector4(doc, PROMPT_SELECTORS4);
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
    }
  };
  var runway_default = RunwayAdapter;

  // chrome-extension/src/detection/adapters/elevenlabs.js
  var URL_PATTERNS4 = [
    /^https?:\/\/(www\.)?elevenlabs\.io/i,
    /^https?:\/\/beta\.elevenlabs\.io/i
  ];
  var PROMPT_SELECTORS5 = [
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
    '[class*="prompt-editor"] textarea'
  ];
  var HISTORY_SELECTORS = [
    '[data-testid="history-item"]',
    '[class*="history-item"]',
    '[class*="GenerationCard"]',
    '[class*="generation-item"]'
  ];
  var VOICE_SELECTORS = [
    '[data-testid="voice-selector"]',
    '[data-testid="selected-voice"]',
    '[class*="voice-selector"]',
    '[class*="voice-name"]'
  ];
  var MODEL_SELECTORS4 = [
    '[data-testid="model-selector"]',
    '[class*="model-select"]',
    '[class*="ModelSelector"]'
  ];
  function querySelector5(doc, selectors) {
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function readText5(el) {
    if (!el) return "";
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el.value?.trim() || "";
    return el.textContent?.trim() || "";
  }
  function extractAudioOutputsFromContainer(container) {
    const outputs = [];
    const seen = /* @__PURE__ */ new Set();
    container.querySelectorAll("audio[src], audio source[src]").forEach((el) => {
      const audio = el.tagName === "SOURCE" ? el.closest("audio") : el;
      const src = audio?.currentSrc || audio?.src || el.src;
      if (src?.startsWith("http") && !seen.has(src)) {
        seen.add(src);
        outputs.push({
          type: "audio",
          url: src,
          thumbnailUrl: null,
          metadata: { duration: audio?.duration || null }
        });
      }
    });
    container.querySelectorAll('audio[src^="blob:"]').forEach((el) => {
      const src = el.currentSrc || el.src;
      if (src && !seen.has(src)) {
        seen.add(src);
        outputs.push({
          type: "audio",
          url: src,
          thumbnailUrl: null,
          metadata: { duration: el.duration || null, note: "blob-url" }
        });
      }
    });
    return outputs;
  }
  function extractSettings5(doc) {
    const settings = {};
    const voiceEl = querySelector5(doc, VOICE_SELECTORS);
    if (voiceEl?.textContent?.trim()) settings.voiceName = voiceEl.textContent.trim();
    const modelEl = querySelector5(doc, MODEL_SELECTORS4);
    if (modelEl?.textContent?.trim()) settings.modelName = modelEl.textContent.trim();
    const stabilityEl = doc.querySelector('input[data-testid="stability-slider"]') || doc.querySelector('input[aria-label*="stability" i]');
    if (stabilityEl?.value) settings.stability = parseFloat(stabilityEl.value);
    const simEl = doc.querySelector('input[data-testid="similarity-slider"]') || doc.querySelector('input[aria-label*="similarity" i]');
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
  var ElevenLabsAdapter = {
    platformKey: "elevenlabs",
    displayName: "ElevenLabs",
    match(url) {
      return URL_PATTERNS4.some((p) => p.test(url));
    },
    extractLatest(doc) {
      const mode = inferMode(doc);
      const inputEl = querySelector5(doc, PROMPT_SELECTORS5);
      const prompt = readText5(inputEl);
      const historyItems = [];
      for (const sel of HISTORY_SELECTORS) {
        doc.querySelectorAll(sel).forEach((el) => historyItems.push(el));
        if (historyItems.length > 0) break;
      }
      let historyPrompt = "";
      if (historyItems.length > 0) {
        const latest = historyItems[0];
        const textEl = latest.querySelector('[class*="text"]') || latest.querySelector('[data-testid*="text"]');
        historyPrompt = readText5(textEl);
      }
      const outputs = extractAudioOutputsFromContainer(doc.body);
      return {
        prompt: prompt || historyPrompt,
        negativePrompt: null,
        outputs: outputs.slice(0, 10),
        settings: extractSettings5(doc),
        assetType: modeToAssetType(mode),
        timestamp: 0
      };
    },
    extractCandidates(doc) {
      const candidates = [];
      const mode = inferMode(doc);
      const historyItems = [];
      for (const sel of HISTORY_SELECTORS) {
        doc.querySelectorAll(sel).forEach((el) => historyItems.push(el));
        if (historyItems.length > 0) break;
      }
      for (const item of historyItems) {
        const textEl = item.querySelector('[class*="text"]') || item.querySelector('[data-testid*="text"]') || item.querySelector("p");
        const prompt = readText5(textEl);
        const outputs = extractAudioOutputsFromContainer(item);
        if (prompt || outputs.length > 0) {
          candidates.push({
            prompt,
            negativePrompt: null,
            outputs,
            settings: extractSettings5(doc),
            assetType: modeToAssetType(mode),
            timestamp: 0
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
      const target = querySelector5(doc, PROMPT_SELECTORS5);
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
    }
  };
  var elevenlabs_default = ElevenLabsAdapter;

  // chrome-extension/detectors/kling.js
  var KlingDetector = {
    platform: "kling-ai",
    displayName: "Kling AI",
    category: "video",
    urlPatterns: [
      /^https?:\/\/(www\.)?klingai\.com/i,
      /^https?:\/\/app\.klingai\.com/i,
      /^https?:\/\/global\.klingai\.com/i
    ],
    detect(url) {
      return this.urlPatterns.some((pattern) => pattern.test(url));
    },
    extractPrompt(document2) {
      const selectors = [
        // Kling main prompt textarea
        'textarea[data-testid="prompt-input"]',
        'textarea[placeholder*="Describe" i]',
        'textarea[placeholder*="Enter your prompt" i]',
        'textarea[placeholder*="creative" i]',
        'textarea[class*="prompt"]',
        '[class*="prompt-input"] textarea',
        '[class*="PromptInput"] textarea',
        '[class*="prompt-editor"] textarea',
        // Contenteditable
        '[contenteditable="true"][class*="prompt"]',
        // Antd-style textarea (Kling uses React/Ant Design patterns)
        '.ant-input[placeholder*="prompt" i]',
        "textarea.ant-input"
      ];
      for (const selector of selectors) {
        const el = document2.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          return { prompt: text, negativePrompt: null };
        }
      }
      let negativePrompt = null;
      const negSelectors = [
        'textarea[placeholder*="Negative" i]',
        'textarea[data-testid="negative-prompt"]',
        '[class*="negative-prompt"] textarea',
        '[class*="NegativePrompt"] textarea'
      ];
      for (const selector of negSelectors) {
        const el = document2.querySelector(selector);
        if (el) {
          const val = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
          if (val) {
            negativePrompt = val;
            break;
          }
        }
      }
      for (const selector of selectors) {
        const el = document2.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          return { prompt: text, negativePrompt };
        }
      }
      return null;
    },
    extractSettings(document2) {
      const settings = {};
      const modelSelectors = [
        '[data-testid="model-selector"]',
        '[class*="model-select"]',
        '[class*="ModelSelector"]',
        '.ant-select[class*="model"]',
        '[aria-label*="model" i]',
        '[class*="version-tag"]'
      ];
      for (const selector of modelSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.modelName = el.textContent.trim();
          break;
        }
      }
      const durationSelectors = [
        '[data-testid="duration-selector"]',
        '[class*="duration"]',
        '.ant-slider[aria-label*="duration" i]',
        'input[aria-label*="duration" i]',
        '[class*="Duration"] [class*="value"]'
      ];
      for (const selector of durationSelectors) {
        const el = document2.querySelector(selector);
        if (el) {
          const val = el.value || el.textContent?.trim() || el.getAttribute("aria-valuenow");
          if (val) {
            settings.duration = val;
            break;
          }
        }
      }
      const ratioSelectors = [
        '[data-testid="ratio-selector"]',
        '[class*="aspect-ratio"][class*="active"]',
        '[class*="ratio-option"][class*="selected"]',
        'button[class*="ratio"][class*="active"]'
      ];
      for (const selector of ratioSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.aspectRatio = el.textContent.trim();
          break;
        }
      }
      const modeSelectors = [
        '[data-testid="mode-selector"]',
        '[class*="mode-select"][class*="active"]',
        '[class*="QualitySelector"] [class*="selected"]'
      ];
      for (const selector of modeSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.mode = el.textContent.trim();
          break;
        }
      }
      const cfgSelectors = [
        'input[aria-label*="CFG" i]',
        'input[aria-label*="creativity" i]',
        '[class*="cfg-scale"] input'
      ];
      for (const selector of cfgSelectors) {
        const el = document2.querySelector(selector);
        if (el?.value) {
          settings.cfgScale = parseFloat(el.value);
          break;
        }
      }
      return Object.keys(settings).length > 0 ? settings : null;
    },
    extractOutputs(document2) {
      const outputs = [];
      const videoSelectors = [
        '[data-testid="generation-video"] video',
        '[class*="video-result"] video',
        '[class*="VideoPlayer"] video',
        '[class*="result-card"] video',
        '[class*="generation-output"] video',
        'video[src*="klingai"]',
        "video[src]"
      ];
      for (const selector of videoSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src || el.querySelector("source")?.src;
          if (src && src.startsWith("http")) {
            outputs.push({
              type: "video",
              url: src,
              thumbnailUrl: el.poster || null,
              metadata: {
                duration: el.duration || null,
                width: el.videoWidth || null,
                height: el.videoHeight || null
              }
            });
          }
        });
      }
      const imageSelectors = [
        '[data-testid="generation-image"] img',
        '[class*="result-card"] img',
        '[class*="generation-output"] img',
        'img[src*="klingai"]:not([class*="avatar"]):not([class*="icon"])'
      ];
      for (const selector of imageSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src;
          if (src && src.startsWith("http") && (el.naturalWidth > 100 || !el.complete)) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "image",
                url: src,
                thumbnailUrl: src,
                metadata: {
                  width: el.naturalWidth || null,
                  height: el.naturalHeight || null
                }
              });
            }
          }
        });
      }
      const downloadSelectors = [
        'a[download][href*="klingai"]',
        'a[data-testid="download"]',
        'button[class*="download"]'
      ];
      for (const selector of downloadSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const href = el.href || el.getAttribute("data-url");
          if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
            const isVideo = /\.(mp4|webm|mov)/i.test(href);
            outputs.push({
              type: isVideo ? "video" : "image",
              url: href,
              thumbnailUrl: null,
              metadata: {}
            });
          }
        });
      }
      return outputs;
    }
  };
  var kling_default = KlingDetector;

  // chrome-extension/src/detection/adapters/adapter-helpers.js
  function createDetectorAdapter(detector, opts) {
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
          timestamp: 0
        };
      },
      extractCandidates(doc) {
        return [this.extractLatest(doc)];
      },
      applyPrompt(doc, text) {
        if (!text?.trim()) return { ok: false, error: "Prompt is empty" };
        const selectors = [
          'textarea[data-testid="prompt-input"]',
          'textarea[placeholder*="Describe" i]',
          'textarea[placeholder*="prompt" i]',
          'textarea[aria-label*="prompt" i]',
          '[contenteditable="true"][class*="prompt"]',
          "textarea"
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
      }
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

  // chrome-extension/src/detection/adapters/kling.js
  var kling_default2 = createDetectorAdapter(kling_default, {
    platformKey: "kling-ai",
    displayName: "Kling AI",
    defaultAssetType: "VIDEO"
  });

  // chrome-extension/detectors/luma.js
  var LumaDetector = {
    platform: "luma-dream-machine",
    displayName: "Luma Dream Machine",
    category: "video",
    urlPatterns: [
      /^https?:\/\/(www\.)?lumalabs\.ai/i,
      /^https?:\/\/dream-machine\.lumalabs\.ai/i
    ],
    detect(url) {
      return this.urlPatterns.some((pattern) => pattern.test(url));
    },
    extractPrompt(document2) {
      const selectors = [
        // Dream Machine prompt input
        'textarea[data-testid="prompt-input"]',
        'textarea[placeholder*="Describe" i]',
        'textarea[placeholder*="dream" i]',
        'textarea[placeholder*="Type your prompt" i]',
        'textarea[aria-label*="prompt" i]',
        '[data-testid="prompt-textarea"]',
        '[class*="prompt-input"] textarea',
        '[class*="PromptInput"] textarea',
        // Contenteditable
        '[contenteditable="true"][data-placeholder*="Describe" i]',
        '[contenteditable="true"][class*="prompt"]'
      ];
      for (const selector of selectors) {
        const el = document2.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          return { prompt: text, negativePrompt: null };
        }
      }
      const historySelectors = [
        '[class*="generation-card"]:first-of-type [class*="prompt"]',
        '[data-testid="generation-item"]:first-of-type [class*="prompt"]',
        '[class*="HistoryItem"] [class*="prompt"]'
      ];
      for (const selector of historySelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          return { prompt: el.textContent.trim(), negativePrompt: null };
        }
      }
      return null;
    },
    extractSettings(document2) {
      const settings = {};
      const modelSelectors = [
        '[data-testid="model-selector"]',
        '[class*="model-selector"]',
        '[class*="ModelPicker"]',
        '[aria-label*="model" i]',
        '[class*="model-badge"]'
      ];
      for (const selector of modelSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.modelName = el.textContent.trim();
          break;
        }
      }
      const ratioSelectors = [
        '[data-testid="aspect-ratio"]',
        '[class*="aspect-ratio"][class*="selected"]',
        'button[class*="ratio"][aria-pressed="true"]',
        '[class*="RatioSelector"] [class*="active"]'
      ];
      for (const selector of ratioSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.aspectRatio = el.textContent.trim();
          break;
        }
      }
      const durationSelectors = [
        '[data-testid="duration-selector"]',
        '[class*="duration-control"]',
        'input[aria-label*="duration" i]',
        '[class*="DurationPicker"]'
      ];
      for (const selector of durationSelectors) {
        const el = document2.querySelector(selector);
        if (el) {
          const val = el.value || el.textContent?.trim() || el.getAttribute("aria-valuenow");
          if (val) {
            settings.duration = val;
            break;
          }
        }
      }
      const motionSelectors = [
        '[data-testid="camera-motion"]',
        '[class*="camera-motion"]',
        '[class*="CameraMotion"]',
        '[aria-label*="camera" i]'
      ];
      for (const selector of motionSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.cameraMotion = el.textContent.trim();
          break;
        }
      }
      const loopSelectors = [
        'input[type="checkbox"][aria-label*="loop" i]',
        '[data-testid="loop-toggle"]',
        '[class*="loop-switch"]'
      ];
      for (const selector of loopSelectors) {
        const el = document2.querySelector(selector);
        if (el) {
          settings.loop = el.checked || el.getAttribute("aria-checked") === "true";
          break;
        }
      }
      return Object.keys(settings).length > 0 ? settings : null;
    },
    extractOutputs(document2) {
      const outputs = [];
      const videoSelectors = [
        '[data-testid="generation-video"] video',
        '[class*="video-player"] video',
        '[class*="VideoPlayer"] video',
        '[class*="generation-result"] video',
        '[class*="OutputView"] video',
        'video[src*="lumalabs"]',
        'video[src*="luma"]',
        "video[src]"
      ];
      for (const selector of videoSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src || el.querySelector("source")?.src;
          if (src && src.startsWith("http")) {
            outputs.push({
              type: "video",
              url: src,
              thumbnailUrl: el.poster || null,
              metadata: {
                duration: el.duration || null,
                width: el.videoWidth || null,
                height: el.videoHeight || null
              }
            });
          }
        });
      }
      const imageSelectors = [
        '[data-testid="output-image"] img',
        '[class*="generation-result"] img',
        '[class*="OutputView"] img',
        'img[src*="lumalabs"]:not([class*="avatar"]):not([class*="logo"])'
      ];
      for (const selector of imageSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src;
          if (src && src.startsWith("http") && (el.naturalWidth > 100 || !el.complete)) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "image",
                url: src,
                thumbnailUrl: src,
                metadata: {
                  width: el.naturalWidth || null,
                  height: el.naturalHeight || null
                }
              });
            }
          }
        });
      }
      const downloadSelectors = [
        'a[download][href*="lumalabs"]',
        'a[download][href*="luma"]',
        'a[data-testid="download"]',
        'button[aria-label*="Download" i]'
      ];
      for (const selector of downloadSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const href = el.href || el.getAttribute("data-url");
          if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
            const isVideo = /\.(mp4|webm|mov)/i.test(href);
            outputs.push({
              type: isVideo ? "video" : "image",
              url: href,
              thumbnailUrl: null,
              metadata: {}
            });
          }
        });
      }
      return outputs;
    }
  };
  var luma_default = LumaDetector;

  // chrome-extension/src/detection/adapters/luma.js
  var luma_default2 = createDetectorAdapter(luma_default, {
    platformKey: "luma-dream-machine",
    displayName: "Luma Dream Machine",
    defaultAssetType: "VIDEO"
  });

  // chrome-extension/detectors/freepik.js
  var FreepikDetector = {
    platform: "freepik-ai",
    displayName: "Freepik Pikaso",
    category: "image",
    urlPatterns: [
      /^https?:\/\/(www\.)?freepik\.com\/pikaso/i,
      /^https?:\/\/(www\.)?freepik\.com\/ai\//i,
      /^https?:\/\/(www\.)?freepik\.com\/.*image-generator/i,
      /^https?:\/\/(www\.)?freepik\.com\/.*ai-image/i
    ],
    detect(url) {
      return this.urlPatterns.some((pattern) => pattern.test(url));
    },
    extractPrompt(document2) {
      const selectors = [
        // Pikaso prompt input
        'textarea[data-testid="pikaso-prompt"]',
        'textarea[placeholder*="Describe" i]',
        'textarea[placeholder*="what you want" i]',
        'textarea[name="prompt"]',
        '[data-testid="prompt-input"] textarea',
        '[class*="prompt-input"] textarea',
        '[class*="PromptInput"] textarea',
        // Contenteditable variants
        '[contenteditable="true"][data-placeholder*="Describe" i]',
        // Generic fallback
        ".prompt-area textarea",
        'textarea[aria-label*="prompt" i]'
      ];
      for (const selector of selectors) {
        const el = document2.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          return { prompt: text, negativePrompt: null };
        }
      }
      let negativePrompt = null;
      const negSelectors = [
        'textarea[data-testid="negative-prompt"]',
        'textarea[placeholder*="Negative" i]',
        'textarea[name="negative_prompt"]',
        '[class*="negative-prompt"] textarea'
      ];
      for (const selector of negSelectors) {
        const el = document2.querySelector(selector);
        if (el) {
          const val = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
          if (val) {
            negativePrompt = val;
            break;
          }
        }
      }
      for (const selector of selectors) {
        const el = document2.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          return { prompt: text, negativePrompt };
        }
      }
      return null;
    },
    extractSettings(document2) {
      const settings = {};
      const styleSelectors = [
        '[data-testid="style-selector"] [aria-pressed="true"]',
        '[class*="style-option"][class*="active"]',
        '[class*="StyleSelector"] [class*="selected"]',
        '[class*="style-chip"][class*="active"]'
      ];
      for (const selector of styleSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.style = el.textContent.trim();
          break;
        }
      }
      const ratioSelectors = [
        '[data-testid="aspect-ratio"] [aria-pressed="true"]',
        '[class*="aspect-ratio"][class*="selected"]',
        'button[class*="ratio"][aria-pressed="true"]',
        '[class*="size-option"][class*="active"]'
      ];
      for (const selector of ratioSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.aspectRatio = el.textContent.trim();
          break;
        }
      }
      const modelSelectors = [
        '[data-testid="model-selector"]',
        '[class*="model-dropdown"]',
        '[aria-label*="model" i]'
      ];
      for (const selector of modelSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.modelName = el.textContent.trim();
          break;
        }
      }
      const countSelectors = [
        '[data-testid="image-count"]',
        'input[aria-label*="number of images" i]',
        '[class*="image-count"] input'
      ];
      for (const selector of countSelectors) {
        const el = document2.querySelector(selector);
        if (el?.value) {
          settings.imageCount = parseInt(el.value, 10);
          break;
        }
      }
      return Object.keys(settings).length > 0 ? settings : null;
    },
    extractOutputs(document2) {
      const outputs = [];
      const imageSelectors = [
        '[data-testid="generated-image"] img',
        '[class*="result-image"] img',
        '[class*="GeneratedImage"] img',
        '[class*="output-grid"] img',
        '[class*="gallery-item"] img',
        '[class*="pikaso-result"] img',
        'img[src*="img.freepik.com"]',
        'img[src*="freepik.com/ai/"]'
      ];
      for (const selector of imageSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src;
          if (src && src.startsWith("http") && (el.naturalWidth > 100 || !el.complete)) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "image",
                url: src,
                thumbnailUrl: src,
                metadata: {
                  width: el.naturalWidth || null,
                  height: el.naturalHeight || null,
                  alt: el.alt || null
                }
              });
            }
          }
        });
      }
      const downloadSelectors = [
        'a[download][href*="freepik"]',
        'a[data-testid="download-button"]',
        'button[aria-label*="Download" i]'
      ];
      for (const selector of downloadSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const href = el.href || el.getAttribute("data-url");
          if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
            outputs.push({
              type: "image",
              url: href,
              thumbnailUrl: null,
              metadata: {}
            });
          }
        });
      }
      return outputs;
    }
  };
  var freepik_default = FreepikDetector;

  // chrome-extension/src/detection/adapters/freepik.js
  var freepik_default2 = createDetectorAdapter(freepik_default, {
    platformKey: "freepik-ai",
    displayName: "Freepik Pikaso",
    defaultAssetType: "IMAGE"
  });

  // chrome-extension/detectors/leonardo.js
  var LeonardoDetector = {
    platform: "leonardo-ai",
    displayName: "Leonardo AI",
    category: "image",
    urlPatterns: [
      /^https?:\/\/app\.leonardo\.ai/i,
      /^https?:\/\/(www\.)?leonardo\.ai/i
    ],
    detect(url) {
      return this.urlPatterns.some((pattern) => pattern.test(url));
    },
    extractPrompt(document2) {
      const selectors = [
        'textarea[data-testid="prompt-input"]',
        'textarea[placeholder*="Type a prompt" i]',
        'textarea[placeholder*="Describe" i]',
        'textarea[aria-label*="prompt" i]',
        '[data-testid="generation-prompt"] textarea',
        '[class*="prompt-input"] textarea',
        '[class*="PromptTextarea"] textarea',
        // Chakra UI-based textareas (Leonardo uses Chakra)
        'textarea[class*="chakra-textarea"]',
        // Contenteditable
        '[contenteditable="true"][data-placeholder*="prompt" i]'
      ];
      let prompt = null;
      for (const selector of selectors) {
        const el = document2.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          prompt = text;
          break;
        }
      }
      if (!prompt) return null;
      let negativePrompt = null;
      const negSelectors = [
        'textarea[data-testid="negative-prompt"]',
        'textarea[placeholder*="Negative" i]',
        'textarea[aria-label*="negative" i]',
        '[class*="negative-prompt"] textarea',
        '[data-testid="negative-prompt-input"]'
      ];
      for (const selector of negSelectors) {
        const el = document2.querySelector(selector);
        if (el) {
          const val = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
          if (val) {
            negativePrompt = val;
            break;
          }
        }
      }
      return { prompt, negativePrompt };
    },
    extractSettings(document2) {
      const settings = {};
      const modelSelectors = [
        '[data-testid="model-selector"]',
        '[class*="model-select"]',
        '[class*="ModelSelector"]',
        '[class*="model-picker"]',
        'button[class*="model-name"]',
        '[aria-label*="model" i]'
      ];
      for (const selector of modelSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.modelName = el.textContent.trim();
          break;
        }
      }
      const dimensionSelectors = [
        '[data-testid="dimension-selector"]',
        '[class*="dimension-control"]',
        '[class*="DimensionSelector"]'
      ];
      for (const selector of dimensionSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.dimensions = el.textContent.trim();
          break;
        }
      }
      const widthEl = document2.querySelector('input[aria-label*="width" i]') || document2.querySelector('input[data-testid="width-input"]');
      const heightEl = document2.querySelector('input[aria-label*="height" i]') || document2.querySelector('input[data-testid="height-input"]');
      if (widthEl?.value && heightEl?.value) {
        settings.width = parseInt(widthEl.value, 10);
        settings.height = parseInt(heightEl.value, 10);
        settings.aspectRatio = `${widthEl.value}x${heightEl.value}`;
      }
      const guidanceSelectors = [
        'input[aria-label*="Guidance" i]',
        '[data-testid="guidance-scale"] input',
        '[class*="guidance-slider"] input'
      ];
      for (const selector of guidanceSelectors) {
        const el = document2.querySelector(selector);
        if (el?.value) {
          settings.guidanceScale = parseFloat(el.value);
          break;
        }
      }
      const countSelectors = [
        '[data-testid="num-images"]',
        'input[aria-label*="number of images" i]',
        '[class*="image-count"] input'
      ];
      for (const selector of countSelectors) {
        const el = document2.querySelector(selector);
        if (el?.value) {
          settings.imageCount = parseInt(el.value, 10);
          break;
        }
      }
      const seedSelectors = [
        'input[data-testid="seed-input"]',
        'input[aria-label*="seed" i]',
        'input[name="seed"]'
      ];
      for (const selector of seedSelectors) {
        const el = document2.querySelector(selector);
        if (el?.value) {
          settings.seed = parseInt(el.value, 10);
          break;
        }
      }
      const schedulerSelectors = [
        '[data-testid="scheduler-selector"]',
        'select[aria-label*="scheduler" i]',
        '[class*="scheduler-select"]'
      ];
      for (const selector of schedulerSelectors) {
        const el = document2.querySelector(selector);
        if (el?.value || el?.textContent?.trim()) {
          settings.scheduler = el.value || el.textContent.trim();
          break;
        }
      }
      return Object.keys(settings).length > 0 ? settings : null;
    },
    extractOutputs(document2) {
      const outputs = [];
      const imageSelectors = [
        '[data-testid="generated-image"] img',
        '[class*="generation-grid"] img',
        '[class*="GeneratedImage"] img',
        '[class*="image-card"] img',
        '[class*="output-grid"] img',
        'img[src*="leonardo.ai"]:not([class*="avatar"]):not([class*="logo"])',
        'img[src*="cdn.leonardo"]:not([width="24"]):not([width="32"])'
      ];
      for (const selector of imageSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src;
          if (src && src.startsWith("http") && (el.naturalWidth > 64 || !el.complete)) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "image",
                url: src,
                thumbnailUrl: src,
                metadata: {
                  width: el.naturalWidth || null,
                  height: el.naturalHeight || null,
                  alt: el.alt || null
                }
              });
            }
          }
        });
      }
      const lightboxSelectors = [
        '[class*="lightbox"] img',
        '[class*="Lightbox"] img',
        '[data-testid="fullsize-image"] img',
        '[class*="modal-image"] img'
      ];
      for (const selector of lightboxSelectors) {
        const el = document2.querySelector(selector);
        if (el) {
          const src = el.currentSrc || el.src;
          if (src && src.startsWith("http") && !outputs.some((o) => o.url === src)) {
            outputs.push({
              type: "image",
              url: src,
              thumbnailUrl: src,
              metadata: {
                width: el.naturalWidth || null,
                height: el.naturalHeight || null
              }
            });
          }
        }
      }
      const downloadSelectors = [
        'a[download][href*="leonardo"]',
        'a[data-testid="download-button"]',
        'button[aria-label*="Download" i]'
      ];
      for (const selector of downloadSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const href = el.href || el.getAttribute("data-url");
          if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
            outputs.push({
              type: "image",
              url: href,
              thumbnailUrl: null,
              metadata: {}
            });
          }
        });
      }
      return outputs;
    }
  };
  var leonardo_default = LeonardoDetector;

  // chrome-extension/src/detection/adapters/leonardo.js
  var leonardo_default2 = createDetectorAdapter(leonardo_default, {
    platformKey: "leonardo-ai",
    displayName: "Leonardo AI",
    defaultAssetType: "IMAGE"
  });

  // chrome-extension/detectors/ideogram.js
  var IdeogramDetector = {
    platform: "ideogram",
    displayName: "Ideogram",
    category: "image",
    urlPatterns: [
      /^https?:\/\/(www\.)?ideogram\.ai/i
    ],
    detect(url) {
      return this.urlPatterns.some((pattern) => pattern.test(url));
    },
    extractPrompt(document2) {
      const selectors = [
        // Ideogram prompt input
        'textarea[data-testid="prompt-input"]',
        'textarea[placeholder*="Describe" i]',
        'textarea[placeholder*="Type your prompt" i]',
        'textarea[aria-label*="prompt" i]',
        'textarea[name="prompt"]',
        '[data-testid="prompt-textarea"]',
        '[class*="prompt-input"] textarea',
        '[class*="PromptTextarea"]',
        // Contenteditable
        '[contenteditable="true"][data-placeholder*="Describe" i]',
        '[contenteditable="true"][class*="prompt"]'
      ];
      for (const selector of selectors) {
        const el = document2.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          return { prompt: text, negativePrompt: null };
        }
      }
      let negativePrompt = null;
      const negSelectors = [
        'textarea[data-testid="negative-prompt"]',
        'textarea[placeholder*="Negative" i]',
        '[class*="negative-prompt"] textarea',
        'textarea[name="negative_prompt"]'
      ];
      for (const selector of negSelectors) {
        const el = document2.querySelector(selector);
        if (el) {
          const val = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
          if (val) {
            negativePrompt = val;
            break;
          }
        }
      }
      const detailSelectors = [
        '[data-testid="image-detail"] [class*="prompt"]',
        '[class*="generation-detail"] [class*="prompt"]',
        '[class*="ImageDetail"] [class*="prompt-text"]'
      ];
      for (const selector of detailSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          return { prompt: el.textContent.trim(), negativePrompt };
        }
      }
      for (const selector of selectors) {
        const el = document2.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          return { prompt: text, negativePrompt };
        }
      }
      return null;
    },
    extractSettings(document2) {
      const settings = {};
      const modelSelectors = [
        '[data-testid="model-selector"]',
        '[class*="model-selector"]',
        '[class*="ModelPicker"]',
        'button[class*="model-toggle"]',
        '[aria-label*="model" i]'
      ];
      for (const selector of modelSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.modelName = el.textContent.trim();
          break;
        }
      }
      const ratioSelectors = [
        '[data-testid="aspect-ratio"]',
        '[class*="aspect-ratio"][class*="active"]',
        'button[class*="ratio"][aria-pressed="true"]',
        '[class*="AspectRatioButton"][class*="selected"]'
      ];
      for (const selector of ratioSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.aspectRatio = el.textContent.trim();
          break;
        }
      }
      const styleSelectors = [
        '[data-testid="style-selector"]',
        '[class*="style-selector"][class*="active"]',
        'button[class*="style"][aria-pressed="true"]',
        '[class*="StyleOption"][class*="selected"]'
      ];
      for (const selector of styleSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.style = el.textContent.trim();
          break;
        }
      }
      const qualitySelectors = [
        '[data-testid="quality-selector"]',
        '[class*="quality-toggle"]',
        'button[class*="quality"][aria-pressed="true"]'
      ];
      for (const selector of qualitySelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.quality = el.textContent.trim();
          break;
        }
      }
      const magicPromptSelectors = [
        'input[aria-label*="Magic Prompt" i]',
        '[data-testid="magic-prompt-toggle"]',
        '[class*="magic-prompt"] input[type="checkbox"]'
      ];
      for (const selector of magicPromptSelectors) {
        const el = document2.querySelector(selector);
        if (el) {
          settings.magicPrompt = el.checked || el.getAttribute("aria-checked") === "true";
          break;
        }
      }
      const seedSelectors = [
        'input[data-testid="seed-input"]',
        'input[aria-label*="seed" i]',
        'input[name="seed"]'
      ];
      for (const selector of seedSelectors) {
        const el = document2.querySelector(selector);
        if (el?.value) {
          settings.seed = parseInt(el.value, 10);
          break;
        }
      }
      return Object.keys(settings).length > 0 ? settings : null;
    },
    extractOutputs(document2) {
      const outputs = [];
      const imageSelectors = [
        '[data-testid="generated-image"] img',
        '[class*="result-grid"] img',
        '[class*="GeneratedImage"] img',
        '[class*="gallery-grid"] img',
        '[class*="output-container"] img',
        'img[src*="ideogram.ai"]:not([class*="avatar"]):not([class*="logo"])',
        'img[src*="ideogram-thumbnail"]'
      ];
      for (const selector of imageSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src;
          if (src && src.startsWith("http") && (el.naturalWidth > 64 || !el.complete)) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "image",
                url: src,
                thumbnailUrl: src,
                metadata: {
                  width: el.naturalWidth || null,
                  height: el.naturalHeight || null,
                  alt: el.alt || null
                }
              });
            }
          }
        });
      }
      const fullSizeSelectors = [
        '[class*="fullsize-view"] img',
        '[class*="ImageModal"] img',
        '[data-testid="full-image"] img'
      ];
      for (const selector of fullSizeSelectors) {
        const el = document2.querySelector(selector);
        if (el) {
          const src = el.currentSrc || el.src;
          if (src && src.startsWith("http") && !outputs.some((o) => o.url === src)) {
            outputs.push({
              type: "image",
              url: src,
              thumbnailUrl: src,
              metadata: {
                width: el.naturalWidth || null,
                height: el.naturalHeight || null
              }
            });
          }
        }
      }
      const downloadSelectors = [
        'a[download][href*="ideogram"]',
        'a[data-testid="download"]',
        'button[aria-label*="Download" i]'
      ];
      for (const selector of downloadSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const href = el.href || el.getAttribute("data-url");
          if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
            outputs.push({
              type: "image",
              url: href,
              thumbnailUrl: null,
              metadata: {}
            });
          }
        });
      }
      return outputs;
    }
  };
  var ideogram_default = IdeogramDetector;

  // chrome-extension/src/detection/adapters/ideogram.js
  var ideogram_default2 = createDetectorAdapter(ideogram_default, {
    platformKey: "ideogram",
    displayName: "Ideogram",
    defaultAssetType: "IMAGE"
  });

  // chrome-extension/detectors/adobe-firefly.js
  var AdobeFireflyDetector = {
    platform: "adobe-firefly",
    displayName: "Adobe Firefly",
    category: "image",
    urlPatterns: [
      /^https?:\/\/firefly\.adobe\.com/i,
      /^https?:\/\/(www\.)?adobe\.com\/products\/firefly/i,
      /^https?:\/\/(www\.)?adobe\.com\/sensei\/generative-ai\/firefly/i
    ],
    detect(url) {
      return this.urlPatterns.some((pattern) => pattern.test(url));
    },
    extractPrompt(document2) {
      const selectors = [
        // Firefly prompt input
        'textarea[data-testid="prompt-input"]',
        'textarea[placeholder*="Describe" i]',
        'textarea[placeholder*="what you" i]',
        'textarea[aria-label*="prompt" i]',
        '[data-testid="prompt-textarea"]',
        // Spectrum Web Components (Adobe design system)
        'sp-textfield[placeholder*="Describe" i] textarea',
        'sp-textfield[label*="prompt" i] textarea',
        '[class*="prompt-input"] textarea',
        '[class*="PromptField"] textarea',
        // Contenteditable
        '[contenteditable="true"][aria-label*="prompt" i]',
        '[contenteditable="true"][data-placeholder*="Describe" i]',
        // Fallback
        'textarea[class*="prompt"]'
      ];
      for (const selector of selectors) {
        const el = document2.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          return { prompt: text, negativePrompt: null };
        }
      }
      const detailSelectors = [
        '[data-testid="generation-details"] [class*="prompt"]',
        '[class*="generation-info"] [class*="prompt"]',
        '[class*="PromptDisplay"]'
      ];
      for (const selector of detailSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          return { prompt: el.textContent.trim(), negativePrompt: null };
        }
      }
      return null;
    },
    extractSettings(document2) {
      const settings = {};
      const modelSelectors = [
        '[data-testid="model-selector"]',
        '[class*="model-selector"]',
        '[class*="ModelPicker"]',
        '[aria-label*="model" i]',
        'sp-picker[label*="model" i]'
      ];
      for (const selector of modelSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.modelName = el.textContent.trim();
          break;
        }
      }
      const ratioSelectors = [
        '[data-testid="aspect-ratio-selector"]',
        '[class*="aspect-ratio"][class*="selected"]',
        'sp-action-button[aria-label*="aspect" i][selected]',
        'button[aria-pressed="true"][class*="ratio"]',
        '[class*="RatioSelector"] [class*="active"]'
      ];
      for (const selector of ratioSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.aspectRatio = el.textContent.trim();
          break;
        }
      }
      const contentTypeSelectors = [
        '[data-testid="content-type-selector"]',
        '[class*="content-type"][class*="selected"]',
        'sp-action-button[aria-label*="content type" i][selected]',
        '[class*="ContentType"] [class*="active"]'
      ];
      for (const selector of contentTypeSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.contentType = el.textContent.trim();
          break;
        }
      }
      const styleSelectors = [
        '[data-testid="style-selector"]',
        '[class*="style-option"][class*="active"]',
        '[class*="style-chip"][class*="selected"]'
      ];
      for (const selector of styleSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.style = el.textContent.trim();
          break;
        }
      }
      const effectSelectors = [
        '[data-testid="effect-selector"]',
        '[class*="effect-option"][class*="active"]',
        '[class*="EffectSelector"] [class*="selected"]'
      ];
      for (const selector of effectSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.effect = el.textContent.trim();
          break;
        }
      }
      return Object.keys(settings).length > 0 ? settings : null;
    },
    extractOutputs(document2) {
      const outputs = [];
      const imageSelectors = [
        '[data-testid="generated-image"] img',
        '[class*="result-image"] img',
        '[class*="GeneratedImage"] img',
        '[class*="output-grid"] img',
        '[class*="gallery-item"] img',
        'img[src*="firefly.adobe.com"]:not([class*="icon"])',
        'img[src*="cc-api-storage"]:not([width="24"])',
        'img[src*="adobeaemcloud"]:not([class*="avatar"])'
      ];
      for (const selector of imageSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src;
          if (src && src.startsWith("http") && (el.naturalWidth > 100 || !el.complete)) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "image",
                url: src,
                thumbnailUrl: src,
                metadata: {
                  width: el.naturalWidth || null,
                  height: el.naturalHeight || null,
                  alt: el.alt || null
                }
              });
            }
          }
        });
      }
      const canvasSelectors = [
        'canvas[data-testid="firefly-canvas"]',
        '[class*="editor-canvas"] canvas'
      ];
      for (const selector of canvasSelectors) {
        const canvas = document2.querySelector(selector);
        if (canvas instanceof HTMLCanvasElement && canvas.width > 100 && canvas.height > 100) {
          try {
            const dataUrl = canvas.toDataURL("image/png");
            if (dataUrl && dataUrl.length > 100) {
              outputs.push({
                type: "image",
                url: dataUrl,
                thumbnailUrl: null,
                metadata: {
                  width: canvas.width,
                  height: canvas.height,
                  source: "canvas-export"
                }
              });
            }
          } catch {
          }
        }
      }
      const downloadSelectors = [
        'a[download][href*="adobe"]',
        'sp-action-button[aria-label*="Download" i]',
        'button[data-testid="download-button"]',
        'a[data-testid="download-link"]'
      ];
      for (const selector of downloadSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const href = el.href || el.getAttribute("data-url");
          if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
            outputs.push({
              type: "image",
              url: href,
              thumbnailUrl: null,
              metadata: {}
            });
          }
        });
      }
      return outputs;
    }
  };
  var adobe_firefly_default = AdobeFireflyDetector;

  // chrome-extension/src/detection/adapters/adobe-firefly.js
  var adobe_firefly_default2 = createDetectorAdapter(adobe_firefly_default, {
    platformKey: "adobe-firefly",
    displayName: "Adobe Firefly",
    defaultAssetType: "IMAGE"
  });

  // chrome-extension/detectors/flux.js
  var FluxDetector = {
    platform: "bfl-flux",
    displayName: "Flux (Black Forest Labs)",
    category: "image",
    urlPatterns: [
      /^https?:\/\/(www\.)?blackforestlabs\.ai/i,
      /^https?:\/\/replicate\.com\/black-forest-labs/i,
      /^https?:\/\/replicate\.com\/.*flux/i,
      /^https?:\/\/fal\.ai\/models\/fal-ai\/flux/i,
      /^https?:\/\/fal\.ai\/.*flux/i,
      /^https?:\/\/flux1\.ai/i
    ],
    detect(url) {
      return this.urlPatterns.some((pattern) => pattern.test(url));
    },
    extractPrompt(document2) {
      const host = window?.location?.hostname || "";
      if (host.includes("replicate.com")) {
        const replicateSelectors = [
          'textarea[name="prompt"]',
          'textarea[data-testid="prompt"]',
          '[data-testid="input-prompt"] textarea',
          'label[for="prompt"] ~ textarea',
          'label[for="prompt"] ~ div textarea',
          '[class*="playground"] textarea:first-of-type'
        ];
        for (const selector of replicateSelectors) {
          const el = document2.querySelector(selector);
          if (!el) continue;
          const text = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
          if (text && text.length > 2) {
            return { prompt: text, negativePrompt: null };
          }
        }
      }
      if (host.includes("fal.ai")) {
        const falSelectors = [
          'textarea[name="prompt"]',
          'textarea[placeholder*="Describe" i]',
          '[data-testid="prompt-input"] textarea',
          '[class*="prompt-field"] textarea',
          "textarea"
        ];
        for (const selector of falSelectors) {
          const el = document2.querySelector(selector);
          if (!el) continue;
          const text = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
          if (text && text.length > 2) {
            return { prompt: text, negativePrompt: null };
          }
        }
      }
      const selectors = [
        'textarea[data-testid="prompt-input"]',
        'textarea[placeholder*="Describe" i]',
        'textarea[placeholder*="prompt" i]',
        'textarea[name="prompt"]',
        'textarea[aria-label*="prompt" i]',
        '[class*="prompt-input"] textarea',
        '[class*="PromptField"] textarea',
        "textarea"
      ];
      for (const selector of selectors) {
        const el = document2.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          return { prompt: text, negativePrompt: null };
        }
      }
      return null;
    },
    extractSettings(document2) {
      const settings = {};
      const host = window?.location?.hostname || "";
      if (host.includes("replicate.com")) {
        const breadcrumb = document2.querySelector('[class*="breadcrumb"] a:last-of-type');
        if (breadcrumb?.textContent?.trim()) {
          settings.modelName = breadcrumb.textContent.trim();
        }
        const pathMatch = window.location.pathname.match(/flux[_-]?([\w.-]+)/i);
        if (pathMatch) {
          settings.modelName = settings.modelName || `Flux ${pathMatch[1]}`;
        }
      }
      if (host.includes("fal.ai")) {
        const modelTitle = document2.querySelector('[class*="model-title"]') || document2.querySelector("h1");
        if (modelTitle?.textContent?.trim()) {
          settings.modelName = modelTitle.textContent.trim();
        }
      }
      if (!settings.modelName) {
        const modelSelectors = [
          '[data-testid="model-selector"]',
          '[class*="model-name"]',
          '[aria-label*="model" i]'
        ];
        for (const selector of modelSelectors) {
          const el = document2.querySelector(selector);
          if (el?.textContent?.trim()) {
            settings.modelName = el.textContent.trim();
            break;
          }
        }
      }
      const widthEl = document2.querySelector('input[name="width"]') || document2.querySelector('input[aria-label*="width" i]');
      const heightEl = document2.querySelector('input[name="height"]') || document2.querySelector('input[aria-label*="height" i]');
      if (widthEl?.value && heightEl?.value) {
        settings.width = parseInt(widthEl.value, 10);
        settings.height = parseInt(heightEl.value, 10);
        settings.aspectRatio = `${widthEl.value}x${heightEl.value}`;
      }
      const guidanceEl = document2.querySelector('input[name="guidance_scale"]') || document2.querySelector('input[name="guidance"]') || document2.querySelector('input[aria-label*="guidance" i]');
      if (guidanceEl?.value) {
        settings.guidanceScale = parseFloat(guidanceEl.value);
      }
      const stepsEl = document2.querySelector('input[name="num_inference_steps"]') || document2.querySelector('input[name="steps"]') || document2.querySelector('input[aria-label*="steps" i]');
      if (stepsEl?.value) {
        settings.steps = parseInt(stepsEl.value, 10);
      }
      const seedEl = document2.querySelector('input[name="seed"]') || document2.querySelector('input[aria-label*="seed" i]');
      if (seedEl?.value) {
        settings.seed = parseInt(seedEl.value, 10);
      }
      const numOutputsEl = document2.querySelector('input[name="num_outputs"]') || document2.querySelector('input[name="num_images"]');
      if (numOutputsEl?.value) {
        settings.numOutputs = parseInt(numOutputsEl.value, 10);
      }
      return Object.keys(settings).length > 0 ? settings : null;
    },
    extractOutputs(document2) {
      const outputs = [];
      const host = window?.location?.hostname || "";
      if (host.includes("replicate.com")) {
        const replicateSelectors = [
          '[data-testid="output-image"] img',
          '[class*="output"] img',
          '[class*="prediction-output"] img',
          'img[src*="replicate.delivery"]',
          'img[src*="pbxt.replicate"]'
        ];
        for (const selector of replicateSelectors) {
          const elements = document2.querySelectorAll(selector);
          elements.forEach((el) => {
            const src = el.currentSrc || el.src;
            if (src && src.startsWith("http") && (el.naturalWidth > 64 || !el.complete)) {
              if (!outputs.some((o) => o.url === src)) {
                outputs.push({
                  type: "image",
                  url: src,
                  thumbnailUrl: src,
                  metadata: {
                    width: el.naturalWidth || null,
                    height: el.naturalHeight || null
                  }
                });
              }
            }
          });
        }
      }
      if (host.includes("fal.ai")) {
        const falSelectors = [
          '[class*="output"] img',
          '[class*="result"] img',
          'img[src*="fal.media"]',
          'img[src*="fal.ai"]'
        ];
        for (const selector of falSelectors) {
          const elements = document2.querySelectorAll(selector);
          elements.forEach((el) => {
            const src = el.currentSrc || el.src;
            if (src && src.startsWith("http") && (el.naturalWidth > 64 || !el.complete)) {
              if (!outputs.some((o) => o.url === src)) {
                outputs.push({
                  type: "image",
                  url: src,
                  thumbnailUrl: src,
                  metadata: {
                    width: el.naturalWidth || null,
                    height: el.naturalHeight || null
                  }
                });
              }
            }
          });
        }
      }
      const imageSelectors = [
        '[data-testid="generated-image"] img',
        '[class*="result-image"] img',
        '[class*="output-grid"] img',
        'img[src*="blackforestlabs"]:not([class*="logo"])'
      ];
      for (const selector of imageSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src;
          if (src && src.startsWith("http") && (el.naturalWidth > 64 || !el.complete)) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "image",
                url: src,
                thumbnailUrl: src,
                metadata: {
                  width: el.naturalWidth || null,
                  height: el.naturalHeight || null
                }
              });
            }
          }
        });
      }
      const downloadSelectors = [
        'a[download][href*="replicate"]',
        'a[download][href*="fal"]',
        'a[download][href*="blackforestlabs"]',
        'a[data-testid="download"]'
      ];
      for (const selector of downloadSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const href = el.href;
          if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
            outputs.push({
              type: "image",
              url: href,
              thumbnailUrl: null,
              metadata: {}
            });
          }
        });
      }
      return outputs;
    }
  };
  var flux_default = FluxDetector;

  // chrome-extension/src/detection/adapters/flux.js
  var flux_default2 = createDetectorAdapter(flux_default, {
    platformKey: "bfl-flux",
    displayName: "Flux (Black Forest Labs)",
    defaultAssetType: "IMAGE"
  });

  // chrome-extension/detectors/suno.js
  var SunoDetector = {
    platform: "suno",
    displayName: "Suno",
    category: "music",
    urlPatterns: [
      /^https?:\/\/(www\.)?suno\.com/i,
      /^https?:\/\/app\.suno\.ai/i,
      /^https?:\/\/(www\.)?suno\.ai/i
    ],
    detect(url) {
      return this.urlPatterns.some((pattern) => pattern.test(url));
    },
    extractPrompt(document2) {
      const selectors = [
        // Main song description prompt
        'textarea[data-testid="prompt-input"]',
        'textarea[placeholder*="song description" i]',
        'textarea[placeholder*="Describe" i]',
        'textarea[placeholder*="Make a song about" i]',
        'textarea[aria-label*="prompt" i]',
        'textarea[aria-label*="description" i]',
        // Custom mode: style of music prompt
        'textarea[data-testid="style-input"]',
        'textarea[placeholder*="style of music" i]',
        'textarea[aria-label*="style" i]',
        // Contenteditable prompt areas
        '[contenteditable="true"][data-testid="prompt-input"]',
        '[contenteditable="true"][class*="prompt"]',
        '[contenteditable="true"][data-placeholder*="song" i]',
        // Generic prompt area
        '[class*="prompt-input"] textarea',
        '[class*="PromptInput"] textarea',
        '[class*="create-input"] textarea'
      ];
      for (const selector of selectors) {
        const el = document2.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          return { prompt: text, negativePrompt: null };
        }
      }
      const lyricsSelectors = [
        'textarea[data-testid="lyrics-input"]',
        'textarea[placeholder*="lyrics" i]',
        'textarea[aria-label*="lyrics" i]',
        '[class*="lyrics-input"] textarea',
        '[class*="LyricsInput"] textarea'
      ];
      for (const selector of lyricsSelectors) {
        const el = document2.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          return { prompt: text, negativePrompt: null };
        }
      }
      const detailSelectors = [
        '[data-testid="song-prompt"]',
        '[data-testid="song-description"]',
        '[class*="song-prompt"]',
        '[class*="SongPrompt"]',
        '[class*="song-description"]',
        '[class*="track-description"]'
      ];
      for (const selector of detailSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          return { prompt: el.textContent.trim(), negativePrompt: null };
        }
      }
      return null;
    },
    extractSettings(document2) {
      const settings = {};
      const modelSelectors = [
        '[data-testid="model-selector"]',
        '[data-testid="version-selector"]',
        '[class*="model-selector"]',
        '[class*="ModelSelector"]',
        '[class*="version-badge"]',
        '[aria-label*="model" i]',
        '[aria-label*="version" i]'
      ];
      for (const selector of modelSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.modelName = el.textContent.trim();
          break;
        }
      }
      const instrumentalSelectors = [
        'input[data-testid="instrumental-toggle"]',
        '[class*="instrumental-toggle"] input[type="checkbox"]',
        '[aria-label*="instrumental" i]',
        'button[data-testid="instrumental-toggle"]',
        '[class*="instrumental"] [role="switch"]'
      ];
      for (const selector of instrumentalSelectors) {
        const el = document2.querySelector(selector);
        if (el) {
          settings.instrumental = el.checked || el.getAttribute("aria-checked") === "true" || el.getAttribute("aria-pressed") === "true";
          break;
        }
      }
      const styleSelectors = [
        'textarea[data-testid="style-input"]',
        'input[data-testid="style-input"]',
        'textarea[placeholder*="style of music" i]',
        'input[placeholder*="genre" i]',
        '[class*="style-input"] textarea',
        '[class*="genre-input"] input'
      ];
      for (const selector of styleSelectors) {
        const el = document2.querySelector(selector);
        if (el) {
          const val = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
          if (val) {
            settings.style = val;
            break;
          }
        }
      }
      const titleSelectors = [
        'input[data-testid="title-input"]',
        'input[placeholder*="title" i]',
        'input[aria-label*="title" i]',
        '[class*="title-input"] input'
      ];
      for (const selector of titleSelectors) {
        const el = document2.querySelector(selector);
        if (el?.value?.trim()) {
          settings.title = el.value.trim();
          break;
        }
      }
      const customModeSelectors = [
        '[data-testid="custom-mode-toggle"]',
        'button[aria-label*="custom" i]',
        '[class*="custom-toggle"]',
        '[class*="mode-toggle"]'
      ];
      for (const selector of customModeSelectors) {
        const el = document2.querySelector(selector);
        if (el) {
          settings.customMode = el.getAttribute("aria-pressed") === "true" || el.getAttribute("aria-checked") === "true" || el.classList?.contains("active") || false;
          break;
        }
      }
      return Object.keys(settings).length > 0 ? settings : null;
    },
    extractOutputs(document2) {
      const outputs = [];
      const audioSelectors = [
        '[data-testid="song-player"] audio',
        '[data-testid="audio-player"] audio',
        '[class*="audio-player"] audio',
        '[class*="AudioPlayer"] audio',
        '[class*="song-player"] audio',
        '[class*="SongPlayer"] audio',
        '[class*="track-player"] audio',
        'audio[src*="suno"]',
        'audio[src*="cdn"]',
        "audio[src]"
      ];
      for (const selector of audioSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src || el.querySelector("source")?.src;
          if (src && src.startsWith("http")) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "audio",
                url: src,
                thumbnailUrl: null,
                metadata: {
                  duration: el.duration || null
                }
              });
            }
          }
        });
      }
      const coverSelectors = [
        '[data-testid="song-cover"] img',
        '[class*="song-cover"] img',
        '[class*="SongCover"] img',
        '[class*="cover-art"] img',
        '[class*="album-art"] img',
        '[class*="track-image"] img',
        'img[src*="suno"][class*="cover"]'
      ];
      for (const selector of coverSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src;
          if (src && src.startsWith("http") && (el.naturalWidth > 64 || !el.complete)) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "image",
                url: src,
                thumbnailUrl: src,
                metadata: {
                  width: el.naturalWidth || null,
                  height: el.naturalHeight || null,
                  role: "cover-art"
                }
              });
            }
          }
        });
      }
      const videoSelectors = [
        '[data-testid="song-video"] video',
        '[class*="song-video"] video',
        '[class*="music-video"] video',
        'video[src*="suno"]'
      ];
      for (const selector of videoSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src || el.querySelector("source")?.src;
          if (src && src.startsWith("http")) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "video",
                url: src,
                thumbnailUrl: el.poster || null,
                metadata: {
                  duration: el.duration || null,
                  width: el.videoWidth || null,
                  height: el.videoHeight || null
                }
              });
            }
          }
        });
      }
      const downloadSelectors = [
        'a[download][href*="suno"]',
        'a[data-testid="download-button"]',
        'a[data-testid="download-audio"]',
        'button[data-testid="download-button"]'
      ];
      for (const selector of downloadSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const href = el.href || el.getAttribute("data-url");
          if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
            const isVideo = /\.(mp4|webm|mov)/i.test(href);
            outputs.push({
              type: isVideo ? "video" : "audio",
              url: href,
              thumbnailUrl: null,
              metadata: {}
            });
          }
        });
      }
      const blobAudioSelectors = [
        'audio[src^="blob:"]',
        '[class*="song-player"] audio[src^="blob:"]'
      ];
      for (const selector of blobAudioSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src;
          if (src && src.startsWith("blob:")) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "audio",
                url: src,
                thumbnailUrl: null,
                metadata: {
                  duration: el.duration || null,
                  note: "blob-url-requires-page-context"
                }
              });
            }
          }
        });
      }
      return outputs;
    }
  };
  var suno_default = SunoDetector;

  // chrome-extension/src/detection/adapters/suno.js
  var suno_default2 = createDetectorAdapter(suno_default, {
    platformKey: "suno",
    displayName: "Suno",
    defaultAssetType: "MUSIC"
  });

  // chrome-extension/detectors/udio.js
  var UdioDetector = {
    platform: "udio",
    displayName: "Udio",
    category: "music",
    urlPatterns: [
      /^https?:\/\/(www\.)?udio\.com/i,
      /^https?:\/\/app\.udio\.com/i
    ],
    detect(url) {
      return this.urlPatterns.some((pattern) => pattern.test(url));
    },
    extractPrompt(document2) {
      const selectors = [
        // Main prompt input
        'textarea[data-testid="prompt-input"]',
        'textarea[placeholder*="Describe" i]',
        'textarea[placeholder*="song" i]',
        'textarea[placeholder*="Create" i]',
        'textarea[aria-label*="prompt" i]',
        // Prompt with topic/description
        'textarea[data-testid="topic-input"]',
        'textarea[placeholder*="topic" i]',
        // Contenteditable prompt areas
        '[contenteditable="true"][data-testid="prompt-input"]',
        '[contenteditable="true"][class*="prompt"]',
        '[contenteditable="true"][data-placeholder*="Describe" i]',
        // Generic prompt containers
        '[class*="prompt-input"] textarea',
        '[class*="PromptInput"] textarea',
        '[class*="create-prompt"] textarea'
      ];
      for (const selector of selectors) {
        const el = document2.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          return { prompt: text, negativePrompt: null };
        }
      }
      const lyricsSelectors = [
        'textarea[data-testid="lyrics-input"]',
        'textarea[placeholder*="lyrics" i]',
        'textarea[aria-label*="lyrics" i]',
        '[class*="lyrics-input"] textarea',
        '[class*="LyricsEditor"] textarea',
        '[class*="lyrics-editor"] textarea'
      ];
      for (const selector of lyricsSelectors) {
        const el = document2.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          return { prompt: text, negativePrompt: null };
        }
      }
      const detailSelectors = [
        '[data-testid="track-prompt"]',
        '[data-testid="track-description"]',
        '[class*="track-prompt"]',
        '[class*="TrackPrompt"]',
        '[class*="song-description"]',
        '[class*="track-info"] [class*="prompt"]'
      ];
      for (const selector of detailSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          return { prompt: el.textContent.trim(), negativePrompt: null };
        }
      }
      return null;
    },
    extractSettings(document2) {
      const settings = {};
      const modelSelectors = [
        '[data-testid="model-selector"]',
        '[class*="model-selector"]',
        '[class*="ModelSelector"]',
        '[class*="version-badge"]',
        '[aria-label*="model" i]'
      ];
      for (const selector of modelSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.modelName = el.textContent.trim();
          break;
        }
      }
      const tagSelectors = [
        '[data-testid="genre-tags"]',
        '[class*="genre-tag"]',
        '[class*="style-tag"]',
        '[class*="TagInput"] [class*="tag"]',
        '[class*="genre-chips"] [class*="chip"]',
        '[class*="tag-list"] [class*="tag"]'
      ];
      const tags = [];
      for (const selector of tagSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const text = el.textContent?.trim();
          if (text) tags.push(text);
        });
        if (tags.length > 0) break;
      }
      if (tags.length > 0) {
        settings.tags = tags;
      }
      const instrumentalSelectors = [
        'input[data-testid="instrumental-toggle"]',
        '[class*="instrumental"] input[type="checkbox"]',
        '[aria-label*="instrumental" i]',
        'button[data-testid="instrumental-toggle"]',
        '[class*="instrumental"] [role="switch"]'
      ];
      for (const selector of instrumentalSelectors) {
        const el = document2.querySelector(selector);
        if (el) {
          settings.instrumental = el.checked || el.getAttribute("aria-checked") === "true" || el.getAttribute("aria-pressed") === "true";
          break;
        }
      }
      const qualitySelectors = [
        '[data-testid="quality-selector"]',
        '[class*="quality-selector"]',
        '[aria-label*="quality" i]'
      ];
      for (const selector of qualitySelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.quality = el.textContent.trim();
          break;
        }
      }
      const titleSelectors = [
        'input[data-testid="title-input"]',
        'input[placeholder*="title" i]',
        'input[aria-label*="title" i]',
        '[class*="title-input"] input'
      ];
      for (const selector of titleSelectors) {
        const el = document2.querySelector(selector);
        if (el?.value?.trim()) {
          settings.title = el.value.trim();
          break;
        }
      }
      const seedSelectors = [
        'input[data-testid="seed-input"]',
        'input[aria-label*="seed" i]',
        'input[name="seed"]'
      ];
      for (const selector of seedSelectors) {
        const el = document2.querySelector(selector);
        if (el?.value) {
          settings.seed = parseInt(el.value, 10);
          break;
        }
      }
      return Object.keys(settings).length > 0 ? settings : null;
    },
    extractOutputs(document2) {
      const outputs = [];
      const audioSelectors = [
        '[data-testid="track-player"] audio',
        '[data-testid="audio-player"] audio',
        '[class*="audio-player"] audio',
        '[class*="AudioPlayer"] audio',
        '[class*="track-player"] audio',
        '[class*="TrackPlayer"] audio',
        '[class*="song-player"] audio',
        'audio[src*="udio"]',
        "audio[src]"
      ];
      for (const selector of audioSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src || el.querySelector("source")?.src;
          if (src && src.startsWith("http")) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "audio",
                url: src,
                thumbnailUrl: null,
                metadata: {
                  duration: el.duration || null
                }
              });
            }
          }
        });
      }
      const coverSelectors = [
        '[data-testid="track-cover"] img',
        '[class*="track-cover"] img',
        '[class*="TrackCover"] img',
        '[class*="cover-art"] img',
        '[class*="album-art"] img',
        '[class*="song-image"] img',
        'img[src*="udio"][class*="cover"]'
      ];
      for (const selector of coverSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src;
          if (src && src.startsWith("http") && (el.naturalWidth > 64 || !el.complete)) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "image",
                url: src,
                thumbnailUrl: src,
                metadata: {
                  width: el.naturalWidth || null,
                  height: el.naturalHeight || null,
                  role: "cover-art"
                }
              });
            }
          }
        });
      }
      const downloadSelectors = [
        'a[download][href*="udio"]',
        'a[data-testid="download-button"]',
        'a[data-testid="download-audio"]',
        'button[data-testid="download-button"]'
      ];
      for (const selector of downloadSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const href = el.href || el.getAttribute("data-url");
          if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
            outputs.push({
              type: "audio",
              url: href,
              thumbnailUrl: null,
              metadata: {}
            });
          }
        });
      }
      const blobAudioSelectors = [
        'audio[src^="blob:"]',
        '[class*="track-player"] audio[src^="blob:"]'
      ];
      for (const selector of blobAudioSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src;
          if (src && src.startsWith("blob:")) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "audio",
                url: src,
                thumbnailUrl: null,
                metadata: {
                  duration: el.duration || null,
                  note: "blob-url-requires-page-context"
                }
              });
            }
          }
        });
      }
      return outputs;
    }
  };
  var udio_default = UdioDetector;

  // chrome-extension/src/detection/adapters/udio.js
  var udio_default2 = createDetectorAdapter(udio_default, {
    platformKey: "udio",
    displayName: "Udio",
    defaultAssetType: "MUSIC"
  });

  // chrome-extension/detectors/stable-audio.js
  var StableAudioDetector = {
    platform: "stable-audio",
    displayName: "Stable Audio",
    category: "audio",
    urlPatterns: [
      /^https?:\/\/(www\.)?stableaudio\.com/i,
      /^https?:\/\/(www\.)?stability\.ai/i,
      /^https?:\/\/platform\.stability\.ai/i,
      /^https?:\/\/dreamstudio\.ai/i
    ],
    detect(url) {
      return this.urlPatterns.some((pattern) => pattern.test(url));
    },
    extractPrompt(document2) {
      const selectors = [
        // Primary prompt input
        'textarea[data-testid="prompt-input"]',
        'textarea[placeholder*="Describe" i]',
        'textarea[placeholder*="prompt" i]',
        'textarea[placeholder*="Enter a description" i]',
        'textarea[aria-label*="prompt" i]',
        // Generation prompt area
        '[data-testid="generation-prompt"] textarea',
        '[class*="prompt-input"] textarea',
        '[class*="PromptInput"] textarea',
        '[class*="PromptEditor"] textarea',
        // Contenteditable
        '[contenteditable="true"][data-testid="prompt-input"]',
        '[contenteditable="true"][class*="prompt"]',
        '[contenteditable="true"][data-placeholder*="Describe" i]'
      ];
      let prompt = null;
      for (const selector of selectors) {
        const el = document2.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          prompt = text;
          break;
        }
      }
      if (!prompt) return null;
      let negativePrompt = null;
      const negSelectors = [
        'textarea[data-testid="negative-prompt"]',
        'textarea[placeholder*="Negative" i]',
        'textarea[aria-label*="negative" i]',
        '[class*="negative-prompt"] textarea',
        '[data-testid="negative-prompt-input"]',
        'input[placeholder*="Negative" i]'
      ];
      for (const selector of negSelectors) {
        const el = document2.querySelector(selector);
        if (el) {
          const val = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
          if (val) {
            negativePrompt = val;
            break;
          }
        }
      }
      return { prompt, negativePrompt };
    },
    extractSettings(document2) {
      const settings = {};
      const modelSelectors = [
        '[data-testid="model-selector"]',
        '[class*="model-selector"]',
        '[class*="ModelSelector"]',
        '[aria-label*="model" i]',
        'select[class*="model"]',
        '[class*="model-name"]'
      ];
      for (const selector of modelSelectors) {
        const el = document2.querySelector(selector);
        if (el?.textContent?.trim() || el?.value) {
          settings.modelName = el.value || el.textContent.trim();
          break;
        }
      }
      const durationSelectors = [
        'input[data-testid="duration-input"]',
        'input[data-testid="duration-slider"]',
        'input[aria-label*="duration" i]',
        '[class*="duration-control"] input',
        '[class*="DurationSlider"] input',
        'input[name="duration"]',
        '[data-testid="duration-selector"]'
      ];
      for (const selector of durationSelectors) {
        const el = document2.querySelector(selector);
        if (el) {
          const val = el.value || el.getAttribute("aria-valuenow");
          if (val) {
            settings.duration = val;
            break;
          }
        }
      }
      if (!settings.duration) {
        const durationTextSelectors = [
          '[class*="duration-display"]',
          '[class*="duration-value"]',
          '[data-testid="duration-value"]'
        ];
        for (const selector of durationTextSelectors) {
          const el = document2.querySelector(selector);
          if (el?.textContent?.trim()) {
            settings.duration = el.textContent.trim();
            break;
          }
        }
      }
      const sampleRateSelectors = [
        '[data-testid="sample-rate"]',
        'select[aria-label*="sample rate" i]',
        '[class*="sample-rate"] select'
      ];
      for (const selector of sampleRateSelectors) {
        const el = document2.querySelector(selector);
        if (el?.value || el?.textContent?.trim()) {
          settings.sampleRate = el.value || el.textContent.trim();
          break;
        }
      }
      const stepsSelectors = [
        'input[data-testid="steps-input"]',
        'input[aria-label*="steps" i]',
        '[class*="steps-slider"] input',
        '[data-testid="inference-steps"] input'
      ];
      for (const selector of stepsSelectors) {
        const el = document2.querySelector(selector);
        if (el?.value) {
          settings.steps = parseInt(el.value, 10);
          break;
        }
      }
      const cfgSelectors = [
        'input[data-testid="cfg-input"]',
        'input[aria-label*="guidance" i]',
        'input[aria-label*="cfg" i]',
        '[class*="cfg-slider"] input',
        '[data-testid="guidance-scale"] input'
      ];
      for (const selector of cfgSelectors) {
        const el = document2.querySelector(selector);
        if (el?.value) {
          settings.guidanceScale = parseFloat(el.value);
          break;
        }
      }
      const seedSelectors = [
        'input[data-testid="seed-input"]',
        'input[aria-label*="seed" i]',
        'input[name="seed"]'
      ];
      for (const selector of seedSelectors) {
        const el = document2.querySelector(selector);
        if (el?.value) {
          settings.seed = parseInt(el.value, 10);
          break;
        }
      }
      const countSelectors = [
        '[data-testid="num-results"]',
        'input[aria-label*="number" i]',
        '[class*="batch-size"] input'
      ];
      for (const selector of countSelectors) {
        const el = document2.querySelector(selector);
        if (el?.value) {
          settings.batchSize = parseInt(el.value, 10);
          break;
        }
      }
      return Object.keys(settings).length > 0 ? settings : null;
    },
    extractOutputs(document2) {
      const outputs = [];
      const audioSelectors = [
        '[data-testid="audio-player"] audio',
        '[data-testid="generation-audio"] audio',
        '[class*="audio-player"] audio',
        '[class*="AudioPlayer"] audio',
        '[class*="generation-result"] audio',
        '[class*="OutputPlayer"] audio',
        'audio[src*="stability"]',
        'audio[src*="stableaudio"]',
        "audio[src]"
      ];
      for (const selector of audioSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src || el.querySelector("source")?.src;
          if (src && src.startsWith("http")) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "audio",
                url: src,
                thumbnailUrl: null,
                metadata: {
                  duration: el.duration || null
                }
              });
            }
          }
        });
      }
      const sourceElements = document2.querySelectorAll("audio source[src]");
      sourceElements.forEach((el) => {
        const src = el.src;
        if (src && src.startsWith("http") && !outputs.some((o) => o.url === src)) {
          outputs.push({
            type: "audio",
            url: src,
            thumbnailUrl: null,
            metadata: {
              mimeType: el.type || null
            }
          });
        }
      });
      const waveformSelectors = [
        '[data-testid="waveform"][data-src]',
        '[class*="waveform"][data-audio-src]',
        '[class*="Waveform"][data-src]'
      ];
      for (const selector of waveformSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.getAttribute("data-src") || el.getAttribute("data-audio-src");
          if (src && src.startsWith("http") && !outputs.some((o) => o.url === src)) {
            outputs.push({
              type: "audio",
              url: src,
              thumbnailUrl: null,
              metadata: {}
            });
          }
        });
      }
      const imageSelectors = [
        '[data-testid="generated-image"] img',
        '[class*="generation-result"] img',
        '[class*="output-grid"] img',
        'img[src*="stability"]:not([class*="logo"]):not([class*="avatar"])',
        'img[src*="dreamstudio"]:not([class*="logo"])'
      ];
      for (const selector of imageSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src;
          if (src && src.startsWith("http") && (el.naturalWidth > 64 || !el.complete)) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "image",
                url: src,
                thumbnailUrl: src,
                metadata: {
                  width: el.naturalWidth || null,
                  height: el.naturalHeight || null
                }
              });
            }
          }
        });
      }
      const downloadSelectors = [
        'a[download][href*="stability"]',
        'a[download][href*="stableaudio"]',
        'a[data-testid="download-button"]',
        'a[data-testid="download-audio"]',
        'button[data-testid="download-button"]'
      ];
      for (const selector of downloadSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const href = el.href || el.getAttribute("data-url");
          if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
            const isAudio = /\.(mp3|wav|flac|ogg|aac|m4a)/i.test(href);
            const isImage = /\.(png|jpg|jpeg|webp)/i.test(href);
            outputs.push({
              type: isImage ? "image" : "audio",
              url: href,
              thumbnailUrl: null,
              metadata: {}
            });
          }
        });
      }
      const blobAudioSelectors = [
        'audio[src^="blob:"]',
        '[class*="audio-player"] audio[src^="blob:"]'
      ];
      for (const selector of blobAudioSelectors) {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.currentSrc || el.src;
          if (src && src.startsWith("blob:")) {
            if (!outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "audio",
                url: src,
                thumbnailUrl: null,
                metadata: {
                  duration: el.duration || null,
                  note: "blob-url-requires-page-context"
                }
              });
            }
          }
        });
      }
      return outputs;
    }
  };
  var stable_audio_default = StableAudioDetector;

  // chrome-extension/src/detection/adapters/stable-audio.js
  var stable_audio_default2 = createDetectorAdapter(stable_audio_default, {
    platformKey: "stable-audio",
    displayName: "Stable Audio",
    defaultAssetType: "VOICE"
  });

  // chrome-extension/src/detection/generic-fallback.js
  var PROMPT_HINTS = [
    "prompt",
    "describe",
    "idea",
    "scene",
    "shot",
    "lyrics",
    "script",
    "narration",
    "voice",
    "style"
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
      el.getAttribute("data-slot")
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
      ...document.querySelectorAll("[contenteditable='true']")
    ];
    const candidates = [];
    for (const node of nodes) {
      if (!isVisible(node)) continue;
      const text = node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement ? node.value.trim() : node.textContent?.trim() || "";
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
      "[class*='model']"
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const model = (el.getAttribute("data-model") || el.getAttribute("aria-label") || el.textContent || "").trim();
      if (model.length >= 2 && model.length <= 100) return model;
    }
    return "";
  }
  function readBestOutputUrl() {
    const media = [
      ...document.querySelectorAll("video[src]"),
      ...document.querySelectorAll("img[src]")
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
      ...document.querySelectorAll("[contenteditable='true']")
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
  var GenericFallback = {
    platformKey: "__generic__",
    displayName: "Generic",
    match(_url) {
      return true;
    },
    extractLatest(_doc) {
      const promptCands = getPromptCandidates();
      const prompt = promptCands[0]?.text || "";
      const outputUrl = readBestOutputUrl();
      const modelName = readLikelyModelName();
      return {
        prompt,
        negativePrompt: null,
        outputs: outputUrl ? [{ type: inferAssetTypeFromPage().toLowerCase(), url: outputUrl, thumbnailUrl: null, metadata: {} }] : [],
        settings: modelName ? { modelName } : null,
        assetType: inferAssetTypeFromPage(),
        timestamp: 0
      };
    },
    extractCandidates(_doc) {
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
    }
  };
  var generic_fallback_default = GenericFallback;

  // chrome-extension/src/detection/adapter-registry.js
  var ADAPTERS = [
    chatgpt_sora_default,
    gemini_default,
    freepik_default2,
    midjourney_default,
    runway_default,
    kling_default2,
    luma_default2,
    leonardo_default2,
    ideogram_default2,
    adobe_firefly_default2,
    flux_default2,
    elevenlabs_default,
    suno_default2,
    udio_default2,
    stable_audio_default2,
    generic_fallback_default
  ];

  // chrome-extension/src/detection/types.js
  var ENGINE_VERSION = "2.0.0";
  function candidateId(prompt, outputUrl) {
    const raw = `${prompt || ""}::${outputUrl || ""}`;
    let hash = 5381;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) + hash + raw.charCodeAt(i) >>> 0;
    }
    return `cand_${hash.toString(36)}`;
  }

  // chrome-extension/src/detection/normalizer.js
  var CONFIDENCE = {
    PROMPT_AND_OUTPUT: 1,
    PROMPT_ONLY: 0.7,
    OUTPUT_ONLY: 0.3
  };
  function normalizeCandidate(raw, platformKey, turnIndex) {
    const prompt = String(raw.prompt || "").trim();
    const outputs = Array.isArray(raw.outputs) ? raw.outputs : [];
    const firstOutputUrl = outputs[0]?.url || "";
    let confidence = 0;
    if (prompt && firstOutputUrl) {
      confidence = CONFIDENCE.PROMPT_AND_OUTPUT;
    } else if (prompt) {
      confidence = CONFIDENCE.PROMPT_ONLY;
    } else if (firstOutputUrl) {
      confidence = CONFIDENCE.OUTPUT_ONLY;
    }
    return Object.freeze({
      id: candidateId(prompt, firstOutputUrl),
      turnIndex,
      prompt,
      negativePrompt: raw.negativePrompt || null,
      outputs,
      settings: raw.settings || null,
      assetType: raw.assetType || "IMAGE",
      confidence,
      timestamp: raw.timestamp || 0,
      platformKey: raw.platformKey || platformKey
    });
  }
  function normalizeCandidates(raws, platformKey) {
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    for (let i = 0; i < raws.length; i++) {
      const candidate = normalizeCandidate(raws[i], platformKey, i);
      if (!seen.has(candidate.id)) {
        seen.add(candidate.id);
        result.push(candidate);
      }
    }
    return Object.freeze(result);
  }

  // chrome-extension/src/detection/engine.js
  function findAdapter(url) {
    if (!url) return ADAPTERS[ADAPTERS.length - 1];
    for (const adapter of ADAPTERS) {
      try {
        if (adapter.match(url)) return adapter;
      } catch {
      }
    }
    return ADAPTERS[ADAPTERS.length - 1];
  }
  function extractLatest(doc, url) {
    const adapter = findAdapter(url);
    const warnings = [];
    const debug = { engineVersion: ENGINE_VERSION, adapter: adapter.platformKey, strategy: "extractLatest" };
    try {
      const raw = adapter.extractLatest(doc);
      const latestCandidate = normalizeCandidate(raw, adapter.platformKey, 0);
      let candidates = [latestCandidate];
      try {
        const raws = adapter.extractCandidates(doc);
        if (raws.length > 1) {
          candidates = normalizeCandidates(raws, adapter.platformKey);
        }
      } catch {
        warnings.push("extractCandidates failed, using single candidate");
      }
      return { latestCandidate, candidates, adapter, warnings, debug };
    } catch (err) {
      warnings.push(`extractLatest failed: ${err.message}`);
      return {
        latestCandidate: normalizeCandidate({}, adapter.platformKey, 0),
        candidates: [],
        adapter,
        warnings,
        debug
      };
    }
  }
  function extractCandidates(doc, url, opts = {}) {
    const maxCandidates = opts.maxCandidates || 20;
    const adapter = findAdapter(url);
    const warnings = [];
    const debug = { engineVersion: ENGINE_VERSION, adapter: adapter.platformKey, strategy: "extractCandidates" };
    try {
      const raws = adapter.extractCandidates(doc);
      const candidates = normalizeCandidates(raws.slice(0, maxCandidates), adapter.platformKey);
      return { candidates, adapter, warnings, debug };
    } catch (err) {
      warnings.push(`extractCandidates failed: ${err.message}`);
      return { candidates: [], adapter, warnings, debug };
    }
  }
  function applyPrompt(doc, url, text) {
    const adapter = findAdapter(url);
    try {
      return adapter.applyPrompt(doc, text);
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // chrome-extension/src/content-script.js
  if (!window.__lasermanContentScriptLoaded) {
    window.__lasermanContentScriptLoaded = true;
    setup();
  }
  function setup() {
    function candidateToLegacyContext(candidate, url) {
      return {
        prompt: candidate.prompt || "",
        modelName: candidate.settings?.modelName || "",
        outputUrl: candidate.outputs?.[0]?.url || "",
        sourceUrl: url,
        assetType: candidate.assetType || "IMAGE"
      };
    }
    function serializePageContext(maxChars = 12e3) {
      const turns = [];
      const turnContainers = document.querySelectorAll(
        '[data-message-author-role], user-query, model-response, [data-testid="user-message"], [data-testid="model-response"], .conversation-turn, article[data-testid]'
      );
      if (turnContainers.length > 0) {
        for (const el of turnContainers) {
          const role = el.getAttribute("data-message-author-role") || (el.tagName === "USER-QUERY" || el.getAttribute("data-testid")?.includes("user") ? "user" : "assistant");
          const hasMedia = el.querySelectorAll("img[src], video[src], audio[src]").length;
          const clone = el.cloneNode(true);
          clone.querySelectorAll("svg, img, video, audio, style, script").forEach((n) => n.remove());
          const text = clone.textContent?.trim().substring(0, 800) || "";
          turns.push({ role, text, hasMedia: hasMedia > 0, mediaCount: hasMedia });
        }
      } else {
        const body = document.body.cloneNode(true);
        body.querySelectorAll("svg, img, video, audio, style, script, nav, header, footer").forEach((n) => n.remove());
        const text = body.textContent?.trim().substring(0, maxChars) || "";
        turns.push({ role: "page", text, hasMedia: false, mediaCount: 0 });
      }
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
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      const url = window.location.href;
      if (message?.type === "__ping__") {
        sendResponse({ ok: true });
        return;
      }
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
            warnings: result.warnings
          });
        } catch (err) {
          sendResponse({ ok: false, error: err.message });
        }
        return;
      }
      if (message?.type === "extract-thread-candidates") {
        try {
          const result = extractCandidates(document, url, {
            maxCandidates: message.maxCandidates || 20
          });
          sendResponse({
            ok: true,
            candidates: result.candidates,
            adapter: result.adapter.platformKey,
            debug: result.debug,
            warnings: result.warnings
          });
        } catch (err) {
          sendResponse({ ok: false, error: err.message });
        }
        return;
      }
      if (message?.type === "apply-prompt") {
        try {
          sendResponse(applyPrompt(document, url, String(message.prompt || "")));
        } catch (err) {
          sendResponse({ ok: false, error: err.message });
        }
        return;
      }
      if (message?.type === "serialize-page-context") {
        try {
          const turns = serializePageContext(message.maxChars || 12e3);
          const adapter = findAdapter(url);
          sendResponse({
            ok: true,
            turns,
            url,
            adapter: adapter.platformKey
          });
        } catch (err) {
          sendResponse({ ok: false, error: err.message });
        }
        return;
      }
    });
  }
})();
//# sourceMappingURL=content-script.js.map
