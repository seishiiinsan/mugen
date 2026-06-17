"use client";

import { useActionState, useState } from "react";
import { MAX_GOALS } from "@/lib/domain/predictions";
import { BOOSTS, BOOST_TYPES, type BoostType } from "@/lib/domain/boosts";
import {
  MAX_SCORERS,
  SCORER_MISS,
  scorerHitPoints,
} from "@/lib/domain/markets";
import type { ScorerPick } from "@/lib/domain/types";
import { TeamCrest } from "../../_components/team-crest";
import { useActionToast } from "../../_components/toast";
import { submitPrediction, type PredictionFormState } from "./actions";

export interface ScorerOption {
  id: number;
  name: string;
  position: string;
  isHome: boolean;
}

export function PredictionForm({
  fixtureId,
  homeName,
  awayName,
  homeLogo,
  awayLogo,
  initial,
  initialBoost,
  initialSecondary,
  initialScorers,
  boostStock,
  scorerOptions,
  bare = false,
}: {
  fixtureId: number;
  homeName: string;
  awayName: string;
  homeLogo?: string;
  awayLogo?: string;
  initial: { home: number; away: number } | null;
  initialBoost: BoostType | null;
  initialSecondary: { home: number; away: number } | null;
  initialScorers: ScorerPick[];
  boostStock: BoostType[];
  /** Selectable scorers from the lineup; empty when no lineup is published. */
  scorerOptions: ScorerOption[];
  /** Drop the card chrome when embedded inside another card. */
  bare?: boolean;
}) {
  const [state, action, pending] = useActionState<PredictionFormState, FormData>(
    submitPrediction,
    {},
  );
  useActionToast(state, "Pronostic enregistré.");

  const start = state.values ?? initial ?? { home: 0, away: 0 };
  const [home, setHome] = useState(start.home);
  const [away, setAway] = useState(start.away);

  const [boost, setBoost] = useState<BoostType | null>(initialBoost);
  const [home2, setHome2] = useState(initialSecondary?.home ?? 0);
  const [away2, setAway2] = useState(initialSecondary?.away ?? 0);

  const [scorers, setScorers] = useState<ScorerPick[]>(initialScorers);

  function toggleScorer(opt: ScorerOption) {
    setScorers((prev) => {
      const exists = prev.some((s) => s.id === opt.id);
      if (exists) return prev.filter((s) => s.id !== opt.id);
      if (prev.length >= MAX_SCORERS) return prev;
      return [...prev, { id: opt.id, name: opt.name, position: opt.position }];
    });
  }

  return (
    <form
      action={action}
      className={bare ? "" : "rounded-xl border border-border bg-surface p-5"}
    >
      <input type="hidden" name="fixtureId" value={fixtureId} />
      <input type="hidden" name="home" value={home} />
      <input type="hidden" name="away" value={away} />
      <input type="hidden" name="boost" value={boost ?? ""} />
      <input type="hidden" name="home2" value={home2} />
      <input type="hidden" name="away2" value={away2} />
      <input type="hidden" name="scorers" value={JSON.stringify(scorers)} />

      <div className="flex items-start justify-center gap-4">
        <Stepper
          label={homeName}
          logoUrl={homeLogo}
          value={home}
          onChange={setHome}
        />
        <span className="pt-12 font-mono text-2xl text-faint">–</span>
        <Stepper
          label={awayName}
          logoUrl={awayLogo}
          value={away}
          onChange={setAway}
        />
      </div>

      {/* Boost selector — one of each type per month */}
      <div className="mt-5 border-t border-border pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-faint">
            Boost
          </span>
          <span className="text-xs text-faint">1 par type / mois</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {BOOST_TYPES.map((t) => {
            const available = boostStock.includes(t) || initialBoost === t;
            const active = boost === t;
            return (
              <button
                key={t}
                type="button"
                disabled={!available}
                onClick={() => setBoost(active ? null : t)}
                title={available ? BOOSTS[t].rule : "Déjà utilisé ce mois"}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted hover:border-border-strong"
                }`}
              >
                {BOOSTS[t].name}
              </button>
            );
          })}
        </div>
        {boost && (
          <p className="mt-2 text-xs text-muted">{BOOSTS[boost].rule}</p>
        )}
      </div>

      {/* Double chance — second prediction, best of the two is kept */}
      {boost === "double_chance" && (
        <div className="mt-4 rounded-lg border border-border bg-surface-2 p-4">
          <p className="mb-3 text-center text-xs text-faint">
            2ᵉ pronostic — on garde le meilleur
          </p>
          <div className="flex items-start justify-center gap-4">
            <Stepper
              label={homeName}
              logoUrl={homeLogo}
              value={home2}
              onChange={setHome2}
            />
            <span className="pt-12 font-mono text-2xl text-faint">–</span>
            <Stepper
              label={awayName}
              logoUrl={awayLogo}
              value={away2}
              onChange={setAway2}
            />
          </div>
        </div>
      )}

      {/* Goalscorers — from the published lineup */}
      <div className="mt-5 border-t border-border pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-faint">
            Buteurs{" "}
            <span className="normal-case text-faint">
              (selon le poste, {SCORER_MISS} si faux)
            </span>
          </span>
          <span className="text-xs text-faint">
            {scorers.length}/{MAX_SCORERS}
          </span>
        </div>

        {scorerOptions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted">
            Compositions pas encore disponibles — buteurs pronostiquables dès
            leur publication.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <ScorerColumn
              team={homeName}
              options={scorerOptions.filter((o) => o.isHome)}
              selected={scorers}
              atMax={scorers.length >= MAX_SCORERS}
              onToggle={toggleScorer}
            />
            <ScorerColumn
              team={awayName}
              options={scorerOptions.filter((o) => !o.isHome)}
              selected={scorers}
              atMax={scorers.length >= MAX_SCORERS}
              onToggle={toggleScorer}
            />
          </div>
        )}
      </div>

      {state.error && (
        <p className="mt-4 text-center text-sm text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="press mt-5 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-50"
      >
        {pending
          ? "Enregistrement…"
          : initial
            ? "Modifier le pronostic"
            : "Confirmer le pronostic"}
      </button>
    </form>
  );
}

function ScorerColumn({
  team,
  options,
  selected,
  atMax,
  onToggle,
}: {
  team: string;
  options: ScorerOption[];
  selected: ScorerPick[];
  atMax: boolean;
  onToggle: (opt: ScorerOption) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 truncate text-xs font-medium text-muted">{team}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.length === 0 && (
          <span className="text-xs text-faint">—</span>
        )}
        {options.map((opt) => {
          const active = selected.some((s) => s.id === opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              disabled={!active && atMax}
              onClick={() => onToggle(opt)}
              title={`${opt.name} · +${scorerHitPoints(opt.position)} si buteur`}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                active
                  ? "border-accent bg-accent/10 font-medium text-accent"
                  : "border-border text-muted hover:border-border-strong"
              }`}
            >
              {opt.name}
              <span className="text-[10px] text-faint">
                +{scorerHitPoints(opt.position)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stepper({
  label,
  logoUrl,
  value,
  onChange,
}: {
  label: string;
  logoUrl?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex w-28 flex-col items-center gap-2">
      <TeamCrest name={label} logoUrl={logoUrl} size={32} />
      <span className="line-clamp-2 h-8 text-center text-xs text-muted">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <StepButton
          ariaLabel={`Moins un but ${label}`}
          disabled={value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          −
        </StepButton>
        <span className="w-8 text-center font-mono text-3xl font-bold tabular-nums">
          {value}
        </span>
        <StepButton
          ariaLabel={`Plus un but ${label}`}
          disabled={value >= MAX_GOALS}
          onClick={() => onChange(Math.min(MAX_GOALS, value + 1))}
        >
          +
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  ariaLabel,
  disabled,
  onClick,
  children,
}: {
  ariaLabel: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-md border border-border text-lg leading-none text-foreground transition-colors hover:bg-surface-2 active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
