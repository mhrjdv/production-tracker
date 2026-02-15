// Platform detector: Kling AI
// Last verified: 2026-02

const KlingDetector = {
  platform: "kling-ai",
  displayName: "Kling AI",
  category: "video",
  urlPatterns: [
    /^https?:\/\/(www\.)?klingai\.com/i,
    /^https?:\/\/app\.klingai\.com/i,
    /^https?:\/\/global\.klingai\.com/i,
  ],

  detect(url) {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  },

  extractPrompt(document) {
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
      'textarea.ant-input',
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

    // Negative prompt
    let negativePrompt = null;
    const negSelectors = [
      'textarea[placeholder*="Negative" i]',
      'textarea[data-testid="negative-prompt"]',
      '[class*="negative-prompt"] textarea',
      '[class*="NegativePrompt"] textarea',
    ];

    for (const selector of negSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const val =
          el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
        if (val) {
          negativePrompt = val;
          break;
        }
      }
    }

    // Re-read with negative
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const text =
        el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement
          ? el.value?.trim()
          : el.textContent?.trim();
      if (text && text.length > 2) {
        return { prompt: text, negativePrompt };
      }
    }

    return null;
  },

  extractSettings(document) {
    const settings = {};

    // Model selector (Kling 1.0, 1.5, 1.6, etc.)
    const modelSelectors = [
      '[data-testid="model-selector"]',
      '[class*="model-select"]',
      '[class*="ModelSelector"]',
      '.ant-select[class*="model"]',
      '[aria-label*="model" i]',
      '[class*="version-tag"]',
    ];

    for (const selector of modelSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.modelName = el.textContent.trim();
        break;
      }
    }

    // Duration
    const durationSelectors = [
      '[data-testid="duration-selector"]',
      '[class*="duration"]',
      '.ant-slider[aria-label*="duration" i]',
      'input[aria-label*="duration" i]',
      '[class*="Duration"] [class*="value"]',
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

    // Aspect ratio
    const ratioSelectors = [
      '[data-testid="ratio-selector"]',
      '[class*="aspect-ratio"][class*="active"]',
      '[class*="ratio-option"][class*="selected"]',
      'button[class*="ratio"][class*="active"]',
    ];

    for (const selector of ratioSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.aspectRatio = el.textContent.trim();
        break;
      }
    }

    // Mode (standard / pro / master)
    const modeSelectors = [
      '[data-testid="mode-selector"]',
      '[class*="mode-select"][class*="active"]',
      '[class*="QualitySelector"] [class*="selected"]',
    ];

    for (const selector of modeSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.mode = el.textContent.trim();
        break;
      }
    }

    // CFG scale
    const cfgSelectors = [
      'input[aria-label*="CFG" i]',
      'input[aria-label*="creativity" i]',
      '[class*="cfg-scale"] input',
    ];

    for (const selector of cfgSelectors) {
      const el = document.querySelector(selector);
      if (el?.value) {
        settings.cfgScale = parseFloat(el.value);
        break;
      }
    }

    return Object.keys(settings).length > 0 ? settings : null;
  },

  extractOutputs(document) {
    const outputs = [];

    // Video outputs
    const videoSelectors = [
      '[data-testid="generation-video"] video',
      '[class*="video-result"] video',
      '[class*="VideoPlayer"] video',
      '[class*="result-card"] video',
      '[class*="generation-output"] video',
      'video[src*="klingai"]',
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

    // Image outputs (for image generation mode)
    const imageSelectors = [
      '[data-testid="generation-image"] img',
      '[class*="result-card"] img',
      '[class*="generation-output"] img',
      'img[src*="klingai"]:not([class*="avatar"]):not([class*="icon"])',
    ];

    for (const selector of imageSelectors) {
      const elements = document.querySelectorAll(selector);
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
              },
            });
          }
        }
      });
    }

    // Download links
    const downloadSelectors = [
      'a[download][href*="klingai"]',
      'a[data-testid="download"]',
      'button[class*="download"]',
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

export default KlingDetector;
