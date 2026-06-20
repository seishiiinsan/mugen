/**
 * Canonical site origin, used for metadata (metadataBase / OpenGraph), the
 * sitemap and robots. Netlify injects `URL` (the site's primary URL) at build
 * and runtime; set `NEXT_PUBLIC_SITE_URL` to force a specific canonical host.
 * Falls back to localhost for local dev. No trailing slash.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");
