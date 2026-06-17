import "server-only";

// Football data access via Bzzoiro (no daily cap, rich data). When it isn't
// configured, the data layer falls back to mock fixtures.

import type { Fixture } from "@/lib/domain/types";
import { isBzzoiroConfigured } from "@/lib/bzzoiro/env";
import * as bzzoiro from "@/lib/bzzoiro/fixtures";
import {
  fetchScorers as fetchScorersExtra,
  type MatchScorers,
} from "@/lib/bzzoiro/match-extras";

export function isSportsApiConfigured(): boolean {
  return isBzzoiroConfigured();
}

export function fetchFixturesByDate(date?: string): Promise<Fixture[]> {
  return bzzoiro.fetchFixturesByDate(date);
}

export function fetchFixturesByRange(
  from: string,
  to: string,
): Promise<Fixture[]> {
  return bzzoiro.fetchFixturesByRange(from, to);
}

export function fetchFixtureById(id: number): Promise<Fixture | null> {
  return bzzoiro.fetchFixtureById(id);
}

/** Real scorers (ids + names, own goals excluded) — for settling/display. */
export function fetchScorers(id: number): Promise<MatchScorers> {
  return fetchScorersExtra(id);
}
