/* Thin adapter: Ideogram */
import IdeogramDetector from "../../../detectors/ideogram.js";
import { createDetectorAdapter } from "./adapter-helpers.js";

export default createDetectorAdapter(IdeogramDetector, {
  platformKey: "ideogram",
  displayName: "Ideogram",
  defaultAssetType: "IMAGE",
});
