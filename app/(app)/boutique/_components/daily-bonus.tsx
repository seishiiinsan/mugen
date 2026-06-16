"use client";

import { useTransition } from "react";
import { CoinIcon } from "../../_components/icons";
import { claimDailyBonus } from "../actions";

export function DailyBonus({
  claimable,
  amount,
}: {
  claimable: boolean;
  amount: number;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/[0.06] p-4">
      <div>
        <div className="text-sm font-semibold">Bonus quotidien</div>
        <p className="text-xs text-muted">
          {claimable
            ? `Récupère ${amount} pièces aujourd'hui.`
            : "Déjà récupéré — reviens demain."}
        </p>
      </div>
      <button
        type="button"
        disabled={!claimable || pending}
        onClick={() => start(() => claimDailyBonus())}
        className="press inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CoinIcon className="size-4" />
        {claimable ? `+${amount}` : "Récupéré"}
      </button>
    </div>
  );
}
