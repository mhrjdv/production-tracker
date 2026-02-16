import { describe, expect, it } from "vitest";
import { isOptimizableImageUrl, shouldSkipOptimization } from "@/lib/image-utils";

describe("isOptimizableImageUrl", () => {
  it("returns true for R2 bucket URLs", () => {
    expect(
      isOptimizableImageUrl(
        "https://pub-15baef71f1364d1e867fa9a59fcb3717.r2.dev/projects/abc/img.png",
      ),
    ).toBe(true);
  });

  it("returns true for Google image URLs", () => {
    expect(
      isOptimizableImageUrl(
        "https://lh3.googleusercontent.com/gg/some-long-path=s1024-rj",
      ),
    ).toBe(true);
  });

  it("returns true for known AI platform hosts", () => {
    expect(
      isOptimizableImageUrl("https://cdn.midjourney.com/image.png"),
    ).toBe(true);
    expect(
      isOptimizableImageUrl("https://replicate.delivery/output/abc.png"),
    ).toBe(true);
    expect(
      isOptimizableImageUrl("https://fal.media/files/abc.png"),
    ).toBe(true);
  });

  it("returns false for unknown hosts", () => {
    expect(
      isOptimizableImageUrl("https://random-platform.com/image.png"),
    ).toBe(false);
    expect(
      isOptimizableImageUrl("https://example.com/photo.jpg"),
    ).toBe(false);
  });

  it("returns false for null/undefined/empty", () => {
    expect(isOptimizableImageUrl(null)).toBe(false);
    expect(isOptimizableImageUrl(undefined)).toBe(false);
    expect(isOptimizableImageUrl("")).toBe(false);
  });

  it("returns false for invalid URLs", () => {
    expect(isOptimizableImageUrl("not-a-url")).toBe(false);
    expect(isOptimizableImageUrl("ftp://example.com/img.png")).toBe(false);
  });
});

describe("shouldSkipOptimization", () => {
  const R2_URL =
    "https://pub-15baef71f1364d1e867fa9a59fcb3717.r2.dev/projects/abc/img.png";
  const GOOGLE_URL =
    "https://lh3.googleusercontent.com/gg/some-long-path=s1024-rj";
  const UNKNOWN_URL = "https://random-platform.com/image.png";

  it("returns false (optimize) for known host WITH thumbnail", () => {
    expect(shouldSkipOptimization(R2_URL, true)).toBe(false);
    expect(shouldSkipOptimization(GOOGLE_URL, true)).toBe(false);
  });

  it("returns true (skip) for known host WITHOUT thumbnail", () => {
    expect(shouldSkipOptimization(R2_URL, false)).toBe(true);
  });

  it("returns true (skip) for unknown host regardless of thumbnail", () => {
    expect(shouldSkipOptimization(UNKNOWN_URL, true)).toBe(true);
    expect(shouldSkipOptimization(UNKNOWN_URL, false)).toBe(true);
  });

  it("returns true (skip) for null/undefined/empty", () => {
    expect(shouldSkipOptimization(null, false)).toBe(true);
    expect(shouldSkipOptimization(undefined, true)).toBe(true);
    expect(shouldSkipOptimization("", false)).toBe(true);
  });
});
