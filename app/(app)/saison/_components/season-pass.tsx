"use client";

import { useTransition } from "react";
import { BADGE_META } from "@/lib/domain/cosmetics";
import { SEASON_TIER_EMOJI, tiersReached } from "@/lib/domain/season";
import type { MySeason } from "@/lib/domain/types";
import { CheckIcon, CoinIcon, LockIcon } from "../../_components/icons";
import { useToast } from "../../_components/toast";
import { claimSeasonTier } from "../actions";

export function SeasonPass({
  season,
  monthLabel,
}: {
  season: MySeason;
  monthLabel: string;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();

  const { points, tiers } = season;
  const reached = tiersReached(points, tiers);
  const maxThreshold = tiers.length ? tiers[tiers.length - 1].minPoints : 0;
  const next = tiers.find((t) => !t.reached);
  const progressPct =
    maxThreshold > 0 ? Math.min(100, (points / maxThreshold) * 100) : 0;
  const claimable = tiers.filter((t) => t.reached && !t.claimed).length;

  return (
    <div>
      {/* Progress card */}
      <div className="rounded-xl border border-accent/30 bg-accent/[0.06] p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold capitalize">{monthLabel}</span>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {points}
            <span className="ml-0.5 text-xs font-normal text-faint">pts</span>
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {reached}/{tiers.length} paliers atteints
          {next
            ? ` · plus que ${Math.max(0, next.minPoints - points)} pts pour « ${next.name} »`
            : " · pass maximisé ce mois 🎉"}
        </p>
      </div>

      {claimable > 0 && (
        <p className="mt-3 text-xs font-medium text-accent">
          {claimable} récompense{claimable > 1 ? "s" : ""} à réclamer !
        </p>
      )}

      {/* Tier ladder */}
      <ol className="mt-4 space-y-2">
        {tiers.map((t) => {
          const badge = t.badgeKey ? BADGE_META[t.badgeKey] : null;
          const canClaim = t.reached && !t.claimed;
          return (
            <li
              key={t.tier}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                t.reached
                  ? "border-border bg-surface"
                  : "border-dashed border-border bg-surface/50"
              }`}
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-full text-lg ${
                  t.reached ? "bg-accent/10" : "bg-surface-2 opacity-60 grayscale"
                }`}
              >
                {SEASON_TIER_EMOJI[t.tier] ?? "•"}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{t.name}</span>
                  <span className="shrink-0 text-xs text-faint">
                    ≥ {t.minPoints} pts
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                  <span className="inline-flex items-center gap-1 text-accent">
                    <CoinIcon className="size-3.5" />+{t.coins}
                  </span>
                  {badge && (
                    <span title={badge.label}>
                      {badge.emoji} {badge.label}
                    </span>
                  )}
                </div>
              </div>

              {t.claimed ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-semibold text-success">
                  <CheckIcon className="size-3.5" /> Réclamé
                </span>
              ) : canClaim ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await claimSeasonTier(t.tier);
                      toast({
                        type: r.ok ? "success" : "error",
                        message: r.message,
                      });
                    })
                  }
                  className="press inline-flex shrink-0 items-center rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Réclamer
                </button>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-faint">
                  <LockIcon className="size-3.5" /> Verrouillé
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
