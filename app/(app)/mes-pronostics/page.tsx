import Link from "next/link";
import type { Fixture, Prediction } from "@/lib/domain/types";
import {
  getActualScorers,
  getFixturesByIds,
  getMyPredictions,
} from "@/lib/data";
import { activeLeaderboardMonth, leaderboardMonth, scoreBoosted } from "@/lib/domain/boosts";
import { FixtureCard } from "../_components/fixture-card";
import { PredictionsIcon } from "../_components/icons";
import { PronosFilterBar } from "./_components/pronos-filter-bar";

interface Row {
  prediction: Prediction;
  fixture: Fixture;
  earned: number | null;
  exact: boolean;
}

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function MesPronosticsPage(
  props: PageProps<"/mes-pronostics">,
) {
  const sp = await props.searchParams;
  const statusFilter = one(sp.status);
  const leagueFilter = one(sp.league);
  const q = one(sp.q).trim().toLowerCase();

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
        exact = r.exact;
        // Prefer the settled DB points (include scorers/markets + floor);
        // fall back to the base estimate while settling is still pending.
        earned = p.points ?? r.points;
      }
      return { prediction: p, fixture, earned, exact };
    })
    .filter((r): r is Row => r !== null);

  // Real scorers for finished matches the user picked goalscorers on — drives
  // the goalscorer points breakdown on each card.
  const scorers = await getActualScorers(
    rows
      .filter((r) => r.earned != null && r.prediction.scorers.length > 0)
      .map((r) => r.fixture.id),
  );

  // Overall stats are always computed on every prediction (independent of the
  // active filters), so the cards reflect the player's true totals.
  const allFinished = rows.filter((r) => r.earned != null);
  const exactScores = allFinished.filter((r) => r.exact).length;
  const pendingTotal = rows.length - allFinished.length;

  // "Points gagnés" mirrors /profil and /saison: same active-month window
  // (active_month_start / activeLeaderboardMonth), not a lifetime total —
  // otherwise this card disagrees with the rest of the app.
  const activeMonth = activeLeaderboardMonth();
  const monthlyFinished = allFinished.filter(
    (r) => leaderboardMonth(r.fixture.kickoff) === activeMonth,
  );
  const totalPoints = monthlyFinished.reduce((sum, r) => sum + (r.earned ?? 0), 0);

  // League options for the filter, derived from the predicted fixtures.
  const leagueNames = new Map<number, string>();
  for (const r of rows) leagueNames.set(r.fixture.league.id, r.fixture.league.name);
  const leagues = [...leagueNames]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  // Apply filters to the displayed rows only.
  const visible = rows.filter((r) => {
    const isFinished = r.earned != null;
    if (statusFilter === "finished" && !isFinished) return false;
    if (statusFilter === "pending" && isFinished) return false;
    if (leagueFilter && String(r.fixture.league.id) !== leagueFilter)
      return false;
    if (
      q &&
      !r.fixture.home.name.toLowerCase().includes(q) &&
      !r.fixture.away.name.toLowerCase().includes(q) &&
      !r.fixture.league.name.toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  const finished = visible
    .filter((r) => r.earned != null)
    .sort(
      (a, b) =>
        new Date(b.fixture.kickoff).getTime() -
        new Date(a.fixture.kickoff).getTime(),
    );
  const pending = visible
    .filter((r) => r.earned == null)
    .sort(
      (a, b) =>
        new Date(a.fixture.kickoff).getTime() -
        new Date(b.fixture.kickoff).getTime(),
    );

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
              {pendingTotal > 0 && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  {pendingTotal} à suivre
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
            <Stat label="Points du mois" value={totalPoints} />
            <Stat label="Scores exacts" value={exactScores} />
          </div>

          <PronosFilterBar leagues={leagues} />

          {visible.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
              Aucun pronostic ne correspond à ces filtres.
            </p>
          ) : (
            <>
              {pending.length > 0 && (
                <Group title="À suivre" rows={pending} scorers={scorers} />
              )}
              {finished.length > 0 && (
                <Group title="Terminés" rows={finished} scorers={scorers} />
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

function Group({
  title,
  rows,
  scorers,
}: {
  title: string;
  rows: Row[];
  scorers: Map<number, { ids: number[]; names: string[] }>;
}) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
        {title}
      </h2>
      <ul className="space-y-2.5">
        {rows.map(({ prediction, fixture }) => (
          <li key={prediction.fixtureId}>
            <FixtureCard
              fixture={fixture}
              prediction={prediction}
              actualScorers={scorers.get(fixture.id) ?? null}
            />
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
