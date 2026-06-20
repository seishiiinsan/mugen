"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { BADGE_META } from "@/lib/domain/cosmetics";
import type { ActionResult } from "@/lib/domain/types";

interface ClaimRow {
  granted: boolean;
  coins: number;
  badge_key: string | null;
}

/**
 * Claim a season-pass tier reached this month. The RPC recomputes the player's
 * month points server-side and is idempotent (one claim per tier per month), so
 * a double-click or stale UI can never double-grant.
 */
export async function claimSeasonTier(tier: number): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Indisponible." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_season_tier", {
    p_tier: tier,
  });
  const row = (data as ClaimRow[] | null)?.[0];
  if (error) return { ok: false, message: "Impossible de réclamer ce palier." };
  if (!row?.granted) {
    return { ok: false, message: "Palier indisponible ou déjà réclamé." };
  }

  refresh();
  const badge = row.badge_key ? BADGE_META[row.badge_key] : null;
  const badgeMsg = badge ? ` + badge ${badge.label} ${badge.emoji}` : "";
  return {
    ok: true,
    message: `Palier réclamé : +${row.coins} pièces${badgeMsg} !`,
  };
}
