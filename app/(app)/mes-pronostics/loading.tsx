export default function Loading() {
  return (
    <section>
      <div className="h-6 w-40 rounded bg-surface-2" />
      <div className="mt-2 h-4 w-64 rounded bg-surface-2" />

      <div className="mb-6 mt-5 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[68px] rounded-lg border border-border bg-surface motion-safe:animate-pulse"
          />
        ))}
      </div>

      <div className="mb-2 h-3 w-20 rounded bg-surface-2" />
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface motion-safe:animate-pulse"
          >
            <div className="flex items-center justify-between px-4 pt-3">
              <div className="h-3 w-24 rounded bg-surface-2" />
              <div className="h-4 w-14 rounded-full bg-surface-2" />
            </div>
            <div className="space-y-2.5 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="size-[22px] rounded-full bg-surface-2" />
                <div className="h-4 w-36 rounded bg-surface-2" />
              </div>
              <div className="flex items-center gap-2.5">
                <div className="size-[22px] rounded-full bg-surface-2" />
                <div className="h-4 w-28 rounded bg-surface-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
