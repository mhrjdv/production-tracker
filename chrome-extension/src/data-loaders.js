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

  // Group scenes by act using <optgroup>
  dom.ctxSceneSelect.innerHTML = "";
  const groups = {};
  for (const s of state.scenes) {
    const act = s.act || "Other";
    if (!groups[act]) groups[act] = [];
    groups[act].push(s);
  }

  const actKeys = Object.keys(groups).sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  if (actKeys.length <= 1 && actKeys[0] === "Other") {
    // No act data — fall back to flat list
    populateSelect(
      dom.ctxSceneSelect,
      state.scenes,
      (s) => s.sceneId,
      (s) => `${s.sceneId} -- ${s.storyBeat}`,
    );
  } else {
    for (const act of actKeys) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = act === "Other" ? "Other" : `Act ${act}`;
      for (const s of groups[act]) {
        const opt = document.createElement("option");
        opt.value = s.sceneId;
        opt.textContent = `${s.sceneId} -- ${s.storyBeat}`;
        optgroup.appendChild(opt);
      }
      dom.ctxSceneSelect.appendChild(optgroup);
    }
  }
}

export async function loadShots(sceneDbId) {
  state.shots = [];
  if (!dom.ctxShotSelect) return;

  dom.ctxShotSelect.innerHTML = "";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "(Scene-level)";
  dom.ctxShotSelect.appendChild(defaultOpt);

  if (!sceneDbId) return;

  try {
    const data = await fetchApi(
      `/api/extension/shots?sceneDbId=${encodeURIComponent(sceneDbId)}`,
    );
    state.shots = data.shots || [];

    for (const shot of state.shots) {
      const opt = document.createElement("option");
      opt.value = shot.id;
      opt.textContent = `${shot.shotCode} -- ${shot.description}`;
      dom.ctxShotSelect.appendChild(opt);
    }
  } catch (err) {
    console.warn("[sidepanel] loadShots:", err.message);
  }
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
