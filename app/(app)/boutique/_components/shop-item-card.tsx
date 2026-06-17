"use client";

import { useActionState, useTransition } from "react";
import type { ShopItem } from "@/lib/domain/types";
import { rarityOf, type Rarity } from "@/lib/domain/economy";
import { BADGE_META, frameRing, nameColor, titleText } from "@/lib/domain/cosmetics";
import { CoinIcon, LockIcon } from "../../_components/icons";
import { useActionToast, useToast } from "../../_components/toast";
import { equipItem, purchaseItem, type ShopActionState } from "../actions";

const RARITY_CHIP: Record<Rarity, string> = {
  common: "border-border text-faint",
  rare: "border-accent/40 bg-accent/10 text-accent",
  epic: "border-sky-500/40 bg-sky-500/10 text-sky-500",
  legendary: "border-gold/50 bg-gold/10 text-gold",
};

const RARITY_GLOW: Record<Rarity, string> = {
  common: "",
  rare: "",
  epic: "",
  legendary: "ring-1 ring-gold/30",
};

export function ShopItemCard({
  item,
  balance,
}: {
  item: ShopItem;
  balance: number;
}) {
  const [state, buy, buying] = useActionState<ShopActionState, FormData>(
    purchaseItem,
    {},
  );
  useActionToast(state);
  const toast = useToast();
  const [equipping, startEquip] = useTransition();
  const onEquip = () =>
    startEquip(async () => {
      const r = await equipItem(item.kind, item.equipped ? null : item.key);
      toast({ type: r.ok ? "success" : "error", message: r.message });
    });
  const { tier, label } = rarityOf(item.price);
  const affordable = balance >= item.price;
  const missing = Math.max(0, item.price - balance);

  return (
    <div
      className={`group relative flex flex-col rounded-xl border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-border-strong ${
        item.equipped ? "border-accent/50" : "border-border"
      } ${RARITY_GLOW[tier]}`}
    >
      {/* Rarity + owned markers */}
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${RARITY_CHIP[tier]}`}
        >
          {label}
        </span>
        <span className="flex items-center gap-1.5">
          {item.count && item.count > 1 && (
            <span className="font-mono text-[10px] font-bold tabular-nums text-accent">
              ×{item.count}
            </span>
          )}
          {item.equipped ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">
              Équipé
            </span>
          ) : item.owned ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">
              Possédé
            </span>
          ) : null}
        </span>
      </div>

      <Preview item={item} />

      <div className="mt-3 min-w-0 flex-1">
        <div className="text-sm font-semibold">{item.name}</div>
        {item.description && (
          <p className="mt-0.5 text-xs text-muted">{item.description}</p>
        )}
      </div>

      <div className="mt-3">
        {item.owned ? (
          <button
            type="button"
            onClick={onEquip}
            disabled={equipping}
            className={`press w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
              item.equipped
                ? "border-accent bg-accent/10 text-accent"
                : "border-border hover:border-border-strong"
            }`}
          >
            {item.equipped ? "Retirer" : "Équiper"}
          </button>
        ) : affordable ? (
          <form action={buy}>
            <input type="hidden" name="key" value={item.key} />
            <button
              type="submit"
              disabled={buying}
              className="press flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-50"
            >
              <CoinIcon className="size-4" />
              {item.price}
            </button>
          </form>
        ) : (
          <div
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-faint"
            title={`Il te manque ${missing} pièces`}
          >
            <LockIcon className="size-3.5" />
            Il te manque {missing}
          </div>
        )}
      </div>
    </div>
  );
}

/** Small visual preview of the cosmetic. */
function Preview({ item }: { item: ShopItem }) {
  if (item.kind === "frame") {
    return (
      <div className="flex h-12 items-center justify-center">
        <span
          className={`grid size-11 place-items-center rounded-full bg-surface-2 text-sm font-bold ${frameRing(item.key)}`}
        >
          A
        </span>
      </div>
    );
  }
  if (item.kind === "color") {
    return (
      <div className="flex h-12 items-center justify-center">
        <span className={`text-lg font-bold ${nameColor(item.key)}`}>Pseudo</span>
      </div>
    );
  }
  if (item.kind === "title") {
    return (
      <div className="flex h-12 items-center justify-center">
        <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
          {titleText(item.key) || item.name}
        </span>
      </div>
    );
  }
  if (item.kind === "badge") {
    return (
      <div className="flex h-12 items-center justify-center">
        <span aria-hidden className="text-3xl leading-none">
          {BADGE_META[item.key]?.emoji ?? "🏅"}
        </span>
      </div>
    );
  }
  return <div className="h-12" />;
}
