"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { PublicGroup } from "@/lib/domain/types";
import { GroupsIcon, SearchIcon } from "../../_components/icons";
import { joinPublicGroup } from "../actions";

/** "Je n'ai pas de code" → modal to browse & search public groups. */
export function PublicGroupsButton({ groups }: { groups: PublicGroup[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-accent hover:underline"
      >
        Je n&apos;ai pas de code
      </button>
      {open && <Modal groups={groups} onClose={() => setOpen(false)} />}
    </>
  );
}

function Modal({
  groups,
  onClose,
}: {
  groups: PublicGroup[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups;
  }, [groups, query]);

  const join = (id: string) => start(async () => void (await joinPublicGroup(id)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="text-base font-semibold">Groupes publics</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="press grid size-7 place-items-center rounded-md text-muted hover:bg-surface-2"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
            <SearchIcon className="size-4 shrink-0 text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un groupe…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <ul className="flex-1 space-y-2 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
              Aucun groupe public {query.trim() ? "ne correspond" : "pour le moment"}.
            </li>
          ) : (
            filtered.map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                  {g.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{g.name}</div>
                  <div className="text-xs text-faint">
                    {g.memberCount} membre{g.memberCount > 1 ? "s" : ""}
                  </div>
                </div>
                {g.isMember ? (
                  <span className="shrink-0 text-xs font-medium text-faint">
                    Déjà membre
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => join(g.id)}
                    disabled={pending}
                    className="press shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-50"
                  >
                    Rejoindre
                  </button>
                )}
              </li>
            ))
          )}
        </ul>

        <p className="flex items-center gap-1.5 border-t border-border px-4 py-2.5 text-xs text-faint">
          <GroupsIcon className="size-3.5" />
          {groups.length} groupe{groups.length > 1 ? "s" : ""} public
          {groups.length > 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
