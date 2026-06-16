"use client";

import { useActionState } from "react";
import type { ShopItem } from "@/lib/domain/types";
import { frameRing, nameColor, titleText } from "@/lib/domain/cosmetics";
import { CoinIcon } from "../../_components/icons";
import { equipItem, purchaseItem, type ShopActionState } from "../actions";

export function ShopItemCard({
  item,
  affordable,
}: {
  item: ShopItem;
  affordable: boolean;
}) {
  const [state, buy, buying] = useActionState<ShopActionState, FormData>(
    purchaseItem,
    {},
  );

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <Preview item={item} />

      <div className="mt-3 min-w-0 flex-1">
        <div className="text-sm font-semibold">{item.name}</div>
        {item.description && (
          <p className="mt-0.5 text-xs text-muted">{item.description}</p>
        )}
      </div>

      <div className="mt-3">
        {item.owned ? (
          <form action={equipItem}>
            <input type="hidden" name="slot" value={item.kind} />
            <input type="hidden" name="key" value={item.equipped ? "" : item.key} />
            <button
              type="submit"
              className={`press w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                item.equipped
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-border-strong"
              }`}
            >
              {item.equipped ? "Équipé ✓ — retirer" : "Équiper"}
            </button>
          </form>
        ) : (
          <form action={buy}>
            <input type="hidden" name="key" value={item.key} />
            <button
              type="submit"
              disabled={buying || !affordable}
              className="press flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CoinIcon className="size-4" />
              {item.price}
              {!affordable && <span className="text-xs">· solde insuffisant</span>}
            </button>
          </form>
        )}
        {state.error && (
          <p className="mt-1.5 text-center text-xs text-danger">{state.error}</p>
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
        <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
          {titleText(item.key) || item.name}
        </span>
      </div>
    );
  }
  return <div className="h-12" />;
}
