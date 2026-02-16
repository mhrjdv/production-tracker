import { describe, it, expect } from "vitest";
import { hashToken } from "../../src/auth/token-auth.js";

describe("token-auth", () => {
  describe("hashToken", () => {
    it("produces a hex SHA-256 hash", () => {
      const hash = hashToken("lzr_abc123");
      // SHA-256 produces 64 hex characters
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("is deterministic", () => {
      const h1 = hashToken("lzr_test");
      const h2 = hashToken("lzr_test");
      expect(h1).toBe(h2);
    });

    it("produces different hashes for different tokens", () => {
      const h1 = hashToken("lzr_aaa");
      const h2 = hashToken("lzr_bbb");
      expect(h1).not.toBe(h2);
    });
  });

  // authenticateMcpToken requires a real PrismaClient + DB
  // — tested in integration tests
});
