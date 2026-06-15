import Link from "next/link";
import type { Fixture, Prediction } from "@/lib/domain/types";
import { getFixturesByIds, getMyPredictions } from "@/lib/data";
import { scoreBoosted } from "@/lib/domain/boosts";
import { FixtureCard } from "../_components/fixture-card";
import { PredictionsIcon } from "../_components/icons";

interface Row {
  prediction: Prediction;
  fixture: Fixture;
  earned: number | null;
  exact: boolean;
}

export default async function MesPronosticsPage() {
  const predictions = await getMyPredictions();
  const fixtures = await getFixturesByIds(predictions.map((p) => p.fixtureId));
  const byId = new Map(fixtures.map((f) => [f.id, f]));

  const rows: Row[] = predictions
    .map((p) => {
      const fixture = byId.get(p.fixtureId);
      if (!fixture) return null;
      let earned: number | null = null;
      let exact = false;
      if (fixture.status === "finished" && fixture.score) {
        const r = scoreBoosted({
          primary: { home: p.home, away: p.away },
          secondary: p.secondary,
          actual: fixture.score,
          boost: p.boost,
        });
        earned = r.points;
        exact = r.exact;
      }
      return { prediction: p, fixture, earned, exact };
    })
    .filter((r): r is Row => r !== null);

  const finished = rows
    .filter((r) => r.earned != null)
    .sort(
      (a, b) =>
        new Date(b.fixture.kickoff).getTime() -
        new Date(a.fixture.kickoff).getTime(),
    );
  const pending = rows
    .filter((r) => r.earned == null)
    .sort(
      (a, b) =>
        new Date(a.fixture.kickoff).getTime() -
        new Date(b.fixture.kickoff).getTime(),
    );

  const totalPoints = finished.reduce((sum, r) => sum + (r.earned ?? 0), 0);
  const exactScores = finished.filter((r) => r.exact).length;

  return (
    <section>
      <header className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
            <PredictionsIcon className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                Mes pronostics
              </h1>
              {pending.length > 0 && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  {pending.length} à suivre
                </span>
              )}
            </div>
            <p className="text-sm text-muted">
              Vos pronostics soumis, résultats et points gagnés.
            </p>
          </div>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">
            Aucun pronostic pour le moment.
          </p>
          <Link
            href="/matchs"
            className="press rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong"
          >
            Pronostiquer un match
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Stat label="Pronostics" value={rows.length} />
            <Stat label="Points gagnés" value={totalPoints} />
            <Stat label="Scores exacts" value={exactScores} />
          </div>

          {pending.length > 0 && (
            <Group title="À suivre" rows={pending} />
          )}
          {finished.length > 0 && (
            <Group title="Terminés" rows={finished} />
          )}
        </>
      )}
    </section>
  );
}

function Group({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
        {title}
      </h2>
      <ul className="space-y-2.5">
        {rows.map(({ prediction, fixture }) => (
          <li key={prediction.fixtureId}>
            <FixtureCard fixture={fixture} prediction={prediction} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 text-center">
      <div className="font-mono text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-faint">{label}</div>
    </div>
  );
}
