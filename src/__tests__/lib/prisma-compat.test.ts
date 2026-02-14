import { describe, expect, it } from "vitest";
import { isPrismaSchemaMismatchError } from "@/lib/prisma-compat";

describe("prisma-compat", () => {
    it("returns true for missing-column code P2022", () => {
        expect(isPrismaSchemaMismatchError({ code: "P2022" })).toBe(true);
    });

    it("returns true for missing-table code P2021", () => {
        expect(isPrismaSchemaMismatchError({ code: "P2021" })).toBe(true);
    });

    it("returns true for text-only schema mismatch message", () => {
        expect(
            isPrismaSchemaMismatchError(new Error("The column `(not available)` does not exist in the current database."))
        ).toBe(true);
    });

    it("returns false for unrelated errors", () => {
        expect(isPrismaSchemaMismatchError(new Error("Unauthorized"))).toBe(false);
    });
});
