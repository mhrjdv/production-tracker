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
  return getStorageValue(CONFIG_KEY, {
    baseUrl: "http://localhost:3000",
    token: "",
    openAiBaseUrl: "",
    openAiModel: "",
    openAiApiKey: "",
  });
}

async function enqueue(item) {
  const queue = await getQueue();
  queue.push({
    id: crypto.randomUUID(),
    retryCount: 0,
    queuedAt: new Date().toISOString(),
    ...item,
  });
  await setQueue(queue);
  return queue.length;
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
    throw new Error("Set OpenAI-compatible Base URL, Model, and API key first.");
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
    throw new Error(body?.error?.message || body?.error || `AI refine failed (${response.status})`);
  }

  const refined = body?.choices?.[0]?.message?.content;
  if (typeof refined !== "string" || !refined.trim()) {
    throw new Error("Model returned an empty refinement");
  }

  return refined.trim();
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
    return { processed: 0, remaining: queue.length, error: "Missing base URL or token" };
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
      const retryCount = (item.retryCount || 0) + 1;
      if (retryCount <= MAX_RETRY) {
        nextQueue.push({
          ...item,
          retryCount,
          lastError: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  await setQueue(nextQueue);
  return { processed, remaining: nextQueue.length };
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 2 });
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

      if (message?.type === "save-config") {
        await setStorageValue(CONFIG_KEY, message.config || {});
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === "ai-refine-prompt") {
        const refinedPrompt = await refinePromptWithByok(message.payload || {});
        sendResponse({ ok: true, refinedPrompt });
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
