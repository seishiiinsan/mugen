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
  BoostType,
  ChangelogEntry,
  CoinEntry,
  Fixture,
  FixtureStatus,
  FriendRequest,
  FriendSummary,
  Group,
  GroupOwnedItem,
  GroupPot,
  GroupShopItem,
  OwnedGroupPot,
  PublicGroup,
  AdminPlayer,
  AdminPlayerDetail,
  LeaderboardEntry,
  RankedPlayer,
  NotificationItem,
  Prediction,
  ProfileOverview,
  PublicPrediction,
  Relation,
  Report,
  ReportCategory,
  ReportStatus,
  ScorerPick,
  ShopItem,
  UserProfile,
  UserSearchResult,
  Visibility,
  VisibilityValue,
} from "@/lib/domain/types";
import { activeLeaderboardMonth, BOOST_TYPES } from "@/lib/domain/boosts";
import {
  ACHIEVEMENTS,
  levelFromXp,
  XP_PER_POINT,
  type Level,
} from "@/lib/domain/economy";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { ensureProfile } from "@/lib/supabase/ensure-profile";
import {
  fetchFixtureById,
  fetchFixturesByRange,
  isSportsApiConfigured,
} from "@/lib/sports";

/** A row from the `predictions` table. */
interface PredictionRow {
  fixture_id: number;
  home_goals: number;
  away_goals: number;
  points: number | null;
  updated_at: string;
  boost: BoostType | null;
  home_goals_2: number | null;
  away_goals_2: number | null;
  scorers: ScorerPick[] | null;
}

/** Columns selected for every prediction read. */
const PREDICTION_COLS =
  "fixture_id, home_goals, away_goals, points, updated_at, boost, home_goals_2, away_goals_2, scorers";

function mapPredictionRow(row: PredictionRow, userId: string): Prediction {
  return {
    fixtureId: row.fixture_id,
    userId,
    home: row.home_goals,
    away: row.away_goals,
    points: row.points,
    submittedAt: row.updated_at,
    boost: row.boost,
    secondary:
      row.home_goals_2 != null && row.away_goals_2 != null
        ? { home: row.home_goals_2, away: row.away_goals_2 }
        : null,
    scorers: row.scorers ?? [],
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

/** All fixtures held in the Supabase cache (fallback when the API is down). */
async function getCachedFixtures(): Promise<Fixture[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("fixtures").select("*").order("kickoff");
  return ((data as FixtureRow[] | null) ?? []).map(mapFixtureRow);
}

/**
 * Forthcoming matches of the current calendar month (strict UTC, matching the
 * eligibility rule "only this month's matches are predictable"). Finished
 * matches are intentionally excluded — a user revisits those via "Mes
 * pronostics".
 *
 * Month bounds are derived from `now` (NOT the grace-lagged aggregation month):
 * a new month's fixtures must open for prediction at 00:00 UTC on the 1st. The
 * upper fetch bound is widened by one day so a last-evening match (e.g. 23:00
 * on the last day) is still returned even if the provider files it under the
 * 1st of next month; the precise UTC filter then keeps only true in-month rows.
 */
export async function getFixtures(): Promise<Fixture[]> {
  const now = new Date();
  const monthStartMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const nextMonthStartMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    1,
  );
  const from = now.toISOString().slice(0, 10);
  // First day of next month: a +1-day buffer over the real last day.
  const to = new Date(nextMonthStartMs).toISOString().slice(0, 10);

  const forthcoming = (f: Fixture): boolean => {
    if (f.status !== "upcoming" && f.status !== "live") return false;
    const k = new Date(f.kickoff).getTime();
    return k >= monthStartMs && k < nextMonthStartMs;
  };

  if (isSportsApiConfigured()) {
    try {
      const fixtures = await fetchFixturesByRange(from, to);
      return sortFixtures(fixtures.filter(forthcoming));
    } catch (err) {
      // Rate limit / outage: degrade gracefully to the cached fixtures.
      console.error(
        "[getFixtures] sports API unavailable, serving cached fixtures:",
        err,
      );
      const cached = (await getCachedFixtures()).filter(forthcoming);
      if (cached.length > 0) return sortFixtures(cached);
      return isSupabaseConfigured()
        ? []
        : sortFixtures(MOCK_FIXTURES.filter(forthcoming));
    }
  }
  return sortFixtures(MOCK_FIXTURES.filter(forthcoming));
}

export async function getFixture(id: number): Promise<Fixture | null> {
  if (isSportsApiConfigured()) {
    try {
      return await fetchFixtureById(id);
    } catch (err) {
      console.error(
        `[getFixture ${id}] API-Football unavailable, serving cache:`,
        err,
      );
      const [hit] = await getFixturesByIds([id]);
      return hit ?? null;
    }
  }
  return MOCK_FIXTURES.find((f) => f.id === id) ?? null;
}

/**
 * Refresh cached fixtures whose kickoff has passed but that are still marked
 * upcoming/live (the cache only updates at prediction time and during settle).
 * Re-fetches them from the sports API and updates the cache, so screens reading
 * the cache (e.g. "Mes pronostics") show the real status and score. Bounded to
 * the fixtures passed in; finished/cancelled rows are never re-fetched.
 */
async function refreshStaleFixtures(fixtures: Fixture[]): Promise<Fixture[]> {
  if (!isSportsApiConfigured() || !isAdminConfigured()) return fixtures;

  const now = Date.now();
  const stale = fixtures.filter(
    (f) =>
      (f.status === "upcoming" || f.status === "live") &&
      new Date(f.kickoff).getTime() < now,
  );
  if (stale.length === 0) return fixtures;

  const admin = createAdminClient();
  const refreshed = new Map<number, Fixture>();

  await Promise.all(
    stale.map(async (f) => {
      try {
        const fresh = await fetchFixtureById(f.id);
        if (!fresh) return;
        refreshed.set(f.id, fresh);
        await admin
          .from("fixtures")
          .update({
            status: fresh.status,
            elapsed: fresh.elapsed ?? null,
            home_goals: fresh.score?.home ?? null,
            away_goals: fresh.score?.away ?? null,
            league_logo: fresh.league.logoUrl ?? null,
            home_id: fresh.home.id,
            home_logo: fresh.home.logoUrl ?? null,
            away_id: fresh.away.id,
            away_logo: fresh.away.logoUrl ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", f.id);
      } catch (err) {
        console.error(`[refreshStaleFixtures ${f.id}]`, err);
      }
    }),
  );

  return fixtures.map((f) => refreshed.get(f.id) ?? f);
}

/** Fixtures from the DB cache (those a user has predicted), by id. */
export async function getFixturesByIds(ids: number[]): Promise<Fixture[]> {
  if (ids.length === 0) return [];
  if (!isSupabaseConfigured()) {
    return MOCK_FIXTURES.filter((f) => ids.includes(f.id));
  }

  const supabase = await createClient();
  const { data } = await supabase.from("fixtures").select("*").in("id", ids);

  const cached = ((data as FixtureRow[] | null) ?? []).map(mapFixtureRow);
  return refreshStaleFixtures(cached);
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
    .select(PREDICTION_COLS)
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
    .select(PREDICTION_COLS)
    .eq("user_id", user.id)
    .eq("fixture_id", fixtureId)
    .maybeSingle();

  return data ? mapPredictionRow(data as PredictionRow, user.id) : null;
}

/**
 * Which boosts the player still has for a given leaderboard month. One of each
 * type is granted per month; a type is spent once attached to a prediction
 * whose fixture falls in that month.
 */
export async function getMyBoostStock(
  month: string = activeLeaderboardMonth(),
): Promise<{ used: BoostType[]; remaining: BoostType[] }> {
  if (!isSupabaseConfigured()) {
    return { used: [], remaining: [...BOOST_TYPES] };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { used: [], remaining: [...BOOST_TYPES] };

  const { data } = await supabase
    .from("predictions")
    .select("boost")
    .eq("user_id", user.id)
    .eq("bonus_month", month)
    .not("boost", "is", null);

  const used = [
    ...new Set(
      ((data as { boost: BoostType }[] | null) ?? []).map((r) => r.boost),
    ),
  ];
  return { used, remaining: BOOST_TYPES.filter((b) => !used.includes(b)) };
}

interface LeaderboardRow {
  user_id: string;
  points: number;
  exact_scores: number;
}

interface ProfileRow {
  id: string;
  username: string;
  avatar_url: string | null;
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
    supabase.from("profiles").select("id, username, avatar_url"),
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
      avatarUrl: p.avatar_url ?? undefined,
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

/** Standard competition ranking by `value` desc (ties share a rank). */
function rankByValue(entries: Omit<RankedPlayer, "rank">[]): RankedPlayer[] {
  const sorted = [...entries].sort(
    (a, b) => b.value - a.value || a.username.localeCompare(b.username, "fr"),
  );
  let rank = 0;
  let prev = Number.NaN;
  return sorted.map((e, i) => {
    if (i === 0 || e.value !== prev) {
      rank = i + 1;
      prev = e.value;
    }
    return { rank, ...e };
  });
}

/** All-time richest players, ranked by coin balance (no rewards, no reset). */
export async function getCoinsLeaderboard(): Promise<RankedPlayer[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, coins");
  const entries = (
    (data as { id: string; username: string; avatar_url: string | null; coins: number }[] | null) ??
    []
  ).map((p) => ({
    userId: p.id,
    username: p.username,
    avatarUrl: p.avatar_url ?? undefined,
    value: p.coins ?? 0,
  }));
  return rankByValue(entries).slice(0, 100);
}

/** All-time XP board, ranked by lifetime XP (no rewards, no reset). */
export async function getXpLeaderboard(): Promise<RankedPlayer[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("xp_standings");
  if (error) {
    console.error("[getXpLeaderboard]", error);
    return [];
  }
  type Row = {
    user_id: string;
    username: string;
    avatar_url: string | null;
    points: number;
    achievements: string[] | null;
  };
  const entries = ((data as Row[] | null) ?? []).map((r) => {
    const unlocked = new Set(r.achievements ?? []);
    const achXp = ACHIEVEMENTS.filter((a) => unlocked.has(a.key)).reduce(
      (sum, a) => sum + a.xp,
      0,
    );
    const xp = Number(r.points) * XP_PER_POINT + achXp;
    return {
      userId: r.user_id,
      username: r.username,
      avatarUrl: r.avatar_url ?? undefined,
      value: xp,
      level: levelFromXp(xp).level,
    };
  });
  return rankByValue(entries).slice(0, 100);
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  // Mock fallback so the app runs without a Supabase project wired up.
  if (!isSupabaseConfigured()) return CURRENT_USER;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const cols =
    "username, avatar_url, created_at, coins, equipped_frame, equipped_title, equipped_color, equipped_badge";
  let { data: profile } = await supabase
    .from("profiles")
    .select(cols)
    .eq("id", user.id)
    .maybeSingle<ProfileSelfRow>();

  // Self-heal: if the profile row is gone but the auth account remains (e.g.
  // it was deleted directly in the DB while the session stayed valid), the
  // INSERT trigger never re-fires. Recreate it so the user isn't stuck as a
  // nameless "Joueur" who can't predict (predictions FK → profiles).
  if (!profile) {
    await ensureProfile(supabase, user);
    ({ data: profile } = await supabase
      .from("profiles")
      .select(cols)
      .eq("id", user.id)
      .maybeSingle<ProfileSelfRow>());
  }

  return {
    id: user.id,
    username: profile?.username ?? "Joueur",
    avatarUrl: profile?.avatar_url ?? undefined,
    joinedAt: profile?.created_at ?? user.created_at ?? new Date().toISOString(),
    // TODO: compute from monthly_leaderboard once predictions are wired to DB.
    monthlyPoints: 0,
    worldRank: null,
    coins: profile?.coins ?? 0,
    equippedFrame: profile?.equipped_frame ?? null,
    equippedTitle: profile?.equipped_title ?? null,
    equippedColor: profile?.equipped_color ?? null,
    equippedBadge: profile?.equipped_badge ?? null,
  };
}

interface ProfileSelfRow {
  username: string;
  avatar_url: string | null;
  created_at: string;
  coins: number;
  equipped_frame: string | null;
  equipped_title: string | null;
  equipped_color: string | null;
  equipped_badge: string | null;
}

// ---------------------------------------------------------------------------
// GROUPES (ligues privées)
// ---------------------------------------------------------------------------

interface GroupRow {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  member_count: number;
  created_at: string;
}

function mapGroupRow(r: GroupRow): Group {
  return {
    id: r.id,
    name: r.name,
    inviteCode: r.invite_code,
    ownerId: r.owner_id,
    memberCount: Number(r.member_count),
    createdAt: r.created_at,
  };
}

/** Groups the current user belongs to (most recent first). */
export async function getMyGroups(): Promise<Group[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_groups");
  if (error) {
    console.error("[getMyGroups]", error);
    return [];
  }
  return ((data as GroupRow[] | null) ?? []).map(mapGroupRow);
}

/** A single group's metadata, or null if the user isn't a member. */
export async function getGroup(groupId: string): Promise<Group | null> {
  const groups = await getMyGroups();
  return groups.find((g) => g.id === groupId) ?? null;
}

/** Public groups for the discovery modal (optional name filter). */
export async function getPublicGroups(query?: string): Promise<PublicGroup[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_groups", {
    p_query: query ?? null,
  });
  if (error) {
    console.error("[getPublicGroups]", error);
    return [];
  }
  return (
    (data as
      | {
          id: string;
          name: string;
          member_count: number;
          owner_id: string;
          is_member: boolean;
        }[]
      | null) ?? []
  ).map((r) => ({
    id: r.id,
    name: r.name,
    memberCount: Number(r.member_count),
    ownerId: r.owner_id,
    isMember: Boolean(r.is_member),
  }));
}

interface GroupLeaderboardRow {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  points: number;
  exact_scores: number;
}

/** Monthly ranking restricted to a group's members (0-point members included). */
export async function getGroupLeaderboard(
  groupId: string,
): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("group_leaderboard", {
    p_group: groupId,
  });
  if (error) {
    console.error("[getGroupLeaderboard]", error);
    return [];
  }
  return ((data as GroupLeaderboardRow[] | null) ?? []).map((r) => ({
    rank: Number(r.rank),
    userId: r.user_id,
    username: r.username,
    points: Number(r.points),
    exactScores: Number(r.exact_scores),
    avatarUrl: r.avatar_url ?? undefined,
  }));
}

// ---------------------------------------------------------------------------
// CAGNOTTES & COSMÉTIQUES DE GROUPE
// ---------------------------------------------------------------------------

/** Groups the caller owns, with their pot balance (shop section selector). */
export async function getOwnedGroupsWithPot(): Promise<OwnedGroupPot[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_owned_groups_pots");
  if (error) {
    console.error("[getOwnedGroupsWithPot]", error);
    return [];
  }
  return (
    (data as { id: string; name: string; pot_balance: number }[] | null) ?? []
  ).map((r) => ({ id: r.id, name: r.name, potBalance: Number(r.pot_balance) }));
}

/** A group's pot balance and the caller's own contribution (member-gated). */
export async function getGroupPot(groupId: string): Promise<GroupPot | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("group_pot", { p_group: groupId });
  const row = (
    data as { pot_balance: number; my_contribution: number }[] | null
  )?.[0];
  if (error || !row) {
    if (error) console.error("[getGroupPot]", error);
    return null;
  }
  return {
    balance: Number(row.pot_balance),
    myContribution: Number(row.my_contribution),
  };
}

interface GroupShopRow {
  key: string;
  kind: GroupShopItem["kind"];
  name: string;
  description: string | null;
  price: number;
  sort: number;
}

/** Active group-cosmetic catalog with the group's ownership flag. */
export async function getGroupShopItems(
  groupId: string,
): Promise<GroupShopItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("group_shop_catalog", {
    p_group: groupId,
  });
  if (error) {
    console.error("[getGroupShopItems]", error);
    return [];
  }
  return ((data as (GroupShopRow & { owned: boolean })[] | null) ?? []).map(
    (r) => ({
      key: r.key,
      kind: r.kind,
      name: r.name,
      description: r.description,
      price: Number(r.price),
      owned: Boolean(r.owned),
    }),
  );
}

/** Cosmetics a group owns, with equipped flags (owner-gated). */
export async function getGroupOwnedItems(
  groupId: string,
): Promise<GroupOwnedItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("group_owned_items", {
    p_group: groupId,
  });
  if (error) {
    console.error("[getGroupOwnedItems]", error);
    return [];
  }
  return ((data as (GroupShopRow & { equipped: boolean })[] | null) ?? []).map(
    (r) => ({
      key: r.key,
      kind: r.kind,
      name: r.name,
      description: r.description,
      price: Number(r.price),
      equipped: Boolean(r.equipped),
    }),
  );
}

// ---------------------------------------------------------------------------
// ÉCONOMIE (monnaie, boutique, succès)
// ---------------------------------------------------------------------------

interface ShopItemRow {
  key: string;
  kind: ShopItem["kind"];
  name: string;
  description: string | null;
  price: number;
  sort: number;
}

/** Sellable catalog with the viewer's owned/equipped flags. */
export async function getShopItems(): Promise<ShopItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: items }, owned, equipped] = await Promise.all([
    supabase
      .from("shop_items")
      .select("key, kind, name, description, price, sort")
      .eq("active", true)
      .order("sort"),
    user
      ? supabase.from("user_items").select("item_key").eq("user_id", user.id)
      : Promise.resolve({ data: [] as { item_key: string }[] }),
    user
      ? supabase
          .from("profiles")
          .select("equipped_frame, equipped_title, equipped_color")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const ownedSet = new Set(
    ((owned.data as { item_key: string }[] | null) ?? []).map((o) => o.item_key),
  );
  const eq = (equipped.data as {
    equipped_frame: string | null;
    equipped_title: string | null;
    equipped_color: string | null;
  } | null) ?? null;
  const equippedSet = new Set(
    [eq?.equipped_frame, eq?.equipped_title, eq?.equipped_color].filter(
      (k): k is string => Boolean(k),
    ),
  );

  return ((items as ShopItemRow[] | null) ?? []).map((i) => ({
    key: i.key,
    kind: i.kind,
    name: i.name,
    description: i.description,
    price: i.price,
    owned: ownedSet.has(i.key),
    equipped: equippedSet.has(i.key),
  }));
}

/** Order in which kinds appear in the unified "Possédés" inventory. */
const OWNED_KIND_ORDER: Record<ShopItem["kind"], number> = {
  badge: 0,
  frame: 1,
  color: 2,
  title: 3,
};

/**
 * Everything the viewer owns — every kind, badges included — for the unified
 * "Possédés" tab. Each item carries its equipped state and (for badges) how
 * many times it was earned.
 */
export async function getMyOwnedItems(): Promise<ShopItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data }, { data: eq }] = await Promise.all([
    supabase
      .from("user_items")
      .select(
        "item_key, count, shop_items!inner(kind, name, description, price, sort)",
      )
      .eq("user_id", user.id),
    supabase
      .from("profiles")
      .select("equipped_frame, equipped_title, equipped_color, equipped_badge")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const e = eq as {
    equipped_frame: string | null;
    equipped_title: string | null;
    equipped_color: string | null;
    equipped_badge: string | null;
  } | null;
  const equippedSet = new Set(
    [e?.equipped_frame, e?.equipped_title, e?.equipped_color, e?.equipped_badge].filter(
      (k): k is string => Boolean(k),
    ),
  );

  type Row = {
    item_key: string;
    count: number | null;
    shop_items: {
      kind: ShopItem["kind"];
      name: string;
      description: string | null;
      price: number;
      sort: number;
    };
  };
  return ((data as Row[] | null) ?? [])
    .slice()
    .sort(
      (a, b) =>
        OWNED_KIND_ORDER[a.shop_items.kind] - OWNED_KIND_ORDER[b.shop_items.kind] ||
        a.shop_items.sort - b.shop_items.sort,
    )
    .map((r) => ({
      key: r.item_key,
      kind: r.shop_items.kind,
      name: r.shop_items.name,
      description: r.shop_items.description,
      price: r.shop_items.price,
      owned: true,
      equipped: equippedSet.has(r.item_key),
      count: r.count ?? 1,
    }));
}

/** Map of friend id → item keys they own, for the boutique gift picker. */
export async function getFriendsOwnedItems(): Promise<Record<string, string[]>> {
  if (!isSupabaseConfigured()) return {};
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("friends_owned_items");
  if (error) {
    console.error("[getFriendsOwnedItems]", error);
    return {};
  }
  const map: Record<string, string[]> = {};
  for (const r of (data as { friend_id: string; item_key: string }[] | null) ?? []) {
    (map[r.friend_id] ??= []).push(r.item_key);
  }
  return map;
}

/** Owned badge with how many times it was earned (≥1) — for profile display. */
export interface OwnedBadge {
  key: string;
  count: number;
}

/** Owned badges (key + earned count) for profile display. */
export async function getMyBadges(): Promise<OwnedBadge[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("user_items")
    .select("item_key, count, shop_items!inner(kind)")
    .eq("user_id", user.id)
    .eq("shop_items.kind", "badge");
  return ((data as { item_key: string; count: number | null }[] | null) ?? []).map(
    (r) => ({ key: r.item_key, count: r.count ?? 1 }),
  );
}

/** Current level, derived from lifetime points (×XP_PER_POINT) + achievement XP. */
export async function getMyLevel(): Promise<Level> {
  if (!isSupabaseConfigured()) return levelFromXp(1280);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return levelFromXp(0);

  const [{ data: pts }, achKeys] = await Promise.all([
    supabase.rpc("my_lifetime_points"),
    getMyAchievementKeys(),
  ]);
  const lifetimePoints = Number(pts ?? 0);
  const unlocked = new Set(achKeys);
  const achXp = ACHIEVEMENTS.filter((a) => unlocked.has(a.key)).reduce(
    (sum, a) => sum + a.xp,
    0,
  );
  return levelFromXp(lifetimePoints * XP_PER_POINT + achXp);
}

/** Keys of achievements the user has unlocked. */
export async function getMyAchievementKeys(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("user_achievements")
    .select("key")
    .eq("user_id", user.id);
  return ((data as { key: string }[] | null) ?? []).map((r) => r.key);
}

/** Whether today's daily bonus is still claimable (UTC day). */
export async function canClaimDaily(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const day = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("coin_ledger")
    .select("id")
    .eq("user_id", user.id)
    .eq("reason", "daily")
    .eq("ref", day)
    .limit(1);
  return !(data && data.length > 0);
}

/** Recent coin ledger entries (newest first). */
export async function getMyCoinHistory(limit = 8): Promise<CoinEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("coin_ledger")
    .select("amount, reason, ref, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (
    (data as {
      amount: number;
      reason: string;
      ref: string;
      created_at: string;
    }[] | null) ?? []
  ).map((r) => ({
    amount: r.amount,
    reason: r.reason,
    ref: r.ref,
    createdAt: r.created_at,
  }));
}

// ---------------------------------------------------------------------------
// ADMIN, SIGNALEMENTS & CHANGELOG
// ---------------------------------------------------------------------------

/** Whether the current user is flagged `is_admin` (gates the /admin panel). */
export async function getIsAdmin(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle<{ is_admin: boolean }>();
  return Boolean(data?.is_admin);
}

interface MyReportRow {
  id: string;
  category: ReportCategory;
  title: string;
  message: string;
  status: ReportStatus;
  page_url: string | null;
  created_at: string;
  updated_at: string;
}

/** The current user's own reports (newest first). */
export async function getMyReports(): Promise<Report[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_reports");
  if (error) {
    console.error("[getMyReports]", error);
    return [];
  }
  return ((data as MyReportRow[] | null) ?? []).map((r) => ({
    id: r.id,
    category: r.category,
    title: r.title,
    message: r.message,
    status: r.status,
    pageUrl: r.page_url,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

interface AdminReportRow extends MyReportRow {
  user_id: string | null;
  username: string | null;
  admin_notes: string | null;
  reporter_has_bughunter: boolean | null;
}

/** Every report with its author (admin only — RPC enforces the guard). */
export async function getAdminReports(): Promise<Report[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_reports");
  if (error) {
    console.error("[getAdminReports]", error);
    return [];
  }
  return ((data as AdminReportRow[] | null) ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    username: r.username,
    category: r.category,
    title: r.title,
    message: r.message,
    status: r.status,
    pageUrl: r.page_url,
    adminNotes: r.admin_notes,
    reporterHasBugHunter: r.reporter_has_bughunter ?? false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

interface AdminPlayerRow {
  id: string;
  username: string;
  avatar_url: string | null;
  coins: number;
  is_admin: boolean;
  created_at: string;
  lifetime_points: number;
}

/** All players for the admin "Joueurs" tab (admin-gated RPC). */
export async function getAdminPlayers(): Promise<AdminPlayer[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_players");
  if (error) {
    console.error("[getAdminPlayers]", error);
    return [];
  }
  return ((data as AdminPlayerRow[] | null) ?? []).map((r) => ({
    id: r.id,
    username: r.username,
    avatarUrl: r.avatar_url ?? undefined,
    coins: r.coins,
    isAdmin: r.is_admin,
    createdAt: r.created_at,
    lifetimePoints: Number(r.lifetime_points ?? 0),
  }));
}

/** Full account dump for one player (admin-gated). XP/level derived app-side. */
export async function getAdminPlayerDetail(
  id: string,
): Promise<AdminPlayerDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_player_detail", {
    p_user: id,
  });
  if (error || !data) {
    if (error) console.error("[getAdminPlayerDetail]", error);
    return null;
  }
  const d = data as Omit<AdminPlayerDetail, "totalXp" | "level">;
  const unlocked = new Set(d.achievements ?? []);
  const achXp = ACHIEVEMENTS.filter((a) => unlocked.has(a.key)).reduce(
    (sum, a) => sum + a.xp,
    0,
  );
  const totalXp = Number(d.lifetime_points) * XP_PER_POINT + achXp;
  return { ...d, totalXp, level: levelFromXp(totalXp).level };
}

interface ChangelogRow {
  id: string;
  version: string | null;
  title: string;
  body: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

function mapChangelogRow(r: ChangelogRow): ChangelogEntry {
  return {
    id: r.id,
    version: r.version,
    title: r.title,
    body: r.body,
    published: r.published,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Published changelog entries (public, newest first). Read via RLS policy. */
export async function getPublishedChangelog(): Promise<ChangelogEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("changelog")
    .select("id, version, title, body, published, created_at, updated_at")
    .eq("published", true)
    .order("created_at", { ascending: false });
  return ((data as ChangelogRow[] | null) ?? []).map(mapChangelogRow);
}

/** All changelog entries incl. drafts (admin only — RPC enforces the guard). */
export async function getAdminChangelog(): Promise<ChangelogEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_changelog");
  if (error) {
    console.error("[getAdminChangelog]", error);
    return [];
  }
  return ((data as ChangelogRow[] | null) ?? []).map(mapChangelogRow);
}

// ---------------------------------------------------------------------------
// SOCIAL (amis, profils publics, notifications, visibilité)
// ---------------------------------------------------------------------------

/** Level number from lifetime points + achievement XP — mirrors getMyLevel. */
function computeLevel(lifetimePoints: number, achievementKeys: string[]): number {
  const unlocked = new Set(achievementKeys);
  const achXp = ACHIEVEMENTS.filter((a) => unlocked.has(a.key)).reduce(
    (sum, a) => sum + a.xp,
    0,
  );
  return levelFromXp(lifetimePoints * XP_PER_POINT + achXp).level;
}

interface IdentityRow {
  id: string;
  username: string;
  avatar_url: string | null;
  equipped_title: string | null;
  equipped_color: string | null;
  equipped_badge: string | null;
}

/** Player search by username substring, with the viewer's relation to each. */
export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  if (!isSupabaseConfigured()) return [];
  const q = query.trim();
  if (!q) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_users", { p_query: q });
  if (error) {
    console.error("[searchUsers]", error);
    return [];
  }
  return ((data as (IdentityRow & { relation: string })[] | null) ?? []).map(
    (r) => ({
      id: r.id,
      username: r.username,
      avatarUrl: r.avatar_url ?? undefined,
      equippedTitle: r.equipped_title,
      equippedColor: r.equipped_color,
      equippedBadge: r.equipped_badge,
      relation: r.relation as Relation,
    }),
  );
}

interface FriendRow extends IdentityRow {
  equipped_frame: string | null;
  lifetime_points: number;
  achievement_keys: string[] | null;
}

/** The viewer's accepted friends, with each friend's computed level. */
export async function getMyFriends(): Promise<FriendSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_friends");
  if (error) {
    console.error("[getMyFriends]", error);
    return [];
  }
  return ((data as FriendRow[] | null) ?? []).map((r) => {
    const keys = r.achievement_keys ?? [];
    const points = Number(r.lifetime_points ?? 0);
    return {
      id: r.id,
      username: r.username,
      avatarUrl: r.avatar_url ?? undefined,
      equippedFrame: r.equipped_frame,
      equippedTitle: r.equipped_title,
      equippedColor: r.equipped_color,
      equippedBadge: r.equipped_badge,
      lifetimePoints: points,
      achievementKeys: keys,
      level: computeLevel(points, keys),
    };
  });
}

/** Pending friend requests (incoming = received, outgoing = sent). */
export async function getMyFriendRequests(): Promise<FriendRequest[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_friend_requests");
  if (error) {
    console.error("[getMyFriendRequests]", error);
    return [];
  }
  return (
    (data as (IdentityRow & { direction: string; created_at: string })[] | null) ??
    []
  ).map((r) => ({
    id: r.id,
    username: r.username,
    avatarUrl: r.avatar_url ?? undefined,
    equippedTitle: r.equipped_title,
    equippedColor: r.equipped_color,
    equippedBadge: r.equipped_badge,
    direction: r.direction === "outgoing" ? "outgoing" : "incoming",
    createdAt: r.created_at,
  }));
}

interface OverviewRow {
  id: string;
  username: string;
  avatar_url: string | null;
  equipped_frame: string | null;
  equipped_title: string | null;
  equipped_color: string | null;
  equipped_badge: string | null;
  created_at: string;
  relation: string;
  predictions_visibility: string;
  stats_visibility: string;
  achievements_visibility: string;
  friends_visibility: string;
  friend_count: number | null;
  lifetime_points: number | null;
  exact_scores: number | null;
  achievement_keys: string[] | null;
}

/** Public profile overview by username (aspects gated server-side). */
export async function getProfileOverview(
  username: string,
): Promise<ProfileOverview | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("profile_overview", {
    p_username: username,
  });
  if (error) {
    console.error("[getProfileOverview]", error);
    return null;
  }
  const r = (data as OverviewRow[] | null)?.[0];
  if (!r) return null;
  const num = (v: number | null) => (v == null ? null : Number(v));
  return {
    id: r.id,
    username: r.username,
    avatarUrl: r.avatar_url ?? undefined,
    equippedFrame: r.equipped_frame,
    equippedTitle: r.equipped_title,
    equippedColor: r.equipped_color,
    equippedBadge: r.equipped_badge,
    joinedAt: r.created_at,
    relation: r.relation as Relation,
    visibility: {
      predictions: r.predictions_visibility as VisibilityValue,
      stats: r.stats_visibility as VisibilityValue,
      achievements: r.achievements_visibility as VisibilityValue,
      friends: r.friends_visibility as VisibilityValue,
    },
    friendCount: num(r.friend_count),
    lifetimePoints: num(r.lifetime_points),
    exactScores: num(r.exact_scores),
    achievementKeys: r.achievement_keys ?? null,
  };
}

interface UpcomingRow {
  fixture_id: number;
  home_team: string;
  away_team: string;
  home_logo: string | null;
  away_logo: string | null;
  league_name: string;
  league_logo: string | null;
  kickoff: string;
  home_goals: number;
  away_goals: number;
}

/** A player's upcoming predictions (empty if visibility forbids it). */
export async function getUserUpcomingPredictions(
  uid: string,
): Promise<PublicPrediction[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("user_upcoming_predictions", {
    p_uid: uid,
  });
  if (error) {
    console.error("[getUserUpcomingPredictions]", error);
    return [];
  }
  return ((data as UpcomingRow[] | null) ?? []).map((r) => ({
    fixtureId: Number(r.fixture_id),
    homeTeam: r.home_team,
    awayTeam: r.away_team,
    homeLogo: r.home_logo ?? undefined,
    awayLogo: r.away_logo ?? undefined,
    leagueName: r.league_name,
    leagueLogo: r.league_logo ?? undefined,
    kickoff: r.kickoff,
    homeGoals: r.home_goals,
    awayGoals: r.away_goals,
  }));
}

interface NotificationRow {
  id: string;
  type: "friend_request" | "friend_accept" | "gift";
  actor_id: string | null;
  actor_username: string | null;
  actor_avatar: string | null;
  created_at: string;
  read_at: string | null;
  pending: boolean;
  ref: string | null;
  ref_label: string | null;
}

/** The viewer's notifications (newest first). */
export async function getMyNotifications(): Promise<NotificationItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_notifications");
  if (error) {
    console.error("[getMyNotifications]", error);
    return [];
  }
  return ((data as NotificationRow[] | null) ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    actorId: r.actor_id,
    actorUsername: r.actor_username,
    actorAvatar: r.actor_avatar ?? undefined,
    createdAt: r.created_at,
    readAt: r.read_at,
    pending: Boolean(r.pending),
    refLabel: r.ref_label,
  }));
}

/** Count of unread notifications for the viewer. */
export async function getUnreadNotificationCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unread_notification_count");
  if (error) {
    console.error("[getUnreadNotificationCount]", error);
    return 0;
  }
  return Number(data ?? 0);
}

/** The viewer's per-aspect visibility settings. */
export async function getMyVisibility(): Promise<Visibility> {
  const fallback: Visibility = {
    predictions: "friends",
    stats: "everyone",
    achievements: "everyone",
    friends: "friends",
  };
  if (!isSupabaseConfigured()) return fallback;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fallback;
  const { data } = await supabase
    .from("profiles")
    .select(
      "predictions_visibility, stats_visibility, achievements_visibility, friends_visibility",
    )
    .eq("id", user.id)
    .maybeSingle<{
      predictions_visibility: string | null;
      stats_visibility: string | null;
      achievements_visibility: string | null;
      friends_visibility: string | null;
    }>();
  if (!data) return fallback;
  return {
    predictions: (data.predictions_visibility ?? "friends") as VisibilityValue,
    stats: (data.stats_visibility ?? "everyone") as VisibilityValue,
    achievements: (data.achievements_visibility ?? "everyone") as VisibilityValue,
    friends: (data.friends_visibility ?? "friends") as VisibilityValue,
  };
}
