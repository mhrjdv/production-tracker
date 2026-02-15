/* Thin adapter: Adobe Firefly */
import AdobeFireflyDetector from "../../../detectors/adobe-firefly.js";
import { createDetectorAdapter } from "./adapter-helpers.js";

export default createDetectorAdapter(AdobeFireflyDetector, {
  platformKey: "adobe-firefly",
  displayName: "Adobe Firefly",
  defaultAssetType: "IMAGE",
});
