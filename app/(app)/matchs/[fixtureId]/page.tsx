import { notFound } from "next/navigation";
import Link from "next/link";
import { getFixture, getPredictionForFixture } from "@/lib/data";
import { isPredictionOpen, lockTime } from "@/lib/domain/predictions";
import { SCORING_RULES, scorePrediction } from "@/lib/domain/scoring";
import { formatKickoff, formatMatchDay, formatTime } from "@/lib/ui/format";
import { ChevronLeftIcon, LockIcon } from "../../_components/icons";
import { StatusBadge } from "../../_components/status-badge";
import { TeamCrest } from "../../_components/team-crest";
import { PredictionForm } from "./prediction-form";

export default async function FixturePage(
  props: PageProps<"/matchs/[fixtureId]">,
) {
  const { fixtureId } = await props.params;
  const id = Number(fixtureId);
  if (Number.isNaN(id)) notFound();

  const [fixture, prediction] = await Promise.all([
    getFixture(id),
    getPredictionForFixture(id),
  ]);
  if (!fixture) notFound();

  const open = isPredictionOpen(fixture);
  const settled = fixture.status === "finished" && fixture.score !== null;
  const earnedPoints =
    settled && prediction
      ? scorePrediction(
          { home: prediction.home, away: prediction.away },
          fixture.score!,
        )
      : null;

  return (
    <article className="space-y-4">
      <Link
        href="/matchs"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" />
        Tous les matchs
      </Link>

      {/* Hero */}
      <header className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-center gap-1.5 text-xs uppercase tracking-wide text-faint">
          <TeamCrest name={fixture.league.name} logoUrl={fixture.league.logoUrl} size={14} />
          <span className="truncate">{fixture.league.name}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamBlock name={fixture.home.name} logoUrl={fixture.home.logoUrl} />

          <div className="flex flex-col items-center gap-2">
            {fixture.score ? (
              <span className="font-mono text-3xl font-bold tabular-nums">
                {fixture.score.home}
                <span className="mx-1 text-muted">-</span>
                {fixture.score.away}
              </span>
            ) : (
              <span className="font-mono text-xl font-semibold tabular-nums">
                {formatTime(fixture.kickoff)}
              </span>
            )}
            <StatusBadge status={fixture.status} elapsed={fixture.elapsed} />
          </div>

          <TeamBlock name={fixture.away.name} logoUrl={fixture.away.logoUrl} />
        </div>

        <p className="mt-4 text-center text-xs text-faint">
          {formatMatchDay(fixture.kickoff)} · {formatTime(fixture.kickoff)}
          {fixture.venue ? ` · ${fixture.venue}` : ""}
        </p>
      </header>

      {/* Prediction */}
      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
          Votre pronostic
        </h2>

        {open ? (
          <>
            <PredictionForm
              fixtureId={fixture.id}
              homeName={fixture.home.name}
              awayName={fixture.away.name}
              homeLogo={fixture.home.logoUrl}
              awayLogo={fixture.away.logoUrl}
              initial={
                prediction
                  ? { home: prediction.home, away: prediction.away }
                  : null
              }
            />
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-faint">
              <LockIcon className="size-3.5" />
              Clôture {formatKickoff(lockTime(fixture).toISOString())} · 15 min
              avant le coup d&apos;envoi
            </p>
          </>
        ) : (
          <ResultCard
            prediction={prediction}
            actual={fixture.score}
            settled={settled}
            earnedPoints={earnedPoints}
          />
        )}
      </section>
    </article>
  );
}

function TeamBlock({ name, logoUrl }: { name: string; logoUrl?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <TeamCrest name={name} logoUrl={logoUrl} size={44} />
      <span className="text-sm font-medium leading-tight">{name}</span>
    </div>
  );
}

function ResultCard({
  prediction,
  actual,
  settled,
  earnedPoints,
}: {
  prediction: { home: number; away: number } | null;
  actual: { home: number; away: number } | null;
  settled: boolean;
  earnedPoints: number | null;
}) {
  if (!prediction) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-6 text-center">
        <LockIcon className="size-5 text-faint" />
        <p className="text-sm text-muted">
          Pronostics clôturés — aucun pronostic soumis.
        </p>
      </div>
    );
  }

  const label =
    earnedPoints != null
      ? SCORING_RULES.find((r) => r.points === earnedPoints)?.label
      : null;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-faint">
          <LockIcon className="size-3.5" /> Pronostic verrouillé
        </span>
        <span className="rounded-md bg-accent/10 px-2 py-0.5 font-mono font-semibold tabular-nums text-accent">
          {prediction.home}-{prediction.away}
        </span>
      </div>

      {settled && actual ? (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-faint">Résultat final</span>
            <span className="font-mono font-semibold tabular-nums">
              {actual.home}-{actual.away}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">{label}</span>
            <span
              className={`font-mono text-lg font-bold tabular-nums ${
                (earnedPoints ?? 0) > 0 ? "text-success" : "text-muted"
              }`}
            >
              +{earnedPoints} pts
            </span>
          </div>
        </div>
      ) : (
        <p className="border-t border-border pt-3 text-xs text-faint">
          En attente du résultat du match.
        </p>
      )}
    </div>
  );
}
