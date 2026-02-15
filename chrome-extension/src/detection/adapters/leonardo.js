/* Thin adapter: Leonardo AI */
import LeonardoDetector from "../../../detectors/leonardo.js";
import { createDetectorAdapter } from "./adapter-helpers.js";

export default createDetectorAdapter(LeonardoDetector, {
  platformKey: "leonardo-ai",
  displayName: "Leonardo AI",
  defaultAssetType: "IMAGE",
});
