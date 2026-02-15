// Detector registry: imports all platform detectors and provides lookup utilities
// Last verified: 2026-02

import SoraDetector from "./sora.js";
import GeminiVeoDetector from "./gemini-veo.js";
import FreepikDetector from "./freepik.js";
import MidjourneyDetector from "./midjourney.js";
import RunwayDetector from "./runway.js";
import KlingDetector from "./kling.js";
import LumaDetector from "./luma.js";
import LeonardoDetector from "./leonardo.js";
import IdeogramDetector from "./ideogram.js";
import AdobeFireflyDetector from "./adobe-firefly.js";
import FluxDetector from "./flux.js";
import ElevenLabsDetector from "./elevenlabs.js";
import SunoDetector from "./suno.js";
import UdioDetector from "./udio.js";
import StableAudioDetector from "./stable-audio.js";

/**
 * All registered platform detectors.
 * Order matters: more specific URL patterns should come before generic ones.
 */
export const DETECTORS = [
  SoraDetector,
  GeminiVeoDetector,
  FreepikDetector,
  MidjourneyDetector,
  RunwayDetector,
  KlingDetector,
  LumaDetector,
  LeonardoDetector,
  IdeogramDetector,
  AdobeFireflyDetector,
  FluxDetector,
  ElevenLabsDetector,
  SunoDetector,
  UdioDetector,
  StableAudioDetector,
];

/**
 * Detect which platform the given URL belongs to.
 * Returns the first matching detector, or null if no match.
 *
 * @param {string} url - The full page URL to test
 * @returns {object|null} The matching detector object, or null
 */
export function detectPlatform(url) {
  if (!url || typeof url !== "string") return null;

  for (const detector of DETECTORS) {
    try {
      if (detector.detect(url)) {
        return detector;
      }
    } catch (e) {
      // Defensive: skip detectors that throw on malformed URLs
      console.warn(`[detectors] ${detector.platform} threw on URL "${url}":`, e);
    }
  }

  return null;
}

/**
 * Retrieve a detector by its platform slug (e.g. "midjourney", "openai-sora").
 *
 * @param {string} platformKey - The platform slug to look up
 * @returns {object|null} The matching detector object, or null
 */
export function getDetector(platformKey) {
  if (!platformKey || typeof platformKey !== "string") return null;
  const key = platformKey.toLowerCase();
  return DETECTORS.find((d) => d.platform === key) || null;
}

export default { DETECTORS, detectPlatform, getDetector };
