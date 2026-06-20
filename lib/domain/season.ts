// Mugen — Season pass (pure, shared by server logic and UI).
//
// The pass progresses on the *active month's points* — the same metric as the
// leaderboard (monthly_leaderboard / my_monthly_rank), so everyone earns it by
// playing and no new tracking is needed. Tier thresholds and rewards are
// authoritative in the DB (`season_rewards`, like `shop_items` prices); this
// module holds only the pure progression helper and the per-tier visuals.

/** Repeatable badge granted at the top tier (×N, like the monthly podium). */
export const SEASON_BADGE_KEY = "badge_season";

/** Minimal shape of a season tier needed to compute progression. */
export interface SeasonTierThreshold {
  tier: number;
  minPoints: number;
}

/**
 * How many tiers a player has *reached* with `points` this month. Tiers may be
 * listed in any order; a tier counts as soon as points ≥ its threshold.
 */
export function tiersReached(
  points: number,
  tiers: SeasonTierThreshold[],
): number {
  return tiers.reduce((n, t) => (points >= t.minPoints ? n + 1 : n), 0);
}

/** Per-tier emoji, keyed by tier number — pure display garnish for the ladder. */
export const SEASON_TIER_EMOJI: Record<number, string> = {
  1: "🌱",
  2: "🔥",
  3: "⭐",
  4: "💪",
  5: "👑",
};
