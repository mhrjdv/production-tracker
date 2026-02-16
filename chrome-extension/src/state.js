/* ==========================================================
   State – Shared mutable state for the side panel
   All modules import the `state` object and mutate its properties.
   Using a single exported object avoids ESM immutable binding issues.
   ========================================================== */

const state = {
  projects: [],
  scenes: [],
  shots: [],
  platforms: [],
  sceneAssets: [],
  characters: [],
  currentTab: null,
  activeMode: "capture",
  configCache: null,
  lastPageContext: null,
  draftSaveTimer: null,
  settingsOpen: false,
  localQueueMirror: [],
  threadCandidates: [],
  candidatePickerOpen: false,
  reuseFilterType: "ALL",
  reuseSearchQuery: "",
  queueFilterType: "ALL",
  compareIds: [],
  compareOpen: false,
};

export default state;
