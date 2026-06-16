"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface ProfileFormState {
  error?: string;
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

  redirect("/profil");
}
