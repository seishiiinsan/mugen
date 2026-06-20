import { describe, expect, it } from "vitest";
import { bucketLabel, hitRate, POINTS_BUCKETS, scoreTone } from "./player-stats";

describe("scoreTone", () => {
  it("marks an exact score (10)", () => {
    expect(scoreTone(10)).toBe("exact");
    expect(scoreTone(12)).toBe("exact"); // boosted base never exceeds 10, but guard anyway
  });

  it("marks any other positive base as a hit", () => {
    for (const b of [6, 4, 3, 2, 1]) expect(scoreTone(b)).toBe("hit");
  });

  it("marks 0 (or less) as a miss", () => {
    expect(scoreTone(0)).toBe("miss");
    expect(scoreTone(-1)).toBe("miss");
  });
});

describe("bucketLabel", () => {
  it("labels the known buckets", () => {
    expect(bucketLabel(10)).toBe("Score exact");
    expect(bucketLabel(3)).toBe("Nul exact");
    expect(bucketLabel(0)).toBe("Manqué");
  });

  it("falls back for an unknown value", () => {
    expect(bucketLabel(7)).toBe("7 pts");
  });
});

describe("hitRate", () => {
  it("returns 0 for no predictions (no division by zero)", () => {
    expect(hitRate(0, 0)).toBe(0);
  });

  it("computes the share of hits", () => {
    expect(hitRate(3, 6)).toBe(0.5);
    expect(hitRate(5, 5)).toBe(1);
  });
});

describe("POINTS_BUCKETS", () => {
  it("is ordered high → low and covers the scoring tiers", () => {
    expect([...POINTS_BUCKETS]).toEqual([10, 6, 4, 3, 2, 0]);
  });
});
