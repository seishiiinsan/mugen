import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Guarantee a `profiles` row for the authenticated user. The DB trigger only
 * fires on `auth.users` INSERT, so a user whose profile was deleted (but whose
 * auth account remains) would otherwise log in with no profile. Mirrors the
 * trigger's username derivation, with collision suffixing.
 */
export async function ensureProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<void> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) return;

  const meta = user.user_metadata ?? {};
  const rawBase =
    meta.username ||
    meta.full_name ||
    meta.name ||
    user.email?.split("@")[0] ||
    "joueur";
  let base = String(rawBase).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
  if (!base) base = "joueur";

  const avatarUrl = meta.avatar_url ?? meta.picture ?? null;

  // Try the base name, then base1, base2… on username collisions.
  for (let suffix = 0; suffix < 25; suffix++) {
    const username = suffix === 0 ? base : `${base}${suffix}`;
    const { error } = await supabase
      .from("profiles")
      .insert({ id: user.id, username, avatar_url: avatarUrl });
    if (!error) return;
    if (error.code !== "23505") return; // not a uniqueness clash — give up
  }
}
