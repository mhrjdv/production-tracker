/* ==========================================================
   Capture – Form hydration, reset, save, and page context
   ========================================================== */

import { getConfig, saveConfig } from "./config.js";
import { fetchApi, syncProfile } from "./api.js";
import { dom, setStatus } from "./dom.js";
import state from "./state.js";
import { normalizeTags, parseMetadata } from "./utils.js";
import { detectPlatformSlug } from "./detect.js";
import {
  addOptimisticQueueItem,
  markOptimisticSynced,
  loadQueueFromStorage,
} from "./queue.js";
import {
  collectCaptureFormState,
  clearSceneDraft,
  scheduleSceneDraftSave,
} from "./drafts.js";

export function hydrateCapture(data) {
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
  dom.capMetadata.value = data.metadata
    ? JSON.stringify(data.metadata, null, 2)
    : "";
  dom.capNotes.value = data.notes || "";

  if (
    data.assetType &&
    dom.capAssetType.querySelector(`option[value="${data.assetType}"]`)
  ) {
    dom.capAssetType.value = data.assetType;
  }
  if (
    data.status &&
    dom.capAssetStatus.querySelector(`option[value="${data.status}"]`)
  ) {
    dom.capAssetStatus.value = data.status;
  }
  if (
    data.platformKey &&
    state.platforms.some((p) => p.slug === data.platformKey)
  ) {
    dom.capPlatformSelect.value = data.platformKey;
  }
  // Restore shot selection
  if (
    data.shotId &&
    dom.ctxShotSelect?.querySelector(`option[value="${data.shotId}"]`)
  ) {
    dom.ctxShotSelect.value = data.shotId;
  }
}

export function resetCaptureForm(opts = {}) {
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

/**
 * Clear all capture form fields including platform and source URL.
 * Used by the "Clear All" button.
 */
export function clearAllFields() {
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
  // Reset platform to first option
  if (dom.capPlatformSelect.options.length > 0) {
    dom.capPlatformSelect.selectedIndex = 0;
  }
  setStatus("All fields cleared.");
}

/**
 * Clear a single field by its DOM id.
 */
export function clearField(fieldId) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  if (el.tagName === "SELECT") {
    el.selectedIndex = 0;
  } else {
    el.value = "";
  }
}

export function applySceneAssetToCapture(assetId) {
  const asset = state.sceneAssets.find((a) => a.id === assetId);
  if (!asset) return;

  dom.capTitle.value = asset.title || "";
  dom.capPrompt.value = asset.prompt || "";
  dom.capNegPrompt.value = asset.negativePrompt || "";
  dom.capModelName.value = asset.modelName || "";

  if (
    asset.assetType &&
    dom.capAssetType.querySelector(`option[value="${asset.assetType}"]`)
  ) {
    dom.capAssetType.value = asset.assetType;
  }
  if (
    asset.status &&
    dom.capAssetStatus.querySelector(`option[value="${asset.status}"]`)
  ) {
    dom.capAssetStatus.value = asset.status;
  }
  if (
    asset.platformKey &&
    state.platforms.some((p) => p.slug === asset.platformKey)
  ) {
    dom.capPlatformSelect.value = asset.platformKey;
  }

  dom.capTags.value = (asset.tags || []).join(", ");
  dom.capMetadata.value = asset.metadata
    ? JSON.stringify(asset.metadata, null, 2)
    : "";

  scheduleSceneDraftSave();
}

export function applyPageContextToCapture(context) {
  if (!context) return;

  // Detect if platform changed — clear platform-specific fields to prevent stale data
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
  // Always overwrite outputUrl when context provides one (prevents stale URLs from previous platform)
  if (context.outputUrl) dom.capOutputUrl.value = context.outputUrl;
  if (context.sourceUrl) dom.capSourceUrl.value = context.sourceUrl;
  // V2: negative prompt and thumbnail
  if (context.negativePrompt && !dom.capNegPrompt.value.trim())
    dom.capNegPrompt.value = context.negativePrompt;
  if (context.thumbnailUrl && !dom.capThumbUrl.value.trim())
    dom.capThumbUrl.value = context.thumbnailUrl;
  if (
    context.assetType &&
    dom.capAssetType.querySelector(`option[value="${context.assetType}"]`)
  ) {
    dom.capAssetType.value = context.assetType;
  }
  if (guessed && state.platforms.some((p) => p.slug === guessed)) {
    dom.capPlatformSelect.value = guessed;
  }
}

export async function saveCapture() {
  const projectId = dom.ctxProjectSelect.value;
  const sceneId = dom.ctxSceneSelect.value;
  const platformSlug = dom.capPlatformSelect.value;
  const platform = state.platforms.find((p) => p.slug === platformSlug);
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

  const shotId = dom.ctxShotSelect?.value || undefined;

  const payload = {
    projectId,
    sceneId,
    shotId,
    platformId: platform.id,
    platformKey: platform.slug,
    platformLabel: platform.name,
    assetType: dom.capAssetType.value,
    status: dom.capAssetStatus.value,
    title: dom.capTitle.value.trim() || undefined,
    prompt,
    negativePrompt: dom.capNegPrompt.value.trim() || undefined,
    modelName: dom.capModelName.value.trim() || undefined,
    sourceUrl: dom.capSourceUrl.value.trim() || undefined,
    outputUrl: dom.capOutputUrl.value.trim() || undefined,
    thumbnailUrl: dom.capThumbUrl.value.trim() || undefined,
    externalAssetId: dom.capExternalId.value.trim() || undefined,
    createPromptPackage: true,
    metadata,
    tags,
    notes: dom.capNotes.value.trim() || undefined,
  };

  // Optimistic UI: add to queue display immediately
  const optimisticItem = addOptimisticQueueItem(payload);
  setStatus("Queued. Syncing...");

  // Persist capture history
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
    capturedAt: new Date().toISOString(),
  };

  const configBefore = state.configCache || (await getConfig());
  const existingHistory = Array.isArray(configBefore.captureHistory)
    ? configBefore.captureHistory
    : [];

  await saveConfig({
    lastProjectId: projectId,
    lastSceneId: sceneId,
    lastPlatform: platform.slug,
    preferredAssetType: dom.capAssetType.value,
    preferredStatus: dom.capAssetStatus.value,
    lastCapture: captureEntry,
    captureHistory: [...existingHistory.slice(-19), captureEntry],
  });

  // Send to background for queue + sync
  try {
    const response = await chrome.runtime.sendMessage({
      type: "enqueue-item",
      payload,
    });

    if (!response?.ok) {
      setStatus(response?.error || "Failed to queue capture", true);
      return;
    }

    // Mark optimistic item as synced if background synced it
    const synced = response.syncResult?.processed || 0;
    const remaining = response.syncResult?.remaining || 0;

    if (synced > 0) {
      markOptimisticSynced(optimisticItem.id);
    }

    // Clear draft after successful queue
    await clearSceneDraft().catch((err) => {
      console.warn("[sidepanel]", err.message);
    });

    // Sync profile preferences
    syncProfile({
      lastProjectId: projectId,
      lastSceneId: sceneId,
      lastPlatform: platform.slug,
      preferredAssetType: dom.capAssetType.value,
      preferredStatus: dom.capAssetStatus.value,
    }).catch((err) =>
      console.warn("[sidepanel] syncProfile after capture:", err.message),
    );

    setStatus(`Queued. Synced ${synced}, ${remaining} remaining.`);

    // Reload scene assets to see the new version
    if (synced > 0) {
      const { loadSceneAssets } = await import("./data-loaders.js");
      await loadSceneAssets(projectId, sceneId).catch((err) => {
        console.warn("[sidepanel]", err.message);
      });
    }

    // Refresh the queue display from actual storage
    await loadQueueFromStorage();

    const { refreshIntentSuggestions } = await import("./intent.js");
    refreshIntentSuggestions();
  } catch (err) {
    setStatus(err.message, true);
  }
}
