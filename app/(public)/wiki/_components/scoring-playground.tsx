"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { POINTS, scorePrediction } from "@/lib/domain/scoring";

type Side = "home" | "away";
type Which = "pred" | "real";

const LABEL: Record<number, string> = {
  [POINTS.EXACT]: "Score exact",
  [POINTS.RIGHT_WINNER_DIFF_CLOSE]: "Bon vainqueur, écart à 1 près",
  [POINTS.CORRECT_DRAW]: "Nul prédit et nul réel",
  [POINTS.RIGHT_WINNER_DIFF_MEDIUM]: "Bon vainqueur, écart moyen",
  [POINTS.RIGHT_WINNER_DIFF_FAR]: "Bon vainqueur, écart éloigné",
  [POINTS.WRONG]: "Mauvais résultat",
};

function Stepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`Diminuer ${label}`}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="press grid size-7 place-items-center rounded-md border border-border text-muted hover:border-border-strong"
        >
          −
        </button>
        <span className="w-8 text-center font-mono text-2xl font-bold tabular-nums">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Augmenter ${label}`}
          onClick={() => onChange(Math.min(19, value + 1))}
          className="press grid size-7 place-items-center rounded-md border border-border text-muted hover:border-border-strong"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function ScoringPlayground() {
  const reduce = useReducedMotion();
  const [pred, setPred] = useState({ home: 2, away: 1 });
  const [real, setReal] = useState({ home: 3, away: 1 });

  const set = (which: Which, side: Side) => (n: number) => {
    if (which === "pred") setPred((p) => ({ ...p, [side]: n }));
    else setReal((p) => ({ ...p, [side]: n }));
  };

  const points = scorePrediction(pred, real);
  const isWin = points > 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Prédiction */}
        <div className="rounded-xl border border-border bg-surface-2/50 p-4">
          <div className="mb-4 text-center text-xs font-semibold uppercase tracking-wide text-accent">
            Ton pronostic
          </div>
          <div className="flex items-center justify-center gap-5">
            <Stepper value={pred.home} onChange={set("pred", "home")} label="Dom." />
            <span className="text-2xl font-bold text-faint">-</span>
            <Stepper value={pred.away} onChange={set("pred", "away")} label="Ext." />
          </div>
        </div>

        {/* Résultat réel */}
        <div className="rounded-xl border border-border bg-surface-2/50 p-4">
          <div className="mb-4 text-center text-xs font-semibold uppercase tracking-wide text-muted">
            Résultat réel
          </div>
          <div className="flex items-center justify-center gap-5">
            <Stepper value={real.home} onChange={set("real", "home")} label="Dom." />
            <span className="text-2xl font-bold text-faint">-</span>
            <Stepper value={real.away} onChange={set("real", "away")} label="Ext." />
          </div>
        </div>
      </div>

      {/* Résultat */}
      <div className="mt-6 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={points}
            initial={reduce ? false : { opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={`inline-flex flex-col items-center gap-1 rounded-xl border px-8 py-4 text-center ${
              isWin
                ? "border-accent/30 bg-accent/[0.06]"
                : "border-border bg-surface-2"
            }`}
          >
            <span
              className={`font-mono text-4xl font-bold tabular-nums ${
                isWin ? "text-accent" : "text-faint"
              }`}
            >
              {points > 0 ? `+${points}` : points}
              <span className="ml-1 text-base font-normal text-muted">pts</span>
            </span>
            <span className="text-xs font-medium text-muted">{LABEL[points]}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-4 text-center text-xs text-faint">
        Joue avec les scores : les points se recalculent en direct, avec le vrai
        moteur de jeu.
      </p>
    </div>
  );
}
