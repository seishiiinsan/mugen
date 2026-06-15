import "server-only";

// Enriched match data from Bzzoiro v2 sub-resources (lineups / stats / h2h).
// These endpoints aren't typed in the OpenAPI schema, so the shapes below come
// from the live responses. Everything degrades to null/empty on error.

import { bzzoiroGet } from "./client";
import { isBzzoiroConfigured } from "./env";

export interface LineupPlayer {
  name: string;
  shortName: string;
  position: string;
  jersey: number | null;
}

export interface TeamLineup {
  teamName: string;
  formation: string;
  players: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface Lineups {
  /** e.g. "predicted" | "confirmed". */
  status: string;
  predicted: boolean;
  home: TeamLineup | null;
  away: TeamLineup | null;
}

export interface StatPair {
  label: string;
  home: number;
  away: number;
}

export interface HeadToHead {
  total: number;
  homeWins: number;
  draws: number;
  awayWins: number;
}

export interface MatchExtras {
  lineups: Lineups | null;
  stats: StatPair[];
  h2h: HeadToHead | null;
}

// --- Raw shapes (from live responses) ------------------------------------

interface RawPlayer {
  name: string;
  short_name: string;
  position: string;
  jersey_number?: number | null;
}
interface RawSide {
  team_name: string;
  formation: string;
  players?: RawPlayer[];
  substitutes?: RawPlayer[];
}
interface RawLineups {
  lineup_status?: string;
  beta?: boolean;
  lineups?: { home?: RawSide | null; away?: RawSide | null } | null;
}
interface RawStats {
  stats?: {
    home?: Record<string, unknown>;
    away?: Record<string, unknown>;
  } | null;
}
interface RawH2H {
  total_matches?: number;
  home_wins?: number;
  draws?: number;
  away_wins?: number;
}

// Curated, always-scalar stats worth showing, in display order.
const STAT_LABELS: { key: string; label: string }[] = [
  { key: "total_shots", label: "Tirs" },
  { key: "shots_on_target", label: "Tirs cadrés" },
  { key: "big_chances", label: "Grosses occasions" },
  { key: "corner_kicks", label: "Corners" },
  { key: "fouls", label: "Fautes" },
  { key: "yellow_cards", label: "Cartons jaunes" },
  { key: "passes", label: "Passes" },
];

function mapPlayer(p: RawPlayer): LineupPlayer {
  return {
    name: p.name,
    shortName: p.short_name || p.name,
    position: p.position,
    jersey: p.jersey_number ?? null,
  };
}

function mapSide(s: RawSide | null | undefined): TeamLineup | null {
  if (!s) return null;
  return {
    teamName: s.team_name,
    formation: s.formation,
    players: (s.players ?? []).map(mapPlayer),
    substitutes: (s.substitutes ?? []).map(mapPlayer),
  };
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

async function fetchLineups(id: number): Promise<Lineups | null> {
  const raw = await bzzoiroGet<RawLineups>(`/api/v2/events/${id}/lineups/`, {}, 300);
  const home = mapSide(raw.lineups?.home);
  const away = mapSide(raw.lineups?.away);
  if (!home && !away) return null;
  return {
    status: raw.lineup_status ?? "",
    predicted: Boolean(raw.beta) || raw.lineup_status === "predicted",
    home,
    away,
  };
}

async function fetchStats(id: number): Promise<StatPair[]> {
  const raw = await bzzoiroGet<RawStats>(`/api/v2/events/${id}/stats/`, {}, 60);
  const home = raw.stats?.home ?? {};
  const away = raw.stats?.away ?? {};
  const pairs: StatPair[] = [];
  for (const { key, label } of STAT_LABELS) {
    const h = home[key];
    const a = away[key];
    if (typeof h === "number" && typeof a === "number") {
      pairs.push({ label, home: h, away: a });
    }
  }
  return pairs;
}

async function fetchH2H(id: number): Promise<HeadToHead | null> {
  const raw = await bzzoiroGet<RawH2H>(`/api/v2/events/${id}/h2h/`, {}, 3600);
  if (typeof raw.total_matches !== "number") return null;
  return {
    total: raw.total_matches,
    homeWins: raw.home_wins ?? 0,
    draws: raw.draws ?? 0,
    awayWins: raw.away_wins ?? 0,
  };
}

/** Fetch all match extras in parallel; each degrades independently. */
export async function fetchMatchExtras(id: number): Promise<MatchExtras> {
  if (!isBzzoiroConfigured()) {
    return { lineups: null, stats: [], h2h: null };
  }
  const [lineups, stats, h2h] = await Promise.all([
    safe(() => fetchLineups(id)),
    safe(() => fetchStats(id)),
    safe(() => fetchH2H(id)),
  ]);
  return { lineups, stats: stats ?? [], h2h };
}
