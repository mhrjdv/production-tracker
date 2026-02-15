/* ==========================================================
   DOM – Element references and DOM-level helpers
   ========================================================== */

import state from "./state.js";

const $ = (id) => document.getElementById(id);

export const dom = {
  // Settings
  settingsToggle: $("settingsToggle"),
  settingsPanel: $("settingsPanel"),
  settingsClose: $("settingsClose"),
  cfgBaseUrl: $("cfgBaseUrl"),
  cfgToken: $("cfgToken"),
  cfgOpenAiBaseUrl: $("cfgOpenAiBaseUrl"),
  cfgOpenAiModel: $("cfgOpenAiModel"),
  cfgOpenAiApiKey: $("cfgOpenAiApiKey"),
  cfgSave: $("cfgSave"),
  cfgReload: $("cfgReload"),

  // Mode nav
  modeNav: $("modeNav"),

  // Auth gate
  authGate: $("authGate"),
  authBaseUrl: $("authBaseUrl"),
  authToken: $("authToken"),
  authOpenAiBaseUrl: $("authOpenAiBaseUrl"),
  authOpenAiModel: $("authOpenAiModel"),
  authOpenAiApiKey: $("authOpenAiApiKey"),
  authConnect: $("authConnect"),

  // Context (now inside capture panel)
  panelContext: $("panelContext"),
  ctxProjectSelect: $("ctxProjectSelect"),
  ctxSceneSelect: $("ctxSceneSelect"),
  ctxSceneSearch: $("ctxSceneSearch"),
  ctxShotCard: $("ctxShotCard"),
  ctxDetectedPlatform: $("ctxDetectedPlatform"),
  ctxDetectedType: $("ctxDetectedType"),
  ctxRefreshDetect: $("ctxRefreshDetect"),
  ctxIntentBox: $("ctxIntentBox"),
  ctxIntentText: $("ctxIntentText"),
  ctxIntentActions: $("ctxIntentActions"),
  ctxDetectionBanner: $("ctxDetectionBanner"),
  ctxDetectDot: $("ctxDetectDot"),
  ctxCharactersList: $("ctxCharactersList"),

  // Candidate picker
  candidatePicker: $("candidatePicker"),
  candidateList: $("candidateList"),
  candidatePickerClose: $("candidatePickerClose"),
  capPickThread: $("capPickThread"),
  capAiAssist: $("capAiAssist"),

  // Capture panel
  panelCapture: $("panelCapture"),
  capContextBar: $("capContextBar"),
  capContextLabel: $("capContextLabel"),
  capPlatformSelect: $("capPlatformSelect"),
  capAssetType: $("capAssetType"),
  capAssetStatus: $("capAssetStatus"),
  capTitle: $("capTitle"),
  capPrompt: $("capPrompt"),
  capNegPrompt: $("capNegPrompt"),
  capModelName: $("capModelName"),
  capExternalId: $("capExternalId"),
  capSourceUrl: $("capSourceUrl"),
  capOutputUrl: $("capOutputUrl"),
  capThumbUrl: $("capThumbUrl"),
  capTags: $("capTags"),
  capMetadata: $("capMetadata"),
  capNotes: $("capNotes"),
  capAutoFill: $("capAutoFill"),
  capApplyPrompt: $("capApplyPrompt"),
  capRefinePrompt: $("capRefinePrompt"),
  capSave: $("capSave"),
  capClearAll: $("capClearAll"),

  // Reuse panel
  panelReuse: $("panelReuse"),
  reuseAssetList: $("reuseAssetList"),
  reuseRestoreDraft: $("reuseRestoreDraft"),
  reuseClearDraft: $("reuseClearDraft"),
  reuseSearch: $("reuseSearch"),
  reuseFilterChips: $("reuseFilterChips"),

  // Queue panel
  panelQueue: $("panelQueue"),
  queueCount: $("queueCount"),
  queueList: $("queueList"),
  queueSyncNow: $("queueSyncNow"),
  queueClearFailed: $("queueClearFailed"),
  queuePreviewList: $("queuePreviewList"),
  queueFilterChips: $("queueFilterChips"),

  // Compare
  compareBar: $("compareBar"),
  compareBtn: $("compareBtn"),
  compareClear: $("compareClear"),
  compareCount: $("compareCount"),
  compareOverlay: $("compareOverlay"),
  compareGrid: $("compareGrid"),
  compareClose: $("compareClose"),

  // Status bar
  statusText: $("statusText"),
  statusDot: $("statusDot"),
};

export function setStatus(message, isError = false) {
  dom.statusText.textContent = message;
  dom.statusText.classList.toggle("error", isError);
  if (dom.statusDot) {
    dom.statusDot.classList.toggle("error", isError);
    dom.statusDot.classList.toggle("connected", !isError);
  }
}

export function populateSelect(select, items, getValue, getLabel) {
  select.innerHTML = "";
  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = getValue(item);
    opt.textContent = getLabel(item);
    select.appendChild(opt);
  });
}

export function setActiveMode(mode) {
  state.activeMode = mode;

  const buttons = dom.modeNav.querySelectorAll(".sp-tab");
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });

  document.querySelectorAll(".sp-main[data-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.panel !== mode);
  });
}

export function toggleSettings(forceOpen) {
  state.settingsOpen =
    forceOpen !== undefined ? forceOpen : !state.settingsOpen;
  dom.settingsPanel.classList.toggle("hidden", !state.settingsOpen);
}

/**
 * Update detection banner to reflect detected/undetected state.
 */
export function updateDetectionBanner(platformName, assetType, confidence) {
  const banner = dom.ctxDetectionBanner;
  if (!banner) return;

  const hasDetection =
    platformName && platformName !== "--" && platformName !== "Unknown";
  banner.classList.toggle("detected", hasDetection);

  dom.ctxDetectedPlatform.textContent = hasDetection
    ? platformName
    : "No platform detected";

  if (dom.ctxDetectedType) {
    dom.ctxDetectedType.textContent =
      assetType && assetType !== "--" ? assetType : "";
  }

  // Confidence-colored dot
  if (dom.ctxDetectDot && typeof confidence === "number") {
    dom.ctxDetectDot.classList.remove("conf-high", "conf-medium", "conf-low");
    if (confidence >= 0.8) dom.ctxDetectDot.classList.add("conf-high");
    else if (confidence >= 0.5) dom.ctxDetectDot.classList.add("conf-medium");
    else dom.ctxDetectDot.classList.add("conf-low");
  }
}
