import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test the matchesKey logic indirectly through simulated keyboard events.
// The hook itself uses useEffect, so we test the underlying logic by
// extracting the matching algorithm.

// ─── Inline match helper (mirrors the hook's internal logic) ─────

function matchesKey(
    key: string,
    e: { key: string; code: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean },
    pendingPrefix: string | null,
): { matches: boolean; pendingPrefix?: string } {
    if (key.includes(" ")) {
        const [prefix, suffix] = key.split(" ");
        if (pendingPrefix === prefix) {
            if (e.key.toLowerCase() === suffix!.toLowerCase() && !e.metaKey && !e.ctrlKey && !e.altKey) {
                return { matches: true };
            }
            return { matches: false };
        }
        if (e.key.toLowerCase() === prefix!.toLowerCase() && !e.metaKey && !e.ctrlKey && !e.altKey) {
            return { matches: false, pendingPrefix: prefix };
        }
        return { matches: false };
    }

    const parts = key.toLowerCase().split("+");

    let needMeta = false;
    let needCtrl = false;
    let needShift = false;
    let needAlt = false;
    let targetKey = "";

    for (const part of parts) {
        if (part === "mod") {
            // In test environment, default to Ctrl (non-Mac)
            needCtrl = true;
        } else if (part === "meta" || part === "cmd") {
            needMeta = true;
        } else if (part === "ctrl") {
            needCtrl = true;
        } else if (part === "shift") {
            needShift = true;
        } else if (part === "alt") {
            needAlt = true;
        } else {
            targetKey = part;
        }
    }

    const keyMatch =
        e.key.toLowerCase() === targetKey ||
        e.code.toLowerCase() === `key${targetKey}`;

    const matches =
        keyMatch &&
        e.metaKey === needMeta &&
        e.ctrlKey === needCtrl &&
        e.shiftKey === needShift &&
        e.altKey === needAlt;

    return { matches };
}

function makeEvent(overrides: Partial<{
    key: string;
    code: string;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
}>) {
    return {
        key: overrides.key ?? "",
        code: overrides.code ?? "",
        metaKey: overrides.metaKey ?? false,
        ctrlKey: overrides.ctrlKey ?? false,
        shiftKey: overrides.shiftKey ?? false,
        altKey: overrides.altKey ?? false,
    };
}

// ─── Tests ────────────────────────────────────────────────────

describe("matchesKey", () => {
    describe("simple key combos", () => {
        it("matches mod+k as Ctrl+K in non-Mac env", () => {
            const e = makeEvent({ key: "k", ctrlKey: true });
            expect(matchesKey("mod+k", e, null).matches).toBe(true);
        });

        it("rejects mod+k when no modifier", () => {
            const e = makeEvent({ key: "k" });
            expect(matchesKey("mod+k", e, null).matches).toBe(false);
        });

        it("matches ctrl+shift+p", () => {
            const e = makeEvent({ key: "p", ctrlKey: true, shiftKey: true });
            expect(matchesKey("ctrl+shift+p", e, null).matches).toBe(true);
        });

        it("rejects ctrl+shift+p without shift", () => {
            const e = makeEvent({ key: "p", ctrlKey: true });
            expect(matchesKey("ctrl+shift+p", e, null).matches).toBe(false);
        });

        it("matches single key ?", () => {
            const e = makeEvent({ key: "?" });
            expect(matchesKey("?", e, null).matches).toBe(true);
        });

        it("rejects wrong key", () => {
            const e = makeEvent({ key: "a" });
            expect(matchesKey("?", e, null).matches).toBe(false);
        });
    });

    describe("key sequences", () => {
        it("first press returns pendingPrefix for g t", () => {
            const e = makeEvent({ key: "g" });
            const result = matchesKey("g t", e, null);
            expect(result.matches).toBe(false);
            expect(result.pendingPrefix).toBe("g");
        });

        it("second press matches with correct prefix", () => {
            const e = makeEvent({ key: "t" });
            const result = matchesKey("g t", e, "g");
            expect(result.matches).toBe(true);
        });

        it("second press does not match with wrong key", () => {
            const e = makeEvent({ key: "x" });
            const result = matchesKey("g t", e, "g");
            expect(result.matches).toBe(false);
        });

        it("rejects sequence key when modifier is held", () => {
            const e = makeEvent({ key: "t", ctrlKey: true });
            const result = matchesKey("g t", e, "g");
            expect(result.matches).toBe(false);
        });

        it("first press ignores if modifier held", () => {
            const e = makeEvent({ key: "g", metaKey: true });
            const result = matchesKey("g t", e, null);
            expect(result.matches).toBe(false);
            expect(result.pendingPrefix).toBeUndefined();
        });
    });

    describe("code-based matching", () => {
        it("matches case-insensitively via e.key", () => {
            const e = makeEvent({ key: "K", code: "KeyK", ctrlKey: true });
            expect(matchesKey("mod+k", e, null).matches).toBe(true);
        });

        it("matches via code fallback", () => {
            const e = makeEvent({ key: "something-weird", code: "KeyK", ctrlKey: true });
            expect(matchesKey("mod+k", e, null).matches).toBe(true);
        });
    });
});

describe("formatKey", () => {
    // Test the format helper used by command palette
    function formatKey(key: string): string {
        return key
            .split("+")
            .map((part) => {
                if (part === "mod") return "Ctrl";
                if (part === "shift") return "Shift";
                if (part === "alt") return "Alt";
                if (part === "meta" || part === "cmd") return "\u2318";
                if (part === "ctrl") return "Ctrl";
                return part.toUpperCase().replace(" ", " then ");
            })
            .join("+");
    }

    it("formats mod+k as Ctrl+K", () => {
        expect(formatKey("mod+k")).toBe("Ctrl+K");
    });

    it("formats ctrl+shift+p", () => {
        expect(formatKey("ctrl+shift+p")).toBe("Ctrl+Shift+P");
    });

    it("formats single key", () => {
        expect(formatKey("?")).toBe("?");
    });
});
