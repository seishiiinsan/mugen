import "server-only";

import { isApiFootballConfigured } from "@/lib/api-football/env";
import { fetchFixtureById } from "@/lib/api-football/fixtures";
import { scorePrediction } from "@/lib/domain/scoring";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

export interface SettleResult {
  fixturesChecked: number;
  fixturesSettled: number;
  predictionsUpdated: number;
}

/**
 * Settle pending predictions.
 *
 * For every fixture that still has predictions without points:
 *  1. refresh the fixture from API-Football (latest status + 90-min score);
 *  2. update the cached `fixtures` row;
 *  3. if it's finished with a score, compute points for each pending
 *     prediction and persist them.
 *
 * Runs with the service-role client, which bypasses RLS and is allowed by the
 * `protect_points` / `enforce_lock` triggers to write points.
 */
export async function settlePredictions(): Promise<SettleResult> {
  if (!isAdminConfigured() || !isApiFootballConfigured()) {
    return { fixturesChecked: 0, fixturesSettled: 0, predictionsUpdated: 0 };
  }

  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("predictions")
    .select("fixture_id")
    .is("points", null);

  const fixtureIds = [
    ...new Set(
      ((pending as { fixture_id: number }[] | null) ?? []).map(
        (p) => p.fixture_id,
      ),
    ),
  ];

  let fixturesSettled = 0;
  let predictionsUpdated = 0;

  for (const fixtureId of fixtureIds) {
    const fixture = await fetchFixtureById(fixtureId);
    if (!fixture) continue;

    await admin
      .from("fixtures")
      .update({
        status: fixture.status,
        elapsed: fixture.elapsed ?? null,
        home_goals: fixture.score?.home ?? null,
        away_goals: fixture.score?.away ?? null,
        // Backfill logos/ids for rows cached before they were stored.
        league_logo: fixture.league.logoUrl ?? null,
        home_id: fixture.home.id,
        home_logo: fixture.home.logoUrl ?? null,
        away_id: fixture.away.id,
        away_logo: fixture.away.logoUrl ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fixtureId);

    if (fixture.status !== "finished" || !fixture.score) continue;
    fixturesSettled++;

    const { data: preds } = await admin
      .from("predictions")
      .select("id, home_goals, away_goals")
      .eq("fixture_id", fixtureId)
      .is("points", null);

    for (const p of (preds as
      | { id: string; home_goals: number; away_goals: number }[]
      | null) ?? []) {
      const points = scorePrediction(
        { home: p.home_goals, away: p.away_goals },
        fixture.score,
      );
      await admin.from("predictions").update({ points }).eq("id", p.id);
      predictionsUpdated++;
    }
  }

  return {
    fixturesChecked: fixtureIds.length,
    fixturesSettled,
    predictionsUpdated,
  };
}
