// Platform detector: Flux / Black Forest Labs
// Last verified: 2026-02

const FluxDetector = {
  platform: "bfl-flux",
  displayName: "Flux (Black Forest Labs)",
  category: "image",
  urlPatterns: [
    /^https?:\/\/(www\.)?blackforestlabs\.ai/i,
    /^https?:\/\/replicate\.com\/black-forest-labs/i,
    /^https?:\/\/replicate\.com\/.*flux/i,
    /^https?:\/\/fal\.ai\/models\/fal-ai\/flux/i,
    /^https?:\/\/fal\.ai\/.*flux/i,
    /^https?:\/\/flux1\.ai/i,
  ],

  detect(url) {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  },

  extractPrompt(document) {
    const host = window?.location?.hostname || "";

    // Replicate-specific selectors
    if (host.includes("replicate.com")) {
      const replicateSelectors = [
        'textarea[name="prompt"]',
        'textarea[data-testid="prompt"]',
        '[data-testid="input-prompt"] textarea',
        'label[for="prompt"] ~ textarea',
        'label[for="prompt"] ~ div textarea',
        '[class*="playground"] textarea:first-of-type',
      ];

      for (const selector of replicateSelectors) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          return { prompt: text, negativePrompt: null };
        }
      }
    }

    // fal.ai-specific selectors
    if (host.includes("fal.ai")) {
      const falSelectors = [
        'textarea[name="prompt"]',
        'textarea[placeholder*="Describe" i]',
        '[data-testid="prompt-input"] textarea',
        '[class*="prompt-field"] textarea',
        'textarea',
      ];

      for (const selector of falSelectors) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const text = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
        if (text && text.length > 2) {
          return { prompt: text, negativePrompt: null };
        }
      }
    }

    // Black Forest Labs / generic selectors
    const selectors = [
      'textarea[data-testid="prompt-input"]',
      'textarea[placeholder*="Describe" i]',
      'textarea[placeholder*="prompt" i]',
      'textarea[name="prompt"]',
      'textarea[aria-label*="prompt" i]',
      '[class*="prompt-input"] textarea',
      '[class*="PromptField"] textarea',
      'textarea',
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

    return null;
  },

  extractSettings(document) {
    const settings = {};
    const host = window?.location?.hostname || "";

    // Model name (Flux 1.1 Pro, Flux Dev, Flux Schnell, etc.)
    // Replicate shows it in the page title / breadcrumb
    if (host.includes("replicate.com")) {
      const breadcrumb = document.querySelector('[class*="breadcrumb"] a:last-of-type');
      if (breadcrumb?.textContent?.trim()) {
        settings.modelName = breadcrumb.textContent.trim();
      }

      // Check model version in the URL path
      const pathMatch = window.location.pathname.match(/flux[_-]?([\w.-]+)/i);
      if (pathMatch) {
        settings.modelName = settings.modelName || `Flux ${pathMatch[1]}`;
      }
    }

    // fal.ai model name
    if (host.includes("fal.ai")) {
      const modelTitle = document.querySelector('[class*="model-title"]') ||
        document.querySelector("h1");
      if (modelTitle?.textContent?.trim()) {
        settings.modelName = modelTitle.textContent.trim();
      }
    }

    // Generic model selector
    if (!settings.modelName) {
      const modelSelectors = [
        '[data-testid="model-selector"]',
        '[class*="model-name"]',
        '[aria-label*="model" i]',
      ];

      for (const selector of modelSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.modelName = el.textContent.trim();
          break;
        }
      }
    }

    // Width/Height inputs (common in Replicate/fal.ai playgrounds)
    const widthEl =
      document.querySelector('input[name="width"]') ||
      document.querySelector('input[aria-label*="width" i]');
    const heightEl =
      document.querySelector('input[name="height"]') ||
      document.querySelector('input[aria-label*="height" i]');

    if (widthEl?.value && heightEl?.value) {
      settings.width = parseInt(widthEl.value, 10);
      settings.height = parseInt(heightEl.value, 10);
      settings.aspectRatio = `${widthEl.value}x${heightEl.value}`;
    }

    // Guidance scale
    const guidanceEl =
      document.querySelector('input[name="guidance_scale"]') ||
      document.querySelector('input[name="guidance"]') ||
      document.querySelector('input[aria-label*="guidance" i]');
    if (guidanceEl?.value) {
      settings.guidanceScale = parseFloat(guidanceEl.value);
    }

    // Number of steps
    const stepsEl =
      document.querySelector('input[name="num_inference_steps"]') ||
      document.querySelector('input[name="steps"]') ||
      document.querySelector('input[aria-label*="steps" i]');
    if (stepsEl?.value) {
      settings.steps = parseInt(stepsEl.value, 10);
    }

    // Seed
    const seedEl =
      document.querySelector('input[name="seed"]') ||
      document.querySelector('input[aria-label*="seed" i]');
    if (seedEl?.value) {
      settings.seed = parseInt(seedEl.value, 10);
    }

    // Number of outputs
    const numOutputsEl =
      document.querySelector('input[name="num_outputs"]') ||
      document.querySelector('input[name="num_images"]');
    if (numOutputsEl?.value) {
      settings.numOutputs = parseInt(numOutputsEl.value, 10);
    }

    return Object.keys(settings).length > 0 ? settings : null;
  },

  extractOutputs(document) {
    const outputs = [];
    const host = window?.location?.hostname || "";

    // Replicate output images
    if (host.includes("replicate.com")) {
      const replicateSelectors = [
        '[data-testid="output-image"] img',
        '[class*="output"] img',
        '[class*="prediction-output"] img',
        'img[src*="replicate.delivery"]',
        'img[src*="pbxt.replicate"]',
      ];

      for (const selector of replicateSelectors) {
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
                },
              });
            }
          }
        });
      }
    }

    // fal.ai output images
    if (host.includes("fal.ai")) {
      const falSelectors = [
        '[class*="output"] img',
        '[class*="result"] img',
        'img[src*="fal.media"]',
        'img[src*="fal.ai"]',
      ];

      for (const selector of falSelectors) {
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
                },
              });
            }
          }
        });
      }
    }

    // Generic / BFL site outputs
    const imageSelectors = [
      '[data-testid="generated-image"] img',
      '[class*="result-image"] img',
      '[class*="output-grid"] img',
      'img[src*="blackforestlabs"]:not([class*="logo"])',
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
              },
            });
          }
        }
      });
    }

    // Download links
    const downloadSelectors = [
      'a[download][href*="replicate"]',
      'a[download][href*="fal"]',
      'a[download][href*="blackforestlabs"]',
      'a[data-testid="download"]',
    ];

    for (const selector of downloadSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const href = el.href;
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

export default FluxDetector;
