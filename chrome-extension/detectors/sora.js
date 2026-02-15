// Platform detector: OpenAI Sora
// Last verified: 2026-02

const SoraDetector = {
  platform: "openai-sora",
  displayName: "OpenAI Sora",
  category: "multi",
  urlPatterns: [
    /^https?:\/\/(www\.)?sora\.com/i,
    /^https?:\/\/sora\.chatgpt\.com/i,
    /^https?:\/\/chat\.openai\.com\/.*sora/i,
    /^https?:\/\/chatgpt\.com\/.*sora/i,
  ],

  detect(url) {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  },

  extractPrompt(document) {
    // Sora uses a chat-style prompt input and a dedicated creation prompt area
    const selectors = [
      // Main prompt textarea in Sora creation view
      'textarea[data-testid="sora-prompt-input"]',
      'textarea[placeholder*="Describe" i]',
      'textarea[placeholder*="prompt" i]',
      'textarea[aria-label*="prompt" i]',
      // Chat-based Sora interface via ChatGPT
      'div[data-testid="prompt-textarea"] textarea',
      "#prompt-textarea",
      'textarea[data-testid="prompt-textarea"]',
      // Contenteditable variants
      '[contenteditable="true"][data-placeholder*="Describe" i]',
      '[contenteditable="true"][data-testid="prompt-textarea"]',
      // Fallback: any visible textarea with substantial content
      "textarea",
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el) continue;

      const text =
        el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement
          ? el.value?.trim()
          : el.textContent?.trim();

      if (text && text.length > 2) {
        return { prompt: text, negativePrompt: null };
      }
    }

    // Try to read prompt from the most recent generation card's displayed prompt
    const promptDisplaySelectors = [
      '[data-testid="generation-prompt"]',
      ".generation-prompt",
      '[class*="prompt-text"]',
      '[class*="PromptDisplay"]',
    ];

    for (const selector of promptDisplaySelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return { prompt: el.textContent.trim(), negativePrompt: null };
      }
    }

    return null;
  },

  extractSettings(document) {
    const settings = {};

    // Model / version badge
    const modelSelectors = [
      '[data-testid="model-selector"]',
      '[data-testid="model-badge"]',
      '[class*="model-name"]',
      '[class*="ModelSelector"]',
      '[aria-label*="model" i]',
    ];

    for (const selector of modelSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.modelName = el.textContent.trim();
        break;
      }
    }

    // Aspect ratio / resolution
    const ratioSelectors = [
      '[data-testid="aspect-ratio"]',
      '[class*="aspect-ratio"]',
      '[class*="AspectRatio"]',
      '[aria-label*="aspect" i]',
      'button[class*="ratio"][aria-pressed="true"]',
    ];

    for (const selector of ratioSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.aspectRatio = el.textContent.trim();
        break;
      }
    }

    // Duration control
    const durationSelectors = [
      '[data-testid="duration-selector"]',
      '[class*="duration"]',
      '[aria-label*="duration" i]',
      'input[type="range"][aria-label*="duration" i]',
    ];

    for (const selector of durationSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const val = el.value || el.textContent?.trim() || el.getAttribute("aria-valuenow");
        if (val) {
          settings.duration = val;
          break;
        }
      }
    }

    // Resolution
    const resSelectors = [
      '[data-testid="resolution-selector"]',
      '[class*="resolution"]',
      'select[aria-label*="resolution" i]',
    ];

    for (const selector of resSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim() || el?.value) {
        settings.resolution = el.value || el.textContent.trim();
        break;
      }
    }

    return Object.keys(settings).length > 0 ? settings : null;
  },

  extractOutputs(document) {
    const outputs = [];

    // Video outputs (primary for Sora)
    const videoSelectors = [
      'video[data-testid="sora-output"]',
      'video[data-testid="generation-video"]',
      '[class*="generation-result"] video',
      '[class*="VideoPlayer"] video',
      '[class*="output-container"] video',
      'video[src*="oaiusercontent"]',
      "video[src]",
    ];

    for (const selector of videoSelectors) {
      const elements = document.querySelectorAll(selector);
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
              height: el.videoHeight || null,
            },
          });
        }
      });
    }

    // Image outputs (Sora also generates stills)
    const imageSelectors = [
      'img[data-testid="sora-output"]',
      'img[data-testid="generation-image"]',
      '[class*="generation-result"] img',
      '[class*="output-container"] img:not([class*="avatar"])',
      'img[src*="oaiusercontent"]',
    ];

    for (const selector of imageSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const src = el.currentSrc || el.src;
        if (src && src.startsWith("http") && !outputs.some((o) => o.url === src)) {
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
    }

    // Download links as fallback
    const downloadSelectors = [
      'a[download][href*="oaiusercontent"]',
      'a[data-testid="download-button"]',
      'button[data-testid="download"]',
    ];

    for (const selector of downloadSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const href = el.href || el.getAttribute("data-url");
        if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
          const isVideo = /\.(mp4|webm|mov)/i.test(href);
          outputs.push({
            type: isVideo ? "video" : "image",
            url: href,
            thumbnailUrl: null,
            metadata: {},
          });
        }
      });
    }

    return outputs;
  },
};

export default SoraDetector;
