// Platform detector: Adobe Firefly
// Last verified: 2026-02

const AdobeFireflyDetector = {
  platform: "adobe-firefly",
  displayName: "Adobe Firefly",
  category: "image",
  urlPatterns: [
    /^https?:\/\/firefly\.adobe\.com/i,
    /^https?:\/\/(www\.)?adobe\.com\/products\/firefly/i,
    /^https?:\/\/(www\.)?adobe\.com\/sensei\/generative-ai\/firefly/i,
  ],

  detect(url) {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  },

  extractPrompt(document) {
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
      'textarea[class*="prompt"]',
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

    // Read prompt from the generation detail panel
    const detailSelectors = [
      '[data-testid="generation-details"] [class*="prompt"]',
      '[class*="generation-info"] [class*="prompt"]',
      '[class*="PromptDisplay"]',
    ];

    for (const selector of detailSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return { prompt: el.textContent.trim(), negativePrompt: null };
      }
    }

    return null;
  },

  extractSettings(document) {
    const settings = {};

    // Model / feature type (Firefly Image 3, Text Effects, etc.)
    const modelSelectors = [
      '[data-testid="model-selector"]',
      '[class*="model-selector"]',
      '[class*="ModelPicker"]',
      '[aria-label*="model" i]',
      'sp-picker[label*="model" i]',
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
      '[data-testid="aspect-ratio-selector"]',
      '[class*="aspect-ratio"][class*="selected"]',
      'sp-action-button[aria-label*="aspect" i][selected]',
      'button[aria-pressed="true"][class*="ratio"]',
      '[class*="RatioSelector"] [class*="active"]',
    ];

    for (const selector of ratioSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.aspectRatio = el.textContent.trim();
        break;
      }
    }

    // Content type (Photo, Art, Graphic)
    const contentTypeSelectors = [
      '[data-testid="content-type-selector"]',
      '[class*="content-type"][class*="selected"]',
      'sp-action-button[aria-label*="content type" i][selected]',
      '[class*="ContentType"] [class*="active"]',
    ];

    for (const selector of contentTypeSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.contentType = el.textContent.trim();
        break;
      }
    }

    // Style / visual intensity
    const styleSelectors = [
      '[data-testid="style-selector"]',
      '[class*="style-option"][class*="active"]',
      '[class*="style-chip"][class*="selected"]',
    ];

    for (const selector of styleSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.style = el.textContent.trim();
        break;
      }
    }

    // Effects / color / tone
    const effectSelectors = [
      '[data-testid="effect-selector"]',
      '[class*="effect-option"][class*="active"]',
      '[class*="EffectSelector"] [class*="selected"]',
    ];

    for (const selector of effectSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.effect = el.textContent.trim();
        break;
      }
    }

    return Object.keys(settings).length > 0 ? settings : null;
  },

  extractOutputs(document) {
    const outputs = [];

    // Generated image results
    const imageSelectors = [
      '[data-testid="generated-image"] img',
      '[class*="result-image"] img',
      '[class*="GeneratedImage"] img',
      '[class*="output-grid"] img',
      '[class*="gallery-item"] img',
      'img[src*="firefly.adobe.com"]:not([class*="icon"])',
      'img[src*="cc-api-storage"]:not([width="24"])',
      'img[src*="adobeaemcloud"]:not([class*="avatar"])',
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
                alt: el.alt || null,
              },
            });
          }
        }
      });
    }

    // Canvas / editor preview
    const canvasSelectors = [
      'canvas[data-testid="firefly-canvas"]',
      '[class*="editor-canvas"] canvas',
    ];

    for (const selector of canvasSelectors) {
      const canvas = document.querySelector(selector);
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
                source: "canvas-export",
              },
            });
          }
        } catch {
          // Canvas may be tainted, skip
        }
      }
    }

    // Download links
    const downloadSelectors = [
      'a[download][href*="adobe"]',
      'sp-action-button[aria-label*="Download" i]',
      'button[data-testid="download-button"]',
      'a[data-testid="download-link"]',
    ];

    for (const selector of downloadSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const href = el.href || el.getAttribute("data-url");
        if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
          outputs.push({
            type: "image",
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

export default AdobeFireflyDetector;
