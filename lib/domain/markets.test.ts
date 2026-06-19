import { describe, expect, it } from "vitest";
import type { ScorerPick } from "./types";
import {
  type MarketOutcome,
  normalizeScorerName,
  SCORER_MISS,
  scorerHitPoints,
  scoreFull,
  scoreScorers,
} from "./markets";

const pick = (id: number, name: string, position: string): ScorerPick => ({
  id,
  name,
  position,
});

describe("normalizeScorerName", () => {
  it("strips accents, lowercases and collapses whitespace", () => {
    expect(normalizeScorerName("K. Mbappé")).toBe("k. mbappe");
    expect(normalizeScorerName("  Erling   Haaland ")).toBe("erling haaland");
    expect(normalizeScorerName("ÁÑÖ")).toBe("ano");
  });

  it("makes cross-feed spellings of the same player compare equal", () => {
    expect(normalizeScorerName("Vinícius Júnior")).toBe(
      normalizeScorerName("VINICIUS JUNIOR"),
    );
  });
});

describe("scorerHitPoints", () => {
  it("pays more for rarer roles", () => {
    expect(scorerHitPoints("G")).toBe(10);
    expect(scorerHitPoints("D")).toBe(7);
    expect(scorerHitPoints("M")).toBe(5);
    expect(scorerHitPoints("F")).toBe(4);
  });

  it("is case-insensitive and falls back to the forward value", () => {
    expect(scorerHitPoints("g")).toBe(10);
    expect(scorerHitPoints("striker")).toBe(4); // unknown role
    expect(scorerHitPoints("")).toBe(4);
  });
});

describe("scoreScorers", () => {
  it("matches by id", () => {
    const picks = [pick(1, "A", "F"), pick(2, "B", "G"), pick(3, "C", "M")];
    const outcome: MarketOutcome = { score: { home: 2, away: 1 }, scorerIds: [1, 2] };
    // 4 (F hit) + 10 (G hit) - 2 (M miss)
    expect(scoreScorers(picks, outcome)).toEqual({ points: 12, hits: 2, misses: 1 });
  });

  it("matches by normalized name when ids differ across feeds", () => {
    const picks = [pick(999, "K. Mbappé", "F")];
    const outcome: MarketOutcome = {
      score: { home: 1, away: 0 },
      scorerIds: [1], // id from a different id-space, no overlap
      scorerNames: ["k. mbappe"],
    };
    expect(scoreScorers(picks, outcome)).toEqual({ points: 4, hits: 1, misses: 0 });
  });

  it("penalizes every wrong pick by SCORER_MISS", () => {
    const picks = [pick(1, "A", "F"), pick(2, "B", "F")];
    const outcome: MarketOutcome = { score: { home: 0, away: 0 }, scorerIds: [] };
    expect(scoreScorers(picks, outcome)).toEqual({
      points: 2 * SCORER_MISS,
      hits: 0,
      misses: 2,
    });
  });
});

describe("scoreFull", () => {
  it("adds scorer points to the boosted base score", () => {
    const result = scoreFull({
      primary: { home: 3, away: 1 },
      actual: { home: 3, away: 1 }, // exact → base 10
      boost: null,
      scorers: [pick(1, "A", "F")],
      outcome: { score: { home: 3, away: 1 }, scorerIds: [1] },
    });
    expect(result.points).toBe(14); // 10 + 4
    expect(result.marketPoints).toBe(4);
    expect(result.basePoints).toBe(10);
    expect(result.exact).toBe(true);
  });

  it("applies the boost to the base only, then adds scorers", () => {
    const result = scoreFull({
      primary: { home: 3, away: 1 },
      actual: { home: 3, away: 1 }, // exact → base 10
      boost: "double_points", // base ×2 = 20
      scorers: [pick(1, "A", "F")],
      outcome: { score: { home: 3, away: 1 }, scorerIds: [1] },
    });
    expect(result.points).toBe(24); // 20 + 4
    expect(result.marketPoints).toBe(4);
    expect(result.basePoints).toBe(10);
  });

  it("floors the per-match total at 0 so misses never make it negative", () => {
    const result = scoreFull({
      primary: { home: 2, away: 0 },
      actual: { home: 0, away: 2 }, // wrong outcome → base 0
      boost: null,
      scorers: [pick(1, "A", "F"), pick(2, "B", "F")],
      outcome: { score: { home: 0, away: 2 }, scorerIds: [] }, // 2 misses → -4
    });
    expect(result.marketPoints).toBe(-4);
    expect(result.points).toBe(0);
  });

  it("ignores scorers when none are provided", () => {
    const result = scoreFull({
      primary: { home: 1, away: 0 },
      actual: { home: 1, away: 0 },
      boost: null,
      scorers: null,
      outcome: null,
    });
    expect(result.marketPoints).toBe(0);
    expect(result.points).toBe(10);
  });
});
