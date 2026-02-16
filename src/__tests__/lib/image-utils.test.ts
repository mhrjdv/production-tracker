import { describe, expect, it } from "vitest";
import {
  isAllowedImageHost,
  isOptimizableImageUrl,
  shouldSkipOptimization,
} from "@/lib/image-utils";

describe("isAllowedImageHost", () => {
  it("returns true for R2 bucket URLs", () => {
    expect(
      isAllowedImageHost(
        "https://pub-15baef71f1364d1e867fa9a59fcb3717.r2.dev/projects/abc/img.png",
      ),
    ).toBe(true);
  });

  it("returns true for Google image URLs", () => {
    expect(
      isAllowedImageHost(
        "https://lh3.googleusercontent.com/gg/some-long-path=s1024-rj",
      ),
    ).toBe(true);
  });

  it("returns true for known AI platform hosts", () => {
    expect(
      isAllowedImageHost("https://cdn.midjourney.com/image.png"),
    ).toBe(true);
    expect(
      isAllowedImageHost("https://replicate.delivery/output/abc.png"),
    ).toBe(true);
    expect(
      isAllowedImageHost("https://fal.media/files/abc.png"),
    ).toBe(true);
  });

  it("returns false for unknown hosts", () => {
    expect(
      isAllowedImageHost("https://random-platform.com/image.png"),
    ).toBe(false);
    expect(
      isAllowedImageHost("https://example.com/photo.jpg"),
    ).toBe(false);
  });

  it("returns false for null/undefined/empty", () => {
    expect(isAllowedImageHost(null)).toBe(false);
    expect(isAllowedImageHost(undefined)).toBe(false);
    expect(isAllowedImageHost("")).toBe(false);
  });

  it("returns false for invalid URLs", () => {
    expect(isAllowedImageHost("not-a-url")).toBe(false);
    expect(isAllowedImageHost("ftp://example.com/img.png")).toBe(false);
  });
});

describe("isOptimizableImageUrl (deprecated alias)", () => {
  it("is an alias for isAllowedImageHost", () => {
    expect(isOptimizableImageUrl).toBe(isAllowedImageHost);
  });
});

describe("shouldSkipOptimization", () => {
  const R2_URL =
    "https://pub-15baef71f1364d1e867fa9a59fcb3717.r2.dev/projects/abc/img.png";
  const GOOGLE_URL =
    "https://lh3.googleusercontent.com/gg/some-long-path=s1024-rj";
  const UNKNOWN_URL = "https://random-platform.com/image.png";

  it("always returns true — all external images bypass the optimization proxy", () => {
    expect(shouldSkipOptimization(R2_URL, true)).toBe(true);
    expect(shouldSkipOptimization(R2_URL, false)).toBe(true);
    expect(shouldSkipOptimization(GOOGLE_URL, true)).toBe(true);
    expect(shouldSkipOptimization(UNKNOWN_URL, true)).toBe(true);
    expect(shouldSkipOptimization(UNKNOWN_URL, false)).toBe(true);
    expect(shouldSkipOptimization(null, false)).toBe(true);
    expect(shouldSkipOptimization(undefined, true)).toBe(true);
    expect(shouldSkipOptimization("", false)).toBe(true);
    expect(shouldSkipOptimization()).toBe(true);
  });
});
