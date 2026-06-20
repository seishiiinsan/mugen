// Mugen — pronostiqueur dashboard helpers (pure, shared by server & UI).
//
// The heavy aggregation runs in SQL (`player_stats()`); this module holds the
// small, tested bits the UI shares: classifying a base score into a tier/tone
// (form pills + distribution bars) and a guarded hit-rate. Skill metrics use
// base_points (the un-boosted score), so the buckets mirror the scoring tiers
// already shown on the profile page.

/** Base-score buckets, high → low (drives the distribution chart order). */
export const POINTS_BUCKETS = [10, 6, 4, 3, 2, 0] as const;

/** Coarse outcome tone for a base score — drives form pills & bar colours. */
export type ScoreTone = "exact" | "hit" | "miss";

const BUCKET_LABELS: Record<number, string> = {
  10: "Score exact",
  6: "Bon vainqueur, écart ≤ 1",
  4: "Bon vainqueur, écart moyen",
  3: "Nul exact",
  2: "Bon vainqueur, écart éloigné",
  0: "Manqué",
};

/** Exact (10), any other positive score is a hit, 0 (or less) is a miss. */
export function scoreTone(base: number): ScoreTone {
  if (base >= 10) return "exact";
  if (base > 0) return "hit";
  return "miss";
}

/** Human label for a base-score bucket (falls back to "N pts"). */
export function bucketLabel(base: number): string {
  return BUCKET_LABELS[base] ?? `${base} pts`;
}

/** Share of hits over settled predictions, in [0,1]. Guards division by zero. */
export function hitRate(hits: number, total: number): number {
  return total > 0 ? hits / total : 0;
}
