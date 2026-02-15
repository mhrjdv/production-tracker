// Platform detector: ElevenLabs
// Last verified: 2026-02

const ElevenLabsDetector = {
  platform: "elevenlabs",
  displayName: "ElevenLabs",
  category: "audio",
  urlPatterns: [
    /^https?:\/\/(www\.)?elevenlabs\.io/i,
    /^https?:\/\/beta\.elevenlabs\.io/i,
  ],

  detect(url) {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  },

  extractPrompt(document) {
    // ElevenLabs has multiple generation modes:
    // - Text-to-Speech: the text input is the prompt
    // - Sound Effects: a text description prompt
    // - AI Music (via text): a text description prompt
    const selectors = [
      // Sound Effects / Music prompt input
      'textarea[data-testid="prompt-input"]',
      'textarea[placeholder*="Describe" i]',
      'textarea[placeholder*="sound" i]',
      'textarea[placeholder*="effect" i]',
      'textarea[aria-label*="prompt" i]',
      // Text-to-Speech text input
      'textarea[data-testid="tts-input"]',
      'textarea[data-testid="text-input"]',
      'textarea[placeholder*="Enter text" i]',
      'textarea[placeholder*="Type or paste" i]',
      'textarea[aria-label*="text to speech" i]',
      '[data-testid="synthesis-input"] textarea',
      // Contenteditable editors (rich text TTS input)
      '[contenteditable="true"][data-testid="text-input"]',
      '[contenteditable="true"][class*="text-input"]',
      '[contenteditable="true"][role="textbox"]',
      // Fallback: prominent textarea
      '[class*="prompt-editor"] textarea',
      '[class*="PromptInput"] textarea',
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

    // History / generation result displayed prompt
    const historySelectors = [
      '[data-testid="history-item-text"]',
      '[class*="history-item"] [class*="text"]',
      '[class*="GenerationCard"] [class*="prompt"]',
      '[class*="generation-text"]',
    ];

    for (const selector of historySelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return { prompt: el.textContent.trim(), negativePrompt: null };
      }
    }

    return null;
  },

  extractSettings(document) {
    const settings = {};

    // Voice selector (for TTS)
    const voiceSelectors = [
      '[data-testid="voice-selector"]',
      '[data-testid="selected-voice"]',
      '[class*="voice-selector"]',
      '[class*="VoiceSelector"]',
      '[class*="voice-name"]',
      '[aria-label*="voice" i]',
      'button[class*="voice-picker"]',
    ];

    for (const selector of voiceSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.voiceName = el.textContent.trim();
        break;
      }
    }

    // Model selector (Multilingual v2, Turbo v2.5, etc.)
    const modelSelectors = [
      '[data-testid="model-selector"]',
      '[class*="model-select"]',
      '[class*="ModelSelector"]',
      'select[aria-label*="model" i]',
      '[aria-label*="model" i]',
      '[class*="model-name"]',
    ];

    for (const selector of modelSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        settings.modelName = el.textContent.trim();
        break;
      }
    }

    // Stability slider
    const stabilitySelectors = [
      'input[data-testid="stability-slider"]',
      'input[aria-label*="stability" i]',
      '[class*="stability-slider"] input[type="range"]',
      '[data-testid="stability"] input',
    ];

    for (const selector of stabilitySelectors) {
      const el = document.querySelector(selector);
      if (el?.value) {
        settings.stability = parseFloat(el.value);
        break;
      }
    }

    // Similarity / Clarity + Similarity Enhancement slider
    const similaritySelectors = [
      'input[data-testid="similarity-slider"]',
      'input[aria-label*="similarity" i]',
      'input[aria-label*="clarity" i]',
      '[class*="similarity-slider"] input[type="range"]',
      '[data-testid="similarity"] input',
    ];

    for (const selector of similaritySelectors) {
      const el = document.querySelector(selector);
      if (el?.value) {
        settings.similarity = parseFloat(el.value);
        break;
      }
    }

    // Style exaggeration slider
    const styleSelectors = [
      'input[data-testid="style-slider"]',
      'input[aria-label*="style" i]',
      '[class*="style-exaggeration"] input[type="range"]',
      '[data-testid="style-exaggeration"] input',
    ];

    for (const selector of styleSelectors) {
      const el = document.querySelector(selector);
      if (el?.value) {
        settings.styleExaggeration = parseFloat(el.value);
        break;
      }
    }

    // Speaker boost toggle
    const boostSelectors = [
      'input[data-testid="speaker-boost"]',
      '[class*="speaker-boost"] input[type="checkbox"]',
      '[aria-label*="speaker boost" i]',
    ];

    for (const selector of boostSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        settings.speakerBoost = el.checked || el.getAttribute("aria-checked") === "true";
        break;
      }
    }

    // Output format
    const formatSelectors = [
      '[data-testid="output-format"]',
      'select[aria-label*="format" i]',
      '[class*="format-selector"]',
    ];

    for (const selector of formatSelectors) {
      const el = document.querySelector(selector);
      if (el?.value || el?.textContent?.trim()) {
        settings.outputFormat = el.value || el.textContent.trim();
        break;
      }
    }

    // Sound effect duration (for SFX mode)
    const durationSelectors = [
      'input[data-testid="duration-input"]',
      'input[aria-label*="duration" i]',
      '[class*="duration-control"] input',
      '[data-testid="duration-slider"] input',
    ];

    for (const selector of durationSelectors) {
      const el = document.querySelector(selector);
      if (el?.value) {
        settings.duration = el.value;
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
      'audio[src*="elevenlabs"]',
      'audio[src*="api.elevenlabs"]',
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

    // HTML5 audio elements via source tags
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

    // Download links
    const downloadSelectors = [
      'a[download][href*="elevenlabs"]',
      'a[data-testid="download-audio"]',
      'a[data-testid="download-button"]',
      'button[data-testid="download-button"]',
      'a[href*="api.elevenlabs"][href*="download"]',
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

    // Blob URLs from active audio players (common in SPAs)
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

export default ElevenLabsDetector;
