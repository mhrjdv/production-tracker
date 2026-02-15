/* ==========================================================
   Utils – Pure utility functions (no side effects)
   ========================================================== */

export function normalizeTags(raw) {
  const seen = new Set();
  const tags = [];
  String(raw || "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .forEach((t) => {
      if (!seen.has(t)) {
        seen.add(t);
        tags.push(t);
      }
    });
  return tags;
}

export function parseMetadata(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return undefined;
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Metadata JSON must be an object.");
  }
  return parsed;
}

export function formatRelativeTime(isoString) {
  if (!isoString) return "";
  const then = new Date(isoString).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function placeholderThumb() {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='36'%3E%3Crect width='48' height='36' fill='%230d1319'/%3E%3C/svg%3E";
}
