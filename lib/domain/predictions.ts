// Prediction lifecycle rules (Cahier des charges §2.3).

import type { Fixture } from "./types";

/** Predictions close this many minutes before the official kickoff. */
export const LOCK_MINUTES_BEFORE_KICKOFF = 15;

export const MAX_GOALS = 20; // selector range, 0..20 per team

/**
 * Whether a prediction can still be submitted or edited for a fixture.
 * Locked once we are within {@link LOCK_MINUTES_BEFORE_KICKOFF} of kickoff,
 * or the match is no longer "upcoming".
 */
export function isPredictionOpen(fixture: Fixture, now: Date = new Date()): boolean {
  if (fixture.status !== "upcoming") return false;
  return now.getTime() < lockTime(fixture).getTime();
}

/** The instant at which predictions lock for a fixture. */
export function lockTime(fixture: Fixture): Date {
  const kickoff = new Date(fixture.kickoff);
  return new Date(kickoff.getTime() - LOCK_MINUTES_BEFORE_KICKOFF * 60_000);
}

/** Clamp a user-entered goal count into the allowed range. */
export function clampGoals(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(MAX_GOALS, Math.max(0, Math.trunc(value)));
}
