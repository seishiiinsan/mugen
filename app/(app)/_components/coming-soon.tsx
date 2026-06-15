// Reusable placeholder for navbar sections whose content isn't built yet.

export function ComingSoon({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase?: string;
}) {
  return (
    <section>
      <h1 className="mb-1 text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mb-6 text-sm text-muted">{description}</p>

      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-16 text-center">
        <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium uppercase tracking-wide text-faint">
          À venir{phase ? ` · ${phase}` : ""}
        </span>
        <p className="max-w-xs text-sm text-muted">
          Cette section sera disponible prochainement.
        </p>
      </div>
    </section>
  );
}
