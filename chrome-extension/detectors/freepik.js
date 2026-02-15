// Platform detector: Freepik Pikaso
// Last verified: 2026-02

const FreepikDetector = {
  platform: "freepik-ai",
  displayName: "Freepik Pikaso",
  category: "image",
  urlPatterns: [
    /^https?:\/\/(www\.)?freepik\.com\/pikaso/i,
    /^https?:\/\/(www\.)?freepik\.com\/ai\//i,
    /^https?:\/\/(www\.)?freepik\.com\/.*image-generator/i,
    /^https?:\/\/(www\.)?freepik\.com\/.*ai-image/i,
  ],

  detect(url) {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  },

  extractPrompt(document) {
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
      'textarea[aria-label*="prompt" i]',
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
      'textarea[name="negative_prompt"]',
      '[class*="negative-prompt"] textarea',
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

    // Re-read the prompt with the found negative
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

    // Style selector
    const styleSelectors = [
      '[data-testid="style-selector"] [aria-pressed="true"]',
      '[class*="style-option"][class*="active"]',
      '[class*="StyleSelector"] [class*="selected"]',
      '[class*="style-chip"][class*="active"]',
    ];

    for (const selector of styleSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.style = el.textContent.trim();
        break;
      }
    }

    // Aspect ratio
    const ratioSelectors = [
      '[data-testid="aspect-ratio"] [aria-pressed="true"]',
      '[class*="aspect-ratio"][class*="selected"]',
      'button[class*="ratio"][aria-pressed="true"]',
      '[class*="size-option"][class*="active"]',
    ];

    for (const selector of ratioSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.aspectRatio = el.textContent.trim();
        break;
      }
    }

    // Model name
    const modelSelectors = [
      '[data-testid="model-selector"]',
      '[class*="model-dropdown"]',
      '[aria-label*="model" i]',
    ];

    for (const selector of modelSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.modelName = el.textContent.trim();
        break;
      }
    }

    // Number of images
    const countSelectors = [
      '[data-testid="image-count"]',
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
      '[class*="pikaso-result"] img',
      'img[src*="img.freepik.com"]',
      'img[src*="freepik.com/ai/"]',
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

    // Download links
    const downloadSelectors = [
      'a[download][href*="freepik"]',
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

export default FreepikDetector;
