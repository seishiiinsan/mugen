// API-Football (api-sports.io direct access) configuration.
// Server-only: the key must never reach the client.

export const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
export const API_FOOTBALL_HOST =
  process.env.API_FOOTBALL_HOST ?? "v3.football.api-sports.io";

export function isApiFootballConfigured(): boolean {
  return Boolean(API_FOOTBALL_KEY);
}
