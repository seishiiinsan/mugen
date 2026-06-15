import "server-only";

import type { Fixture, FixtureStatus } from "@/lib/domain/types";
import { apiFootballGet } from "./client";

// ---- Raw API-Football v3 /fixtures item (only the fields we use) -----------
interface RawFixture {
  fixture: {
    id: number;
    date: string; // ISO with offset
    venue: { name: string | null; city: string | null };
    status: { short: string; elapsed: number | null };
  };
  league: { id: number; name: string; country: string; logo: string | null };
  teams: {
    home: { id: number; name: string; logo: string | null };
    away: { id: number; name: string; logo: string | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    fulltime: { home: number | null; away: number | null };
  };
}

// API-Football status short codes → our domain status.
const LIVE = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);
const FINISHED = new Set(["FT", "AET", "PEN"]);
const CANCELLED = new Set(["CANC", "ABD", "AWD", "WO"]);

function mapStatus(short: string): FixtureStatus {
  if (LIVE.has(short)) return "live";
  if (FINISHED.has(short)) return "finished";
  if (CANCELLED.has(short)) return "cancelled";
  if (short === "PST") return "postponed";
  return "upcoming"; // NS, TBD
}

function mapFixture(raw: RawFixture): Fixture {
  const status = mapStatus(raw.fixture.status.short);

  // Reference score is 90 min only (§2.4): use fulltime for finished matches
  // (excludes extra time / penalties), live current goals while in play.
  let score: Fixture["score"] = null;
  if (status === "finished") {
    const { home, away } = raw.score.fulltime;
    if (home != null && away != null) score = { home, away };
  } else if (status === "live") {
    const { home, away } = raw.goals;
    if (home != null && away != null) score = { home, away };
  }

  return {
    id: raw.fixture.id,
    league: {
      id: raw.league.id,
      name: raw.league.name,
      country: raw.league.country,
      logoUrl: raw.league.logo ?? undefined,
    },
    home: {
      id: raw.teams.home.id,
      name: raw.teams.home.name,
      logoUrl: raw.teams.home.logo ?? undefined,
    },
    away: {
      id: raw.teams.away.id,
      name: raw.teams.away.name,
      logoUrl: raw.teams.away.logo ?? undefined,
    },
    venue: raw.fixture.venue.name ?? undefined,
    kickoff: raw.fixture.date,
    status,
    elapsed: raw.fixture.status.elapsed ?? undefined,
    score,
  };
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Fixtures for a given day (defaults to today, UTC). */
export async function fetchFixturesByDate(date = todayUtc()): Promise<Fixture[]> {
  const raw = await apiFootballGet<RawFixture>(
    "fixtures",
    { date, timezone: "UTC" },
    60,
  );
  return raw.map(mapFixture);
}

/** A single fixture by its API-Football id (short cache for live freshness). */
export async function fetchFixtureById(id: number): Promise<Fixture | null> {
  const raw = await apiFootballGet<RawFixture>("fixtures", { id }, 20);
  return raw[0] ? mapFixture(raw[0]) : null;
}
