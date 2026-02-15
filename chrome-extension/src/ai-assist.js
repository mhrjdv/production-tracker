/* ==========================================================
   AI Assist – On-demand LLM-based page detection
   Uses BYOK API key from config to analyze serialized page text.
   ========================================================== */

import { dom, setStatus } from "./dom.js";
import { sendMessageWithTimeout } from "./messaging.js";
import { scheduleSceneDraftSave } from "./drafts.js";
import state from "./state.js";
import { detectPlatformSlug } from "./detect.js";

const SYSTEM_PROMPT = `You are a structured data extractor for AI generation platforms. Given a serialized page conversation, identify:
1. The most recent SENT prompt (not the input bar text — look for the last user message)
2. The generated output URL(s) from the assistant response
3. The model name / version if visible
4. The asset type: IMAGE, VIDEO, AUDIO, MUSIC, VOICE, or OTHER
5. Any settings (aspect ratio, seed, duration, etc.)

Return valid JSON only, no markdown:
{
  "prompt": "the sent prompt text",
  "negativePrompt": null,
  "outputUrl": "https://...",
  "thumbnailUrl": null,
  "modelName": "model-name",
  "assetType": "IMAGE",
  "settings": {}
}

If you cannot identify a field, set it to null. Always return the JSON object.`;

/**
 * Run AI-assisted detection: serialize page -> LLM -> fill form.
 */
export async function aiAssistDetect() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs[0];
  if (!tab?.id) throw new Error("No active tab available.");

  setStatus("AI analyzing page...");

  // Get serialized page text from content script
  const serialized = await sendMessageWithTimeout(tab.id, {
    type: "serialize-page-context",
    maxChars: 12000,
  });

  if (!serialized?.ok || !serialized.turns?.length) {
    throw new Error("Could not serialize page content.");
  }

  // Send to background for BYOK API call
  const response = await chrome.runtime.sendMessage({
    type: "ai-assist-detect",
    payload: {
      turns: serialized.turns,
      url: serialized.url,
      adapter: serialized.adapter,
    },
  });

  if (!response?.ok) {
    throw new Error(response?.error || "AI assist failed.");
  }

  const result = response.result;
  if (!result) throw new Error("AI returned no result.");

  // Apply to form
  if (result.prompt) dom.capPrompt.value = result.prompt;
  if (result.negativePrompt) dom.capNegPrompt.value = result.negativePrompt;
  if (result.outputUrl) dom.capOutputUrl.value = result.outputUrl;
  if (result.thumbnailUrl) dom.capThumbUrl.value = result.thumbnailUrl;
  if (result.modelName) dom.capModelName.value = result.modelName;

  if (result.assetType && dom.capAssetType.querySelector(`option[value="${result.assetType}"]`)) {
    dom.capAssetType.value = result.assetType;
  }

  // Store AI provenance in metadata
  const existingMeta = dom.capMetadata.value.trim();
  let meta = {};
  try {
    meta = existingMeta ? JSON.parse(existingMeta) : {};
  } catch {
    // ignore
  }
  meta.provenance = {
    aiAssist: true,
    provider: "byok",
    model: response.model || "unknown",
    timestamp: new Date().toISOString(),
  };
  if (result.settings) {
    meta.detection = { ...meta.detection, settings: result.settings };
  }
  dom.capMetadata.value = JSON.stringify(meta, null, 2);

  // Set platform if detected
  const slug = detectPlatformSlug(serialized.url);
  if (slug && state.platforms.some((p) => p.slug === slug)) {
    dom.capPlatformSelect.value = slug;
  }

  scheduleSceneDraftSave();
  setStatus("AI assist applied.");
}
