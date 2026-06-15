"use client";

import { useActionState, useState } from "react";
import { MAX_GOALS } from "@/lib/domain/predictions";
import { TeamCrest } from "../../_components/team-crest";
import { submitPrediction, type PredictionFormState } from "./actions";

export function PredictionForm({
  fixtureId,
  homeName,
  awayName,
  homeLogo,
  awayLogo,
  initial,
}: {
  fixtureId: number;
  homeName: string;
  awayName: string;
  homeLogo?: string;
  awayLogo?: string;
  initial: { home: number; away: number } | null;
}) {
  const [state, action, pending] = useActionState<PredictionFormState, FormData>(
    submitPrediction,
    {},
  );

  const start = state.values ?? initial ?? { home: 0, away: 0 };
  const [home, setHome] = useState(start.home);
  const [away, setAway] = useState(start.away);

  return (
    <form
      action={action}
      className="rounded-xl border border-border bg-surface p-5"
    >
      <input type="hidden" name="fixtureId" value={fixtureId} />
      <input type="hidden" name="home" value={home} />
      <input type="hidden" name="away" value={away} />

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

      {state.error && (
        <p className="mt-4 text-center text-sm text-danger">{state.error}</p>
      )}
      {state.ok && (
        <p className="mt-4 text-center text-sm text-success">
          Pronostic enregistré ({home}-{away}) — modifiable jusqu&apos;à la
          clôture.
        </p>
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
