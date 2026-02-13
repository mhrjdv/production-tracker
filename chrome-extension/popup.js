const CONFIG_KEY = "extensionConfig";

const platformHintMap = [
  { match: "suno.com", slug: "suno" },
  { match: "udio.com", slug: "udio" },
  { match: "elevenlabs.io", slug: "elevenlabs" },
  { match: "play.ht", slug: "playht" },
  { match: "murf.ai", slug: "murf" },
  { match: "midjourney.com", slug: "midjourney" },
  { match: "ideogram.ai", slug: "ideogram" },
  { match: "leonardo.ai", slug: "leonardo-ai" },
  { match: "blackforestlabs.ai", slug: "bfl-flux" },
  { match: "stability.ai", slug: "stability-ai" },
  { match: "recraft.ai", slug: "recraft" },
  { match: "freepik.com", slug: "freepik-ai" },
  { match: "adobe.com", slug: "adobe-firefly" },
  { match: "openai.com", slug: "openai-sora" },
  { match: "sora.chatgpt.com", slug: "openai-sora" },
  { match: "deepmind.google", slug: "google-veo" },
  { match: "lumalabs.ai", slug: "luma-dream-machine" },
  { match: "klingai.com", slug: "kling-ai" },
  { match: "runwayml.com", slug: "runway" },
  { match: "pika.art", slug: "pika" },
  { match: "haiper.ai", slug: "haiper" },
];

const dom = {
  baseUrl: document.getElementById("baseUrl"),
  token: document.getElementById("token"),
  openAiBaseUrl: document.getElementById("openAiBaseUrl"),
  openAiModel: document.getElementById("openAiModel"),
  openAiApiKey: document.getElementById("openAiApiKey"),
  saveConfig: document.getElementById("saveConfig"),
  refreshData: document.getElementById("refreshData"),
  projectSelect: document.getElementById("projectSelect"),
  sceneSelect: document.getElementById("sceneSelect"),
  platformSelect: document.getElementById("platformSelect"),
  sceneAssetSelect: document.getElementById("sceneAssetSelect"),
  loadAssetPrompt: document.getElementById("loadAssetPrompt"),
  intentPanel: document.getElementById("intentPanel"),
  intentSummary: document.getElementById("intentSummary"),
  intentActions: document.getElementById("intentActions"),
  assetType: document.getElementById("assetType"),
  assetStatus: document.getElementById("assetStatus"),
  title: document.getElementById("title"),
  prompt: document.getElementById("prompt"),
  negativePrompt: document.getElementById("negativePrompt"),
  modelName: document.getElementById("modelName"),
  sourceUrl: document.getElementById("sourceUrl"),
  outputUrl: document.getElementById("outputUrl"),
  thumbnailUrl: document.getElementById("thumbnailUrl"),
  externalAssetId: document.getElementById("externalAssetId"),
  tags: document.getElementById("tags"),
  metadata: document.getElementById("metadata"),
  notes: document.getElementById("notes"),
  restoreDraft: document.getElementById("restoreDraft"),
  clearDraft: document.getElementById("clearDraft"),
  autoFill: document.getElementById("autoFill"),
  applyPrompt: document.getElementById("applyPrompt"),
  refinePrompt: document.getElementById("refinePrompt"),
  queueSync: document.getElementById("queueSync"),
  syncNow: document.getElementById("syncNow"),
  status: document.getElementById("status"),
};

let projects = [];
let scenes = [];
let platforms = [];
let sceneAssets = [];
let currentTab = null;
let currentConfigCache = null;
let lastPageContext = null;
let draftSaveTimer = null;

function setStatus(message, isError = false) {
  dom.status.textContent = message;
  dom.status.style.color = isError ? "#f87171" : "#8f98ad";
}

async function getConfig() {
  const data = await chrome.storage.local.get(CONFIG_KEY);
  return data[CONFIG_KEY] || {
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
}

async function saveConfig(partial) {
  const current = await getConfig();
  await chrome.storage.local.set({
    [CONFIG_KEY]: {
      ...current,
      ...partial,
    },
  });
}

function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function normalizeTags(raw) {
  const seen = new Set();
  const tags = [];
  String(raw || "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .forEach((tag) => {
      if (seen.has(tag)) return;
      seen.add(tag);
      tags.push(tag);
    });
  return tags;
}

function parseMetadata(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return undefined;
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Metadata JSON must be an object.");
  }
  return parsed;
}

function pickPreferredPlatformForType(assetType) {
  const preferredOrder = {
    VIDEO: ["openai-sora", "google-veo", "runway", "kling-ai", "luma-dream-machine", "pika"],
    IMAGE: ["midjourney", "ideogram", "bfl-flux", "freepik-ai", "adobe-firefly"],
    MUSIC: ["suno", "udio"],
    AUDIO: ["suno", "elevenlabs", "playht"],
    VOICE: ["elevenlabs", "playht", "murf"],
    NARRATION: ["elevenlabs", "playht", "murf"],
    STORYBOARD: ["midjourney", "freepik-ai", "adobe-firefly"],
    SCRIPT: ["openai-sora"],
    OTHER: [],
  };

  const slugs = preferredOrder[assetType] || [];
  for (const slug of slugs) {
    const match = platforms.find((platform) => platform.slug === slug);
    if (match) return match;
  }

  return (
    platforms.find((platform) => (platform.supportedOutput || []).includes(assetType)) ||
    null
  );
}

function hydrateFromCapture(capture, options = {}) {
  if (!capture) return;
  const overridePrompt = options.overridePrompt ?? true;
  const keepIfFilled = (current, incoming) =>
    current && !overridePrompt ? current : incoming || current;

  dom.title.value = keepIfFilled(dom.title.value, capture.title || "");
  dom.prompt.value = keepIfFilled(dom.prompt.value, capture.prompt || "");
  dom.negativePrompt.value = keepIfFilled(dom.negativePrompt.value, capture.negativePrompt || "");
  dom.modelName.value = keepIfFilled(dom.modelName.value, capture.modelName || "");
  dom.sourceUrl.value = keepIfFilled(dom.sourceUrl.value, capture.sourceUrl || "");
  dom.outputUrl.value = keepIfFilled(dom.outputUrl.value, capture.outputUrl || "");
  dom.thumbnailUrl.value = keepIfFilled(dom.thumbnailUrl.value, capture.thumbnailUrl || "");
  dom.externalAssetId.value = keepIfFilled(dom.externalAssetId.value, capture.externalAssetId || "");

  if ((capture.assetType || "") && dom.assetType.querySelector(`option[value="${capture.assetType}"]`)) {
    dom.assetType.value = capture.assetType;
  }
  if ((capture.status || "") && dom.assetStatus.querySelector(`option[value="${capture.status}"]`)) {
    dom.assetStatus.value = capture.status;
  }
  if (capture.platformKey && platforms.some((platform) => platform.slug === capture.platformKey)) {
    dom.platformSelect.value = capture.platformKey;
  }

  if (capture.tags && Array.isArray(capture.tags)) {
    dom.tags.value = capture.tags.join(", ");
  }
  if (capture.metadata && typeof capture.metadata === "object") {
    dom.metadata.value = JSON.stringify(capture.metadata, null, 2);
  }
  dom.notes.value = keepIfFilled(dom.notes.value, capture.notes || "");
}

function applyPageContextToForm(context, options = {}) {
  if (!context) return;
  const override = options.overridePrompt ?? false;
  if (context.prompt && (!dom.prompt.value.trim() || override)) dom.prompt.value = context.prompt;
  if (context.modelName && !dom.modelName.value.trim()) dom.modelName.value = context.modelName;
  if (context.outputUrl && !dom.outputUrl.value.trim()) dom.outputUrl.value = context.outputUrl;
  if (context.sourceUrl) dom.sourceUrl.value = context.sourceUrl;
  if (context.assetType && dom.assetType.querySelector(`option[value="${context.assetType}"]`)) {
    dom.assetType.value = context.assetType;
  }
  const guessed = detectPlatformSlug(context.sourceUrl || "");
  if (guessed && platforms.some((platform) => platform.slug === guessed)) {
    dom.platformSelect.value = guessed;
  }
}

function getCurrentSceneDraftKey() {
  const projectId = dom.projectSelect.value;
  const sceneId = dom.sceneSelect.value;
  if (!projectId || !sceneId) return "";
  return `${projectId}::${sceneId}`;
}

function collectCurrentFormState() {
  let metadata = null;
  try {
    metadata = parseMetadata(dom.metadata.value) || null;
  } catch {
    metadata = null;
  }

  return {
    projectId: dom.projectSelect.value,
    sceneId: dom.sceneSelect.value,
    platformKey: dom.platformSelect.value,
    platformLabel: platforms.find((platform) => platform.slug === dom.platformSelect.value)?.name || "",
    assetType: dom.assetType.value,
    status: dom.assetStatus.value,
    title: dom.title.value.trim(),
    prompt: dom.prompt.value.trim(),
    negativePrompt: dom.negativePrompt.value.trim(),
    modelName: dom.modelName.value.trim(),
    sourceUrl: dom.sourceUrl.value.trim(),
    outputUrl: dom.outputUrl.value.trim(),
    thumbnailUrl: dom.thumbnailUrl.value.trim(),
    externalAssetId: dom.externalAssetId.value.trim(),
    tags: normalizeTags(dom.tags.value),
    metadata,
    notes: dom.notes.value.trim(),
    updatedAt: new Date().toISOString(),
  };
}

function resetCaptureForm(options = {}) {
  const preserveSourceUrl = options.preserveSourceUrl ?? true;
  const sourceUrl = dom.sourceUrl.value;

  dom.title.value = "";
  dom.prompt.value = "";
  dom.negativePrompt.value = "";
  dom.modelName.value = "";
  dom.outputUrl.value = "";
  dom.thumbnailUrl.value = "";
  dom.externalAssetId.value = "";
  dom.tags.value = "";
  dom.metadata.value = "";
  dom.notes.value = "";
  dom.assetStatus.value = "DRAFT";

  if (!preserveSourceUrl) {
    dom.sourceUrl.value = "";
  } else {
    dom.sourceUrl.value = sourceUrl;
  }
}

async function saveSceneDraft() {
  const key = getCurrentSceneDraftKey();
  if (!key) return;

  const config = currentConfigCache || (await getConfig());
  const nextDrafts = {
    ...(config.sceneDrafts || {}),
    [key]: collectCurrentFormState(),
  };

  await saveConfig({ sceneDrafts: nextDrafts });
  currentConfigCache = {
    ...config,
    sceneDrafts: nextDrafts,
  };
}

async function restoreSceneDraft(options = {}) {
  const key = getCurrentSceneDraftKey();
  if (!key) return false;

  const config = currentConfigCache || (await getConfig());
  const draft = config.sceneDrafts?.[key];
  if (!draft) return false;

  const overridePrompt = options.overridePrompt ?? false;
  hydrateFromCapture(draft, { overridePrompt });
  await refreshIntentSuggestions();
  return true;
}

async function clearSceneDraft() {
  const key = getCurrentSceneDraftKey();
  if (!key) return false;

  const config = currentConfigCache || (await getConfig());
  if (!config.sceneDrafts || !config.sceneDrafts[key]) return false;

  const nextDrafts = { ...config.sceneDrafts };
  delete nextDrafts[key];
  await saveConfig({ sceneDrafts: nextDrafts });
  currentConfigCache = {
    ...config,
    sceneDrafts: nextDrafts,
  };
  await refreshIntentSuggestions();
  return true;
}

function scheduleSceneDraftSave() {
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer);
  }

  draftSaveTimer = setTimeout(() => {
    saveSceneDraft().catch(() => null);
  }, 220);
}

async function refreshIntentSuggestions() {
  const suggestions = [];
  const config = currentConfigCache || (await getConfig());
  const sceneId = dom.sceneSelect.value;
  const currentType = dom.assetType.value;
  const currentPlatform = dom.platformSelect.value;
  const sceneDraftKey = getCurrentSceneDraftKey();
  const sceneDraft = sceneDraftKey ? config.sceneDrafts?.[sceneDraftKey] : null;

  if (sceneDraft && sceneDraft.prompt && sceneDraft.prompt !== dom.prompt.value.trim()) {
    suggestions.push({
      id: "restore-scene-draft",
      label: "Restore Draft",
      reason: `Unsynced draft found for ${sceneId}.`,
      run: async () => {
        hydrateFromCapture(sceneDraft, { overridePrompt: true });
        setStatus("Restored unsynced draft.");
      },
    });
  }

  const lastCapture = config.lastCapture;
  if (
    lastCapture &&
    lastCapture.sceneId === sceneId &&
    lastCapture.projectId === dom.projectSelect.value
  ) {
    suggestions.push({
      id: "continue-last-capture",
      label: "Continue Last Action",
      reason: `Last action: ${lastCapture.assetType} on ${lastCapture.platformLabel || lastCapture.platformKey}.`,
      run: async () => {
        hydrateFromCapture(lastCapture, { overridePrompt: false });
        if (dom.assetStatus.value === "SELECTED") {
          dom.assetStatus.value = "GENERATED";
        }
        setStatus("Loaded previous action context.");
      },
    });
  }

  const history = Array.isArray(config.captureHistory) ? config.captureHistory : [];
  const recurring =
    history
      .filter(
        (item) =>
          item.sceneId === sceneId &&
          item.assetType === currentType &&
          item.platformKey === currentPlatform
      )
      .slice(-1)[0] || null;
  if (recurring && recurring.modelName && !dom.modelName.value.trim()) {
    suggestions.push({
      id: "reuse-recurring-model",
      label: "Use Last Model",
      reason: `Previous ${currentType} capture here used model ${recurring.modelName}.`,
      run: async () => {
        dom.modelName.value = recurring.modelName;
        if (!dom.tags.value && recurring.tags?.length) {
          dom.tags.value = recurring.tags.join(", ");
        }
        setStatus("Applied recurring model suggestion.");
      },
    });
  }

  const selectedSameType = sceneAssets.find(
    (asset) => asset.selected && asset.assetType === currentType
  );
  if (selectedSameType) {
    suggestions.push({
      id: "selected-variant",
      label: "Variant From Selected",
      reason: `Selected ${currentType} v${selectedSameType.versionNumber} found in this scene.`,
      run: async () => {
        applySceneAssetPrompt(selectedSameType.id);
        dom.assetStatus.value = "GENERATED";
        setStatus("Prepared variant from selected version.");
      },
    });
  }

  const selectedImage =
    sceneAssets.find((asset) => asset.selected && asset.assetType === "IMAGE") ||
    sceneAssets.find((asset) => asset.selected && asset.assetType === "STORYBOARD");
  const hasVideo = sceneAssets.some((asset) => asset.assetType === "VIDEO");
  if (selectedImage && !hasVideo) {
    suggestions.push({
      id: "next-video-pass",
      label: "Prep Video Pass",
      reason: "Scene has selected image/storyboard but no video version yet.",
      run: async () => {
        applySceneAssetPrompt(selectedImage.id);
        dom.assetType.value = "VIDEO";
        dom.assetStatus.value = "GENERATED";
        const preferred = pickPreferredPlatformForType("VIDEO");
        if (preferred) dom.platformSelect.value = preferred.slug;
        setStatus("Prepared video-pass draft from selected image.");
      },
    });
  }

  if (lastPageContext && lastPageContext.prompt && !dom.prompt.value.trim()) {
    suggestions.push({
      id: "capture-page-context",
      label: "Use Page Prompt",
      reason: "Detected prompt text in the current tab.",
      run: async () => {
        applyPageContextToForm(lastPageContext, { overridePrompt: true });
        if (!dom.assetStatus.value || dom.assetStatus.value === "DRAFT") {
          dom.assetStatus.value = "GENERATED";
        }
        setStatus("Applied detected page prompt.");
      },
    });
  }

  if (currentPlatform && currentType && dom.prompt.value.trim() && dom.assetStatus.value === "DRAFT") {
    suggestions.push({
      id: "promote-generated",
      label: "Set Status: GENERATED",
      reason: "Prompt and platform are set; likely intent is generated output tracking.",
      run: async () => {
        dom.assetStatus.value = "GENERATED";
        setStatus("Status changed to GENERATED.");
      },
    });
  }

  dom.intentActions.innerHTML = "";
  if (suggestions.length === 0) {
    dom.intentPanel.classList.add("hidden");
    dom.intentSummary.textContent = "";
    return;
  }

  dom.intentPanel.classList.remove("hidden");
  dom.intentSummary.textContent = `Smart intent: ${suggestions[0].reason}`;

  suggestions.slice(0, 3).forEach((suggestion) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tertiary";
    button.textContent = suggestion.label;
    button.addEventListener("click", async () => {
      try {
        button.disabled = true;
        await suggestion.run();
        await refreshIntentSuggestions();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error), true);
      } finally {
        button.disabled = false;
      }
    });
    dom.intentActions.appendChild(button);
  });
}

async function fetchApi(path, options = {}) {
  const baseUrl = dom.baseUrl.value.trim().replace(/\/+$/, "");
  const token = dom.token.value.trim();
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return response.json();
}

function populateSelect(select, items, getValue, getLabel) {
  select.innerHTML = "";
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = getValue(item);
    option.textContent = getLabel(item);
    select.appendChild(option);
  });
}

function detectPlatformSlug(url) {
  if (!url) return "";
  const lower = url.toLowerCase();
  const match = platformHintMap.find((item) => lower.includes(item.match));
  return match?.slug || "";
}

async function syncProfile(preferences) {
  if (!dom.token.value.trim()) return;
  await fetchApi("/api/extension/profile", {
    method: "PUT",
    body: { preferences },
  });
}

async function loadProfile() {
  const data = await fetchApi("/api/extension/profile");
  return data.preferences || {};
}

async function loadProjectsAndPlatforms() {
  const [projectData, platformData] = await Promise.all([
    fetchApi("/api/extension/projects"),
    fetchApi("/api/extension/platforms"),
  ]);

  projects = projectData.projects || [];
  platforms = platformData.platforms || [];

  populateSelect(
    dom.projectSelect,
    projects,
    (project) => project.id,
    (project) => `${project.name} (${project.sceneCount})`
  );

  populateSelect(
    dom.platformSelect,
    platforms,
    (platform) => platform.slug,
    (platform) => platform.provider ? `${platform.name} · ${platform.provider}` : platform.name
  );
}

async function loadScenes(projectId) {
  if (!projectId) {
    scenes = [];
    dom.sceneSelect.innerHTML = "";
    return;
  }

  const sceneData = await fetchApi(`/api/extension/scenes?projectId=${encodeURIComponent(projectId)}`);
  scenes = sceneData.scenes || [];
  populateSelect(
    dom.sceneSelect,
    scenes,
    (scene) => scene.sceneId,
    (scene) => `${scene.sceneId} · ${scene.storyBeat}`
  );
}

async function loadSceneAssets(projectId, sceneId) {
  if (!projectId || !sceneId) {
    sceneAssets = [];
    dom.sceneAssetSelect.innerHTML = "";
    await refreshIntentSuggestions();
    return;
  }

  const data = await fetchApi(
    `/api/extension/scene-assets?projectId=${encodeURIComponent(projectId)}&sceneId=${encodeURIComponent(sceneId)}&limit=40`
  );
  sceneAssets = data.assets || [];

  dom.sceneAssetSelect.innerHTML = "";
  if (sceneAssets.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No saved versions for this scene";
    dom.sceneAssetSelect.appendChild(option);
    return;
  }

  sceneAssets.forEach((asset) => {
    const option = document.createElement("option");
    option.value = asset.id;
    option.textContent = `${asset.selected ? "★ " : ""}${asset.platformLabel} · ${asset.assetType} · v${asset.versionNumber}`;
    dom.sceneAssetSelect.appendChild(option);
  });

  await refreshIntentSuggestions();
}

function applySceneAssetPrompt(assetId) {
  const asset = sceneAssets.find((item) => item.id === assetId);
  if (!asset) return;

  dom.title.value = asset.title || "";
  dom.prompt.value = asset.prompt || "";
  dom.negativePrompt.value = asset.negativePrompt || "";
  dom.modelName.value = asset.modelName || "";
  dom.assetType.value = asset.assetType || dom.assetType.value;
  dom.assetStatus.value = asset.status || dom.assetStatus.value;
  dom.tags.value = (asset.tags || []).join(", ");
  dom.metadata.value = asset.metadata ? JSON.stringify(asset.metadata, null, 2) : "";
  void refreshIntentSuggestions();
}

async function sendMessageToActiveTab(message) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) {
    throw new Error("No active tab available.");
  }
  return chrome.tabs.sendMessage(tab.id, message);
}

async function autoFillFromPage() {
  const response = await sendMessageToActiveTab({ type: "extract-page-context" });
  if (!response?.ok || !response?.context) {
    throw new Error(response?.error || "Could not read prompt from current tab.");
  }

  const context = response.context;
  lastPageContext = context;
  applyPageContextToForm(context, { overridePrompt: true });
  await refreshIntentSuggestions();
}

async function applyPromptToPage() {
  const prompt = dom.prompt.value.trim();
  if (!prompt) {
    throw new Error("Prompt is empty.");
  }

  const response = await sendMessageToActiveTab({
    type: "apply-prompt",
    prompt,
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Failed to apply prompt on page.");
  }
}

async function refinePrompt() {
  const prompt = dom.prompt.value.trim();
  if (!prompt) {
    throw new Error("Enter a prompt first.");
  }

  const response = await chrome.runtime.sendMessage({
    type: "ai-refine-prompt",
    payload: { prompt },
  });

  if (!response?.ok) {
    throw new Error(response?.error || "AI prompt refine failed.");
  }

  dom.prompt.value = response.refinedPrompt || dom.prompt.value;
}

async function queueCapture() {
  const selectedProjectId = dom.projectSelect.value;
  const selectedSceneId = dom.sceneSelect.value;
  const selectedPlatformSlug = dom.platformSelect.value;
  const selectedPlatform = platforms.find((platform) => platform.slug === selectedPlatformSlug);
  const prompt = dom.prompt.value.trim();

  if (!selectedProjectId || !selectedSceneId || !selectedPlatform || !prompt) {
    setStatus("Project, scene, platform, and prompt are required.", true);
    return;
  }

  const metadata = parseMetadata(dom.metadata.value);
  const tags = normalizeTags(dom.tags.value);

  const payload = {
    projectId: selectedProjectId,
    sceneId: selectedSceneId,
    platformId: selectedPlatform.id,
    platformKey: selectedPlatform.slug,
    platformLabel: selectedPlatform.name,
    assetType: dom.assetType.value,
    status: dom.assetStatus.value,
    title: dom.title.value.trim() || undefined,
    prompt,
    negativePrompt: dom.negativePrompt.value.trim() || undefined,
    modelName: dom.modelName.value.trim() || undefined,
    sourceUrl: dom.sourceUrl.value.trim() || undefined,
    outputUrl: dom.outputUrl.value.trim() || undefined,
    thumbnailUrl: dom.thumbnailUrl.value.trim() || undefined,
    externalAssetId: dom.externalAssetId.value.trim() || undefined,
    metadata,
    tags,
    notes: dom.notes.value.trim() || undefined,
  };

  const captureEntry = {
    projectId: selectedProjectId,
    sceneId: selectedSceneId,
    platformKey: selectedPlatform.slug,
    platformLabel: selectedPlatform.name,
    assetType: dom.assetType.value,
    status: dom.assetStatus.value,
    title: dom.title.value.trim() || "",
    prompt,
    negativePrompt: dom.negativePrompt.value.trim() || "",
    modelName: dom.modelName.value.trim() || "",
    sourceUrl: dom.sourceUrl.value.trim() || "",
    outputUrl: dom.outputUrl.value.trim() || "",
    thumbnailUrl: dom.thumbnailUrl.value.trim() || "",
    externalAssetId: dom.externalAssetId.value.trim() || "",
    tags,
    metadata: metadata || null,
    notes: dom.notes.value.trim() || "",
    capturedAt: new Date().toISOString(),
  };

  const response = await chrome.runtime.sendMessage({
    type: "enqueue-item",
    payload,
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Failed to queue capture");
  }

  const configBeforeSave = currentConfigCache || (await getConfig());
  const history = Array.isArray(configBeforeSave.captureHistory)
    ? configBeforeSave.captureHistory
    : [];

  await saveConfig({
    lastProjectId: selectedProjectId,
    lastSceneId: selectedSceneId,
    lastPlatform: selectedPlatform.slug,
    baseUrl: dom.baseUrl.value.trim(),
    preferredAssetType: dom.assetType.value,
    preferredStatus: dom.assetStatus.value,
    lastCapture: captureEntry,
    captureHistory: [...history.slice(-19), captureEntry],
  });

  currentConfigCache = await getConfig();
  await clearSceneDraft().catch(() => null);
  await refreshIntentSuggestions();

  try {
    await syncProfile({
      lastProjectId: selectedProjectId,
      lastSceneId: selectedSceneId,
      lastPlatform: selectedPlatform.slug,
      preferredAssetType: dom.assetType.value,
      preferredStatus: dom.assetStatus.value,
      openAiBaseUrl: normalizeBaseUrl(dom.openAiBaseUrl.value),
      openAiModel: dom.openAiModel.value.trim(),
    });
  } catch {
    // keep capture flow non-blocking even if profile sync fails
  }

  const synced = response.syncResult?.processed || 0;
  const remaining = response.syncResult?.remaining || 0;
  setStatus(`Queued. Synced ${synced} item(s), ${remaining} remaining.`);
}

async function syncNow() {
  const response = await chrome.runtime.sendMessage({ type: "sync-now" });
  if (!response?.ok) {
    throw new Error(response?.error || "Sync failed");
  }
  const result = response.result || { processed: 0, remaining: 0 };
  setStatus(`Synced ${result.processed} item(s), ${result.remaining} remaining.`);
}

async function initialize() {
  const config = await getConfig();
  currentConfigCache = config;
  dom.baseUrl.value = config.baseUrl || "http://localhost:3000";
  dom.token.value = config.token || "";
  dom.openAiBaseUrl.value = config.openAiBaseUrl || "";
  dom.openAiModel.value = config.openAiModel || "";
  dom.openAiApiKey.value = config.openAiApiKey || "";
  dom.assetType.value = config.preferredAssetType || "IMAGE";
  dom.assetStatus.value = config.preferredStatus || "DRAFT";

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0] || null;

  if (currentTab?.url) {
    dom.sourceUrl.value = currentTab.url;
  }

  if (!dom.token.value.trim()) {
    setStatus("Set API URL and token, then click Save.");
    return;
  }

  try {
    const profile = await loadProfile().catch(() => ({}));

    await loadProjectsAndPlatforms();

    const defaultProject =
      config.lastProjectId ||
      profile.lastProjectId ||
      projects[0]?.id ||
      "";

    if (defaultProject) {
      dom.projectSelect.value = defaultProject;
    }

    await loadScenes(defaultProject);

    const defaultScene =
      config.lastSceneId ||
      profile.lastSceneId ||
      scenes[0]?.sceneId ||
      "";

    if (defaultScene) {
      dom.sceneSelect.value = defaultScene;
    }

    await loadSceneAssets(dom.projectSelect.value, dom.sceneSelect.value);
    resetCaptureForm({ preserveSourceUrl: true });
    await restoreSceneDraft({ overridePrompt: false });

    const autoPlatform = detectPlatformSlug(currentTab?.url || "");
    if (autoPlatform) {
      dom.platformSelect.value = autoPlatform;
    } else if (config.lastPlatform) {
      dom.platformSelect.value = config.lastPlatform;
    } else if (profile.lastPlatform) {
      dom.platformSelect.value = profile.lastPlatform;
    }

    if (profile.preferredAssetType && dom.assetType.querySelector(`option[value="${profile.preferredAssetType}"]`)) {
      dom.assetType.value = profile.preferredAssetType;
    }
    if (profile.preferredStatus && dom.assetStatus.querySelector(`option[value="${profile.preferredStatus}"]`)) {
      dom.assetStatus.value = profile.preferredStatus;
    }

    if (!dom.openAiBaseUrl.value && profile.openAiBaseUrl) {
      dom.openAiBaseUrl.value = profile.openAiBaseUrl;
    }
    if (!dom.openAiModel.value && profile.openAiModel) {
      dom.openAiModel.value = profile.openAiModel;
    }

    if (!dom.sourceUrl.value.trim() && currentTab?.url) {
      dom.sourceUrl.value = currentTab.url;
    }

    if (!dom.prompt.value.trim()) {
      await autoFillFromPage().catch(() => null);
    } else if (config.lastPlatform) {
      dom.platformSelect.value = config.lastPlatform;
    }

    await refreshIntentSuggestions();

    const queueInfo = await chrome.runtime.sendMessage({ type: "get-queue-size" });
    const queueSize = queueInfo?.size || 0;
    setStatus(`Ready. Queue has ${queueSize} item(s).`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  }
}

dom.saveConfig.addEventListener("click", async () => {
  const nextConfig = {
    baseUrl: dom.baseUrl.value.trim() || "http://localhost:3000",
    token: dom.token.value.trim(),
    openAiBaseUrl: normalizeBaseUrl(dom.openAiBaseUrl.value),
    openAiModel: dom.openAiModel.value.trim(),
    openAiApiKey: dom.openAiApiKey.value.trim(),
    preferredAssetType: dom.assetType.value,
    preferredStatus: dom.assetStatus.value,
    lastProjectId: dom.projectSelect.value || "",
    lastSceneId: dom.sceneSelect.value || "",
    lastPlatform: dom.platformSelect.value || "",
  };
  await saveConfig(nextConfig);
  currentConfigCache = await getConfig();

  await chrome.runtime.sendMessage({
    type: "save-config",
    config: nextConfig,
  });

  try {
    await syncProfile({
      lastProjectId: dom.projectSelect.value || "",
      lastSceneId: dom.sceneSelect.value || "",
      lastPlatform: dom.platformSelect.value || "",
      preferredAssetType: dom.assetType.value,
      preferredStatus: dom.assetStatus.value,
      openAiBaseUrl: normalizeBaseUrl(dom.openAiBaseUrl.value),
      openAiModel: dom.openAiModel.value.trim(),
    });
  } catch {
    // no-op
  }

  setStatus("Saved. Reloading project data...");
  await initialize();
});

dom.refreshData.addEventListener("click", async () => {
  await initialize();
});

dom.projectSelect.addEventListener("change", async () => {
  try {
    await saveSceneDraft().catch(() => null);
    await loadScenes(dom.projectSelect.value);
    await loadSceneAssets(dom.projectSelect.value, dom.sceneSelect.value);
    resetCaptureForm({ preserveSourceUrl: true });
    await restoreSceneDraft({ overridePrompt: false });
    await saveConfig({
      lastProjectId: dom.projectSelect.value,
      lastSceneId: dom.sceneSelect.value || "",
    });
    await syncProfile({
      lastProjectId: dom.projectSelect.value,
      lastSceneId: dom.sceneSelect.value || "",
    });
    await refreshIntentSuggestions();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  }
});

dom.sceneSelect.addEventListener("change", async () => {
  try {
    await saveSceneDraft().catch(() => null);
    await loadSceneAssets(dom.projectSelect.value, dom.sceneSelect.value);
    resetCaptureForm({ preserveSourceUrl: true });
    await restoreSceneDraft({ overridePrompt: false });
    await saveConfig({ lastSceneId: dom.sceneSelect.value });
    await syncProfile({ lastSceneId: dom.sceneSelect.value });
    await refreshIntentSuggestions();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  }
});

dom.platformSelect.addEventListener("change", async () => {
  await saveConfig({ lastPlatform: dom.platformSelect.value });
  await syncProfile({ lastPlatform: dom.platformSelect.value }).catch(() => null);
  scheduleSceneDraftSave();
  await refreshIntentSuggestions();
});

dom.assetType.addEventListener("change", async () => {
  await saveConfig({ preferredAssetType: dom.assetType.value });
  await syncProfile({ preferredAssetType: dom.assetType.value }).catch(() => null);
  scheduleSceneDraftSave();
  await refreshIntentSuggestions();
});

dom.assetStatus.addEventListener("change", async () => {
  await saveConfig({ preferredStatus: dom.assetStatus.value });
  await syncProfile({ preferredStatus: dom.assetStatus.value }).catch(() => null);
  scheduleSceneDraftSave();
  await refreshIntentSuggestions();
});

dom.loadAssetPrompt.addEventListener("click", async () => {
  try {
    const assetId = dom.sceneAssetSelect.value;
    if (!assetId) return;
    applySceneAssetPrompt(assetId);
    setStatus("Loaded prompt from selected scene version.");
    await refreshIntentSuggestions();
    await saveSceneDraft();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  }
});

dom.restoreDraft.addEventListener("click", async () => {
  try {
    const restored = await restoreSceneDraft({ overridePrompt: true });
    if (!restored) {
      setStatus("No saved draft found for this scene.");
      return;
    }
    setStatus("Draft restored.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  }
});

dom.clearDraft.addEventListener("click", async () => {
  try {
    const cleared = await clearSceneDraft();
    if (!cleared) {
      setStatus("No draft to clear.");
      return;
    }
    setStatus("Draft cleared for this scene.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  }
});

dom.autoFill.addEventListener("click", async () => {
  try {
    dom.autoFill.disabled = true;
    await autoFillFromPage();
    setStatus("Auto-filled from current tab.");
    await saveSceneDraft();
    await refreshIntentSuggestions();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    dom.autoFill.disabled = false;
  }
});

dom.applyPrompt.addEventListener("click", async () => {
  try {
    dom.applyPrompt.disabled = true;
    await applyPromptToPage();
    setStatus("Prompt applied to current page.");
    await refreshIntentSuggestions();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    dom.applyPrompt.disabled = false;
  }
});

dom.refinePrompt.addEventListener("click", async () => {
  try {
    dom.refinePrompt.disabled = true;
    await refinePrompt();
    setStatus("Prompt refined using your BYOK model.");
    await saveSceneDraft();
    await refreshIntentSuggestions();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    dom.refinePrompt.disabled = false;
  }
});

dom.queueSync.addEventListener("click", async () => {
  try {
    dom.queueSync.disabled = true;
    await queueCapture();
    await refreshIntentSuggestions();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    dom.queueSync.disabled = false;
  }
});

dom.syncNow.addEventListener("click", async () => {
  try {
    dom.syncNow.disabled = true;
    await syncNow();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    dom.syncNow.disabled = false;
  }
});

[
  dom.title,
  dom.prompt,
  dom.negativePrompt,
  dom.modelName,
  dom.sourceUrl,
  dom.outputUrl,
  dom.thumbnailUrl,
  dom.externalAssetId,
  dom.metadata,
  dom.notes,
  dom.tags,
].forEach((field) => {
  field.addEventListener("input", () => {
    scheduleSceneDraftSave();
    void refreshIntentSuggestions();
  });
});

initialize();
