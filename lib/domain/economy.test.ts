import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  type AchievementStats,
  DAILY_BONUS,
  levelFromXp,
  monthlyRewardBadge,
  monthlyRewardCoins,
  rarityOf,
} from "./economy";

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toEqual({ level: 1, current: 0, needed: 100, total: 0 });
  });

  it("clamps negative XP to 0", () => {
    expect(levelFromXp(-500)).toMatchObject({ level: 1, current: 0, total: 0 });
  });

  it("floors fractional XP", () => {
    expect(levelFromXp(150.9)).toMatchObject({ level: 2, current: 50, total: 150 });
  });

  it("does not level up just below a threshold", () => {
    expect(levelFromXp(99)).toMatchObject({ level: 1, current: 99, needed: 100 });
    expect(levelFromXp(299)).toMatchObject({ level: 2, current: 199, needed: 200 });
  });

  it("levels up exactly at each cumulative threshold (100·L per level)", () => {
    // total to reach level N = 100 · (N-1)·N/2
    expect(levelFromXp(100)).toMatchObject({ level: 2, current: 0, needed: 200 });
    expect(levelFromXp(300)).toMatchObject({ level: 3, current: 0, needed: 300 });
    expect(levelFromXp(600)).toMatchObject({ level: 4, current: 0, needed: 400 });
    expect(levelFromXp(1000)).toMatchObject({ level: 5, current: 0, needed: 500 });
  });

  it("keeps current < needed and is monotonic in level", () => {
    let prev = 1;
    for (let xp = 0; xp <= 5000; xp += 37) {
      const lvl = levelFromXp(xp);
      expect(lvl.current).toBeGreaterThanOrEqual(0);
      expect(lvl.current).toBeLessThan(lvl.needed);
      expect(lvl.level).toBeGreaterThanOrEqual(prev);
      prev = lvl.level;
    }
  });
});

describe("rarityOf", () => {
  it("maps price ranges to tiers at the boundaries", () => {
    expect(rarityOf(0).tier).toBe("common");
    expect(rarityOf(499).tier).toBe("common");
    expect(rarityOf(500).tier).toBe("rare");
    expect(rarityOf(1499).tier).toBe("rare");
    expect(rarityOf(1500).tier).toBe("epic");
    expect(rarityOf(3999).tier).toBe("epic");
    expect(rarityOf(4000).tier).toBe("legendary");
  });
});

describe("monthly leaderboard rewards", () => {
  it("pays coins by rank bracket", () => {
    expect(monthlyRewardCoins(1)).toBe(500);
    expect(monthlyRewardCoins(2)).toBe(300);
    expect(monthlyRewardCoins(3)).toBe(200);
    expect(monthlyRewardCoins(4)).toBe(100);
    expect(monthlyRewardCoins(10)).toBe(100);
    expect(monthlyRewardCoins(11)).toBe(50);
    expect(monthlyRewardCoins(50)).toBe(50);
    expect(monthlyRewardCoins(51)).toBe(0);
  });

  it("grants a podium badge to the top 3 only", () => {
    expect(monthlyRewardBadge(1)).toBe("badge_month_gold");
    expect(monthlyRewardBadge(2)).toBe("badge_month_silver");
    expect(monthlyRewardBadge(3)).toBe("badge_month_bronze");
    expect(monthlyRewardBadge(4)).toBeNull();
  });
});

describe("ACHIEVEMENTS", () => {
  const zero: AchievementStats = {
    settled: 0,
    exacts: 0,
    scorerHits: 0,
    friends: 0,
    cosmetics: 0,
    coinsSpent: 0,
  };
  const byKey = (k: string) => ACHIEVEMENTS.find((a) => a.key === k)!;

  it("has unique keys and badges", () => {
    const keys = ACHIEVEMENTS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    const badges = ACHIEVEMENTS.map((a) => a.badge).filter(Boolean);
    expect(new Set(badges).size).toBe(badges.length);
  });

  it("unlocks exactly at each threshold", () => {
    expect(byKey("first_prediction").test(zero)).toBe(false);
    expect(byKey("first_prediction").test({ ...zero, settled: 1 })).toBe(true);

    expect(byKey("spend_500").test({ ...zero, coinsSpent: 499 })).toBe(false);
    expect(byKey("spend_500").test({ ...zero, coinsSpent: 500 })).toBe(true);

    expect(byKey("friends_5").test({ ...zero, friends: 4 })).toBe(false);
    expect(byKey("friends_5").test({ ...zero, friends: 5 })).toBe(true);
  });
});

describe("economy constants", () => {
  it("keeps the daily bonus positive", () => {
    expect(DAILY_BONUS).toBeGreaterThan(0);
  });
});
