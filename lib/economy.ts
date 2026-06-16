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
} from "@/lib/domain/economy";

type Admin = SupabaseClient;

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

/** Unlock any newly-earned achievements for a user (coins + badge). */
export async function grantAchievements(
  admin: Admin,
  userId: string,
): Promise<void> {
  const { data: unlocked } = await admin
    .from("user_achievements")
    .select("key")
    .eq("user_id", userId);
  const have = new Set(((unlocked as { key: string }[] | null) ?? []).map((r) => r.key));

  const [{ count: settled }, { count: exacts }] = await Promise.all([
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
  ]);
  const stats = { settled: settled ?? 0, exacts: exacts ?? 0 };

  for (const a of ACHIEVEMENTS) {
    if (have.has(a.key) || !a.test(stats)) continue;
    const { error } = await admin
      .from("user_achievements")
      .insert({ user_id: userId, key: a.key });
    if (error) continue; // already unlocked (race) — skip rewards
    if (a.coins > 0) {
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
      await admin
        .from("user_items")
        .upsert(
          { user_id: s.userId, item_key: badge },
          { onConflict: "user_id,item_key", ignoreDuplicates: true },
        );
    }
  }
}
