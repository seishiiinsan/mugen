"use client";

import { useState } from "react";
import type { Report, ReportCategory } from "@/lib/domain/types";
import { formatDate } from "@/lib/ui/format";
import { REPORT_CATEGORY_META, REPORT_STATUS_META } from "@/lib/ui/reports";

type Filter = "all" | ReportCategory;

const TABS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "bug", label: "Bugs" },
  { id: "suggestion", label: "Suggestions" },
  { id: "other", label: "Autres" },
];

/** The viewer's own reports, filterable by category. */
export function MyReports({ reports }: { reports: Report[] }) {
  const [active, setActive] = useState<Filter>("all");
  const shown =
    active === "all" ? reports : reports.filter((r) => r.category === active);
  const countFor = (id: Filter) =>
    id === "all" ? reports.length : reports.filter((r) => r.category === id).length;

  return (
    <div>
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
        Mes signalements
      </h2>

      <div
        role="tablist"
        className="mb-3 flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1"
      >
        {TABS.map((tab) => (
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
            <span className="ml-1.5 text-[11px] opacity-60">{countFor(tab.id)}</span>
          </button>
        ))}
      </div>

      {shown.length > 0 ? (
        <ul className="space-y-2.5">
          {shown.map((r) => {
            const cat = REPORT_CATEGORY_META[r.category];
            const status = REPORT_STATUS_META[r.status];
            return (
              <li
                key={r.id}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cat.chip}`}
                      >
                        {cat.label}
                      </span>
                      <span className="text-xs text-faint">
                        {formatDate(r.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm font-semibold">{r.title}</div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted">
                      {r.message}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.chip}`}
                  >
                    {status.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          Aucun signalement dans cette catégorie.
        </p>
      )}
    </div>
  );
}
