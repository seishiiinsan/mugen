"use server";

import { refresh } from "next/cache";
import type { ReportStatus } from "@/lib/domain/types";
import { getIsAdmin } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface AdminActionState {
  error?: string;
  ok?: boolean;
}

const STATUSES: ReportStatus[] = ["new", "in_progress", "done", "rejected"];

/** Move a report to a new kanban column. */
export async function setReportStatus(
  id: string,
  status: ReportStatus,
): Promise<AdminActionState> {
  if (!isSupabaseConfigured()) return { error: "Indisponible." };
  if (!(await getIsAdmin())) return { error: "Non autorisé." };
  if (!STATUSES.includes(status)) return { error: "Statut invalide." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_report", {
    p_id: id,
    p_status: status,
    p_notes: null,
  });
  if (error) {
    console.error("[setReportStatus]", error);
    return { error: "Échec de la mise à jour." };
  }
  refresh();
  return { ok: true };
}

/** Save triage notes on a report. */
export async function setReportNotes(
  id: string,
  notes: string,
): Promise<AdminActionState> {
  if (!isSupabaseConfigured()) return { error: "Indisponible." };
  if (!(await getIsAdmin())) return { error: "Non autorisé." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_report", {
    p_id: id,
    p_status: null,
    p_notes: notes,
  });
  if (error) {
    console.error("[setReportNotes]", error);
    return { error: "Échec de l'enregistrement." };
  }
  refresh();
  return { ok: true };
}

/** Create or update a changelog entry. */
export async function upsertChangelog(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!isSupabaseConfigured()) return { error: "Indisponible." };
  if (!(await getIsAdmin())) return { error: "Non autorisé." };

  const id = String(formData.get("id") ?? "").trim() || null;
  const version = String(formData.get("version") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const published = formData.get("published") === "on";

  if (title.length < 2) return { error: "Le titre est trop court." };
  if (body.trim().length < 1) return { error: "Le corps est vide." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_upsert_changelog", {
    p_id: id,
    p_version: version,
    p_title: title,
    p_body: body,
    p_published: published,
  });
  if (error) {
    console.error("[upsertChangelog]", error);
    return { error: "Échec de l'enregistrement." };
  }
  refresh();
  return { ok: true };
}

/** Delete a changelog entry. */
export async function deleteChangelog(id: string): Promise<AdminActionState> {
  if (!isSupabaseConfigured()) return { error: "Indisponible." };
  if (!(await getIsAdmin())) return { error: "Non autorisé." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_changelog", { p_id: id });
  if (error) {
    console.error("[deleteChangelog]", error);
    return { error: "Échec de la suppression." };
  }
  refresh();
  return { ok: true };
}
