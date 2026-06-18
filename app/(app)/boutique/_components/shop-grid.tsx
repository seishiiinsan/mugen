"use client";

import type { FriendSummary, ShopItem } from "@/lib/domain/types";
import { ShopItemCard } from "./shop-item-card";

/** A responsive grid of shop item cards (shared by catalog + owned tabs). */
export function ShopGrid({
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
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
        Aucun article dans cette catégorie.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <ShopItemCard
          key={item.key}
          item={item}
          balance={balance}
          friends={friends}
          friendOwned={friendOwned}
        />
      ))}
    </div>
  );
}
