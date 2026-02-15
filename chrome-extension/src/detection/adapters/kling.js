/* Thin adapter: Kling AI */
import KlingDetector from "../../../detectors/kling.js";
import { createDetectorAdapter } from "./adapter-helpers.js";

export default createDetectorAdapter(KlingDetector, {
  platformKey: "kling-ai",
  displayName: "Kling AI",
  defaultAssetType: "VIDEO",
});
