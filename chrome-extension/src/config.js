/* ==========================================================
   Config – Chrome storage persistence with serialization lock
   ========================================================== */

import { encryptString, decryptString } from "./crypto-utils.js";

export const CONFIG_KEY = "extensionConfig";

const DEFAULT_CONFIG = {
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
  sceneDrafts: {},
};

export function normalizeBaseUrl(url) {
  return String(url || "")
    .trim()
    .replace(/\/+$/, "");
}

export async function getConfig() {
  const data = await chrome.storage.local.get(CONFIG_KEY);
  const raw = data[CONFIG_KEY] || { ...DEFAULT_CONFIG };

  // Decrypt the BYOK API key if present
  if (raw.openAiApiKey && raw._apiKeyEncrypted) {
    try {
      raw.openAiApiKey = await decryptString(raw.openAiApiKey);
    } catch {
      raw.openAiApiKey = "";
    }
  }

  // Strip internal encryption flag from returned config
  const { _apiKeyEncrypted: _, ...clean } = raw;
  return clean;
}

let _saveConfigLock = Promise.resolve();

export async function saveConfig(partial) {
  const doSave = async () => {
    const stateModule = await import("./state.js");
    const state = stateModule.default;
    const current = state.configCache || (await getConfig());
    const merged = { ...current, ...partial };

    // Prepare storage copy: encrypt the BYOK API key
    const storageClone = { ...merged };
    if (storageClone.openAiApiKey) {
      storageClone.openAiApiKey = await encryptString(
        storageClone.openAiApiKey,
      );
      storageClone._apiKeyEncrypted = true;
    } else {
      storageClone._apiKeyEncrypted = false;
    }

    // Update in-memory cache with plain-text values (strip encryption flag)
    const { _apiKeyEncrypted: _, ...cacheClean } = merged;
    state.configCache = cacheClean;

    await chrome.storage.local.set({ [CONFIG_KEY]: storageClone });
  };
  _saveConfigLock = _saveConfigLock.then(doSave, doSave);
  return _saveConfigLock;
}
