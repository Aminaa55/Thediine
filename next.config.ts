import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Product photos will be uploaded to cloud storage later; add the host here.
  images: { remotePatterns: [] },
};

export default nextConfig;
