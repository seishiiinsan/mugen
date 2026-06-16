export default function Loading() {
  return (
    <section className="motion-safe:animate-pulse">
      <header className="mb-6">
        <div className="h-6 w-40 rounded bg-surface-2" />
        <div className="mt-2 h-4 w-56 rounded bg-surface-2" />
      </header>

      {/* Podium */}
      <div className="mb-8 flex items-end justify-center gap-3">
        {[16, 24, 12].map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="size-12 rounded-full bg-surface-2" />
            <div className="h-3 w-12 rounded bg-surface-2" />
            <div
              className="w-full rounded-t-lg bg-surface-2"
              style={{ height: `${h * 4}px` }}
            />
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
          >
            <div className="size-6 rounded bg-surface-2" />
            <div className="size-8 rounded-full bg-surface-2" />
            <div className="h-4 flex-1 rounded bg-surface-2" />
            <div className="h-4 w-12 rounded bg-surface-2" />
          </div>
        ))}
      </div>
    </section>
  );
}
