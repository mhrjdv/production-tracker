/* ==========================================================
   Detect – Platform detection using the detector registry
   ========================================================== */

import { detectPlatform } from "../detectors/index.js";
import { sendMessageWithTimeout } from "./messaging.js";
import { dom, setStatus, updateDetectionBanner } from "./dom.js";
import state from "./state.js";

export function detectPlatformSlug(url) {
  if (!url) return "";
  const detector = detectPlatform(url);
  return detector?.platform || "";
}

export function getDetectorDisplayName(url) {
  if (!url) return "";
  const detector = detectPlatform(url);
  return detector?.displayName || detector?.platform || "";
}

export async function detectFromPage() {
  try {
    const tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    state.currentTab = tabs[0] || null;
    const url = state.currentTab?.url || "";

    dom.capSourceUrl.value = url;

    const slug = detectPlatformSlug(url);
    const displayName = getDetectorDisplayName(url);

    // Update banner
    updateDetectionBanner(displayName || slug, "");

    if (slug && state.platforms.some((p) => p.slug === slug)) {
      dom.capPlatformSelect.value = slug;
    }

    // Try to extract context from page
    if (state.currentTab?.id) {
      try {
        const response = await sendMessageWithTimeout(state.currentTab.id, {
          type: "extract-page-context",
        });
        if (response?.ok && response.context) {
          state.lastPageContext = response.context;
          const confidence = response.latestCandidate?.confidence;
          updateDetectionBanner(
            displayName || slug,
            response.context.assetType || "",
            confidence,
          );
          return response.context;
        }
      } catch {
        // Content script not available on this page
      }
    }

    return null;
  } catch {
    updateDetectionBanner("", "");
    return null;
  }
}

export async function sendMessageToActiveTab(message) {
  const tabs = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  const tab = tabs[0];
  if (!tab?.id) throw new Error("No active tab available.");
  return sendMessageWithTimeout(tab.id, message);
}

export async function autoFillFromPage() {
  const response = await sendMessageToActiveTab({
    type: "extract-page-context",
  });
  if (!response?.ok || !response?.context) {
    throw new Error(
      response?.error || "Could not read prompt from current tab.",
    );
  }
  state.lastPageContext = response.context;

  // Defer to capture module to avoid circular deps
  const { applyPageContextToCapture } = await import("./capture.js");
  applyPageContextToCapture(response.context);

  const { refreshIntentSuggestions } = await import("./intent.js");
  refreshIntentSuggestions();
}

export async function applyPromptToPage(prompt) {
  const text = prompt || dom.capPrompt.value.trim();
  if (!text) throw new Error("Prompt is empty.");
  const response = await sendMessageToActiveTab({
    type: "apply-prompt",
    prompt: text,
  });
  if (!response?.ok)
    throw new Error(response?.error || "Failed to apply prompt.");
}

export async function refinePrompt() {
  const prompt = dom.capPrompt.value.trim();
  if (!prompt) throw new Error("Enter a prompt first.");

  const response = await chrome.runtime.sendMessage({
    type: "ai-refine-prompt",
    payload: { prompt },
  });
  if (!response?.ok)
    throw new Error(response?.error || "AI prompt refine failed.");
  dom.capPrompt.value = response.refinedPrompt || dom.capPrompt.value;
}
