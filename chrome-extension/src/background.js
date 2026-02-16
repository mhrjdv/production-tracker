/* ==========================================================
   Background Service Worker – Queue management and AI refine
   ========================================================== */

const QUEUE_KEY = "syncQueue";
const CONFIG_KEY = "extensionConfig";
const SYNC_ALARM = "production-tracker-sync";
const MAX_RETRY = 10;

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
    openAiApiKey: "",
  });

  // Decrypt BYOK API key if stored encrypted
  if (raw.openAiApiKey && raw._apiKeyEncrypted) {
    try {
      const { decryptString } = await import("./crypto-utils.js");
      raw.openAiApiKey = await decryptString(raw.openAiApiKey);
    } catch {
      // Key may already be plain text, keep as-is
    }
  }

  return raw;
}

async function enqueue(item) {
  const queue = await getQueue();
  const nextQueue = [
    ...queue,
    {
      id: crypto.randomUUID(),
      retryCount: 0,
      queuedAt: new Date().toISOString(),
      ...item,
    },
  ];
  await setQueue(nextQueue);
  return nextQueue.length;
}

function normalizeBaseUrl(raw) {
  return String(raw || "")
    .trim()
    .replace(/\/+$/, "");
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
      "Set OpenAI-compatible Base URL, Model, and API key first.",
    );
  }

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a film and animation prompt optimizer. Improve clarity, cinematic detail, consistency cues, and production constraints. Return only the improved prompt text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body?.error?.message ||
        body?.error ||
        `AI refine failed (${response.status})`,
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
      "Set OpenAI-compatible Base URL, Model, and API key first.",
    );
  }

  const turnsText = turns
    .map(
      (t) =>
        `[${t.role}] ${t.text}${t.hasMedia ? ` (${t.mediaCount} media)` : ""}`,
    )
    .join("\n\n");

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a structured data extractor for AI generation platforms. " +
            "Given a serialized page conversation, identify the most recent SENT prompt " +
            "(not input bar text), output URLs, model name, asset type (IMAGE/VIDEO/AUDIO/MUSIC/VOICE/OTHER), " +
            "and settings. Return valid JSON: " +
            '{"prompt":"...","negativePrompt":null,"outputUrl":"...","thumbnailUrl":null,' +
            '"modelName":"...","assetType":"IMAGE","settings":{}}',
        },
        {
          role: "user",
          content: `Platform: ${payload.adapter || "unknown"}\nURL: ${payload.url || ""}\n\n${turnsText}`,
        },
      ],
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body?.error?.message || `AI assist failed (${response.status})`,
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
      error: "Missing base URL or token",
    };
  }

  const nextQueue = [];
  let processed = 0;

  for (const item of queue) {
    try {
      const response = await fetch(`${baseUrl}/api/extension/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(item.payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${response.status}`);
      }

      processed += 1;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      // Don't retry client errors (auth, validation, not found)
      const isClientError = /HTTP (40[0-9]|4[1-9]\d)/.test(errorMsg);
      const retryCount = (item.retryCount || 0) + 1;
      if (!isClientError && retryCount <= MAX_RETRY) {
        nextQueue.push({
          ...item,
          retryCount,
          lastError: errorMsg,
        });
      } else if (isClientError) {
        // Keep in queue as permanently failed so user can see the error
        nextQueue.push({
          ...item,
          retryCount: MAX_RETRY + 1,
          lastError: errorMsg,
          failedPermanently: true,
        });
      }
    }
  }

  await setQueue(nextQueue);
  return { processed, remaining: nextQueue.length };
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 2 });

  if (chrome.sidePanel) {
    await chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch(() => {});
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel) {
    await chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
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
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();

  return true;
});
