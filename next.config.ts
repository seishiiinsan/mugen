import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Crests/badges from the Bzzoiro image proxy.
      { protocol: "https", hostname: "sports.bzzoiro.com", pathname: "/img/**" },
      // Google profile photos (avatar_url from OAuth).
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Uploaded avatars in Supabase Storage.
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
