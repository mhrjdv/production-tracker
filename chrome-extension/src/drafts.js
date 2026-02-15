/* ==========================================================
   Drafts – Per-scene draft persistence (project::scene key)
   ========================================================== */

import { getConfig, saveConfig } from "./config.js";
import { dom } from "./dom.js";
import state from "./state.js";
import { normalizeTags, parseMetadata } from "./utils.js";

export function getCurrentDraftKey() {
  const projectId = dom.ctxProjectSelect.value;
  const sceneId = dom.ctxSceneSelect.value;
  if (!projectId || !sceneId) return "";
  return `${projectId}::${sceneId}`;
}

export function collectCaptureFormState() {
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
    platformLabel:
      state.platforms.find((p) => p.slug === dom.capPlatformSelect.value)
        ?.name || "",
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
    updatedAt: new Date().toISOString(),
  };
}

export async function saveSceneDraft() {
  const key = getCurrentDraftKey();
  if (!key) return;
  const config = state.configCache || (await getConfig());
  const nextDrafts = {
    ...(config.sceneDrafts || {}),
    [key]: collectCaptureFormState(),
  };
  await saveConfig({ sceneDrafts: nextDrafts });
}

export async function restoreSceneDraft() {
  const key = getCurrentDraftKey();
  if (!key) return false;
  const config = state.configCache || (await getConfig());
  const draft = config.sceneDrafts?.[key];
  if (!draft) return false;
  const { hydrateCapture } = await import("./capture.js");
  hydrateCapture(draft);
  return true;
}

export async function clearSceneDraft() {
  const key = getCurrentDraftKey();
  if (!key) return false;
  const config = state.configCache || (await getConfig());
  if (!config.sceneDrafts?.[key]) return false;
  const nextDrafts = { ...config.sceneDrafts };
  delete nextDrafts[key];
  await saveConfig({ sceneDrafts: nextDrafts });
  return true;
}

export function scheduleSceneDraftSave() {
  if (state.draftSaveTimer) clearTimeout(state.draftSaveTimer);
  state.draftSaveTimer = setTimeout(() => {
    saveSceneDraft().catch((err) => {
      console.warn("[sidepanel]", err.message);
    });
  }, 300);
}
