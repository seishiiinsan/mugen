"use client";

import { useState, type ReactNode } from "react";

export type ShopTab = {
  id: string;
  label: string;
  /** Optional count badge shown next to the label. */
  count?: number;
  content: ReactNode;
};

/** Generic tab bar for the shop; each tab supplies its own rendered content. */
export function ShopTabs({ tabs }: { tabs: ShopTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

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
            {tab.count != null && (
              <span className="ml-1.5 text-[11px] opacity-60">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {current?.content}
    </div>
  );
}
