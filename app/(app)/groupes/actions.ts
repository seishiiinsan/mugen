"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getGroupGate, getMyLevel } from "@/lib/data";
import type { ActionResult } from "@/lib/domain/types";

export interface GroupFormState {
  error?: string;
}

export interface GroupSettingsState {
  ok?: boolean;
  error?: string;
}

/** Refuse the join if the group sets a level requirement the user doesn't meet.
 *  Returns an error message, or null when allowed (or when checks are skipped). */
async function blockedByGate(opts: {
  groupId?: string;
  code?: string;
}): Promise<string | null> {
  const gate = await getGroupGate(opts);
  // No gate (pre-migration RPC missing, or bad code) → let the join RPC decide.
  if (!gate || gate.isMember) return null;
  if (gate.minLevel > 0) {
    const { level } = await getMyLevel();
    if (level < gate.minLevel) {
      return `Niveau ${gate.minLevel} requis pour rejoindre ce groupe.`;
    }
  }
  if (gate.maxMembers != null && gate.memberCount >= gate.maxMembers) {
    return "Ce groupe est complet.";
  }
  return null;
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

  const isPublic = formData.get("public") === "on";

  const supabase = await createClient();
  // Only send p_public when needed so private creation still matches the legacy
  // create_group(text) signature until migration 0028 is applied.
  const { data, error } = await supabase.rpc(
    "create_group",
    isPublic ? { p_name: name, p_public: true } : { p_name: name },
  );
  if (error || !data?.[0]?.id) {
    return { error: "Impossible de créer le groupe." };
  }

  redirect(`/groupes/${data[0].id}?t=${encodeURIComponent("Groupe créé.")}`);
}

/** Join a public group by id (no invite code needed). */
export async function joinPublicGroup(groupId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  if (!groupId) return;

  const blocked = await blockedByGate({ groupId });
  if (blocked) {
    redirect(`/groupes?t=${encodeURIComponent(blocked)}&tt=error`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_public_group", {
    p_group: groupId,
  });
  if (error || !data) {
    redirect(
      `/groupes?t=${encodeURIComponent("Impossible de rejoindre ce groupe.")}&tt=error`,
    );
  }
  redirect(`/groupes/${data}?t=${encodeURIComponent("Groupe rejoint.")}`);
}

/** Owner edits the group's settings (name, visibility, capacity, level gate). */
export async function updateGroupSettings(
  _prev: GroupSettingsState,
  formData: FormData,
): Promise<GroupSettingsState> {
  if (!isSupabaseConfigured()) return { error: "Indisponible." };

  const groupId = String(formData.get("groupId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const isPublic = formData.get("public") === "on";
  const maxRaw = String(formData.get("maxMembers") ?? "").trim();
  const minRaw = String(formData.get("minLevel") ?? "").trim();

  if (!groupId) return { error: "Groupe inconnu." };
  if (name.length < 2 || name.length > 40) {
    return { error: "Le nom doit faire entre 2 et 40 caractères." };
  }
  const maxMembers = maxRaw === "" ? null : Number(maxRaw);
  if (maxMembers !== null && (!Number.isInteger(maxMembers) || maxMembers < 1)) {
    return { error: "Nombre max de membres invalide." };
  }
  const minLevel = minRaw === "" ? 0 : Number(minRaw);
  if (!Number.isInteger(minLevel) || minLevel < 0) {
    return { error: "Niveau requis invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_group_settings", {
    p_group: groupId,
    p_name: name,
    p_public: isPublic,
    p_max_members: maxMembers,
    p_min_level: minLevel,
  });
  if (error) return { error: "Impossible d'enregistrer les réglages." };
  refresh();
  return { ok: true };
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

  const blocked = await blockedByGate({ code });
  if (blocked) return { error: blocked };

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
