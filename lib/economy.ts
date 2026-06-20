import "server-only";

// Server-side economy logic (service-role): awards coins for settled
// predictions, unlocks achievements, and pays the monthly leaderboard at close.
// All grants are idempotent (coin_ledger unique key / on-conflict inserts), so
// re-running settle never double-credits.

import type { SupabaseClient } from "@supabase/supabase-js";
import { activeLeaderboardMonth } from "@/lib/domain/boosts";
import {
  ACHIEVEMENTS,
  COINS_PER_POINT,
  monthlyRewardBadge,
  monthlyRewardCoins,
  type AchievementStats,
} from "@/lib/domain/economy";

type Admin = SupabaseClient;

/**
 * Compute a user's lifetime achievement stats from the DB (service-role).
 * Single source of truth tested by every achievement, so a re-scan after
 * adding a new achievement awards it retroactively to whoever already met it.
 */
export async function computeAchievementStats(
  admin: Admin,
  userId: string,
): Promise<AchievementStats> {
  const [
    { count: settled },
    { count: exacts },
    { data: hitRows },
    { count: friends },
    { count: cosmetics },
    { data: spendRows },
  ] = await Promise.all([
    admin
      .from("predictions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("points", "is", null),
    admin
      .from("predictions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("base_points", 10),
    admin.from("predictions").select("scorer_hits").eq("user_id", userId),
    admin
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    admin
      .from("user_items")
      .select("item_key, shop_items!inner(kind)", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("shop_items.kind", ["frame", "title", "color"]),
    admin
      .from("coin_ledger")
      .select("amount")
      .eq("user_id", userId)
      .eq("reason", "purchase"),
  ]);

  const scorerHits = ((hitRows as { scorer_hits: number | null }[] | null) ?? [])
    .reduce((sum, r) => sum + (r.scorer_hits ?? 0), 0);
  const coinsSpent = ((spendRows as { amount: number }[] | null) ?? []).reduce(
    (sum, r) => sum + Math.max(0, -r.amount),
    0,
  );

  return {
    settled: settled ?? 0,
    exacts: exacts ?? 0,
    scorerHits,
    friends: friends ?? 0,
    cosmetics: cosmetics ?? 0,
    coinsSpent,
  };
}

/** Credit coins for a settled prediction (idempotent by prediction id). */
export async function grantPredictionCoins(
  admin: Admin,
  userId: string,
  predictionId: string,
  points: number,
): Promise<void> {
  if (points <= 0) return;
  await admin.rpc("grant_coins", {
    p_user: userId,
    p_amount: points * COINS_PER_POINT,
    p_reason: "prediction",
    p_ref: predictionId,
  });
}

/**
 * Unlock any newly-earned achievements for a user (badge + coins + XP).
 *
 * `awardCoins` defaults to true (live settle path). The retroactive backfill
 * passes `false` so re-scanning old players grants the achievement + badge
 * without inflating coin balances for milestones crossed long ago.
 */
export async function grantAchievements(
  admin: Admin,
  userId: string,
  opts: { awardCoins?: boolean } = {},
): Promise<void> {
  const awardCoins = opts.awardCoins ?? true;
  const { data: unlocked } = await admin
    .from("user_achievements")
    .select("key")
    .eq("user_id", userId);
  const have = new Set(((unlocked as { key: string }[] | null) ?? []).map((r) => r.key));

  const stats = await computeAchievementStats(admin, userId);

  for (const a of ACHIEVEMENTS) {
    if (have.has(a.key) || !a.test(stats)) continue;
    const { error } = await admin
      .from("user_achievements")
      .insert({ user_id: userId, key: a.key });
    if (error) continue; // already unlocked (race) — skip rewards
    if (awardCoins && a.coins > 0) {
      await admin.rpc("grant_coins", {
        p_user: userId,
        p_amount: a.coins,
        p_reason: "achievement",
        p_ref: a.key,
      });
    }
    if (a.badge) {
      await admin
        .from("user_items")
        .upsert(
          { user_id: userId, item_key: a.badge },
          { onConflict: "user_id,item_key", ignoreDuplicates: true },
        );
    }
  }
}

function previousMonthKey(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Pay the most recently closed month's leaderboard, once. The "active" month is
 * grace-lagged, so the month just before it is fully settled. Idempotent: skips
 * if any monthly grant already exists for that month.
 */
export async function payoutMonthIfDue(admin: Admin): Promise<void> {
  const month = previousMonthKey(activeLeaderboardMonth());

  const { data: already } = await admin
    .from("coin_ledger")
    .select("id")
    .eq("reason", "monthly")
    .eq("ref", month)
    .limit(1);
  if (already && already.length) return;

  const { data: rows } = await admin.rpc("month_standings", { p_month: month });
  const standings = (
    (rows as { user_id: string; points: number; exacts: number }[] | null) ?? []
  )
    .map((r) => ({
      userId: r.user_id,
      points: Number(r.points),
      exacts: Number(r.exacts),
    }))
    .sort((a, b) => b.points - a.points || b.exacts - a.exacts);
  if (standings.length === 0) return;

  // Hall of Fame: this month's podium, frozen so it survives the board reset.
  const champions: {
    month: string;
    user_id: string;
    rank: number;
    points: number;
    exacts: number;
  }[] = [];

  let rank = 0;
  let prevPts = Number.NaN;
  let prevEx = Number.NaN;
  for (let i = 0; i < standings.length; i++) {
    const s = standings[i];
    if (i === 0 || s.points !== prevPts || s.exacts !== prevEx) {
      rank = i + 1;
      prevPts = s.points;
      prevEx = s.exacts;
    }
    const coins = monthlyRewardCoins(rank);
    if (coins > 0) {
      await admin.rpc("grant_coins", {
        p_user: s.userId,
        p_amount: coins,
        p_reason: "monthly",
        p_ref: month,
      });
    }
    const badge = monthlyRewardBadge(rank);
    if (badge) {
      // Repeatable: a second gold win bumps the badge's count (shown as "×2")
      // rather than inserting a duplicate row.
      await admin.rpc("award_monthly_badge", {
        p_user: s.userId,
        p_key: badge,
      });
    }
    // Podium (ties included): archived into the Hall of Fame below.
    if (rank <= 3) {
      champions.push({
        month,
        user_id: s.userId,
        rank,
        points: s.points,
        exacts: s.exacts,
      });
    }
  }

  // Freeze the podium into the Hall of Fame. Idempotent on (month, user_id), so
  // re-running settle never duplicates a champion.
  if (champions.length > 0) {
    await admin
      .from("monthly_champions")
      .upsert(champions, {
        onConflict: "month,user_id",
        ignoreDuplicates: true,
      });
  }
}
