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
  /** Lifetime correct goalscorer picks (sum of predictions.scorer_hits). */
  scorerHits: number;
  /** Accepted friendships. */
  friends: number;
  /** Owned cosmetics (frames/titles/colors — badges excluded). */
  cosmetics: number;
  /** Lifetime coins spent in the shop. */
  coinsSpent: number;
}

/** Theme an achievement belongs to — drives the tabs on the achievements page. */
export type AchievementCategory =
  | "predictions"
  | "scorers"
  | "friends"
  | "cosmetics"
  | "economy";

/** Ordered tab labels for the achievements page. */
export const ACHIEVEMENT_CATEGORIES: {
  key: AchievementCategory;
  label: string;
}[] = [
  { key: "predictions", label: "Pronostics" },
  { key: "scorers", label: "Buteurs" },
  { key: "friends", label: "Amis" },
  { key: "cosmetics", label: "Cosmétiques" },
  { key: "economy", label: "Monnaie" },
];

export interface Achievement {
  key: string;
  name: string;
  description: string;
  /** Theme bucket (tabs). */
  category: AchievementCategory;
  /** Coins awarded on unlock. */
  coins: number;
  /** XP awarded on unlock. */
  xp: number;
  /** Cosmetic badge item granted on unlock (item key), if any. */
  badge: string | null;
  /** Met by these lifetime stats? */
  test: (s: AchievementStats) => boolean;
}

/** Auto-unlocked achievements, checked after each settle / backfill scan. */
export const ACHIEVEMENTS: Achievement[] = [
  // --- Pronostics -----------------------------------------------------------
  {
    key: "first_prediction",
    name: "Premier pronostic",
    description: "Soumettre et régler un premier pronostic.",
    category: "predictions",
    coins: 20,
    xp: 50,
    badge: "badge_first_prediction",
    test: (s) => s.settled >= 1,
  },
  {
    key: "played_10",
    name: "10 pronostics",
    description: "Régler dix pronostics.",
    category: "predictions",
    coins: 50,
    xp: 100,
    badge: "badge_played_10",
    test: (s) => s.settled >= 10,
  },
  {
    key: "first_exact",
    name: "Premier score exact",
    description: "Trouver un premier score exact.",
    category: "predictions",
    coins: 50,
    xp: 150,
    badge: "badge_first_exact",
    test: (s) => s.exacts >= 1,
  },
  {
    key: "exact_10",
    name: "10 scores exacts",
    description: "Cumuler dix scores exacts.",
    category: "predictions",
    coins: 150,
    xp: 400,
    badge: "badge_exact_10",
    test: (s) => s.exacts >= 10,
  },
  {
    key: "exact_25",
    name: "25 scores exacts",
    description: "Cumuler vingt-cinq scores exacts.",
    category: "predictions",
    coins: 300,
    xp: 900,
    badge: "badge_exact_25",
    test: (s) => s.exacts >= 25,
  },
  {
    key: "played_50",
    name: "50 pronostics",
    description: "Régler cinquante pronostics.",
    category: "predictions",
    coins: 100,
    xp: 300,
    badge: "badge_played_50",
    test: (s) => s.settled >= 50,
  },
  {
    key: "played_100",
    name: "100 pronostics",
    description: "Régler cent pronostics.",
    category: "predictions",
    coins: 250,
    xp: 700,
    badge: "badge_played_100",
    test: (s) => s.settled >= 100,
  },

  // --- Buteurs --------------------------------------------------------------
  {
    key: "scorer_first",
    name: "Premier bon buteur",
    description: "Trouver un premier buteur.",
    category: "scorers",
    coins: 40,
    xp: 120,
    badge: "badge_scorer_first",
    test: (s) => s.scorerHits >= 1,
  },
  {
    key: "scorer_10",
    name: "10 buteurs trouvés",
    description: "Trouver dix buteurs au total.",
    category: "scorers",
    coins: 120,
    xp: 350,
    badge: "badge_scorer_10",
    test: (s) => s.scorerHits >= 10,
  },
  {
    key: "scorer_25",
    name: "25 buteurs trouvés",
    description: "Trouver vingt-cinq buteurs au total.",
    category: "scorers",
    coins: 250,
    xp: 750,
    badge: "badge_scorer_25",
    test: (s) => s.scorerHits >= 25,
  },
  {
    key: "scorer_50",
    name: "50 buteurs trouvés",
    description: "Trouver cinquante buteurs au total.",
    category: "scorers",
    coins: 500,
    xp: 1500,
    badge: "badge_scorer_50",
    test: (s) => s.scorerHits >= 50,
  },

  // --- Amis -----------------------------------------------------------------
  {
    key: "friend_first",
    name: "Premier ami",
    description: "Ajouter un premier ami.",
    category: "friends",
    coins: 30,
    xp: 80,
    badge: "badge_friend_first",
    test: (s) => s.friends >= 1,
  },
  {
    key: "friends_5",
    name: "5 amis",
    description: "Compter cinq amis.",
    category: "friends",
    coins: 80,
    xp: 200,
    badge: "badge_friends_5",
    test: (s) => s.friends >= 5,
  },
  {
    key: "friends_10",
    name: "10 amis",
    description: "Compter dix amis.",
    category: "friends",
    coins: 150,
    xp: 400,
    badge: "badge_friends_10",
    test: (s) => s.friends >= 10,
  },
  {
    key: "friends_25",
    name: "25 amis",
    description: "Compter vingt-cinq amis.",
    category: "friends",
    coins: 350,
    xp: 1000,
    badge: "badge_friends_25",
    test: (s) => s.friends >= 25,
  },

  // --- Cosmétiques ----------------------------------------------------------
  {
    key: "cosmetic_first",
    name: "Premier cosmétique",
    description: "Posséder un premier cosmétique.",
    category: "cosmetics",
    coins: 30,
    xp: 80,
    badge: "badge_cosmetic_first",
    test: (s) => s.cosmetics >= 1,
  },
  {
    key: "cosmetic_5",
    name: "Collectionneur",
    description: "Posséder cinq cosmétiques.",
    category: "cosmetics",
    coins: 120,
    xp: 300,
    badge: "badge_cosmetic_5",
    test: (s) => s.cosmetics >= 5,
  },
  {
    key: "cosmetic_15",
    name: "Garde-robe garnie",
    description: "Posséder quinze cosmétiques.",
    category: "cosmetics",
    coins: 300,
    xp: 800,
    badge: "badge_cosmetic_15",
    test: (s) => s.cosmetics >= 15,
  },

  // --- Monnaie --------------------------------------------------------------
  {
    key: "spend_500",
    name: "Premiers achats",
    description: "Dépenser 500 pièces en cosmétiques.",
    category: "economy",
    coins: 50,
    xp: 120,
    badge: "badge_spend_500",
    test: (s) => s.coinsSpent >= 500,
  },
  {
    key: "spend_2000",
    name: "Bon client",
    description: "Dépenser 2 000 pièces en cosmétiques.",
    category: "economy",
    coins: 120,
    xp: 350,
    badge: "badge_spend_2000",
    test: (s) => s.coinsSpent >= 2000,
  },
  {
    key: "spend_5000",
    name: "Grand dépensier",
    description: "Dépenser 5 000 pièces en cosmétiques.",
    category: "economy",
    coins: 250,
    xp: 750,
    badge: "badge_spend_5000",
    test: (s) => s.coinsSpent >= 5000,
  },
  {
    key: "spend_10000",
    name: "Magnat de la mode",
    description: "Dépenser 10 000 pièces en cosmétiques.",
    category: "economy",
    coins: 500,
    xp: 1500,
    badge: "badge_spend_10000",
    test: (s) => s.coinsSpent >= 10000,
  },
];
