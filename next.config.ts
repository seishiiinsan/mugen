import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // API-Football serves team/league crests from this host.
    remotePatterns: [{ protocol: "https", hostname: "media.api-sports.io" }],
  },
};

export default nextConfig;
