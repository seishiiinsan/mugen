"use client";

import { useActionState } from "react";
import type { Visibility, VisibilityAspect } from "@/lib/domain/types";
import { updateVisibility, type VisibilityState } from "../actions";

const ASPECTS: { key: VisibilityAspect; label: string; hint: string }[] = [
  { key: "predictions", label: "Pronostics à venir", hint: "Vos pronos sur les matchs à venir." },
  { key: "stats", label: "Statistiques", hint: "Points cumulés, scores exacts, niveau." },
  { key: "achievements", label: "Succès & badges", hint: "Vos succès débloqués." },
  { key: "friends", label: "Liste d'amis", hint: "Votre nombre d'amis." },
];

const OPTIONS: { value: string; label: string }[] = [
  { value: "everyone", label: "Tout le monde" },
  { value: "friends", label: "Amis seulement" },
  { value: "private", label: "Moi uniquement" },
];

export function VisibilityForm({ initial }: { initial: Visibility }) {
  const [state, action, pending] = useActionState<VisibilityState, FormData>(
    updateVisibility,
    {},
  );

  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border border-border bg-surface p-4"
    >
      <div>
        <h2 className="text-sm font-semibold">Confidentialité</h2>
        <p className="mt-0.5 text-xs text-muted">
          Choisissez qui peut voir chaque partie de votre profil.
        </p>
      </div>

      <div className="space-y-3">
        {ASPECTS.map((a) => (
          <label key={a.key} className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium">{a.label}</span>
              <span className="block text-xs text-faint">{a.hint}</span>
            </span>
            <select
              name={a.key}
              defaultValue={initial[a.key]}
              className="shrink-0 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-accent"
            >
              {OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      {state.ok && (
        <p className="text-xs text-success">Confidentialité enregistrée.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="press w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Enregistrer la confidentialité"}
      </button>
    </form>
  );
}
