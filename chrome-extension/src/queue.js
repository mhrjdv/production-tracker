/* ==========================================================
   Queue – Optimistic queue UI and sync management
   ========================================================== */

import { dom, setStatus } from "./dom.js";
import state from "./state.js";
import { formatRelativeTime } from "./utils.js";

export async function loadQueueFromStorage() {
  const data = await chrome.storage.local.get("syncQueue");
  state.localQueueMirror = data.syncQueue || [];
  renderQueueList();
}

export function renderQueueList() {
  const container = dom.queueList;
  container.innerHTML = "";

  dom.queueCount.textContent = String(state.localQueueMirror.length);

  // Apply type filter
  const typeFilter = state.queueFilterType || "ALL";
  const filtered = state.localQueueMirror.filter((item) => {
    if (typeFilter === "ALL") return true;
    return item.payload?.assetType === typeFilter;
  });

  if (state.localQueueMirror.length === 0) {
    container.innerHTML =
      '<div class="sp-empty">Queue is empty. All synced.</div>';
    return;
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="sp-empty">No matching items.</div>';
    return;
  }

  filtered.forEach((item) => {
    const row = document.createElement("div");
    row.className = "sp-queue-item";

    const info = document.createElement("div");
    info.className = "sp-queue-item-info";

    const title = document.createElement("div");
    title.className = "sp-queue-item-title";
    title.textContent =
      item.payload?.title ||
      item.payload?.prompt?.substring(0, 50) ||
      "Untitled";

    const sub = document.createElement("div");
    sub.className = "sp-queue-item-sub";
    const retries = item.retryCount || 0;
    sub.textContent = `${item.payload?.assetType || "?"} · ${item.payload?.platformKey || "?"} · queued ${formatRelativeTime(item.queuedAt)}${retries > 0 ? ` · retry ${retries}` : ""}`;

    info.appendChild(title);
    info.appendChild(sub);

    // Show error detail for failed items
    if (item.lastError && (retries >= 5 || item.failedPermanently)) {
      const errEl = document.createElement("div");
      errEl.className = "sp-queue-item-error";
      errEl.textContent = item.lastError;
      info.appendChild(errEl);
    }

    const badge = document.createElement("span");
    if (item.failedPermanently || retries >= 5) {
      badge.className = "sp-badge failed";
      badge.textContent = "Failed";
      badge.title = item.lastError || "Permanently failed";
    } else if (retries > 0) {
      badge.className = "sp-badge queued";
      badge.textContent = `Retry ${retries}`;
      if (item.lastError) badge.title = item.lastError;
    } else {
      badge.className = "sp-badge queued";
      badge.textContent = "Queued";
    }

    row.appendChild(info);
    row.appendChild(badge);
    container.appendChild(row);
  });
}

export function addOptimisticQueueItem(payload) {
  const item = {
    id: crypto.randomUUID(),
    retryCount: 0,
    queuedAt: new Date().toISOString(),
    payload,
  };
  state.localQueueMirror = [...state.localQueueMirror, item];
  renderQueueList();
  return item;
}

export function removeOptimisticQueueItem(id) {
  state.localQueueMirror = state.localQueueMirror.filter((q) => q.id !== id);
  renderQueueList();
}

export function markOptimisticSynced(id) {
  removeOptimisticQueueItem(id);
}

export async function syncNow() {
  const response = await chrome.runtime.sendMessage({ type: "sync-now" });
  if (!response?.ok) throw new Error(response?.error || "Sync failed");

  const result = response.result || { processed: 0, remaining: 0 };
  setStatus(
    `Synced ${result.processed} item(s), ${result.remaining} remaining.`,
  );

  await loadQueueFromStorage();

  if ((result.processed || 0) > 0) {
    const projectId = dom.ctxProjectSelect.value;
    const sceneId = dom.ctxSceneSelect.value;
    if (projectId && sceneId) {
      const { loadSceneAssets } = await import("./data-loaders.js");
      await loadSceneAssets(projectId, sceneId).catch((err) => {
        console.warn("[sidepanel]", err.message);
        return null;
      });
    }
  }
}

export async function clearFailedItems() {
  const data = await chrome.storage.local.get("syncQueue");
  const queue = data.syncQueue || [];
  const filtered = queue.filter(
    (item) => !item.failedPermanently && (item.retryCount || 0) < 5,
  );
  await chrome.storage.local.set({ syncQueue: filtered });
  state.localQueueMirror = filtered;
  renderQueueList();
  setStatus(`Cleared ${queue.length - filtered.length} failed item(s).`);
}
