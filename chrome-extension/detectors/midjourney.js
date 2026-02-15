// Platform detector: Midjourney
// Last verified: 2026-02

const MidjourneyDetector = {
  platform: "midjourney",
  displayName: "Midjourney",
  category: "image",
  urlPatterns: [
    /^https?:\/\/(www\.)?midjourney\.com/i,
    /^https?:\/\/alpha\.midjourney\.com/i,
  ],

  detect(url) {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  },

  extractPrompt(document) {
    const selectors = [
      // Midjourney web app prompt bar
      'textarea[data-testid="prompt-input"]',
      'textarea[placeholder*="Imagine" i]',
      'textarea[placeholder*="Describe" i]',
      'textarea[aria-label*="prompt" i]',
      '[data-testid="prompt-textarea"]',
      // Contenteditable prompt field
      '[contenteditable="true"][data-placeholder*="Imagine" i]',
      '[contenteditable="true"][class*="prompt"]',
      // Job detail prompt display
      '[class*="prompt-text"]',
      '[data-testid="job-prompt"]',
      '[class*="PromptText"]',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el) continue;

      const text =
        el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement
          ? el.value?.trim()
          : el.textContent?.trim();

      if (text && text.length > 2) {
        // Parse Midjourney prompt: strip --parameters for separate handling
        const paramMatch = text.match(/^(.*?)\s*(--\w+.*)?$/s);
        const prompt = paramMatch ? paramMatch[1].trim() : text;
        return { prompt, negativePrompt: null };
      }
    }

    // Check the most recent job card's prompt
    const jobCardSelectors = [
      '[class*="job-card"]:last-of-type [class*="prompt"]',
      '[data-testid="job-card"]:last-of-type [data-testid="prompt"]',
      '[class*="TaskCard"] [class*="prompt"]',
    ];

    for (const selector of jobCardSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return { prompt: el.textContent.trim(), negativePrompt: null };
      }
    }

    return null;
  },

  extractSettings(document) {
    const settings = {};

    // Model version from prompt parameters (--v 6.1, etc.)
    const promptEl =
      document.querySelector('[data-testid="prompt-input"]') ||
      document.querySelector('[data-testid="job-prompt"]') ||
      document.querySelector('[class*="prompt-text"]');

    if (promptEl) {
      const fullText = promptEl.value || promptEl.textContent || "";

      const versionMatch = fullText.match(/--v\s+([\d.]+)/i);
      if (versionMatch) {
        settings.modelName = `Midjourney v${versionMatch[1]}`;
      }

      const arMatch = fullText.match(/--ar\s+([\d:]+)/i);
      if (arMatch) {
        settings.aspectRatio = arMatch[1];
      }

      const seedMatch = fullText.match(/--seed\s+(\d+)/i);
      if (seedMatch) {
        settings.seed = parseInt(seedMatch[1], 10);
      }

      const styleMatch = fullText.match(/--style\s+(\w+)/i);
      if (styleMatch) {
        settings.style = styleMatch[1];
      }

      const qualityMatch = fullText.match(/--q\s+([\d.]+)/i);
      if (qualityMatch) {
        settings.quality = parseFloat(qualityMatch[1]);
      }

      const chaosMatch = fullText.match(/--chaos\s+(\d+)/i);
      if (chaosMatch) {
        settings.chaos = parseInt(chaosMatch[1], 10);
      }

      const stylizeMatch = fullText.match(/--s\s+(\d+)/i) || fullText.match(/--stylize\s+(\d+)/i);
      if (stylizeMatch) {
        settings.stylize = parseInt(stylizeMatch[1], 10);
      }
    }

    // Model version from UI controls
    if (!settings.modelName) {
      const modelSelectors = [
        '[data-testid="model-selector"]',
        '[class*="version-selector"]',
        '[class*="ModelDropdown"]',
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

    // Aspect ratio from UI if not parsed from prompt
    if (!settings.aspectRatio) {
      const ratioSelectors = [
        '[data-testid="aspect-ratio-selector"]',
        '[class*="aspect-ratio"][class*="selected"]',
        'button[class*="ratio"][aria-pressed="true"]',
      ];

      for (const selector of ratioSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.aspectRatio = el.textContent.trim();
          break;
        }
      }
    }

    return Object.keys(settings).length > 0 ? settings : null;
  },

  extractOutputs(document) {
    const outputs = [];

    // Main image outputs from grid/gallery
    const imageSelectors = [
      // Job result images
      '[data-testid="job-image"] img',
      '[class*="job-image"] img',
      '[class*="ImageGrid"] img',
      '[class*="result-grid"] img',
      // Upscaled / single view
      '[data-testid="upscaled-image"] img',
      '[class*="fullsize-image"] img',
      '[class*="ImageView"] img',
      // Gallery images
      'img[src*="midjourney"]',
      'img[src*="mj-gallery"]',
      'img[src*="cdn.midjourney"]',
    ];

    for (const selector of imageSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const src = el.currentSrc || el.src;
        // Skip icons and small thumbnails
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

    // Background-image based cards (Midjourney sometimes uses these)
    const bgSelectors = [
      '[class*="job-card"][style*="background-image"]',
      '[class*="image-card"][style*="background-image"]',
    ];

    for (const selector of bgSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const style = el.style.backgroundImage;
        const urlMatch = style?.match(/url\(["']?(.*?)["']?\)/);
        if (urlMatch?.[1] && urlMatch[1].startsWith("http")) {
          if (!outputs.some((o) => o.url === urlMatch[1])) {
            outputs.push({
              type: "image",
              url: urlMatch[1],
              thumbnailUrl: urlMatch[1],
              metadata: {},
            });
          }
        }
      });
    }

    return outputs;
  },
};

export default MidjourneyDetector;
