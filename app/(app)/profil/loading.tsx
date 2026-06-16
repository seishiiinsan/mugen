export default function Loading() {
  return (
    <section className="motion-safe:animate-pulse">
      <header className="mb-6 flex items-center gap-3">
        <div className="size-14 rounded-full bg-surface-2" />
        <div className="space-y-2">
          <div className="h-5 w-36 rounded bg-surface-2" />
          <div className="h-4 w-24 rounded bg-surface-2" />
        </div>
      </header>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-surface p-3 text-center"
          >
            <div className="mx-auto h-7 w-12 rounded bg-surface-2" />
            <div className="mx-auto mt-2 h-3 w-16 rounded bg-surface-2" />
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-lg border border-border bg-surface"
          />
        ))}
      </div>
    </section>
  );
}
