// In-memory mock dataset so the app runs end-to-end without external services.
// This is the seam that API-Football (fixtures) and Supabase (users, predictions,
// leaderboards) will replace. Kickoffs are generated relative to "now" so that
// prediction lock states behave realistically in dev.

import type {
  Fixture,
  LeaderboardEntry,
  Prediction,
  UserProfile,
} from "@/lib/domain/types";

const HOUR = 60 * 60 * 1000;

function iso(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

export const CURRENT_USER: UserProfile = {
  id: "u_me",
  username: "Hallo",
  joinedAt: "2026-01-04T10:00:00.000Z",
  monthlyPoints: 128,
  worldRank: 42,
  coins: 420,
  equippedFrame: null,
  equippedTitle: null,
  equippedColor: null,
  equippedBadge: null,
  favoriteTeamId: null,
};

export const MOCK_FIXTURES: Fixture[] = [
  {
    id: 101,
    league: { id: 61, name: "Ligue 1", country: "France" },
    home: { id: 85, name: "Paris Saint-Germain" },
    away: { id: 91, name: "Monaco" },
    venue: "Parc des Princes",
    kickoff: iso(3 * HOUR), // open
    status: "upcoming",
    score: null,
  },
  {
    id: 102,
    league: { id: 39, name: "Premier League", country: "Angleterre" },
    home: { id: 50, name: "Manchester City" },
    away: { id: 42, name: "Arsenal" },
    venue: "Etihad Stadium",
    kickoff: iso(0.1 * HOUR), // locked (within 15 min)
    status: "upcoming",
    score: null,
  },
  {
    id: 103,
    league: { id: 140, name: "La Liga", country: "Espagne" },
    home: { id: 541, name: "Real Madrid" },
    away: { id: 529, name: "Barcelone" },
    venue: "Santiago Bernabéu",
    kickoff: iso(-0.7 * HOUR), // live
    status: "live",
    elapsed: 38,
    score: { home: 1, away: 1 },
  },
  {
    id: 104,
    league: { id: 135, name: "Serie A", country: "Italie" },
    home: { id: 505, name: "Inter" },
    away: { id: 489, name: "AC Milan" },
    venue: "San Siro",
    kickoff: iso(-3 * HOUR), // finished
    status: "finished",
    score: { home: 2, away: 0 },
  },
  {
    id: 105,
    league: { id: 78, name: "Bundesliga", country: "Allemagne" },
    home: { id: 157, name: "Bayern Munich" },
    away: { id: 165, name: "Dortmund" },
    venue: "Allianz Arena",
    kickoff: iso(27 * HOUR), // open, tomorrow
    status: "upcoming",
    score: null,
  },
];

export const MOCK_PREDICTIONS: Prediction[] = [
  {
    fixtureId: 103,
    userId: CURRENT_USER.id,
    home: 2,
    away: 1,
    submittedAt: iso(-2 * HOUR),
    points: null, // live, not settled
    boost: null,
    secondary: null,
    scorers: [],
  },
  {
    fixtureId: 104,
    userId: CURRENT_USER.id,
    home: 2,
    away: 0,
    submittedAt: iso(-5 * HOUR),
    points: 20, // exact, with Points ×2
    boost: "double_points",
    secondary: null,
    scorers: [],
  },
];

const NO_COSMETICS = {
  equippedFrame: null,
  equippedColor: null,
  equippedTitle: null,
  equippedBadge: null,
} as const;

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: "u_1", username: "ScorePerfect", points: 312, exactScores: 21, ...NO_COSMETICS },
  { rank: 2, userId: "u_2", username: "PronoKing", points: 298, exactScores: 18, ...NO_COSMETICS },
  { rank: 3, userId: "u_3", username: "Mbappe_fan", points: 271, exactScores: 16, ...NO_COSMETICS },
  { rank: 4, userId: "u_4", username: "TacticsNerd", points: 244, exactScores: 12, ...NO_COSMETICS },
  { rank: 5, userId: "u_5", username: "GegenPress", points: 219, exactScores: 11, ...NO_COSMETICS },
  { rank: 42, userId: CURRENT_USER.id, username: CURRENT_USER.username, points: 128, exactScores: 6, ...NO_COSMETICS },
];
