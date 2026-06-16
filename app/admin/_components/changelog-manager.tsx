"use client";

import { useState, useTransition } from "react";
import type { ChangelogEntry } from "@/lib/domain/types";
import { formatDate } from "@/lib/ui/format";
import { Markdown } from "@/app/_components/markdown";
import { deleteChangelog, upsertChangelog } from "../actions";

const EMPTY = { id: "", version: "", title: "", body: "", published: true };

export function ChangelogManager({ entries }: { entries: ChangelogEntry[] }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const editing = form.id !== "";

  const reset = () => {
    setForm(EMPTY);
    setError(undefined);
  };

  const load = (e: ChangelogEntry) =>
    setForm({
      id: e.id,
      version: e.version ?? "",
      title: e.title,
      body: e.body,
      published: e.published,
    });

  const submit = () => {
    const fd = new FormData();
    if (form.id) fd.set("id", form.id);
    fd.set("version", form.version);
    fd.set("title", form.title);
    fd.set("body", form.body);
    if (form.published) fd.set("published", "on");
    start(async () => {
      const res = await upsertChangelog({}, fd);
      if (res.error) setError(res.error);
      else reset();
    });
  };

  const remove = (id: string) =>
    start(async () => {
      await deleteChangelog(id);
      if (form.id === id) reset();
    });

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Changelog</h1>
        <p className="text-sm text-muted">
          Rédige les nouveautés en markdown. Les entrées publiées apparaissent
          sur la page publique.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {editing ? "Modifier l'entrée" : "Nouvelle entrée"}
            </h2>
            {editing && (
              <button
                type="button"
                onClick={reset}
                className="text-xs font-medium text-muted hover:text-foreground"
              >
                Annuler
              </button>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="v1.2"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Titre — résumé de la version"
                className="col-span-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
              />
            </div>

            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={10}
              placeholder={"## Ajouts\n- …\n\n## Corrections\n- …"}
              className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
            />

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) =>
                  setForm({ ...form, published: e.target.checked })
                }
                className="size-4 accent-[var(--accent)]"
              />
              Publié (visible sur la page publique)
            </label>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="press w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-50"
            >
              {pending ? "…" : editing ? "Enregistrer" : "Créer l'entrée"}
            </button>
          </div>

          {/* Live preview */}
          {form.body.trim() && (
            <div className="mt-5 border-t border-border pt-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
                Aperçu
              </div>
              <Markdown>{form.body}</Markdown>
            </div>
          )}
        </div>

        {/* List */}
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">
            Entrées ({entries.length})
          </h2>
          {entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
              Aucune entrée pour l&apos;instant.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {e.version && (
                          <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent">
                            {e.version}
                          </span>
                        )}
                        {!e.published && (
                          <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-faint">
                            Brouillon
                          </span>
                        )}
                        <span className="text-xs text-faint">
                          {formatDate(e.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1.5 text-sm font-semibold">
                        {e.title}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => load(e)}
                        className="press rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted hover:border-border-strong hover:text-foreground"
                      >
                        Éditer
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(e.id)}
                        disabled={pending}
                        className="press rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50"
                      >
                        Suppr.
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
