/* ==========================================================
   Detection V2 – Engine
   Central coordination: adapter lookup, extraction, prompt injection.
   ========================================================== */

import { ADAPTERS } from "./adapter-registry.js";
import { normalizeCandidate, normalizeCandidates } from "./normalizer.js";
import { ENGINE_VERSION } from "./types.js";

/**
 * @typedef {Object} Adapter
 * @property {string} platformKey
 * @property {string} displayName
 * @property {(url: string) => boolean} match
 * @property {(doc: Document) => Object} extractLatest
 * @property {(doc: Document) => Array<Object>} extractCandidates
 * @property {(doc: Document, text: string) => {ok: boolean, error?: string}} applyPrompt
 */

/**
 * Find the first matching adapter for a URL.
 * GenericFallback always matches as last resort.
 *
 * @param {string} url
 * @returns {Adapter}
 */
export function findAdapter(url) {
  if (!url) return ADAPTERS[ADAPTERS.length - 1];

  for (const adapter of ADAPTERS) {
    try {
      if (adapter.match(url)) return adapter;
    } catch {
      // Skip broken adapter
    }
  }

  return ADAPTERS[ADAPTERS.length - 1]; // GenericFallback
}

/**
 * Quick-path extraction: latest candidate + limited candidates list.
 *
 * @param {Document} doc
 * @param {string} url
 * @returns {{ latestCandidate, candidates, adapter, warnings, debug }}
 */
export function extractLatest(doc, url) {
  const adapter = findAdapter(url);
  const warnings = [];
  const debug = { engineVersion: ENGINE_VERSION, adapter: adapter.platformKey, strategy: "extractLatest" };

  try {
    const raw = adapter.extractLatest(doc);
    const latestCandidate = normalizeCandidate(raw, adapter.platformKey, 0);

    // Also get a few candidates for context
    let candidates = [latestCandidate];
    try {
      const raws = adapter.extractCandidates(doc);
      if (raws.length > 1) {
        candidates = normalizeCandidates(raws, adapter.platformKey);
      }
    } catch {
      warnings.push("extractCandidates failed, using single candidate");
    }

    return { latestCandidate, candidates, adapter, warnings, debug };
  } catch (err) {
    warnings.push(`extractLatest failed: ${err.message}`);
    return {
      latestCandidate: normalizeCandidate({}, adapter.platformKey, 0),
      candidates: [],
      adapter,
      warnings,
      debug,
    };
  }
}

/**
 * Full thread scan: all available candidates from the page.
 *
 * @param {Document} doc
 * @param {string} url
 * @param {Object} [opts] - { maxCandidates: 20 }
 * @returns {{ candidates, adapter, warnings, debug }}
 */
export function extractCandidates(doc, url, opts = {}) {
  const maxCandidates = opts.maxCandidates || 20;
  const adapter = findAdapter(url);
  const warnings = [];
  const debug = { engineVersion: ENGINE_VERSION, adapter: adapter.platformKey, strategy: "extractCandidates" };

  try {
    const raws = adapter.extractCandidates(doc);
    const candidates = normalizeCandidates(raws.slice(0, maxCandidates), adapter.platformKey);
    return { candidates, adapter, warnings, debug };
  } catch (err) {
    warnings.push(`extractCandidates failed: ${err.message}`);
    return { candidates: [], adapter, warnings, debug };
  }
}

/**
 * Adapter-aware prompt injection.
 *
 * @param {Document} doc
 * @param {string} url
 * @param {string} text
 * @returns {{ ok: boolean, error?: string }}
 */
export function applyPrompt(doc, url, text) {
  const adapter = findAdapter(url);
  try {
    return adapter.applyPrompt(doc, text);
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
