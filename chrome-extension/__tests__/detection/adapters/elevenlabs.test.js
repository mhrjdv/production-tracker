import { describe, it, expect } from "vitest";
import ElevenLabsAdapter from "../../../src/detection/adapters/elevenlabs.js";
import { createElevenLabsHistoryDOM } from "../../fixtures/elevenlabs-history.js";

describe("ElevenLabsAdapter", () => {
  describe("match", () => {
    it("matches elevenlabs.io", () => {
      expect(ElevenLabsAdapter.match("https://elevenlabs.io/speech-synthesis")).toBe(true);
    });

    it("matches beta.elevenlabs.io", () => {
      expect(ElevenLabsAdapter.match("https://beta.elevenlabs.io/create")).toBe(true);
    });

    it("does not match unrelated URLs", () => {
      expect(ElevenLabsAdapter.match("https://example.com")).toBe(false);
    });
  });

  describe("extractLatest", () => {
    it("extracts content from page", () => {
      const doc = createElevenLabsHistoryDOM();
      const result = ElevenLabsAdapter.extractLatest(doc);

      // Should extract TTS input or history item
      expect(result).toHaveProperty("prompt");
      expect(result).toHaveProperty("outputs");
      expect(result).toHaveProperty("assetType");
    });

    it("returns VOICE asset type by default", () => {
      const doc = createElevenLabsHistoryDOM();
      const result = ElevenLabsAdapter.extractLatest(doc);

      expect(result.assetType).toBe("VOICE");
    });
  });

  describe("extractCandidates", () => {
    it("returns candidates from history items", () => {
      const doc = createElevenLabsHistoryDOM();
      const candidates = ElevenLabsAdapter.extractCandidates(doc);

      expect(candidates.length).toBeGreaterThanOrEqual(1);
    });
  });
});
