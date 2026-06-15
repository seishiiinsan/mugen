// Bzzoiro Sports Data API configuration.
// Server-only: the token must never reach the client.

export const BZZOIRO_BASE = "https://sports.bzzoiro.com";
export const BZZOIRO_API_KEY = process.env.BZZOIRO_API_KEY;

export function isBzzoiroConfigured(): boolean {
  return Boolean(BZZOIRO_API_KEY);
}

/** Public image proxy (no auth) — club crests, league badges, etc. */
export function bzzoiroImage(
  type: "team" | "league" | "player" | "manager" | "venue",
  id: number,
): string {
  return `${BZZOIRO_BASE}/img/${type}/${id}/`;
}
