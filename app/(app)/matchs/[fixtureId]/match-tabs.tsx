"use client";

import { useState } from "react";

/**
 * Two-pane switch for the match page: "Mes pronos" and "Détails du match".
 * Both panes stay mounted (toggled via `hidden`) so the prediction form keeps
 * its state when the user flips to the details and back.
 */
export function MatchTabs({
  predictions,
  details,
}: {
  predictions: React.ReactNode;
  details: React.ReactNode;
}) {
  const [tab, setTab] = useState<"predictions" | "details">("predictions");

  return (
    <div>
      <div
        role="tablist"
        className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1"
      >
        <TabBtn active={tab === "predictions"} onClick={() => setTab("predictions")}>
          Mes pronos
        </TabBtn>
        <TabBtn active={tab === "details"} onClick={() => setTab("details")}>
          Détails du match
        </TabBtn>
      </div>

      <div hidden={tab !== "predictions"}>{predictions}</div>
      <div hidden={tab !== "details"}>{details}</div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-accent/10 text-accent"
          : "text-muted hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
