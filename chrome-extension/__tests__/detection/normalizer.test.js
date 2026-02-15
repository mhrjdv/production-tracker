import { describe, it, expect } from "vitest";
import { normalizeCandidate, normalizeCandidates } from "../../src/detection/normalizer.js";

describe("normalizeCandidate", () => {
  it("returns frozen candidate with prompt+output at confidence 1.0", () => {
    const raw = {
      prompt: "a cinematic shot",
      outputs: [{ type: "video", url: "https://example.com/vid.mp4", thumbnailUrl: null, metadata: {} }],
      assetType: "VIDEO",
    };
    const result = normalizeCandidate(raw, "openai-sora", 0);

    expect(result.prompt).toBe("a cinematic shot");
    expect(result.confidence).toBe(1.0);
    expect(result.platformKey).toBe("openai-sora");
    expect(result.turnIndex).toBe(0);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("returns confidence 0.7 for prompt-only", () => {
    const raw = { prompt: "a cinematic shot", outputs: [] };
    const result = normalizeCandidate(raw, "openai-sora", 0);

    expect(result.confidence).toBe(0.7);
  });

  it("returns confidence 0.3 for output-only", () => {
    const raw = {
      prompt: "",
      outputs: [{ type: "image", url: "https://example.com/img.jpg", thumbnailUrl: null, metadata: {} }],
    };
    const result = normalizeCandidate(raw, "midjourney", 0);

    expect(result.confidence).toBe(0.3);
  });

  it("returns confidence 0 for empty candidate", () => {
    const result = normalizeCandidate({}, "unknown", 0);

    expect(result.confidence).toBe(0);
    expect(result.prompt).toBe("");
    expect(result.outputs).toEqual([]);
  });

  it("generates deterministic candidate IDs", () => {
    const raw = { prompt: "same prompt", outputs: [{ url: "https://example.com/same.mp4" }] };
    const a = normalizeCandidate(raw, "sora", 0);
    const b = normalizeCandidate(raw, "sora", 1);

    expect(a.id).toBe(b.id);
    expect(a.id).toMatch(/^cand_/);
  });

  it("preserves negativePrompt and settings", () => {
    const raw = {
      prompt: "test",
      negativePrompt: "blurry",
      settings: { modelName: "v6" },
      outputs: [],
    };
    const result = normalizeCandidate(raw, "mj", 0);

    expect(result.negativePrompt).toBe("blurry");
    expect(result.settings).toEqual({ modelName: "v6" });
  });
});

describe("normalizeCandidates", () => {
  it("deduplicates by ID", () => {
    const raws = [
      { prompt: "same", outputs: [{ url: "https://example.com/a.mp4" }] },
      { prompt: "same", outputs: [{ url: "https://example.com/a.mp4" }] },
      { prompt: "different", outputs: [] },
    ];
    const result = normalizeCandidates(raws, "sora");

    expect(result.length).toBe(2);
  });

  it("returns frozen array", () => {
    const result = normalizeCandidates([{ prompt: "test", outputs: [] }], "sora");

    expect(Object.isFrozen(result)).toBe(true);
  });

  it("handles empty input", () => {
    const result = normalizeCandidates([], "sora");

    expect(result).toEqual([]);
  });

  it("assigns incremental turnIndex", () => {
    const raws = [
      { prompt: "first", outputs: [] },
      { prompt: "second", outputs: [] },
    ];
    const result = normalizeCandidates(raws, "sora");

    expect(result[0].turnIndex).toBe(0);
    expect(result[1].turnIndex).toBe(1);
  });
});
