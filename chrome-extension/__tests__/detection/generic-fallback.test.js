import { describe, it, expect } from "vitest";
import GenericFallback from "../../src/detection/generic-fallback.js";
import { createEmptyPageDOM } from "../fixtures/empty-page.js";

describe("GenericFallback", () => {
  it("always matches any URL", () => {
    expect(GenericFallback.match("https://example.com")).toBe(true);
    expect(GenericFallback.match("https://sora.com")).toBe(true);
    expect(GenericFallback.match("")).toBe(true);
  });

  it("has platformKey __generic__", () => {
    expect(GenericFallback.platformKey).toBe("__generic__");
  });

  it("extractLatest returns object with expected shape", () => {
    const doc = createEmptyPageDOM();
    const result = GenericFallback.extractLatest(doc);

    expect(result).toHaveProperty("prompt");
    expect(result).toHaveProperty("outputs");
    expect(result).toHaveProperty("assetType");
    expect(Array.isArray(result.outputs)).toBe(true);
  });

  it("extractCandidates returns single candidate", () => {
    const doc = createEmptyPageDOM();
    const result = GenericFallback.extractCandidates(doc);

    expect(result.length).toBe(1);
  });

  it("applyPrompt returns error when no input found", () => {
    const doc = new DOMParser().parseFromString("<html><body><p>no inputs</p></body></html>", "text/html");
    const result = GenericFallback.applyPrompt(doc, "test prompt");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("No editable prompt input");
  });

  it("applyPrompt returns error for empty prompt", () => {
    const doc = createEmptyPageDOM();
    const result = GenericFallback.applyPrompt(doc, "");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Prompt is empty");
  });
});
