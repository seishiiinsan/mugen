"use client";

import { useState, useTransition } from "react";
import type { Report, ReportCategory } from "@/lib/domain/types";
import { formatDate } from "@/lib/ui/format";
import { REPORT_CATEGORY_META, REPORT_STATUS_META } from "@/lib/ui/reports";
import { useToast } from "../../_components/toast";
import { deleteReport, updateReport } from "../actions";

type Filter = "all" | ReportCategory;

const TABS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "bug", label: "Bugs" },
  { id: "suggestion", label: "Suggestions" },
  { id: "other", label: "Autres" },
];

const CATEGORY_OPTIONS: ReportCategory[] = ["bug", "suggestion", "other"];

/** The viewer's own reports, filterable by category, each editable while "new". */
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
          {shown.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          Aucun signalement dans cette catégorie.
        </p>
      )}
    </div>
  );
}

function ReportCard({ report: r }: { report: Report }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const editable = r.status === "new";

  const status = REPORT_STATUS_META[r.status];

  const onDelete = () =>
    start(async () => {
      const res = await deleteReport(r.id);
      toast({ type: res.ok ? "success" : "error", message: res.message });
      if (!res.ok) setConfirmDelete(false);
    });

  if (editing) {
    return (
      <li className="rounded-xl border border-accent/40 bg-surface p-4">
        <ReportEditor
          report={r}
          pending={pending}
          onCancel={() => setEditing(false)}
          onSave={(input) =>
            start(async () => {
              const res = await updateReport(r.id, input);
              toast({ type: res.ok ? "success" : "error", message: res.message });
              if (res.ok) setEditing(false);
            })
          }
        />
      </li>
    );
  }

  const cat = REPORT_CATEGORY_META[r.category];
  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cat.chip}`}
            >
              {cat.label}
            </span>
            <span className="text-xs text-faint">{formatDate(r.createdAt)}</span>
          </div>
          <div className="mt-1.5 text-sm font-semibold">{r.title}</div>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted">{r.message}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.chip}`}
        >
          {status.label}
        </span>
      </div>

      {editable && (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          {confirmDelete ? (
            <>
              <span className="text-xs text-muted">Supprimer ce signalement ?</span>
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="press rounded-md border border-danger/40 px-2.5 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
              >
                {pending ? "…" : "Oui, supprimer"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={pending}
                className="press rounded-md px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-60"
              >
                Annuler
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="press rounded-md border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:border-border-strong"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="press rounded-md px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-danger"
              >
                Supprimer
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}

function ReportEditor({
  report: r,
  pending,
  onSave,
  onCancel,
}: {
  report: Report;
  pending: boolean;
  onSave: (input: { category: string; title: string; message: string }) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<ReportCategory>(r.category);
  const [title, setTitle] = useState(r.title);
  const [message, setMessage] = useState(r.message);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ category, title, message });
      }}
      className="space-y-3"
    >
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_OPTIONS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
              category === c
                ? REPORT_CATEGORY_META[c].chip
                : "border-border text-muted hover:border-border-strong"
            }`}
          >
            {REPORT_CATEGORY_META[c].label}
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        placeholder="Titre"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={4000}
        rows={4}
        placeholder="Message"
        className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
      />

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="press rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="press rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-60"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
