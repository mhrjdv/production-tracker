/* ==========================================================
   Render – DOM rendering for version strip, characters, previews
   ========================================================== */

import { dom, setStatus } from "./dom.js";
import state from "./state.js";
import { updateAsset } from "./api.js";
import { formatRelativeTime, placeholderThumb } from "./utils.js";

export function renderShotCard() {
  const sceneId = dom.ctxSceneSelect.value;
  const scene = state.scenes.find((s) => s.sceneId === sceneId);

  if (!scene) {
    dom.ctxShotCard.innerHTML =
      '<div class="sp-empty-sm">Select a scene above to see details.</div>';
    return;
  }

  const versionCount = state.sceneAssets.length;
  const selectedCount = state.sceneAssets.filter((a) => a.selected).length;
  const types =
    [...new Set(state.sceneAssets.map((a) => a.assetType))].join(", ") ||
    "none";

  dom.ctxShotCard.innerHTML = `
    <div class="sp-context-info">
      <div class="sp-ctx-scene-id">${scene.sceneId}</div>
      <div class="sp-ctx-beat">${scene.storyBeat || "No story beat"}</div>
      <div class="sp-ctx-versions">${versionCount} version(s), ${selectedCount} selected -- Types: ${types}</div>
    </div>
  `;
}

export function updateContextBar() {
  const projectId = dom.ctxProjectSelect.value;
  const sceneId = dom.ctxSceneSelect.value;
  const project = state.projects.find((p) => p.id === projectId);
  const scene = state.scenes.find((s) => s.sceneId === sceneId);

  if (project && scene) {
    dom.capContextLabel.textContent = `${project.name} / ${scene.sceneId}`;
  } else if (project) {
    dom.capContextLabel.textContent = `${project.name} / --`;
  } else {
    dom.capContextLabel.textContent = "No context set";
  }
}

/**
 * Update the versions count badge.
 */
function updateVersionCount(count) {
  if (dom.versionsCount) {
    dom.versionsCount.textContent = count;
  }
}

/**
 * Render version strip as compact horizontal filmstrip cards.
 */
export function renderReuseList() {
  const container = dom.reuseAssetList;
  container.innerHTML = "";

  // Apply filters
  const typeFilter = state.reuseFilterType || "ALL";
  const searchQuery = (state.reuseSearchQuery || "").toLowerCase().trim();

  const filtered = state.sceneAssets.filter((asset) => {
    if (typeFilter !== "ALL" && asset.assetType !== typeFilter) return false;
    if (
      searchQuery &&
      !(asset.prompt || "").toLowerCase().includes(searchQuery) &&
      !(asset.title || "").toLowerCase().includes(searchQuery) &&
      !(asset.platformLabel || "").toLowerCase().includes(searchQuery)
    )
      return false;
    return true;
  });

  updateVersionCount(state.sceneAssets.length);

  if (state.sceneAssets.length === 0) {
    container.innerHTML =
      '<div class="sp-empty-sm">No versions yet. Capture something first.</div>';
    return;
  }

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="sp-empty-sm">No matching versions.</div>';
    return;
  }

  filtered.forEach((asset) => {
    const card = document.createElement("div");
    card.className = `sp-v-card${asset.selected ? " selected-asset" : ""}`;

    // Compare checkbox (top-left overlay)
    const checkbox = document.createElement("button");
    checkbox.type = "button";
    checkbox.className = `sp-v-card-check${state.compareIds.includes(asset.id) ? " checked" : ""}`;
    checkbox.title = "Compare";
    checkbox.addEventListener("click", async (e) => {
      e.stopPropagation();
      const { toggleCompareSelect } = await import("./compare.js");
      toggleCompareSelect(asset.id);
    });

    // Star button (top-right overlay)
    const starBtn = document.createElement("button");
    starBtn.type = "button";
    starBtn.className = `sp-v-card-star${asset.selected ? " active" : ""}`;
    starBtn.title = asset.selected ? "Remove winner" : "Mark as winner";
    starBtn.innerHTML = asset.selected
      ? '<svg width="12" height="12" viewBox="0 0 14 14"><path d="M7 1l1.8 3.6L13 5.2l-3 2.9.7 4.1L7 10.3 3.3 12.2l.7-4.1-3-2.9 4.2-.6L7 1z" fill="#eab308" stroke="#eab308" stroke-width="1"/></svg>'
      : '<svg width="12" height="12" viewBox="0 0 14 14"><path d="M7 1l1.8 3.6L13 5.2l-3 2.9.7 4.1L7 10.3 3.3 12.2l.7-4.1-3-2.9 4.2-.6L7 1z" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
    starBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const newSelected = !asset.selected;
      try {
        starBtn.disabled = true;
        // Optimistic update
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
        renderReuseList();
        setStatus(err.message, true);
      }
    });

    // Thumbnail
    const thumb = document.createElement("img");
    thumb.className = "sp-v-card-thumb";
    thumb.alt = `${asset.platformLabel} v${asset.versionNumber}`;
    thumb.src = asset.thumbnailUrl || placeholderThumb();

    // Info
    const info = document.createElement("div");
    info.className = "sp-v-card-info";

    const platform = document.createElement("span");
    platform.className = "sp-v-card-platform";
    platform.textContent = asset.platformLabel || "Unknown";

    const version = document.createElement("span");
    version.className = "sp-v-card-version";
    version.textContent = `v${asset.versionNumber} \u00B7 ${asset.assetType}`;

    info.appendChild(platform);
    info.appendChild(version);

    // Click card to load into capture form
    card.addEventListener("click", async () => {
      const { applySceneAssetToCapture } = await import("./capture.js");
      applySceneAssetToCapture(asset.id);
      setStatus(
        `Loaded ${asset.platformLabel} v${asset.versionNumber} into form.`,
      );
      // Scroll to top of main panel to show capture form
      dom.panelCapture.scrollTo({ top: 0, behavior: "smooth" });
    });

    card.appendChild(checkbox);
    card.appendChild(starBtn);
    card.appendChild(thumb);
    card.appendChild(info);
    container.appendChild(card);
  });
}

export function renderCharacterCards() {
  const container = dom.ctxCharactersList;
  if (!container) return;
  container.innerHTML = "";

  if (state.characters.length === 0) {
    container.innerHTML =
      '<div class="sp-empty-sm">No characters in this project.</div>';
    return;
  }

  state.characters.forEach((char) => {
    const card = document.createElement("div");
    card.className = "sp-char-card";

    const portrait = document.createElement("div");
    portrait.className = "sp-char-portrait";
    if (char.portraitUrl) {
      const img = document.createElement("img");
      img.src = char.portraitUrl;
      img.alt = char.name;
      portrait.appendChild(img);
    } else {
      portrait.textContent = (char.name || "?")[0].toUpperCase();
    }

    const info = document.createElement("div");
    info.className = "sp-char-info";

    const name = document.createElement("div");
    name.className = "sp-char-name";
    name.textContent = char.name;

    const role = document.createElement("div");
    role.className = "sp-char-role";
    role.textContent = char.role;

    info.appendChild(name);
    info.appendChild(role);

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "sp-char-copy-btn";
    copyBtn.title = "Copy character prompt";
    copyBtn.innerHTML =
      '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
    copyBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const visual = (char.visualCues || []).join("; ");
      const text = [
        `Character: ${char.name} (${char.role})`,
        char.coreIdentity ? `Identity: ${char.coreIdentity}` : "",
        visual ? `Visual: ${visual}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.innerHTML =
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
        setTimeout(() => {
          copyBtn.innerHTML =
            '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
        }, 1500);
      } catch {
        setStatus("Failed to copy.", true);
      }
    });

    card.appendChild(portrait);
    card.appendChild(info);
    card.appendChild(copyBtn);
    container.appendChild(card);
  });
}

export function renderPreviewList() {
  const container = dom.queuePreviewList;
  container.innerHTML = "";

  const items = state.sceneAssets.slice(0, 6);
  if (items.length === 0) {
    container.innerHTML =
      '<div class="sp-empty-sm">No synced versions yet.</div>';
    return;
  }

  items.forEach((asset) => {
    const row = document.createElement("div");
    row.className = "sp-preview-item";

    const thumb = document.createElement("img");
    thumb.className = "sp-preview-thumb";
    thumb.alt = `${asset.platformLabel} preview`;
    thumb.src = asset.thumbnailUrl || placeholderThumb();

    const meta = document.createElement("div");
    meta.className = "sp-preview-meta";

    const title = document.createElement("div");
    title.className = "sp-preview-title";
    title.textContent = `${asset.platformLabel} -- ${asset.assetType} v${asset.versionNumber}`;

    const sub = document.createElement("div");
    sub.className = "sp-preview-sub";
    const timestamp = formatRelativeTime(asset.createdAt);
    sub.textContent = `${asset.status}${asset.selected ? " -- selected" : ""}${timestamp ? " -- " + timestamp : ""}`;

    meta.appendChild(title);
    meta.appendChild(sub);
    row.appendChild(thumb);
    row.appendChild(meta);
    container.appendChild(row);
  });
}
