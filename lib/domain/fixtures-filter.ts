// Shared fixture-list filter, kept in one place so the matches list and the
// match detail page's prev/next navigation always agree on what "filtered"
// means — duplicating this logic was the bug (detail page didn't know about
// the active league/status/search filter).

import type { Fixture } from "./types";

export interface FixtureFilters {
  status: string;
  league: string;
  q: string;
}

export function filterFixtures(
  all: Fixture[],
  { status, league, q }: FixtureFilters,
): Fixture[] {
  const needle = q.trim().toLowerCase();
  return all.filter((f) => {
    if ((status === "live" || status === "upcoming") && f.status !== status)
      return false;
    if (league && String(f.league.id) !== league) return false;
    if (
      needle &&
      !f.home.name.toLowerCase().includes(needle) &&
      !f.away.name.toLowerCase().includes(needle) &&
      !f.league.name.toLowerCase().includes(needle)
    )
      return false;
    return true;
  });
}

/** Builds the `?status=&league=&q=` query string for the active filters (empty string if none). */
export function fixtureFiltersQuery({ status, league, q }: FixtureFilters): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (league) params.set("league", league);
  if (q) params.set("q", q);
  return params.toString();
}
