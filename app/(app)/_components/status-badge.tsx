import type { Fixture } from "@/lib/domain/types";
import { STATUS_LABELS } from "@/lib/ui/format";

export function StatusBadge({
  status,
  elapsed,
}: {
  status: Fixture["status"];
  elapsed?: number;
}) {
  if (status === "live") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
        <span className="size-1.5 rounded-full bg-danger motion-safe:animate-pulse" />
        Live
        {elapsed != null && (
          <span className="font-mono tabular-nums">{elapsed}&apos;</span>
        )}
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
      {STATUS_LABELS[status]}
    </span>
  );
}
