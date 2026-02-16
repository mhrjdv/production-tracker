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

  // Mode nav (hidden, kept for compat)
  modeNav: $("modeNav"),

  // Auth gate
  authGate: $("authGate"),
  authBaseUrl: $("authBaseUrl"),
  authToken: $("authToken"),
  authOpenAiBaseUrl: $("authOpenAiBaseUrl"),
  authOpenAiModel: $("authOpenAiModel"),
  authOpenAiApiKey: $("authOpenAiApiKey"),
  authConnect: $("authConnect"),

  // Context
  panelContext: $("panelContext"),
  ctxProjectSelect: $("ctxProjectSelect"),
  ctxSceneSelect: $("ctxSceneSelect"),
  ctxSceneSearch: $("ctxSceneSearch"),
  ctxShotSelect: $("ctxShotSelect"),
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
  capPlatformSearch: $("capPlatformSearch"),
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

  // Reuse / Versions (inline in main view)
  panelReuse: $("panelReuse"),
  reuseAssetList: $("reuseAssetList"),
  reuseRestoreDraft: $("reuseRestoreDraft"),
  reuseClearDraft: $("reuseClearDraft"),
  reuseSearch: $("reuseSearch"),
  reuseFilterChips: $("reuseFilterChips"),
  versionsCount: $("versionsCount"),

  // Queue panel (overlay)
  panelQueue: $("panelQueue"),
  queueCount: $("queueCount"),
  queueList: $("queueList"),
  queueSyncNow: $("queueSyncNow"),
  queueClearFailed: $("queueClearFailed"),
  queuePreviewList: $("queuePreviewList"),
  queueFilterChips: $("queueFilterChips"),
  queueToggle: $("queueToggle"),
  queueClose: $("queueClose"),
  queueDot: $("queueDot"),

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

/**
 * Set active mode. In single-screen layout, panelCapture is always visible.
 * Queue is shown as an overlay when mode === "queue".
 */
export function setActiveMode(mode) {
  state.activeMode = mode;

  // panelCapture always visible (single-screen layout)
  if (dom.panelCapture) {
    dom.panelCapture.classList.remove("hidden");
  }

  // Queue overlay: only visible when mode is "queue"
  if (dom.panelQueue) {
    dom.panelQueue.classList.toggle("hidden", mode !== "queue");
  }

  // panelReuse is hidden (content is inline in panelCapture)
  if (dom.panelReuse) {
    dom.panelReuse.classList.add("hidden");
  }
}

export function toggleSettings(forceOpen) {
  state.settingsOpen =
    forceOpen !== undefined ? forceOpen : !state.settingsOpen;
  dom.settingsPanel.classList.toggle("hidden", !state.settingsOpen);
}

/**
 * Toggle the queue overlay panel.
 */
export function toggleQueue(forceOpen) {
  const isOpen = !dom.panelQueue.classList.contains("hidden");
  const shouldOpen = forceOpen !== undefined ? forceOpen : !isOpen;
  if (shouldOpen) {
    setActiveMode("queue");
  } else {
    setActiveMode("capture");
  }
}

/**
 * Update queue dot indicator visibility based on queue size.
 */
export function updateQueueDot(count) {
  if (dom.queueDot) {
    dom.queueDot.classList.toggle("hidden", count === 0);
  }
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
