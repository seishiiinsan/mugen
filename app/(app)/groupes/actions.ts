"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ActionResult } from "@/lib/domain/types";

export interface GroupFormState {
  error?: string;
}

export async function createGroup(
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  if (!isSupabaseConfigured()) return { error: "Groupes indisponibles." };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 40) {
    return { error: "Le nom doit faire entre 2 et 40 caractères." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_group", { p_name: name });
  if (error || !data?.[0]?.id) {
    return { error: "Impossible de créer le groupe." };
  }

  redirect(`/groupes/${data[0].id}?t=${encodeURIComponent("Groupe créé.")}`);
}

export async function joinGroup(
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  if (!isSupabaseConfigured()) return { error: "Groupes indisponibles." };

  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  if (code.length < 4) {
    return { error: "Code d'invitation invalide." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_group", { p_code: code });
  if (error || !data) {
    return { error: "Code d'invitation invalide." };
  }

  redirect(`/groupes/${data}?t=${encodeURIComponent("Groupe rejoint.")}`);
}

export async function leaveGroup(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const groupId = String(formData.get("groupId") ?? "");
  if (!groupId) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_group", { p_group: groupId });
  if (error) {
    redirect(`/groupes/${groupId}?t=${encodeURIComponent("Impossible de quitter le groupe.")}&tt=error`);
  }
  redirect(`/groupes?t=${encodeURIComponent("Groupe quitté.")}`);
}

export async function deleteGroup(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const groupId = String(formData.get("groupId") ?? "");
  if (!groupId) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_group", { p_group: groupId });
  if (error) {
    redirect(`/groupes/${groupId}?t=${encodeURIComponent("Impossible de supprimer le groupe.")}&tt=error`);
  }
  redirect(`/groupes?t=${encodeURIComponent("Groupe supprimé.")}`);
}

/** Deposit personal coins into a group's pot (any member). */
export async function depositToGroupPot(
  groupId: string,
  amount: number,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Indisponible." };
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, message: "Montant invalide." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("group_pot_deposit", {
    p_group: groupId,
    p_amount: amount,
  });
  const row = (data as { ok: boolean; error: string | null }[] | null)?.[0];
  if (error || !row?.ok) {
    return { ok: false, message: row?.error ?? "Dépôt impossible." };
  }
  refresh();
  return { ok: true, message: `+${amount} pièces dans la cagnotte 🪙` };
}

/** Equip/unequip a group cosmetic (owner only; null key = remove). */
export async function equipGroupItem(
  groupId: string,
  slot: string,
  key: string | null,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Indisponible." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("group_equip_item", {
    p_group: groupId,
    p_slot: slot,
    p_key: key,
  });
  if (error) return { ok: false, message: "Action impossible." };
  refresh();
  return { ok: true, message: key ? "Cosmétique équipé." : "Cosmétique retiré." };
}
