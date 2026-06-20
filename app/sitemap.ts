import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Public, crawlable pages only. The app sections (/matchs, /amis, /profil…)
// require auth and redirect to /login, so they are deliberately excluded.
const PUBLIC_PATHS = [
  "",
  "/changelog",
  "/wiki",
  "/mentions-legales",
  "/confidentialite",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path || "/"}`,
    lastModified,
    changeFrequency: path === "" || path === "/changelog" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
