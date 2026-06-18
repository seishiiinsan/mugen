"use client";

import { useActionState } from "react";
import type { PublicGroup } from "@/lib/domain/types";
import { useActionToast } from "../../_components/toast";
import { createGroup, joinGroup, type GroupFormState } from "../actions";
import { PublicGroupsButton } from "./public-groups-modal";

export function GroupForms({ publicGroups }: { publicGroups: PublicGroup[] }) {
  const [createState, createAction, creating] = useActionState<
    GroupFormState,
    FormData
  >(createGroup, {});
  const [joinState, joinAction, joining] = useActionState<
    GroupFormState,
    FormData
  >(joinGroup, {});
  useActionToast(createState);
  useActionToast(joinState);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <form
        action={createAction}
        className="space-y-3 rounded-xl border border-border bg-surface p-4"
      >
        <div>
          <h2 className="text-sm font-semibold">Créer un groupe</h2>
          <p className="mt-0.5 text-xs text-muted">
            Vous obtenez un code à partager avec vos amis.
          </p>
        </div>
        <input
          name="name"
          required
          minLength={2}
          maxLength={40}
          placeholder="Nom du groupe"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
        />
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            name="public"
            className="size-4 rounded border-border accent-accent"
          />
          Groupe public — visible et rejoignable par tous, sans code.
        </label>
        {createState.error && (
          <p className="text-xs text-danger">{createState.error}</p>
        )}
        <button
          type="submit"
          disabled={creating}
          className="press w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {creating ? "Création…" : "Créer le groupe"}
        </button>
      </form>

      <form
        action={joinAction}
        className="space-y-3 rounded-xl border border-border bg-surface p-4"
      >
        <div>
          <h2 className="text-sm font-semibold">Rejoindre un groupe</h2>
          <p className="mt-0.5 text-xs text-muted">
            Saisissez le code d&apos;invitation reçu.
          </p>
        </div>
        <input
          name="code"
          required
          minLength={4}
          maxLength={10}
          autoCapitalize="characters"
          placeholder="Code (ex. K7M2QP)"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm uppercase tracking-widest outline-none transition-colors focus:border-accent"
        />
        {joinState.error && (
          <p className="text-xs text-danger">{joinState.error}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <PublicGroupsButton groups={publicGroups} />
          <button
            type="submit"
            disabled={joining}
            className="press rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold transition-colors hover:border-border-strong disabled:opacity-60"
          >
            {joining ? "…" : "Rejoindre"}
          </button>
        </div>
      </form>
    </div>
  );
}
