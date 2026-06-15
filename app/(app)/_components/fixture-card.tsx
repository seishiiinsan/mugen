import Link from "next/link";
import type { Fixture, Prediction } from "@/lib/domain/types";
import { BOOSTS, scoreBoosted } from "@/lib/domain/boosts";
import { formatMatchDay, formatTime } from "@/lib/ui/format";
import { PredictionsIcon } from "./icons";
import { StatusBadge } from "./status-badge";
import { TeamCrest } from "./team-crest";

export function FixtureCard({
  fixture,
  prediction,
}: {
  fixture: Fixture;
  prediction?: Prediction | null;
}) {
  const showScore = fixture.score !== null;
  const winner = resolveWinner(fixture);
  const isLive = fixture.status === "live";

  // Points: computed live from the final score for settled matches (so they
  // show before the settling job persists them), else the stored value.
  const earnedPoints =
    prediction == null
      ? null
      : fixture.status === "finished" && fixture.score
        ? scoreBoosted({
            primary: { home: prediction.home, away: prediction.away },
            secondary: prediction.secondary,
            actual: fixture.score,
            boost: prediction.boost,
          }).points
        : prediction.points;

  return (
    <Link
      href={`/matchs/${fixture.id}`}
      className={`press block overflow-hidden rounded-xl border bg-surface transition-all hover:border-border-strong hover:shadow-[0_2px_14px_rgba(0,0,0,0.06)] ${
        isLive ? "border-l-2 border-l-danger" : "border-border"
      }`}
    >
      {/* Header: league + status */}
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <TeamCrest name={fixture.league.name} logoUrl={fixture.league.logoUrl} size={14} />
          <span className="truncate text-xs uppercase tracking-wide text-faint">
            {fixture.league.name}
          </span>
        </div>
        <StatusBadge status={fixture.status} elapsed={fixture.elapsed} />
      </div>

      {/* Teams + score (or kickoff for upcoming) */}
      <div className="flex items-stretch gap-3 px-4 py-3">
        <div className="flex-1 space-y-2.5">
          <TeamRow
            name={fixture.home.name}
            logoUrl={fixture.home.logoUrl}
            goals={fixture.score?.home}
            show={showScore}
            dim={winner === "away"}
          />
          <TeamRow
            name={fixture.away.name}
            logoUrl={fixture.away.logoUrl}
            goals={fixture.score?.away}
            show={showScore}
            dim={winner === "home"}
          />
        </div>

        {!showScore && (
          <div className="flex shrink-0 flex-col items-end justify-center border-l border-border pl-3 text-right">
            <span className="text-base font-semibold tabular-nums">
              {formatTime(fixture.kickoff)}
            </span>
            <span className="text-xs text-faint">
              {formatMatchDay(fixture.kickoff)}
            </span>
          </div>
        )}
      </div>

      {/* Your prediction */}
      {prediction && (
        <div className="flex items-center justify-between gap-2 border-t border-border bg-accent/[0.05] px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs">
            <PredictionsIcon className="size-3.5 text-accent" />
            <span className="text-faint">Votre prono</span>
            <span className="rounded-md bg-accent/10 px-1.5 py-0.5 font-mono font-semibold tabular-nums text-accent">
              {prediction.home}-{prediction.away}
            </span>
            {prediction.boost && (
              <span title={BOOSTS[prediction.boost].name} aria-label={BOOSTS[prediction.boost].name}>
                {BOOSTS[prediction.boost].emoji}
              </span>
            )}
          </div>
          {earnedPoints != null ? (
            <span className="rounded-full bg-success/10 px-2 py-0.5 font-mono text-xs font-medium text-success">
              +{earnedPoints}
            </span>
          ) : (
            <span className="text-xs text-faint">En attente</span>
          )}
        </div>
      )}
    </Link>
  );
}

function TeamRow({
  name,
  logoUrl,
  goals,
  show,
  dim,
}: {
  name: string;
  logoUrl?: string;
  goals?: number;
  show: boolean;
  dim: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamCrest name={name} logoUrl={logoUrl} />
      <span
        className={`flex-1 truncate text-sm ${dim ? "font-normal text-muted" : "font-medium text-foreground"}`}
      >
        {name}
      </span>
      {show && (
        <span
          className={`font-mono text-base tabular-nums ${dim ? "text-muted" : "font-bold text-foreground"}`}
        >
          {goals}
        </span>
      )}
    </div>
  );
}

function resolveWinner(fixture: Fixture): "home" | "away" | null {
  if (!fixture.score) return null;
  const { home, away } = fixture.score;
  if (home === away) return null;
  return home > away ? "home" : "away";
}
