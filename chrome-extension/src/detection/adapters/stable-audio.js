/* Thin adapter: Stable Audio */
import StableAudioDetector from "../../../detectors/stable-audio.js";
import { createDetectorAdapter } from "./adapter-helpers.js";

export default createDetectorAdapter(StableAudioDetector, {
  platformKey: "stable-audio",
  displayName: "Stable Audio",
  defaultAssetType: "VOICE",
});
