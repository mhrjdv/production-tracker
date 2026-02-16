import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  staticPageGenerationTimeout: 300,
  images: {
    localPatterns: [{ pathname: "/images/**" }],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-15baef71f1364d1e867fa9a59fcb3717.r2.dev",
      },
      // AI platform image hosts captured by Chrome extension
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "oaiusercontent.com" },
      {
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net",
      },
      { protocol: "https", hostname: "cdn.midjourney.com" },
      { protocol: "https", hostname: "replicate.delivery" },
      { protocol: "https", hostname: "pbxt.replicate.delivery" },
      { protocol: "https", hostname: "fal.media" },
      { protocol: "https", hostname: "img.freepik.com" },
      { protocol: "https", hostname: "placehold.co" },
    ],
    qualities: [50, 60, 70, 75, 80],
    minimumCacheTTL: 3600,
    deviceSizes: [640, 750, 1080, 1920],
    imageSizes: [64, 128, 256],
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
