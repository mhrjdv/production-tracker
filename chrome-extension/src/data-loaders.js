/* ==========================================================
   Data Loaders – Fetch projects, scenes, scene assets from API
   ========================================================== */

import { fetchApi } from "./api.js";
import { dom, populateSelect } from "./dom.js";
import state from "./state.js";
import {
  renderShotCard,
  renderReuseList,
  renderPreviewList,
} from "./render.js";

export async function loadProjectsAndPlatforms() {
  const [projectData, platformData] = await Promise.all([
    fetchApi("/api/extension/projects"),
    fetchApi("/api/extension/platforms"),
  ]);

  state.projects = projectData.projects || [];
  state.platforms = platformData.platforms || [];

  // Context panel selects
  populateSelect(
    dom.ctxProjectSelect,
    state.projects,
    (p) => p.id,
    (p) => `${p.name} (${p.sceneCount})`,
  );

  // Capture panel platform select
  populateSelect(
    dom.capPlatformSelect,
    state.platforms,
    (p) => p.slug,
    (p) => (p.provider ? `${p.name} -- ${p.provider}` : p.name),
  );
}

export async function loadScenes(projectId) {
  if (!projectId) {
    state.scenes = [];
    dom.ctxSceneSelect.innerHTML = "";
    return;
  }

  const sceneData = await fetchApi(
    `/api/extension/scenes?projectId=${encodeURIComponent(projectId)}`,
  );
  state.scenes = sceneData.scenes || [];
  populateSelect(
    dom.ctxSceneSelect,
    state.scenes,
    (s) => s.sceneId,
    (s) => `${s.sceneId} -- ${s.storyBeat}`,
  );
}

export async function loadSceneAssets(projectId, sceneId) {
  if (!projectId || !sceneId) {
    state.sceneAssets = [];
    renderShotCard();
    renderReuseList();
    renderPreviewList();
    return;
  }

  const data = await fetchApi(
    `/api/extension/scene-assets?projectId=${encodeURIComponent(projectId)}&sceneId=${encodeURIComponent(sceneId)}&limit=40`,
  );
  state.sceneAssets = data.assets || [];
  renderShotCard();
  renderReuseList();
  renderPreviewList();

  const { refreshIntentSuggestions } = await import("./intent.js");
  refreshIntentSuggestions();
}
