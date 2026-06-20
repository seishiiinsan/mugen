import { describe, expect, it } from "vitest";
import { SEASON_BADGE_KEY, type SeasonTierThreshold, tiersReached } from "./season";

const TIERS: SeasonTierThreshold[] = [
  { tier: 1, minPoints: 30 },
  { tier: 2, minPoints: 80 },
  { tier: 3, minPoints: 150 },
  { tier: 4, minPoints: 250 },
  { tier: 5, minPoints: 400 },
];

describe("tiersReached", () => {
  it("counts no tier below the first threshold", () => {
    expect(tiersReached(0, TIERS)).toBe(0);
    expect(tiersReached(29, TIERS)).toBe(0);
  });

  it("counts a tier exactly at its threshold", () => {
    expect(tiersReached(30, TIERS)).toBe(1);
    expect(tiersReached(400, TIERS)).toBe(5);
  });

  it("counts every cleared tier in between", () => {
    expect(tiersReached(150, TIERS)).toBe(3);
    expect(tiersReached(249, TIERS)).toBe(3);
    expect(tiersReached(250, TIERS)).toBe(4);
  });

  it("is independent of tier ordering", () => {
    expect(tiersReached(160, [...TIERS].reverse())).toBe(3);
  });

  it("caps at the number of tiers for huge scores", () => {
    expect(tiersReached(99999, TIERS)).toBe(TIERS.length);
  });

  it("returns 0 for an empty catalogue", () => {
    expect(tiersReached(500, [])).toBe(0);
  });
});

describe("season constants", () => {
  it("exposes the repeatable season badge key", () => {
    expect(SEASON_BADGE_KEY).toBe("badge_season");
  });
});
