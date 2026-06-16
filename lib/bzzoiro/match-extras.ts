import "server-only";

// Enriched match data from Bzzoiro v2 sub-resources (lineups / stats / h2h).
// These endpoints aren't typed in the OpenAPI schema, so the shapes below come
// from the live responses. Everything degrades to null/empty on error.

import { bzzoiroGet } from "./client";
import { isBzzoiroConfigured } from "./env";

export interface LineupPlayer {
  id: number | null;
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

export interface Incident {
  kind: "goal" | "card";
  minute: number;
  addedTime: number | null;
  player: string;
  /** Resolvable via /api/v2/players/{id}/ (incident id space). */
  playerId: number | null;
  isHome: boolean;
  /** Goal: assist or special type. Card: "yellow" | "red". */
  detail: string;
}

export interface StandingRow {
  position: number;
  team: string;
  teamId: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gd: number;
  pts: number;
  /** True for one of the two teams in the current match. */
  highlight: boolean;
}

export interface StandingsGroup {
  name: string | null;
  rows: StandingRow[];
}

export interface MatchExtras {
  lineups: Lineups | null;
  stats: StatPair[];
  h2h: HeadToHead | null;
  incidents: Incident[];
  standings: StandingsGroup[] | null;
}

// --- Raw shapes (from live responses) ------------------------------------

interface RawPlayer {
  id?: number | null;
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
interface RawIncident {
  type: string;
  minute: number;
  added_time?: number | null;
  player?: string;
  player_id?: number | null;
  assist?: string | null;
  is_home?: boolean;
  card_type?: string;
  goal_type?: string;
}
interface RawStandingRow {
  position: number;
  team_id: number;
  team_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gd: number;
  pts: number;
}
interface RawStandings {
  groups?: Record<string, RawStandingRow[]> | null;
  standings?: RawStandingRow[] | null;
}

// Curated, always-scalar stats worth showing, in display order.
const STAT_LABELS: { key: string; label: string }[] = [
  { key: "ball_possession", label: "Possession (%)" },
  { key: "expected_goals", label: "Buts attendus (xG)" },
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
    id: p.id ?? null,
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

async function fetchIncidents(id: number): Promise<Incident[]> {
  const raw = await bzzoiroGet<{ incidents?: RawIncident[] }>(
    `/api/v2/events/${id}/incidents/`,
    {},
    60,
  );
  return (raw.incidents ?? [])
    .filter((i) => i.type === "goal" || i.type === "card")
    .map((i) => ({
      kind: i.type === "goal" ? ("goal" as const) : ("card" as const),
      minute: i.minute,
      addedTime: i.added_time ?? null,
      player: i.player ?? "",
      playerId: i.player_id ?? null,
      isHome: Boolean(i.is_home),
      detail:
        i.type === "goal"
          ? i.assist
            ? `passe ${i.assist}`
            : i.goal_type && i.goal_type !== "regular"
              ? i.goal_type
              : ""
          : (i.card_type ?? "yellow"),
    }))
    .sort((a, b) => a.minute - b.minute || (a.addedTime ?? 0) - (b.addedTime ?? 0));
}

/**
 * Player ids that scored a real goal in a match (own goals excluded), for
 * settling goalscorer predictions. Empty on error or if no scorer ids are
 * available.
 */
export async function fetchScorerPlayerIds(id: number): Promise<number[]> {
  if (!isBzzoiroConfigured()) return [];
  try {
    const raw = await bzzoiroGet<{ incidents?: RawIncident[] }>(
      `/api/v2/events/${id}/incidents/`,
      {},
      60,
    );
    const ids = (raw.incidents ?? [])
      .filter(
        (i) =>
          i.type === "goal" &&
          i.goal_type !== "ownGoal" &&
          typeof i.player_id === "number",
      )
      .map((i) => i.player_id as number);
    return [...new Set(ids)];
  } catch {
    return [];
  }
}

async function fetchStandings(
  leagueId: number,
  homeTeamId?: number,
  awayTeamId?: number,
): Promise<StandingsGroup[] | null> {
  const raw = await bzzoiroGet<RawStandings>(
    `/api/v2/leagues/${leagueId}/standings/`,
    {},
    3600,
  );
  const highlightIds = new Set(
    [homeTeamId, awayTeamId].filter((x): x is number => typeof x === "number"),
  );
  const mapRow = (r: RawStandingRow): StandingRow => ({
    position: r.position,
    team: r.team_name,
    teamId: r.team_id,
    played: r.played,
    won: r.won,
    drawn: r.drawn,
    lost: r.lost,
    gd: r.gd,
    pts: r.pts,
    highlight: highlightIds.has(r.team_id),
  });

  let groups: StandingsGroup[];
  if (raw.groups) {
    groups = Object.entries(raw.groups).map(([name, rows]) => ({
      name,
      rows: rows.map(mapRow),
    }));
    // Prefer the group(s) featuring one of the two teams.
    const relevant = groups.filter((g) => g.rows.some((r) => r.highlight));
    if (relevant.length) groups = relevant;
  } else if (raw.standings) {
    groups = [{ name: null, rows: raw.standings.map(mapRow) }];
  } else {
    return null;
  }
  return groups.length ? groups : null;
}

/** Fetch all match extras in parallel; each degrades independently. */
export async function fetchMatchExtras(
  id: number,
  opts: { leagueId?: number; homeTeamId?: number; awayTeamId?: number } = {},
): Promise<MatchExtras> {
  if (!isBzzoiroConfigured()) {
    return { lineups: null, stats: [], h2h: null, incidents: [], standings: null };
  }
  const [lineups, stats, h2h, incidents, standings] = await Promise.all([
    safe(() => fetchLineups(id)),
    safe(() => fetchStats(id)),
    safe(() => fetchH2H(id)),
    safe(() => fetchIncidents(id)),
    opts.leagueId
      ? safe(() => fetchStandings(opts.leagueId!, opts.homeTeamId, opts.awayTeamId))
      : Promise.resolve(null),
  ]);
  return {
    lineups,
    stats: stats ?? [],
    h2h,
    incidents: incidents ?? [],
    standings: standings ?? null,
  };
}
