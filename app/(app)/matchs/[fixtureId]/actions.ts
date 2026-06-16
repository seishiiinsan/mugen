"use server";

import { refresh } from "next/cache";
import { getFixture } from "@/lib/data";
import { BOOST_TYPES } from "@/lib/domain/boosts";
import { MAX_SCORERS } from "@/lib/domain/markets";
import type { BoostType, ScorerPick } from "@/lib/domain/types";
import { clampGoals, isPredictionOpen } from "@/lib/domain/predictions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PredictionFormState {
  ok?: boolean;
  error?: string;
  values?: { home: number; away: number };
}

/**
 * Submit or update a prediction for a fixture.
 *
 * Treat as a public endpoint — every check here is authoritative (spec §5.4):
 *  1. the user must be authenticated;
 *  2. the lock window is verified server-side (and again by a DB trigger);
 *  3. the fixture is upserted into the cache (service-role) before the
 *     prediction, to satisfy the predictions → fixtures foreign key.
 */
export async function submitPrediction(
  _prev: PredictionFormState,
  formData: FormData,
): Promise<PredictionFormState> {
  const fixtureId = Number(formData.get("fixtureId"));
  const home = clampGoals(Number(formData.get("home")));
  const away = clampGoals(Number(formData.get("away")));

  const boostRaw = String(formData.get("boost") ?? "");
  const boost = (BOOST_TYPES as readonly string[]).includes(boostRaw)
    ? (boostRaw as BoostType)
    : null;
  const home2 = clampGoals(Number(formData.get("home2")));
  const away2 = clampGoals(Number(formData.get("away2")));

  // Goalscorers.
  const scorers = parseScorers(String(formData.get("scorers") ?? "[]"));

  const fixture = await getFixture(fixtureId);
  if (!fixture) return { error: "Match introuvable." };

  // Authoritative lock check at submission time (anti-triche).
  if (!isPredictionOpen(fixture)) {
    return {
      error: "Les pronostics sont clôturés pour ce match.",
      values: { home, away },
    };
  }

  if (!isSupabaseConfigured()) {
    // Dev mock mode: pretend it worked.
    refresh();
    return { ok: true, values: { home, away } };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Vous devez être connecté." };

  // 1. Cache the fixture (service-role: only the server may write fixtures).
  const admin = createAdminClient();
  const { error: fixtureError } = await admin.from("fixtures").upsert({
    id: fixture.id,
    league_id: fixture.league.id,
    league_name: fixture.league.name,
    league_logo: fixture.league.logoUrl ?? null,
    home_id: fixture.home.id,
    home_team: fixture.home.name,
    home_logo: fixture.home.logoUrl ?? null,
    away_id: fixture.away.id,
    away_team: fixture.away.name,
    away_logo: fixture.away.logoUrl ?? null,
    venue: fixture.venue ?? null,
    kickoff: fixture.kickoff,
    status: fixture.status,
    elapsed: fixture.elapsed ?? null,
    home_goals: fixture.score?.home ?? null,
    away_goals: fixture.score?.away ?? null,
    updated_at: new Date().toISOString(),
  });
  if (fixtureError) {
    return { error: "Erreur lors de l'enregistrement du match.", values: { home, away } };
  }

  // 2. Upsert the prediction (RLS + lock/points triggers enforce the rules; the
  //    partial unique index enforces one boost of each type per month).
  const { error: predictionError } = await supabase.from("predictions").upsert(
    {
      user_id: user.id,
      fixture_id: fixture.id,
      home_goals: home,
      away_goals: away,
      boost,
      home_goals_2: boost === "double_chance" ? home2 : null,
      away_goals_2: boost === "double_chance" ? away2 : null,
      scorers,
    },
    { onConflict: "user_id,fixture_id" },
  );
  if (predictionError) {
    return {
      error:
        predictionError.code === "23505"
          ? "Tu as déjà utilisé ce boost ce mois-ci."
          : "Impossible d'enregistrer le pronostic.",
      values: { home, away },
    };
  }

  refresh();
  return { ok: true, values: { home, away } };
}

/** Parse the scorers hidden field: a JSON array of {id, name, position}. */
function parseScorers(raw: string): ScorerPick[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: ScorerPick[] = [];
  const seen = new Set<number>();
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const id = Number((item as { id?: unknown }).id);
    const name = String((item as { name?: unknown }).name ?? "").trim();
    const position = String((item as { position?: unknown }).position ?? "")
      .trim()
      .slice(0, 4);
    if (!Number.isInteger(id) || id <= 0 || !name || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: name.slice(0, 60), position });
    if (out.length >= MAX_SCORERS) break;
  }
  return out;
}
