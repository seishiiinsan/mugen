// Mugen scoring engine.
//
// Pure, deterministic, dependency-free so it can run anywhere: when settling a
// fixture server-side, in unit tests, or to preview points in the UI.
//
// ---------------------------------------------------------------------------
// IMPORTANT — spec inconsistency (Cahier des charges §2.4)
// ---------------------------------------------------------------------------
// The points table in the spec is internally contradictory. Two examples that
// are structurally identical (prediction = actual with +1 goal to the winner)
// are given different scores:
//
//   • "4-1 predicted / 3-1 actual"  -> 6 pts  (goal-diff off by 1)
//   • "2-0 predicted / 1-0 actual"  -> 2 pts  (goal-diff off by 1)
//
// No single deterministic rule can satisfy both. The accompanying NOTE in the
// spec ("un écart de 1 but signifie que la différence prédite est à 1 but près
// de la différence réelle") authoritatively defines the 6-point tier as
// "correct winner + goal difference within 1 goal". We follow the NOTE and the
// majority of examples (5/6), treating the "2-0 / 1-0 -> 2" example as the bug.
//
// The full mapping is encoded below and is trivial to re-tune once the product
// owner confirms the intended table. See SCORING_RULES for the human-readable
// description surfaced in the UI.
// ---------------------------------------------------------------------------

import type { Score } from "./types";

export const POINTS = {
  EXACT: 10,
  CORRECT_DRAW: 3, // predicted a draw, real result a (different) draw
  RIGHT_WINNER_DIFF_CLOSE: 6, // correct winner, goal diff off by <= 1
  RIGHT_WINNER_DIFF_MEDIUM: 4, // correct winner, goal diff off by 2-3
  RIGHT_WINNER_DIFF_FAR: 2, // correct winner, goal diff off by >= 4
  WRONG: 0,
} as const;

export type PointsValue = (typeof POINTS)[keyof typeof POINTS];

type Outcome = "home" | "away" | "draw";

function outcome(s: Score): Outcome {
  if (s.home > s.away) return "home";
  if (s.home < s.away) return "away";
  return "draw";
}

/**
 * Compute the points a prediction earns against the final 90-minute score.
 *
 * @param prediction the user's predicted exact score
 * @param actual the settled 90-minute score (extra time / penalties excluded)
 */
export function scorePrediction(prediction: Score, actual: Score): PointsValue {
  // Exact score — top tier.
  if (prediction.home === actual.home && prediction.away === actual.away) {
    return POINTS.EXACT;
  }

  const predictedOutcome = outcome(prediction);
  const actualOutcome = outcome(actual);

  // Wrong outcome earns nothing — regardless of how close the scoreline was.
  if (predictedOutcome !== actualOutcome) {
    return POINTS.WRONG;
  }

  // Both predicted and real result are draws (and not the exact same score).
  if (actualOutcome === "draw") {
    return POINTS.CORRECT_DRAW;
  }

  // Correct winner: grade by how close the goal difference was.
  const predictedDiff = Math.abs(prediction.home - prediction.away);
  const actualDiff = Math.abs(actual.home - actual.away);
  const diffError = Math.abs(predictedDiff - actualDiff);

  if (diffError <= 1) return POINTS.RIGHT_WINNER_DIFF_CLOSE;
  if (diffError <= 3) return POINTS.RIGHT_WINNER_DIFF_MEDIUM;
  return POINTS.RIGHT_WINNER_DIFF_FAR;
}

/** Human-readable rules, for display on the app (e.g. a "comment ça marche" panel). */
export const SCORING_RULES: { label: string; example: string; points: PointsValue }[] = [
  { label: "Score exact", example: "Prédit 3-1 · Résultat 3-1", points: POINTS.EXACT },
  { label: "Bon vainqueur, écart à 1 but près", example: "Prédit 4-1 · Résultat 3-1", points: POINTS.RIGHT_WINNER_DIFF_CLOSE },
  { label: "Nul prédit et nul réel", example: "Prédit 1-1 · Résultat 0-0", points: POINTS.CORRECT_DRAW },
  { label: "Bon vainqueur, écart moyen", example: "Prédit 5-0 · Résultat 3-1", points: POINTS.RIGHT_WINNER_DIFF_MEDIUM },
  { label: "Bon vainqueur, écart éloigné", example: "Prédit 6-0 · Résultat 1-0", points: POINTS.RIGHT_WINNER_DIFF_FAR },
  { label: "Mauvais résultat", example: "Prédit 2-0 · Résultat 0-2", points: POINTS.WRONG },
];
