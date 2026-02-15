/* ==========================================================
   Intent – Smart intent suggestions for the context panel
   ========================================================== */

import { dom, setStatus, setActiveMode } from "./dom.js";
import state from "./state.js";
import { getCurrentDraftKey } from "./drafts.js";
import { hydrateCapture, applySceneAssetToCapture } from "./capture.js";

export function pickPreferredPlatformForType(assetType) {
  const preferredOrder = {
    VIDEO: [
      "openai-sora",
      "google-veo",
      "runway",
      "kling-ai",
      "luma-dream-machine",
      "pika",
    ],
    IMAGE: [
      "midjourney",
      "ideogram",
      "bfl-flux",
      "freepik-ai",
      "adobe-firefly",
    ],
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
    const match = state.platforms.find((p) => p.slug === slug);
    if (match) return match;
  }
  return (
    state.platforms.find((p) =>
      (p.supportedOutput || []).includes(assetType),
    ) || null
  );
}

export function refreshIntentSuggestions() {
  const suggestions = [];
  const config = state.configCache || {};
  const sceneId = dom.ctxSceneSelect.value;
  const currentType = dom.capAssetType.value;
  const currentPlatform = dom.capPlatformSelect.value;
  const draftKey = getCurrentDraftKey();
  const draft = draftKey ? config.sceneDrafts?.[draftKey] : null;

  // Draft available
  if (draft && draft.prompt && draft.prompt !== dom.capPrompt.value.trim()) {
    suggestions.push({
      label: "Restore Draft",
      reason: `Unsynced draft found for ${sceneId}.`,
      run: () => {
        hydrateCapture(draft);
        setActiveMode("capture");
        setStatus("Restored unsynced draft.");
      },
    });
  }

  // Continue last capture
  const lastCapture = config.lastCapture;
  if (
    lastCapture &&
    lastCapture.sceneId === sceneId &&
    lastCapture.projectId === dom.ctxProjectSelect.value
  ) {
    suggestions.push({
      label: "Continue Last",
      reason: `Last: ${lastCapture.assetType} on ${lastCapture.platformLabel || lastCapture.platformKey}.`,
      run: () => {
        hydrateCapture(lastCapture);
        dom.capAssetStatus.value = "GENERATED";
        setActiveMode("capture");
        setStatus("Loaded previous capture context.");
      },
    });
  }

  // Recurring model suggestion
  const history = Array.isArray(config.captureHistory)
    ? config.captureHistory
    : [];
  const recurring =
    history
      .filter(
        (i) =>
          i.sceneId === sceneId &&
          i.assetType === currentType &&
          i.platformKey === currentPlatform,
      )
      .slice(-1)[0] || null;
  if (recurring && recurring.modelName && !dom.capModelName.value.trim()) {
    suggestions.push({
      label: "Use Last Model",
      reason: `Previous ${currentType} used ${recurring.modelName}.`,
      run: () => {
        dom.capModelName.value = recurring.modelName;
        setActiveMode("capture");
        setStatus("Applied model suggestion.");
      },
    });
  }

  // Selected variant
  const selectedSameType = state.sceneAssets.find(
    (a) => a.selected && a.assetType === currentType,
  );
  if (selectedSameType) {
    suggestions.push({
      label: "Variant From Selected",
      reason: `Selected ${currentType} v${selectedSameType.versionNumber} in scene.`,
      run: () => {
        applySceneAssetToCapture(selectedSameType.id);
        dom.capAssetStatus.value = "GENERATED";
        setActiveMode("capture");
        setStatus("Prepared variant from selected version.");
      },
    });
  }

  // Video pass from image
  const selectedImage =
    state.sceneAssets.find((a) => a.selected && a.assetType === "IMAGE") ||
    state.sceneAssets.find((a) => a.selected && a.assetType === "STORYBOARD");
  const hasVideo = state.sceneAssets.some((a) => a.assetType === "VIDEO");
  if (selectedImage && !hasVideo) {
    suggestions.push({
      label: "Prep Video Pass",
      reason: "Scene has selected image but no video yet.",
      run: () => {
        applySceneAssetToCapture(selectedImage.id);
        dom.capAssetType.value = "VIDEO";
        dom.capAssetStatus.value = "GENERATED";
        const preferred = pickPreferredPlatformForType("VIDEO");
        if (preferred) dom.capPlatformSelect.value = preferred.slug;
        setActiveMode("capture");
        setStatus("Prepared video pass draft.");
      },
    });
  }

  // Page context prompt
  if (
    state.lastPageContext &&
    state.lastPageContext.prompt &&
    !dom.capPrompt.value.trim()
  ) {
    suggestions.push({
      label: "Use Page Prompt",
      reason: "Detected prompt in current tab.",
      run: async () => {
        const { applyPageContextToCapture } = await import("./capture.js");
        applyPageContextToCapture(state.lastPageContext);
        dom.capAssetStatus.value = "GENERATED";
        setActiveMode("capture");
        setStatus("Applied detected page prompt.");
      },
    });
  }

  // Render
  dom.ctxIntentActions.innerHTML = "";
  if (suggestions.length === 0) {
    dom.ctxIntentBox.classList.add("hidden");
    dom.ctxIntentText.textContent = "";
    return;
  }

  dom.ctxIntentBox.classList.remove("hidden");
  dom.ctxIntentText.textContent = `Smart intent: ${suggestions[0].reason}`;

  suggestions.slice(0, 3).forEach((sug) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sp-btn sp-btn-ghost";
    btn.textContent = sug.label;
    btn.addEventListener("click", async () => {
      try {
        btn.disabled = true;
        await sug.run();
        refreshIntentSuggestions();
      } catch (err) {
        setStatus(err.message, true);
      } finally {
        btn.disabled = false;
      }
    });
    dom.ctxIntentActions.appendChild(btn);
  });
}
