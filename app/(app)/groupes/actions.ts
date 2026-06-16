"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

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

  redirect(`/groupes/${data[0].id}`);
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

  redirect(`/groupes/${data}`);
}

export async function leaveGroup(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const groupId = String(formData.get("groupId") ?? "");
  if (!groupId) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_group", { p_group: groupId });
  if (error) {
    redirect(`/groupes/${groupId}?error=leave`);
  }
  redirect("/groupes");
}

export async function deleteGroup(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const groupId = String(formData.get("groupId") ?? "");
  if (!groupId) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_group", { p_group: groupId });
  if (error) {
    redirect(`/groupes/${groupId}?error=delete`);
  }
  redirect("/groupes");
}
