import { describe, it, expect } from "vitest";
import {
  isValidTransition,
  validateStatusTransition,
  getValidTransitions,
  ALL_STATUSES,
} from "../../src/utils/status-machine.js";
import type { AssetStatus } from "../../src/utils/status-machine.js";

describe("status-machine", () => {
  describe("isValidTransition", () => {
    const validCases: [AssetStatus, AssetStatus][] = [
      ["DRAFT", "GENERATED"],
      ["DRAFT", "SELECTED"],
      ["DRAFT", "REJECTED"],
      ["DRAFT", "ARCHIVED"],
      ["GENERATED", "NEEDS_REVIEW"],
      ["GENERATED", "SELECTED"],
      ["NEEDS_REVIEW", "REVIEWED"],
      ["REVIEWED", "APPROVED"],
      ["APPROVED", "SELECTED"],
      ["APPROVED", "FINAL"],
      ["SELECTED", "FINAL"],
      ["SELECTED", "ARCHIVED"],
      ["REJECTED", "DRAFT"],
      ["ARCHIVED", "DRAFT"],
      ["FINAL", "ARCHIVED"],
    ];

    it.each(validCases)("%s → %s is valid", (from, to) => {
      expect(isValidTransition(from, to)).toBe(true);
    });

    const invalidCases: [AssetStatus, AssetStatus][] = [
      ["DRAFT", "FINAL"],
      ["DRAFT", "APPROVED"],
      ["GENERATED", "FINAL"],
      ["NEEDS_REVIEW", "FINAL"],
      ["FINAL", "DRAFT"],
      ["FINAL", "SELECTED"],
    ];

    it.each(invalidCases)("%s → %s is invalid", (from, to) => {
      expect(isValidTransition(from, to)).toBe(false);
    });

    it("self-transitions are invalid", () => {
      for (const status of ALL_STATUSES) {
        expect(isValidTransition(status, status)).toBe(false);
      }
    });
  });

  describe("validateStatusTransition", () => {
    it("does not throw for valid transition", () => {
      expect(() =>
        validateStatusTransition("DRAFT", "GENERATED"),
      ).not.toThrow();
    });

    it("throws for invalid transition with descriptive message", () => {
      expect(() => validateStatusTransition("DRAFT", "FINAL")).toThrow(
        /Invalid status transition: DRAFT → FINAL/,
      );
    });
  });

  describe("getValidTransitions", () => {
    it("returns allowed transitions for DRAFT", () => {
      const transitions = getValidTransitions("DRAFT");
      expect(transitions).toEqual(["GENERATED", "SELECTED", "REJECTED", "ARCHIVED"]);
    });

    it("returns single transition for FINAL", () => {
      expect(getValidTransitions("FINAL")).toEqual(["ARCHIVED"]);
    });
  });

  describe("ALL_STATUSES", () => {
    it("contains all 9 statuses", () => {
      expect(ALL_STATUSES).toHaveLength(9);
      expect(ALL_STATUSES).toContain("DRAFT");
      expect(ALL_STATUSES).toContain("FINAL");
    });
  });
});
