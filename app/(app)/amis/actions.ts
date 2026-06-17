"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getMyNotifications, searchUsers } from "@/lib/data";
import type { NotificationItem, UserSearchResult } from "@/lib/domain/types";

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

/** Run an RPC then refresh the router so server-rendered lists update. */
async function rpcRefresh(
  fn: string,
  args: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) console.error(`[${fn}]`, error);
  refresh();
}

export async function sendFriendRequest(targetId: string): Promise<void> {
  await rpcRefresh("send_friend_request", { p_target: targetId });
}

export async function respondFriendRequest(
  requesterId: string,
  accept: boolean,
): Promise<void> {
  await rpcRefresh("respond_friend_request", {
    p_requester: requesterId,
    p_accept: accept,
  });
}

export async function cancelFriendRequest(targetId: string): Promise<void> {
  await rpcRefresh("cancel_friend_request", { p_target: targetId });
}

export async function removeFriend(otherId: string): Promise<void> {
  await rpcRefresh("remove_friend", { p_other: otherId });
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
