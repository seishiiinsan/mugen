"use client";

import { useActionState, useState } from "react";
import {
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  type AuthState,
} from "./actions";

export function LoginForm({
  redirectTo,
  authError,
}: {
  redirectTo: string;
  authError: boolean;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [signInState, signInAction, signInPending] = useActionState<
    AuthState,
    FormData
  >(signInWithPassword, {});
  const [signUpState, signUpAction, signUpPending] = useActionState<
    AuthState,
    FormData
  >(signUpWithPassword, {});

  const isSignup = mode === "signup";
  const state = isSignup ? signUpState : signInState;
  const pending = isSignup ? signUpPending : signInPending;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 rounded-lg border border-border bg-surface p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`rounded-md py-2 font-medium transition-colors ${
            !isSignup ? "bg-surface-2 text-foreground" : "text-muted"
          }`}
        >
          Connexion
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-md py-2 font-medium transition-colors ${
            isSignup ? "bg-surface-2 text-foreground" : "text-muted"
          }`}
        >
          Inscription
        </button>
      </div>

      <form action={signInWithGoogle}>
        <input type="hidden" name="redirect" value={redirectTo} />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
        >
          <GoogleMark /> Continuer avec Google
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={isSignup ? signUpAction : signInAction} className="space-y-3">
        <input type="hidden" name="redirect" value={redirectTo} />

        {isSignup && (
          <Field
            name="username"
            label="Pseudo"
            type="text"
            placeholder="Votre pseudo"
            autoComplete="username"
          />
        )}
        <Field
          name="email"
          label="E-mail"
          type="email"
          placeholder="vous@exemple.fr"
          autoComplete="email"
        />
        <Field
          name="password"
          label="Mot de passe"
          type="password"
          placeholder="••••••••"
          autoComplete={isSignup ? "new-password" : "current-password"}
        />

        {authError && !state.error && (
          <p className="text-sm text-danger">
            La connexion a échoué. Réessayez.
          </p>
        )}
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.message && <p className="text-sm text-success">{state.message}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-accent-strong py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent disabled:opacity-60"
        >
          {pending
            ? "Veuillez patienter…"
            : isSignup
              ? "Créer mon compte"
              : "Se connecter"}
        </button>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  type,
  placeholder,
  autoComplete,
}: {
  name: string;
  label: string;
  type: string;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 5.1 29.4 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 5.1 29.4 3 24 3 16 3 9.1 7.6 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.9 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9 40.3 15.9 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.3 5.3C40.9 36.3 45 30.7 45 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
