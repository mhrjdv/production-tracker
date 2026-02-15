/* Thin adapter: Luma Dream Machine */
import LumaDetector from "../../../detectors/luma.js";
import { createDetectorAdapter } from "./adapter-helpers.js";

export default createDetectorAdapter(LumaDetector, {
  platformKey: "luma-dream-machine",
  displayName: "Luma Dream Machine",
  defaultAssetType: "VIDEO",
});
