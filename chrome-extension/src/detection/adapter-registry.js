/* ==========================================================
   Detection V2 – Adapter registry
   Ordered list: more specific adapters first, generic last.
   ========================================================== */

import ChatGPTSoraAdapter from "./adapters/chatgpt-sora.js";
import GeminiAdapter from "./adapters/gemini.js";
import MidjourneyAdapter from "./adapters/midjourney.js";
import RunwayAdapter from "./adapters/runway.js";
import ElevenLabsAdapter from "./adapters/elevenlabs.js";
import KlingAdapter from "./adapters/kling.js";
import LumaAdapter from "./adapters/luma.js";
import FreepikAdapter from "./adapters/freepik.js";
import LeonardoAdapter from "./adapters/leonardo.js";
import IdeogramAdapter from "./adapters/ideogram.js";
import AdobeFireflyAdapter from "./adapters/adobe-firefly.js";
import FluxAdapter from "./adapters/flux.js";
import SunoAdapter from "./adapters/suno.js";
import UdioAdapter from "./adapters/udio.js";
import StableAudioAdapter from "./adapters/stable-audio.js";
import GenericFallback from "./generic-fallback.js";

/**
 * Ordered adapter list. The engine tries each in order;
 * first match wins. GenericFallback always matches last.
 */
export const ADAPTERS = [
  ChatGPTSoraAdapter,
  GeminiAdapter,
  FreepikAdapter,
  MidjourneyAdapter,
  RunwayAdapter,
  KlingAdapter,
  LumaAdapter,
  LeonardoAdapter,
  IdeogramAdapter,
  AdobeFireflyAdapter,
  FluxAdapter,
  ElevenLabsAdapter,
  SunoAdapter,
  UdioAdapter,
  StableAudioAdapter,
  GenericFallback,
];
