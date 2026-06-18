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

/** A ranked player on an all-time board (coins or XP) — no rewards, no reset. */
export interface RankedPlayer {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  /** The ranked metric: coin balance, or total lifetime XP. */
  value: number;
  /** Level, populated only for the XP board. */
  level?: number;
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
  /** How many times the item was earned (≥1). Only >1 for repeatable badges. */
  count?: number;
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

/** A public group surfaced in the discovery modal. */
export interface PublicGroup {
  id: string;
  name: string;
  memberCount: number;
  ownerId: string;
  isMember: boolean;
}

/** Group cosmetic families (priced in the group pot, owner-managed). */
export type GroupCosmeticKind = "group_bg" | "group_icon" | "group_title";

/** A group the caller owns, with its current pot balance (shop selector). */
export interface OwnedGroupPot {
  id: string;
  name: string;
  potBalance: number;
}

/** A group's pot for the viewer (member-gated). */
export interface GroupPot {
  balance: number;
  myContribution: number;
}

/** A group-shop catalog entry with the group's ownership flag. */
export interface GroupShopItem {
  key: string;
  kind: GroupCosmeticKind;
  name: string;
  description: string | null;
  price: number;
  owned: boolean;
}

/** A group cosmetic owned by a group, with its equipped state (owner view). */
export interface GroupOwnedItem {
  key: string;
  kind: GroupCosmeticKind;
  name: string;
  description: string | null;
  price: number;
  equipped: boolean;
}

/** A row in the admin "Joueurs" list. */
export interface AdminPlayer {
  id: string;
  username: string;
  avatarUrl?: string;
  coins: number;
  isAdmin: boolean;
  createdAt: string;
  lifetimePoints: number;
}

/** Full account dump for the admin player modal — "vraiment tout". */
export interface AdminPlayerDetail {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  is_admin: boolean;
  coins: number;
  predictions_visibility: string;
  equipped: {
    frame: string | null;
    title: string | null;
    color: string | null;
    badge: string | null;
  };
  lifetime_points: number;
  predictions_total: number;
  predictions_settled: number;
  exact_scores: number;
  friends_count: number;
  achievements: string[];
  items: { key: string; kind: string; name: string; count: number }[];
  reports: {
    id: string;
    category: string;
    title: string;
    status: string;
    created_at: string;
  }[];
  ledger: { amount: number; reason: string; ref: string; created_at: string }[];
  /** Derived app-side from lifetime points + achievement XP. */
  totalXp: number;
  level: number;
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
  /** Admin view only: the author already owns the Bug hunter badge. */
  reporterHasBugHunter?: boolean;
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

/** Result of a mutating server action, surfaced to the user as a toast. */
export interface ActionResult {
  ok: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// SOCIAL — amis, visibilité, notifications
// ---------------------------------------------------------------------------

/** Relationship between the viewer and another player (cf. friendship_status). */
export type Relation = "self" | "friends" | "pending_out" | "pending_in" | "none";

/** Profile aspects whose visibility can be tuned independently. */
export type VisibilityAspect = "predictions" | "stats" | "achievements" | "friends";
export type VisibilityValue = "everyone" | "friends" | "private";
export type Visibility = Record<VisibilityAspect, VisibilityValue>;

/** Identity-only cosmetics shared by social rows. */
export interface PlayerIdentity {
  id: string;
  username: string;
  avatarUrl?: string;
  equippedTitle: string | null;
  equippedColor: string | null;
  equippedBadge: string | null;
}

/** A friend in the viewer's list, with computed level. */
export interface FriendSummary extends PlayerIdentity {
  equippedFrame: string | null;
  lifetimePoints: number;
  achievementKeys: string[];
  level: number;
}

/** A pending friend request (incoming = received, outgoing = sent). */
export interface FriendRequest extends PlayerIdentity {
  direction: "incoming" | "outgoing";
  createdAt: string;
}

/** A search hit, with the viewer's relation to that player. */
export interface UserSearchResult extends PlayerIdentity {
  relation: Relation;
}

/** Notification-center item (friend request / accept). */
export interface NotificationItem {
  id: string;
  type: "friend_request" | "friend_accept" | "gift";
  actorId: string | null;
  actorUsername: string | null;
  actorAvatar?: string;
  createdAt: string;
  readAt: string | null;
  /** For friend_request: is the request still actionable? */
  pending: boolean;
  /** For gift: display name of the offered item, if still in the catalogue. */
  refLabel?: string | null;
}

/**
 * A public profile overview. Aspects the viewer isn't allowed to see come back
 * as `null` (gated server-side in `profile_overview`).
 */
export interface ProfileOverview {
  id: string;
  username: string;
  avatarUrl?: string;
  equippedFrame: string | null;
  equippedTitle: string | null;
  equippedColor: string | null;
  equippedBadge: string | null;
  joinedAt: string;
  relation: Relation;
  visibility: Visibility;
  /** null when the viewer can't see this aspect. */
  friendCount: number | null;
  lifetimePoints: number | null;
  exactScores: number | null;
  achievementKeys: string[] | null;
}

/** A player's upcoming prediction, exposed if visibility allows. */
export interface PublicPrediction {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  leagueName: string;
  leagueLogo?: string;
  kickoff: string;
  homeGoals: number;
  awayGoals: number;
}
