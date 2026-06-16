// Mugen boosts — monthly power-ups layered on top of the base scoring engine.
//
// Pure and deterministic, like `scoring.ts`: the base score is computed by
// `scorePrediction`, then a single boost (never stacked) modifies the credited
// points. A player gets one of each boost per leaderboard month.

import type { BoostType, Score } from "./types";
import { POINTS, scorePrediction, type PointsValue } from "./scoring";

export type { BoostType };

/** Leaderboard month key ('YYYY-MM', UTC) of a given date — pure, unshifted.
 *  Use this for a *match's own* month (derived from its kickoff). */
export function leaderboardMonth(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Grace window (hours) during which the *outgoing* month stays the active
 * aggregation month after midnight UTC on the 1st. It lets the month's last
 * matches — which kick off late on the last day and finish/settle after
 * midnight — land in their month's final standings before the leaderboard
 * rolls over. Sized as ≈ a match (2h) + the hourly settle cron's latency (1h).
 *
 * IMPORTANT: this lag applies ONLY to aggregation (leaderboards, displayed
 * boost stock). It must NOT gate prediction eligibility or the matches list,
 * otherwise early-of-month fixtures (00:00–03:00 UTC on the 1st) would never be
 * predictable. Those use the strict calendar month by `now`.
 *
 * Kept in sync with `public.active_month_start()` in migration 0006.
 */
export const MONTH_GRACE_HOURS = 3;

/** The active aggregation month key right now (outgoing month during grace). */
export function activeLeaderboardMonth(now: Date = new Date()): string {
  return leaderboardMonth(new Date(now.getTime() - MONTH_GRACE_HOURS * 3_600_000));
}

export const BOOST_TYPES: readonly BoostType[] = [
  "double_points",
  "double_chance",
  "banco",
] as const;

/** One of each boost is available per player per leaderboard month. */
export const BOOSTS_PER_MONTH = 1;

/** Human-readable catalog, reused by the UI (cards, profile, landing). */
export const BOOSTS: Record<
  BoostType,
  { name: string; emoji: string; tagline: string; rule: string }
> = {
  double_points: {
    name: "Points ×2",
    emoji: "⚡",
    tagline: "Double la mise sur un match.",
    rule: "Multiplie par 2 les points marqués sur ce pronostic.",
  },
  double_chance: {
    name: "Double chance",
    emoji: "🎲",
    tagline: "Deux scores, on garde le meilleur.",
    rule: "Soumets deux pronostics : seul le plus rémunérateur est compté.",
  },
  banco: {
    name: "Banco",
    emoji: "🎰",
    tagline: "Tout ou rien.",
    rule: "×3 si le score est exact, sinon 0 point sur ce match.",
  },
};

export interface BoostedScore {
  /** Final points credited after the boost. */
  points: number;
  /** Best un-boosted base score — drives the exact-score leaderboard count. */
  basePoints: PointsValue;
  /** Whether the kept prediction is an exact score. */
  exact: boolean;
}

/**
 * Score a (possibly boosted) prediction against the final 90-minute result.
 *
 * `secondary` is only used by the `double_chance` boost and ignored otherwise.
 * Boosts never stack — `boost` is a single type or null.
 */
export function scoreBoosted({
  primary,
  secondary,
  actual,
  boost,
}: {
  primary: Score;
  secondary?: Score | null;
  actual: Score;
  boost: BoostType | null;
}): BoostedScore {
  const base = scorePrediction(primary, actual);

  switch (boost) {
    case "double_chance": {
      const other = secondary ? scorePrediction(secondary, actual) : POINTS.WRONG;
      const best = (Math.max(base, other) as PointsValue);
      return { points: best, basePoints: best, exact: best === POINTS.EXACT };
    }
    case "double_points":
      return {
        points: base * 2,
        basePoints: base,
        exact: base === POINTS.EXACT,
      };
    case "banco": {
      const exact = base === POINTS.EXACT;
      return { points: exact ? POINTS.EXACT * 3 : 0, basePoints: base, exact };
    }
    default:
      return { points: base, basePoints: base, exact: base === POINTS.EXACT };
  }
}
