/* Thin adapter: Udio */
import UdioDetector from "../../../detectors/udio.js";
import { createDetectorAdapter } from "./adapter-helpers.js";

export default createDetectorAdapter(UdioDetector, {
  platformKey: "udio",
  displayName: "Udio",
  defaultAssetType: "MUSIC",
});
