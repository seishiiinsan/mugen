"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface ShopActionState {
  error?: string;
  ok?: string;
}

export async function claimDailyBonus(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  await supabase.rpc("claim_daily_bonus");
  refresh();
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

export async function equipItem(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const slot = String(formData.get("slot") ?? "");
  const raw = String(formData.get("key") ?? "");
  const key = raw === "" ? null : raw;

  const supabase = await createClient();
  await supabase.rpc("equip_item", { p_slot: slot, p_key: key });
  refresh();
}
