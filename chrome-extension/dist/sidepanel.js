"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // chrome-extension/src/crypto-utils.js
  async function getOrCreateEncryptionKey() {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(chrome.runtime.id + "-byok-encryption-v1"),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("laserman-byok-salt-v1"),
        iterations: 1e5,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }
  async function encryptString(plaintext) {
    const key = await getOrCreateEncryptionKey();
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(plaintext)
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  }
  async function decryptString(ciphertext) {
    try {
      const key = await getOrCreateEncryptionKey();
      const raw = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
      const iv = raw.slice(0, 12);
      const data = raw.slice(12);
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        data
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      return "";
    }
  }
  var init_crypto_utils = __esm({
    "chrome-extension/src/crypto-utils.js"() {
      "use strict";
    }
  });

  // chrome-extension/src/state.js
  var state_exports = {};
  __export(state_exports, {
    default: () => state_default
  });
  var state, state_default;
  var init_state = __esm({
    "chrome-extension/src/state.js"() {
      "use strict";
      state = {
        projects: [],
        scenes: [],
        platforms: [],
        sceneAssets: [],
        characters: [],
        currentTab: null,
        activeMode: "capture",
        configCache: null,
        lastPageContext: null,
        draftSaveTimer: null,
        settingsOpen: false,
        localQueueMirror: [],
        threadCandidates: [],
        candidatePickerOpen: false,
        reuseFilterType: "ALL",
        reuseSearchQuery: "",
        queueFilterType: "ALL",
        compareIds: [],
        compareOpen: false
      };
      state_default = state;
    }
  });

  // chrome-extension/src/config.js
  function normalizeBaseUrl(url) {
    return String(url || "").trim().replace(/\/+$/, "");
  }
  async function getConfig() {
    const data = await chrome.storage.local.get(CONFIG_KEY);
    const raw = data[CONFIG_KEY] || { ...DEFAULT_CONFIG };
    if (raw.openAiApiKey && raw._apiKeyEncrypted) {
      try {
        raw.openAiApiKey = await decryptString(raw.openAiApiKey);
      } catch {
        raw.openAiApiKey = "";
      }
    }
    const { _apiKeyEncrypted: _, ...clean } = raw;
    return clean;
  }
  async function saveConfig(partial) {
    const doSave = async () => {
      const stateModule = await Promise.resolve().then(() => (init_state(), state_exports));
      const state2 = stateModule.default;
      const current = state2.configCache || await getConfig();
      const merged = { ...current, ...partial };
      const storageClone = { ...merged };
      if (storageClone.openAiApiKey) {
        storageClone.openAiApiKey = await encryptString(
          storageClone.openAiApiKey
        );
        storageClone._apiKeyEncrypted = true;
      } else {
        storageClone._apiKeyEncrypted = false;
      }
      const { _apiKeyEncrypted: _, ...cacheClean } = merged;
      state2.configCache = cacheClean;
      await chrome.storage.local.set({ [CONFIG_KEY]: storageClone });
    };
    _saveConfigLock = _saveConfigLock.then(doSave, doSave);
    return _saveConfigLock;
  }
  var CONFIG_KEY, DEFAULT_CONFIG, _saveConfigLock;
  var init_config = __esm({
    "chrome-extension/src/config.js"() {
      "use strict";
      init_crypto_utils();
      CONFIG_KEY = "extensionConfig";
      DEFAULT_CONFIG = {
        baseUrl: "http://localhost:3000",
        token: "",
        openAiBaseUrl: "",
        openAiModel: "",
        openAiApiKey: "",
        lastProjectId: "",
        lastSceneId: "",
        lastPlatform: "",
        preferredAssetType: "IMAGE",
        preferredStatus: "DRAFT",
        lastCapture: null,
        captureHistory: [],
        sceneDrafts: {}
      };
      _saveConfigLock = Promise.resolve();
    }
  });

  // chrome-extension/src/api.js
  async function fetchApi(path, options = {}) {
    const config = state_default.configCache || await getConfig();
    const baseUrl = normalizeBaseUrl(config.baseUrl);
    const token = (config.token || "").trim();
    if (!baseUrl || !token) throw new Error("Missing API URL or token.");
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers || {}
      },
      ...options.body !== void 0 ? { body: JSON.stringify(options.body) } : {}
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${response.status})`);
    }
    return response.json();
  }
  async function updateAsset(assetId, data) {
    return fetchApi("/api/extension/asset-update", {
      method: "PATCH",
      body: { assetId, ...data }
    });
  }
  async function fetchCharacters(projectId) {
    const data = await fetchApi(
      `/api/extension/characters?projectId=${encodeURIComponent(projectId)}`
    );
    return data.characters || [];
  }
  async function syncProfile(preferences) {
    const config = state_default.configCache || await getConfig();
    if (!(config.token || "").trim()) return;
    await fetchApi("/api/extension/profile", {
      method: "PUT",
      body: { preferences }
    }).catch((err) => console.warn("[sidepanel] syncProfile:", err.message));
  }
  var init_api = __esm({
    "chrome-extension/src/api.js"() {
      "use strict";
      init_config();
      init_state();
    }
  });

  // chrome-extension/src/dom.js
  function setStatus(message, isError = false) {
    dom.statusText.textContent = message;
    dom.statusText.classList.toggle("error", isError);
    if (dom.statusDot) {
      dom.statusDot.classList.toggle("error", isError);
      dom.statusDot.classList.toggle("connected", !isError);
    }
  }
  function populateSelect(select, items, getValue, getLabel) {
    select.innerHTML = "";
    items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = getValue(item);
      opt.textContent = getLabel(item);
      select.appendChild(opt);
    });
  }
  function setActiveMode(mode) {
    state_default.activeMode = mode;
    const buttons = dom.modeNav.querySelectorAll(".sp-tab");
    buttons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    document.querySelectorAll(".sp-main[data-panel]").forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.panel !== mode);
    });
  }
  function toggleSettings(forceOpen) {
    state_default.settingsOpen = forceOpen !== void 0 ? forceOpen : !state_default.settingsOpen;
    dom.settingsPanel.classList.toggle("hidden", !state_default.settingsOpen);
  }
  function updateDetectionBanner(platformName, assetType, confidence) {
    const banner = dom.ctxDetectionBanner;
    if (!banner) return;
    const hasDetection = platformName && platformName !== "--" && platformName !== "Unknown";
    banner.classList.toggle("detected", hasDetection);
    dom.ctxDetectedPlatform.textContent = hasDetection ? platformName : "No platform detected";
    if (dom.ctxDetectedType) {
      dom.ctxDetectedType.textContent = assetType && assetType !== "--" ? assetType : "";
    }
    if (dom.ctxDetectDot && typeof confidence === "number") {
      dom.ctxDetectDot.classList.remove("conf-high", "conf-medium", "conf-low");
      if (confidence >= 0.8) dom.ctxDetectDot.classList.add("conf-high");
      else if (confidence >= 0.5) dom.ctxDetectDot.classList.add("conf-medium");
      else dom.ctxDetectDot.classList.add("conf-low");
    }
  }
  var $, dom;
  var init_dom = __esm({
    "chrome-extension/src/dom.js"() {
      "use strict";
      init_state();
      $ = (id) => document.getElementById(id);
      dom = {
        // Settings
        settingsToggle: $("settingsToggle"),
        settingsPanel: $("settingsPanel"),
        settingsClose: $("settingsClose"),
        cfgBaseUrl: $("cfgBaseUrl"),
        cfgToken: $("cfgToken"),
        cfgOpenAiBaseUrl: $("cfgOpenAiBaseUrl"),
        cfgOpenAiModel: $("cfgOpenAiModel"),
        cfgOpenAiApiKey: $("cfgOpenAiApiKey"),
        cfgSave: $("cfgSave"),
        cfgReload: $("cfgReload"),
        // Mode nav
        modeNav: $("modeNav"),
        // Auth gate
        authGate: $("authGate"),
        authBaseUrl: $("authBaseUrl"),
        authToken: $("authToken"),
        authOpenAiBaseUrl: $("authOpenAiBaseUrl"),
        authOpenAiModel: $("authOpenAiModel"),
        authOpenAiApiKey: $("authOpenAiApiKey"),
        authConnect: $("authConnect"),
        // Context (now inside capture panel)
        panelContext: $("panelContext"),
        ctxProjectSelect: $("ctxProjectSelect"),
        ctxSceneSelect: $("ctxSceneSelect"),
        ctxSceneSearch: $("ctxSceneSearch"),
        ctxShotCard: $("ctxShotCard"),
        ctxDetectedPlatform: $("ctxDetectedPlatform"),
        ctxDetectedType: $("ctxDetectedType"),
        ctxRefreshDetect: $("ctxRefreshDetect"),
        ctxIntentBox: $("ctxIntentBox"),
        ctxIntentText: $("ctxIntentText"),
        ctxIntentActions: $("ctxIntentActions"),
        ctxDetectionBanner: $("ctxDetectionBanner"),
        ctxDetectDot: $("ctxDetectDot"),
        ctxCharactersList: $("ctxCharactersList"),
        // Candidate picker
        candidatePicker: $("candidatePicker"),
        candidateList: $("candidateList"),
        candidatePickerClose: $("candidatePickerClose"),
        capPickThread: $("capPickThread"),
        capAiAssist: $("capAiAssist"),
        // Capture panel
        panelCapture: $("panelCapture"),
        capContextBar: $("capContextBar"),
        capContextLabel: $("capContextLabel"),
        capPlatformSelect: $("capPlatformSelect"),
        capAssetType: $("capAssetType"),
        capAssetStatus: $("capAssetStatus"),
        capTitle: $("capTitle"),
        capPrompt: $("capPrompt"),
        capNegPrompt: $("capNegPrompt"),
        capModelName: $("capModelName"),
        capExternalId: $("capExternalId"),
        capSourceUrl: $("capSourceUrl"),
        capOutputUrl: $("capOutputUrl"),
        capThumbUrl: $("capThumbUrl"),
        capTags: $("capTags"),
        capMetadata: $("capMetadata"),
        capNotes: $("capNotes"),
        capAutoFill: $("capAutoFill"),
        capApplyPrompt: $("capApplyPrompt"),
        capRefinePrompt: $("capRefinePrompt"),
        capSave: $("capSave"),
        capClearAll: $("capClearAll"),
        // Reuse panel
        panelReuse: $("panelReuse"),
        reuseAssetList: $("reuseAssetList"),
        reuseRestoreDraft: $("reuseRestoreDraft"),
        reuseClearDraft: $("reuseClearDraft"),
        reuseSearch: $("reuseSearch"),
        reuseFilterChips: $("reuseFilterChips"),
        // Queue panel
        panelQueue: $("panelQueue"),
        queueCount: $("queueCount"),
        queueList: $("queueList"),
        queueSyncNow: $("queueSyncNow"),
        queueClearFailed: $("queueClearFailed"),
        queuePreviewList: $("queuePreviewList"),
        queueFilterChips: $("queueFilterChips"),
        // Compare
        compareBar: $("compareBar"),
        compareBtn: $("compareBtn"),
        compareClear: $("compareClear"),
        compareCount: $("compareCount"),
        compareOverlay: $("compareOverlay"),
        compareGrid: $("compareGrid"),
        compareClose: $("compareClose"),
        // Status bar
        statusText: $("statusText"),
        statusDot: $("statusDot")
      };
    }
  });

  // chrome-extension/detectors/sora.js
  var SoraDetector, sora_default;
  var init_sora = __esm({
    "chrome-extension/detectors/sora.js"() {
      "use strict";
      SoraDetector = {
        platform: "openai-sora",
        displayName: "OpenAI Sora",
        category: "multi",
        urlPatterns: [
          /^https?:\/\/(www\.)?sora\.com/i,
          /^https?:\/\/sora\.chatgpt\.com/i,
          /^https?:\/\/chat\.openai\.com\/.*sora/i,
          /^https?:\/\/chatgpt\.com\/.*sora/i
        ],
        detect(url) {
          return this.urlPatterns.some((pattern) => pattern.test(url));
        },
        extractPrompt(document2) {
          const selectors = [
            // Main prompt textarea in Sora creation view
            'textarea[data-testid="sora-prompt-input"]',
            'textarea[placeholder*="Describe" i]',
            'textarea[placeholder*="prompt" i]',
            'textarea[aria-label*="prompt" i]',
            // Chat-based Sora interface via ChatGPT
            'div[data-testid="prompt-textarea"] textarea',
            "#prompt-textarea",
            'textarea[data-testid="prompt-textarea"]',
            // Contenteditable variants
            '[contenteditable="true"][data-placeholder*="Describe" i]',
            '[contenteditable="true"][data-testid="prompt-textarea"]',
            // Fallback: any visible textarea with substantial content
            "textarea"
          ];
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt: null };
            }
          }
          const promptDisplaySelectors = [
            '[data-testid="generation-prompt"]',
            ".generation-prompt",
            '[class*="prompt-text"]',
            '[class*="PromptDisplay"]'
          ];
          for (const selector of promptDisplaySelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              return { prompt: el.textContent.trim(), negativePrompt: null };
            }
          }
          return null;
        },
        extractSettings(document2) {
          const settings = {};
          const modelSelectors = [
            '[data-testid="model-selector"]',
            '[data-testid="model-badge"]',
            '[class*="model-name"]',
            '[class*="ModelSelector"]',
            '[aria-label*="model" i]'
          ];
          for (const selector of modelSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.modelName = el.textContent.trim();
              break;
            }
          }
          const ratioSelectors = [
            '[data-testid="aspect-ratio"]',
            '[class*="aspect-ratio"]',
            '[class*="AspectRatio"]',
            '[aria-label*="aspect" i]',
            'button[class*="ratio"][aria-pressed="true"]'
          ];
          for (const selector of ratioSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.aspectRatio = el.textContent.trim();
              break;
            }
          }
          const durationSelectors = [
            '[data-testid="duration-selector"]',
            '[class*="duration"]',
            '[aria-label*="duration" i]',
            'input[type="range"][aria-label*="duration" i]'
          ];
          for (const selector of durationSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              const val = el.value || el.textContent?.trim() || el.getAttribute("aria-valuenow");
              if (val) {
                settings.duration = val;
                break;
              }
            }
          }
          const resSelectors = [
            '[data-testid="resolution-selector"]',
            '[class*="resolution"]',
            'select[aria-label*="resolution" i]'
          ];
          for (const selector of resSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim() || el?.value) {
              settings.resolution = el.value || el.textContent.trim();
              break;
            }
          }
          return Object.keys(settings).length > 0 ? settings : null;
        },
        extractOutputs(document2) {
          const outputs = [];
          const videoSelectors = [
            'video[data-testid="sora-output"]',
            'video[data-testid="generation-video"]',
            '[class*="generation-result"] video',
            '[class*="VideoPlayer"] video',
            '[class*="output-container"] video',
            'video[src*="oaiusercontent"]',
            "video[src]"
          ];
          for (const selector of videoSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const src = el.currentSrc || el.src || el.querySelector("source")?.src;
              if (src && src.startsWith("http")) {
                outputs.push({
                  type: "video",
                  url: src,
                  thumbnailUrl: el.poster || null,
                  metadata: {
                    duration: el.duration || null,
                    width: el.videoWidth || null,
                    height: el.videoHeight || null
                  }
                });
              }
            });
          }
          const imageSelectors = [
            'img[data-testid="sora-output"]',
            'img[data-testid="generation-image"]',
            '[class*="generation-result"] img',
            '[class*="output-container"] img:not([class*="avatar"])',
            'img[src*="oaiusercontent"]'
          ];
          for (const selector of imageSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const src = el.currentSrc || el.src;
              if (src && src.startsWith("http") && !outputs.some((o) => o.url === src)) {
                outputs.push({
                  type: "image",
                  url: src,
                  thumbnailUrl: src,
                  metadata: {
                    width: el.naturalWidth || null,
                    height: el.naturalHeight || null
                  }
                });
              }
            });
          }
          const downloadSelectors = [
            'a[download][href*="oaiusercontent"]',
            'a[data-testid="download-button"]',
            'button[data-testid="download"]'
          ];
          for (const selector of downloadSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const href = el.href || el.getAttribute("data-url");
              if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
                const isVideo = /\.(mp4|webm|mov)/i.test(href);
                outputs.push({
                  type: isVideo ? "video" : "image",
                  url: href,
                  thumbnailUrl: null,
                  metadata: {}
                });
              }
            });
          }
          return outputs;
        }
      };
      sora_default = SoraDetector;
    }
  });

  // chrome-extension/detectors/gemini-veo.js
  var GeminiVeoDetector, gemini_veo_default;
  var init_gemini_veo = __esm({
    "chrome-extension/detectors/gemini-veo.js"() {
      "use strict";
      GeminiVeoDetector = {
        platform: "google-veo",
        displayName: "Google Gemini / Veo",
        category: "multi",
        urlPatterns: [
          /^https?:\/\/gemini\.google\.com/i,
          /^https?:\/\/aistudio\.google\.com/i,
          /^https?:\/\/deepmind\.google.*veo/i,
          /^https?:\/\/labs\.google.*video/i
        ],
        detect(url) {
          return this.urlPatterns.some((pattern) => pattern.test(url));
        },
        extractPrompt(document2) {
          const selectors = [
            // Gemini main chat prompt area
            'div.ql-editor[contenteditable="true"]',
            '[data-testid="text-input-field"]',
            "rich-textarea textarea",
            'textarea[aria-label*="Enter a prompt" i]',
            'textarea[aria-label*="Type something" i]',
            'textarea[placeholder*="Enter a prompt" i]',
            // AI Studio prompt editor
            'textarea[aria-label*="prompt" i]',
            ".prompt-input textarea",
            '[data-testid="prompt-textarea"]',
            // Contenteditable fallback
            '[contenteditable="true"][aria-label*="prompt" i]',
            '[contenteditable="true"][data-placeholder*="Enter" i]',
            // General fallbacks
            ".input-area textarea",
            "textarea.text-input"
          ];
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt: null };
            }
          }
          const chatMessageSelectors = [
            '[data-testid="user-message"]:last-of-type',
            ".user-message:last-of-type",
            '.conversation-turn[data-role="user"]:last-of-type',
            'message-content[data-author="user"]:last-of-type'
          ];
          for (const selector of chatMessageSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              return { prompt: el.textContent.trim(), negativePrompt: null };
            }
          }
          return null;
        },
        extractSettings(document2) {
          const settings = {};
          const modelSelectors = [
            '[data-testid="model-selector"]',
            'button[aria-label*="model" i]',
            '[class*="model-selector"]',
            '[class*="ModelPicker"]',
            'mat-select[aria-label*="model" i]',
            ".model-dropdown"
          ];
          for (const selector of modelSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.modelName = el.textContent.trim();
              break;
            }
          }
          const tempSelectors = [
            'input[aria-label*="Temperature" i]',
            '[data-testid="temperature-slider"]',
            'input[type="range"][class*="temperature" i]'
          ];
          for (const selector of tempSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.temperature = parseFloat(el.value);
              break;
            }
          }
          const ratioSelectors = [
            '[data-testid="aspect-ratio-selector"]',
            '[aria-label*="aspect ratio" i]',
            'button[class*="aspect"][aria-pressed="true"]',
            '[class*="ratio-option"][class*="selected"]'
          ];
          for (const selector of ratioSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.aspectRatio = el.textContent.trim();
              break;
            }
          }
          const durationSelectors = [
            '[data-testid="duration-control"]',
            '[aria-label*="duration" i]',
            'input[type="range"][class*="duration"]'
          ];
          for (const selector of durationSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              settings.duration = el.value || el.textContent?.trim() || el.getAttribute("aria-valuenow");
              break;
            }
          }
          return Object.keys(settings).length > 0 ? settings : null;
        },
        extractOutputs(document2) {
          const outputs = [];
          const videoSelectors = [
            '[data-testid="generated-video"] video',
            '[class*="video-result"] video',
            '[class*="generation-output"] video',
            '[class*="media-container"] video',
            'video[src*="googleusercontent"]',
            'video[src*="storage.googleapis"]',
            "video[src]"
          ];
          for (const selector of videoSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const src = el.currentSrc || el.src || el.querySelector("source")?.src;
              if (src && src.startsWith("http")) {
                outputs.push({
                  type: "video",
                  url: src,
                  thumbnailUrl: el.poster || null,
                  metadata: {
                    duration: el.duration || null,
                    width: el.videoWidth || null,
                    height: el.videoHeight || null
                  }
                });
              }
            });
          }
          const imageSelectors = [
            '[data-testid="generated-image"] img',
            '[class*="image-result"] img',
            '[class*="generation-output"] img',
            '[class*="media-container"] img:not([class*="avatar"])',
            'img[src*="googleusercontent"]:not([width="24"]):not([width="32"])',
            'img[src*="storage.googleapis"]:not([class*="icon"])'
          ];
          for (const selector of imageSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      height: el.naturalHeight || null
                    }
                  });
                }
              }
            });
          }
          const downloadSelectors = [
            'a[download][href*="googleapis"]',
            'a[download][href*="googleusercontent"]',
            'button[aria-label*="Download" i]'
          ];
          for (const selector of downloadSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const href = el.href || el.getAttribute("data-url");
              if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
                const isVideo = /\.(mp4|webm|mov)/i.test(href) || href.includes("video");
                outputs.push({
                  type: isVideo ? "video" : "image",
                  url: href,
                  thumbnailUrl: null,
                  metadata: {}
                });
              }
            });
          }
          return outputs;
        }
      };
      gemini_veo_default = GeminiVeoDetector;
    }
  });

  // chrome-extension/detectors/freepik.js
  var FreepikDetector, freepik_default;
  var init_freepik = __esm({
    "chrome-extension/detectors/freepik.js"() {
      "use strict";
      FreepikDetector = {
        platform: "freepik-ai",
        displayName: "Freepik Pikaso",
        category: "image",
        urlPatterns: [
          /^https?:\/\/(www\.)?freepik\.com\/pikaso/i,
          /^https?:\/\/(www\.)?freepik\.com\/ai\//i,
          /^https?:\/\/(www\.)?freepik\.com\/.*image-generator/i,
          /^https?:\/\/(www\.)?freepik\.com\/.*ai-image/i
        ],
        detect(url) {
          return this.urlPatterns.some((pattern) => pattern.test(url));
        },
        extractPrompt(document2) {
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
            'textarea[aria-label*="prompt" i]'
          ];
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt: null };
            }
          }
          let negativePrompt = null;
          const negSelectors = [
            'textarea[data-testid="negative-prompt"]',
            'textarea[placeholder*="Negative" i]',
            'textarea[name="negative_prompt"]',
            '[class*="negative-prompt"] textarea'
          ];
          for (const selector of negSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              const val = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
              if (val) {
                negativePrompt = val;
                break;
              }
            }
          }
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt };
            }
          }
          return null;
        },
        extractSettings(document2) {
          const settings = {};
          const styleSelectors = [
            '[data-testid="style-selector"] [aria-pressed="true"]',
            '[class*="style-option"][class*="active"]',
            '[class*="StyleSelector"] [class*="selected"]',
            '[class*="style-chip"][class*="active"]'
          ];
          for (const selector of styleSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.style = el.textContent.trim();
              break;
            }
          }
          const ratioSelectors = [
            '[data-testid="aspect-ratio"] [aria-pressed="true"]',
            '[class*="aspect-ratio"][class*="selected"]',
            'button[class*="ratio"][aria-pressed="true"]',
            '[class*="size-option"][class*="active"]'
          ];
          for (const selector of ratioSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.aspectRatio = el.textContent.trim();
              break;
            }
          }
          const modelSelectors = [
            '[data-testid="model-selector"]',
            '[class*="model-dropdown"]',
            '[aria-label*="model" i]'
          ];
          for (const selector of modelSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.modelName = el.textContent.trim();
              break;
            }
          }
          const countSelectors = [
            '[data-testid="image-count"]',
            'input[aria-label*="number of images" i]',
            '[class*="image-count"] input'
          ];
          for (const selector of countSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.imageCount = parseInt(el.value, 10);
              break;
            }
          }
          return Object.keys(settings).length > 0 ? settings : null;
        },
        extractOutputs(document2) {
          const outputs = [];
          const imageSelectors = [
            '[data-testid="generated-image"] img',
            '[class*="result-image"] img',
            '[class*="GeneratedImage"] img',
            '[class*="output-grid"] img',
            '[class*="gallery-item"] img',
            '[class*="pikaso-result"] img',
            'img[src*="img.freepik.com"]',
            'img[src*="freepik.com/ai/"]'
          ];
          for (const selector of imageSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      alt: el.alt || null
                    }
                  });
                }
              }
            });
          }
          const downloadSelectors = [
            'a[download][href*="freepik"]',
            'a[data-testid="download-button"]',
            'button[aria-label*="Download" i]'
          ];
          for (const selector of downloadSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const href = el.href || el.getAttribute("data-url");
              if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
                outputs.push({
                  type: "image",
                  url: href,
                  thumbnailUrl: null,
                  metadata: {}
                });
              }
            });
          }
          return outputs;
        }
      };
      freepik_default = FreepikDetector;
    }
  });

  // chrome-extension/detectors/midjourney.js
  var MidjourneyDetector, midjourney_default;
  var init_midjourney = __esm({
    "chrome-extension/detectors/midjourney.js"() {
      "use strict";
      MidjourneyDetector = {
        platform: "midjourney",
        displayName: "Midjourney",
        category: "image",
        urlPatterns: [
          /^https?:\/\/(www\.)?midjourney\.com/i,
          /^https?:\/\/alpha\.midjourney\.com/i
        ],
        detect(url) {
          return this.urlPatterns.some((pattern) => pattern.test(url));
        },
        extractPrompt(document2) {
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
            '[class*="PromptText"]'
          ];
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              const paramMatch = text.match(/^(.*?)\s*(--\w+.*)?$/s);
              const prompt = paramMatch ? paramMatch[1].trim() : text;
              return { prompt, negativePrompt: null };
            }
          }
          const jobCardSelectors = [
            '[class*="job-card"]:last-of-type [class*="prompt"]',
            '[data-testid="job-card"]:last-of-type [data-testid="prompt"]',
            '[class*="TaskCard"] [class*="prompt"]'
          ];
          for (const selector of jobCardSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              return { prompt: el.textContent.trim(), negativePrompt: null };
            }
          }
          return null;
        },
        extractSettings(document2) {
          const settings = {};
          const promptEl = document2.querySelector('[data-testid="prompt-input"]') || document2.querySelector('[data-testid="job-prompt"]') || document2.querySelector('[class*="prompt-text"]');
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
          if (!settings.modelName) {
            const modelSelectors = [
              '[data-testid="model-selector"]',
              '[class*="version-selector"]',
              '[class*="ModelDropdown"]',
              '[aria-label*="model" i]'
            ];
            for (const selector of modelSelectors) {
              const el = document2.querySelector(selector);
              if (el?.textContent?.trim()) {
                settings.modelName = el.textContent.trim();
                break;
              }
            }
          }
          if (!settings.aspectRatio) {
            const ratioSelectors = [
              '[data-testid="aspect-ratio-selector"]',
              '[class*="aspect-ratio"][class*="selected"]',
              'button[class*="ratio"][aria-pressed="true"]'
            ];
            for (const selector of ratioSelectors) {
              const el = document2.querySelector(selector);
              if (el?.textContent?.trim()) {
                settings.aspectRatio = el.textContent.trim();
                break;
              }
            }
          }
          return Object.keys(settings).length > 0 ? settings : null;
        },
        extractOutputs(document2) {
          const outputs = [];
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
            'img[src*="cdn.midjourney"]'
          ];
          for (const selector of imageSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      alt: el.alt || null
                    }
                  });
                }
              }
            });
          }
          const bgSelectors = [
            '[class*="job-card"][style*="background-image"]',
            '[class*="image-card"][style*="background-image"]'
          ];
          for (const selector of bgSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const style = el.style.backgroundImage;
              const urlMatch = style?.match(/url\(["']?(.*?)["']?\)/);
              if (urlMatch?.[1] && urlMatch[1].startsWith("http")) {
                if (!outputs.some((o) => o.url === urlMatch[1])) {
                  outputs.push({
                    type: "image",
                    url: urlMatch[1],
                    thumbnailUrl: urlMatch[1],
                    metadata: {}
                  });
                }
              }
            });
          }
          return outputs;
        }
      };
      midjourney_default = MidjourneyDetector;
    }
  });

  // chrome-extension/detectors/runway.js
  var RunwayDetector, runway_default;
  var init_runway = __esm({
    "chrome-extension/detectors/runway.js"() {
      "use strict";
      RunwayDetector = {
        platform: "runway",
        displayName: "Runway",
        category: "video",
        urlPatterns: [
          /^https?:\/\/app\.runwayml\.com/i,
          /^https?:\/\/(www\.)?runwayml\.com/i,
          /^https?:\/\/runway\.com/i
        ],
        detect(url) {
          return this.urlPatterns.some((pattern) => pattern.test(url));
        },
        extractPrompt(document2) {
          const selectors = [
            // Gen-3/Gen-4 text prompt input
            'textarea[data-testid="prompt-input"]',
            'textarea[placeholder*="Describe" i]',
            'textarea[placeholder*="prompt" i]',
            'textarea[aria-label*="text prompt" i]',
            '[data-testid="generation-prompt"] textarea',
            // Contenteditable prompt areas
            '[contenteditable="true"][data-testid="prompt-editor"]',
            '[contenteditable="true"][class*="prompt"]',
            '[contenteditable="true"][aria-label*="prompt" i]',
            // Sidebar prompt display
            '[class*="prompt-text"]',
            '[class*="PromptEditor"] textarea',
            '[class*="PromptInput"] textarea'
          ];
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt: null };
            }
          }
          const historySelectors = [
            '[data-testid="generation-card"]:first-of-type [class*="prompt"]',
            '[class*="generation-item"]:first-of-type [class*="prompt"]',
            '[class*="HistoryCard"] [class*="prompt"]'
          ];
          for (const selector of historySelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              return { prompt: el.textContent.trim(), negativePrompt: null };
            }
          }
          return null;
        },
        extractSettings(document2) {
          const settings = {};
          const modelSelectors = [
            '[data-testid="model-selector"]',
            '[class*="model-selector"]',
            '[class*="ModelSelector"]',
            '[aria-label*="model" i]',
            'button[class*="model-picker"]',
            '[class*="model-badge"]'
          ];
          for (const selector of modelSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.modelName = el.textContent.trim();
              break;
            }
          }
          const durationSelectors = [
            '[data-testid="duration-slider"]',
            '[data-testid="duration-selector"]',
            'input[aria-label*="duration" i]',
            '[class*="duration-control"]',
            'select[class*="duration"]',
            '[class*="DurationSlider"] input'
          ];
          for (const selector of durationSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              const val = el.value || el.textContent?.trim() || el.getAttribute("aria-valuenow");
              if (val) {
                settings.duration = val;
                break;
              }
            }
          }
          const ratioSelectors = [
            '[data-testid="aspect-ratio"]',
            '[class*="aspect-ratio"]',
            'button[class*="ratio"][aria-pressed="true"]',
            '[class*="ResolutionSelector"]'
          ];
          for (const selector of ratioSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.aspectRatio = el.textContent.trim();
              break;
            }
          }
          const seedSelectors = [
            'input[data-testid="seed-input"]',
            'input[aria-label*="seed" i]',
            'input[name="seed"]'
          ];
          for (const selector of seedSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.seed = parseInt(el.value, 10);
              break;
            }
          }
          const motionSelectors = [
            '[data-testid="motion-amount"]',
            'input[aria-label*="motion" i]',
            '[class*="motion-slider"] input'
          ];
          for (const selector of motionSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.motionAmount = parseFloat(el.value);
              break;
            }
          }
          return Object.keys(settings).length > 0 ? settings : null;
        },
        extractOutputs(document2) {
          const outputs = [];
          const videoSelectors = [
            '[data-testid="generation-video"] video',
            '[data-testid="preview-video"] video',
            '[class*="video-player"] video',
            '[class*="VideoPlayer"] video',
            '[class*="generation-result"] video',
            '[class*="OutputPreview"] video',
            'video[src*="runwayml"]',
            'video[src*="runway"]',
            "video[src]"
          ];
          for (const selector of videoSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const src = el.currentSrc || el.src || el.querySelector("source")?.src;
              if (src && src.startsWith("http")) {
                outputs.push({
                  type: "video",
                  url: src,
                  thumbnailUrl: el.poster || null,
                  metadata: {
                    duration: el.duration || null,
                    width: el.videoWidth || null,
                    height: el.videoHeight || null
                  }
                });
              }
            });
          }
          const imageSelectors = [
            '[data-testid="output-image"] img',
            '[class*="generation-result"] img',
            '[class*="OutputPreview"] img',
            'img[src*="runwayml"]:not([class*="avatar"]):not([class*="icon"])'
          ];
          for (const selector of imageSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      height: el.naturalHeight || null
                    }
                  });
                }
              }
            });
          }
          const downloadSelectors = [
            'a[download][href*="runway"]',
            'a[data-testid="download-link"]',
            'button[data-testid="download-button"]'
          ];
          for (const selector of downloadSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const href = el.href || el.getAttribute("data-url");
              if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
                const isVideo = /\.(mp4|webm|mov)/i.test(href);
                outputs.push({
                  type: isVideo ? "video" : "image",
                  url: href,
                  thumbnailUrl: null,
                  metadata: {}
                });
              }
            });
          }
          return outputs;
        }
      };
      runway_default = RunwayDetector;
    }
  });

  // chrome-extension/detectors/kling.js
  var KlingDetector, kling_default;
  var init_kling = __esm({
    "chrome-extension/detectors/kling.js"() {
      "use strict";
      KlingDetector = {
        platform: "kling-ai",
        displayName: "Kling AI",
        category: "video",
        urlPatterns: [
          /^https?:\/\/(www\.)?klingai\.com/i,
          /^https?:\/\/app\.klingai\.com/i,
          /^https?:\/\/global\.klingai\.com/i
        ],
        detect(url) {
          return this.urlPatterns.some((pattern) => pattern.test(url));
        },
        extractPrompt(document2) {
          const selectors = [
            // Kling main prompt textarea
            'textarea[data-testid="prompt-input"]',
            'textarea[placeholder*="Describe" i]',
            'textarea[placeholder*="Enter your prompt" i]',
            'textarea[placeholder*="creative" i]',
            'textarea[class*="prompt"]',
            '[class*="prompt-input"] textarea',
            '[class*="PromptInput"] textarea',
            '[class*="prompt-editor"] textarea',
            // Contenteditable
            '[contenteditable="true"][class*="prompt"]',
            // Antd-style textarea (Kling uses React/Ant Design patterns)
            '.ant-input[placeholder*="prompt" i]',
            "textarea.ant-input"
          ];
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt: null };
            }
          }
          let negativePrompt = null;
          const negSelectors = [
            'textarea[placeholder*="Negative" i]',
            'textarea[data-testid="negative-prompt"]',
            '[class*="negative-prompt"] textarea',
            '[class*="NegativePrompt"] textarea'
          ];
          for (const selector of negSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              const val = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
              if (val) {
                negativePrompt = val;
                break;
              }
            }
          }
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt };
            }
          }
          return null;
        },
        extractSettings(document2) {
          const settings = {};
          const modelSelectors = [
            '[data-testid="model-selector"]',
            '[class*="model-select"]',
            '[class*="ModelSelector"]',
            '.ant-select[class*="model"]',
            '[aria-label*="model" i]',
            '[class*="version-tag"]'
          ];
          for (const selector of modelSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.modelName = el.textContent.trim();
              break;
            }
          }
          const durationSelectors = [
            '[data-testid="duration-selector"]',
            '[class*="duration"]',
            '.ant-slider[aria-label*="duration" i]',
            'input[aria-label*="duration" i]',
            '[class*="Duration"] [class*="value"]'
          ];
          for (const selector of durationSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              const val = el.value || el.textContent?.trim() || el.getAttribute("aria-valuenow");
              if (val) {
                settings.duration = val;
                break;
              }
            }
          }
          const ratioSelectors = [
            '[data-testid="ratio-selector"]',
            '[class*="aspect-ratio"][class*="active"]',
            '[class*="ratio-option"][class*="selected"]',
            'button[class*="ratio"][class*="active"]'
          ];
          for (const selector of ratioSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.aspectRatio = el.textContent.trim();
              break;
            }
          }
          const modeSelectors = [
            '[data-testid="mode-selector"]',
            '[class*="mode-select"][class*="active"]',
            '[class*="QualitySelector"] [class*="selected"]'
          ];
          for (const selector of modeSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.mode = el.textContent.trim();
              break;
            }
          }
          const cfgSelectors = [
            'input[aria-label*="CFG" i]',
            'input[aria-label*="creativity" i]',
            '[class*="cfg-scale"] input'
          ];
          for (const selector of cfgSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.cfgScale = parseFloat(el.value);
              break;
            }
          }
          return Object.keys(settings).length > 0 ? settings : null;
        },
        extractOutputs(document2) {
          const outputs = [];
          const videoSelectors = [
            '[data-testid="generation-video"] video',
            '[class*="video-result"] video',
            '[class*="VideoPlayer"] video',
            '[class*="result-card"] video',
            '[class*="generation-output"] video',
            'video[src*="klingai"]',
            "video[src]"
          ];
          for (const selector of videoSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const src = el.currentSrc || el.src || el.querySelector("source")?.src;
              if (src && src.startsWith("http")) {
                outputs.push({
                  type: "video",
                  url: src,
                  thumbnailUrl: el.poster || null,
                  metadata: {
                    duration: el.duration || null,
                    width: el.videoWidth || null,
                    height: el.videoHeight || null
                  }
                });
              }
            });
          }
          const imageSelectors = [
            '[data-testid="generation-image"] img',
            '[class*="result-card"] img',
            '[class*="generation-output"] img',
            'img[src*="klingai"]:not([class*="avatar"]):not([class*="icon"])'
          ];
          for (const selector of imageSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      height: el.naturalHeight || null
                    }
                  });
                }
              }
            });
          }
          const downloadSelectors = [
            'a[download][href*="klingai"]',
            'a[data-testid="download"]',
            'button[class*="download"]'
          ];
          for (const selector of downloadSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const href = el.href || el.getAttribute("data-url");
              if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
                const isVideo = /\.(mp4|webm|mov)/i.test(href);
                outputs.push({
                  type: isVideo ? "video" : "image",
                  url: href,
                  thumbnailUrl: null,
                  metadata: {}
                });
              }
            });
          }
          return outputs;
        }
      };
      kling_default = KlingDetector;
    }
  });

  // chrome-extension/detectors/luma.js
  var LumaDetector, luma_default;
  var init_luma = __esm({
    "chrome-extension/detectors/luma.js"() {
      "use strict";
      LumaDetector = {
        platform: "luma-dream-machine",
        displayName: "Luma Dream Machine",
        category: "video",
        urlPatterns: [
          /^https?:\/\/(www\.)?lumalabs\.ai/i,
          /^https?:\/\/dream-machine\.lumalabs\.ai/i
        ],
        detect(url) {
          return this.urlPatterns.some((pattern) => pattern.test(url));
        },
        extractPrompt(document2) {
          const selectors = [
            // Dream Machine prompt input
            'textarea[data-testid="prompt-input"]',
            'textarea[placeholder*="Describe" i]',
            'textarea[placeholder*="dream" i]',
            'textarea[placeholder*="Type your prompt" i]',
            'textarea[aria-label*="prompt" i]',
            '[data-testid="prompt-textarea"]',
            '[class*="prompt-input"] textarea',
            '[class*="PromptInput"] textarea',
            // Contenteditable
            '[contenteditable="true"][data-placeholder*="Describe" i]',
            '[contenteditable="true"][class*="prompt"]'
          ];
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt: null };
            }
          }
          const historySelectors = [
            '[class*="generation-card"]:first-of-type [class*="prompt"]',
            '[data-testid="generation-item"]:first-of-type [class*="prompt"]',
            '[class*="HistoryItem"] [class*="prompt"]'
          ];
          for (const selector of historySelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              return { prompt: el.textContent.trim(), negativePrompt: null };
            }
          }
          return null;
        },
        extractSettings(document2) {
          const settings = {};
          const modelSelectors = [
            '[data-testid="model-selector"]',
            '[class*="model-selector"]',
            '[class*="ModelPicker"]',
            '[aria-label*="model" i]',
            '[class*="model-badge"]'
          ];
          for (const selector of modelSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.modelName = el.textContent.trim();
              break;
            }
          }
          const ratioSelectors = [
            '[data-testid="aspect-ratio"]',
            '[class*="aspect-ratio"][class*="selected"]',
            'button[class*="ratio"][aria-pressed="true"]',
            '[class*="RatioSelector"] [class*="active"]'
          ];
          for (const selector of ratioSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.aspectRatio = el.textContent.trim();
              break;
            }
          }
          const durationSelectors = [
            '[data-testid="duration-selector"]',
            '[class*="duration-control"]',
            'input[aria-label*="duration" i]',
            '[class*="DurationPicker"]'
          ];
          for (const selector of durationSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              const val = el.value || el.textContent?.trim() || el.getAttribute("aria-valuenow");
              if (val) {
                settings.duration = val;
                break;
              }
            }
          }
          const motionSelectors = [
            '[data-testid="camera-motion"]',
            '[class*="camera-motion"]',
            '[class*="CameraMotion"]',
            '[aria-label*="camera" i]'
          ];
          for (const selector of motionSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.cameraMotion = el.textContent.trim();
              break;
            }
          }
          const loopSelectors = [
            'input[type="checkbox"][aria-label*="loop" i]',
            '[data-testid="loop-toggle"]',
            '[class*="loop-switch"]'
          ];
          for (const selector of loopSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              settings.loop = el.checked || el.getAttribute("aria-checked") === "true";
              break;
            }
          }
          return Object.keys(settings).length > 0 ? settings : null;
        },
        extractOutputs(document2) {
          const outputs = [];
          const videoSelectors = [
            '[data-testid="generation-video"] video',
            '[class*="video-player"] video',
            '[class*="VideoPlayer"] video',
            '[class*="generation-result"] video',
            '[class*="OutputView"] video',
            'video[src*="lumalabs"]',
            'video[src*="luma"]',
            "video[src]"
          ];
          for (const selector of videoSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const src = el.currentSrc || el.src || el.querySelector("source")?.src;
              if (src && src.startsWith("http")) {
                outputs.push({
                  type: "video",
                  url: src,
                  thumbnailUrl: el.poster || null,
                  metadata: {
                    duration: el.duration || null,
                    width: el.videoWidth || null,
                    height: el.videoHeight || null
                  }
                });
              }
            });
          }
          const imageSelectors = [
            '[data-testid="output-image"] img',
            '[class*="generation-result"] img',
            '[class*="OutputView"] img',
            'img[src*="lumalabs"]:not([class*="avatar"]):not([class*="logo"])'
          ];
          for (const selector of imageSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      height: el.naturalHeight || null
                    }
                  });
                }
              }
            });
          }
          const downloadSelectors = [
            'a[download][href*="lumalabs"]',
            'a[download][href*="luma"]',
            'a[data-testid="download"]',
            'button[aria-label*="Download" i]'
          ];
          for (const selector of downloadSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const href = el.href || el.getAttribute("data-url");
              if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
                const isVideo = /\.(mp4|webm|mov)/i.test(href);
                outputs.push({
                  type: isVideo ? "video" : "image",
                  url: href,
                  thumbnailUrl: null,
                  metadata: {}
                });
              }
            });
          }
          return outputs;
        }
      };
      luma_default = LumaDetector;
    }
  });

  // chrome-extension/detectors/leonardo.js
  var LeonardoDetector, leonardo_default;
  var init_leonardo = __esm({
    "chrome-extension/detectors/leonardo.js"() {
      "use strict";
      LeonardoDetector = {
        platform: "leonardo-ai",
        displayName: "Leonardo AI",
        category: "image",
        urlPatterns: [
          /^https?:\/\/app\.leonardo\.ai/i,
          /^https?:\/\/(www\.)?leonardo\.ai/i
        ],
        detect(url) {
          return this.urlPatterns.some((pattern) => pattern.test(url));
        },
        extractPrompt(document2) {
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
            '[contenteditable="true"][data-placeholder*="prompt" i]'
          ];
          let prompt = null;
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              prompt = text;
              break;
            }
          }
          if (!prompt) return null;
          let negativePrompt = null;
          const negSelectors = [
            'textarea[data-testid="negative-prompt"]',
            'textarea[placeholder*="Negative" i]',
            'textarea[aria-label*="negative" i]',
            '[class*="negative-prompt"] textarea',
            '[data-testid="negative-prompt-input"]'
          ];
          for (const selector of negSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              const val = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
              if (val) {
                negativePrompt = val;
                break;
              }
            }
          }
          return { prompt, negativePrompt };
        },
        extractSettings(document2) {
          const settings = {};
          const modelSelectors = [
            '[data-testid="model-selector"]',
            '[class*="model-select"]',
            '[class*="ModelSelector"]',
            '[class*="model-picker"]',
            'button[class*="model-name"]',
            '[aria-label*="model" i]'
          ];
          for (const selector of modelSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.modelName = el.textContent.trim();
              break;
            }
          }
          const dimensionSelectors = [
            '[data-testid="dimension-selector"]',
            '[class*="dimension-control"]',
            '[class*="DimensionSelector"]'
          ];
          for (const selector of dimensionSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.dimensions = el.textContent.trim();
              break;
            }
          }
          const widthEl = document2.querySelector('input[aria-label*="width" i]') || document2.querySelector('input[data-testid="width-input"]');
          const heightEl = document2.querySelector('input[aria-label*="height" i]') || document2.querySelector('input[data-testid="height-input"]');
          if (widthEl?.value && heightEl?.value) {
            settings.width = parseInt(widthEl.value, 10);
            settings.height = parseInt(heightEl.value, 10);
            settings.aspectRatio = `${widthEl.value}x${heightEl.value}`;
          }
          const guidanceSelectors = [
            'input[aria-label*="Guidance" i]',
            '[data-testid="guidance-scale"] input',
            '[class*="guidance-slider"] input'
          ];
          for (const selector of guidanceSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.guidanceScale = parseFloat(el.value);
              break;
            }
          }
          const countSelectors = [
            '[data-testid="num-images"]',
            'input[aria-label*="number of images" i]',
            '[class*="image-count"] input'
          ];
          for (const selector of countSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.imageCount = parseInt(el.value, 10);
              break;
            }
          }
          const seedSelectors = [
            'input[data-testid="seed-input"]',
            'input[aria-label*="seed" i]',
            'input[name="seed"]'
          ];
          for (const selector of seedSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.seed = parseInt(el.value, 10);
              break;
            }
          }
          const schedulerSelectors = [
            '[data-testid="scheduler-selector"]',
            'select[aria-label*="scheduler" i]',
            '[class*="scheduler-select"]'
          ];
          for (const selector of schedulerSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value || el?.textContent?.trim()) {
              settings.scheduler = el.value || el.textContent.trim();
              break;
            }
          }
          return Object.keys(settings).length > 0 ? settings : null;
        },
        extractOutputs(document2) {
          const outputs = [];
          const imageSelectors = [
            '[data-testid="generated-image"] img',
            '[class*="generation-grid"] img',
            '[class*="GeneratedImage"] img',
            '[class*="image-card"] img',
            '[class*="output-grid"] img',
            'img[src*="leonardo.ai"]:not([class*="avatar"]):not([class*="logo"])',
            'img[src*="cdn.leonardo"]:not([width="24"]):not([width="32"])'
          ];
          for (const selector of imageSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      alt: el.alt || null
                    }
                  });
                }
              }
            });
          }
          const lightboxSelectors = [
            '[class*="lightbox"] img',
            '[class*="Lightbox"] img',
            '[data-testid="fullsize-image"] img',
            '[class*="modal-image"] img'
          ];
          for (const selector of lightboxSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              const src = el.currentSrc || el.src;
              if (src && src.startsWith("http") && !outputs.some((o) => o.url === src)) {
                outputs.push({
                  type: "image",
                  url: src,
                  thumbnailUrl: src,
                  metadata: {
                    width: el.naturalWidth || null,
                    height: el.naturalHeight || null
                  }
                });
              }
            }
          }
          const downloadSelectors = [
            'a[download][href*="leonardo"]',
            'a[data-testid="download-button"]',
            'button[aria-label*="Download" i]'
          ];
          for (const selector of downloadSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const href = el.href || el.getAttribute("data-url");
              if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
                outputs.push({
                  type: "image",
                  url: href,
                  thumbnailUrl: null,
                  metadata: {}
                });
              }
            });
          }
          return outputs;
        }
      };
      leonardo_default = LeonardoDetector;
    }
  });

  // chrome-extension/detectors/ideogram.js
  var IdeogramDetector, ideogram_default;
  var init_ideogram = __esm({
    "chrome-extension/detectors/ideogram.js"() {
      "use strict";
      IdeogramDetector = {
        platform: "ideogram",
        displayName: "Ideogram",
        category: "image",
        urlPatterns: [
          /^https?:\/\/(www\.)?ideogram\.ai/i
        ],
        detect(url) {
          return this.urlPatterns.some((pattern) => pattern.test(url));
        },
        extractPrompt(document2) {
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
            '[contenteditable="true"][class*="prompt"]'
          ];
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt: null };
            }
          }
          let negativePrompt = null;
          const negSelectors = [
            'textarea[data-testid="negative-prompt"]',
            'textarea[placeholder*="Negative" i]',
            '[class*="negative-prompt"] textarea',
            'textarea[name="negative_prompt"]'
          ];
          for (const selector of negSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              const val = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
              if (val) {
                negativePrompt = val;
                break;
              }
            }
          }
          const detailSelectors = [
            '[data-testid="image-detail"] [class*="prompt"]',
            '[class*="generation-detail"] [class*="prompt"]',
            '[class*="ImageDetail"] [class*="prompt-text"]'
          ];
          for (const selector of detailSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              return { prompt: el.textContent.trim(), negativePrompt };
            }
          }
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt };
            }
          }
          return null;
        },
        extractSettings(document2) {
          const settings = {};
          const modelSelectors = [
            '[data-testid="model-selector"]',
            '[class*="model-selector"]',
            '[class*="ModelPicker"]',
            'button[class*="model-toggle"]',
            '[aria-label*="model" i]'
          ];
          for (const selector of modelSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.modelName = el.textContent.trim();
              break;
            }
          }
          const ratioSelectors = [
            '[data-testid="aspect-ratio"]',
            '[class*="aspect-ratio"][class*="active"]',
            'button[class*="ratio"][aria-pressed="true"]',
            '[class*="AspectRatioButton"][class*="selected"]'
          ];
          for (const selector of ratioSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.aspectRatio = el.textContent.trim();
              break;
            }
          }
          const styleSelectors = [
            '[data-testid="style-selector"]',
            '[class*="style-selector"][class*="active"]',
            'button[class*="style"][aria-pressed="true"]',
            '[class*="StyleOption"][class*="selected"]'
          ];
          for (const selector of styleSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.style = el.textContent.trim();
              break;
            }
          }
          const qualitySelectors = [
            '[data-testid="quality-selector"]',
            '[class*="quality-toggle"]',
            'button[class*="quality"][aria-pressed="true"]'
          ];
          for (const selector of qualitySelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.quality = el.textContent.trim();
              break;
            }
          }
          const magicPromptSelectors = [
            'input[aria-label*="Magic Prompt" i]',
            '[data-testid="magic-prompt-toggle"]',
            '[class*="magic-prompt"] input[type="checkbox"]'
          ];
          for (const selector of magicPromptSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              settings.magicPrompt = el.checked || el.getAttribute("aria-checked") === "true";
              break;
            }
          }
          const seedSelectors = [
            'input[data-testid="seed-input"]',
            'input[aria-label*="seed" i]',
            'input[name="seed"]'
          ];
          for (const selector of seedSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.seed = parseInt(el.value, 10);
              break;
            }
          }
          return Object.keys(settings).length > 0 ? settings : null;
        },
        extractOutputs(document2) {
          const outputs = [];
          const imageSelectors = [
            '[data-testid="generated-image"] img',
            '[class*="result-grid"] img',
            '[class*="GeneratedImage"] img',
            '[class*="gallery-grid"] img',
            '[class*="output-container"] img',
            'img[src*="ideogram.ai"]:not([class*="avatar"]):not([class*="logo"])',
            'img[src*="ideogram-thumbnail"]'
          ];
          for (const selector of imageSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      alt: el.alt || null
                    }
                  });
                }
              }
            });
          }
          const fullSizeSelectors = [
            '[class*="fullsize-view"] img',
            '[class*="ImageModal"] img',
            '[data-testid="full-image"] img'
          ];
          for (const selector of fullSizeSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              const src = el.currentSrc || el.src;
              if (src && src.startsWith("http") && !outputs.some((o) => o.url === src)) {
                outputs.push({
                  type: "image",
                  url: src,
                  thumbnailUrl: src,
                  metadata: {
                    width: el.naturalWidth || null,
                    height: el.naturalHeight || null
                  }
                });
              }
            }
          }
          const downloadSelectors = [
            'a[download][href*="ideogram"]',
            'a[data-testid="download"]',
            'button[aria-label*="Download" i]'
          ];
          for (const selector of downloadSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const href = el.href || el.getAttribute("data-url");
              if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
                outputs.push({
                  type: "image",
                  url: href,
                  thumbnailUrl: null,
                  metadata: {}
                });
              }
            });
          }
          return outputs;
        }
      };
      ideogram_default = IdeogramDetector;
    }
  });

  // chrome-extension/detectors/adobe-firefly.js
  var AdobeFireflyDetector, adobe_firefly_default;
  var init_adobe_firefly = __esm({
    "chrome-extension/detectors/adobe-firefly.js"() {
      "use strict";
      AdobeFireflyDetector = {
        platform: "adobe-firefly",
        displayName: "Adobe Firefly",
        category: "image",
        urlPatterns: [
          /^https?:\/\/firefly\.adobe\.com/i,
          /^https?:\/\/(www\.)?adobe\.com\/products\/firefly/i,
          /^https?:\/\/(www\.)?adobe\.com\/sensei\/generative-ai\/firefly/i
        ],
        detect(url) {
          return this.urlPatterns.some((pattern) => pattern.test(url));
        },
        extractPrompt(document2) {
          const selectors = [
            // Firefly prompt input
            'textarea[data-testid="prompt-input"]',
            'textarea[placeholder*="Describe" i]',
            'textarea[placeholder*="what you" i]',
            'textarea[aria-label*="prompt" i]',
            '[data-testid="prompt-textarea"]',
            // Spectrum Web Components (Adobe design system)
            'sp-textfield[placeholder*="Describe" i] textarea',
            'sp-textfield[label*="prompt" i] textarea',
            '[class*="prompt-input"] textarea',
            '[class*="PromptField"] textarea',
            // Contenteditable
            '[contenteditable="true"][aria-label*="prompt" i]',
            '[contenteditable="true"][data-placeholder*="Describe" i]',
            // Fallback
            'textarea[class*="prompt"]'
          ];
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt: null };
            }
          }
          const detailSelectors = [
            '[data-testid="generation-details"] [class*="prompt"]',
            '[class*="generation-info"] [class*="prompt"]',
            '[class*="PromptDisplay"]'
          ];
          for (const selector of detailSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              return { prompt: el.textContent.trim(), negativePrompt: null };
            }
          }
          return null;
        },
        extractSettings(document2) {
          const settings = {};
          const modelSelectors = [
            '[data-testid="model-selector"]',
            '[class*="model-selector"]',
            '[class*="ModelPicker"]',
            '[aria-label*="model" i]',
            'sp-picker[label*="model" i]'
          ];
          for (const selector of modelSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.modelName = el.textContent.trim();
              break;
            }
          }
          const ratioSelectors = [
            '[data-testid="aspect-ratio-selector"]',
            '[class*="aspect-ratio"][class*="selected"]',
            'sp-action-button[aria-label*="aspect" i][selected]',
            'button[aria-pressed="true"][class*="ratio"]',
            '[class*="RatioSelector"] [class*="active"]'
          ];
          for (const selector of ratioSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.aspectRatio = el.textContent.trim();
              break;
            }
          }
          const contentTypeSelectors = [
            '[data-testid="content-type-selector"]',
            '[class*="content-type"][class*="selected"]',
            'sp-action-button[aria-label*="content type" i][selected]',
            '[class*="ContentType"] [class*="active"]'
          ];
          for (const selector of contentTypeSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.contentType = el.textContent.trim();
              break;
            }
          }
          const styleSelectors = [
            '[data-testid="style-selector"]',
            '[class*="style-option"][class*="active"]',
            '[class*="style-chip"][class*="selected"]'
          ];
          for (const selector of styleSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.style = el.textContent.trim();
              break;
            }
          }
          const effectSelectors = [
            '[data-testid="effect-selector"]',
            '[class*="effect-option"][class*="active"]',
            '[class*="EffectSelector"] [class*="selected"]'
          ];
          for (const selector of effectSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.effect = el.textContent.trim();
              break;
            }
          }
          return Object.keys(settings).length > 0 ? settings : null;
        },
        extractOutputs(document2) {
          const outputs = [];
          const imageSelectors = [
            '[data-testid="generated-image"] img',
            '[class*="result-image"] img',
            '[class*="GeneratedImage"] img',
            '[class*="output-grid"] img',
            '[class*="gallery-item"] img',
            'img[src*="firefly.adobe.com"]:not([class*="icon"])',
            'img[src*="cc-api-storage"]:not([width="24"])',
            'img[src*="adobeaemcloud"]:not([class*="avatar"])'
          ];
          for (const selector of imageSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      alt: el.alt || null
                    }
                  });
                }
              }
            });
          }
          const canvasSelectors = [
            'canvas[data-testid="firefly-canvas"]',
            '[class*="editor-canvas"] canvas'
          ];
          for (const selector of canvasSelectors) {
            const canvas = document2.querySelector(selector);
            if (canvas instanceof HTMLCanvasElement && canvas.width > 100 && canvas.height > 100) {
              try {
                const dataUrl = canvas.toDataURL("image/png");
                if (dataUrl && dataUrl.length > 100) {
                  outputs.push({
                    type: "image",
                    url: dataUrl,
                    thumbnailUrl: null,
                    metadata: {
                      width: canvas.width,
                      height: canvas.height,
                      source: "canvas-export"
                    }
                  });
                }
              } catch {
              }
            }
          }
          const downloadSelectors = [
            'a[download][href*="adobe"]',
            'sp-action-button[aria-label*="Download" i]',
            'button[data-testid="download-button"]',
            'a[data-testid="download-link"]'
          ];
          for (const selector of downloadSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const href = el.href || el.getAttribute("data-url");
              if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
                outputs.push({
                  type: "image",
                  url: href,
                  thumbnailUrl: null,
                  metadata: {}
                });
              }
            });
          }
          return outputs;
        }
      };
      adobe_firefly_default = AdobeFireflyDetector;
    }
  });

  // chrome-extension/detectors/flux.js
  var FluxDetector, flux_default;
  var init_flux = __esm({
    "chrome-extension/detectors/flux.js"() {
      "use strict";
      FluxDetector = {
        platform: "bfl-flux",
        displayName: "Flux (Black Forest Labs)",
        category: "image",
        urlPatterns: [
          /^https?:\/\/(www\.)?blackforestlabs\.ai/i,
          /^https?:\/\/replicate\.com\/black-forest-labs/i,
          /^https?:\/\/replicate\.com\/.*flux/i,
          /^https?:\/\/fal\.ai\/models\/fal-ai\/flux/i,
          /^https?:\/\/fal\.ai\/.*flux/i,
          /^https?:\/\/flux1\.ai/i
        ],
        detect(url) {
          return this.urlPatterns.some((pattern) => pattern.test(url));
        },
        extractPrompt(document2) {
          const host = window?.location?.hostname || "";
          if (host.includes("replicate.com")) {
            const replicateSelectors = [
              'textarea[name="prompt"]',
              'textarea[data-testid="prompt"]',
              '[data-testid="input-prompt"] textarea',
              'label[for="prompt"] ~ textarea',
              'label[for="prompt"] ~ div textarea',
              '[class*="playground"] textarea:first-of-type'
            ];
            for (const selector of replicateSelectors) {
              const el = document2.querySelector(selector);
              if (!el) continue;
              const text = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
              if (text && text.length > 2) {
                return { prompt: text, negativePrompt: null };
              }
            }
          }
          if (host.includes("fal.ai")) {
            const falSelectors = [
              'textarea[name="prompt"]',
              'textarea[placeholder*="Describe" i]',
              '[data-testid="prompt-input"] textarea',
              '[class*="prompt-field"] textarea',
              "textarea"
            ];
            for (const selector of falSelectors) {
              const el = document2.querySelector(selector);
              if (!el) continue;
              const text = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
              if (text && text.length > 2) {
                return { prompt: text, negativePrompt: null };
              }
            }
          }
          const selectors = [
            'textarea[data-testid="prompt-input"]',
            'textarea[placeholder*="Describe" i]',
            'textarea[placeholder*="prompt" i]',
            'textarea[name="prompt"]',
            'textarea[aria-label*="prompt" i]',
            '[class*="prompt-input"] textarea',
            '[class*="PromptField"] textarea',
            "textarea"
          ];
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt: null };
            }
          }
          return null;
        },
        extractSettings(document2) {
          const settings = {};
          const host = window?.location?.hostname || "";
          if (host.includes("replicate.com")) {
            const breadcrumb = document2.querySelector('[class*="breadcrumb"] a:last-of-type');
            if (breadcrumb?.textContent?.trim()) {
              settings.modelName = breadcrumb.textContent.trim();
            }
            const pathMatch = window.location.pathname.match(/flux[_-]?([\w.-]+)/i);
            if (pathMatch) {
              settings.modelName = settings.modelName || `Flux ${pathMatch[1]}`;
            }
          }
          if (host.includes("fal.ai")) {
            const modelTitle = document2.querySelector('[class*="model-title"]') || document2.querySelector("h1");
            if (modelTitle?.textContent?.trim()) {
              settings.modelName = modelTitle.textContent.trim();
            }
          }
          if (!settings.modelName) {
            const modelSelectors = [
              '[data-testid="model-selector"]',
              '[class*="model-name"]',
              '[aria-label*="model" i]'
            ];
            for (const selector of modelSelectors) {
              const el = document2.querySelector(selector);
              if (el?.textContent?.trim()) {
                settings.modelName = el.textContent.trim();
                break;
              }
            }
          }
          const widthEl = document2.querySelector('input[name="width"]') || document2.querySelector('input[aria-label*="width" i]');
          const heightEl = document2.querySelector('input[name="height"]') || document2.querySelector('input[aria-label*="height" i]');
          if (widthEl?.value && heightEl?.value) {
            settings.width = parseInt(widthEl.value, 10);
            settings.height = parseInt(heightEl.value, 10);
            settings.aspectRatio = `${widthEl.value}x${heightEl.value}`;
          }
          const guidanceEl = document2.querySelector('input[name="guidance_scale"]') || document2.querySelector('input[name="guidance"]') || document2.querySelector('input[aria-label*="guidance" i]');
          if (guidanceEl?.value) {
            settings.guidanceScale = parseFloat(guidanceEl.value);
          }
          const stepsEl = document2.querySelector('input[name="num_inference_steps"]') || document2.querySelector('input[name="steps"]') || document2.querySelector('input[aria-label*="steps" i]');
          if (stepsEl?.value) {
            settings.steps = parseInt(stepsEl.value, 10);
          }
          const seedEl = document2.querySelector('input[name="seed"]') || document2.querySelector('input[aria-label*="seed" i]');
          if (seedEl?.value) {
            settings.seed = parseInt(seedEl.value, 10);
          }
          const numOutputsEl = document2.querySelector('input[name="num_outputs"]') || document2.querySelector('input[name="num_images"]');
          if (numOutputsEl?.value) {
            settings.numOutputs = parseInt(numOutputsEl.value, 10);
          }
          return Object.keys(settings).length > 0 ? settings : null;
        },
        extractOutputs(document2) {
          const outputs = [];
          const host = window?.location?.hostname || "";
          if (host.includes("replicate.com")) {
            const replicateSelectors = [
              '[data-testid="output-image"] img',
              '[class*="output"] img',
              '[class*="prediction-output"] img',
              'img[src*="replicate.delivery"]',
              'img[src*="pbxt.replicate"]'
            ];
            for (const selector of replicateSelectors) {
              const elements = document2.querySelectorAll(selector);
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
                        height: el.naturalHeight || null
                      }
                    });
                  }
                }
              });
            }
          }
          if (host.includes("fal.ai")) {
            const falSelectors = [
              '[class*="output"] img',
              '[class*="result"] img',
              'img[src*="fal.media"]',
              'img[src*="fal.ai"]'
            ];
            for (const selector of falSelectors) {
              const elements = document2.querySelectorAll(selector);
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
                        height: el.naturalHeight || null
                      }
                    });
                  }
                }
              });
            }
          }
          const imageSelectors = [
            '[data-testid="generated-image"] img',
            '[class*="result-image"] img',
            '[class*="output-grid"] img',
            'img[src*="blackforestlabs"]:not([class*="logo"])'
          ];
          for (const selector of imageSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      height: el.naturalHeight || null
                    }
                  });
                }
              }
            });
          }
          const downloadSelectors = [
            'a[download][href*="replicate"]',
            'a[download][href*="fal"]',
            'a[download][href*="blackforestlabs"]',
            'a[data-testid="download"]'
          ];
          for (const selector of downloadSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const href = el.href;
              if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
                outputs.push({
                  type: "image",
                  url: href,
                  thumbnailUrl: null,
                  metadata: {}
                });
              }
            });
          }
          return outputs;
        }
      };
      flux_default = FluxDetector;
    }
  });

  // chrome-extension/detectors/elevenlabs.js
  var ElevenLabsDetector, elevenlabs_default;
  var init_elevenlabs = __esm({
    "chrome-extension/detectors/elevenlabs.js"() {
      "use strict";
      ElevenLabsDetector = {
        platform: "elevenlabs",
        displayName: "ElevenLabs",
        category: "audio",
        urlPatterns: [
          /^https?:\/\/(www\.)?elevenlabs\.io/i,
          /^https?:\/\/beta\.elevenlabs\.io/i
        ],
        detect(url) {
          return this.urlPatterns.some((pattern) => pattern.test(url));
        },
        extractPrompt(document2) {
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
            '[class*="PromptInput"] textarea'
          ];
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt: null };
            }
          }
          const historySelectors = [
            '[data-testid="history-item-text"]',
            '[class*="history-item"] [class*="text"]',
            '[class*="GenerationCard"] [class*="prompt"]',
            '[class*="generation-text"]'
          ];
          for (const selector of historySelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              return { prompt: el.textContent.trim(), negativePrompt: null };
            }
          }
          return null;
        },
        extractSettings(document2) {
          const settings = {};
          const voiceSelectors = [
            '[data-testid="voice-selector"]',
            '[data-testid="selected-voice"]',
            '[class*="voice-selector"]',
            '[class*="VoiceSelector"]',
            '[class*="voice-name"]',
            '[aria-label*="voice" i]',
            'button[class*="voice-picker"]'
          ];
          for (const selector of voiceSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.voiceName = el.textContent.trim();
              break;
            }
          }
          const modelSelectors = [
            '[data-testid="model-selector"]',
            '[class*="model-select"]',
            '[class*="ModelSelector"]',
            'select[aria-label*="model" i]',
            '[aria-label*="model" i]',
            '[class*="model-name"]'
          ];
          for (const selector of modelSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.modelName = el.textContent.trim();
              break;
            }
          }
          const stabilitySelectors = [
            'input[data-testid="stability-slider"]',
            'input[aria-label*="stability" i]',
            '[class*="stability-slider"] input[type="range"]',
            '[data-testid="stability"] input'
          ];
          for (const selector of stabilitySelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.stability = parseFloat(el.value);
              break;
            }
          }
          const similaritySelectors = [
            'input[data-testid="similarity-slider"]',
            'input[aria-label*="similarity" i]',
            'input[aria-label*="clarity" i]',
            '[class*="similarity-slider"] input[type="range"]',
            '[data-testid="similarity"] input'
          ];
          for (const selector of similaritySelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.similarity = parseFloat(el.value);
              break;
            }
          }
          const styleSelectors = [
            'input[data-testid="style-slider"]',
            'input[aria-label*="style" i]',
            '[class*="style-exaggeration"] input[type="range"]',
            '[data-testid="style-exaggeration"] input'
          ];
          for (const selector of styleSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.styleExaggeration = parseFloat(el.value);
              break;
            }
          }
          const boostSelectors = [
            'input[data-testid="speaker-boost"]',
            '[class*="speaker-boost"] input[type="checkbox"]',
            '[aria-label*="speaker boost" i]'
          ];
          for (const selector of boostSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              settings.speakerBoost = el.checked || el.getAttribute("aria-checked") === "true";
              break;
            }
          }
          const formatSelectors = [
            '[data-testid="output-format"]',
            'select[aria-label*="format" i]',
            '[class*="format-selector"]'
          ];
          for (const selector of formatSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value || el?.textContent?.trim()) {
              settings.outputFormat = el.value || el.textContent.trim();
              break;
            }
          }
          const durationSelectors = [
            'input[data-testid="duration-input"]',
            'input[aria-label*="duration" i]',
            '[class*="duration-control"] input',
            '[data-testid="duration-slider"] input'
          ];
          for (const selector of durationSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.duration = el.value;
              break;
            }
          }
          return Object.keys(settings).length > 0 ? settings : null;
        },
        extractOutputs(document2) {
          const outputs = [];
          const audioSelectors = [
            '[data-testid="audio-player"] audio',
            '[data-testid="generation-audio"] audio',
            '[class*="audio-player"] audio',
            '[class*="AudioPlayer"] audio',
            '[class*="generation-result"] audio',
            '[class*="OutputPlayer"] audio',
            'audio[src*="elevenlabs"]',
            'audio[src*="api.elevenlabs"]',
            "audio[src]"
          ];
          for (const selector of audioSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const src = el.currentSrc || el.src || el.querySelector("source")?.src;
              if (src && src.startsWith("http")) {
                if (!outputs.some((o) => o.url === src)) {
                  outputs.push({
                    type: "audio",
                    url: src,
                    thumbnailUrl: null,
                    metadata: {
                      duration: el.duration || null
                    }
                  });
                }
              }
            });
          }
          const sourceElements = document2.querySelectorAll("audio source[src]");
          sourceElements.forEach((el) => {
            const src = el.src;
            if (src && src.startsWith("http") && !outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "audio",
                url: src,
                thumbnailUrl: null,
                metadata: {
                  mimeType: el.type || null
                }
              });
            }
          });
          const downloadSelectors = [
            'a[download][href*="elevenlabs"]',
            'a[data-testid="download-audio"]',
            'a[data-testid="download-button"]',
            'button[data-testid="download-button"]',
            'a[href*="api.elevenlabs"][href*="download"]'
          ];
          for (const selector of downloadSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const href = el.href || el.getAttribute("data-url");
              if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
                outputs.push({
                  type: "audio",
                  url: href,
                  thumbnailUrl: null,
                  metadata: {}
                });
              }
            });
          }
          const blobAudioSelectors = [
            'audio[src^="blob:"]',
            '[class*="audio-player"] audio[src^="blob:"]'
          ];
          for (const selector of blobAudioSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      note: "blob-url-requires-page-context"
                    }
                  });
                }
              }
            });
          }
          return outputs;
        }
      };
      elevenlabs_default = ElevenLabsDetector;
    }
  });

  // chrome-extension/detectors/suno.js
  var SunoDetector, suno_default;
  var init_suno = __esm({
    "chrome-extension/detectors/suno.js"() {
      "use strict";
      SunoDetector = {
        platform: "suno",
        displayName: "Suno",
        category: "music",
        urlPatterns: [
          /^https?:\/\/(www\.)?suno\.com/i,
          /^https?:\/\/app\.suno\.ai/i,
          /^https?:\/\/(www\.)?suno\.ai/i
        ],
        detect(url) {
          return this.urlPatterns.some((pattern) => pattern.test(url));
        },
        extractPrompt(document2) {
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
            '[class*="create-input"] textarea'
          ];
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt: null };
            }
          }
          const lyricsSelectors = [
            'textarea[data-testid="lyrics-input"]',
            'textarea[placeholder*="lyrics" i]',
            'textarea[aria-label*="lyrics" i]',
            '[class*="lyrics-input"] textarea',
            '[class*="LyricsInput"] textarea'
          ];
          for (const selector of lyricsSelectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt: null };
            }
          }
          const detailSelectors = [
            '[data-testid="song-prompt"]',
            '[data-testid="song-description"]',
            '[class*="song-prompt"]',
            '[class*="SongPrompt"]',
            '[class*="song-description"]',
            '[class*="track-description"]'
          ];
          for (const selector of detailSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              return { prompt: el.textContent.trim(), negativePrompt: null };
            }
          }
          return null;
        },
        extractSettings(document2) {
          const settings = {};
          const modelSelectors = [
            '[data-testid="model-selector"]',
            '[data-testid="version-selector"]',
            '[class*="model-selector"]',
            '[class*="ModelSelector"]',
            '[class*="version-badge"]',
            '[aria-label*="model" i]',
            '[aria-label*="version" i]'
          ];
          for (const selector of modelSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.modelName = el.textContent.trim();
              break;
            }
          }
          const instrumentalSelectors = [
            'input[data-testid="instrumental-toggle"]',
            '[class*="instrumental-toggle"] input[type="checkbox"]',
            '[aria-label*="instrumental" i]',
            'button[data-testid="instrumental-toggle"]',
            '[class*="instrumental"] [role="switch"]'
          ];
          for (const selector of instrumentalSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              settings.instrumental = el.checked || el.getAttribute("aria-checked") === "true" || el.getAttribute("aria-pressed") === "true";
              break;
            }
          }
          const styleSelectors = [
            'textarea[data-testid="style-input"]',
            'input[data-testid="style-input"]',
            'textarea[placeholder*="style of music" i]',
            'input[placeholder*="genre" i]',
            '[class*="style-input"] textarea',
            '[class*="genre-input"] input'
          ];
          for (const selector of styleSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              const val = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
              if (val) {
                settings.style = val;
                break;
              }
            }
          }
          const titleSelectors = [
            'input[data-testid="title-input"]',
            'input[placeholder*="title" i]',
            'input[aria-label*="title" i]',
            '[class*="title-input"] input'
          ];
          for (const selector of titleSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value?.trim()) {
              settings.title = el.value.trim();
              break;
            }
          }
          const customModeSelectors = [
            '[data-testid="custom-mode-toggle"]',
            'button[aria-label*="custom" i]',
            '[class*="custom-toggle"]',
            '[class*="mode-toggle"]'
          ];
          for (const selector of customModeSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              settings.customMode = el.getAttribute("aria-pressed") === "true" || el.getAttribute("aria-checked") === "true" || el.classList?.contains("active") || false;
              break;
            }
          }
          return Object.keys(settings).length > 0 ? settings : null;
        },
        extractOutputs(document2) {
          const outputs = [];
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
            "audio[src]"
          ];
          for (const selector of audioSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const src = el.currentSrc || el.src || el.querySelector("source")?.src;
              if (src && src.startsWith("http")) {
                if (!outputs.some((o) => o.url === src)) {
                  outputs.push({
                    type: "audio",
                    url: src,
                    thumbnailUrl: null,
                    metadata: {
                      duration: el.duration || null
                    }
                  });
                }
              }
            });
          }
          const coverSelectors = [
            '[data-testid="song-cover"] img',
            '[class*="song-cover"] img',
            '[class*="SongCover"] img',
            '[class*="cover-art"] img',
            '[class*="album-art"] img',
            '[class*="track-image"] img',
            'img[src*="suno"][class*="cover"]'
          ];
          for (const selector of coverSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      role: "cover-art"
                    }
                  });
                }
              }
            });
          }
          const videoSelectors = [
            '[data-testid="song-video"] video',
            '[class*="song-video"] video',
            '[class*="music-video"] video',
            'video[src*="suno"]'
          ];
          for (const selector of videoSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      height: el.videoHeight || null
                    }
                  });
                }
              }
            });
          }
          const downloadSelectors = [
            'a[download][href*="suno"]',
            'a[data-testid="download-button"]',
            'a[data-testid="download-audio"]',
            'button[data-testid="download-button"]'
          ];
          for (const selector of downloadSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const href = el.href || el.getAttribute("data-url");
              if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
                const isVideo = /\.(mp4|webm|mov)/i.test(href);
                outputs.push({
                  type: isVideo ? "video" : "audio",
                  url: href,
                  thumbnailUrl: null,
                  metadata: {}
                });
              }
            });
          }
          const blobAudioSelectors = [
            'audio[src^="blob:"]',
            '[class*="song-player"] audio[src^="blob:"]'
          ];
          for (const selector of blobAudioSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      note: "blob-url-requires-page-context"
                    }
                  });
                }
              }
            });
          }
          return outputs;
        }
      };
      suno_default = SunoDetector;
    }
  });

  // chrome-extension/detectors/udio.js
  var UdioDetector, udio_default;
  var init_udio = __esm({
    "chrome-extension/detectors/udio.js"() {
      "use strict";
      UdioDetector = {
        platform: "udio",
        displayName: "Udio",
        category: "music",
        urlPatterns: [
          /^https?:\/\/(www\.)?udio\.com/i,
          /^https?:\/\/app\.udio\.com/i
        ],
        detect(url) {
          return this.urlPatterns.some((pattern) => pattern.test(url));
        },
        extractPrompt(document2) {
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
            '[class*="create-prompt"] textarea'
          ];
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt: null };
            }
          }
          const lyricsSelectors = [
            'textarea[data-testid="lyrics-input"]',
            'textarea[placeholder*="lyrics" i]',
            'textarea[aria-label*="lyrics" i]',
            '[class*="lyrics-input"] textarea',
            '[class*="LyricsEditor"] textarea',
            '[class*="lyrics-editor"] textarea'
          ];
          for (const selector of lyricsSelectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              return { prompt: text, negativePrompt: null };
            }
          }
          const detailSelectors = [
            '[data-testid="track-prompt"]',
            '[data-testid="track-description"]',
            '[class*="track-prompt"]',
            '[class*="TrackPrompt"]',
            '[class*="song-description"]',
            '[class*="track-info"] [class*="prompt"]'
          ];
          for (const selector of detailSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              return { prompt: el.textContent.trim(), negativePrompt: null };
            }
          }
          return null;
        },
        extractSettings(document2) {
          const settings = {};
          const modelSelectors = [
            '[data-testid="model-selector"]',
            '[class*="model-selector"]',
            '[class*="ModelSelector"]',
            '[class*="version-badge"]',
            '[aria-label*="model" i]'
          ];
          for (const selector of modelSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.modelName = el.textContent.trim();
              break;
            }
          }
          const tagSelectors = [
            '[data-testid="genre-tags"]',
            '[class*="genre-tag"]',
            '[class*="style-tag"]',
            '[class*="TagInput"] [class*="tag"]',
            '[class*="genre-chips"] [class*="chip"]',
            '[class*="tag-list"] [class*="tag"]'
          ];
          const tags = [];
          for (const selector of tagSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const text = el.textContent?.trim();
              if (text) tags.push(text);
            });
            if (tags.length > 0) break;
          }
          if (tags.length > 0) {
            settings.tags = tags;
          }
          const instrumentalSelectors = [
            'input[data-testid="instrumental-toggle"]',
            '[class*="instrumental"] input[type="checkbox"]',
            '[aria-label*="instrumental" i]',
            'button[data-testid="instrumental-toggle"]',
            '[class*="instrumental"] [role="switch"]'
          ];
          for (const selector of instrumentalSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              settings.instrumental = el.checked || el.getAttribute("aria-checked") === "true" || el.getAttribute("aria-pressed") === "true";
              break;
            }
          }
          const qualitySelectors = [
            '[data-testid="quality-selector"]',
            '[class*="quality-selector"]',
            '[aria-label*="quality" i]'
          ];
          for (const selector of qualitySelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim()) {
              settings.quality = el.textContent.trim();
              break;
            }
          }
          const titleSelectors = [
            'input[data-testid="title-input"]',
            'input[placeholder*="title" i]',
            'input[aria-label*="title" i]',
            '[class*="title-input"] input'
          ];
          for (const selector of titleSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value?.trim()) {
              settings.title = el.value.trim();
              break;
            }
          }
          const seedSelectors = [
            'input[data-testid="seed-input"]',
            'input[aria-label*="seed" i]',
            'input[name="seed"]'
          ];
          for (const selector of seedSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.seed = parseInt(el.value, 10);
              break;
            }
          }
          return Object.keys(settings).length > 0 ? settings : null;
        },
        extractOutputs(document2) {
          const outputs = [];
          const audioSelectors = [
            '[data-testid="track-player"] audio',
            '[data-testid="audio-player"] audio',
            '[class*="audio-player"] audio',
            '[class*="AudioPlayer"] audio',
            '[class*="track-player"] audio',
            '[class*="TrackPlayer"] audio',
            '[class*="song-player"] audio',
            'audio[src*="udio"]',
            "audio[src]"
          ];
          for (const selector of audioSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const src = el.currentSrc || el.src || el.querySelector("source")?.src;
              if (src && src.startsWith("http")) {
                if (!outputs.some((o) => o.url === src)) {
                  outputs.push({
                    type: "audio",
                    url: src,
                    thumbnailUrl: null,
                    metadata: {
                      duration: el.duration || null
                    }
                  });
                }
              }
            });
          }
          const coverSelectors = [
            '[data-testid="track-cover"] img',
            '[class*="track-cover"] img',
            '[class*="TrackCover"] img',
            '[class*="cover-art"] img',
            '[class*="album-art"] img',
            '[class*="song-image"] img',
            'img[src*="udio"][class*="cover"]'
          ];
          for (const selector of coverSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      role: "cover-art"
                    }
                  });
                }
              }
            });
          }
          const downloadSelectors = [
            'a[download][href*="udio"]',
            'a[data-testid="download-button"]',
            'a[data-testid="download-audio"]',
            'button[data-testid="download-button"]'
          ];
          for (const selector of downloadSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const href = el.href || el.getAttribute("data-url");
              if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
                outputs.push({
                  type: "audio",
                  url: href,
                  thumbnailUrl: null,
                  metadata: {}
                });
              }
            });
          }
          const blobAudioSelectors = [
            'audio[src^="blob:"]',
            '[class*="track-player"] audio[src^="blob:"]'
          ];
          for (const selector of blobAudioSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      note: "blob-url-requires-page-context"
                    }
                  });
                }
              }
            });
          }
          return outputs;
        }
      };
      udio_default = UdioDetector;
    }
  });

  // chrome-extension/detectors/stable-audio.js
  var StableAudioDetector, stable_audio_default;
  var init_stable_audio = __esm({
    "chrome-extension/detectors/stable-audio.js"() {
      "use strict";
      StableAudioDetector = {
        platform: "stable-audio",
        displayName: "Stable Audio",
        category: "audio",
        urlPatterns: [
          /^https?:\/\/(www\.)?stableaudio\.com/i,
          /^https?:\/\/(www\.)?stability\.ai/i,
          /^https?:\/\/platform\.stability\.ai/i,
          /^https?:\/\/dreamstudio\.ai/i
        ],
        detect(url) {
          return this.urlPatterns.some((pattern) => pattern.test(url));
        },
        extractPrompt(document2) {
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
            '[contenteditable="true"][data-placeholder*="Describe" i]'
          ];
          let prompt = null;
          for (const selector of selectors) {
            const el = document2.querySelector(selector);
            if (!el) continue;
            const text = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
            if (text && text.length > 2) {
              prompt = text;
              break;
            }
          }
          if (!prompt) return null;
          let negativePrompt = null;
          const negSelectors = [
            'textarea[data-testid="negative-prompt"]',
            'textarea[placeholder*="Negative" i]',
            'textarea[aria-label*="negative" i]',
            '[class*="negative-prompt"] textarea',
            '[data-testid="negative-prompt-input"]',
            'input[placeholder*="Negative" i]'
          ];
          for (const selector of negSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              const val = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value?.trim() : el.textContent?.trim();
              if (val) {
                negativePrompt = val;
                break;
              }
            }
          }
          return { prompt, negativePrompt };
        },
        extractSettings(document2) {
          const settings = {};
          const modelSelectors = [
            '[data-testid="model-selector"]',
            '[class*="model-selector"]',
            '[class*="ModelSelector"]',
            '[aria-label*="model" i]',
            'select[class*="model"]',
            '[class*="model-name"]'
          ];
          for (const selector of modelSelectors) {
            const el = document2.querySelector(selector);
            if (el?.textContent?.trim() || el?.value) {
              settings.modelName = el.value || el.textContent.trim();
              break;
            }
          }
          const durationSelectors = [
            'input[data-testid="duration-input"]',
            'input[data-testid="duration-slider"]',
            'input[aria-label*="duration" i]',
            '[class*="duration-control"] input',
            '[class*="DurationSlider"] input',
            'input[name="duration"]',
            '[data-testid="duration-selector"]'
          ];
          for (const selector of durationSelectors) {
            const el = document2.querySelector(selector);
            if (el) {
              const val = el.value || el.getAttribute("aria-valuenow");
              if (val) {
                settings.duration = val;
                break;
              }
            }
          }
          if (!settings.duration) {
            const durationTextSelectors = [
              '[class*="duration-display"]',
              '[class*="duration-value"]',
              '[data-testid="duration-value"]'
            ];
            for (const selector of durationTextSelectors) {
              const el = document2.querySelector(selector);
              if (el?.textContent?.trim()) {
                settings.duration = el.textContent.trim();
                break;
              }
            }
          }
          const sampleRateSelectors = [
            '[data-testid="sample-rate"]',
            'select[aria-label*="sample rate" i]',
            '[class*="sample-rate"] select'
          ];
          for (const selector of sampleRateSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value || el?.textContent?.trim()) {
              settings.sampleRate = el.value || el.textContent.trim();
              break;
            }
          }
          const stepsSelectors = [
            'input[data-testid="steps-input"]',
            'input[aria-label*="steps" i]',
            '[class*="steps-slider"] input',
            '[data-testid="inference-steps"] input'
          ];
          for (const selector of stepsSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.steps = parseInt(el.value, 10);
              break;
            }
          }
          const cfgSelectors = [
            'input[data-testid="cfg-input"]',
            'input[aria-label*="guidance" i]',
            'input[aria-label*="cfg" i]',
            '[class*="cfg-slider"] input',
            '[data-testid="guidance-scale"] input'
          ];
          for (const selector of cfgSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.guidanceScale = parseFloat(el.value);
              break;
            }
          }
          const seedSelectors = [
            'input[data-testid="seed-input"]',
            'input[aria-label*="seed" i]',
            'input[name="seed"]'
          ];
          for (const selector of seedSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.seed = parseInt(el.value, 10);
              break;
            }
          }
          const countSelectors = [
            '[data-testid="num-results"]',
            'input[aria-label*="number" i]',
            '[class*="batch-size"] input'
          ];
          for (const selector of countSelectors) {
            const el = document2.querySelector(selector);
            if (el?.value) {
              settings.batchSize = parseInt(el.value, 10);
              break;
            }
          }
          return Object.keys(settings).length > 0 ? settings : null;
        },
        extractOutputs(document2) {
          const outputs = [];
          const audioSelectors = [
            '[data-testid="audio-player"] audio',
            '[data-testid="generation-audio"] audio',
            '[class*="audio-player"] audio',
            '[class*="AudioPlayer"] audio',
            '[class*="generation-result"] audio',
            '[class*="OutputPlayer"] audio',
            'audio[src*="stability"]',
            'audio[src*="stableaudio"]',
            "audio[src]"
          ];
          for (const selector of audioSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const src = el.currentSrc || el.src || el.querySelector("source")?.src;
              if (src && src.startsWith("http")) {
                if (!outputs.some((o) => o.url === src)) {
                  outputs.push({
                    type: "audio",
                    url: src,
                    thumbnailUrl: null,
                    metadata: {
                      duration: el.duration || null
                    }
                  });
                }
              }
            });
          }
          const sourceElements = document2.querySelectorAll("audio source[src]");
          sourceElements.forEach((el) => {
            const src = el.src;
            if (src && src.startsWith("http") && !outputs.some((o) => o.url === src)) {
              outputs.push({
                type: "audio",
                url: src,
                thumbnailUrl: null,
                metadata: {
                  mimeType: el.type || null
                }
              });
            }
          });
          const waveformSelectors = [
            '[data-testid="waveform"][data-src]',
            '[class*="waveform"][data-audio-src]',
            '[class*="Waveform"][data-src]'
          ];
          for (const selector of waveformSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const src = el.getAttribute("data-src") || el.getAttribute("data-audio-src");
              if (src && src.startsWith("http") && !outputs.some((o) => o.url === src)) {
                outputs.push({
                  type: "audio",
                  url: src,
                  thumbnailUrl: null,
                  metadata: {}
                });
              }
            });
          }
          const imageSelectors = [
            '[data-testid="generated-image"] img',
            '[class*="generation-result"] img',
            '[class*="output-grid"] img',
            'img[src*="stability"]:not([class*="logo"]):not([class*="avatar"])',
            'img[src*="dreamstudio"]:not([class*="logo"])'
          ];
          for (const selector of imageSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      height: el.naturalHeight || null
                    }
                  });
                }
              }
            });
          }
          const downloadSelectors = [
            'a[download][href*="stability"]',
            'a[download][href*="stableaudio"]',
            'a[data-testid="download-button"]',
            'a[data-testid="download-audio"]',
            'button[data-testid="download-button"]'
          ];
          for (const selector of downloadSelectors) {
            const elements = document2.querySelectorAll(selector);
            elements.forEach((el) => {
              const href = el.href || el.getAttribute("data-url");
              if (href && href.startsWith("http") && !outputs.some((o) => o.url === href)) {
                const isAudio = /\.(mp3|wav|flac|ogg|aac|m4a)/i.test(href);
                const isImage = /\.(png|jpg|jpeg|webp)/i.test(href);
                outputs.push({
                  type: isImage ? "image" : "audio",
                  url: href,
                  thumbnailUrl: null,
                  metadata: {}
                });
              }
            });
          }
          const blobAudioSelectors = [
            'audio[src^="blob:"]',
            '[class*="audio-player"] audio[src^="blob:"]'
          ];
          for (const selector of blobAudioSelectors) {
            const elements = document2.querySelectorAll(selector);
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
                      note: "blob-url-requires-page-context"
                    }
                  });
                }
              }
            });
          }
          return outputs;
        }
      };
      stable_audio_default = StableAudioDetector;
    }
  });

  // chrome-extension/detectors/index.js
  function detectPlatform(url) {
    if (!url || typeof url !== "string") return null;
    for (const detector of DETECTORS) {
      try {
        if (detector.detect(url)) {
          return detector;
        }
      } catch (e) {
        console.warn(`[detectors] ${detector.platform} threw on URL "${url}":`, e);
      }
    }
    return null;
  }
  var DETECTORS;
  var init_detectors = __esm({
    "chrome-extension/detectors/index.js"() {
      "use strict";
      init_sora();
      init_gemini_veo();
      init_freepik();
      init_midjourney();
      init_runway();
      init_kling();
      init_luma();
      init_leonardo();
      init_ideogram();
      init_adobe_firefly();
      init_flux();
      init_elevenlabs();
      init_suno();
      init_udio();
      init_stable_audio();
      DETECTORS = [
        sora_default,
        gemini_veo_default,
        freepik_default,
        midjourney_default,
        runway_default,
        kling_default,
        luma_default,
        leonardo_default,
        ideogram_default,
        adobe_firefly_default,
        flux_default,
        elevenlabs_default,
        suno_default,
        udio_default,
        stable_audio_default
      ];
    }
  });

  // chrome-extension/src/messaging.js
  async function ensureContentScript(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: "__ping__" });
      return true;
    } catch {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["dist/content-script.js"]
        });
        return true;
      } catch (injectErr) {
        throw new Error(
          `Cannot reach page: ${injectErr.message || "injection failed"}`
        );
      }
    }
  }
  function sendMessageWithTimeout(tabId, message, timeoutMs = 1e4) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Content script did not respond within timeout"));
      }, timeoutMs);
      ensureContentScript(tabId).then(() => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          clearTimeout(timer);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      }).catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }
  var init_messaging = __esm({
    "chrome-extension/src/messaging.js"() {
      "use strict";
    }
  });

  // chrome-extension/src/utils.js
  function normalizeTags(raw) {
    const seen = /* @__PURE__ */ new Set();
    const tags = [];
    String(raw || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).forEach((t) => {
      if (!seen.has(t)) {
        seen.add(t);
        tags.push(t);
      }
    });
    return tags;
  }
  function parseMetadata(raw) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return void 0;
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Metadata JSON must be an object.");
    }
    return parsed;
  }
  function formatRelativeTime(isoString) {
    if (!isoString) return "";
    const then = new Date(isoString).getTime();
    if (!Number.isFinite(then)) return "";
    const seconds = Math.max(0, Math.floor((Date.now() - then) / 1e3));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
  function placeholderThumb() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='36'%3E%3Crect width='48' height='36' fill='%230d1319'/%3E%3C/svg%3E";
  }
  var init_utils = __esm({
    "chrome-extension/src/utils.js"() {
      "use strict";
    }
  });

  // chrome-extension/src/compare.js
  var compare_exports = {};
  __export(compare_exports, {
    clearCompareSelections: () => clearCompareSelections,
    closeCompare: () => closeCompare,
    openCompare: () => openCompare,
    toggleCompareSelect: () => toggleCompareSelect,
    updateCompareBar: () => updateCompareBar
  });
  function toggleCompareSelect(assetId) {
    const idx = state_default.compareIds.indexOf(assetId);
    if (idx >= 0) {
      state_default.compareIds = [
        ...state_default.compareIds.slice(0, idx),
        ...state_default.compareIds.slice(idx + 1)
      ];
    } else {
      if (state_default.compareIds.length >= MAX_COMPARE) {
        setStatus(`Compare limit: max ${MAX_COMPARE} versions.`, true);
        return;
      }
      state_default.compareIds = [...state_default.compareIds, assetId];
    }
    updateCompareBar();
    renderReuseList();
  }
  function updateCompareBar() {
    const count = state_default.compareIds.length;
    if (dom.compareBar) {
      dom.compareBar.classList.toggle("hidden", count === 0);
    }
    if (dom.compareCount) {
      dom.compareCount.textContent = String(count);
    }
  }
  function openCompare() {
    if (state_default.compareIds.length < 2) {
      setStatus("Select at least 2 versions to compare.", true);
      return;
    }
    state_default.compareOpen = true;
    dom.compareOverlay.classList.remove("hidden");
    renderCompareGrid();
  }
  function closeCompare() {
    state_default.compareOpen = false;
    dom.compareOverlay.classList.add("hidden");
  }
  function clearCompareSelections() {
    state_default.compareIds = [];
    state_default.compareOpen = false;
    dom.compareOverlay.classList.add("hidden");
    updateCompareBar();
    renderReuseList();
  }
  function renderCompareGrid() {
    const grid = dom.compareGrid;
    grid.innerHTML = "";
    const assets = state_default.sceneAssets.filter(
      (a) => state_default.compareIds.includes(a.id)
    );
    if (assets.length === 0) {
      grid.innerHTML = '<div class="sp-empty">No versions selected.</div>';
      return;
    }
    assets.forEach((asset) => {
      const card = document.createElement("div");
      card.className = `sp-compare-card${asset.selected ? " winner" : ""}`;
      const img = document.createElement("img");
      img.className = "sp-compare-thumb";
      img.src = asset.thumbnailUrl || placeholderThumb();
      img.alt = `${asset.platformLabel} v${asset.versionNumber}`;
      const info = document.createElement("div");
      info.className = "sp-compare-info";
      const platform = document.createElement("span");
      platform.className = "sp-compare-platform";
      platform.textContent = asset.platformLabel;
      const version = document.createElement("span");
      version.className = "sp-compare-version";
      version.textContent = `${asset.assetType} v${asset.versionNumber}`;
      const prompt = document.createElement("p");
      prompt.className = "sp-compare-prompt";
      prompt.textContent = (asset.prompt || "").substring(0, 50) + (asset.prompt?.length > 50 ? "..." : "");
      info.appendChild(platform);
      info.appendChild(version);
      info.appendChild(prompt);
      const starBtn = document.createElement("button");
      starBtn.type = "button";
      starBtn.className = `sp-star-btn${asset.selected ? " active" : ""}`;
      starBtn.title = asset.selected ? "Remove winner" : "Mark as winner";
      starBtn.innerHTML = asset.selected ? '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1l1.8 3.6L13 5.2l-3 2.9.7 4.1L7 10.3 3.3 12.2l.7-4.1-3-2.9 4.2-.6L7 1z" fill="#eab308" stroke="#eab308" stroke-width="1"/></svg>' : '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1l1.8 3.6L13 5.2l-3 2.9.7 4.1L7 10.3 3.3 12.2l.7-4.1-3-2.9 4.2-.6L7 1z" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
      starBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const newSelected = !asset.selected;
        try {
          starBtn.disabled = true;
          if (newSelected) {
            state_default.sceneAssets.forEach((a) => {
              if (a.assetType === asset.assetType && a.id !== asset.id) {
                a.selected = false;
                a.status = "GENERATED";
              }
            });
          }
          asset.selected = newSelected;
          asset.status = newSelected ? "SELECTED" : "GENERATED";
          renderCompareGrid();
          renderReuseList();
          await updateAsset(asset.id, { selected: newSelected });
          setStatus(
            newSelected ? `Winner: ${asset.platformLabel} v${asset.versionNumber}` : "Winner removed."
          );
        } catch (err) {
          asset.selected = !newSelected;
          asset.status = !newSelected ? "SELECTED" : "GENERATED";
          renderCompareGrid();
          renderReuseList();
          setStatus(err.message, true);
        }
      });
      card.appendChild(img);
      card.appendChild(info);
      card.appendChild(starBtn);
      grid.appendChild(card);
    });
  }
  var MAX_COMPARE;
  var init_compare = __esm({
    "chrome-extension/src/compare.js"() {
      "use strict";
      init_dom();
      init_state();
      init_api();
      init_utils();
      init_render();
      MAX_COMPARE = 6;
    }
  });

  // chrome-extension/src/render.js
  function renderShotCard() {
    const sceneId = dom.ctxSceneSelect.value;
    const scene = state_default.scenes.find((s) => s.sceneId === sceneId);
    if (!scene) {
      dom.ctxShotCard.innerHTML = '<div class="sp-empty">Select a scene above to see details.</div>';
      return;
    }
    const versionCount = state_default.sceneAssets.length;
    const selectedCount = state_default.sceneAssets.filter((a) => a.selected).length;
    const types = [...new Set(state_default.sceneAssets.map((a) => a.assetType))].join(", ") || "none";
    dom.ctxShotCard.innerHTML = `
    <div class="sp-context-info">
      <div class="sp-ctx-scene-id">${scene.sceneId}</div>
      <div class="sp-ctx-beat">${scene.storyBeat || "No story beat"}</div>
      <div class="sp-ctx-versions">${versionCount} version(s), ${selectedCount} selected -- Types: ${types}</div>
    </div>
  `;
  }
  function updateContextBar() {
    const projectId = dom.ctxProjectSelect.value;
    const sceneId = dom.ctxSceneSelect.value;
    const project = state_default.projects.find((p) => p.id === projectId);
    const scene = state_default.scenes.find((s) => s.sceneId === sceneId);
    if (project && scene) {
      dom.capContextLabel.textContent = `${project.name} / ${scene.sceneId}`;
    } else if (project) {
      dom.capContextLabel.textContent = `${project.name} / --`;
    } else {
      dom.capContextLabel.textContent = "No context set";
    }
  }
  function renderReuseList() {
    const container = dom.reuseAssetList;
    container.innerHTML = "";
    const typeFilter = state_default.reuseFilterType || "ALL";
    const searchQuery = (state_default.reuseSearchQuery || "").toLowerCase().trim();
    const filtered = state_default.sceneAssets.filter((asset) => {
      if (typeFilter !== "ALL" && asset.assetType !== typeFilter) return false;
      if (searchQuery && !(asset.prompt || "").toLowerCase().includes(searchQuery) && !(asset.title || "").toLowerCase().includes(searchQuery) && !(asset.platformLabel || "").toLowerCase().includes(searchQuery))
        return false;
      return true;
    });
    if (state_default.sceneAssets.length === 0) {
      container.innerHTML = '<div class="sp-empty">No versions yet. Capture something first.</div>';
      return;
    }
    if (filtered.length === 0) {
      container.innerHTML = '<div class="sp-empty">No matching versions.</div>';
      return;
    }
    filtered.forEach((asset) => {
      const row = document.createElement("div");
      row.className = `sp-reuse-item${asset.selected ? " selected-asset" : ""}`;
      const checkbox = document.createElement("button");
      checkbox.type = "button";
      checkbox.className = `sp-compare-check${state_default.compareIds.includes(asset.id) ? " checked" : ""}`;
      checkbox.title = "Add to compare";
      checkbox.addEventListener("click", async (e) => {
        e.stopPropagation();
        const { toggleCompareSelect: toggleCompareSelect2 } = await Promise.resolve().then(() => (init_compare(), compare_exports));
        toggleCompareSelect2(asset.id);
      });
      const thumb = document.createElement("img");
      thumb.className = "sp-reuse-thumb";
      thumb.alt = `${asset.platformLabel} preview`;
      thumb.src = asset.thumbnailUrl || placeholderThumb();
      const meta = document.createElement("div");
      meta.className = "sp-reuse-meta";
      const title = document.createElement("div");
      title.className = "sp-reuse-title";
      title.textContent = `${asset.platformLabel} -- ${asset.assetType} v${asset.versionNumber}`;
      const sub = document.createElement("div");
      sub.className = "sp-reuse-sub";
      const timestamp = formatRelativeTime(asset.createdAt);
      const promptPreview = (asset.prompt || "").substring(0, 60);
      sub.textContent = `${asset.status}${timestamp ? " -- " + timestamp : ""}${promptPreview ? " -- " + promptPreview + "..." : ""}`;
      meta.appendChild(title);
      meta.appendChild(sub);
      const actions = document.createElement("div");
      actions.className = "sp-reuse-actions";
      const starBtn = document.createElement("button");
      starBtn.type = "button";
      starBtn.className = `sp-star-btn${asset.selected ? " active" : ""}`;
      starBtn.title = asset.selected ? "Remove winner" : "Mark as winner";
      starBtn.innerHTML = asset.selected ? '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1l1.8 3.6L13 5.2l-3 2.9.7 4.1L7 10.3 3.3 12.2l.7-4.1-3-2.9 4.2-.6L7 1z" fill="#eab308" stroke="#eab308" stroke-width="1"/></svg>' : '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1l1.8 3.6L13 5.2l-3 2.9.7 4.1L7 10.3 3.3 12.2l.7-4.1-3-2.9 4.2-.6L7 1z" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
      starBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const newSelected = !asset.selected;
        try {
          starBtn.disabled = true;
          if (newSelected) {
            state_default.sceneAssets.forEach((a) => {
              if (a.assetType === asset.assetType && a.id !== asset.id) {
                a.selected = false;
                a.status = "GENERATED";
              }
            });
          }
          asset.selected = newSelected;
          asset.status = newSelected ? "SELECTED" : "GENERATED";
          renderReuseList();
          await updateAsset(asset.id, { selected: newSelected });
          setStatus(
            newSelected ? `Winner: ${asset.platformLabel} v${asset.versionNumber}` : "Winner removed."
          );
        } catch (err) {
          asset.selected = !newSelected;
          asset.status = !newSelected ? "SELECTED" : "GENERATED";
          renderReuseList();
          setStatus(err.message, true);
        }
      });
      const loadBtn = document.createElement("button");
      loadBtn.type = "button";
      loadBtn.className = "sp-btn sp-btn-ghost";
      loadBtn.textContent = "Load";
      loadBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const { applySceneAssetToCapture: applySceneAssetToCapture2 } = await Promise.resolve().then(() => (init_capture(), capture_exports));
        applySceneAssetToCapture2(asset.id);
        setActiveMode("capture");
        setStatus(
          `Loaded prompt from ${asset.platformLabel} v${asset.versionNumber}.`
        );
      });
      const applyBtn = document.createElement("button");
      applyBtn.type = "button";
      applyBtn.className = "sp-btn sp-btn-ghost";
      applyBtn.textContent = "Apply";
      applyBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          applyBtn.disabled = true;
          const { applyPromptToPage: applyPromptToPage2 } = await Promise.resolve().then(() => (init_detect(), detect_exports));
          await applyPromptToPage2(asset.prompt || "");
          setStatus("Prompt applied to page.");
        } catch (err) {
          setStatus(err.message, true);
        } finally {
          applyBtn.disabled = false;
        }
      });
      actions.appendChild(starBtn);
      actions.appendChild(loadBtn);
      actions.appendChild(applyBtn);
      row.appendChild(checkbox);
      row.appendChild(thumb);
      row.appendChild(meta);
      row.appendChild(actions);
      container.appendChild(row);
    });
  }
  function renderCharacterCards() {
    const container = dom.ctxCharactersList;
    if (!container) return;
    container.innerHTML = "";
    if (state_default.characters.length === 0) {
      container.innerHTML = '<div class="sp-empty">No characters in this project.</div>';
      return;
    }
    state_default.characters.forEach((char) => {
      const card = document.createElement("div");
      card.className = "sp-char-card";
      const portrait = document.createElement("div");
      portrait.className = "sp-char-portrait";
      if (char.portraitUrl) {
        const img = document.createElement("img");
        img.src = char.portraitUrl;
        img.alt = char.name;
        portrait.appendChild(img);
      } else {
        portrait.textContent = (char.name || "?")[0].toUpperCase();
      }
      const info = document.createElement("div");
      info.className = "sp-char-info";
      const name = document.createElement("div");
      name.className = "sp-char-name";
      name.textContent = char.name;
      const role = document.createElement("div");
      role.className = "sp-char-role";
      role.textContent = char.role;
      info.appendChild(name);
      info.appendChild(role);
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "sp-char-copy-btn";
      copyBtn.title = "Copy character prompt";
      copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
      copyBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const visual = (char.visualCues || []).join("; ");
        const text = [
          `Character: ${char.name} (${char.role})`,
          char.coreIdentity ? `Identity: ${char.coreIdentity}` : "",
          visual ? `Visual: ${visual}` : ""
        ].filter(Boolean).join("\n");
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
          setTimeout(() => {
            copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
          }, 1500);
        } catch {
          setStatus("Failed to copy.", true);
        }
      });
      card.appendChild(portrait);
      card.appendChild(info);
      card.appendChild(copyBtn);
      container.appendChild(card);
    });
  }
  function renderPreviewList() {
    const container = dom.queuePreviewList;
    container.innerHTML = "";
    const items = state_default.sceneAssets.slice(0, 6);
    if (items.length === 0) {
      container.innerHTML = '<div class="sp-empty">No synced versions yet.</div>';
      return;
    }
    items.forEach((asset) => {
      const row = document.createElement("div");
      row.className = "sp-preview-item";
      const thumb = document.createElement("img");
      thumb.className = "sp-preview-thumb";
      thumb.alt = `${asset.platformLabel} preview`;
      thumb.src = asset.thumbnailUrl || placeholderThumb();
      const meta = document.createElement("div");
      meta.className = "sp-preview-meta";
      const title = document.createElement("div");
      title.className = "sp-preview-title";
      title.textContent = `${asset.platformLabel} -- ${asset.assetType} v${asset.versionNumber}`;
      const sub = document.createElement("div");
      sub.className = "sp-preview-sub";
      const timestamp = formatRelativeTime(asset.createdAt);
      sub.textContent = `${asset.status}${asset.selected ? " -- selected" : ""}${timestamp ? " -- " + timestamp : ""}`;
      meta.appendChild(title);
      meta.appendChild(sub);
      row.appendChild(thumb);
      row.appendChild(meta);
      container.appendChild(row);
    });
  }
  var init_render = __esm({
    "chrome-extension/src/render.js"() {
      "use strict";
      init_dom();
      init_state();
      init_api();
      init_utils();
    }
  });

  // chrome-extension/src/drafts.js
  function getCurrentDraftKey() {
    const projectId = dom.ctxProjectSelect.value;
    const sceneId = dom.ctxSceneSelect.value;
    if (!projectId || !sceneId) return "";
    return `${projectId}::${sceneId}`;
  }
  function collectCaptureFormState() {
    let metadata = null;
    try {
      metadata = parseMetadata(dom.capMetadata.value) || null;
    } catch {
      metadata = null;
    }
    return {
      projectId: dom.ctxProjectSelect.value,
      sceneId: dom.ctxSceneSelect.value,
      platformKey: dom.capPlatformSelect.value,
      platformLabel: state_default.platforms.find((p) => p.slug === dom.capPlatformSelect.value)?.name || "",
      assetType: dom.capAssetType.value,
      status: dom.capAssetStatus.value,
      title: dom.capTitle.value.trim(),
      prompt: dom.capPrompt.value.trim(),
      negativePrompt: dom.capNegPrompt.value.trim(),
      modelName: dom.capModelName.value.trim(),
      sourceUrl: dom.capSourceUrl.value.trim(),
      outputUrl: dom.capOutputUrl.value.trim(),
      thumbnailUrl: dom.capThumbUrl.value.trim(),
      externalAssetId: dom.capExternalId.value.trim(),
      tags: normalizeTags(dom.capTags.value),
      metadata,
      notes: dom.capNotes.value.trim(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  async function saveSceneDraft() {
    const key = getCurrentDraftKey();
    if (!key) return;
    const config = state_default.configCache || await getConfig();
    const nextDrafts = {
      ...config.sceneDrafts || {},
      [key]: collectCaptureFormState()
    };
    await saveConfig({ sceneDrafts: nextDrafts });
  }
  async function restoreSceneDraft() {
    const key = getCurrentDraftKey();
    if (!key) return false;
    const config = state_default.configCache || await getConfig();
    const draft = config.sceneDrafts?.[key];
    if (!draft) return false;
    const { hydrateCapture: hydrateCapture2 } = await Promise.resolve().then(() => (init_capture(), capture_exports));
    hydrateCapture2(draft);
    return true;
  }
  async function clearSceneDraft() {
    const key = getCurrentDraftKey();
    if (!key) return false;
    const config = state_default.configCache || await getConfig();
    if (!config.sceneDrafts?.[key]) return false;
    const nextDrafts = { ...config.sceneDrafts };
    delete nextDrafts[key];
    await saveConfig({ sceneDrafts: nextDrafts });
    return true;
  }
  function scheduleSceneDraftSave() {
    if (state_default.draftSaveTimer) clearTimeout(state_default.draftSaveTimer);
    state_default.draftSaveTimer = setTimeout(() => {
      saveSceneDraft().catch((err) => {
        console.warn("[sidepanel]", err.message);
      });
    }, 300);
  }
  var init_drafts = __esm({
    "chrome-extension/src/drafts.js"() {
      "use strict";
      init_config();
      init_dom();
      init_state();
      init_utils();
    }
  });

  // chrome-extension/src/intent.js
  var intent_exports = {};
  __export(intent_exports, {
    pickPreferredPlatformForType: () => pickPreferredPlatformForType,
    refreshIntentSuggestions: () => refreshIntentSuggestions
  });
  function pickPreferredPlatformForType(assetType) {
    const preferredOrder = {
      VIDEO: [
        "openai-sora",
        "google-veo",
        "runway",
        "kling-ai",
        "luma-dream-machine",
        "pika"
      ],
      IMAGE: [
        "midjourney",
        "ideogram",
        "bfl-flux",
        "freepik-ai",
        "adobe-firefly"
      ],
      MUSIC: ["suno", "udio"],
      AUDIO: ["suno", "elevenlabs", "playht"],
      VOICE: ["elevenlabs", "playht", "murf"],
      NARRATION: ["elevenlabs", "playht", "murf"],
      STORYBOARD: ["midjourney", "freepik-ai", "adobe-firefly"],
      SCRIPT: ["openai-sora"],
      OTHER: []
    };
    const slugs = preferredOrder[assetType] || [];
    for (const slug of slugs) {
      const match = state_default.platforms.find((p) => p.slug === slug);
      if (match) return match;
    }
    return state_default.platforms.find(
      (p) => (p.supportedOutput || []).includes(assetType)
    ) || null;
  }
  function refreshIntentSuggestions() {
    const suggestions = [];
    const config = state_default.configCache || {};
    const sceneId = dom.ctxSceneSelect.value;
    const currentType = dom.capAssetType.value;
    const currentPlatform = dom.capPlatformSelect.value;
    const draftKey = getCurrentDraftKey();
    const draft = draftKey ? config.sceneDrafts?.[draftKey] : null;
    if (draft && draft.prompt && draft.prompt !== dom.capPrompt.value.trim()) {
      suggestions.push({
        label: "Restore Draft",
        reason: `Unsynced draft found for ${sceneId}.`,
        run: () => {
          hydrateCapture(draft);
          setActiveMode("capture");
          setStatus("Restored unsynced draft.");
        }
      });
    }
    const lastCapture = config.lastCapture;
    if (lastCapture && lastCapture.sceneId === sceneId && lastCapture.projectId === dom.ctxProjectSelect.value) {
      suggestions.push({
        label: "Continue Last",
        reason: `Last: ${lastCapture.assetType} on ${lastCapture.platformLabel || lastCapture.platformKey}.`,
        run: () => {
          hydrateCapture(lastCapture);
          dom.capAssetStatus.value = "GENERATED";
          setActiveMode("capture");
          setStatus("Loaded previous capture context.");
        }
      });
    }
    const history = Array.isArray(config.captureHistory) ? config.captureHistory : [];
    const recurring = history.filter(
      (i) => i.sceneId === sceneId && i.assetType === currentType && i.platformKey === currentPlatform
    ).slice(-1)[0] || null;
    if (recurring && recurring.modelName && !dom.capModelName.value.trim()) {
      suggestions.push({
        label: "Use Last Model",
        reason: `Previous ${currentType} used ${recurring.modelName}.`,
        run: () => {
          dom.capModelName.value = recurring.modelName;
          setActiveMode("capture");
          setStatus("Applied model suggestion.");
        }
      });
    }
    const selectedSameType = state_default.sceneAssets.find(
      (a) => a.selected && a.assetType === currentType
    );
    if (selectedSameType) {
      suggestions.push({
        label: "Variant From Selected",
        reason: `Selected ${currentType} v${selectedSameType.versionNumber} in scene.`,
        run: () => {
          applySceneAssetToCapture(selectedSameType.id);
          dom.capAssetStatus.value = "GENERATED";
          setActiveMode("capture");
          setStatus("Prepared variant from selected version.");
        }
      });
    }
    const selectedImage = state_default.sceneAssets.find((a) => a.selected && a.assetType === "IMAGE") || state_default.sceneAssets.find((a) => a.selected && a.assetType === "STORYBOARD");
    const hasVideo = state_default.sceneAssets.some((a) => a.assetType === "VIDEO");
    if (selectedImage && !hasVideo) {
      suggestions.push({
        label: "Prep Video Pass",
        reason: "Scene has selected image but no video yet.",
        run: () => {
          applySceneAssetToCapture(selectedImage.id);
          dom.capAssetType.value = "VIDEO";
          dom.capAssetStatus.value = "GENERATED";
          const preferred = pickPreferredPlatformForType("VIDEO");
          if (preferred) dom.capPlatformSelect.value = preferred.slug;
          setActiveMode("capture");
          setStatus("Prepared video pass draft.");
        }
      });
    }
    if (state_default.lastPageContext && state_default.lastPageContext.prompt && !dom.capPrompt.value.trim()) {
      suggestions.push({
        label: "Use Page Prompt",
        reason: "Detected prompt in current tab.",
        run: async () => {
          const { applyPageContextToCapture: applyPageContextToCapture2 } = await Promise.resolve().then(() => (init_capture(), capture_exports));
          applyPageContextToCapture2(state_default.lastPageContext);
          dom.capAssetStatus.value = "GENERATED";
          setActiveMode("capture");
          setStatus("Applied detected page prompt.");
        }
      });
    }
    dom.ctxIntentActions.innerHTML = "";
    if (suggestions.length === 0) {
      dom.ctxIntentBox.classList.add("hidden");
      dom.ctxIntentText.textContent = "";
      return;
    }
    dom.ctxIntentBox.classList.remove("hidden");
    dom.ctxIntentText.textContent = `Smart intent: ${suggestions[0].reason}`;
    suggestions.slice(0, 3).forEach((sug) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sp-btn sp-btn-ghost";
      btn.textContent = sug.label;
      btn.addEventListener("click", async () => {
        try {
          btn.disabled = true;
          await sug.run();
          refreshIntentSuggestions();
        } catch (err) {
          setStatus(err.message, true);
        } finally {
          btn.disabled = false;
        }
      });
      dom.ctxIntentActions.appendChild(btn);
    });
  }
  var init_intent = __esm({
    "chrome-extension/src/intent.js"() {
      "use strict";
      init_dom();
      init_state();
      init_drafts();
      init_capture();
    }
  });

  // chrome-extension/src/data-loaders.js
  var data_loaders_exports = {};
  __export(data_loaders_exports, {
    loadProjectsAndPlatforms: () => loadProjectsAndPlatforms,
    loadSceneAssets: () => loadSceneAssets,
    loadScenes: () => loadScenes
  });
  async function loadProjectsAndPlatforms() {
    const [projectData, platformData] = await Promise.all([
      fetchApi("/api/extension/projects"),
      fetchApi("/api/extension/platforms")
    ]);
    state_default.projects = projectData.projects || [];
    state_default.platforms = platformData.platforms || [];
    populateSelect(
      dom.ctxProjectSelect,
      state_default.projects,
      (p) => p.id,
      (p) => `${p.name} (${p.sceneCount})`
    );
    populateSelect(
      dom.capPlatformSelect,
      state_default.platforms,
      (p) => p.slug,
      (p) => p.provider ? `${p.name} -- ${p.provider}` : p.name
    );
  }
  async function loadScenes(projectId) {
    if (!projectId) {
      state_default.scenes = [];
      dom.ctxSceneSelect.innerHTML = "";
      return;
    }
    const sceneData = await fetchApi(
      `/api/extension/scenes?projectId=${encodeURIComponent(projectId)}`
    );
    state_default.scenes = sceneData.scenes || [];
    populateSelect(
      dom.ctxSceneSelect,
      state_default.scenes,
      (s) => s.sceneId,
      (s) => `${s.sceneId} -- ${s.storyBeat}`
    );
  }
  async function loadSceneAssets(projectId, sceneId) {
    if (!projectId || !sceneId) {
      state_default.sceneAssets = [];
      renderShotCard();
      renderReuseList();
      renderPreviewList();
      return;
    }
    const data = await fetchApi(
      `/api/extension/scene-assets?projectId=${encodeURIComponent(projectId)}&sceneId=${encodeURIComponent(sceneId)}&limit=40`
    );
    state_default.sceneAssets = data.assets || [];
    renderShotCard();
    renderReuseList();
    renderPreviewList();
    const { refreshIntentSuggestions: refreshIntentSuggestions2 } = await Promise.resolve().then(() => (init_intent(), intent_exports));
    refreshIntentSuggestions2();
  }
  var init_data_loaders = __esm({
    "chrome-extension/src/data-loaders.js"() {
      "use strict";
      init_api();
      init_dom();
      init_state();
      init_render();
    }
  });

  // chrome-extension/src/queue.js
  async function loadQueueFromStorage() {
    const data = await chrome.storage.local.get("syncQueue");
    state_default.localQueueMirror = data.syncQueue || [];
    renderQueueList();
  }
  function renderQueueList() {
    const container = dom.queueList;
    container.innerHTML = "";
    dom.queueCount.textContent = String(state_default.localQueueMirror.length);
    const typeFilter = state_default.queueFilterType || "ALL";
    const filtered = state_default.localQueueMirror.filter((item) => {
      if (typeFilter === "ALL") return true;
      return item.payload?.assetType === typeFilter;
    });
    if (state_default.localQueueMirror.length === 0) {
      container.innerHTML = '<div class="sp-empty">Queue is empty. All synced.</div>';
      return;
    }
    if (filtered.length === 0) {
      container.innerHTML = '<div class="sp-empty">No matching items.</div>';
      return;
    }
    filtered.forEach((item) => {
      const row = document.createElement("div");
      row.className = "sp-queue-item";
      const info = document.createElement("div");
      info.className = "sp-queue-item-info";
      const title = document.createElement("div");
      title.className = "sp-queue-item-title";
      title.textContent = item.payload?.title || item.payload?.prompt?.substring(0, 50) || "Untitled";
      const sub = document.createElement("div");
      sub.className = "sp-queue-item-sub";
      const retries = item.retryCount || 0;
      sub.textContent = `${item.payload?.assetType || "?"} -- ${item.payload?.platformKey || "?"} -- queued ${formatRelativeTime(item.queuedAt)}${retries > 0 ? ` -- retry ${retries}` : ""}`;
      info.appendChild(title);
      info.appendChild(sub);
      const badge = document.createElement("span");
      if (retries >= 5) {
        badge.className = "sp-badge failed";
        badge.textContent = "Failed";
      } else if (retries > 0) {
        badge.className = "sp-badge queued";
        badge.textContent = `Retry ${retries}`;
      } else {
        badge.className = "sp-badge queued";
        badge.textContent = "Queued";
      }
      row.appendChild(info);
      row.appendChild(badge);
      container.appendChild(row);
    });
  }
  function addOptimisticQueueItem(payload) {
    const item = {
      id: crypto.randomUUID(),
      retryCount: 0,
      queuedAt: (/* @__PURE__ */ new Date()).toISOString(),
      payload
    };
    state_default.localQueueMirror = [...state_default.localQueueMirror, item];
    renderQueueList();
    return item;
  }
  function removeOptimisticQueueItem(id) {
    state_default.localQueueMirror = state_default.localQueueMirror.filter((q) => q.id !== id);
    renderQueueList();
  }
  function markOptimisticSynced(id) {
    removeOptimisticQueueItem(id);
  }
  async function syncNow() {
    const response = await chrome.runtime.sendMessage({ type: "sync-now" });
    if (!response?.ok) throw new Error(response?.error || "Sync failed");
    const result = response.result || { processed: 0, remaining: 0 };
    setStatus(
      `Synced ${result.processed} item(s), ${result.remaining} remaining.`
    );
    await loadQueueFromStorage();
    if ((result.processed || 0) > 0) {
      const projectId = dom.ctxProjectSelect.value;
      const sceneId = dom.ctxSceneSelect.value;
      if (projectId && sceneId) {
        const { loadSceneAssets: loadSceneAssets2 } = await Promise.resolve().then(() => (init_data_loaders(), data_loaders_exports));
        await loadSceneAssets2(projectId, sceneId).catch((err) => {
          console.warn("[sidepanel]", err.message);
          return null;
        });
      }
    }
  }
  async function clearFailedItems() {
    const data = await chrome.storage.local.get("syncQueue");
    const queue = data.syncQueue || [];
    const filtered = queue.filter((item) => (item.retryCount || 0) < 5);
    await chrome.storage.local.set({ syncQueue: filtered });
    state_default.localQueueMirror = filtered;
    renderQueueList();
    setStatus(`Cleared ${queue.length - filtered.length} failed item(s).`);
  }
  var init_queue = __esm({
    "chrome-extension/src/queue.js"() {
      "use strict";
      init_dom();
      init_state();
      init_utils();
    }
  });

  // chrome-extension/src/capture.js
  var capture_exports = {};
  __export(capture_exports, {
    applyPageContextToCapture: () => applyPageContextToCapture,
    applySceneAssetToCapture: () => applySceneAssetToCapture,
    clearAllFields: () => clearAllFields,
    clearField: () => clearField,
    hydrateCapture: () => hydrateCapture,
    resetCaptureForm: () => resetCaptureForm,
    saveCapture: () => saveCapture
  });
  function hydrateCapture(data) {
    if (!data) return;
    dom.capTitle.value = data.title || "";
    dom.capPrompt.value = data.prompt || "";
    dom.capNegPrompt.value = data.negativePrompt || "";
    dom.capModelName.value = data.modelName || "";
    dom.capSourceUrl.value = data.sourceUrl || "";
    dom.capOutputUrl.value = data.outputUrl || "";
    dom.capThumbUrl.value = data.thumbnailUrl || "";
    dom.capExternalId.value = data.externalAssetId || "";
    dom.capTags.value = (data.tags || []).join(", ");
    dom.capMetadata.value = data.metadata ? JSON.stringify(data.metadata, null, 2) : "";
    dom.capNotes.value = data.notes || "";
    if (data.assetType && dom.capAssetType.querySelector(`option[value="${data.assetType}"]`)) {
      dom.capAssetType.value = data.assetType;
    }
    if (data.status && dom.capAssetStatus.querySelector(`option[value="${data.status}"]`)) {
      dom.capAssetStatus.value = data.status;
    }
    if (data.platformKey && state_default.platforms.some((p) => p.slug === data.platformKey)) {
      dom.capPlatformSelect.value = data.platformKey;
    }
  }
  function resetCaptureForm(opts = {}) {
    const preserveSourceUrl = opts.preserveSourceUrl ?? true;
    const srcUrl = dom.capSourceUrl.value;
    dom.capTitle.value = "";
    dom.capPrompt.value = "";
    dom.capNegPrompt.value = "";
    dom.capModelName.value = "";
    dom.capOutputUrl.value = "";
    dom.capThumbUrl.value = "";
    dom.capExternalId.value = "";
    dom.capTags.value = "";
    dom.capMetadata.value = "";
    dom.capNotes.value = "";
    dom.capAssetStatus.value = "DRAFT";
    if (preserveSourceUrl) dom.capSourceUrl.value = srcUrl;
    else dom.capSourceUrl.value = "";
  }
  function clearAllFields() {
    dom.capTitle.value = "";
    dom.capPrompt.value = "";
    dom.capNegPrompt.value = "";
    dom.capModelName.value = "";
    dom.capSourceUrl.value = "";
    dom.capOutputUrl.value = "";
    dom.capThumbUrl.value = "";
    dom.capExternalId.value = "";
    dom.capTags.value = "";
    dom.capMetadata.value = "";
    dom.capNotes.value = "";
    dom.capAssetType.value = "IMAGE";
    dom.capAssetStatus.value = "DRAFT";
    if (dom.capPlatformSelect.options.length > 0) {
      dom.capPlatformSelect.selectedIndex = 0;
    }
    setStatus("All fields cleared.");
  }
  function clearField(fieldId) {
    const el = document.getElementById(fieldId);
    if (!el) return;
    if (el.tagName === "SELECT") {
      el.selectedIndex = 0;
    } else {
      el.value = "";
    }
  }
  function applySceneAssetToCapture(assetId) {
    const asset = state_default.sceneAssets.find((a) => a.id === assetId);
    if (!asset) return;
    dom.capTitle.value = asset.title || "";
    dom.capPrompt.value = asset.prompt || "";
    dom.capNegPrompt.value = asset.negativePrompt || "";
    dom.capModelName.value = asset.modelName || "";
    if (asset.assetType && dom.capAssetType.querySelector(`option[value="${asset.assetType}"]`)) {
      dom.capAssetType.value = asset.assetType;
    }
    if (asset.status && dom.capAssetStatus.querySelector(`option[value="${asset.status}"]`)) {
      dom.capAssetStatus.value = asset.status;
    }
    if (asset.platformKey && state_default.platforms.some((p) => p.slug === asset.platformKey)) {
      dom.capPlatformSelect.value = asset.platformKey;
    }
    dom.capTags.value = (asset.tags || []).join(", ");
    dom.capMetadata.value = asset.metadata ? JSON.stringify(asset.metadata, null, 2) : "";
    scheduleSceneDraftSave();
  }
  function applyPageContextToCapture(context) {
    if (!context) return;
    const guessed = detectPlatformSlug(context.sourceUrl || "");
    const currentPlatform = dom.capPlatformSelect.value;
    const platformChanged = guessed && guessed !== currentPlatform;
    if (platformChanged) {
      dom.capOutputUrl.value = "";
      dom.capThumbUrl.value = "";
      dom.capModelName.value = "";
      dom.capPrompt.value = "";
    }
    if (context.prompt && !dom.capPrompt.value.trim())
      dom.capPrompt.value = context.prompt;
    if (context.modelName && !dom.capModelName.value.trim())
      dom.capModelName.value = context.modelName;
    if (context.outputUrl) dom.capOutputUrl.value = context.outputUrl;
    if (context.sourceUrl) dom.capSourceUrl.value = context.sourceUrl;
    if (context.negativePrompt && !dom.capNegPrompt.value.trim())
      dom.capNegPrompt.value = context.negativePrompt;
    if (context.thumbnailUrl && !dom.capThumbUrl.value.trim())
      dom.capThumbUrl.value = context.thumbnailUrl;
    if (context.assetType && dom.capAssetType.querySelector(`option[value="${context.assetType}"]`)) {
      dom.capAssetType.value = context.assetType;
    }
    if (guessed && state_default.platforms.some((p) => p.slug === guessed)) {
      dom.capPlatformSelect.value = guessed;
    }
  }
  async function saveCapture() {
    const projectId = dom.ctxProjectSelect.value;
    const sceneId = dom.ctxSceneSelect.value;
    const platformSlug = dom.capPlatformSelect.value;
    const platform = state_default.platforms.find((p) => p.slug === platformSlug);
    const prompt = dom.capPrompt.value.trim();
    if (!projectId || !sceneId || !platform || !prompt) {
      setStatus("Project, scene, platform, and prompt are required.", true);
      return;
    }
    let metadata;
    try {
      metadata = parseMetadata(dom.capMetadata.value);
    } catch (err) {
      setStatus(`Invalid metadata JSON: ${err.message}`, true);
      return;
    }
    const tags = normalizeTags(dom.capTags.value);
    const payload = {
      projectId,
      sceneId,
      platformId: platform.id,
      platformKey: platform.slug,
      platformLabel: platform.name,
      assetType: dom.capAssetType.value,
      status: dom.capAssetStatus.value,
      title: dom.capTitle.value.trim() || void 0,
      prompt,
      negativePrompt: dom.capNegPrompt.value.trim() || void 0,
      modelName: dom.capModelName.value.trim() || void 0,
      sourceUrl: dom.capSourceUrl.value.trim() || void 0,
      outputUrl: dom.capOutputUrl.value.trim() || void 0,
      thumbnailUrl: dom.capThumbUrl.value.trim() || void 0,
      externalAssetId: dom.capExternalId.value.trim() || void 0,
      metadata,
      tags,
      notes: dom.capNotes.value.trim() || void 0
    };
    const optimisticItem = addOptimisticQueueItem(payload);
    setStatus("Queued. Syncing...");
    const captureEntry = {
      projectId,
      sceneId,
      platformKey: platform.slug,
      platformLabel: platform.name,
      assetType: dom.capAssetType.value,
      status: dom.capAssetStatus.value,
      title: dom.capTitle.value.trim(),
      prompt,
      negativePrompt: dom.capNegPrompt.value.trim(),
      modelName: dom.capModelName.value.trim(),
      sourceUrl: dom.capSourceUrl.value.trim(),
      outputUrl: dom.capOutputUrl.value.trim(),
      thumbnailUrl: dom.capThumbUrl.value.trim(),
      externalAssetId: dom.capExternalId.value.trim(),
      tags,
      metadata: metadata || null,
      notes: dom.capNotes.value.trim(),
      capturedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const configBefore = state_default.configCache || await getConfig();
    const existingHistory = Array.isArray(configBefore.captureHistory) ? configBefore.captureHistory : [];
    await saveConfig({
      lastProjectId: projectId,
      lastSceneId: sceneId,
      lastPlatform: platform.slug,
      preferredAssetType: dom.capAssetType.value,
      preferredStatus: dom.capAssetStatus.value,
      lastCapture: captureEntry,
      captureHistory: [...existingHistory.slice(-19), captureEntry]
    });
    try {
      const response = await chrome.runtime.sendMessage({
        type: "enqueue-item",
        payload
      });
      if (!response?.ok) {
        setStatus(response?.error || "Failed to queue capture", true);
        return;
      }
      const synced = response.syncResult?.processed || 0;
      const remaining = response.syncResult?.remaining || 0;
      if (synced > 0) {
        markOptimisticSynced(optimisticItem.id);
      }
      await clearSceneDraft().catch((err) => {
        console.warn("[sidepanel]", err.message);
      });
      syncProfile({
        lastProjectId: projectId,
        lastSceneId: sceneId,
        lastPlatform: platform.slug,
        preferredAssetType: dom.capAssetType.value,
        preferredStatus: dom.capAssetStatus.value
      }).catch(
        (err) => console.warn("[sidepanel] syncProfile after capture:", err.message)
      );
      setStatus(`Queued. Synced ${synced}, ${remaining} remaining.`);
      if (synced > 0) {
        const { loadSceneAssets: loadSceneAssets2 } = await Promise.resolve().then(() => (init_data_loaders(), data_loaders_exports));
        await loadSceneAssets2(projectId, sceneId).catch((err) => {
          console.warn("[sidepanel]", err.message);
        });
      }
      await loadQueueFromStorage();
      const { refreshIntentSuggestions: refreshIntentSuggestions2 } = await Promise.resolve().then(() => (init_intent(), intent_exports));
      refreshIntentSuggestions2();
    } catch (err) {
      setStatus(err.message, true);
    }
  }
  var init_capture = __esm({
    "chrome-extension/src/capture.js"() {
      "use strict";
      init_config();
      init_api();
      init_dom();
      init_state();
      init_utils();
      init_detect();
      init_queue();
      init_drafts();
    }
  });

  // chrome-extension/src/detect.js
  var detect_exports = {};
  __export(detect_exports, {
    applyPromptToPage: () => applyPromptToPage,
    autoFillFromPage: () => autoFillFromPage,
    detectFromPage: () => detectFromPage,
    detectPlatformSlug: () => detectPlatformSlug,
    getDetectorDisplayName: () => getDetectorDisplayName,
    refinePrompt: () => refinePrompt,
    sendMessageToActiveTab: () => sendMessageToActiveTab
  });
  function detectPlatformSlug(url) {
    if (!url) return "";
    const detector = detectPlatform(url);
    return detector?.platform || "";
  }
  function getDetectorDisplayName(url) {
    if (!url) return "";
    const detector = detectPlatform(url);
    return detector?.displayName || detector?.platform || "";
  }
  async function detectFromPage() {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
      });
      state_default.currentTab = tabs[0] || null;
      const url = state_default.currentTab?.url || "";
      dom.capSourceUrl.value = url;
      const slug = detectPlatformSlug(url);
      const displayName = getDetectorDisplayName(url);
      updateDetectionBanner(displayName || slug, "");
      if (slug && state_default.platforms.some((p) => p.slug === slug)) {
        dom.capPlatformSelect.value = slug;
      }
      if (state_default.currentTab?.id) {
        try {
          const response = await sendMessageWithTimeout(state_default.currentTab.id, {
            type: "extract-page-context"
          });
          if (response?.ok && response.context) {
            state_default.lastPageContext = response.context;
            const confidence = response.latestCandidate?.confidence;
            updateDetectionBanner(
              displayName || slug,
              response.context.assetType || "",
              confidence
            );
            return response.context;
          }
        } catch {
        }
      }
      return null;
    } catch {
      updateDetectionBanner("", "");
      return null;
    }
  }
  async function sendMessageToActiveTab(message) {
    const tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true
    });
    const tab = tabs[0];
    if (!tab?.id) throw new Error("No active tab available.");
    return sendMessageWithTimeout(tab.id, message);
  }
  async function autoFillFromPage() {
    const response = await sendMessageToActiveTab({
      type: "extract-page-context"
    });
    if (!response?.ok || !response?.context) {
      throw new Error(
        response?.error || "Could not read prompt from current tab."
      );
    }
    state_default.lastPageContext = response.context;
    const { applyPageContextToCapture: applyPageContextToCapture2 } = await Promise.resolve().then(() => (init_capture(), capture_exports));
    applyPageContextToCapture2(response.context);
    const { refreshIntentSuggestions: refreshIntentSuggestions2 } = await Promise.resolve().then(() => (init_intent(), intent_exports));
    refreshIntentSuggestions2();
  }
  async function applyPromptToPage(prompt) {
    const text = prompt || dom.capPrompt.value.trim();
    if (!text) throw new Error("Prompt is empty.");
    const response = await sendMessageToActiveTab({
      type: "apply-prompt",
      prompt: text
    });
    if (!response?.ok)
      throw new Error(response?.error || "Failed to apply prompt.");
  }
  async function refinePrompt() {
    const prompt = dom.capPrompt.value.trim();
    if (!prompt) throw new Error("Enter a prompt first.");
    const response = await chrome.runtime.sendMessage({
      type: "ai-refine-prompt",
      payload: { prompt }
    });
    if (!response?.ok)
      throw new Error(response?.error || "AI prompt refine failed.");
    dom.capPrompt.value = response.refinedPrompt || dom.capPrompt.value;
  }
  var init_detect = __esm({
    "chrome-extension/src/detect.js"() {
      "use strict";
      init_detectors();
      init_messaging();
      init_dom();
      init_state();
    }
  });

  // chrome-extension/src/ai-assist.js
  var ai_assist_exports = {};
  __export(ai_assist_exports, {
    aiAssistDetect: () => aiAssistDetect
  });
  async function aiAssistDetect() {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs[0];
    if (!tab?.id) throw new Error("No active tab available.");
    setStatus("AI analyzing page...");
    const serialized = await sendMessageWithTimeout(tab.id, {
      type: "serialize-page-context",
      maxChars: 12e3
    });
    if (!serialized?.ok || !serialized.turns?.length) {
      throw new Error("Could not serialize page content.");
    }
    const response = await chrome.runtime.sendMessage({
      type: "ai-assist-detect",
      payload: {
        turns: serialized.turns,
        url: serialized.url,
        adapter: serialized.adapter
      }
    });
    if (!response?.ok) {
      throw new Error(response?.error || "AI assist failed.");
    }
    const result = response.result;
    if (!result) throw new Error("AI returned no result.");
    if (result.prompt) dom.capPrompt.value = result.prompt;
    if (result.negativePrompt) dom.capNegPrompt.value = result.negativePrompt;
    if (result.outputUrl) dom.capOutputUrl.value = result.outputUrl;
    if (result.thumbnailUrl) dom.capThumbUrl.value = result.thumbnailUrl;
    if (result.modelName) dom.capModelName.value = result.modelName;
    if (result.assetType && dom.capAssetType.querySelector(`option[value="${result.assetType}"]`)) {
      dom.capAssetType.value = result.assetType;
    }
    const existingMeta = dom.capMetadata.value.trim();
    let meta = {};
    try {
      meta = existingMeta ? JSON.parse(existingMeta) : {};
    } catch {
    }
    meta.provenance = {
      aiAssist: true,
      provider: "byok",
      model: response.model || "unknown",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (result.settings) {
      meta.detection = { ...meta.detection, settings: result.settings };
    }
    dom.capMetadata.value = JSON.stringify(meta, null, 2);
    const slug = detectPlatformSlug(serialized.url);
    if (slug && state_default.platforms.some((p) => p.slug === slug)) {
      dom.capPlatformSelect.value = slug;
    }
    scheduleSceneDraftSave();
    setStatus("AI assist applied.");
  }
  var init_ai_assist = __esm({
    "chrome-extension/src/ai-assist.js"() {
      "use strict";
      init_dom();
      init_messaging();
      init_drafts();
      init_state();
      init_detect();
    }
  });

  // chrome-extension/src/init.js
  init_config();
  init_api();
  init_dom();
  init_state();
  init_detect();
  init_capture();
  init_queue();
  init_drafts();

  // chrome-extension/src/candidate-picker.js
  init_dom();
  init_state();
  init_messaging();
  init_drafts();
  async function openCandidatePicker() {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs[0];
    if (!tab?.id) {
      setStatus("No active tab available.", true);
      return;
    }
    setStatus("Scanning thread...");
    dom.candidateList.innerHTML = '<div class="sp-candidate-empty">Loading...</div>';
    dom.candidatePicker.classList.remove("hidden");
    state_default.candidatePickerOpen = true;
    try {
      const response = await sendMessageWithTimeout(tab.id, {
        type: "extract-thread-candidates",
        maxCandidates: 20
      });
      if (!response?.ok || !response.candidates?.length) {
        dom.candidateList.innerHTML = '<div class="sp-candidate-empty">No thread candidates found.</div>';
        setStatus("No thread candidates detected.");
        return;
      }
      state_default.threadCandidates = response.candidates;
      renderCandidateList(response.candidates);
      setStatus(`Found ${response.candidates.length} candidate(s).`);
    } catch (err) {
      dom.candidateList.innerHTML = '<div class="sp-candidate-empty">Detection failed.</div>';
      setStatus(err.message, true);
    }
  }
  function closeCandidatePicker() {
    dom.candidatePicker.classList.add("hidden");
    state_default.candidatePickerOpen = false;
  }
  function renderCandidateList(candidates) {
    dom.candidateList.innerHTML = "";
    if (!candidates?.length) {
      dom.candidateList.innerHTML = '<div class="sp-candidate-empty">No candidates.</div>';
      return;
    }
    for (const candidate of candidates) {
      const item = document.createElement("div");
      item.className = "sp-candidate-item";
      item.dataset.candidateId = candidate.id;
      const firstOutput = candidate.outputs?.[0];
      if (firstOutput?.thumbnailUrl || firstOutput?.url) {
        const thumb = document.createElement("img");
        thumb.className = "sp-candidate-thumb";
        thumb.src = firstOutput.thumbnailUrl || firstOutput.url;
        thumb.alt = "";
        thumb.loading = "lazy";
        thumb.onerror = () => {
          thumb.replaceWith(createPlaceholder(candidate.assetType));
        };
        item.appendChild(thumb);
      } else {
        item.appendChild(createPlaceholder(candidate.assetType));
      }
      const info = document.createElement("div");
      info.className = "sp-candidate-info";
      const promptText = document.createElement("div");
      promptText.className = "sp-candidate-prompt";
      promptText.textContent = candidate.prompt ? candidate.prompt.substring(0, 120) + (candidate.prompt.length > 120 ? "..." : "") : "(no prompt)";
      info.appendChild(promptText);
      const meta = document.createElement("div");
      meta.className = "sp-candidate-meta";
      const outputCount = candidate.outputs?.length || 0;
      meta.textContent = `${candidate.assetType} -- ${outputCount} output(s)`;
      if (candidate.settings?.modelName) {
        meta.textContent += ` -- ${candidate.settings.modelName}`;
      }
      info.appendChild(meta);
      item.appendChild(info);
      const badge = document.createElement("span");
      const conf = candidate.confidence || 0;
      badge.className = `sp-confidence ${confidenceClass(conf)}`;
      badge.textContent = `${Math.round(conf * 100)}%`;
      item.appendChild(badge);
      item.addEventListener("click", () => selectCandidate(candidate));
      dom.candidateList.appendChild(item);
    }
  }
  function selectCandidate(candidate) {
    dom.capPrompt.value = candidate.prompt || "";
    if (candidate.negativePrompt) {
      dom.capNegPrompt.value = candidate.negativePrompt;
    }
    const firstOutput = candidate.outputs?.[0];
    if (firstOutput?.url) {
      dom.capOutputUrl.value = firstOutput.url;
    }
    if (firstOutput?.thumbnailUrl) {
      dom.capThumbUrl.value = firstOutput.thumbnailUrl;
    }
    if (candidate.settings?.modelName) {
      dom.capModelName.value = candidate.settings.modelName;
    }
    if (candidate.assetType && dom.capAssetType.querySelector(`option[value="${candidate.assetType}"]`)) {
      dom.capAssetType.value = candidate.assetType;
    }
    if (candidate.settings) {
      const existingMeta = dom.capMetadata.value.trim();
      let meta = {};
      try {
        meta = existingMeta ? JSON.parse(existingMeta) : {};
      } catch {
      }
      meta.detection = {
        candidateId: candidate.id,
        confidence: candidate.confidence,
        turnIndex: candidate.turnIndex,
        settings: candidate.settings
      };
      dom.capMetadata.value = JSON.stringify(meta, null, 2);
    }
    closeCandidatePicker();
    scheduleSceneDraftSave();
    setStatus(`Applied candidate (${Math.round((candidate.confidence || 0) * 100)}% confidence).`);
  }
  function confidenceClass(conf) {
    if (conf >= 0.8) return "sp-confidence-high";
    if (conf >= 0.5) return "sp-confidence-medium";
    return "sp-confidence-low";
  }
  function createPlaceholder(assetType) {
    const placeholder = document.createElement("div");
    placeholder.className = "sp-candidate-thumb-placeholder";
    const labels = { VIDEO: "VID", IMAGE: "IMG", AUDIO: "AUD", MUSIC: "MUS", VOICE: "VOX" };
    placeholder.textContent = labels[assetType] || "?";
    return placeholder;
  }

  // chrome-extension/src/init.js
  init_render();
  init_compare();
  init_data_loaders();
  init_intent();
  function onTabActivated() {
    detectFromPage().then(() => {
      refreshIntentSuggestions();
    }).catch((err) => console.warn("[sidepanel]", err.message));
  }
  async function initialize() {
    const config = await getConfig();
    state_default.configCache = config;
    dom.cfgBaseUrl.value = config.baseUrl || "http://localhost:3000";
    dom.cfgToken.value = config.token || "";
    dom.cfgOpenAiBaseUrl.value = config.openAiBaseUrl || "";
    dom.cfgOpenAiModel.value = config.openAiModel || "";
    dom.cfgOpenAiApiKey.value = config.openAiApiKey || "";
    dom.capAssetType.value = config.preferredAssetType || "IMAGE";
    dom.capAssetStatus.value = config.preferredStatus || "DRAFT";
    const tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true
    });
    state_default.currentTab = tabs[0] || null;
    if (state_default.currentTab?.url) dom.capSourceUrl.value = state_default.currentTab.url;
    await loadQueueFromStorage();
    if (!(config.token || "").trim()) {
      dom.authBaseUrl.value = config.baseUrl || "http://localhost:3000";
      dom.authToken.value = config.token || "";
      dom.authOpenAiBaseUrl.value = config.openAiBaseUrl || "";
      dom.authOpenAiModel.value = config.openAiModel || "";
      dom.authOpenAiApiKey.value = config.openAiApiKey || "";
      dom.authGate.classList.remove("hidden");
      document.querySelectorAll(".sp-main").forEach((p) => p.classList.add("hidden"));
      setStatus("Enter your credentials to connect.");
      return;
    }
    dom.authGate.classList.add("hidden");
    setActiveMode(state_default.activeMode);
    try {
      const profilePromise = fetchApi("/api/extension/profile").catch(() => ({
        preferences: {}
      }));
      await loadProjectsAndPlatforms();
      const profileData = await profilePromise;
      const profile = profileData.preferences || {};
      const defaultProject = config.lastProjectId || profile.lastProjectId || state_default.projects[0]?.id || "";
      if (defaultProject && dom.ctxProjectSelect.querySelector(`option[value="${defaultProject}"]`)) {
        dom.ctxProjectSelect.value = defaultProject;
      }
      await loadScenes(dom.ctxProjectSelect.value);
      const defaultScene = config.lastSceneId || profile.lastSceneId || state_default.scenes[0]?.sceneId || "";
      if (defaultScene && dom.ctxSceneSelect.querySelector(`option[value="${defaultScene}"]`)) {
        dom.ctxSceneSelect.value = defaultScene;
      }
      await loadSceneAssets(dom.ctxProjectSelect.value, dom.ctxSceneSelect.value);
      state_default.characters = await fetchCharacters(dom.ctxProjectSelect.value).catch(
        () => []
      );
      renderCharacterCards();
      updateContextBar();
      resetCaptureForm({ preserveSourceUrl: true });
      await restoreSceneDraft();
      const detected = await detectFromPage();
      const autoPlatform = detectPlatformSlug(state_default.currentTab?.url || "");
      if (autoPlatform && state_default.platforms.some((p) => p.slug === autoPlatform)) {
        dom.capPlatformSelect.value = autoPlatform;
      } else if (config.lastPlatform && state_default.platforms.some((p) => p.slug === config.lastPlatform)) {
        dom.capPlatformSelect.value = config.lastPlatform;
      } else if (profile.lastPlatform && state_default.platforms.some((p) => p.slug === profile.lastPlatform)) {
        dom.capPlatformSelect.value = profile.lastPlatform;
      }
      if (profile.preferredAssetType && dom.capAssetType.querySelector(
        `option[value="${profile.preferredAssetType}"]`
      )) {
        dom.capAssetType.value = profile.preferredAssetType;
      }
      if (profile.preferredStatus && dom.capAssetStatus.querySelector(
        `option[value="${profile.preferredStatus}"]`
      )) {
        dom.capAssetStatus.value = profile.preferredStatus;
      }
      if (!dom.cfgOpenAiBaseUrl.value && profile.openAiBaseUrl) {
        dom.cfgOpenAiBaseUrl.value = profile.openAiBaseUrl;
      }
      if (!dom.cfgOpenAiModel.value && profile.openAiModel) {
        dom.cfgOpenAiModel.value = profile.openAiModel;
      }
      if (!dom.capPrompt.value.trim() && detected) {
        applyPageContextToCapture(detected);
      }
      refreshIntentSuggestions();
      const queueInfo = await chrome.runtime.sendMessage({
        type: "get-queue-size"
      });
      const queueSize = queueInfo?.size || 0;
      setStatus(`Ready. Queue: ${queueSize} item(s).`);
    } catch (err) {
      setStatus(err.message, true);
    }
  }
  dom.modeNav.addEventListener("click", (e) => {
    const btn = e.target.closest(".sp-tab");
    if (!btn) return;
    setActiveMode(btn.dataset.mode);
  });
  dom.settingsToggle.addEventListener("click", () => toggleSettings());
  dom.settingsClose.addEventListener("click", () => toggleSettings(false));
  dom.cfgSave.addEventListener("click", async () => {
    const nextConfig = {
      baseUrl: dom.cfgBaseUrl.value.trim() || "http://localhost:3000",
      token: dom.cfgToken.value.trim(),
      openAiBaseUrl: normalizeBaseUrl(dom.cfgOpenAiBaseUrl.value),
      openAiModel: dom.cfgOpenAiModel.value.trim(),
      openAiApiKey: dom.cfgOpenAiApiKey.value.trim()
    };
    await saveConfig(nextConfig);
    syncProfile({
      openAiBaseUrl: normalizeBaseUrl(dom.cfgOpenAiBaseUrl.value),
      openAiModel: dom.cfgOpenAiModel.value.trim()
    }).catch((err) => console.warn("[sidepanel]", err.message));
    setStatus("Settings saved. Reloading...");
    toggleSettings(false);
    await initialize();
  });
  dom.authConnect.addEventListener("click", async () => {
    const token = dom.authToken.value.trim();
    if (!token) {
      setStatus("API Token is required.", true);
      return;
    }
    dom.authConnect.disabled = true;
    dom.authConnect.textContent = "Connecting...";
    const nextConfig = {
      baseUrl: dom.authBaseUrl.value.trim() || "http://localhost:3000",
      token,
      openAiBaseUrl: normalizeBaseUrl(dom.authOpenAiBaseUrl.value),
      openAiModel: dom.authOpenAiModel.value.trim(),
      openAiApiKey: dom.authOpenAiApiKey.value.trim()
    };
    await saveConfig(nextConfig);
    dom.cfgBaseUrl.value = nextConfig.baseUrl;
    dom.cfgToken.value = nextConfig.token;
    dom.cfgOpenAiBaseUrl.value = nextConfig.openAiBaseUrl;
    dom.cfgOpenAiModel.value = nextConfig.openAiModel;
    dom.cfgOpenAiApiKey.value = nextConfig.openAiApiKey;
    dom.authConnect.disabled = false;
    dom.authConnect.textContent = "Connect";
    await initialize();
  });
  dom.cfgReload.addEventListener("click", async () => {
    toggleSettings(false);
    setStatus("Reloading...");
    await initialize();
  });
  dom.ctxProjectSelect.addEventListener("change", async () => {
    try {
      await saveSceneDraft();
      await loadScenes(dom.ctxProjectSelect.value);
      await loadSceneAssets(dom.ctxProjectSelect.value, dom.ctxSceneSelect.value);
      state_default.characters = await fetchCharacters(dom.ctxProjectSelect.value).catch(
        () => []
      );
      renderCharacterCards();
      updateContextBar();
      resetCaptureForm({ preserveSourceUrl: true });
      await restoreSceneDraft();
      await saveConfig({
        lastProjectId: dom.ctxProjectSelect.value,
        lastSceneId: dom.ctxSceneSelect.value || ""
      });
      syncProfile({
        lastProjectId: dom.ctxProjectSelect.value,
        lastSceneId: dom.ctxSceneSelect.value || ""
      }).catch((err) => console.warn("[sidepanel]", err.message));
      refreshIntentSuggestions();
    } catch (err) {
      setStatus(err.message, true);
    }
  });
  dom.ctxSceneSearch.addEventListener("input", () => {
    const query = dom.ctxSceneSearch.value.toLowerCase().trim();
    const options = dom.ctxSceneSelect.options;
    let firstVisible = null;
    for (let i = 0; i < options.length; i++) {
      const matches = !query || options[i].textContent.toLowerCase().includes(query);
      options[i].hidden = !matches;
      if (matches && !firstVisible) firstVisible = options[i];
    }
    if (dom.ctxSceneSelect.selectedOptions[0]?.hidden && firstVisible) {
      firstVisible.selected = true;
    }
  });
  dom.ctxSceneSelect.addEventListener("change", async () => {
    try {
      await saveSceneDraft();
      await loadSceneAssets(dom.ctxProjectSelect.value, dom.ctxSceneSelect.value);
      updateContextBar();
      resetCaptureForm({ preserveSourceUrl: true });
      await restoreSceneDraft();
      await saveConfig({ lastSceneId: dom.ctxSceneSelect.value });
      syncProfile({ lastSceneId: dom.ctxSceneSelect.value }).catch(
        (err) => console.warn("[sidepanel]", err.message)
      );
      refreshIntentSuggestions();
    } catch (err) {
      setStatus(err.message, true);
    }
  });
  dom.ctxRefreshDetect.addEventListener("click", async () => {
    try {
      dom.ctxRefreshDetect.disabled = true;
      const ctx = await detectFromPage();
      if (ctx) {
        setStatus("Page detection refreshed.");
      } else {
        setStatus("No page context detected.");
      }
      refreshIntentSuggestions();
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      dom.ctxRefreshDetect.disabled = false;
    }
  });
  dom.capPickThread.addEventListener("click", async () => {
    try {
      dom.capPickThread.disabled = true;
      await openCandidatePicker();
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      dom.capPickThread.disabled = false;
    }
  });
  dom.candidatePickerClose.addEventListener("click", () => {
    closeCandidatePicker();
  });
  dom.capAiAssist.addEventListener("click", async () => {
    try {
      dom.capAiAssist.disabled = true;
      dom.capAiAssist.textContent = "...";
      const { aiAssistDetect: aiAssistDetect2 } = await Promise.resolve().then(() => (init_ai_assist(), ai_assist_exports));
      await aiAssistDetect2();
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      dom.capAiAssist.disabled = false;
      dom.capAiAssist.textContent = "AI";
    }
  });
  dom.capPlatformSelect.addEventListener("change", async () => {
    await saveConfig({ lastPlatform: dom.capPlatformSelect.value });
    syncProfile({ lastPlatform: dom.capPlatformSelect.value }).catch(
      (err) => console.warn("[sidepanel]", err.message)
    );
    scheduleSceneDraftSave();
    refreshIntentSuggestions();
  });
  dom.capAssetType.addEventListener("change", async () => {
    await saveConfig({ preferredAssetType: dom.capAssetType.value });
    syncProfile({ preferredAssetType: dom.capAssetType.value }).catch(
      (err) => console.warn("[sidepanel]", err.message)
    );
    scheduleSceneDraftSave();
    refreshIntentSuggestions();
  });
  dom.capAssetStatus.addEventListener("change", async () => {
    await saveConfig({ preferredStatus: dom.capAssetStatus.value });
    syncProfile({ preferredStatus: dom.capAssetStatus.value }).catch(
      (err) => console.warn("[sidepanel]", err.message)
    );
    scheduleSceneDraftSave();
    refreshIntentSuggestions();
  });
  dom.capAutoFill.addEventListener("click", async () => {
    try {
      dom.capAutoFill.disabled = true;
      dom.capAutoFill.textContent = "Filling...";
      await autoFillFromPage();
      setStatus("Auto-filled from current tab.");
      scheduleSceneDraftSave();
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      dom.capAutoFill.disabled = false;
      dom.capAutoFill.textContent = "Auto Fill";
    }
  });
  dom.capApplyPrompt.addEventListener("click", async () => {
    try {
      dom.capApplyPrompt.disabled = true;
      await applyPromptToPage();
      setStatus("Prompt applied to page.");
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      dom.capApplyPrompt.disabled = false;
    }
  });
  dom.capRefinePrompt.addEventListener("click", async () => {
    try {
      dom.capRefinePrompt.disabled = true;
      await refinePrompt();
      setStatus("Prompt refined via AI.");
      scheduleSceneDraftSave();
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      dom.capRefinePrompt.disabled = false;
    }
  });
  dom.capSave.addEventListener("click", async () => {
    try {
      dom.capSave.disabled = true;
      dom.capSave.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="2" stroke-dasharray="20" stroke-dashoffset="10"><animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7" dur="0.8s" repeatCount="indefinite"/></circle></svg>
      Saving...
    `;
      await saveCapture();
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      dom.capSave.disabled = false;
      dom.capSave.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Save Capture
    `;
    }
  });
  dom.capClearAll.addEventListener("click", () => {
    clearAllFields();
    scheduleSceneDraftSave();
  });
  document.addEventListener("click", (e) => {
    const clearBtn = e.target.closest(".sp-clear[data-clear]");
    if (!clearBtn) return;
    clearField(clearBtn.dataset.clear);
    scheduleSceneDraftSave();
  });
  [
    dom.capTitle,
    dom.capPrompt,
    dom.capNegPrompt,
    dom.capModelName,
    dom.capSourceUrl,
    dom.capOutputUrl,
    dom.capThumbUrl,
    dom.capExternalId,
    dom.capMetadata,
    dom.capNotes,
    dom.capTags
  ].forEach((field) => {
    if (field) {
      field.addEventListener("input", () => {
        scheduleSceneDraftSave();
      });
    }
  });
  dom.reuseRestoreDraft.addEventListener("click", async () => {
    try {
      const restored = await restoreSceneDraft();
      if (!restored) {
        setStatus("No saved draft for this scene.");
        return;
      }
      setActiveMode("capture");
      setStatus("Draft restored.");
    } catch (err) {
      setStatus(err.message, true);
    }
  });
  dom.reuseClearDraft.addEventListener("click", async () => {
    try {
      const cleared = await clearSceneDraft();
      if (!cleared) {
        setStatus("No draft to clear.");
        return;
      }
      setStatus("Draft cleared.");
      refreshIntentSuggestions();
    } catch (err) {
      setStatus(err.message, true);
    }
  });
  dom.queueSyncNow.addEventListener("click", async () => {
    try {
      dom.queueSyncNow.disabled = true;
      dom.queueSyncNow.textContent = "Syncing...";
      await syncNow();
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      dom.queueSyncNow.disabled = false;
      dom.queueSyncNow.textContent = "Sync Now";
    }
  });
  dom.queueClearFailed.addEventListener("click", async () => {
    await clearFailedItems();
  });
  function setupFilterChips(chipContainer, stateKey, renderFn) {
    chipContainer.addEventListener("click", (e) => {
      const chip = e.target.closest(".sp-chip");
      if (!chip) return;
      const filter = chip.dataset.filter;
      state_default[stateKey] = filter;
      chipContainer.querySelectorAll(".sp-chip").forEach((c) => {
        c.classList.toggle("active", c.dataset.filter === filter);
      });
      renderFn();
    });
  }
  setupFilterChips(dom.reuseFilterChips, "reuseFilterType", renderReuseList);
  setupFilterChips(dom.queueFilterChips, "queueFilterType", renderQueueList);
  dom.reuseSearch.addEventListener("input", () => {
    state_default.reuseSearchQuery = dom.reuseSearch.value;
    renderReuseList();
  });
  dom.compareBtn.addEventListener("click", () => openCompare());
  dom.compareClose.addEventListener("click", () => closeCompare());
  dom.compareClear.addEventListener("click", () => clearCompareSelections());
  chrome.tabs.onActivated.addListener(onTabActivated);
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "complete" && state_default.currentTab?.id === tabId) {
      onTabActivated();
    }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.syncQueue) {
      state_default.localQueueMirror = changes.syncQueue.newValue || [];
      renderQueueList();
    }
  });
  initialize();
})();
//# sourceMappingURL=sidepanel.js.map
