import "server-only";

// Provider-agnostic football data access. Prefers Bzzoiro (no daily cap, richer
// data) when configured, else falls back to API-Football, else neither (mock).

import type { Fixture } from "@/lib/domain/types";
import { isBzzoiroConfigured } from "@/lib/bzzoiro/env";
import { isApiFootballConfigured } from "@/lib/api-football/env";
import * as bzzoiro from "@/lib/bzzoiro/fixtures";
import * as apiFootball from "@/lib/api-football/fixtures";

export function isSportsApiConfigured(): boolean {
  return isBzzoiroConfigured() || isApiFootballConfigured();
}

export function fetchFixturesByDate(date?: string): Promise<Fixture[]> {
  return isBzzoiroConfigured()
    ? bzzoiro.fetchFixturesByDate(date)
    : apiFootball.fetchFixturesByDate(date);
}

export function fetchFixtureById(id: number): Promise<Fixture | null> {
  return isBzzoiroConfigured()
    ? bzzoiro.fetchFixtureById(id)
    : apiFootball.fetchFixtureById(id);
}
