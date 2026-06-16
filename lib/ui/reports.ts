import type { ReportCategory, ReportStatus } from "@/lib/domain/types";

/** Player-facing + admin labels and chip styles for report categories. */
export const REPORT_CATEGORY_META: Record<
  ReportCategory,
  { label: string; chip: string; dot: string }
> = {
  bug: {
    label: "Bug",
    chip: "border-danger/30 bg-danger/10 text-danger",
    dot: "bg-danger",
  },
  suggestion: {
    label: "Suggestion",
    chip: "border-accent/30 bg-accent/10 text-accent",
    dot: "bg-accent",
  },
  other: {
    label: "Autre",
    chip: "border-border bg-surface-2 text-muted",
    dot: "bg-faint",
  },
};

/** Labels and chip styles for report statuses (kanban columns + badges). */
export const REPORT_STATUS_META: Record<
  ReportStatus,
  { label: string; chip: string }
> = {
  new: { label: "À traiter", chip: "border-border bg-surface-2 text-muted" },
  in_progress: {
    label: "En cours",
    chip: "border-gold/40 bg-gold/10 text-gold",
  },
  done: { label: "Traité", chip: "border-success/30 bg-success/10 text-success" },
  rejected: { label: "Rejeté", chip: "border-border bg-surface-2 text-faint" },
};

/** Ordered statuses, left-to-right kanban flow. */
export const REPORT_STATUS_ORDER: ReportStatus[] = [
  "new",
  "in_progress",
  "done",
  "rejected",
];
