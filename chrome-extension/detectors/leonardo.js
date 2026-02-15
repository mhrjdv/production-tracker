// Platform detector: Leonardo AI
// Last verified: 2026-02

const LeonardoDetector = {
  platform: "leonardo-ai",
  displayName: "Leonardo AI",
  category: "image",
  urlPatterns: [
    /^https?:\/\/app\.leonardo\.ai/i,
    /^https?:\/\/(www\.)?leonardo\.ai/i,
  ],

  detect(url) {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  },

  extractPrompt(document) {
    // Leonardo uses both text prompt and negative prompt fields
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
      '[contenteditable="true"][data-placeholder*="prompt" i]',
    ];

    let prompt = null;
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el) continue;

      const text =
        el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement
          ? el.value?.trim()
          : el.textContent?.trim();

      if (text && text.length > 2) {
        prompt = text;
        break;
      }
    }

    if (!prompt) return null;

    // Negative prompt
    let negativePrompt = null;
    const negSelectors = [
      'textarea[data-testid="negative-prompt"]',
      'textarea[placeholder*="Negative" i]',
      'textarea[aria-label*="negative" i]',
      '[class*="negative-prompt"] textarea',
      '[data-testid="negative-prompt-input"]',
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

    return { prompt, negativePrompt };
  },

  extractSettings(document) {
    const settings = {};

    // Model selector (Leonardo Diffusion XL, Phoenix, Kino XL, etc.)
    const modelSelectors = [
      '[data-testid="model-selector"]',
      '[class*="model-select"]',
      '[class*="ModelSelector"]',
      '[class*="model-picker"]',
      'button[class*="model-name"]',
      '[aria-label*="model" i]',
    ];

    for (const selector of modelSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.modelName = el.textContent.trim();
        break;
      }
    }

    // Image dimensions / aspect ratio
    const dimensionSelectors = [
      '[data-testid="dimension-selector"]',
      '[class*="dimension-control"]',
      '[class*="DimensionSelector"]',
    ];

    for (const selector of dimensionSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.dimensions = el.textContent.trim();
        break;
      }
    }

    // Width/Height inputs
    const widthEl =
      document.querySelector('input[aria-label*="width" i]') ||
      document.querySelector('input[data-testid="width-input"]');
    const heightEl =
      document.querySelector('input[aria-label*="height" i]') ||
      document.querySelector('input[data-testid="height-input"]');

    if (widthEl?.value && heightEl?.value) {
      settings.width = parseInt(widthEl.value, 10);
      settings.height = parseInt(heightEl.value, 10);
      settings.aspectRatio = `${widthEl.value}x${heightEl.value}`;
    }

    // Guidance scale
    const guidanceSelectors = [
      'input[aria-label*="Guidance" i]',
      '[data-testid="guidance-scale"] input',
      '[class*="guidance-slider"] input',
    ];

    for (const selector of guidanceSelectors) {
      const el = document.querySelector(selector);
      if (el?.value) {
        settings.guidanceScale = parseFloat(el.value);
        break;
      }
    }

    // Number of images
    const countSelectors = [
      '[data-testid="num-images"]',
      'input[aria-label*="number of images" i]',
      '[class*="image-count"] input',
    ];

    for (const selector of countSelectors) {
      const el = document.querySelector(selector);
      if (el?.value) {
        settings.imageCount = parseInt(el.value, 10);
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

    // Scheduler
    const schedulerSelectors = [
      '[data-testid="scheduler-selector"]',
      'select[aria-label*="scheduler" i]',
      '[class*="scheduler-select"]',
    ];

    for (const selector of schedulerSelectors) {
      const el = document.querySelector(selector);
      if (el?.value || el?.textContent?.trim()) {
        settings.scheduler = el.value || el.textContent.trim();
        break;
      }
    }

    return Object.keys(settings).length > 0 ? settings : null;
  },

  extractOutputs(document) {
    const outputs = [];

    // Generated images in the gallery/grid
    const imageSelectors = [
      '[data-testid="generated-image"] img',
      '[class*="generation-grid"] img',
      '[class*="GeneratedImage"] img',
      '[class*="image-card"] img',
      '[class*="output-grid"] img',
      'img[src*="leonardo.ai"]:not([class*="avatar"]):not([class*="logo"])',
      'img[src*="cdn.leonardo"]:not([width="24"]):not([width="32"])',
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

    // Full-size lightbox image
    const lightboxSelectors = [
      '[class*="lightbox"] img',
      '[class*="Lightbox"] img',
      '[data-testid="fullsize-image"] img',
      '[class*="modal-image"] img',
    ];

    for (const selector of lightboxSelectors) {
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
      'a[download][href*="leonardo"]',
      'a[data-testid="download-button"]',
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

export default LeonardoDetector;
