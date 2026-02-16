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
var crypto_utils_exports = {};
__export(crypto_utils_exports, {
  decryptString: () => decryptString,
  encryptString: () => encryptString
});
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
      salt: encoder.encode("lazer-byok-salt-v1"),
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

// chrome-extension/src/background.js
var QUEUE_KEY = "syncQueue";
var CONFIG_KEY = "extensionConfig";
var SYNC_ALARM = "production-tracker-sync";
var MAX_RETRY = 10;
var MAX_QUEUE_SIZE = 200;
async function getStorageValue(key, defaultValue) {
  const result = await chrome.storage.local.get(key);
  return result[key] ?? defaultValue;
}
async function setStorageValue(key, value) {
  await chrome.storage.local.set({ [key]: value });
}
async function getQueue() {
  return getStorageValue(QUEUE_KEY, []);
}
async function setQueue(queue) {
  await setStorageValue(QUEUE_KEY, queue);
}
async function getConfig() {
  const raw = await getStorageValue(CONFIG_KEY, {
    baseUrl: "",
    token: "",
    openAiBaseUrl: "",
    openAiModel: "",
    openAiApiKey: ""
  });
  if (raw.openAiApiKey && raw._apiKeyEncrypted) {
    try {
      const { decryptString: decryptString2 } = await Promise.resolve().then(() => (init_crypto_utils(), crypto_utils_exports));
      raw.openAiApiKey = await decryptString2(raw.openAiApiKey);
    } catch {
    }
  }
  return raw;
}
async function enqueue(item) {
  const queue = await getQueue();
  let trimmed = queue;
  if (trimmed.length >= MAX_QUEUE_SIZE) {
    const failed = trimmed.filter((i) => i.failedPermanently);
    if (failed.length > 0) {
      const failedIds = new Set(
        failed.slice(0, trimmed.length - MAX_QUEUE_SIZE + 1).map((i) => i.id)
      );
      trimmed = trimmed.filter((i) => !failedIds.has(i.id));
    }
    if (trimmed.length >= MAX_QUEUE_SIZE) {
      trimmed = trimmed.slice(trimmed.length - MAX_QUEUE_SIZE + 1);
    }
  }
  const nextQueue = [
    ...trimmed,
    {
      id: crypto.randomUUID(),
      retryCount: 0,
      queuedAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...item
    }
  ];
  await setQueue(nextQueue);
  return nextQueue.length;
}
function normalizeBaseUrl(raw) {
  return String(raw || "").trim().replace(/\/+$/, "");
}
function buildChatCompletionsUrl(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return "";
  if (normalized.endsWith("/chat/completions")) return normalized;
  if (normalized.endsWith("/v1")) return `${normalized}/chat/completions`;
  return `${normalized}/v1/chat/completions`;
}
async function refinePromptWithByok(payload) {
  const config = await getConfig();
  const prompt = String(payload?.prompt || "").trim();
  if (!prompt) {
    throw new Error("Prompt is required");
  }
  const apiKey = String(config.openAiApiKey || "").trim();
  const baseUrl = buildChatCompletionsUrl(config.openAiBaseUrl);
  const model = String(config.openAiModel || "").trim();
  if (!apiKey || !baseUrl || !model) {
    throw new Error(
      "Set OpenAI-compatible Base URL, Model, and API key first."
    );
  }
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "You are a film and animation prompt optimizer. Improve clarity, cinematic detail, consistency cues, and production constraints. Return only the improved prompt text."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body?.error?.message || body?.error || `AI refine failed (${response.status})`
    );
  }
  const refined = body?.choices?.[0]?.message?.content;
  if (typeof refined !== "string" || !refined.trim()) {
    throw new Error("Model returned an empty refinement");
  }
  return refined.trim();
}
async function aiAssistDetectWithByok(payload) {
  const config = await getConfig();
  const turns = payload?.turns;
  if (!turns?.length) throw new Error("No page content to analyze.");
  const apiKey = String(config.openAiApiKey || "").trim();
  const baseUrl = buildChatCompletionsUrl(config.openAiBaseUrl);
  const model = String(config.openAiModel || "").trim();
  if (!apiKey || !baseUrl || !model) {
    throw new Error(
      "Set OpenAI-compatible Base URL, Model, and API key first."
    );
  }
  const turnsText = turns.map(
    (t) => `[${t.role}] ${t.text}${t.hasMedia ? ` (${t.mediaCount} media)` : ""}`
  ).join("\n\n");
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: 'You are a structured data extractor for AI generation platforms. Given a serialized page conversation, identify the most recent SENT prompt (not input bar text), output URLs, model name, asset type (IMAGE/VIDEO/AUDIO/MUSIC/VOICE/OTHER), and settings. Return valid JSON: {"prompt":"...","negativePrompt":null,"outputUrl":"...","thumbnailUrl":null,"modelName":"...","assetType":"IMAGE","settings":{}}'
        },
        {
          role: "user",
          content: `Platform: ${payload.adapter || "unknown"}
URL: ${payload.url || ""}

${turnsText}`
        }
      ]
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body?.error?.message || `AI assist failed (${response.status})`
    );
  }
  const content = body?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned empty response.");
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON.");
  }
  return { parsed, model };
}
async function syncQueue() {
  const queue = await getQueue();
  if (queue.length === 0) {
    return { processed: 0, remaining: 0 };
  }
  const config = await getConfig();
  const baseUrl = (config.baseUrl || "").replace(/\/+$/, "");
  const token = config.token || "";
  if (!baseUrl || !token) {
    return {
      processed: 0,
      remaining: queue.length,
      error: "Missing base URL or token"
    };
  }
  const nextQueue = [];
  let processed = 0;
  let authExpired = false;
  const now = Date.now();
  for (const item of queue) {
    if (item.failedPermanently) {
      nextQueue.push(item);
      continue;
    }
    if (authExpired) {
      nextQueue.push({ ...item, lastError: "Authentication expired" });
      continue;
    }
    if (item.nextRetryAfter && new Date(item.nextRetryAfter).getTime() > now) {
      nextQueue.push(item);
      continue;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3e4);
    try {
      const response = await fetch(`${baseUrl}/api/extension/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(item.payload),
        signal: controller.signal
      });
      if (response.status === 401) {
        authExpired = true;
        chrome.runtime.sendMessage({ type: "auth-expired" }).catch(() => {
        });
        nextQueue.push({
          ...item,
          retryCount: MAX_RETRY + 1,
          lastError: "Authentication expired \u2014 reconnect in settings",
          failedPermanently: true
        });
        continue;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error || `HTTP ${response.status}: ${item.payload?.prompt?.substring(0, 30) || "unknown"}`
        );
      }
      processed += 1;
    } catch (error) {
      if (error.name === "AbortError") {
        const retryCount2 = (item.retryCount || 0) + 1;
        if (retryCount2 <= MAX_RETRY) {
          nextQueue.push({
            ...item,
            retryCount: retryCount2,
            lastError: "Request timed out"
          });
        }
        continue;
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isClientError = /HTTP (40[0-9]|4[1-9]\d)/.test(errorMsg);
      const retryCount = (item.retryCount || 0) + 1;
      const backoffMs = Math.min(1e3 * Math.pow(2, retryCount - 1), 6e5);
      const lastAttempt = item.lastAttemptAt ? new Date(item.lastAttemptAt).getTime() : 0;
      const now2 = Date.now();
      if (!isClientError && retryCount <= MAX_RETRY) {
        nextQueue.push({
          ...item,
          retryCount,
          lastError: errorMsg,
          lastAttemptAt: (/* @__PURE__ */ new Date()).toISOString(),
          nextRetryAfter: new Date(now2 + backoffMs).toISOString()
        });
      } else if (isClientError) {
        nextQueue.push({
          ...item,
          retryCount: MAX_RETRY + 1,
          lastError: errorMsg,
          failedPermanently: true
        });
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
  await setQueue(nextQueue);
  return { processed, remaining: nextQueue.length };
}
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 2 });
  if (chrome.sidePanel) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    });
  }
});
chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel) {
    await chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
    });
  }
});
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== SYNC_ALARM) return;
  await syncQueue();
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "enqueue-item") {
        const size = await enqueue({ payload: message.payload });
        const syncResult = await syncQueue();
        sendResponse({ ok: true, size, syncResult });
        return;
      }
      if (message?.type === "sync-now") {
        const result = await syncQueue();
        sendResponse({ ok: true, result });
        return;
      }
      if (message?.type === "get-queue-size") {
        const queue = await getQueue();
        sendResponse({ ok: true, size: queue.length });
        return;
      }
      if (message?.type === "ai-refine-prompt") {
        const refinedPrompt = await refinePromptWithByok(message.payload || {});
        sendResponse({ ok: true, refinedPrompt });
        return;
      }
      if (message?.type === "ai-assist-detect") {
        const result = await aiAssistDetectWithByok(message.payload || {});
        sendResponse({ ok: true, result: result.parsed, model: result.model });
        return;
      }
      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  })();
  return true;
});
//# sourceMappingURL=background.js.map
