"use client";

import { useState } from "react";
import type { FriendSummary, ShopItem } from "@/lib/domain/types";
import { ShopGrid } from "./shop-grid";

const KIND_LABEL: Record<ShopItem["kind"], string> = {
  badge: "Badges",
  frame: "Cadres",
  color: "Couleurs",
  title: "Titres",
};
// Mirrors OWNED_KIND_ORDER in lib/data.
const KIND_ORDER: ShopItem["kind"][] = ["badge", "frame", "color", "title"];

/** "Possédés" tab: sub-tabs to filter the inventory by cosmetic kind. */
export function OwnedTabs({
  items,
  balance,
  friends,
  friendOwned,
}: {
  items: ShopItem[];
  balance: number;
  friends: FriendSummary[];
  friendOwned: Record<string, string[]>;
}) {
  const kinds = KIND_ORDER.filter((k) => items.some((i) => i.kind === k));
  const [active, setActive] = useState<ShopItem["kind"]>(kinds[0] ?? "badge");
  const shown = items.filter((i) => i.kind === active);

  return (
    <div>
      <div role="tablist" className="mb-3 flex flex-wrap gap-1.5">
        {kinds.map((k) => {
          const count = items.filter((i) => i.kind === k).length;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={active === k}
              onClick={() => setActive(k)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active === k
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:border-border-strong"
              }`}
            >
              {KIND_LABEL[k]}
              <span className="ml-1.5 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      <ShopGrid
        items={shown}
        balance={balance}
        friends={friends}
        friendOwned={friendOwned}
      />
    </div>
  );
}
