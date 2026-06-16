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

/** A predicted goalscorer with the role they were picked in. */
export interface ScorerPick {
  id: number;
  name: string;
  /** Lineup role at pick time ('G' | 'D' | 'M' | 'F'); drives the hit bonus. */
  position: string;
}

/** A user's single prediction for a fixture (exact score + goalscorers). */
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
  /** Predicted goalscorers (anytime). Hit bonus by role, −2 each miss. */
  scorers: ScorerPick[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  points: number;
  /** Monthly exact-score count, handy for tie-break display. */
  exactScores: number;
  /** Profile picture (Supabase Storage or OAuth), undefined if none set. */
  avatarUrl?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl?: string;
  joinedAt: string;
  monthlyPoints: number;
  worldRank: number | null;
  /** In-game currency balance. */
  coins: number;
  /** Equipped cosmetic item keys (null when none). */
  equippedFrame: string | null;
  equippedTitle: string | null;
  equippedColor: string | null;
  equippedBadge: string | null;
}

/** A shop catalog entry with the viewer's ownership/equipped state. */
export interface ShopItem {
  key: string;
  kind: "frame" | "title" | "color" | "badge";
  name: string;
  description: string | null;
  price: number;
  owned: boolean;
  equipped: boolean;
}

/** A coin ledger entry. */
export interface CoinEntry {
  amount: number;
  reason: string;
  ref: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  memberCount: number;
  createdAt: string;
}

/** A player-submitted report (bug / suggestion / other). */
export type ReportCategory = "bug" | "suggestion" | "other";
export type ReportStatus = "new" | "in_progress" | "done" | "rejected";

export interface Report {
  id: string;
  /** Author id, null if the account was since deleted. Only set for admins. */
  userId?: string | null;
  /** Author username — only joined for the admin view. */
  username?: string | null;
  category: ReportCategory;
  title: string;
  message: string;
  status: ReportStatus;
  /** Page the report was filed from, if captured. */
  pageUrl?: string | null;
  /** Admin-only triage notes. */
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A changelog entry (admin-authored, markdown body). */
export interface ChangelogEntry {
  id: string;
  version?: string | null;
  title: string;
  body: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}
