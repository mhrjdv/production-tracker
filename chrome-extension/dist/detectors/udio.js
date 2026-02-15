// Platform detector: Udio
// Last verified: 2026-02

const UdioDetector = {
  platform: "udio",
  displayName: "Udio",
  category: "music",
  urlPatterns: [
    /^https?:\/\/(www\.)?udio\.com/i,
    /^https?:\/\/app\.udio\.com/i,
  ],

  detect(url) {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  },

  extractPrompt(document) {
    // Udio accepts a text prompt describing the desired song and supports
    // a separate lyrics input and tag-based genre/style descriptors
    const selectors = [
      // Main prompt input
      'textarea[data-testid="prompt-input"]',
      'textarea[placeholder*="Describe" i]',
      'textarea[placeholder*="song" i]',
      'textarea[placeholder*="Create" i]',
      'textarea[aria-label*="prompt" i]',
      // Prompt with topic/description
      'textarea[data-testid="topic-input"]',
      'textarea[placeholder*="topic" i]',
      // Contenteditable prompt areas
      '[contenteditable="true"][data-testid="prompt-input"]',
      '[contenteditable="true"][class*="prompt"]',
      '[contenteditable="true"][data-placeholder*="Describe" i]',
      // Generic prompt containers
      '[class*="prompt-input"] textarea',
      '[class*="PromptInput"] textarea',
      '[class*="create-prompt"] textarea',
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

    // Custom lyrics field
    const lyricsSelectors = [
      'textarea[data-testid="lyrics-input"]',
      'textarea[placeholder*="lyrics" i]',
      'textarea[aria-label*="lyrics" i]',
      '[class*="lyrics-input"] textarea',
      '[class*="LyricsEditor"] textarea',
      '[class*="lyrics-editor"] textarea',
    ];

    for (const selector of lyricsSelectors) {
      const el = document.querySelector(selector);
      if (!el) continue;

      const text =
        el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();

      if (text && text.length > 2) {
        return { prompt: text, negativePrompt: null };
      }
    }

    // Track detail page: displayed prompt
    const detailSelectors = [
      '[data-testid="track-prompt"]',
      '[data-testid="track-description"]',
      '[class*="track-prompt"]',
      '[class*="TrackPrompt"]',
      '[class*="song-description"]',
      '[class*="track-info"] [class*="prompt"]',
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

    // Model version
    const modelSelectors = [
      '[data-testid="model-selector"]',
      '[class*="model-selector"]',
      '[class*="ModelSelector"]',
      '[class*="version-badge"]',
      '[aria-label*="model" i]',
    ];

    for (const selector of modelSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.modelName = el.textContent.trim();
        break;
      }
    }

    // Genre / style tags
    const tagSelectors = [
      '[data-testid="genre-tags"]',
      '[class*="genre-tag"]',
      '[class*="style-tag"]',
      '[class*="TagInput"] [class*="tag"]',
      '[class*="genre-chips"] [class*="chip"]',
      '[class*="tag-list"] [class*="tag"]',
    ];

    const tags = [];
    for (const selector of tagSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const text = el.textContent?.trim();
        if (text) tags.push(text);
      });
      if (tags.length > 0) break;
    }

    if (tags.length > 0) {
      settings.tags = tags;
    }

    // Instrumental toggle
    const instrumentalSelectors = [
      'input[data-testid="instrumental-toggle"]',
      '[class*="instrumental"] input[type="checkbox"]',
      '[aria-label*="instrumental" i]',
      'button[data-testid="instrumental-toggle"]',
      '[class*="instrumental"] [role="switch"]',
    ];

    for (const selector of instrumentalSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        settings.instrumental =
          el.checked ||
          el.getAttribute("aria-checked") === "true" ||
          el.getAttribute("aria-pressed") === "true";
        break;
      }
    }

    // Quality / generation mode
    const qualitySelectors = [
      '[data-testid="quality-selector"]',
      '[class*="quality-selector"]',
      '[aria-label*="quality" i]',
    ];

    for (const selector of qualitySelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.quality = el.textContent.trim();
        break;
      }
    }

    // Song title
    const titleSelectors = [
      'input[data-testid="title-input"]',
      'input[placeholder*="title" i]',
      'input[aria-label*="title" i]',
      '[class*="title-input"] input',
    ];

    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el?.value?.trim()) {
        settings.title = el.value.trim();
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

    // Audio player elements
    const audioSelectors = [
      '[data-testid="track-player"] audio',
      '[data-testid="audio-player"] audio',
      '[class*="audio-player"] audio',
      '[class*="AudioPlayer"] audio',
      '[class*="track-player"] audio',
      '[class*="TrackPlayer"] audio',
      '[class*="song-player"] audio',
      'audio[src*="udio"]',
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

    // Cover art images
    const coverSelectors = [
      '[data-testid="track-cover"] img',
      '[class*="track-cover"] img',
      '[class*="TrackCover"] img',
      '[class*="cover-art"] img',
      '[class*="album-art"] img',
      '[class*="song-image"] img',
      'img[src*="udio"][class*="cover"]',
    ];

    for (const selector of coverSelectors) {
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
                role: "cover-art",
              },
            });
          }
        }
      });
    }

    // Download links
    const downloadSelectors = [
      'a[download][href*="udio"]',
      'a[data-testid="download-button"]',
      'a[data-testid="download-audio"]',
      'button[data-testid="download-button"]',
    ];

    for (const selector of downloadSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const href = el.href || el.getAttribute("data-url");
        if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
          outputs.push({
            type: "audio",
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
      '[class*="track-player"] audio[src^="blob:"]',
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

export default UdioDetector;
