import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Crest/badge hosts: API-Football and the Bzzoiro image proxy.
    remotePatterns: [
      { protocol: "https", hostname: "media.api-sports.io" },
      { protocol: "https", hostname: "sports.bzzoiro.com", pathname: "/img/**" },
    ],
  },
};

export default nextConfig;
