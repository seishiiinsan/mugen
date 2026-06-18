"use client";

import { useState, useTransition } from "react";
import { CoinIcon } from "../../_components/icons";
import { useToast } from "../../_components/toast";
import { depositToGroupPot } from "../actions";

export function GroupPotDeposit({
  groupId,
  potBalance,
  myContribution,
  myBalance,
}: {
  groupId: string;
  potBalance: number;
  myContribution: number;
  myBalance: number;
}) {
  const [amount, setAmount] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();

  const value = Number(amount);
  const valid =
    Number.isInteger(value) && value > 0 && value <= myBalance;

  const deposit = () => {
    if (!valid) return;
    start(async () => {
      const r = await depositToGroupPot(groupId, value);
      toast({ type: r.ok ? "success" : "error", message: r.message });
      if (r.ok) setAmount("");
    });
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Cagnotte du groupe</h2>
          <p className="mt-0.5 text-xs text-muted">
            Ta contribution : {myContribution.toLocaleString("fr-FR")} pièces
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-gradient-to-br from-accent/15 to-accent/5 px-3 py-1.5 font-mono text-sm font-semibold tabular-nums text-accent">
          <CoinIcon className="size-4" />
          {potBalance.toLocaleString("fr-FR")}
        </span>
      </div>

      <div className="mt-3 flex items-stretch gap-2">
        <input
          type="number"
          min={1}
          max={myBalance}
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Montant (max ${myBalance})`}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
        />
        <button
          type="button"
          onClick={deposit}
          disabled={!valid || pending}
          className="press shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-50"
        >
          {pending ? "…" : "Déposer"}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-faint">
        Ton solde : {myBalance.toLocaleString("fr-FR")} pièces · le dépôt est
        définitif (remboursé au prorata si tu quittes le groupe).
      </p>
    </div>
  );
}
