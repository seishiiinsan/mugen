import { describe, expect, it } from "vitest";
import { POINTS, SCORING_RULES, scorePrediction } from "./scoring";

const s = (home: number, away: number) => ({ home, away });

describe("scorePrediction — Cahier des charges §2.4", () => {
  it("exact score → 10", () => {
    expect(scorePrediction(s(3, 1), s(3, 1))).toBe(POINTS.EXACT);
    expect(scorePrediction(s(0, 0), s(0, 0))).toBe(POINTS.EXACT);
  });

  it("right winner, goal diff off by 1 → 6 (spec example 4-1 / 3-1)", () => {
    expect(scorePrediction(s(4, 1), s(3, 1))).toBe(POINTS.RIGHT_WINNER_DIFF_CLOSE);
  });

  it("right winner, medium goal-diff error (2–3) → 4 (spec example 5-0 / 3-1)", () => {
    // 5-0 diff 5 vs 3-1 diff 2 → error 3.
    expect(scorePrediction(s(5, 0), s(3, 1))).toBe(POINTS.RIGHT_WINNER_DIFF_MEDIUM);
    // error exactly 2.
    expect(scorePrediction(s(4, 0), s(2, 0))).toBe(POINTS.RIGHT_WINNER_DIFF_MEDIUM);
  });

  it("right winner, far goal-diff error (>= 4) → 2 (spec example 6-0 / 1-0)", () => {
    // 6-0 diff 6 vs 1-0 diff 1 → error 5.
    expect(scorePrediction(s(6, 0), s(1, 0))).toBe(POINTS.RIGHT_WINNER_DIFF_FAR);
  });

  it("draw predicted and real draw (different score) → 3", () => {
    expect(scorePrediction(s(1, 1), s(0, 0))).toBe(POINTS.CORRECT_DRAW);
    expect(scorePrediction(s(2, 2), s(1, 1))).toBe(POINTS.CORRECT_DRAW);
  });

  it("wrong outcome → 0, however close the scoreline", () => {
    expect(scorePrediction(s(2, 0), s(0, 2))).toBe(POINTS.WRONG);
    expect(scorePrediction(s(1, 0), s(0, 1))).toBe(POINTS.WRONG); // off by one goal each side
    expect(scorePrediction(s(1, 1), s(2, 0))).toBe(POINTS.WRONG); // predicted draw, real win
  });

  // The spec table is internally contradictory (documented at the top of
  // scoring.ts). "2-0 / 1-0" is structurally identical to "4-1 / 3-1" (winner
  // correct, goal diff off by exactly 1) yet the table prints 2 instead of 6.
  // The engine follows the spec's authoritative NOTE (within-1 ⇒ 6) and the
  // 5/6 consistent examples, so it returns 6 here. This test pins that decision
  // so a future "fix" toward the buggy table value is a conscious choice.
  describe("documented spec inconsistency (2-0 / 1-0)", () => {
    it("scores 6 (NOTE-consistent), NOT the table's 2", () => {
      expect(scorePrediction(s(2, 0), s(1, 0))).toBe(POINTS.RIGHT_WINNER_DIFF_CLOSE);
      expect(scorePrediction(s(2, 0), s(1, 0))).not.toBe(POINTS.RIGHT_WINNER_DIFF_FAR);
    });
  });

  it("is symmetric for away wins", () => {
    expect(scorePrediction(s(0, 2), s(0, 1))).toBe(POINTS.RIGHT_WINNER_DIFF_CLOSE);
    expect(scorePrediction(s(1, 3), s(1, 3))).toBe(POINTS.EXACT);
  });

  it("grades the goal-diff error at the tier boundaries", () => {
    // error 1 → close
    expect(scorePrediction(s(3, 0), s(2, 0))).toBe(POINTS.RIGHT_WINNER_DIFF_CLOSE);
    // error 3 → still medium
    expect(scorePrediction(s(5, 1), s(1, 0))).toBe(POINTS.RIGHT_WINNER_DIFF_MEDIUM);
    // error 4 → far
    expect(scorePrediction(s(5, 0), s(1, 0))).toBe(POINTS.RIGHT_WINNER_DIFF_FAR);
  });
});

describe("POINTS / SCORING_RULES", () => {
  it("exposes the documented tiers", () => {
    expect(POINTS).toMatchObject({
      EXACT: 10,
      RIGHT_WINNER_DIFF_CLOSE: 6,
      RIGHT_WINNER_DIFF_MEDIUM: 4,
      RIGHT_WINNER_DIFF_FAR: 2,
      CORRECT_DRAW: 3,
      WRONG: 0,
    });
  });

  it("every displayed rule maps to a real POINTS tier", () => {
    const tiers = new Set<number>(Object.values(POINTS));
    for (const rule of SCORING_RULES) {
      expect(tiers.has(rule.points)).toBe(true);
    }
  });
});
