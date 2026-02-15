// Platform detector: Stability AI (Stable Audio)
// Last verified: 2026-02

const StableAudioDetector = {
  platform: "stable-audio",
  displayName: "Stable Audio",
  category: "audio",
  urlPatterns: [
    /^https?:\/\/(www\.)?stableaudio\.com/i,
    /^https?:\/\/(www\.)?stability\.ai/i,
    /^https?:\/\/platform\.stability\.ai/i,
    /^https?:\/\/dreamstudio\.ai/i,
  ],

  detect(url) {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  },

  extractPrompt(document) {
    // Stable Audio uses a text prompt for audio generation and supports
    // a negative prompt to exclude unwanted characteristics
    const selectors = [
      // Primary prompt input
      'textarea[data-testid="prompt-input"]',
      'textarea[placeholder*="Describe" i]',
      'textarea[placeholder*="prompt" i]',
      'textarea[placeholder*="Enter a description" i]',
      'textarea[aria-label*="prompt" i]',
      // Generation prompt area
      '[data-testid="generation-prompt"] textarea',
      '[class*="prompt-input"] textarea',
      '[class*="PromptInput"] textarea',
      '[class*="PromptEditor"] textarea',
      // Contenteditable
      '[contenteditable="true"][data-testid="prompt-input"]',
      '[contenteditable="true"][class*="prompt"]',
      '[contenteditable="true"][data-placeholder*="Describe" i]',
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
      'input[placeholder*="Negative" i]',
    ];

    for (const selector of negSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const val =
          el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement
            ? el.value?.trim()
            : el.textContent?.trim();
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

    // Model selector (Stable Audio 2.0, etc.)
    const modelSelectors = [
      '[data-testid="model-selector"]',
      '[class*="model-selector"]',
      '[class*="ModelSelector"]',
      '[aria-label*="model" i]',
      'select[class*="model"]',
      '[class*="model-name"]',
    ];

    for (const selector of modelSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim() || el?.value) {
        settings.modelName = el.value || el.textContent.trim();
        break;
      }
    }

    // Duration control
    const durationSelectors = [
      'input[data-testid="duration-input"]',
      'input[data-testid="duration-slider"]',
      'input[aria-label*="duration" i]',
      '[class*="duration-control"] input',
      '[class*="DurationSlider"] input',
      'input[name="duration"]',
      '[data-testid="duration-selector"]',
    ];

    for (const selector of durationSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const val = el.value || el.getAttribute("aria-valuenow");
        if (val) {
          settings.duration = val;
          break;
        }
      }
    }

    // Also check for displayed duration text (e.g., "30s", "45 seconds")
    if (!settings.duration) {
      const durationTextSelectors = [
        '[class*="duration-display"]',
        '[class*="duration-value"]',
        '[data-testid="duration-value"]',
      ];

      for (const selector of durationTextSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          settings.duration = el.textContent.trim();
          break;
        }
      }
    }

    // Sample rate
    const sampleRateSelectors = [
      '[data-testid="sample-rate"]',
      'select[aria-label*="sample rate" i]',
      '[class*="sample-rate"] select',
    ];

    for (const selector of sampleRateSelectors) {
      const el = document.querySelector(selector);
      if (el?.value || el?.textContent?.trim()) {
        settings.sampleRate = el.value || el.textContent.trim();
        break;
      }
    }

    // Steps / inference steps
    const stepsSelectors = [
      'input[data-testid="steps-input"]',
      'input[aria-label*="steps" i]',
      '[class*="steps-slider"] input',
      '[data-testid="inference-steps"] input',
    ];

    for (const selector of stepsSelectors) {
      const el = document.querySelector(selector);
      if (el?.value) {
        settings.steps = parseInt(el.value, 10);
        break;
      }
    }

    // CFG / guidance scale
    const cfgSelectors = [
      'input[data-testid="cfg-input"]',
      'input[aria-label*="guidance" i]',
      'input[aria-label*="cfg" i]',
      '[class*="cfg-slider"] input',
      '[data-testid="guidance-scale"] input',
    ];

    for (const selector of cfgSelectors) {
      const el = document.querySelector(selector);
      if (el?.value) {
        settings.guidanceScale = parseFloat(el.value);
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

    // Number of results
    const countSelectors = [
      '[data-testid="num-results"]',
      'input[aria-label*="number" i]',
      '[class*="batch-size"] input',
    ];

    for (const selector of countSelectors) {
      const el = document.querySelector(selector);
      if (el?.value) {
        settings.batchSize = parseInt(el.value, 10);
        break;
      }
    }

    return Object.keys(settings).length > 0 ? settings : null;
  },

  extractOutputs(document) {
    const outputs = [];

    // Audio player elements
    const audioSelectors = [
      '[data-testid="audio-player"] audio',
      '[data-testid="generation-audio"] audio',
      '[class*="audio-player"] audio',
      '[class*="AudioPlayer"] audio',
      '[class*="generation-result"] audio',
      '[class*="OutputPlayer"] audio',
      'audio[src*="stability"]',
      'audio[src*="stableaudio"]',
      "audio[src]",
    ];

    for (const selector of audioSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const src = el.currentSrc || el.src || el.querySelector("source")?.src;
        if (src && src.startsWith("http")) {
          if (!outputs.some((o) => o.url === src)) {
            outputs.push({
              type: "audio",
              url: src,
              thumbnailUrl: null,
              metadata: {
                duration: el.duration || null,
              },
            });
          }
        }
      });
    }

    // Source tags inside audio elements
    const sourceElements = document.querySelectorAll("audio source[src]");
    sourceElements.forEach((el) => {
      const src = el.src;
      if (src && src.startsWith("http") && !outputs.some((o) => o.url === src)) {
        outputs.push({
          type: "audio",
          url: src,
          thumbnailUrl: null,
          metadata: {
            mimeType: el.type || null,
          },
        });
      }
    });

    // Waveform visualization elements (may contain data-url for the audio)
    const waveformSelectors = [
      '[data-testid="waveform"][data-src]',
      '[class*="waveform"][data-audio-src]',
      '[class*="Waveform"][data-src]',
    ];

    for (const selector of waveformSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const src = el.getAttribute("data-src") || el.getAttribute("data-audio-src");
        if (src && src.startsWith("http") && !outputs.some((o) => o.url === src)) {
          outputs.push({
            type: "audio",
            url: src,
            thumbnailUrl: null,
            metadata: {},
          });
        }
      });
    }

    // Image outputs (Stability AI also does image generation via DreamStudio)
    const imageSelectors = [
      '[data-testid="generated-image"] img',
      '[class*="generation-result"] img',
      '[class*="output-grid"] img',
      'img[src*="stability"]:not([class*="logo"]):not([class*="avatar"])',
      'img[src*="dreamstudio"]:not([class*="logo"])',
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
      'a[download][href*="stability"]',
      'a[download][href*="stableaudio"]',
      'a[data-testid="download-button"]',
      'a[data-testid="download-audio"]',
      'button[data-testid="download-button"]',
    ];

    for (const selector of downloadSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const href = el.href || el.getAttribute("data-url");
        if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
          const isAudio = /\.(mp3|wav|flac|ogg|aac|m4a)/i.test(href);
          const isImage = /\.(png|jpg|jpeg|webp)/i.test(href);
          outputs.push({
            type: isImage ? "image" : "audio",
            url: href,
            thumbnailUrl: null,
            metadata: {},
          });
        }
      });
    }

    // Blob URLs from active audio players
    const blobAudioSelectors = [
      'audio[src^="blob:"]',
      '[class*="audio-player"] audio[src^="blob:"]',
    ];

    for (const selector of blobAudioSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const src = el.currentSrc || el.src;
        if (src && src.startsWith("blob:")) {
          if (!outputs.some((o) => o.url === src)) {
            outputs.push({
              type: "audio",
              url: src,
              thumbnailUrl: null,
              metadata: {
                duration: el.duration || null,
                note: "blob-url-requires-page-context",
              },
            });
          }
        }
      });
    }

    return outputs;
  },
};

export default StableAudioDetector;
