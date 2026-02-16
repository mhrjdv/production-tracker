import { describe, it, expect } from "vitest";
import { ok, err, authError, notFound, forbidden, fromCatch } from "../../src/utils/errors.js";

describe("errors", () => {
  describe("ok", () => {
    it("wraps data in MCP content format", () => {
      const result = ok({ id: "abc", name: "Test" });
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual({ id: "abc", name: "Test" });
    });

    it("handles arrays", () => {
      const result = ok([1, 2, 3]);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual([1, 2, 3]);
    });

    it("handles null", () => {
      const result = ok(null);
      expect(result.content[0].text).toBe("null");
    });
  });

  describe("err", () => {
    it("returns isError: true with error JSON", () => {
      const result = err("Something broke", "BROKEN");
      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual({ error: "Something broke", code: "BROKEN" });
    });

    it("defaults code to ERROR", () => {
      const result = err("Oops");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.code).toBe("ERROR");
    });
  });

  describe("authError", () => {
    it("returns UNAUTHORIZED code", () => {
      const result = authError();
      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.code).toBe("UNAUTHORIZED");
    });
  });

  describe("notFound", () => {
    it("includes resource and id in message", () => {
      const result = notFound("Project", "xyz");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain("Project");
      expect(parsed.error).toContain("xyz");
      expect(parsed.code).toBe("NOT_FOUND");
    });
  });

  describe("forbidden", () => {
    it("returns FORBIDDEN code", () => {
      const result = forbidden();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.code).toBe("FORBIDDEN");
    });
  });

  describe("fromCatch", () => {
    it("extracts message from Error", () => {
      const result = fromCatch(new Error("DB down"));
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe("DB down");
      expect(parsed.code).toBe("INTERNAL_ERROR");
    });

    it("handles non-Error values", () => {
      const result = fromCatch("string error");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe("Unknown error occurred");
    });
  });
});
