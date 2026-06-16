export default function Loading() {
  return (
    <section className="motion-safe:animate-pulse">
      <div className="mb-4 h-4 w-28 rounded bg-surface-2" />

      {/* Match header */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mx-auto mb-4 h-3 w-32 rounded bg-surface-2" />
        <div className="flex items-center justify-between">
          <div className="flex flex-1 flex-col items-center gap-2">
            <div className="size-12 rounded-full bg-surface-2" />
            <div className="h-4 w-20 rounded bg-surface-2" />
          </div>
          <div className="h-8 w-16 rounded bg-surface-2" />
          <div className="flex flex-1 flex-col items-center gap-2">
            <div className="size-12 rounded-full bg-surface-2" />
            <div className="h-4 w-20 rounded bg-surface-2" />
          </div>
        </div>
      </div>

      {/* Prediction form */}
      <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface p-5">
        <div className="h-4 w-40 rounded bg-surface-2" />
        <div className="flex items-center justify-center gap-4">
          <div className="size-16 rounded-lg bg-surface-2" />
          <div className="h-6 w-4 rounded bg-surface-2" />
          <div className="size-16 rounded-lg bg-surface-2" />
        </div>
        <div className="h-10 w-full rounded-lg bg-surface-2" />
      </div>
    </section>
  );
}
