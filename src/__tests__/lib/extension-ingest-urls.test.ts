// ============================================================
// TDD Tests for Extension Ingest Schema V2 — URL Handling
// Empty strings should transform to undefined, not fail validation
// ============================================================

import { describe, expect, it } from "vitest";
import { ingestSchemaV2 } from "@/lib/extension-ingest-schema";

const minimalPayload = {
  projectId: "proj_abc123",
  sceneId: "S001",
  platformKey: "midjourney",
  assetType: "IMAGE" as const,
  prompt: "A hero standing on a cliff at sunset",
};

describe("ingestSchemaV2 — URL field handling", () => {
  it("accepts valid URLs for sourceUrl, outputUrl, thumbnailUrl", () => {
    const result = ingestSchemaV2.safeParse({
      ...minimalPayload,
      sourceUrl: "https://example.com/source",
      outputUrl: "https://cdn.example.com/output.png",
      thumbnailUrl: "https://cdn.example.com/thumb.jpg",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceUrl).toBe("https://example.com/source");
      expect(result.data.outputUrl).toBe("https://cdn.example.com/output.png");
      expect(result.data.thumbnailUrl).toBe(
        "https://cdn.example.com/thumb.jpg",
      );
    }
  });

  it("accepts undefined URL fields", () => {
    const result = ingestSchemaV2.safeParse(minimalPayload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceUrl).toBeUndefined();
      expect(result.data.outputUrl).toBeUndefined();
      expect(result.data.thumbnailUrl).toBeUndefined();
    }
  });

  it("transforms empty string sourceUrl to undefined", () => {
    const result = ingestSchemaV2.safeParse({
      ...minimalPayload,
      sourceUrl: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceUrl).toBeUndefined();
    }
  });

  it("transforms empty string outputUrl to undefined", () => {
    const result = ingestSchemaV2.safeParse({
      ...minimalPayload,
      outputUrl: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.outputUrl).toBeUndefined();
    }
  });

  it("transforms empty string thumbnailUrl to undefined", () => {
    const result = ingestSchemaV2.safeParse({
      ...minimalPayload,
      thumbnailUrl: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.thumbnailUrl).toBeUndefined();
    }
  });

  it("transforms whitespace-only URL strings to undefined", () => {
    const result = ingestSchemaV2.safeParse({
      ...minimalPayload,
      sourceUrl: "   ",
      outputUrl: "\t",
      thumbnailUrl: " \n ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceUrl).toBeUndefined();
      expect(result.data.outputUrl).toBeUndefined();
      expect(result.data.thumbnailUrl).toBeUndefined();
    }
  });

  it("rejects malformed URLs", () => {
    const result = ingestSchemaV2.safeParse({
      ...minimalPayload,
      sourceUrl: "not-a-url",
    });

    expect(result.success).toBe(false);
  });

  it("handles all three URL fields as empty strings simultaneously", () => {
    const result = ingestSchemaV2.safeParse({
      ...minimalPayload,
      sourceUrl: "",
      outputUrl: "",
      thumbnailUrl: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceUrl).toBeUndefined();
      expect(result.data.outputUrl).toBeUndefined();
      expect(result.data.thumbnailUrl).toBeUndefined();
    }
  });
});
