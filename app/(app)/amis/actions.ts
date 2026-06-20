"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getMyNotifications, searchUsers } from "@/lib/data";
import type {
  ActionResult,
  NotificationItem,
  UserSearchResult,
} from "@/lib/domain/types";

export interface SearchState {
  query: string;
  results: UserSearchResult[];
}

/** Typeahead-style player search, wired through `useActionState`. */
export async function searchUsersAction(
  _prev: SearchState,
  formData: FormData,
): Promise<SearchState> {
  const query = String(formData.get("q") ?? "").trim();
  if (!query) return { query: "", results: [] };
  return { query, results: await searchUsers(query) };
}

/** Run an RPC, refresh the router, and return a toast-ready result. */
async function rpcRefresh(
  fn: string,
  args: Record<string, unknown>,
  success: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Indisponible." };
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) {
    console.error(`[${fn}]`, error);
    return { ok: false, message: "Une erreur est survenue." };
  }
  refresh();
  return { ok: true, message: success };
}

export async function sendFriendRequest(targetId: string): Promise<ActionResult> {
  return rpcRefresh("send_friend_request", { p_target: targetId }, "Demande envoyée.");
}

export async function respondFriendRequest(
  requesterId: string,
  accept: boolean,
): Promise<ActionResult> {
  return rpcRefresh(
    "respond_friend_request",
    { p_requester: requesterId, p_accept: accept },
    accept ? "Demande acceptée." : "Demande refusée.",
  );
}

export async function cancelFriendRequest(targetId: string): Promise<ActionResult> {
  return rpcRefresh("cancel_friend_request", { p_target: targetId }, "Demande annulée.");
}

export async function removeFriend(otherId: string): Promise<ActionResult> {
  return rpcRefresh("remove_friend", { p_other: otherId }, "Ami retiré.");
}

export async function blockUser(targetId: string): Promise<ActionResult> {
  return rpcRefresh("block_user", { p_target: targetId }, "Joueur bloqué.");
}

export async function unblockUser(targetId: string): Promise<ActionResult> {
  return rpcRefresh("unblock_user", { p_target: targetId }, "Joueur débloqué.");
}

/** Load notifications for the bell panel and mark them read in one round-trip. */
export async function openNotifications(): Promise<NotificationItem[]> {
  if (!isSupabaseConfigured()) return [];
  const list = await getMyNotifications();
  const supabase = await createClient();
  await supabase.rpc("mark_notifications_read");
  refresh();
  return list;
}
