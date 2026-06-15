"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface AuthState {
  error?: string;
  message?: string;
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
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "E-mail ou mot de passe incorrect." };

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

  // If email confirmation is enabled, there's no active session yet.
  if (!data.session) {
    return {
      message: "Compte créé. Vérifiez votre e-mail pour confirmer l'inscription.",
    };
  }

  redirect("/matchs");
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
