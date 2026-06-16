"use client";

import { useOptimistic, useTransition } from "react";
import type { Report, ReportStatus } from "@/lib/domain/types";
import { setReportStatus } from "../actions";

/**
 * Holds the report list with optimistic status moves: a card jumps to its new
 * column instantly while the server action runs, and reconciles on refresh.
 */
export function useOptimisticHelper(reports: Report[]) {
  const [, startTransition] = useTransition();
  const [items, applyMove] = useOptimistic(
    reports,
    (state: Report[], { id, status }: { id: string; status: ReportStatus }) =>
      state.map((r) => (r.id === id ? { ...r, status } : r)),
  );

  const move = (id: string, status: ReportStatus) => {
    startTransition(async () => {
      applyMove({ id, status });
      await setReportStatus(id, status);
    });
  };

  return { items, move };
}
