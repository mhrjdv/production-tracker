// Platform detector: Luma Dream Machine
// Last verified: 2026-02

const LumaDetector = {
  platform: "luma-dream-machine",
  displayName: "Luma Dream Machine",
  category: "video",
  urlPatterns: [
    /^https?:\/\/(www\.)?lumalabs\.ai/i,
    /^https?:\/\/dream-machine\.lumalabs\.ai/i,
  ],

  detect(url) {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  },

  extractPrompt(document) {
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
      '[contenteditable="true"][class*="prompt"]',
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

    // Check generation history for prompts
    const historySelectors = [
      '[class*="generation-card"]:first-of-type [class*="prompt"]',
      '[data-testid="generation-item"]:first-of-type [class*="prompt"]',
      '[class*="HistoryItem"] [class*="prompt"]',
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

    // Model version (Dream Machine 1.5, Ray, etc.)
    const modelSelectors = [
      '[data-testid="model-selector"]',
      '[class*="model-selector"]',
      '[class*="ModelPicker"]',
      '[aria-label*="model" i]',
      '[class*="model-badge"]',
    ];

    for (const selector of modelSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.modelName = el.textContent.trim();
        break;
      }
    }

    // Aspect ratio
    const ratioSelectors = [
      '[data-testid="aspect-ratio"]',
      '[class*="aspect-ratio"][class*="selected"]',
      'button[class*="ratio"][aria-pressed="true"]',
      '[class*="RatioSelector"] [class*="active"]',
    ];

    for (const selector of ratioSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.aspectRatio = el.textContent.trim();
        break;
      }
    }

    // Duration
    const durationSelectors = [
      '[data-testid="duration-selector"]',
      '[class*="duration-control"]',
      'input[aria-label*="duration" i]',
      '[class*="DurationPicker"]',
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

    // Camera motion
    const motionSelectors = [
      '[data-testid="camera-motion"]',
      '[class*="camera-motion"]',
      '[class*="CameraMotion"]',
      '[aria-label*="camera" i]',
    ];

    for (const selector of motionSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.cameraMotion = el.textContent.trim();
        break;
      }
    }

    // Loop setting
    const loopSelectors = [
      'input[type="checkbox"][aria-label*="loop" i]',
      '[data-testid="loop-toggle"]',
      '[class*="loop-switch"]',
    ];

    for (const selector of loopSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        settings.loop = el.checked || el.getAttribute("aria-checked") === "true";
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
      '[class*="video-player"] video',
      '[class*="VideoPlayer"] video',
      '[class*="generation-result"] video',
      '[class*="OutputView"] video',
      'video[src*="lumalabs"]',
      'video[src*="luma"]',
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

    // Image outputs (keyframes, reference images)
    const imageSelectors = [
      '[data-testid="output-image"] img',
      '[class*="generation-result"] img',
      '[class*="OutputView"] img',
      'img[src*="lumalabs"]:not([class*="avatar"]):not([class*="logo"])',
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
      'a[download][href*="lumalabs"]',
      'a[download][href*="luma"]',
      'a[data-testid="download"]',
      'button[aria-label*="Download" i]',
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

export default LumaDetector;
