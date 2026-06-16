import "server-only";

import type { Fixture, FixtureStatus } from "@/lib/domain/types";
import { bzzoiroGet, bzzoiroList } from "./client";
import { bzzoiroImage } from "./env";

/** Raw event ("match") from /api/v2/events/. Only the fields we map. */
interface RawEvent {
  id: number;
  league_id: number | null;
  home_team_id: number | null;
  home_team: string;
  away_team_id: number | null;
  away_team: string;
  venue_id: number | null;
  event_date: string;
  status: string;
  current_minute: number | null;
  home_score: number | null;
  away_score: number | null;
}

interface RawLeague {
  id: number;
  name: string;
}

/** Bzzoiro status → our domain FixtureStatus. Unknown ⇒ upcoming. */
const STATUS_MAP: Record<string, FixtureStatus> = {
  notstarted: "upcoming",
  inprogress: "live",
  "1st_half": "live",
  "2nd_half": "live",
  halftime: "live",
  extratime: "live",
  extra_time: "live",
  penalties: "live",
  finished: "finished",
  FT: "finished",
  aet: "finished",
  postponed: "postponed",
  suspended: "postponed",
  cancelled: "cancelled",
};

function mapStatus(s: string): FixtureStatus {
  return STATUS_MAP[s] ?? "upcoming";
}

// League names aren't embedded in events (only `league_id`); fetch the league
// list once and memoize the id → name map for the server's lifetime.
let leagueNamesPromise: Promise<Map<number, string>> | null = null;

function leagueNames(): Promise<Map<number, string>> {
  if (!leagueNamesPromise) {
    leagueNamesPromise = bzzoiroList<RawLeague>("/api/v2/leagues/", { limit: 200 }, 86_400)
      .then((rows) => new Map(rows.map((l) => [l.id, l.name])))
      .catch(() => new Map<number, string>());
  }
  return leagueNamesPromise;
}

function mapEvent(e: RawEvent, names: Map<number, string>): Fixture {
  return {
    id: e.id,
    league: {
      id: e.league_id ?? 0,
      name: (e.league_id != null && names.get(e.league_id)) || "—",
      logoUrl: e.league_id != null ? bzzoiroImage("league", e.league_id) : undefined,
    },
    home: {
      id: e.home_team_id ?? 0,
      name: e.home_team,
      logoUrl: e.home_team_id != null ? bzzoiroImage("team", e.home_team_id) : undefined,
    },
    away: {
      id: e.away_team_id ?? 0,
      name: e.away_team,
      logoUrl: e.away_team_id != null ? bzzoiroImage("team", e.away_team_id) : undefined,
    },
    venue: undefined,
    kickoff: e.event_date,
    status: mapStatus(e.status),
    elapsed: e.current_minute ?? undefined,
    score:
      e.home_score != null && e.away_score != null
        ? { home: e.home_score, away: e.away_score }
        : null,
  };
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Fixtures for a given day (defaults to today, UTC). */
export async function fetchFixturesByDate(date = todayUtc()): Promise<Fixture[]> {
  const [events, names] = await Promise.all([
    bzzoiroList<RawEvent>(
      "/api/v2/events/",
      { date_from: date, date_to: date, limit: 200 },
      60,
    ),
    leagueNames(),
  ]);
  return events.map((e) => mapEvent(e, names));
}

/** Fixtures over an inclusive date range (YYYY-MM-DD), paginated. */
export async function fetchFixturesByRange(
  from: string,
  to: string,
): Promise<Fixture[]> {
  const names = await leagueNames();
  const out: Fixture[] = [];
  const LIMIT = 200;
  for (let offset = 0; offset < 1000; offset += LIMIT) {
    const events = await bzzoiroList<RawEvent>(
      "/api/v2/events/",
      { date_from: from, date_to: to, limit: LIMIT, offset },
      300,
    );
    for (const e of events) out.push(mapEvent(e, names));
    if (events.length < LIMIT) break;
  }
  return out;
}

/** A single fixture by event id (short cache for live freshness). */
export async function fetchFixtureById(id: number): Promise<Fixture | null> {
  const [event, names] = await Promise.all([
    bzzoiroGet<RawEvent | null>(`/api/v2/events/${id}/`, {}, 20),
    leagueNames(),
  ]);
  return event ? mapEvent(event, names) : null;
}
