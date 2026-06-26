import Link from "next/link";
import type { Fixture, Prediction } from "@/lib/domain/types";
import { BOOSTS, scoreBoosted } from "@/lib/domain/boosts";
import { SCORING_RULES, scorePrediction } from "@/lib/domain/scoring";
import {
  isScorerHit,
  scoreFull,
  scoreScorers,
  scorerHitPoints,
  type MarketOutcome,
} from "@/lib/domain/markets";
import { formatMatchDay, formatTime } from "@/lib/ui/format";
import { PredictionsIcon } from "./icons";
import { StatusBadge } from "./status-badge";
import { TeamCrest } from "./team-crest";

export function FixtureCard({
  fixture,
  prediction,
  actualScorers,
  filtersQuery,
}: {
  fixture: Fixture;
  prediction?: Prediction | null;
  /** Real scorers of the match (ids + names) — drives the settled breakdown. */
  actualScorers?: { ids: number[]; names: string[] } | null;
  /** Active list filters (`?status=&league=&q=`), carried into the detail page so its prev/next nav matches. */
  filtersQuery?: string;
}) {
  const showScore = fixture.score !== null;
  const winner = resolveWinner(fixture);
  const isLive = fixture.status === "live";

  const settled =
    prediction != null && fixture.status === "finished" && fixture.score != null;

  // Only grade goalscorers when we can trust the feed: it returned scorers, or
  // the match genuinely ended 0-0 (so an empty list is correct, not a failure).
  const totalGoals = settled ? fixture.score!.home + fixture.score!.away : 0;
  const canGrade =
    settled &&
    actualScorers != null &&
    (totalGoals === 0 ||
      actualScorers.ids.length > 0 ||
      actualScorers.names.length > 0);

  // The actual goalscorers, when trustworthy, let us grade each pick + market.
  const outcome: MarketOutcome | null = canGrade
    ? {
        score: fixture.score!,
        scorerIds: actualScorers!.ids,
        scorerNames: actualScorers!.names,
      }
    : null;

  const full =
    settled && prediction
      ? scoreFull({
          primary: { home: prediction.home, away: prediction.away },
          secondary: prediction.secondary,
          actual: fixture.score!,
          boost: prediction.boost,
          scorers: prediction.scorers,
          outcome,
        })
      : null;

  // Points: prefer the persisted total (includes scorers + floor); fall back to
  // the live computation so they show before the settling job runs.
  const earnedPoints =
    prediction == null ? null : (prediction.points ?? full?.points ?? null);

  return (
    <Link
      href={filtersQuery ? `/matchs/${fixture.id}?${filtersQuery}` : `/matchs/${fixture.id}`}
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
        <div className="border-t border-border bg-accent/[0.05] px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
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

          {/* Chosen goalscorers — graded once the real scorers are known */}
          {prediction.scorers.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-faint">Buteurs</span>
              {prediction.scorers.map((s) => {
                const hit = outcome ? isScorerHit(s, outcome) : null;
                return (
                  <span
                    key={s.id}
                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs ${
                      hit === true
                        ? "border-success/40 bg-success/10 text-success"
                        : hit === false
                          ? "border-danger/30 bg-danger/10 text-danger line-through"
                          : "border-border bg-surface text-muted"
                    }`}
                  >
                    {s.name}
                    {hit === true && (
                      <span className="font-mono">+{scorerHitPoints(s.position)}</span>
                    )}
                    {hit === false && <span className="font-mono">−2</span>}
                  </span>
                );
              })}
            </div>
          )}

          {/* Points breakdown — base score + boost + goalscorers */}
          {settled && prediction && full && (
            <PointsBreakdown
              prediction={prediction}
              actual={fixture.score!}
              outcome={outcome}
              full={full}
            />
          )}
        </div>
      )}
    </Link>
  );
}

function PointsBreakdown({
  prediction,
  actual,
  outcome,
  full,
}: {
  prediction: Prediction;
  actual: { home: number; away: number };
  outcome: MarketOutcome | null;
  full: ReturnType<typeof scoreFull>;
}) {
  const primary = { home: prediction.home, away: prediction.away };
  // Plain (un-boosted) score of the main prediction — the breakdown's baseline.
  const base = scorePrediction(primary, actual);
  const baseLabel =
    SCORING_RULES.find((r) => r.points === base)?.label ?? "Mauvais résultat";

  // Boost contribution = boosted score minus the plain base. For double_chance
  // this surfaces the upgrade from keeping the better of the two predictions.
  const boostedBase = prediction.boost
    ? scoreBoosted({
        primary,
        secondary: prediction.secondary,
        actual,
        boost: prediction.boost,
      }).points
    : base;
  const boostDelta = boostedBase - base;

  const hasScorers = prediction.scorers.length > 0 && outcome != null;
  const market = hasScorers
    ? scoreScorers(prediction.scorers, outcome!)
    : null;

  const total = prediction.points ?? full.points;
  // The sum can dip below zero (e.g. several missed scorers); the engine
  // floors the credited total at 0.
  const floored = boostedBase + (market?.points ?? 0) < 0;

  return (
    <div className="mt-2.5 space-y-1 border-t border-border/70 pt-2 text-xs">
      <BreakdownRow label={baseLabel} value={base} />
      {prediction.boost && (
        <BreakdownRow
          label={`${BOOSTS[prediction.boost].emoji} ${BOOSTS[prediction.boost].name}`}
          value={boostDelta}
          signed
        />
      )}
      {market && (
        <BreakdownRow
          label={`Buteurs · ${market.hits} ✓ / ${market.misses} ✗`}
          value={market.points}
          signed
        />
      )}
      {floored && (
        <p className="text-[10px] text-faint">Total plancher à 0 point.</p>
      )}
      <div className="flex items-center justify-between border-t border-border/70 pt-1.5">
        <span className="font-medium text-foreground">Total</span>
        <span
          className={`font-mono font-bold tabular-nums ${
            total > 0 ? "text-success" : "text-muted"
          }`}
        >
          +{total} pts
        </span>
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  signed = false,
}: {
  label: string;
  value: number;
  signed?: boolean;
}) {
  const display = signed && value >= 0 ? `+${value}` : `${value}`;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 truncate text-muted">{label}</span>
      <span
        className={`shrink-0 font-mono tabular-nums ${
          value > 0
            ? "text-foreground"
            : value < 0
              ? "text-danger"
              : "text-faint"
        }`}
      >
        {display}
      </span>
    </div>
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
