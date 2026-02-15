import { describe, it, expect } from "vitest";
import RunwayAdapter from "../../../src/detection/adapters/runway.js";
import { createRunwayHistoryDOM } from "../../fixtures/runway-history.js";

describe("RunwayAdapter", () => {
  describe("match", () => {
    it("matches app.runwayml.com", () => {
      expect(RunwayAdapter.match("https://app.runwayml.com/generate")).toBe(true);
    });

    it("matches runwayml.com", () => {
      expect(RunwayAdapter.match("https://www.runwayml.com")).toBe(true);
    });

    it("does not match unrelated URLs", () => {
      expect(RunwayAdapter.match("https://example.com")).toBe(false);
    });
  });

  describe("extractLatest", () => {
    it("extracts prompt from latest generation card", () => {
      const doc = createRunwayHistoryDOM();
      const result = RunwayAdapter.extractLatest(doc);

      expect(result.prompt).toContain("dancer");
    });

    it("extracts video output", () => {
      const doc = createRunwayHistoryDOM();
      const result = RunwayAdapter.extractLatest(doc);

      expect(result.outputs.length).toBeGreaterThanOrEqual(1);
      expect(result.outputs[0].type).toBe("video");
      expect(result.outputs[0].url).toContain("runwayml");
    });

    it("infers VIDEO asset type", () => {
      const doc = createRunwayHistoryDOM();
      const result = RunwayAdapter.extractLatest(doc);

      expect(result.assetType).toBe("VIDEO");
    });
  });

  describe("extractCandidates", () => {
    it("returns multiple candidates from history", () => {
      const doc = createRunwayHistoryDOM();
      const candidates = RunwayAdapter.extractCandidates(doc);

      expect(candidates.length).toBeGreaterThanOrEqual(2);
      expect(candidates[0].prompt).toContain("dancer");
      expect(candidates[1].prompt).toContain("Timelapse");
    });
  });
});
