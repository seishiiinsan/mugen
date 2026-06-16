"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const STATUS_FILTERS = [
  { value: "all", label: "Tous" },
  { value: "live", label: "En cours" },
  { value: "upcoming", label: "À venir" },
] as const;

const DEBOUNCE_MS = 250;

export function FilterBar({
  leagues,
}: {
  leagues: { id: number; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const status = params.get("status") ?? "all";
  const league = params.get("league") ?? "";
  const q = params.get("q") ?? "";

  const [search, setSearch] = useState(q);

  // Sync the input when the URL `q` changes elsewhere (back/forward, reset) —
  // React's "adjust state during render" pattern, no effect needed.
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    setSearch(q);
  }

  // Live search: debounce URL updates as the user types.
  useEffect(() => {
    if (search === q) return;
    const id = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (search.trim()) next.set("q", search);
      else next.delete("q");
      next.delete("page");
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search, q, params, pathname, router]);

  function update(updates: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page"); // any filter change resets pagination
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="mb-5 space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {STATUS_FILTERS.map((s) => {
          const active = status === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => update({ status: s.value === "all" ? "" : s.value })}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border text-muted hover:border-border-strong hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <form
          className="flex-1"
          onSubmit={(e) => e.preventDefault()}
          role="search"
        >
          <input
            name="q"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une équipe…"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
        </form>

        <select
          aria-label="Filtrer par ligue"
          value={league}
          onChange={(e) => update({ league: e.target.value })}
          className="max-w-[45%] rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
        >
          <option value="">Toutes les ligues</option>
          {leagues.map((l) => (
            <option key={l.id} value={String(l.id)}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
