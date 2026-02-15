// Platform detector: Google Gemini + Veo
// Last verified: 2026-02

const GeminiVeoDetector = {
  platform: "google-veo",
  displayName: "Google Gemini / Veo",
  category: "multi",
  urlPatterns: [
    /^https?:\/\/gemini\.google\.com/i,
    /^https?:\/\/aistudio\.google\.com/i,
    /^https?:\/\/deepmind\.google.*veo/i,
    /^https?:\/\/labs\.google.*video/i,
  ],

  detect(url) {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  },

  extractPrompt(document) {
    const selectors = [
      // Gemini main chat prompt area
      'div.ql-editor[contenteditable="true"]',
      '[data-testid="text-input-field"]',
      'rich-textarea textarea',
      'textarea[aria-label*="Enter a prompt" i]',
      'textarea[aria-label*="Type something" i]',
      'textarea[placeholder*="Enter a prompt" i]',
      // AI Studio prompt editor
      'textarea[aria-label*="prompt" i]',
      '.prompt-input textarea',
      '[data-testid="prompt-textarea"]',
      // Contenteditable fallback
      '[contenteditable="true"][aria-label*="prompt" i]',
      '[contenteditable="true"][data-placeholder*="Enter" i]',
      // General fallbacks
      ".input-area textarea",
      "textarea.text-input",
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

    // Try the last user message in chat
    const chatMessageSelectors = [
      '[data-testid="user-message"]:last-of-type',
      '.user-message:last-of-type',
      '.conversation-turn[data-role="user"]:last-of-type',
      'message-content[data-author="user"]:last-of-type',
    ];

    for (const selector of chatMessageSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return { prompt: el.textContent.trim(), negativePrompt: null };
      }
    }

    return null;
  },

  extractSettings(document) {
    const settings = {};

    // Model selector in Gemini / AI Studio
    const modelSelectors = [
      '[data-testid="model-selector"]',
      'button[aria-label*="model" i]',
      '[class*="model-selector"]',
      '[class*="ModelPicker"]',
      'mat-select[aria-label*="model" i]',
      ".model-dropdown",
    ];

    for (const selector of modelSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.modelName = el.textContent.trim();
        break;
      }
    }

    // AI Studio temperature
    const tempSelectors = [
      'input[aria-label*="Temperature" i]',
      '[data-testid="temperature-slider"]',
      'input[type="range"][class*="temperature" i]',
    ];

    for (const selector of tempSelectors) {
      const el = document.querySelector(selector);
      if (el?.value) {
        settings.temperature = parseFloat(el.value);
        break;
      }
    }

    // Aspect ratio for image/video generation
    const ratioSelectors = [
      '[data-testid="aspect-ratio-selector"]',
      '[aria-label*="aspect ratio" i]',
      'button[class*="aspect"][aria-pressed="true"]',
      '[class*="ratio-option"][class*="selected"]',
    ];

    for (const selector of ratioSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.aspectRatio = el.textContent.trim();
        break;
      }
    }

    // Duration for Veo video generation
    const durationSelectors = [
      '[data-testid="duration-control"]',
      '[aria-label*="duration" i]',
      'input[type="range"][class*="duration"]',
    ];

    for (const selector of durationSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        settings.duration = el.value || el.textContent?.trim() || el.getAttribute("aria-valuenow");
        break;
      }
    }

    return Object.keys(settings).length > 0 ? settings : null;
  },

  extractOutputs(document) {
    const outputs = [];

    // Video outputs from Veo generation
    const videoSelectors = [
      '[data-testid="generated-video"] video',
      '[class*="video-result"] video',
      '[class*="generation-output"] video',
      '[class*="media-container"] video',
      'video[src*="googleusercontent"]',
      'video[src*="storage.googleapis"]',
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

    // Image outputs from Gemini/Imagen
    const imageSelectors = [
      '[data-testid="generated-image"] img',
      '[class*="image-result"] img',
      '[class*="generation-output"] img',
      '[class*="media-container"] img:not([class*="avatar"])',
      'img[src*="googleusercontent"]:not([width="24"]):not([width="32"])',
      'img[src*="storage.googleapis"]:not([class*="icon"])',
    ];

    for (const selector of imageSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const src = el.currentSrc || el.src;
        // Skip tiny icons and avatars
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
      'a[download][href*="googleapis"]',
      'a[download][href*="googleusercontent"]',
      'button[aria-label*="Download" i]',
    ];

    for (const selector of downloadSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const href = el.href || el.getAttribute("data-url");
        if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
          const isVideo = /\.(mp4|webm|mov)/i.test(href) || href.includes("video");
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

export default GeminiVeoDetector;
