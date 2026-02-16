import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  images: {
    localPatterns: [{ pathname: "/images/**" }],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-15baef71f1364d1e867fa9a59fcb3717.r2.dev",
      },
    ],
    minimumCacheTTL: 3600,
    deviceSizes: [640, 750, 1080, 1920],
    imageSizes: [64, 128, 256],
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
