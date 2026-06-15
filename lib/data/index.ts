// Data-access layer (DAL).
//
// Pages and Server Actions import from here only — never from the mock directly.
// Today these are backed by the in-memory mock; swapping each function for a
// Supabase query or an API-Football fetch later requires no changes to the UI.
//
// All functions are async on purpose, to match the real (networked) shape and
// keep call sites stable across the migration.

import "server-only";

import {
  CURRENT_USER,
  MOCK_FIXTURES,
  MOCK_LEADERBOARD,
  MOCK_PREDICTIONS,
} from "@/lib/mock/fixtures";
import type {
  Fixture,
  FixtureStatus,
  LeaderboardEntry,
  Prediction,
  UserProfile,
} from "@/lib/domain/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isApiFootballConfigured } from "@/lib/api-football/env";
import {
  fetchFixtureById,
  fetchFixturesByDate,
} from "@/lib/api-football/fixtures";

/** A row from the `predictions` table. */
interface PredictionRow {
  fixture_id: number;
  home_goals: number;
  away_goals: number;
  points: number | null;
  updated_at: string;
}

function mapPredictionRow(row: PredictionRow, userId: string): Prediction {
  return {
    fixtureId: row.fixture_id,
    userId,
    home: row.home_goals,
    away: row.away_goals,
    points: row.points,
    submittedAt: row.updated_at,
  };
}

/** A row from the `fixtures` cache table. */
interface FixtureRow {
  id: number;
  league_id: number | null;
  league_name: string | null;
  league_logo: string | null;
  home_id: number | null;
  home_team: string;
  home_logo: string | null;
  away_id: number | null;
  away_team: string;
  away_logo: string | null;
  venue: string | null;
  kickoff: string;
  status: string;
  elapsed: number | null;
  home_goals: number | null;
  away_goals: number | null;
}

function mapFixtureRow(row: FixtureRow): Fixture {
  return {
    id: row.id,
    league: {
      id: row.league_id ?? 0,
      name: row.league_name ?? "—",
      logoUrl: row.league_logo ?? undefined,
    },
    home: {
      id: row.home_id ?? 0,
      name: row.home_team,
      logoUrl: row.home_logo ?? undefined,
    },
    away: {
      id: row.away_id ?? 0,
      name: row.away_team,
      logoUrl: row.away_logo ?? undefined,
    },
    venue: row.venue ?? undefined,
    kickoff: row.kickoff,
    status: row.status as FixtureStatus,
    elapsed: row.elapsed ?? undefined,
    score:
      row.home_goals != null && row.away_goals != null
        ? { home: row.home_goals, away: row.away_goals }
        : null,
  };
}

const STATUS_ORDER: Record<Fixture["status"], number> = {
  live: 0,
  upcoming: 1,
  finished: 2,
  postponed: 3,
  cancelled: 4,
};

function sortFixtures(fixtures: Fixture[]): Fixture[] {
  return [...fixtures].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
  });
}

export async function getFixtures(): Promise<Fixture[]> {
  if (isApiFootballConfigured()) {
    return sortFixtures(await fetchFixturesByDate());
  }
  return sortFixtures(MOCK_FIXTURES);
}

export async function getFixture(id: number): Promise<Fixture | null> {
  if (isApiFootballConfigured()) {
    return fetchFixtureById(id);
  }
  return MOCK_FIXTURES.find((f) => f.id === id) ?? null;
}

/** Fixtures from the DB cache (those a user has predicted), by id. */
export async function getFixturesByIds(ids: number[]): Promise<Fixture[]> {
  if (ids.length === 0) return [];
  if (!isSupabaseConfigured()) {
    return MOCK_FIXTURES.filter((f) => ids.includes(f.id));
  }

  const supabase = await createClient();
  const { data } = await supabase.from("fixtures").select("*").in("id", ids);

  return ((data as FixtureRow[] | null) ?? []).map(mapFixtureRow);
}

export async function getMyPredictions(): Promise<Prediction[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_PREDICTIONS.filter((p) => p.userId === CURRENT_USER.id);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("predictions")
    .select("fixture_id, home_goals, away_goals, points, updated_at")
    .eq("user_id", user.id);

  return ((data as PredictionRow[] | null) ?? []).map((row) =>
    mapPredictionRow(row, user.id),
  );
}

export async function getPredictionForFixture(
  fixtureId: number,
): Promise<Prediction | null> {
  if (!isSupabaseConfigured()) {
    return (
      MOCK_PREDICTIONS.find(
        (p) => p.fixtureId === fixtureId && p.userId === CURRENT_USER.id,
      ) ?? null
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("predictions")
    .select("fixture_id, home_goals, away_goals, points, updated_at")
    .eq("user_id", user.id)
    .eq("fixture_id", fixtureId)
    .maybeSingle();

  return data ? mapPredictionRow(data as PredictionRow, user.id) : null;
}

interface LeaderboardRow {
  user_id: string;
  points: number;
  exact_scores: number;
}

interface ProfileRow {
  id: string;
  username: string;
}

/**
 * Full monthly ranking, including players with 0 points: every profile is
 * listed, scored from the `monthly_leaderboard()` RPC, and ranked in JS
 * (standard competition ranking — ties share a rank). This works regardless of
 * whether the RPC itself returns 0-point rows.
 */
async function buildLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const [{ data: scoredData }, { data: profilesData }] = await Promise.all([
    supabase.rpc("monthly_leaderboard", { limit_count: 5000 }),
    supabase.from("profiles").select("id, username"),
  ]);

  const scored = new Map<string, { points: number; exactScores: number }>();
  for (const r of (scoredData as LeaderboardRow[] | null) ?? []) {
    scored.set(r.user_id, {
      points: Number(r.points),
      exactScores: Number(r.exact_scores),
    });
  }

  const entries = ((profilesData as ProfileRow[] | null) ?? []).map((p) => {
    const s = scored.get(p.id);
    return {
      userId: p.id,
      username: p.username,
      points: s?.points ?? 0,
      exactScores: s?.exactScores ?? 0,
    };
  });

  entries.sort(
    (a, b) =>
      b.points - a.points ||
      b.exactScores - a.exactScores ||
      a.username.localeCompare(b.username, "fr"),
  );

  let rank = 0;
  let prevPoints = Number.NaN;
  let prevExact = Number.NaN;
  return entries.map((e, i) => {
    if (i === 0 || e.points !== prevPoints || e.exactScores !== prevExact) {
      rank = i + 1;
      prevPoints = e.points;
      prevExact = e.exactScores;
    }
    return { rank, ...e };
  });
}

export async function getMonthlyLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured()) {
    return [...MOCK_LEADERBOARD].sort((a, b) => a.rank - b.rank);
  }
  return (await buildLeaderboard()).slice(0, 100);
}

export interface MonthlyStats {
  points: number;
  rank: number | null;
  exactScores: number;
}

/** Current user's monthly points, rank and exact-score count. */
export async function getMyMonthlyStats(): Promise<MonthlyStats> {
  if (!isSupabaseConfigured()) {
    return {
      points: CURRENT_USER.monthlyPoints,
      rank: CURRENT_USER.worldRank,
      exactScores: 6,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { points: 0, rank: null, exactScores: 0 };

  const me = (await buildLeaderboard()).find((e) => e.userId === user.id);
  return me
    ? { points: me.points, rank: me.rank, exactScores: me.exactScores }
    : { points: 0, rank: null, exactScores: 0 };
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  // Mock fallback so the app runs without a Supabase project wired up.
  if (!isSupabaseConfigured()) return CURRENT_USER;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url, created_at")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    username: profile?.username ?? "Joueur",
    avatarUrl: profile?.avatar_url ?? undefined,
    joinedAt: profile?.created_at ?? user.created_at ?? new Date().toISOString(),
    // TODO: compute from monthly_leaderboard once predictions are wired to DB.
    monthlyPoints: 0,
    worldRank: null,
  };
}
