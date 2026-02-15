// Platform detector: Suno
// Last verified: 2026-02

const SunoDetector = {
  platform: "suno",
  displayName: "Suno",
  category: "music",
  urlPatterns: [
    /^https?:\/\/(www\.)?suno\.com/i,
    /^https?:\/\/app\.suno\.ai/i,
    /^https?:\/\/(www\.)?suno\.ai/i,
  ],

  detect(url) {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  },

  extractPrompt(document) {
    // Suno has two modes:
    // - Simple: single text description prompt
    // - Custom: separate lyrics and style/genre prompt fields
    const selectors = [
      // Main song description prompt
      'textarea[data-testid="prompt-input"]',
      'textarea[placeholder*="song description" i]',
      'textarea[placeholder*="Describe" i]',
      'textarea[placeholder*="Make a song about" i]',
      'textarea[aria-label*="prompt" i]',
      'textarea[aria-label*="description" i]',
      // Custom mode: style of music prompt
      'textarea[data-testid="style-input"]',
      'textarea[placeholder*="style of music" i]',
      'textarea[aria-label*="style" i]',
      // Contenteditable prompt areas
      '[contenteditable="true"][data-testid="prompt-input"]',
      '[contenteditable="true"][class*="prompt"]',
      '[contenteditable="true"][data-placeholder*="song" i]',
      // Generic prompt area
      '[class*="prompt-input"] textarea',
      '[class*="PromptInput"] textarea',
      '[class*="create-input"] textarea',
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

    // Try to read lyrics field as prompt supplement
    const lyricsSelectors = [
      'textarea[data-testid="lyrics-input"]',
      'textarea[placeholder*="lyrics" i]',
      'textarea[aria-label*="lyrics" i]',
      '[class*="lyrics-input"] textarea',
      '[class*="LyricsInput"] textarea',
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

    // Song detail page: displayed prompt/description
    const detailSelectors = [
      '[data-testid="song-prompt"]',
      '[data-testid="song-description"]',
      '[class*="song-prompt"]',
      '[class*="SongPrompt"]',
      '[class*="song-description"]',
      '[class*="track-description"]',
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

    // Model version (Suno v3, v3.5, v4, etc.)
    const modelSelectors = [
      '[data-testid="model-selector"]',
      '[data-testid="version-selector"]',
      '[class*="model-selector"]',
      '[class*="ModelSelector"]',
      '[class*="version-badge"]',
      '[aria-label*="model" i]',
      '[aria-label*="version" i]',
    ];

    for (const selector of modelSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.modelName = el.textContent.trim();
        break;
      }
    }

    // Instrumental toggle (no vocals)
    const instrumentalSelectors = [
      'input[data-testid="instrumental-toggle"]',
      '[class*="instrumental-toggle"] input[type="checkbox"]',
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

    // Style / genre of music (custom mode)
    const styleSelectors = [
      'textarea[data-testid="style-input"]',
      'input[data-testid="style-input"]',
      'textarea[placeholder*="style of music" i]',
      'input[placeholder*="genre" i]',
      '[class*="style-input"] textarea',
      '[class*="genre-input"] input',
    ];

    for (const selector of styleSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const val =
          el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement
            ? el.value?.trim()
            : el.textContent?.trim();
        if (val) {
          settings.style = val;
          break;
        }
      }
    }

    // Song title (custom mode)
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

    // Custom mode toggle
    const customModeSelectors = [
      '[data-testid="custom-mode-toggle"]',
      'button[aria-label*="custom" i]',
      '[class*="custom-toggle"]',
      '[class*="mode-toggle"]',
    ];

    for (const selector of customModeSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        settings.customMode =
          el.getAttribute("aria-pressed") === "true" ||
          el.getAttribute("aria-checked") === "true" ||
          el.classList?.contains("active") ||
          false;
        break;
      }
    }

    return Object.keys(settings).length > 0 ? settings : null;
  },

  extractOutputs(document) {
    const outputs = [];

    // Audio player elements
    const audioSelectors = [
      '[data-testid="song-player"] audio',
      '[data-testid="audio-player"] audio',
      '[class*="audio-player"] audio',
      '[class*="AudioPlayer"] audio',
      '[class*="song-player"] audio',
      '[class*="SongPlayer"] audio',
      '[class*="track-player"] audio',
      'audio[src*="suno"]',
      'audio[src*="cdn"]',
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

    // Song cover art / album art (Suno generates cover art too)
    const coverSelectors = [
      '[data-testid="song-cover"] img',
      '[class*="song-cover"] img',
      '[class*="SongCover"] img',
      '[class*="cover-art"] img',
      '[class*="album-art"] img',
      '[class*="track-image"] img',
      'img[src*="suno"][class*="cover"]',
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

    // Video outputs (Suno sometimes generates music videos)
    const videoSelectors = [
      '[data-testid="song-video"] video',
      '[class*="song-video"] video',
      '[class*="music-video"] video',
      'video[src*="suno"]',
    ];

    for (const selector of videoSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const src = el.currentSrc || el.src || el.querySelector("source")?.src;
        if (src && src.startsWith("http")) {
          if (!outputs.some((o) => o.url === src)) {
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
        }
      });
    }

    // Download links
    const downloadSelectors = [
      'a[download][href*="suno"]',
      'a[data-testid="download-button"]',
      'a[data-testid="download-audio"]',
      'button[data-testid="download-button"]',
    ];

    for (const selector of downloadSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const href = el.href || el.getAttribute("data-url");
        if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
          const isVideo = /\.(mp4|webm|mov)/i.test(href);
          outputs.push({
            type: isVideo ? "video" : "audio",
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
      '[class*="song-player"] audio[src^="blob:"]',
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

export default SunoDetector;
