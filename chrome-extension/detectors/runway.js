// Platform detector: Runway
// Last verified: 2026-02

const RunwayDetector = {
  platform: "runway",
  displayName: "Runway",
  category: "video",
  urlPatterns: [
    /^https?:\/\/app\.runwayml\.com/i,
    /^https?:\/\/(www\.)?runwayml\.com/i,
    /^https?:\/\/runway\.com/i,
  ],

  detect(url) {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  },

  extractPrompt(document) {
    const selectors = [
      // Gen-3/Gen-4 text prompt input
      'textarea[data-testid="prompt-input"]',
      'textarea[placeholder*="Describe" i]',
      'textarea[placeholder*="prompt" i]',
      'textarea[aria-label*="text prompt" i]',
      '[data-testid="generation-prompt"] textarea',
      // Contenteditable prompt areas
      '[contenteditable="true"][data-testid="prompt-editor"]',
      '[contenteditable="true"][class*="prompt"]',
      '[contenteditable="true"][aria-label*="prompt" i]',
      // Sidebar prompt display
      '[class*="prompt-text"]',
      '[class*="PromptEditor"] textarea',
      '[class*="PromptInput"] textarea',
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

    // Generation history card prompt
    const historySelectors = [
      '[data-testid="generation-card"]:first-of-type [class*="prompt"]',
      '[class*="generation-item"]:first-of-type [class*="prompt"]',
      '[class*="HistoryCard"] [class*="prompt"]',
    ];

    for (const selector of historySelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return { prompt: el.textContent.trim(), negativePrompt: null };
      }
    }

    return null;
  },

  extractSettings(document) {
    const settings = {};

    // Model selector (Gen-2, Gen-3, Gen-4 Alpha, etc.)
    const modelSelectors = [
      '[data-testid="model-selector"]',
      '[class*="model-selector"]',
      '[class*="ModelSelector"]',
      '[aria-label*="model" i]',
      'button[class*="model-picker"]',
      '[class*="model-badge"]',
    ];

    for (const selector of modelSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.modelName = el.textContent.trim();
        break;
      }
    }

    // Duration control
    const durationSelectors = [
      '[data-testid="duration-slider"]',
      '[data-testid="duration-selector"]',
      'input[aria-label*="duration" i]',
      '[class*="duration-control"]',
      'select[class*="duration"]',
      '[class*="DurationSlider"] input',
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

    // Aspect ratio / resolution
    const ratioSelectors = [
      '[data-testid="aspect-ratio"]',
      '[class*="aspect-ratio"]',
      'button[class*="ratio"][aria-pressed="true"]',
      '[class*="ResolutionSelector"]',
    ];

    for (const selector of ratioSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.aspectRatio = el.textContent.trim();
        break;
      }
    }

    // Seed value
    const seedSelectors = [
      'input[data-testid="seed-input"]',
      'input[aria-label*="seed" i]',
      'input[name="seed"]',
    ];

    for (const selector of seedSelectors) {
      const el = document.querySelector(selector);
      if (el?.value) {
        settings.seed = parseInt(el.value, 10);
        break;
      }
    }

    // Motion / camera control
    const motionSelectors = [
      '[data-testid="motion-amount"]',
      'input[aria-label*="motion" i]',
      '[class*="motion-slider"] input',
    ];

    for (const selector of motionSelectors) {
      const el = document.querySelector(selector);
      if (el?.value) {
        settings.motionAmount = parseFloat(el.value);
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
      '[data-testid="preview-video"] video',
      '[class*="video-player"] video',
      '[class*="VideoPlayer"] video',
      '[class*="generation-result"] video',
      '[class*="OutputPreview"] video',
      'video[src*="runwayml"]',
      'video[src*="runway"]',
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

    // Image outputs (reference frame, first frame, etc.)
    const imageSelectors = [
      '[data-testid="output-image"] img',
      '[class*="generation-result"] img',
      '[class*="OutputPreview"] img',
      'img[src*="runwayml"]:not([class*="avatar"]):not([class*="icon"])',
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
      'a[download][href*="runway"]',
      'a[data-testid="download-link"]',
      'button[data-testid="download-button"]',
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

export default RunwayDetector;
