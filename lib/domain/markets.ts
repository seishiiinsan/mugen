// Mugen — side markets layered on top of the exact-score engine.
//
// Pure and deterministic. Scorers can lose points (anti-spam); Over/Under and
// BTTS are optional binary bets with no downside. Market points are added AFTER
// any boost (which only multiplies the base score), then the per-match total is
// floored at 0 so a prediction can never cost a player points overall.

import type { BttsPick, OverUnder, Score } from "./types";
import { scoreBoosted, type BoostedScore, type BoostType } from "./boosts";

/** Points per market outcome. */
export const SCORER_HIT = 4;
export const SCORER_MISS = -2;
export const OU_HIT = 2;
export const BTTS_HIT = 2;

/** Most-played O/U line. */
export const OU_LINE = 2.5;

/** Max goalscorer picks per prediction (mirrors the DB constraint). */
export const MAX_SCORERS = 5;

export interface MarketPicks {
  /** Predicted scorer player ids. */
  scorers: number[];
  ou25: OverUnder | null;
  btts: BttsPick | null;
}

export interface MarketOutcome {
  score: Score;
  /** Player ids that scored a real goal (own goals excluded). */
  scorerIds: number[];
}

export interface MarketScore {
  points: number;
  scorerHits: number;
  scorerMisses: number;
  ouHit: boolean;
  bttsHit: boolean;
}

/** Score the side markets against the final outcome. */
export function scoreMarkets(
  picks: MarketPicks,
  outcome: MarketOutcome,
): MarketScore {
  const scored = new Set(outcome.scorerIds);
  let scorerHits = 0;
  let scorerMisses = 0;
  for (const id of picks.scorers) {
    if (scored.has(id)) scorerHits++;
    else scorerMisses++;
  }

  const total = outcome.score.home + outcome.score.away;
  const ouHit =
    picks.ou25 != null &&
    ((picks.ou25 === "over" && total > OU_LINE) ||
      (picks.ou25 === "under" && total < OU_LINE));

  const bothScored = outcome.score.home > 0 && outcome.score.away > 0;
  const bttsHit =
    picks.btts != null &&
    ((picks.btts === "yes" && bothScored) ||
      (picks.btts === "no" && !bothScored));

  const points =
    scorerHits * SCORER_HIT +
    scorerMisses * SCORER_MISS +
    (ouHit ? OU_HIT : 0) +
    (bttsHit ? BTTS_HIT : 0);

  return { points, scorerHits, scorerMisses, ouHit, bttsHit };
}

export interface FullScore extends BoostedScore {
  /** Net market points (can be negative before the floor). */
  marketPoints: number;
}

/**
 * Full prediction score: boosted base score + market points, floored at 0.
 * `basePoints` and `exact` keep the base meaning (drive the exact-score count).
 */
export function scoreFull({
  primary,
  secondary,
  actual,
  boost,
  picks,
  outcome,
}: {
  primary: Score;
  secondary?: Score | null;
  actual: Score;
  boost: BoostType | null;
  picks?: MarketPicks | null;
  outcome?: MarketOutcome | null;
}): FullScore {
  const base = scoreBoosted({ primary, secondary, actual, boost });
  const marketPoints =
    picks && outcome ? scoreMarkets(picks, outcome).points : 0;
  return {
    ...base,
    marketPoints,
    points: Math.max(0, base.points + marketPoints),
  };
}
