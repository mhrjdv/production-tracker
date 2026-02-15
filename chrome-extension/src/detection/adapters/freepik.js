/* Thin adapter: Freepik Pikaso */
import FreepikDetector from "../../../detectors/freepik.js";
import { createDetectorAdapter } from "./adapter-helpers.js";

export default createDetectorAdapter(FreepikDetector, {
  platformKey: "freepik-ai",
  displayName: "Freepik Pikaso",
  defaultAssetType: "IMAGE",
});
