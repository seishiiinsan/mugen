import { describe, expect, it } from "vitest";
import {
  activeLeaderboardMonth,
  BOOST_TYPES,
  leaderboardMonth,
  MONTH_GRACE_HOURS,
  scoreBoosted,
} from "./boosts";

const s = (home: number, away: number) => ({ home, away });

describe("leaderboardMonth", () => {
  it("formats the UTC month as YYYY-MM with zero padding", () => {
    expect(leaderboardMonth(new Date("2026-03-15T12:00:00Z"))).toBe("2026-03");
    expect(leaderboardMonth(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01");
    expect(leaderboardMonth(new Date("2026-12-31T23:59:59Z"))).toBe("2026-12");
  });

  it("accepts an ISO string", () => {
    expect(leaderboardMonth("2026-07-09T08:00:00Z")).toBe("2026-07");
  });
});

describe("activeLeaderboardMonth (grace window)", () => {
  it("keeps the outgoing month during the grace window after midnight UTC on the 1st", () => {
    // Within MONTH_GRACE_HOURS of the rollover → still the previous month.
    expect(activeLeaderboardMonth(new Date("2026-03-01T02:00:00Z"))).toBe("2026-02");
  });

  it("switches to the new month once the grace window has elapsed", () => {
    expect(activeLeaderboardMonth(new Date("2026-03-01T04:00:00Z"))).toBe("2026-03");
  });

  it("is unaffected mid-month", () => {
    expect(activeLeaderboardMonth(new Date("2026-03-15T00:00:00Z"))).toBe("2026-03");
  });

  it("uses a 3-hour grace, matching migration 0006", () => {
    expect(MONTH_GRACE_HOURS).toBe(3);
  });
});

describe("scoreBoosted", () => {
  const exact = { primary: s(3, 1), actual: s(3, 1) }; // base 10
  const closeWin = { primary: s(4, 1), actual: s(3, 1) }; // base 6

  it("no boost → credits the raw base score", () => {
    expect(scoreBoosted({ ...closeWin, boost: null })).toEqual({
      points: 6,
      basePoints: 6,
      exact: false,
    });
    expect(scoreBoosted({ ...exact, boost: null })).toEqual({
      points: 10,
      basePoints: 10,
      exact: true,
    });
  });

  it("double_points doubles the credited points but keeps basePoints raw", () => {
    expect(scoreBoosted({ ...closeWin, boost: "double_points" })).toEqual({
      points: 12,
      basePoints: 6,
      exact: false,
    });
    expect(scoreBoosted({ ...exact, boost: "double_points" })).toMatchObject({
      points: 20,
      basePoints: 10,
      exact: true,
    });
  });

  it("banco triples an exact score, otherwise zeroes the match", () => {
    expect(scoreBoosted({ ...exact, boost: "banco" })).toEqual({
      points: 30,
      basePoints: 10,
      exact: true,
    });
    expect(scoreBoosted({ ...closeWin, boost: "banco" })).toEqual({
      points: 0,
      basePoints: 6,
      exact: false,
    });
  });

  it("double_chance keeps the better of the two predictions", () => {
    const result = scoreBoosted({
      primary: s(4, 1), // base 6
      secondary: s(3, 1), // base 10 (exact) — the better one
      actual: s(3, 1),
      boost: "double_chance",
    });
    expect(result).toEqual({ points: 10, basePoints: 10, exact: true });
  });

  it("double_chance falls back to the primary when no secondary is given", () => {
    expect(
      scoreBoosted({ primary: s(4, 1), secondary: null, actual: s(3, 1), boost: "double_chance" }),
    ).toEqual({ points: 6, basePoints: 6, exact: false });
  });
});

describe("BOOST_TYPES", () => {
  it("lists the three monthly boosts", () => {
    expect([...BOOST_TYPES]).toEqual(["double_points", "double_chance", "banco"]);
  });
});
