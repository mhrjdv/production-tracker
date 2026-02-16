# Capture Algorithm and Platform Detectors

## Detection Pipeline

```
1. URL match → identify platform
2. DOM anchor check → confirm page state
3. Extract prompt + settings → structured metadata
4. Extract outputs → media URLs or fallback to screenshot
5. Hash check → identify new vs already-captured items
6. Render cards → preview + metadata in side panel
7. Save → enqueue sync payload
```

## Platform Detector Interface

Each detector implements:

```typescript
interface PlatformDetector {
  platform: string;           // e.g. "sora"
  urlPatterns: RegExp[];      // URL match patterns
  domAnchors: string[];       // Required DOM selectors to confirm page

  detect(url: string): boolean;
  extractPrompt(doc: Document): { prompt: string; negativePrompt?: string } | null;
  extractSettings(doc: Document): {
    modelName?: string;
    aspectRatio?: string;
    duration?: number;
    seed?: number;
    [key: string]: any;
  } | null;
  extractOutputs(doc: Document): {
    type: "image" | "video" | "audio";
    url: string;
    thumbnailUrl?: string;
    metadata?: Record<string, any>;
  }[];
  getDeepLink?(prompt: string, settings: Record<string, any>): string | null;
}
```

## Phase 1 Platform Detectors

### Sora (OpenAI)

```javascript
const soraDetector = {
  platform: "sora",
  urlPatterns: [
    /^https:\/\/sora\.com/,
    /^https:\/\/chat\.openai\.com.*sora/,
  ],
  domAnchors: [
    // Prompt input area
    'textarea[placeholder*="prompt"]',
    '[data-testid="prompt-input"]',
    // Output container
    '[data-testid="generation-output"]',
    '.generation-grid',
  ],

  extractPrompt(doc) {
    const textarea = doc.querySelector('textarea[placeholder*="prompt"]')
      || doc.querySelector('[data-testid="prompt-input"]');
    if (!textarea) return null;
    return { prompt: textarea.value || textarea.textContent };
  },

  extractSettings(doc) {
    // Look for model selector, aspect ratio, duration controls
    const settings = {};
    // Model name from dropdown or label
    const modelEl = doc.querySelector('[data-testid="model-selector"]');
    if (modelEl) settings.modelName = modelEl.textContent.trim();
    // Aspect ratio
    const arEl = doc.querySelector('[data-testid="aspect-ratio"]');
    if (arEl) settings.aspectRatio = arEl.textContent.trim();
    // Duration
    const durEl = doc.querySelector('[data-testid="duration"]');
    if (durEl) settings.duration = parseInt(durEl.textContent);
    return settings;
  },

  extractOutputs(doc) {
    const outputs = [];
    // Video outputs
    doc.querySelectorAll('video source, video[src]').forEach(el => {
      const url = el.src || el.getAttribute('src');
      if (url) outputs.push({ type: "video", url });
    });
    // Image outputs (stills/thumbnails)
    doc.querySelectorAll('.generation-grid img, [data-testid="output"] img').forEach(el => {
      const url = el.src;
      if (url && !url.includes('placeholder')) outputs.push({ type: "image", url });
    });
    return outputs;
  },
};
```

### Gemini / Veo (Google)

```javascript
const geminiVeoDetector = {
  platform: "gemini-veo",
  urlPatterns: [
    /^https:\/\/gemini\.google\.com/,
    /^https:\/\/aistudio\.google\.com/,
  ],
  domAnchors: [
    '.prompt-area',
    '[data-test-id="prompt-textarea"]',
  ],

  extractPrompt(doc) {
    const textarea = doc.querySelector('[data-test-id="prompt-textarea"]')
      || doc.querySelector('.prompt-area textarea');
    if (!textarea) return null;
    return { prompt: textarea.value || textarea.textContent };
  },

  extractSettings(doc) {
    const settings = { synthIdExpected: true }; // Google always adds SynthID
    const modelEl = doc.querySelector('[data-model-name]');
    if (modelEl) settings.modelName = modelEl.getAttribute('data-model-name');
    return settings;
  },

  extractOutputs(doc) {
    const outputs = [];
    // Images (Nano Banana / Imagen)
    doc.querySelectorAll('[data-generated-image] img, .generated-content img').forEach(el => {
      if (el.src) outputs.push({ type: "image", url: el.src });
    });
    // Videos (Veo)
    doc.querySelectorAll('[data-generated-video] video, .generated-content video').forEach(el => {
      const src = el.src || el.querySelector('source')?.src;
      if (src) outputs.push({ type: "video", url: src });
    });
    return outputs;
  },
};
```

### Freepik

```javascript
const freepikDetector = {
  platform: "freepik",
  urlPatterns: [
    /^https:\/\/(www\.)?freepik\.com\/pikaso/,
    /^https:\/\/(www\.)?freepik\.com\/ai/,
  ],
  domAnchors: [
    '.pikaso-canvas',
    '[data-testid="generation-prompt"]',
  ],

  extractPrompt(doc) {
    const textarea = doc.querySelector('[data-testid="generation-prompt"]')
      || doc.querySelector('.prompt-input textarea');
    if (!textarea) return null;
    return { prompt: textarea.value || textarea.textContent };
  },

  extractSettings(doc) {
    const settings = {};
    // Style selector
    const styleEl = doc.querySelector('[data-testid="style-selector"] .active');
    if (styleEl) settings.styleProfile = styleEl.textContent.trim();
    return settings;
  },

  extractOutputs(doc) {
    const outputs = [];
    doc.querySelectorAll('.generation-result img, .pikaso-output img').forEach(el => {
      if (el.src && !el.src.includes('placeholder')) {
        outputs.push({ type: "image", url: el.src });
      }
    });
    return outputs;
  },
};
```

## Hash-Based New Item Detection

```javascript
// Track captured items to avoid duplicates
const CAPTURED_HASHES_KEY = "lazer_captured_hashes";

async function isNewItem(url) {
  const hash = await sha256(url);
  const stored = await chrome.storage.local.get(CAPTURED_HASHES_KEY);
  const hashes = stored[CAPTURED_HASHES_KEY] || [];
  return !hashes.includes(hash);
}

async function markCaptured(url) {
  const hash = await sha256(url);
  const stored = await chrome.storage.local.get(CAPTURED_HASHES_KEY);
  const hashes = stored[CAPTURED_HASHES_KEY] || [];
  hashes.push(hash);
  // Keep last 1000 hashes to prevent unbounded growth
  if (hashes.length > 1000) hashes.splice(0, hashes.length - 1000);
  await chrome.storage.local.set({ [CAPTURED_HASHES_KEY]: hashes });
}
```

## Fallback Capture (When DOM Extraction Fails)

```javascript
async function fallbackCapture(tab) {
  // 1. Take visible tab screenshot
  const screenshot = await chrome.tabs.captureVisibleTab(null, {
    format: "png",
    quality: 80,
  });

  // 2. Return metadata-only version with screenshot as thumbnail
  return {
    type: "reference",
    url: null, // no direct media URL
    thumbnailUrl: screenshot, // base64 data URL
    metadata: {
      captureMethod: "screenshot-fallback",
      pageUrl: tab.url,
      pageTitle: tab.title,
      capturedAt: new Date().toISOString(),
    },
    isReferenceOnly: true,
  };
}
```

## Ingest Payload Shape

Sent to `POST /api/extension/ingest`:

```json
{
  "sceneId": "clx...",
  "shotId": "clx...",
  "platformKey": "sora",
  "platformLabel": "Sora",
  "assetType": "VIDEO",
  "title": "S001_SH001_v3",
  "prompt": "A vast desert landscape...",
  "negativePrompt": "",
  "modelName": "sora-2",
  "sourceUrl": "https://sora.com/g/abc123",
  "outputUrl": "https://...",
  "thumbnailUrl": "https://...",
  "metadata": {
    "aspectRatio": "16:9",
    "duration": 5,
    "seed": null
  },
  "provenance": {
    "platform": "sora",
    "captureMethod": "extension-dom",
    "captureTimestamp": "2026-02-14T10:30:00Z"
  },
  "promptPackageId": "clx...",
  "tags": ["take-3", "wide-shot"],
  "markAsSelected": false
}
```

## Detector Maintenance

Platform UIs change frequently. Each detector should:
- Use multiple fallback selectors (primary, secondary, tertiary)
- Fail gracefully (return null/empty when selectors don't match)
- Log extraction failures to extension console for debugging
- Include version comments for when selectors were last verified

When a detector breaks:
1. Open the platform, inspect updated DOM
2. Update selectors in the detector
3. Test with a real generation
4. Bump detector version comment
