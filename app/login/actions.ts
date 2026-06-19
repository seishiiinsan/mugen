"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureProfile } from "@/lib/supabase/ensure-profile";

export interface AuthState {
  error?: string;
  message?: string;
  /** Set after a sign-up that still needs e-mail confirmation, so the UI can
   *  offer to resend the confirmation link to this address. */
  pendingEmail?: string;
}

function safeRedirectPath(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  // Only allow internal paths to avoid open-redirects.
  return v.startsWith("/") && !v.startsWith("//") ? v : "/matchs";
}

async function originUrl(): Promise<string> {
  const h = await headers();
  return (
    h.get("origin") ??
    `https://${h.get("host") ?? "localhost:3000"}`
  );
}

export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: "Authentification non configurée." };

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectPath(formData.get("redirect"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: "E-mail ou mot de passe incorrect." };

  // Recreate a missing profile (e.g. deleted while the auth account remained).
  if (data.user) await ensureProfile(supabase, data.user);

  redirect(redirectTo);
}

export async function signUpWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: "Authentification non configurée." };

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim();

  if (username.length < 2) {
    return { error: "Le pseudo doit faire au moins 2 caractères." };
  }
  if (password.length < 8) {
    return { error: "Le mot de passe doit faire au moins 8 caractères." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${await originUrl()}/auth/callback`,
    },
  });
  if (error) return { error: error.message };

  // If email confirmation is enabled, there's no active session yet. Surface
  // the address so the form can offer a resend if the mail never arrives.
  if (!data.session) {
    return {
      message:
        "Compte créé. Cliquez sur le lien envoyé par e-mail pour confirmer votre inscription — pensez à vérifier vos courriers indésirables.",
      pendingEmail: email,
    };
  }

  redirect("/matchs");
}

/** Re-send the sign-up confirmation e-mail (when the first one never arrived).
 *  Note: actual delivery depends on the Supabase project's SMTP config — the
 *  built-in sender is heavily rate-limited and often lands in spam. */
export async function resendConfirmation(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: "Authentification non configurée." };

  const email = String(formData.get("email") ?? "");
  if (!email) return { error: "Adresse e-mail manquante." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await originUrl()}/auth/callback` },
  });
  // Keep the address either way so the button stays available for another try.
  if (error) return { error: error.message, pendingEmail: email };

  return {
    message: "E-mail de confirmation renvoyé. Vérifiez votre boîte (et vos spams).",
    pendingEmail: email,
  };
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const redirectTo = safeRedirectPath(formData.get("redirect"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await originUrl()}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      // Always show Google's account chooser instead of silently reusing the
      // only signed-in session.
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) return;
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
