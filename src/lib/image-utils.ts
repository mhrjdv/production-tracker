/**
 * Hostnames allowed in next.config.ts remotePatterns.
 * Kept for reference — these are the hosts we accept images from.
 * We no longer route through the Next.js optimization proxy because:
 * - All hosts are already CDN-backed (R2, Google, OpenAI, MJ, etc.)
 * - Original assets can be 5-33MB PNGs that timeout the 7s proxy limit
 * - Direct CDN delivery is faster than double-proxying through /_next/image
 */
const ALLOWED_HOSTS = new Set([
  "pub-15baef71f1364d1e867fa9a59fcb3717.r2.dev",
  "lh3.googleusercontent.com",
  "storage.googleapis.com",
  "oaiusercontent.com",
  "oaidalleapiprodscus.blob.core.windows.net",
  "cdn.midjourney.com",
  "replicate.delivery",
  "pbxt.replicate.delivery",
  "fal.media",
  "img.freepik.com",
  "placehold.co",
]);

/**
 * Returns true if the URL hostname is in our allowlist.
 */
export function isAllowedImageHost(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

/** @deprecated Use isAllowedImageHost instead */
export const isOptimizableImageUrl = isAllowedImageHost;

/**
 * Always returns true — skip Next.js image optimization for all external images.
 *
 * Rationale: All image sources are already CDN-hosted. Routing through
 * the Next.js /_next/image proxy adds latency and a 7s timeout that
 * causes 500 errors on large assets (5-33MB originals from R2, platform captures).
 * Direct CDN delivery is both faster and more reliable.
 */
export function shouldSkipOptimization(
  _imgSrc?: string | null,
  _hasThumbnail?: boolean,
): boolean {
  return true;
}
