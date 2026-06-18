"use client";

import { useActionState } from "react";
import { useActionToast } from "../../_components/toast";
import { updateGroupSettings, type GroupSettingsState } from "../actions";

export function GroupSettingsForm({
  groupId,
  initialName,
  initialPublic,
  initialMaxMembers,
  initialMinLevel,
  memberCount,
}: {
  groupId: string;
  initialName: string;
  initialPublic: boolean;
  initialMaxMembers: number | null;
  initialMinLevel: number;
  memberCount: number;
}) {
  const [state, action, pending] = useActionState<GroupSettingsState, FormData>(
    updateGroupSettings,
    {},
  );
  useActionToast(state, "Réglages enregistrés.");

  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border border-border bg-surface p-4"
    >
      <input type="hidden" name="groupId" value={groupId} />

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">
          Nom du groupe
        </span>
        <input
          name="name"
          required
          minLength={2}
          maxLength={40}
          defaultValue={initialName}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">
            Nombre max de membres
          </span>
          <input
            name="maxMembers"
            type="number"
            min={1}
            inputMode="numeric"
            defaultValue={initialMaxMembers ?? ""}
            placeholder="Illimité"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
          <span className="mt-1 block text-xs text-faint">
            {memberCount} membre{memberCount > 1 ? "s" : ""} actuellement · vide =
            illimité.
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">
            Niveau requis
          </span>
          <input
            name="minLevel"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={initialMinLevel || ""}
            placeholder="0"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
          <span className="mt-1 block text-xs text-faint">
            Niveau minimum pour rejoindre · 0 = aucun.
          </span>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          name="public"
          defaultChecked={initialPublic}
          className="size-4 rounded border-border accent-accent"
        />
        Groupe public — visible et rejoignable par tous, sans code.
      </label>

      {state.error && <p className="text-xs text-danger">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="press rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Enregistrer les réglages"}
      </button>
    </form>
  );
}
