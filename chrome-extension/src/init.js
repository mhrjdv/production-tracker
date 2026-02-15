/* ==========================================================
   Init – Bootstrap, event listeners, and boot sequence
   ========================================================== */

import { getConfig, normalizeBaseUrl, saveConfig } from "./config.js";
import { fetchApi, fetchCharacters, syncProfile } from "./api.js";
import { dom, setStatus, setActiveMode, toggleSettings } from "./dom.js";
import state from "./state.js";
import {
  detectFromPage,
  detectPlatformSlug,
  autoFillFromPage,
  applyPromptToPage,
  refinePrompt,
} from "./detect.js";
import {
  applyPageContextToCapture,
  resetCaptureForm,
  saveCapture,
  clearAllFields,
  clearField,
} from "./capture.js";
import {
  loadQueueFromStorage,
  renderQueueList,
  syncNow,
  clearFailedItems,
} from "./queue.js";
import {
  saveSceneDraft,
  restoreSceneDraft,
  clearSceneDraft,
  scheduleSceneDraftSave,
} from "./drafts.js";
import {
  openCandidatePicker,
  closeCandidatePicker,
} from "./candidate-picker.js";
import {
  updateContextBar,
  renderReuseList,
  renderCharacterCards,
} from "./render.js";
import {
  openCompare,
  closeCompare,
  clearCompareSelections,
} from "./compare.js";
import {
  loadProjectsAndPlatforms,
  loadScenes,
  loadSceneAssets,
} from "./data-loaders.js";
import { refreshIntentSuggestions } from "./intent.js";

// ── Tab change listener ─────────────────────────────────

function onTabActivated() {
  detectFromPage()
    .then(() => {
      refreshIntentSuggestions();
    })
    .catch((err) => console.warn("[sidepanel]", err.message));
}

// ── Initialize ──────────────────────────────────────────

async function initialize() {
  const config = await getConfig();
  state.configCache = config;

  // Populate settings fields
  dom.cfgBaseUrl.value = config.baseUrl || "http://localhost:3000";
  dom.cfgToken.value = config.token || "";
  dom.cfgOpenAiBaseUrl.value = config.openAiBaseUrl || "";
  dom.cfgOpenAiModel.value = config.openAiModel || "";
  dom.cfgOpenAiApiKey.value = config.openAiApiKey || "";

  // Set preferred defaults
  dom.capAssetType.value = config.preferredAssetType || "IMAGE";
  dom.capAssetStatus.value = config.preferredStatus || "DRAFT";

  // Get current tab
  const tabs = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  state.currentTab = tabs[0] || null;
  if (state.currentTab?.url) dom.capSourceUrl.value = state.currentTab.url;

  // Load queue from storage
  await loadQueueFromStorage();

  // Check auth
  if (!(config.token || "").trim()) {
    // Populate auth gate fields from stored config
    dom.authBaseUrl.value = config.baseUrl || "http://localhost:3000";
    dom.authToken.value = config.token || "";
    dom.authOpenAiBaseUrl.value = config.openAiBaseUrl || "";
    dom.authOpenAiModel.value = config.openAiModel || "";
    dom.authOpenAiApiKey.value = config.openAiApiKey || "";

    dom.authGate.classList.remove("hidden");
    document
      .querySelectorAll(".sp-main")
      .forEach((p) => p.classList.add("hidden"));
    setStatus("Enter your credentials to connect.");
    return;
  }

  // Auth OK, hide gate and show active panel
  dom.authGate.classList.add("hidden");
  setActiveMode(state.activeMode);

  try {
    // Load profile + data in parallel
    const profilePromise = fetchApi("/api/extension/profile").catch(() => ({
      preferences: {},
    }));
    await loadProjectsAndPlatforms();
    const profileData = await profilePromise;
    const profile = profileData.preferences || {};

    // Restore last project
    const defaultProject =
      config.lastProjectId ||
      profile.lastProjectId ||
      state.projects[0]?.id ||
      "";
    if (
      defaultProject &&
      dom.ctxProjectSelect.querySelector(`option[value="${defaultProject}"]`)
    ) {
      dom.ctxProjectSelect.value = defaultProject;
    }

    await loadScenes(dom.ctxProjectSelect.value);

    // Restore last scene
    const defaultScene =
      config.lastSceneId ||
      profile.lastSceneId ||
      state.scenes[0]?.sceneId ||
      "";
    if (
      defaultScene &&
      dom.ctxSceneSelect.querySelector(`option[value="${defaultScene}"]`)
    ) {
      dom.ctxSceneSelect.value = defaultScene;
    }

    await loadSceneAssets(dom.ctxProjectSelect.value, dom.ctxSceneSelect.value);
    state.characters = await fetchCharacters(dom.ctxProjectSelect.value).catch(
      () => [],
    );
    renderCharacterCards();
    updateContextBar();

    // Restore capture form state
    resetCaptureForm({ preserveSourceUrl: true });
    await restoreSceneDraft();

    // Auto-detect platform from current tab
    const detected = await detectFromPage();

    // Apply platform from detection or saved preference
    const autoPlatform = detectPlatformSlug(state.currentTab?.url || "");
    if (autoPlatform && state.platforms.some((p) => p.slug === autoPlatform)) {
      dom.capPlatformSelect.value = autoPlatform;
    } else if (
      config.lastPlatform &&
      state.platforms.some((p) => p.slug === config.lastPlatform)
    ) {
      dom.capPlatformSelect.value = config.lastPlatform;
    } else if (
      profile.lastPlatform &&
      state.platforms.some((p) => p.slug === profile.lastPlatform)
    ) {
      dom.capPlatformSelect.value = profile.lastPlatform;
    }

    // Sync profile preferences to capture form
    if (
      profile.preferredAssetType &&
      dom.capAssetType.querySelector(
        `option[value="${profile.preferredAssetType}"]`,
      )
    ) {
      dom.capAssetType.value = profile.preferredAssetType;
    }
    if (
      profile.preferredStatus &&
      dom.capAssetStatus.querySelector(
        `option[value="${profile.preferredStatus}"]`,
      )
    ) {
      dom.capAssetStatus.value = profile.preferredStatus;
    }
    if (!dom.cfgOpenAiBaseUrl.value && profile.openAiBaseUrl) {
      dom.cfgOpenAiBaseUrl.value = profile.openAiBaseUrl;
    }
    if (!dom.cfgOpenAiModel.value && profile.openAiModel) {
      dom.cfgOpenAiModel.value = profile.openAiModel;
    }

    // Auto-fill prompt from page if empty
    if (!dom.capPrompt.value.trim() && detected) {
      applyPageContextToCapture(detected);
    }

    refreshIntentSuggestions();

    const queueInfo = await chrome.runtime.sendMessage({
      type: "get-queue-size",
    });
    const queueSize = queueInfo?.size || 0;
    setStatus(`Ready. Queue: ${queueSize} item(s).`);
  } catch (err) {
    setStatus(err.message, true);
  }
}

// ── Event listeners ─────────────────────────────────────

// Mode navigation
dom.modeNav.addEventListener("click", (e) => {
  const btn = e.target.closest(".sp-tab");
  if (!btn) return;
  setActiveMode(btn.dataset.mode);
});

// Settings toggle
dom.settingsToggle.addEventListener("click", () => toggleSettings());
dom.settingsClose.addEventListener("click", () => toggleSettings(false));

// Save settings
dom.cfgSave.addEventListener("click", async () => {
  const nextConfig = {
    baseUrl: dom.cfgBaseUrl.value.trim() || "http://localhost:3000",
    token: dom.cfgToken.value.trim(),
    openAiBaseUrl: normalizeBaseUrl(dom.cfgOpenAiBaseUrl.value),
    openAiModel: dom.cfgOpenAiModel.value.trim(),
    openAiApiKey: dom.cfgOpenAiApiKey.value.trim(),
  };
  await saveConfig(nextConfig);

  // Sync profile
  syncProfile({
    openAiBaseUrl: normalizeBaseUrl(dom.cfgOpenAiBaseUrl.value),
    openAiModel: dom.cfgOpenAiModel.value.trim(),
  }).catch((err) => console.warn("[sidepanel]", err.message));

  setStatus("Settings saved. Reloading...");
  toggleSettings(false);
  await initialize();
});

// Auth gate: connect
dom.authConnect.addEventListener("click", async () => {
  const token = dom.authToken.value.trim();
  if (!token) {
    setStatus("API Token is required.", true);
    return;
  }

  dom.authConnect.disabled = true;
  dom.authConnect.textContent = "Connecting...";

  const nextConfig = {
    baseUrl: dom.authBaseUrl.value.trim() || "http://localhost:3000",
    token,
    openAiBaseUrl: normalizeBaseUrl(dom.authOpenAiBaseUrl.value),
    openAiModel: dom.authOpenAiModel.value.trim(),
    openAiApiKey: dom.authOpenAiApiKey.value.trim(),
  };
  await saveConfig(nextConfig);

  // Sync settings panel fields to match
  dom.cfgBaseUrl.value = nextConfig.baseUrl;
  dom.cfgToken.value = nextConfig.token;
  dom.cfgOpenAiBaseUrl.value = nextConfig.openAiBaseUrl;
  dom.cfgOpenAiModel.value = nextConfig.openAiModel;
  dom.cfgOpenAiApiKey.value = nextConfig.openAiApiKey;

  dom.authConnect.disabled = false;
  dom.authConnect.textContent = "Connect";
  await initialize();
});

// Reload
dom.cfgReload.addEventListener("click", async () => {
  toggleSettings(false);
  setStatus("Reloading...");
  await initialize();
});

// Context: project change
dom.ctxProjectSelect.addEventListener("change", async () => {
  try {
    await saveSceneDraft();
    await loadScenes(dom.ctxProjectSelect.value);
    await loadSceneAssets(dom.ctxProjectSelect.value, dom.ctxSceneSelect.value);
    state.characters = await fetchCharacters(dom.ctxProjectSelect.value).catch(
      () => [],
    );
    renderCharacterCards();
    updateContextBar();
    resetCaptureForm({ preserveSourceUrl: true });
    await restoreSceneDraft();
    await saveConfig({
      lastProjectId: dom.ctxProjectSelect.value,
      lastSceneId: dom.ctxSceneSelect.value || "",
    });
    syncProfile({
      lastProjectId: dom.ctxProjectSelect.value,
      lastSceneId: dom.ctxSceneSelect.value || "",
    }).catch((err) => console.warn("[sidepanel]", err.message));
    refreshIntentSuggestions();
  } catch (err) {
    setStatus(err.message, true);
  }
});

// Scene search filter
dom.ctxSceneSearch.addEventListener("input", () => {
  const query = dom.ctxSceneSearch.value.toLowerCase().trim();
  const options = dom.ctxSceneSelect.options;
  let firstVisible = null;
  for (let i = 0; i < options.length; i++) {
    const matches =
      !query || options[i].textContent.toLowerCase().includes(query);
    options[i].hidden = !matches;
    if (matches && !firstVisible) firstVisible = options[i];
  }
  // If current selection is hidden, select first visible
  if (dom.ctxSceneSelect.selectedOptions[0]?.hidden && firstVisible) {
    firstVisible.selected = true;
  }
});

// Context: scene change
dom.ctxSceneSelect.addEventListener("change", async () => {
  try {
    await saveSceneDraft();
    await loadSceneAssets(dom.ctxProjectSelect.value, dom.ctxSceneSelect.value);
    updateContextBar();
    resetCaptureForm({ preserveSourceUrl: true });
    await restoreSceneDraft();
    await saveConfig({ lastSceneId: dom.ctxSceneSelect.value });
    syncProfile({ lastSceneId: dom.ctxSceneSelect.value }).catch((err) =>
      console.warn("[sidepanel]", err.message),
    );
    refreshIntentSuggestions();
  } catch (err) {
    setStatus(err.message, true);
  }
});

// Detection: refresh
dom.ctxRefreshDetect.addEventListener("click", async () => {
  try {
    dom.ctxRefreshDetect.disabled = true;
    const ctx = await detectFromPage();
    if (ctx) {
      setStatus("Page detection refreshed.");
    } else {
      setStatus("No page context detected.");
    }
    refreshIntentSuggestions();
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    dom.ctxRefreshDetect.disabled = false;
  }
});

// Candidate picker: open via "Thread" button
dom.capPickThread.addEventListener("click", async () => {
  try {
    dom.capPickThread.disabled = true;
    await openCandidatePicker();
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    dom.capPickThread.disabled = false;
  }
});

// Candidate picker: close
dom.candidatePickerClose.addEventListener("click", () => {
  closeCandidatePicker();
});

// AI Assist button
dom.capAiAssist.addEventListener("click", async () => {
  try {
    dom.capAiAssist.disabled = true;
    dom.capAiAssist.textContent = "...";
    const { aiAssistDetect } = await import("./ai-assist.js");
    await aiAssistDetect();
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    dom.capAiAssist.disabled = false;
    dom.capAiAssist.textContent = "AI";
  }
});

// Capture: platform change
dom.capPlatformSelect.addEventListener("change", async () => {
  await saveConfig({ lastPlatform: dom.capPlatformSelect.value });
  syncProfile({ lastPlatform: dom.capPlatformSelect.value }).catch((err) =>
    console.warn("[sidepanel]", err.message),
  );
  scheduleSceneDraftSave();
  refreshIntentSuggestions();
});

// Capture: type change
dom.capAssetType.addEventListener("change", async () => {
  await saveConfig({ preferredAssetType: dom.capAssetType.value });
  syncProfile({ preferredAssetType: dom.capAssetType.value }).catch((err) =>
    console.warn("[sidepanel]", err.message),
  );
  scheduleSceneDraftSave();
  refreshIntentSuggestions();
});

// Capture: status change
dom.capAssetStatus.addEventListener("change", async () => {
  await saveConfig({ preferredStatus: dom.capAssetStatus.value });
  syncProfile({ preferredStatus: dom.capAssetStatus.value }).catch((err) =>
    console.warn("[sidepanel]", err.message),
  );
  scheduleSceneDraftSave();
  refreshIntentSuggestions();
});

// Capture: auto fill
dom.capAutoFill.addEventListener("click", async () => {
  try {
    dom.capAutoFill.disabled = true;
    dom.capAutoFill.textContent = "Filling...";
    await autoFillFromPage();
    setStatus("Auto-filled from current tab.");
    scheduleSceneDraftSave();
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    dom.capAutoFill.disabled = false;
    dom.capAutoFill.textContent = "Auto Fill";
  }
});

// Capture: apply prompt to page
dom.capApplyPrompt.addEventListener("click", async () => {
  try {
    dom.capApplyPrompt.disabled = true;
    await applyPromptToPage();
    setStatus("Prompt applied to page.");
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    dom.capApplyPrompt.disabled = false;
  }
});

// Capture: AI refine
dom.capRefinePrompt.addEventListener("click", async () => {
  try {
    dom.capRefinePrompt.disabled = true;
    await refinePrompt();
    setStatus("Prompt refined via AI.");
    scheduleSceneDraftSave();
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    dom.capRefinePrompt.disabled = false;
  }
});

// Capture: save
dom.capSave.addEventListener("click", async () => {
  try {
    dom.capSave.disabled = true;
    dom.capSave.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="2" stroke-dasharray="20" stroke-dashoffset="10"><animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7" dur="0.8s" repeatCount="indefinite"/></circle></svg>
      Saving...
    `;
    await saveCapture();
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    dom.capSave.disabled = false;
    dom.capSave.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Save Capture
    `;
  }
});

// Capture: Clear All button
dom.capClearAll.addEventListener("click", () => {
  clearAllFields();
  scheduleSceneDraftSave();
});

// Capture: individual clear buttons (×)
document.addEventListener("click", (e) => {
  const clearBtn = e.target.closest(".sp-clear[data-clear]");
  if (!clearBtn) return;
  clearField(clearBtn.dataset.clear);
  scheduleSceneDraftSave();
});

// Capture: input field draft persistence
[
  dom.capTitle,
  dom.capPrompt,
  dom.capNegPrompt,
  dom.capModelName,
  dom.capSourceUrl,
  dom.capOutputUrl,
  dom.capThumbUrl,
  dom.capExternalId,
  dom.capMetadata,
  dom.capNotes,
  dom.capTags,
].forEach((field) => {
  if (field) {
    field.addEventListener("input", () => {
      scheduleSceneDraftSave();
    });
  }
});

// Reuse: restore draft
dom.reuseRestoreDraft.addEventListener("click", async () => {
  try {
    const restored = await restoreSceneDraft();
    if (!restored) {
      setStatus("No saved draft for this scene.");
      return;
    }
    setActiveMode("capture");
    setStatus("Draft restored.");
  } catch (err) {
    setStatus(err.message, true);
  }
});

// Reuse: clear draft
dom.reuseClearDraft.addEventListener("click", async () => {
  try {
    const cleared = await clearSceneDraft();
    if (!cleared) {
      setStatus("No draft to clear.");
      return;
    }
    setStatus("Draft cleared.");
    refreshIntentSuggestions();
  } catch (err) {
    setStatus(err.message, true);
  }
});

// Queue: sync now
dom.queueSyncNow.addEventListener("click", async () => {
  try {
    dom.queueSyncNow.disabled = true;
    dom.queueSyncNow.textContent = "Syncing...";
    await syncNow();
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    dom.queueSyncNow.disabled = false;
    dom.queueSyncNow.textContent = "Sync Now";
  }
});

// Queue: clear failed
dom.queueClearFailed.addEventListener("click", async () => {
  await clearFailedItems();
});

// ── Filter chips: History panel ──────────────────────────

function setupFilterChips(chipContainer, stateKey, renderFn) {
  chipContainer.addEventListener("click", (e) => {
    const chip = e.target.closest(".sp-chip");
    if (!chip) return;
    const filter = chip.dataset.filter;
    state[stateKey] = filter;
    // Toggle active class
    chipContainer.querySelectorAll(".sp-chip").forEach((c) => {
      c.classList.toggle("active", c.dataset.filter === filter);
    });
    renderFn();
  });
}

setupFilterChips(dom.reuseFilterChips, "reuseFilterType", renderReuseList);
setupFilterChips(dom.queueFilterChips, "queueFilterType", renderQueueList);

// History: search by prompt text
dom.reuseSearch.addEventListener("input", () => {
  state.reuseSearchQuery = dom.reuseSearch.value;
  renderReuseList();
});

// Compare: open, close, clear
dom.compareBtn.addEventListener("click", () => openCompare());
dom.compareClose.addEventListener("click", () => closeCompare());
dom.compareClear.addEventListener("click", () => clearCompareSelections());

// Listen for tab activation changes (side panel persists across tab switches)
chrome.tabs.onActivated.addListener(onTabActivated);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete" && state.currentTab?.id === tabId) {
    onTabActivated();
  }
});

// Listen for storage changes (queue updates from background)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.syncQueue) {
    state.localQueueMirror = changes.syncQueue.newValue || [];
    renderQueueList();
  }
});

// ── Boot ────────────────────────────────────────────────

initialize();
