/* ==========================================================
   Candidate Picker – Thread candidate selection UI
   ========================================================== */

import { dom, setStatus } from "./dom.js";
import state from "./state.js";
import { sendMessageWithTimeout } from "./messaging.js";
import { scheduleSceneDraftSave } from "./drafts.js";

/**
 * Open the candidate picker overlay and request thread candidates.
 */
export async function openCandidatePicker() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs[0];
  if (!tab?.id) {
    setStatus("No active tab available.", true);
    return;
  }

  setStatus("Scanning thread...");
  dom.candidateList.innerHTML = '<div class="sp-candidate-empty">Loading...</div>';
  dom.candidatePicker.classList.remove("hidden");
  state.candidatePickerOpen = true;

  try {
    const response = await sendMessageWithTimeout(tab.id, {
      type: "extract-thread-candidates",
      maxCandidates: 20,
    });

    if (!response?.ok || !response.candidates?.length) {
      dom.candidateList.innerHTML = '<div class="sp-candidate-empty">No thread candidates found.</div>';
      setStatus("No thread candidates detected.");
      return;
    }

    state.threadCandidates = response.candidates;
    renderCandidateList(response.candidates);
    setStatus(`Found ${response.candidates.length} candidate(s).`);
  } catch (err) {
    dom.candidateList.innerHTML = '<div class="sp-candidate-empty">Detection failed.</div>';
    setStatus(err.message, true);
  }
}

/**
 * Close the candidate picker.
 */
export function closeCandidatePicker() {
  dom.candidatePicker.classList.add("hidden");
  state.candidatePickerOpen = false;
}

/**
 * Render candidate cards in the picker list.
 */
function renderCandidateList(candidates) {
  dom.candidateList.innerHTML = "";

  if (!candidates?.length) {
    dom.candidateList.innerHTML = '<div class="sp-candidate-empty">No candidates.</div>';
    return;
  }

  for (const candidate of candidates) {
    const item = document.createElement("div");
    item.className = "sp-candidate-item";
    item.dataset.candidateId = candidate.id;

    // Thumbnail
    const firstOutput = candidate.outputs?.[0];
    if (firstOutput?.thumbnailUrl || firstOutput?.url) {
      const thumb = document.createElement("img");
      thumb.className = "sp-candidate-thumb";
      thumb.src = firstOutput.thumbnailUrl || firstOutput.url;
      thumb.alt = "";
      thumb.loading = "lazy";
      thumb.onerror = () => {
        thumb.replaceWith(createPlaceholder(candidate.assetType));
      };
      item.appendChild(thumb);
    } else {
      item.appendChild(createPlaceholder(candidate.assetType));
    }

    // Info
    const info = document.createElement("div");
    info.className = "sp-candidate-info";

    const promptText = document.createElement("div");
    promptText.className = "sp-candidate-prompt";
    promptText.textContent = candidate.prompt
      ? candidate.prompt.substring(0, 120) + (candidate.prompt.length > 120 ? "..." : "")
      : "(no prompt)";
    info.appendChild(promptText);

    const meta = document.createElement("div");
    meta.className = "sp-candidate-meta";
    const outputCount = candidate.outputs?.length || 0;
    meta.textContent = `${candidate.assetType} -- ${outputCount} output(s)`;
    if (candidate.settings?.modelName) {
      meta.textContent += ` -- ${candidate.settings.modelName}`;
    }
    info.appendChild(meta);

    item.appendChild(info);

    // Confidence badge
    const badge = document.createElement("span");
    const conf = candidate.confidence || 0;
    badge.className = `sp-confidence ${confidenceClass(conf)}`;
    badge.textContent = `${Math.round(conf * 100)}%`;
    item.appendChild(badge);

    // Click handler
    item.addEventListener("click", () => selectCandidate(candidate));

    dom.candidateList.appendChild(item);
  }
}

/**
 * Apply selected candidate to capture form.
 */
function selectCandidate(candidate) {
  // Fill prompt
  dom.capPrompt.value = candidate.prompt || "";

  // Fill negative prompt
  if (candidate.negativePrompt) {
    dom.capNegPrompt.value = candidate.negativePrompt;
  }

  // Fill output URL from first output
  const firstOutput = candidate.outputs?.[0];
  if (firstOutput?.url) {
    dom.capOutputUrl.value = firstOutput.url;
  }

  // Fill thumbnail
  if (firstOutput?.thumbnailUrl) {
    dom.capThumbUrl.value = firstOutput.thumbnailUrl;
  }

  // Fill settings as model name
  if (candidate.settings?.modelName) {
    dom.capModelName.value = candidate.settings.modelName;
  }

  // Fill asset type
  if (candidate.assetType && dom.capAssetType.querySelector(`option[value="${candidate.assetType}"]`)) {
    dom.capAssetType.value = candidate.assetType;
  }

  // Store settings in metadata
  if (candidate.settings) {
    const existingMeta = dom.capMetadata.value.trim();
    let meta = {};
    try {
      meta = existingMeta ? JSON.parse(existingMeta) : {};
    } catch {
      // ignore
    }
    meta.detection = {
      candidateId: candidate.id,
      confidence: candidate.confidence,
      turnIndex: candidate.turnIndex,
      settings: candidate.settings,
    };
    dom.capMetadata.value = JSON.stringify(meta, null, 2);
  }

  closeCandidatePicker();
  scheduleSceneDraftSave();
  setStatus(`Applied candidate (${Math.round((candidate.confidence || 0) * 100)}% confidence).`);
}

function confidenceClass(conf) {
  if (conf >= 0.8) return "sp-confidence-high";
  if (conf >= 0.5) return "sp-confidence-medium";
  return "sp-confidence-low";
}

function createPlaceholder(assetType) {
  const placeholder = document.createElement("div");
  placeholder.className = "sp-candidate-thumb-placeholder";
  const labels = { VIDEO: "VID", IMAGE: "IMG", AUDIO: "AUD", MUSIC: "MUS", VOICE: "VOX" };
  placeholder.textContent = labels[assetType] || "?";
  return placeholder;
}
