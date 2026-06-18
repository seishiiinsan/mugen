"use client";

import { useState } from "react";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  type AchievementCategory,
} from "@/lib/domain/economy";
import { BADGE_META } from "@/lib/domain/cosmetics";
import { CoinIcon } from "../_components/icons";

/**
 * Themed, tabbed achievement list. Pure data (ACHIEVEMENTS / BADGE_META) is
 * imported directly so only the per-user state crosses the server boundary:
 * the unlocked keys and the global unlock rates.
 */
export function AchievementsList({
  unlockedKeys,
  rates,
}: {
  unlockedKeys: string[];
  /** Achievement key → share of players who unlocked it (0–100). */
  rates: Record<string, number>;
}) {
  const [tab, setTab] = useState<AchievementCategory>(
    ACHIEVEMENT_CATEGORIES[0].key,
  );
  const unlocked = new Set(unlockedKeys);

  const inTab = ACHIEVEMENTS.filter((a) => a.category === tab);

  return (
    <div>
      <div
        role="tablist"
        className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1"
      >
        {ACHIEVEMENT_CATEGORIES.map((c) => {
          const items = ACHIEVEMENTS.filter((a) => a.category === c.key);
          const done = items.filter((a) => unlocked.has(a.key)).length;
          const active = tab === c.key;
          return (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(c.key)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {c.label}
              <span className="ml-1.5 font-mono text-xs tabular-nums text-faint">
                {done}/{items.length}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="space-y-2">
        {inTab.map((a) => {
          const ok = unlocked.has(a.key);
          const meta = a.badge ? BADGE_META[a.badge] : null;
          const pct = rates[a.key] ?? 0;
          return (
            <li
              key={a.key}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                ok ? "border-accent/30 bg-accent/[0.05]" : "border-border bg-surface"
              }`}
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-full text-lg ${
                  ok ? "bg-accent/10" : "bg-surface-2 opacity-40 grayscale"
                }`}
                aria-hidden
              >
                {meta?.emoji ?? "⭐"}
              </span>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium ${ok ? "" : "text-muted"}`}>
                  {a.name}
                </div>
                <div className="text-xs text-faint">{a.description}</div>
                <div className="mt-0.5 text-[11px] text-faint">
                  🏆 {pct}% des joueurs l&apos;ont débloqué
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
                {ok ? (
                  <span className="font-semibold text-accent">Débloqué ✓</span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums text-faint">
                    <CoinIcon className="size-3.5" />+{a.coins}
                  </span>
                )}
                <span className="font-mono tabular-nums text-faint">+{a.xp} XP</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
