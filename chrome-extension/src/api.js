/* ==========================================================
   API – HTTP layer for communicating with the Laserman webapp
   ========================================================== */

import { getConfig, normalizeBaseUrl } from "./config.js";
import state from "./state.js";

const DEFAULT_TIMEOUT_MS = 30_000;

export async function fetchApi(path, options = {}) {
  const config = state.configCache || (await getConfig());
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const token = (config.token || "").trim();
  if (!baseUrl || !token) throw new Error("Missing API URL or token.");

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.timeout ?? DEFAULT_TIMEOUT_MS,
  );

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      signal: controller.signal,
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(
        `Request timed out after ${(options.timeout ?? DEFAULT_TIMEOUT_MS) / 1000}s`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    // Notify side panel about auth failure
    dispatchEvent(new CustomEvent("lm-auth-expired"));
    throw new Error("Authentication expired. Please reconnect.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return response.json();
}

export async function updateAsset(assetId, data) {
  return fetchApi("/api/extension/asset-update", {
    method: "PATCH",
    body: { assetId, ...data },
  });
}

export async function fetchCharacters(projectId) {
  const data = await fetchApi(
    `/api/extension/characters?projectId=${encodeURIComponent(projectId)}`,
  );
  return data.characters || [];
}

export async function syncProfile(preferences) {
  const config = state.configCache || (await getConfig());
  if (!(config.token || "").trim()) return;
  await fetchApi("/api/extension/profile", {
    method: "PUT",
    body: { preferences },
  }).catch((err) => console.warn("[sidepanel] syncProfile:", err.message));
}
