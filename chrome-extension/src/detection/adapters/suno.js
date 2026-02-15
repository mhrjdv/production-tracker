/* Thin adapter: Suno */
import SunoDetector from "../../../detectors/suno.js";
import { createDetectorAdapter } from "./adapter-helpers.js";

export default createDetectorAdapter(SunoDetector, {
  platformKey: "suno",
  displayName: "Suno",
  defaultAssetType: "MUSIC",
});
