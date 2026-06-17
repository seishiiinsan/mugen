"use client";

import { useTransition } from "react";
import { BADGE_META } from "@/lib/domain/cosmetics";
import { useToast } from "../../_components/toast";
import { equipItem } from "../../boutique/actions";

/**
 * Owned badges as a single-choice showcase: equip one to display it on the
 * profile, or unequip the active one.
 */
export function BadgePicker({
  owned,
  equipped,
}: {
  owned: string[];
  equipped: string | null;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();

  if (owned.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted">
        Aucun badge pour l&apos;instant — débloque des succès pour en gagner.
      </p>
    );
  }

  const onToggle = (key: string, active: boolean) =>
    start(async () => {
      const r = await equipItem("badge", active ? null : key);
      toast({ type: r.ok ? "success" : "error", message: r.message });
    });

  return (
    <div className="flex flex-wrap gap-2">
      {owned.map((key) => {
        const meta = BADGE_META[key];
        if (!meta) return null;
        const active = equipped === key;
        return (
          <button
            key={key}
            type="button"
            disabled={pending}
            onClick={() => onToggle(key, active)}
            title={active ? "Retirer de la vitrine" : `Mettre « ${meta.label} » en vitrine`}
            className={`press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
              active
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:border-border-strong"
            }`}
          >
            <span aria-hidden className="text-base">
              {meta.emoji}
            </span>
            {meta.label}
            {active && <span className="text-xs">· en vitrine</span>}
          </button>
        );
      })}
    </div>
  );
}
