export function isPrismaSchemaMismatchError(error: unknown): boolean {
    const code = (error as { code?: string } | null)?.code;
    if (code === "P2021" || code === "P2022") {
        return true;
    }

    const message =
        typeof error === "object" && error && "message" in error
            ? String((error as { message?: unknown }).message || "")
            : String(error || "");

    const normalized = message.toLowerCase();
    return (
        normalized.includes("does not exist in the current database") ||
        normalized.includes("column") && normalized.includes("does not exist") ||
        normalized.includes("table") && normalized.includes("does not exist")
    );
}
