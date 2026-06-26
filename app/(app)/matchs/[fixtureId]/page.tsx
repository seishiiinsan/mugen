import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getFixture, getFixtures, getMyBoostStock, getPredictionForFixture } from "@/lib/data";
import { isPredictionOpen, lockTime } from "@/lib/domain/predictions";
import { SCORING_RULES } from "@/lib/domain/scoring";
import { BOOSTS, leaderboardMonth } from "@/lib/domain/boosts";
import { filterFixtures, fixtureFiltersQuery } from "@/lib/domain/fixtures-filter";
import { isScorerHit, scoreFull, type FullScore } from "@/lib/domain/markets";
import type { BoostType, ScorerPick } from "@/lib/domain/types";
import { fetchMatchExtras } from "@/lib/bzzoiro/match-extras";
import { formatKickoff, formatMatchDay, formatTime } from "@/lib/ui/format";
import { ChevronLeftIcon, ChevronRightIcon, LockIcon } from "../../_components/icons";
import { StatusBadge } from "../../_components/status-badge";
import { TeamCrest } from "../../_components/team-crest";
import { PredictionForm, type ScorerOption } from "./prediction-form";
import { MatchExtras } from "./match-extras";
import { MatchTabs } from "./match-tabs";

export async function generateMetadata(
  props: PageProps<"/matchs/[fixtureId]">,
): Promise<Metadata> {
  const { fixtureId } = await props.params;
  const id = Number(fixtureId);
  if (Number.isNaN(id)) return { title: "Match · Mugen" };
  const fixture = await getFixture(id);
  if (!fixture) return { title: "Match · Mugen" };

  const title = `${fixture.home.name} – ${fixture.away.name} · Mugen`;
  const description = `${fixture.home.name} – ${fixture.away.name} · ${fixture.league.name}. Pronostique le score exact sur Mugen.`;
  return {
    title,
    description,
    openGraph: {
      type: "website",
      url: `/matchs/${fixture.id}`,
      title,
      description,
    },
    twitter: { card: "summary", title, description },
  };
}

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function FixturePage(
  props: PageProps<"/matchs/[fixtureId]">,
) {
  const { fixtureId } = await props.params;
  const id = Number(fixtureId);
  if (Number.isNaN(id)) notFound();

  const fixture = await getFixture(id);
  if (!fixture) notFound();

  const sp = await props.searchParams;
  const filters = {
    status: one(sp.status),
    league: one(sp.league),
    q: one(sp.q),
  };
  const filtersQuery = fixtureFiltersQuery(filters);
  const backHref = filtersQuery ? `/matchs?${filtersQuery}` : "/matchs";

  // Prev/next within the same filtered+sorted list the matches page shows —
  // so navigating "suivant" from a World Cup match stays in the World Cup.
  const allFixtures = await getFixtures();
  const filtered = filterFixtures(allFixtures, filters);
  const currentIndex = filtered.findIndex((f) => f.id === id);
  const prevFixture = currentIndex > 0 ? filtered[currentIndex - 1] : null;
  const nextFixture =
    currentIndex >= 0 && currentIndex < filtered.length - 1
      ? filtered[currentIndex + 1]
      : null;
  const navHref = (targetId: number) =>
    filtersQuery ? `/matchs/${targetId}?${filtersQuery}` : `/matchs/${targetId}`;

  const [prediction, extras] = await Promise.all([
    getPredictionForFixture(id),
    fetchMatchExtras(id, {
      leagueId: fixture.league.id || undefined,
      homeTeamId: fixture.home.id || undefined,
      awayTeamId: fixture.away.id || undefined,
    }),
  ]);

  const open = isPredictionOpen(fixture);
  const settled = fixture.status === "finished" && fixture.score !== null;

  // Selectable scorers from the published lineup (starters + subs).
  const scorerOptions: ScorerOption[] = [];
  if (extras.lineups) {
    const add = (
      players:
        | { id: number | null; name: string; shortName: string; position: string }[]
        | undefined,
      isHome: boolean,
    ) => {
      for (const p of players ?? []) {
        if (p.id != null) {
          scorerOptions.push({
            id: p.id,
            name: p.shortName || p.name,
            position: p.position,
            isHome,
          });
        }
      }
    };
    add(extras.lineups.home?.players, true);
    add(extras.lineups.home?.substitutes, true);
    add(extras.lineups.away?.players, false);
    add(extras.lineups.away?.substitutes, false);
  }

  // Actual scorers (own goals excluded) for settling the displayed result.
  // Picks made from the predicted lineup carry ids from a different id-space
  // than this feed, so we also match by name (see markets.isScorerHit).
  const realGoals = extras.incidents.filter(
    (i) => i.kind === "goal" && i.detail !== "ownGoal",
  );
  const actualScorerIds = realGoals
    .filter((i) => i.playerId != null)
    .map((i) => i.playerId as number);
  const actualScorerNames = realGoals
    .map((i) => i.player)
    .filter((n): n is string => typeof n === "string" && n.length > 0);

  const result: FullScore | null =
    settled && prediction
      ? scoreFull({
          primary: { home: prediction.home, away: prediction.away },
          secondary: prediction.secondary,
          actual: fixture.score!,
          boost: prediction.boost,
          scorers: prediction.scorers,
          outcome: {
            score: fixture.score!,
            scorerIds: actualScorerIds,
            scorerNames: actualScorerNames,
          },
        })
      : null;

  const boostStock = open
    ? await getMyBoostStock(leaderboardMonth(fixture.kickoff))
    : { used: [], remaining: [] as BoostType[] };

  const predictionsPane = open ? (
    <div className="rounded-xl border border-border bg-surface p-5">
      <PredictionForm
        bare
        fixtureId={fixture.id}
        homeName={fixture.home.name}
        awayName={fixture.away.name}
        homeLogo={fixture.home.logoUrl}
        awayLogo={fixture.away.logoUrl}
        initial={
          prediction ? { home: prediction.home, away: prediction.away } : null
        }
        initialBoost={prediction?.boost ?? null}
        initialSecondary={prediction?.secondary ?? null}
        initialScorers={prediction?.scorers ?? []}
        boostStock={boostStock.remaining}
        scorerOptions={scorerOptions}
      />
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-faint">
        <LockIcon className="size-3.5" />
        Clôture {formatKickoff(lockTime(fixture).toISOString())} · 15 min avant
        le coup d&apos;envoi
      </p>
    </div>
  ) : (
    <ResultCard
      prediction={prediction}
      actual={fixture.score}
      actualScorerIds={actualScorerIds}
      actualScorerNames={actualScorerNames}
      settled={settled}
      result={result}
    />
  );

  return (
    <article className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          Tous les matchs
        </Link>

        <div className="flex items-center gap-2">
          <FixtureNavLink fixture={prevFixture} href={prevFixture ? navHref(prevFixture.id) : null} direction="prev" />
          <FixtureNavLink fixture={nextFixture} href={nextFixture ? navHref(nextFixture.id) : null} direction="next" />
        </div>
      </div>

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

      <MatchTabs
        predictions={predictionsPane}
        details={
          <MatchExtras
            extras={extras}
            homeName={fixture.home.name}
            awayName={fixture.away.name}
          />
        }
      />
    </article>
  );
}

function FixtureNavLink({
  fixture,
  href,
  direction,
}: {
  fixture: { home: { name: string }; away: { name: string } } | null;
  href: string | null;
  direction: "prev" | "next";
}) {
  if (!fixture || !href) return null;
  const label = `${fixture.home.name} – ${fixture.away.name}`;
  return (
    <Link
      href={href}
      title={label}
      aria-label={`${direction === "prev" ? "Match précédent" : "Match suivant"} : ${label}`}
      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-sm text-muted transition-colors hover:border-border-strong hover:text-foreground"
    >
      {direction === "prev" && <ChevronLeftIcon className="size-4" />}
      <span className="max-w-[9rem] truncate sm:max-w-[14rem]">
        {direction === "prev" ? "Précédent" : "Suivant"}
      </span>
      {direction === "next" && <ChevronRightIcon className="size-4" />}
    </Link>
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
  actualScorerIds,
  actualScorerNames,
  settled,
  result,
}: {
  prediction: {
    home: number;
    away: number;
    secondary: { home: number; away: number } | null;
    boost: BoostType | null;
    scorers: ScorerPick[];
  } | null;
  actual: { home: number; away: number } | null;
  actualScorerIds: number[];
  actualScorerNames: string[];
  settled: boolean;
  result: FullScore | null;
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

  const { boost, secondary, scorers } = prediction;
  const label =
    result != null
      ? SCORING_RULES.find((r) => r.points === result.basePoints)?.label
      : null;
  const outcome = {
    score: actual ?? { home: 0, away: 0 },
    scorerIds: actualScorerIds,
    scorerNames: actualScorerNames,
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 text-faint">
          <LockIcon className="size-3.5" /> Pronostic verrouillé
        </span>
        <span className="flex items-center gap-2">
          {boost && (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
              <span aria-hidden>{BOOSTS[boost].emoji}</span>
              {BOOSTS[boost].name}
            </span>
          )}
          <span className="rounded-md bg-accent/10 px-2 py-0.5 font-mono font-semibold tabular-nums text-accent">
            {prediction.home}-{prediction.away}
          </span>
        </span>
      </div>

      {boost === "double_chance" && secondary && (
        <div className="flex items-center justify-between text-xs text-faint">
          <span>2ᵉ pronostic</span>
          <span className="font-mono tabular-nums">
            {secondary.home}-{secondary.away}
          </span>
        </div>
      )}

      {/* Goalscorers recap */}
      {scorers.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3 text-xs">
          <span className="text-faint">Buteurs</span>
          {scorers.map((s) => {
            const didScore = isScorerHit(s, outcome);
            const hit = settled && didScore;
            const miss = settled && !didScore;
            return (
              <span
                key={s.id}
                className={`rounded-full border px-2 py-0.5 ${
                  hit
                    ? "border-success/40 bg-success/10 text-success"
                    : miss
                      ? "border-danger/30 bg-danger/10 text-danger line-through"
                      : "border-border text-muted"
                }`}
              >
                {s.name}
                {hit ? " ✓" : miss ? " ✗" : ""}
              </span>
            );
          })}
        </div>
      )}

      {settled && actual ? (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-faint">Résultat final</span>
            <span className="font-mono font-semibold tabular-nums">
              {actual.home}-{actual.away}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">
              {label}
              {boost ? ` · ${BOOSTS[boost].emoji} ${BOOSTS[boost].name}` : ""}
              {result && result.marketPoints !== 0
                ? ` · marchés ${result.marketPoints > 0 ? "+" : ""}${result.marketPoints}`
                : ""}
            </span>
            <span
              className={`font-mono text-lg font-bold tabular-nums ${
                (result?.points ?? 0) > 0 ? "text-success" : "text-muted"
              }`}
            >
              +{result?.points} pts
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

