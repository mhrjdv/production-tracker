import { describe, it, expect } from "vitest";
import GeminiAdapter from "../../../src/detection/adapters/gemini.js";
import { createGeminiThreadDOM } from "../../fixtures/gemini-thread.js";

describe("GeminiAdapter", () => {
  describe("match", () => {
    it("matches gemini.google.com", () => {
      expect(GeminiAdapter.match("https://gemini.google.com/chat")).toBe(true);
    });

    it("matches aistudio.google.com", () => {
      expect(GeminiAdapter.match("https://aistudio.google.com/prompts")).toBe(true);
    });

    it("does not match unrelated URLs", () => {
      expect(GeminiAdapter.match("https://google.com")).toBe(false);
      expect(GeminiAdapter.match("https://youtube.com")).toBe(false);
    });
  });

  describe("extractLatest", () => {
    it("extracts latest prompt from thread", () => {
      const doc = createGeminiThreadDOM();
      const result = GeminiAdapter.extractLatest(doc);

      expect(result.prompt).toContain("sunset");
    });

    it("extracts outputs from latest model response", () => {
      const doc = createGeminiThreadDOM();
      const result = GeminiAdapter.extractLatest(doc);

      expect(result.outputs.length).toBeGreaterThanOrEqual(1);
      expect(result.outputs[0].url).toContain("img-def");
    });
  });

  describe("extractCandidates", () => {
    it("returns multiple candidates from thread", () => {
      const doc = createGeminiThreadDOM();
      const candidates = GeminiAdapter.extractCandidates(doc);

      expect(candidates.length).toBeGreaterThanOrEqual(2);
    });
  });
});
