// Platform detector: Ideogram
// Last verified: 2026-02

const IdeogramDetector = {
  platform: "ideogram",
  displayName: "Ideogram",
  category: "image",
  urlPatterns: [
    /^https?:\/\/(www\.)?ideogram\.ai/i,
  ],

  detect(url) {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  },

  extractPrompt(document) {
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

    // Negative prompt
    let negativePrompt = null;
    const negSelectors = [
      'textarea[data-testid="negative-prompt"]',
      'textarea[placeholder*="Negative" i]',
      '[class*="negative-prompt"] textarea',
      'textarea[name="negative_prompt"]',
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

    // Read prompt from generation detail/modal
    const detailSelectors = [
      '[data-testid="image-detail"] [class*="prompt"]',
      '[class*="generation-detail"] [class*="prompt"]',
      '[class*="ImageDetail"] [class*="prompt-text"]',
    ];

    for (const selector of detailSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return { prompt: el.textContent.trim(), negativePrompt };
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

    // Model version (Ideogram 2.0, 2.5, etc.)
    const modelSelectors = [
      '[data-testid="model-selector"]',
      '[class*="model-selector"]',
      '[class*="ModelPicker"]',
      'button[class*="model-toggle"]',
      '[aria-label*="model" i]',
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
      '[class*="aspect-ratio"][class*="active"]',
      'button[class*="ratio"][aria-pressed="true"]',
      '[class*="AspectRatioButton"][class*="selected"]',
    ];

    for (const selector of ratioSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.aspectRatio = el.textContent.trim();
        break;
      }
    }

    // Style type (Auto, Design, Realistic, 3D, Anime)
    const styleSelectors = [
      '[data-testid="style-selector"]',
      '[class*="style-selector"][class*="active"]',
      'button[class*="style"][aria-pressed="true"]',
      '[class*="StyleOption"][class*="selected"]',
    ];

    for (const selector of styleSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.style = el.textContent.trim();
        break;
      }
    }

    // Rendering quality / speed
    const qualitySelectors = [
      '[data-testid="quality-selector"]',
      '[class*="quality-toggle"]',
      'button[class*="quality"][aria-pressed="true"]',
    ];

    for (const selector of qualitySelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.quality = el.textContent.trim();
        break;
      }
    }

    // Magic prompt toggle
    const magicPromptSelectors = [
      'input[aria-label*="Magic Prompt" i]',
      '[data-testid="magic-prompt-toggle"]',
      '[class*="magic-prompt"] input[type="checkbox"]',
    ];

    for (const selector of magicPromptSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        settings.magicPrompt = el.checked || el.getAttribute("aria-checked") === "true";
        break;
      }
    }

    // Seed
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

    return Object.keys(settings).length > 0 ? settings : null;
  },

  extractOutputs(document) {
    const outputs = [];

    // Generated images
    const imageSelectors = [
      '[data-testid="generated-image"] img',
      '[class*="result-grid"] img',
      '[class*="GeneratedImage"] img',
      '[class*="gallery-grid"] img',
      '[class*="output-container"] img',
      'img[src*="ideogram.ai"]:not([class*="avatar"]):not([class*="logo"])',
      'img[src*="ideogram-thumbnail"]',
    ];

    for (const selector of imageSelectors) {
      const elements = document.querySelectorAll(selector);
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
                alt: el.alt || null,
              },
            });
          }
        }
      });
    }

    // Full-size view (modal/lightbox)
    const fullSizeSelectors = [
      '[class*="fullsize-view"] img',
      '[class*="ImageModal"] img',
      '[data-testid="full-image"] img',
    ];

    for (const selector of fullSizeSelectors) {
      const el = document.querySelector(selector);
      if (el) {
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
      }
    }

    // Download links
    const downloadSelectors = [
      'a[download][href*="ideogram"]',
      'a[data-testid="download"]',
      'button[aria-label*="Download" i]',
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

export default IdeogramDetector;
