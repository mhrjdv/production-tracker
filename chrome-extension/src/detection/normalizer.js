/* ==========================================================
   Detection V2 – Candidate normalizer
   ========================================================== */

import { candidateId } from "./types.js";

/**
 * Confidence tiers based on data completeness.
 */
const CONFIDENCE = {
  PROMPT_AND_OUTPUT: 1.0,
  PROMPT_ONLY: 0.7,
  OUTPUT_ONLY: 0.3,
};

/**
 * Normalize a raw extraction result into a frozen Candidate.
 *
 * @param {Object} raw - { prompt, negativePrompt, outputs, settings, assetType, timestamp }
 * @param {string} platformKey
 * @param {number} turnIndex
 * @returns {Readonly<import("./types.js").Candidate>}
 */
export function normalizeCandidate(raw, platformKey, turnIndex) {
  const prompt = String(raw.prompt || "").trim();
  const outputs = Array.isArray(raw.outputs) ? raw.outputs : [];
  const firstOutputUrl = outputs[0]?.url || "";

  let confidence = 0;
  if (prompt && firstOutputUrl) {
    confidence = CONFIDENCE.PROMPT_AND_OUTPUT;
  } else if (prompt) {
    confidence = CONFIDENCE.PROMPT_ONLY;
  } else if (firstOutputUrl) {
    confidence = CONFIDENCE.OUTPUT_ONLY;
  }

  return Object.freeze({
    id: candidateId(prompt, firstOutputUrl),
    turnIndex,
    prompt,
    negativePrompt: raw.negativePrompt || null,
    outputs,
    settings: raw.settings || null,
    assetType: raw.assetType || "IMAGE",
    confidence,
    timestamp: raw.timestamp || 0,
    platformKey: raw.platformKey || platformKey,
  });
}

/**
 * Normalize an array of raw candidates, dedup by id, sort newest first.
 *
 * @param {Array<Object>} raws
 * @param {string} platformKey
 * @returns {ReadonlyArray<Readonly<import("./types.js").Candidate>>}
 */
export function normalizeCandidates(raws, platformKey) {
  const seen = new Set();
  const result = [];

  for (let i = 0; i < raws.length; i++) {
    const candidate = normalizeCandidate(raws[i], platformKey, i);
    if (!seen.has(candidate.id)) {
      seen.add(candidate.id);
      result.push(candidate);
    }
  }

  return Object.freeze(result);
}
