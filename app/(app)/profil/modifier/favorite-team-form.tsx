"use client";

import { useMemo, useState, useTransition } from "react";
import type { TeamRef } from "@/lib/domain/types";
import { TeamCrest } from "../../_components/team-crest";
import { useToast } from "../../_components/toast";
import { setFavoriteTeam } from "../actions";

export function FavoriteTeamForm({
  teams,
  initialId,
}: {
  teams: TeamRef[];
  initialId: number | null;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const [selected, setSelected] = useState<number | null>(initialId);
  const [query, setQuery] = useState("");

  const current = teams.find((t) => t.teamId === selected) ?? null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return teams.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 8);
  }, [teams, query]);

  function save(id: number | null) {
    setSelected(id);
    setQuery("");
    start(async () => {
      const r = await setFavoriteTeam(id);
      toast({ type: r.ok ? "success" : "error", message: r.message });
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Club de cœur</h2>
        <p className="mt-0.5 text-xs text-faint">
          Mis en avant sur ton profil et ton tableau de bord.
        </p>
      </div>

      {current && (
        <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/[0.06] p-3">
          <TeamCrest name={current.name} logoUrl={current.logo} size={28} />
          <span className="flex-1 truncate text-sm font-medium">
            {current.name}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => save(null)}
            className="press text-xs text-muted transition-colors hover:text-danger disabled:opacity-50"
          >
            Retirer
          </button>
        </div>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher une équipe…"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
      />

      {filtered.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {filtered.map((t) => (
            <li key={t.teamId}>
              <button
                type="button"
                disabled={pending}
                onClick={() => save(t.teamId)}
                className="flex w-full items-center gap-3 bg-surface px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2 disabled:opacity-50"
              >
                <TeamCrest name={t.name} logoUrl={t.logo} size={22} />
                <span className="truncate">{t.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
