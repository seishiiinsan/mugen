"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { useActionToast } from "../../_components/toast";
import { updateProfile, type ProfileFormState } from "../actions";

export function ProfileForm({
  initialUsername,
  initialAvatar,
}: {
  initialUsername: string;
  initialAvatar?: string;
}) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(
    updateProfile,
    {},
  );
  useActionToast(state);
  const [username, setUsername] = useState(initialUsername);
  const [preview, setPreview] = useState<string | null>(initialAvatar ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  return (
    <form action={action} className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-full bg-surface-2 ring-2 ring-accent/30">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center text-2xl font-bold text-muted">
              {username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            name="avatar"
            accept="image/*"
            onChange={onFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="press rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium transition-colors hover:border-border-strong"
          >
            Changer la photo
          </button>
          <p className="mt-1 text-xs text-faint">JPG ou PNG · 2 Mo max.</p>
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Pseudo</span>
        <input
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={20}
          required
          autoComplete="username"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
        />
        <span className="mt-1 block text-xs text-faint">
          Lettres, chiffres et underscore · 2 à 20 caractères.
        </span>
      </label>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="press rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <Link
          href="/profil"
          className="press rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
