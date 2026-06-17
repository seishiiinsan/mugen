"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import type { ReportCategory } from "@/lib/domain/types";
import { useActionToast } from "../_components/toast";
import { submitReport, type ReportActionState } from "./actions";

const CATEGORIES: { value: ReportCategory; label: string; hint: string }[] = [
  { value: "bug", label: "Bug", hint: "Quelque chose ne marche pas" },
  { value: "suggestion", label: "Suggestion", hint: "Une idée d'amélioration" },
  { value: "other", label: "Autre", hint: "Tout le reste" },
];

export function ReportForm() {
  const [state, action, pending] = useActionState<ReportActionState, FormData>(
    submitReport,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  useActionToast(state, "Merci, ton signalement a été envoyé.");

  // Clear the fields (incl. category radios) after a successful submission.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {/* Capture where the report came from, best-effort. */}
      <input
        type="hidden"
        name="page_url"
        value={typeof window !== "undefined" ? document.referrer || "" : ""}
      />

      {/* Category — uncontrolled radios styled as a segmented control */}
      <fieldset>
        <legend className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-faint">
          Catégorie
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c, i) => (
            <label
              key={c.value}
              className="press cursor-pointer rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:border-border-strong has-[:checked]:border-accent has-[:checked]:bg-accent/10"
            >
              <input
                type="radio"
                name="category"
                value={c.value}
                defaultChecked={i === 0}
                className="peer sr-only"
              />
              <span className="block text-sm font-semibold peer-checked:text-accent">
                {c.label}
              </span>
              <span className="block text-[11px] text-faint">{c.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="title"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-faint"
        >
          Titre
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          minLength={3}
          maxLength={120}
          placeholder="Résume en quelques mots"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label
          htmlFor="message"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-faint"
        >
          Détails
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={5}
          maxLength={4000}
          rows={6}
          placeholder="Décris ce que tu as vu, ce que tu attendais, ou ton idée…"
          className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-danger/30 bg-danger/[0.06] px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="press w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-50"
      >
        {pending ? "Envoi…" : "Envoyer"}
      </button>
    </form>
  );
}
