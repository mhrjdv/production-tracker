/* ==========================================================
   Detection V2 – Shared types and constants
   ========================================================== */

/**
 * @typedef {Object} Candidate
 * @property {string} id - Deterministic hash of prompt + outputUrl
 * @property {number} turnIndex - Position in thread (0 = newest)
 * @property {string} prompt
 * @property {string|null} negativePrompt
 * @property {Array<{type: string, url: string, thumbnailUrl: string|null, metadata: Object}>} outputs
 * @property {Object|null} settings
 * @property {string} assetType
 * @property {number} confidence - 0-1
 * @property {number} timestamp - epoch ms (0 if unknown)
 * @property {string} platformKey
 */

/** Feature flags – stored in chrome.storage.local, all default true */
export const FLAGS = {
  ENGINE_V2: "detectionEngineV2Enabled",
  THREAD_PICKER: "threadPickerEnabled",
  AI_ASSIST: "aiAssistEnabled",
};

export const ENGINE_VERSION = "2.0.0";

/**
 * Deterministic candidate ID from prompt text + first output URL.
 * Uses a simple djb2-style hash to avoid crypto overhead in content script.
 */
export function candidateId(prompt, outputUrl) {
  const raw = `${prompt || ""}::${outputUrl || ""}`;
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) >>> 0;
  }
  return `cand_${hash.toString(36)}`;
}
