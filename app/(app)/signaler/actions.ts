"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface ReportActionState {
  error?: string;
  ok?: boolean;
}

const CATEGORIES = ["bug", "suggestion", "other"] as const;

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
