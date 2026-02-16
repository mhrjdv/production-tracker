/**
 * Hostnames allowed in next.config.ts remotePatterns.
 * next/image can only optimize images from these hosts.
 * For any other host, use `unoptimized` on the Image component.
 */
const OPTIMIZABLE_HOSTS = new Set([
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
 * Returns true if the URL hostname is in next.config.ts remotePatterns,
 * meaning next/image can optimize it. Returns false for unknown hosts
 * or invalid URLs — use `unoptimized` prop for those.
 */
export function isOptimizableImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return OPTIMIZABLE_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

/**
 * Determines if an asset image should skip next/image optimization.
 * Returns true (unoptimized) when:
 * - The URL host is not in remotePatterns, OR
 * - The image has no thumbnail (original uploads can be 5-33MB and
 *   cause TimeoutError in the optimization proxy)
 */
export function shouldSkipOptimization(
  imgSrc: string | null | undefined,
  hasThumbnail: boolean,
): boolean {
  if (!imgSrc) return true;
  if (!isOptimizableImageUrl(imgSrc)) return true;
  if (!hasThumbnail) return true;
  return false;
}
