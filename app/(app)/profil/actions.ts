"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { VisibilityAspect, VisibilityValue } from "@/lib/domain/types";

export interface ProfileFormState {
  error?: string;
}

export interface VisibilityState {
  ok?: boolean;
  error?: string;
}

const VIS_ASPECTS: VisibilityAspect[] = [
  "predictions",
  "stats",
  "achievements",
  "friends",
];
const VIS_VALUES: VisibilityValue[] = ["everyone", "friends", "private"];

/** Save the per-aspect predictions/stats/achievements/friends visibility. */
export async function updateVisibility(
  _prev: VisibilityState,
  formData: FormData,
): Promise<VisibilityState> {
  if (!isSupabaseConfigured()) return { error: "Indisponible." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Vous devez être connecté." };

  for (const aspect of VIS_ASPECTS) {
    const value = String(formData.get(aspect) ?? "");
    if (!VIS_VALUES.includes(value as VisibilityValue)) continue;
    const { error } = await supabase.rpc("set_profile_visibility", {
      p_aspect: aspect,
      p_value: value,
    });
    if (error) {
      console.error("[updateVisibility]", aspect, error);
      return { error: "Impossible d'enregistrer la confidentialité." };
    }
  }
  refresh();
  return { ok: true };
}

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  if (!isSupabaseConfigured()) return { error: "Profil indisponible." };

  const username = String(formData.get("username") ?? "").trim();
  if (username.length < 2) {
    return { error: "Le pseudo doit faire au moins 2 caractères." };
  }
  if (username.length > 20) {
    return { error: "Le pseudo ne doit pas dépasser 20 caractères." };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: "Lettres, chiffres et underscore uniquement." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Vous devez être connecté." };

  const updates: { username: string; avatar_url?: string } = { username };

  // Optional avatar upload to the user's storage folder.
  const avatar = formData.get("avatar");
  if (avatar && typeof avatar === "object" && "size" in avatar && avatar.size > 0) {
    const file = avatar as File;
    if (file.size > 2_000_000) {
      return { error: "Image trop lourde (2 Mo maximum)." };
    }
    const ext =
      (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (uploadError) {
      console.error("[updateProfile] avatar upload", uploadError);
      return { error: "Échec de l'envoi de l'image." };
    }
    updates.avatar_url = supabase.storage.from("avatars").getPublicUrl(path)
      .data.publicUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ce pseudo est déjà pris."
          : "Impossible d'enregistrer le profil.",
    };
  }

  redirect(`/profil?t=${encodeURIComponent("Profil enregistré.")}`);
}
