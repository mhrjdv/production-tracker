"use client";

import { useEffect, useCallback } from "react";

export interface KeyBinding {
    /** Key combo, e.g. "mod+k", "mod+shift+p", "g t" */
    key: string;
    /** Human label for display */
    label: string;
    /** Action to perform */
    action: () => void;
    /** Group for command palette */
    group?: string;
    /** Whether this shortcut is enabled */
    enabled?: boolean;
}

/**
 * Parse a key string like "mod+k" or "mod+shift+p" into a predicate
 * that checks if a KeyboardEvent matches.
 *
 * "mod" = Cmd on Mac, Ctrl elsewhere.
 * Supports sequences like "g t" (press g then t within 500ms).
 */
function matchesKey(
    key: string,
    e: KeyboardEvent,
    pendingPrefix: string | null,
): { matches: boolean; pendingPrefix?: string } {
    // Sequence like "g t"
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
    const isMac = typeof navigator !== "undefined" && navigator.platform.startsWith("Mac");

    let needMeta = false;
    let needCtrl = false;
    let needShift = false;
    let needAlt = false;
    let targetKey = "";

    for (const part of parts) {
        if (part === "mod") {
            if (isMac) needMeta = true;
            else needCtrl = true;
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

/**
 * Register global keyboard shortcuts. Returns a cleanup function.
 *
 * Usage:
 * ```ts
 * useKeyboardShortcuts([
 *   { key: "mod+k", label: "Open command palette", action: () => setOpen(true) },
 *   { key: "g t", label: "Go to timeline", action: () => router.push("/timeline") },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(bindings: KeyBinding[]) {
    const handler = useCallback(
        (() => {
            let pendingPrefix: string | null = null;
            let timeout: ReturnType<typeof setTimeout> | null = null;

            return (e: KeyboardEvent) => {
                // Skip when focus is in an input/textarea/contenteditable
                const tag = (e.target as HTMLElement)?.tagName;
                if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
                if ((e.target as HTMLElement)?.isContentEditable) return;

                for (const binding of bindings) {
                    if (binding.enabled === false) continue;

                    const result = matchesKey(binding.key, e, pendingPrefix);

                    if (result.pendingPrefix) {
                        pendingPrefix = result.pendingPrefix;
                        if (timeout) clearTimeout(timeout);
                        timeout = setTimeout(() => {
                            pendingPrefix = null;
                        }, 500);
                        return;
                    }

                    if (result.matches) {
                        e.preventDefault();
                        e.stopPropagation();
                        pendingPrefix = null;
                        if (timeout) clearTimeout(timeout);
                        binding.action();
                        return;
                    }
                }

                // No match — clear pending prefix
                if (pendingPrefix && !e.metaKey && !e.ctrlKey && !e.altKey) {
                    pendingPrefix = null;
                    if (timeout) clearTimeout(timeout);
                }
            };
        })(),
        [bindings],
    );

    useEffect(() => {
        document.addEventListener("keydown", handler, true);
        return () => document.removeEventListener("keydown", handler, true);
    }, [handler]);
}
