"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ActionResult } from "@/lib/domain/types";

export interface ReportActionState {
  error?: string;
  ok?: boolean;
}

const CATEGORIES = ["bug", "suggestion", "other"] as const;
type Category = (typeof CATEGORIES)[number];

export async function submitReport(
  _prev: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  if (!isSupabaseConfigured()) return { error: "Service indisponible." };

  const category = String(formData.get("category") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const pageUrl = String(formData.get("page_url") ?? "").trim() || null;

  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return { error: "Choisis une catégorie." };
  }
  if (title.length < 3) return { error: "Le titre est trop court." };
  if (message.length < 5) return { error: "Le message est trop court." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_report", {
    p_category: category,
    p_title: title,
    p_message: message,
    p_page_url: pageUrl,
  });
  if (error) {
    console.error("[submitReport]", error);
    return { error: "Envoi impossible. Réessaie." };
  }

  refresh();
  return { ok: true };
}

/** Edit one of the caller's own reports (only while still "new"). */
export async function updateReport(
  id: string,
  input: { category: string; title: string; message: string },
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Service indisponible." };

  const category = input.category;
  const title = input.title.trim();
  const message = input.message.trim();
  if (!CATEGORIES.includes(category as Category)) {
    return { ok: false, message: "Choisis une catégorie." };
  }
  if (title.length < 3) return { ok: false, message: "Le titre est trop court." };
  if (message.length < 5) return { ok: false, message: "Le message est trop court." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_report", {
    p_id: id,
    p_category: category,
    p_title: title,
    p_message: message,
  });
  if (error) {
    console.error("[updateReport]", error);
    return { ok: false, message: "Modification impossible. Réessaie." };
  }
  if (data === false) {
    return { ok: false, message: "Ce signalement ne peut plus être modifié." };
  }
  refresh();
  return { ok: true, message: "Signalement modifié." };
}

/** Delete one of the caller's own reports (only while still "new"). */
export async function deleteReport(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Service indisponible." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_report", { p_id: id });
  if (error) {
    console.error("[deleteReport]", error);
    return { ok: false, message: "Suppression impossible. Réessaie." };
  }
  if (data === false) {
    return { ok: false, message: "Ce signalement ne peut plus être supprimé." };
  }
  refresh();
  return { ok: true, message: "Signalement supprimé." };
}
