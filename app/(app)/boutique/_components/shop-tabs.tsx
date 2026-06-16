"use client";

import { useState } from "react";
import type { ShopItem } from "@/lib/domain/types";
import { ShopItemCard } from "./shop-item-card";

type Tab = {
  id: string;
  label: string;
  items: ShopItem[];
};

export function ShopTabs({
  tabs,
  balance,
}: {
  tabs: Tab[];
  balance: number;
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const current = tabs.find((t) => t.id === active);

  return (
    <div>
      <div
        role="tablist"
        className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active === tab.id
                ? "bg-accent/10 text-accent"
                : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-[11px] opacity-60">
              {tab.items.length}
            </span>
          </button>
        ))}
      </div>

      {current && current.items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {current.items.map((item) => (
            <ShopItemCard key={item.key} item={item} balance={balance} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          Aucun article dans cette catégorie.
        </p>
      )}
    </div>
  );
}
