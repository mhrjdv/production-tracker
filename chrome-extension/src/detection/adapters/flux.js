/* Thin adapter: Flux (Black Forest Labs) */
import FluxDetector from "../../../detectors/flux.js";
import { createDetectorAdapter } from "./adapter-helpers.js";

export default createDetectorAdapter(FluxDetector, {
  platformKey: "bfl-flux",
  displayName: "Flux (Black Forest Labs)",
  defaultAssetType: "IMAGE",
});
