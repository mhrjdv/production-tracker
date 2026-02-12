import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  images: {
    localPatterns: [{ pathname: "/images/**" }],
  },
};

export default nextConfig;
