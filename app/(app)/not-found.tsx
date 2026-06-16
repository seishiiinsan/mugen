import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border p-10 text-center">
      <span className="font-mono text-3xl font-bold tabular-nums text-faint">
        404
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">
          Page introuvable
        </h1>
        <p className="text-sm text-muted">
          Ce contenu n&apos;existe pas ou n&apos;est plus disponible.
        </p>
      </div>
      <Link
        href="/matchs"
        className="press rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong"
      >
        Retour aux matchs
      </Link>
    </section>
  );
}
