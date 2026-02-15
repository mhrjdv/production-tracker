import { describe, it, expect } from "vitest";
import MidjourneyAdapter from "../../../src/detection/adapters/midjourney.js";
import { createMidjourneyGalleryDOM } from "../../fixtures/midjourney-gallery.js";

describe("MidjourneyAdapter", () => {
  describe("match", () => {
    it("matches midjourney.com", () => {
      expect(MidjourneyAdapter.match("https://www.midjourney.com/explore")).toBe(true);
    });

    it("matches alpha.midjourney.com", () => {
      expect(MidjourneyAdapter.match("https://alpha.midjourney.com/create")).toBe(true);
    });

    it("does not match unrelated URLs", () => {
      expect(MidjourneyAdapter.match("https://example.com")).toBe(false);
    });
  });

  describe("extractLatest", () => {
    it("extracts prompt from latest job card", () => {
      const doc = createMidjourneyGalleryDOM();
      const result = MidjourneyAdapter.extractLatest(doc);

      // First job card has the dragon prompt
      expect(result.prompt).toContain("dragon");
    });

    it("parses Midjourney --params from prompt", () => {
      const doc = createMidjourneyGalleryDOM();
      const result = MidjourneyAdapter.extractLatest(doc);

      // Prompt should be cleaned (no --v or --ar)
      expect(result.prompt).not.toContain("--v");
      expect(result.prompt).not.toContain("--ar");
    });

    it("extracts settings from --params", () => {
      const doc = createMidjourneyGalleryDOM();
      const result = MidjourneyAdapter.extractLatest(doc);

      expect(result.settings).toBeTruthy();
      expect(result.settings.modelName).toContain("6.1");
      expect(result.settings.aspectRatio).toBe("16:9");
      expect(result.settings.seed).toBe(42);
    });

    it("extracts images from job cards", () => {
      const doc = createMidjourneyGalleryDOM();
      const result = MidjourneyAdapter.extractLatest(doc);

      expect(result.outputs.length).toBeGreaterThanOrEqual(1);
      expect(result.outputs[0].url).toContain("midjourney");
    });
  });

  describe("extractCandidates", () => {
    it("returns multiple candidates from gallery", () => {
      const doc = createMidjourneyGalleryDOM();
      const candidates = MidjourneyAdapter.extractCandidates(doc);

      expect(candidates.length).toBeGreaterThanOrEqual(2);
    });

    it("first candidate is newest (first job card)", () => {
      const doc = createMidjourneyGalleryDOM();
      const candidates = MidjourneyAdapter.extractCandidates(doc);

      expect(candidates[0].prompt).toContain("dragon");
      expect(candidates[1].prompt).toContain("geometric");
    });
  });
});
