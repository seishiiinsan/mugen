// Mugen — in-game economy rules (pure, shared by server logic and UI).
//
// Currency is earned by playing and spent on cosmetics only (no competitive
// advantage). All amounts are tunable here.

/** Coins awarded per point earned on a settled prediction. */
export const COINS_PER_POINT = 1;

/** XP awarded per point earned (lifetime). XP is computed, never stored. */
export const XP_PER_POINT = 10;

export interface Level {
  level: number;
  /** XP accumulated within the current level. */
  current: number;
  /** XP needed to clear the current level. */
  needed: number;
  /** Total lifetime XP. */
  total: number;
}

/**
 * Level from total XP. Each level costs a bit more than the last
 * (level L → L+1 needs 100·L XP), so progression slows gracefully.
 */
export function levelFromXp(xp: number): Level {
  const total = Math.max(0, Math.floor(xp));
  let level = 1;
  let acc = 0;
  let needed = 100;
  while (total >= acc + needed) {
    acc += needed;
    level += 1;
    needed = 100 * level;
  }
  return { level, current: total - acc, needed, total };
}

/** Cosmetic rarity tier derived from its price (drives shop styling). */
export type Rarity = "common" | "rare" | "epic" | "legendary";

export function rarityOf(price: number): { tier: Rarity; label: string } {
  if (price >= 4000) return { tier: "legendary", label: "Légendaire" };
  if (price >= 1500) return { tier: "epic", label: "Épique" };
  if (price >= 500) return { tier: "rare", label: "Rare" };
  return { tier: "common", label: "Commun" };
}

/** Flat daily login bonus (claimable once per UTC day). */
export const DAILY_BONUS = 20;

/** Monthly leaderboard payout by final rank (coins). */
export function monthlyRewardCoins(rank: number): number {
  if (rank === 1) return 500;
  if (rank === 2) return 300;
  if (rank === 3) return 200;
  if (rank <= 10) return 100;
  if (rank <= 50) return 50;
  return 0;
}

/** Exclusive badge item granted to the monthly podium (item key), else null. */
export function monthlyRewardBadge(rank: number): string | null {
  if (rank === 1) return "badge_month_gold";
  if (rank === 2) return "badge_month_silver";
  if (rank === 3) return "badge_month_bronze";
  return null;
}

/** Lifetime stats an achievement is tested against. */
export interface AchievementStats {
  /** Settled predictions (points not null). */
  settled: number;
  /** Lifetime exact scores (base_points = 10). */
  exacts: number;
}

export interface Achievement {
  key: string;
  name: string;
  description: string;
  /** Coins awarded on unlock. */
  coins: number;
  /** XP awarded on unlock. */
  xp: number;
  /** Cosmetic badge item granted on unlock (item key), if any. */
  badge: string | null;
  /** Met by these lifetime stats? */
  test: (s: AchievementStats) => boolean;
}

/** Auto-unlocked achievements, checked after each settle. */
export const ACHIEVEMENTS: Achievement[] = [
  {
    key: "first_prediction",
    name: "Premier pronostic",
    description: "Soumettre et régler un premier pronostic.",
    coins: 20,
    xp: 50,
    badge: null,
    test: (s) => s.settled >= 1,
  },
  {
    key: "played_10",
    name: "10 pronostics",
    description: "Régler dix pronostics.",
    coins: 50,
    xp: 100,
    badge: "badge_played_10",
    test: (s) => s.settled >= 10,
  },
  {
    key: "first_exact",
    name: "Premier score exact",
    description: "Trouver un premier score exact.",
    coins: 50,
    xp: 150,
    badge: "badge_first_exact",
    test: (s) => s.exacts >= 1,
  },
  {
    key: "exact_10",
    name: "10 scores exacts",
    description: "Cumuler dix scores exacts.",
    coins: 150,
    xp: 400,
    badge: "badge_exact_10",
    test: (s) => s.exacts >= 10,
  },
  {
    key: "exact_25",
    name: "25 scores exacts",
    description: "Cumuler vingt-cinq scores exacts.",
    coins: 300,
    xp: 900,
    badge: "badge_exact_25",
    test: (s) => s.exacts >= 25,
  },
  {
    key: "played_50",
    name: "50 pronostics",
    description: "Régler cinquante pronostics.",
    coins: 100,
    xp: 300,
    badge: "badge_played_50",
    test: (s) => s.settled >= 50,
  },
  {
    key: "played_100",
    name: "100 pronostics",
    description: "Régler cent pronostics.",
    coins: 250,
    xp: 700,
    badge: "badge_played_100",
    test: (s) => s.settled >= 100,
  },
];
