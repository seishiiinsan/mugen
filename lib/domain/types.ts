// Core domain model for Mugen (web).
// Kept framework-agnostic so it can be reused by Server Components,
// Server Actions, route handlers, and (later) scheduled jobs.

export type FixtureStatus =
  | "upcoming" // À venir
  | "live" // En cours
  | "finished" // Terminé
  | "cancelled" // Annulé
  | "postponed"; // Reporté

export interface Team {
  id: number;
  name: string;
  logoUrl?: string;
}

export interface League {
  id: number;
  name: string;
  country?: string;
  logoUrl?: string;
}

/** A football match, mirroring the data we need from API-Football `/fixtures`. */
export interface Fixture {
  id: number;
  league: League;
  home: Team;
  away: Team;
  venue?: string;
  /** ISO-8601 kickoff time (UTC). */
  kickoff: string;
  status: FixtureStatus;
  /** Minutes played, when live. */
  elapsed?: number;
  /**
   * Reference score at 90 min only — extra time and penalties are excluded
   * per the spec. `null` until the match has a meaningful score.
   */
  score: Score | null;
}

export interface Score {
  home: number;
  away: number;
}

/** The three monthly power-ups a player can attach to a prediction. */
export type BoostType = "double_points" | "double_chance" | "banco";

/** A user's single prediction for a fixture (exact score). */
export interface Prediction {
  fixtureId: number;
  userId: string;
  home: number;
  away: number;
  /** ISO-8601 timestamp of last edit. */
  submittedAt: string;
  /** Points awarded once the fixture is settled; null while pending. */
  points: number | null;
  /** Attached boost, or null. */
  boost: BoostType | null;
  /** Second predicted score — only set for the `double_chance` boost. */
  secondary: Score | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  points: number;
  /** Monthly exact-score count, handy for tie-break display. */
  exactScores: number;
}

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl?: string;
  joinedAt: string;
  monthlyPoints: number;
  worldRank: number | null;
}
