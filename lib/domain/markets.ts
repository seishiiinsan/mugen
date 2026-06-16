// Mugen — goalscorer market layered on top of the exact-score engine.
//
// Pure and deterministic. A correct goalscorer pick is worth more the rarer the
// role (a defender or keeper scoring is unlikely); a wrong pick always costs 2
// (anti-spam). Scorer points are added AFTER any boost (which only multiplies
// the base score), then the per-match total is floored at 0 so a prediction can
// never cost a player points overall.

import type { ScorerPick, Score } from "./types";
import { scoreBoosted, type BoostedScore, type BoostType } from "./boosts";

/** Penalty for a wrong goalscorer pick. */
export const SCORER_MISS = -2;

/**
 * Points for a correct goalscorer, by lineup role. Rarer scorers pay more.
 * Keys are Bzzoiro role letters; anything unknown falls back to the forward
 * value. Tune here — the rest of the app reads `scorerHitPoints`.
 */
export const SCORER_HIT_BY_ROLE: Record<string, number> = {
  G: 10, // gardien
  D: 7, //  défenseur
  M: 5, //  milieu
  F: 4, //  attaquant
};
export const SCORER_HIT_DEFAULT = 4;

export function scorerHitPoints(position: string): number {
  return SCORER_HIT_BY_ROLE[position?.toUpperCase?.() ?? ""] ?? SCORER_HIT_DEFAULT;
}

/** Max goalscorer picks per prediction (mirrors the DB constraint). */
export const MAX_SCORERS = 5;

export interface MarketOutcome {
  score: Score;
  /** Player ids that scored a real goal (own goals excluded). */
  scorerIds: number[];
}

export interface MarketScore {
  points: number;
  hits: number;
  misses: number;
}

/** Score the goalscorer picks against the actual scorers. */
export function scoreScorers(
  picks: ScorerPick[],
  outcome: MarketOutcome,
): MarketScore {
  const scored = new Set(outcome.scorerIds);
  let points = 0;
  let hits = 0;
  let misses = 0;
  for (const pick of picks) {
    if (scored.has(pick.id)) {
      points += scorerHitPoints(pick.position);
      hits++;
    } else {
      points += SCORER_MISS;
      misses++;
    }
  }
  return { points, hits, misses };
}

export interface FullScore extends BoostedScore {
  /** Net scorer points (can be negative before the floor). */
  marketPoints: number;
}

/**
 * Full prediction score: boosted base score + goalscorer points, floored at 0.
 * `basePoints` and `exact` keep the base meaning (drive the exact-score count).
 */
export function scoreFull({
  primary,
  secondary,
  actual,
  boost,
  scorers,
  outcome,
}: {
  primary: Score;
  secondary?: Score | null;
  actual: Score;
  boost: BoostType | null;
  scorers?: ScorerPick[] | null;
  outcome?: MarketOutcome | null;
}): FullScore {
  const base = scoreBoosted({ primary, secondary, actual, boost });
  const marketPoints =
    scorers && scorers.length && outcome
      ? scoreScorers(scorers, outcome).points
      : 0;
  return {
    ...base,
    marketPoints,
    points: Math.max(0, base.points + marketPoints),
  };
}
