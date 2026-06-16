"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border p-10 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-danger/10 text-danger">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
          aria-hidden
        >
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">
          Une erreur est survenue
        </h1>
        <p className="text-sm text-muted">
          Le chargement a échoué. Cela peut venir des données de matchs ou du
          réseau. Réessayez dans un instant.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="press rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong"
      >
        Réessayer
      </button>
    </section>
  );
}
