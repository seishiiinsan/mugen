"use client";

import { useActionState } from "react";
import Link from "next/link";
import { BADGE_META, frameRing, nameColor, titleText } from "@/lib/domain/cosmetics";
import { UserAvatar } from "../../_components/user-avatar";
import { SearchIcon } from "../../_components/icons";
import { searchUsersAction, type SearchState } from "../actions";
import { RelationButton } from "./social-buttons";

const INITIAL: SearchState = { query: "", results: [] };

export function FriendSearch() {
  const [state, action, pending] = useActionState(searchUsersAction, INITIAL);

  return (
    <div className="space-y-3">
      <form action={action} className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            name="q"
            minLength={1}
            placeholder="Rechercher un joueur…"
            className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="press rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {pending ? "…" : "Chercher"}
        </button>
      </form>

      {state.query && !pending && state.results.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
          Aucun joueur pour « {state.query} ».
        </p>
      )}

      {state.results.length > 0 && (
        <ul className="space-y-2">
          {state.results.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
            >
              <Link
                href={`/joueur/${u.username}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <UserAvatar
                  username={u.username}
                  avatarUrl={u.avatarUrl}
                  className={`size-9 rounded-full border bg-surface-2 text-sm font-semibold ${
                    frameRing(u.equippedFrame) || "border-border"
                  }`}
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`truncate font-medium ${nameColor(u.equippedColor)}`}
                    >
                      {u.username}
                    </span>
                    {u.equippedBadge && BADGE_META[u.equippedBadge] && (
                      <span aria-hidden>{BADGE_META[u.equippedBadge].emoji}</span>
                    )}
                  </span>
                  {titleText(u.equippedTitle) && (
                    <span className="block text-xs text-faint">
                      {titleText(u.equippedTitle)}
                    </span>
                  )}
                </span>
              </Link>
              <RelationButton userId={u.id} relation={u.relation} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
