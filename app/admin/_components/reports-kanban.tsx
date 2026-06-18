"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Report, ReportCategory, ReportStatus } from "@/lib/domain/types";
import { formatDate } from "@/lib/ui/format";
import {
  REPORT_CATEGORY_META,
  REPORT_STATUS_META,
  REPORT_STATUS_ORDER,
} from "@/lib/ui/reports";
import { BadgeIcon } from "@/app/(app)/_components/icons";
import { grantBugHunter, setReportNotes } from "../actions";
import { useOptimisticHelper } from "./use-optimistic-reports";

type Filter = ReportCategory | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "bug", label: "Bugs" },
  { value: "suggestion", label: "Suggestions" },
  { value: "other", label: "Autres" },
];

export function ReportsKanban({ reports }: { reports: Report[] }) {
  const reduce = useReducedMotion();
  const { items, move } = useOptimisticHelper(reports);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Report | null>(null);

  const visible =
    filter === "all" ? items : items.filter((r) => r.category === filter);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Signalements</h1>
          <p className="text-sm text-muted">
            {items.length} signalement{items.length > 1 ? "s" : ""} · glisse-les
            le long du flux.
          </p>
        </div>
        {/* Category filter */}
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {REPORT_STATUS_ORDER.map((status) => {
          const col = visible.filter((r) => r.status === status);
          const meta = REPORT_STATUS_META[status];
          return (
            <div
              key={status}
              className="flex flex-col rounded-xl border border-border bg-surface-2/40 p-2.5"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-semibold">{meta.label}</span>
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium tabular-nums text-muted">
                  {col.length}
                </span>
              </div>

              <div className="flex min-h-12 flex-col gap-2">
                <AnimatePresence initial={false}>
                  {col.map((r) => (
                    <motion.button
                      key={r.id}
                      type="button"
                      layout={!reduce}
                      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => setSelected(r)}
                      className="group rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-border-strong"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${REPORT_CATEGORY_META[r.category].chip}`}
                        >
                          {REPORT_CATEGORY_META[r.category].label}
                        </span>
                        <span className="text-[10px] text-faint">
                          {formatDate(r.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1.5 text-sm font-semibold leading-snug">
                        {r.title}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                        {r.message}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="truncate text-[11px] text-faint">
                          {r.username ?? "—"}
                        </span>
                        <StatusMover
                          status={r.status}
                          onMove={(s) => move(r.id, s)}
                        />
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>

                {col.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-faint">
                    Vide
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <DetailPanel
          report={items.find((r) => r.id === selected.id) ?? selected}
          onClose={() => setSelected(null)}
          onMove={(s) => move(selected.id, s)}
        />
      )}
    </div>
  );
}

/** Prev / next column arrows on a card (stop propagation so the card doesn't open). */
function StatusMover({
  status,
  onMove,
}: {
  status: ReportStatus;
  onMove: (s: ReportStatus) => void;
}) {
  const idx = REPORT_STATUS_ORDER.indexOf(status);
  const prev = REPORT_STATUS_ORDER[idx - 1];
  const next = REPORT_STATUS_ORDER[idx + 1];
  return (
    <span className="flex items-center gap-1">
      <span
        role="button"
        tabIndex={prev ? 0 : -1}
        aria-label="Colonne précédente"
        aria-disabled={!prev}
        onClick={(e) => {
          e.stopPropagation();
          if (prev) onMove(prev);
        }}
        onKeyDown={(e) => {
          if (prev && (e.key === "Enter" || e.key === " ")) {
            e.stopPropagation();
            e.preventDefault();
            onMove(prev);
          }
        }}
        className={`grid size-6 place-items-center rounded-md border text-xs ${
          prev
            ? "cursor-pointer border-border text-muted hover:border-border-strong hover:text-foreground"
            : "cursor-not-allowed border-transparent text-border-strong"
        }`}
      >
        ◀
      </span>
      <span
        role="button"
        tabIndex={next ? 0 : -1}
        aria-label="Colonne suivante"
        aria-disabled={!next}
        onClick={(e) => {
          e.stopPropagation();
          if (next) onMove(next);
        }}
        onKeyDown={(e) => {
          if (next && (e.key === "Enter" || e.key === " ")) {
            e.stopPropagation();
            e.preventDefault();
            onMove(next);
          }
        }}
        className={`grid size-6 place-items-center rounded-md border text-xs ${
          next
            ? "cursor-pointer border-border text-muted hover:border-border-strong hover:text-foreground"
            : "cursor-not-allowed border-transparent text-border-strong"
        }`}
      >
        ▶
      </span>
    </span>
  );
}

/** Modal showing the full report with editable triage notes + status picker. */
function DetailPanel({
  report,
  onClose,
  onMove,
}: {
  report: Report;
  onClose: () => void;
  onMove: (s: ReportStatus) => void;
}) {
  const [notes, setNotes] = useState(report.adminNotes ?? "");
  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);
  const [granting, startGrant] = useTransition();
  const [badgeMsg, setBadgeMsg] = useState<string | null>(null);
  const [granted, setGranted] = useState(false);
  const hasBadge = report.reporterHasBugHunter || granted;
  const cat = REPORT_CATEGORY_META[report.category];

  const save = () => {
    setSaved(false);
    startSave(async () => {
      await setReportNotes(report.id, notes);
      setSaved(true);
    });
  };

  const grantBadge = () => {
    if (!report.userId) return;
    setBadgeMsg(null);
    startGrant(async () => {
      const r = await grantBugHunter(report.userId!);
      setBadgeMsg(r.message);
      if (r.ok) setGranted(true);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cat.chip}`}
            >
              {cat.label}
            </span>
            <span className="text-xs text-faint">
              {formatDate(report.createdAt)} · {report.username ?? "—"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="press grid size-7 place-items-center rounded-md text-muted hover:bg-surface-2"
          >
            ✕
          </button>
        </div>

        <h2 className="mt-3 text-lg font-semibold">{report.title}</h2>
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted">
          {report.message}
        </p>
        {report.pageUrl && (
          <p className="mt-2 truncate text-xs text-faint">
            Depuis : {report.pageUrl}
          </p>
        )}

        {/* Status picker */}
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-faint">
            Statut
          </div>
          <div className="flex flex-wrap gap-2">
            {REPORT_STATUS_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onMove(s)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  report.status === s
                    ? REPORT_STATUS_META[s].chip
                    : "border-border text-muted hover:border-border-strong"
                }`}
              >
                {REPORT_STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-faint">
            Notes internes
          </div>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSaved(false);
            }}
            rows={3}
            placeholder="Notes de triage (visibles uniquement par l'admin)…"
            className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
          />
          <div className="mt-2 flex items-center justify-end gap-3">
            {saved && <span className="text-xs text-success">Enregistré</span>}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="press rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-50"
            >
              {saving ? "…" : "Enregistrer les notes"}
            </button>
          </div>
        </div>

        {/* Reward — grant the Bug hunter badge to the reporter */}
        {report.userId && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-faint">
              Récompense
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {hasBadge ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-success">
                  <BadgeIcon className="size-4" />
                  Possède déjà le badge Bug hunter
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={grantBadge}
                    disabled={granting}
                    className="press inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-border-strong disabled:opacity-60"
                  >
                    <BadgeIcon className="size-4 text-accent" />
                    {granting ? "…" : "Attribuer le badge Bug hunter"}
                  </button>
                  {badgeMsg && (
                    <span className="text-xs text-muted">{badgeMsg}</span>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
