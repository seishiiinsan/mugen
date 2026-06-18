"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ActionResult } from "@/lib/domain/types";

export interface ShopActionState {
  error?: string;
  ok?: string;
}

export async function claimDailyBonus(): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Indisponible." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_daily_bonus");
  const row = (data as { granted: boolean; amount: number }[] | null)?.[0];
  if (error) return { ok: false, message: "Impossible de récupérer le bonus." };
  refresh();
  return row?.granted
    ? { ok: true, message: `Bonus quotidien : +${row.amount} pièces !` }
    : { ok: false, message: "Bonus déjà récupéré aujourd'hui." };
}

export async function purchaseItem(
  _prev: ShopActionState,
  formData: FormData,
): Promise<ShopActionState> {
  if (!isSupabaseConfigured()) return { error: "Boutique indisponible." };
  const key = String(formData.get("key") ?? "");
  if (!key) return { error: "Article inconnu." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("purchase_item", { p_key: key });
  const row = (data as { ok: boolean; error: string | null }[] | null)?.[0];
  if (error || !row?.ok) {
    return { error: row?.error ?? "Achat impossible." };
  }
  refresh();
  return { ok: "Article acheté." };
}

export async function giftItem(
  targetId: string,
  key: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Indisponible." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("gift_item", {
    p_target: targetId,
    p_key: key,
  });
  const row = (data as { ok: boolean; error: string | null }[] | null)?.[0];
  if (error || !row?.ok) {
    return { ok: false, message: row?.error ?? "Cadeau impossible." };
  }
  refresh();
  return { ok: true, message: "Cadeau offert ! 🎁" };
}

/** Spend a group's pot on a group cosmetic (owner only). */
export async function purchaseGroupItem(
  groupId: string,
  key: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Indisponible." };
  if (!groupId || !key) return { ok: false, message: "Article inconnu." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("group_purchase_item", {
    p_group: groupId,
    p_key: key,
  });
  const row = (data as { ok: boolean; error: string | null }[] | null)?.[0];
  if (error || !row?.ok) {
    return { ok: false, message: row?.error ?? "Achat impossible." };
  }
  refresh();
  return { ok: true, message: "Cosmétique de groupe acheté 🎉" };
}

export async function equipItem(
  slot: string,
  key: string | null,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Indisponible." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("equip_item", { p_slot: slot, p_key: key });
  if (error) return { ok: false, message: "Action impossible." };
  refresh();
  return {
    ok: true,
    message: key ? "Cosmétique équipé." : "Cosmétique retiré.",
  };
}
