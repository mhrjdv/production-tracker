/* ==========================================================
   Compare – Side-by-side version comparison in History panel
   ========================================================== */

import { dom, setStatus } from "./dom.js";
import state from "./state.js";
import { updateAsset } from "./api.js";
import { placeholderThumb } from "./utils.js";
import { renderReuseList } from "./render.js";

const MAX_COMPARE = 6;

export function toggleCompareSelect(assetId) {
  const idx = state.compareIds.indexOf(assetId);
  if (idx >= 0) {
    state.compareIds = [
      ...state.compareIds.slice(0, idx),
      ...state.compareIds.slice(idx + 1),
    ];
  } else {
    if (state.compareIds.length >= MAX_COMPARE) {
      setStatus(`Compare limit: max ${MAX_COMPARE} versions.`, true);
      return;
    }
    state.compareIds = [...state.compareIds, assetId];
  }
  updateCompareBar();
  renderReuseList();
}

export function updateCompareBar() {
  const count = state.compareIds.length;
  if (dom.compareBar) {
    dom.compareBar.classList.toggle("hidden", count === 0);
  }
  if (dom.compareCount) {
    dom.compareCount.textContent = String(count);
  }
}

export function openCompare() {
  if (state.compareIds.length < 2) {
    setStatus("Select at least 2 versions to compare.", true);
    return;
  }
  state.compareOpen = true;
  dom.compareOverlay.classList.remove("hidden");
  renderCompareGrid();
}

export function closeCompare() {
  state.compareOpen = false;
  dom.compareOverlay.classList.add("hidden");
}

export function clearCompareSelections() {
  state.compareIds = [];
  state.compareOpen = false;
  dom.compareOverlay.classList.add("hidden");
  updateCompareBar();
  renderReuseList();
}

function renderCompareGrid() {
  const grid = dom.compareGrid;
  grid.innerHTML = "";

  const assets = state.sceneAssets.filter((a) =>
    state.compareIds.includes(a.id),
  );

  if (assets.length === 0) {
    grid.innerHTML = '<div class="sp-empty">No versions selected.</div>';
    return;
  }

  assets.forEach((asset) => {
    const card = document.createElement("div");
    card.className = `sp-compare-card${asset.selected ? " winner" : ""}`;

    const img = document.createElement("img");
    img.className = "sp-compare-thumb";
    img.src = asset.thumbnailUrl || placeholderThumb();
    img.alt = `${asset.platformLabel} v${asset.versionNumber}`;

    const info = document.createElement("div");
    info.className = "sp-compare-info";

    const platform = document.createElement("span");
    platform.className = "sp-compare-platform";
    platform.textContent = asset.platformLabel;

    const version = document.createElement("span");
    version.className = "sp-compare-version";
    version.textContent = `${asset.assetType} v${asset.versionNumber}`;

    const prompt = document.createElement("p");
    prompt.className = "sp-compare-prompt";
    prompt.textContent = (asset.prompt || "").substring(0, 50) + (asset.prompt?.length > 50 ? "..." : "");

    info.appendChild(platform);
    info.appendChild(version);
    info.appendChild(prompt);

    // Star button in compare card
    const starBtn = document.createElement("button");
    starBtn.type = "button";
    starBtn.className = `sp-star-btn${asset.selected ? " active" : ""}`;
    starBtn.title = asset.selected ? "Remove winner" : "Mark as winner";
    starBtn.innerHTML = asset.selected
      ? '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1l1.8 3.6L13 5.2l-3 2.9.7 4.1L7 10.3 3.3 12.2l.7-4.1-3-2.9 4.2-.6L7 1z" fill="#eab308" stroke="#eab308" stroke-width="1"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1l1.8 3.6L13 5.2l-3 2.9.7 4.1L7 10.3 3.3 12.2l.7-4.1-3-2.9 4.2-.6L7 1z" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
    starBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const newSelected = !asset.selected;
      try {
        starBtn.disabled = true;
        if (newSelected) {
          state.sceneAssets.forEach((a) => {
            if (a.assetType === asset.assetType && a.id !== asset.id) {
              a.selected = false;
              a.status = "GENERATED";
            }
          });
        }
        asset.selected = newSelected;
        asset.status = newSelected ? "SELECTED" : "GENERATED";
        renderCompareGrid();
        renderReuseList();
        await updateAsset(asset.id, { selected: newSelected });
        setStatus(
          newSelected
            ? `Winner: ${asset.platformLabel} v${asset.versionNumber}`
            : "Winner removed.",
        );
      } catch (err) {
        asset.selected = !newSelected;
        asset.status = !newSelected ? "SELECTED" : "GENERATED";
        renderCompareGrid();
        renderReuseList();
        setStatus(err.message, true);
      }
    });

    card.appendChild(img);
    card.appendChild(info);
    card.appendChild(starBtn);
    grid.appendChild(card);
  });
}
