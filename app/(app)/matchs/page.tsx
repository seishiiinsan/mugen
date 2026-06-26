import { Fragment } from "react";
import Link from "next/link";
import type { Fixture } from "@/lib/domain/types";
import { getActualScorers, getFixtures, getMyPredictions } from "@/lib/data";
import { filterFixtures, fixtureFiltersQuery } from "@/lib/domain/fixtures-filter";
import { FixtureCard } from "../_components/fixture-card";
import { MatchesIcon } from "../_components/icons";
import { FilterBar } from "./_components/filter-bar";

const PAGE_SIZE = 15;

const GROUP_LABELS: Record<Fixture["status"], string> = {
  live: "En cours",
  upcoming: "À venir",
  finished: "Terminés",
  postponed: "Reportés",
  cancelled: "Annulés",
};

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function MatchsPage(props: PageProps<"/matchs">) {
  const sp = await props.searchParams;
  const status = one(sp.status);
  const league = one(sp.league);
  const q = one(sp.q).trim();
  const requestedPage = Math.max(1, Number.parseInt(one(sp.page) || "1", 10) || 1);

  const [all, predictions] = await Promise.all([
    getFixtures(),
    getMyPredictions(),
  ]);
  const byFixture = new Map(predictions.map((p) => [p.fixtureId, p]));

  // League options (stable, independent of current filters).
  const leagueNames = new Map<number, string>();
  for (const f of all) leagueNames.set(f.league.id, f.league.name);
  const leagues = [...leagueNames]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  // Apply filters (shared with the detail page's prev/next navigation).
  const filtered = filterFixtures(all, { status, league, q });
  const filtersQuery = fixtureFiltersQuery({ status, league, q });

  const liveCount = all.filter((f) => f.status === "live").length;
  const monthLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date());

  // Paginate.
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Real scorers for the visible finished matches the user picked scorers on,
  // so settled cards can show the goalscorer points breakdown.
  const scorers = await getActualScorers(
    slice
      .filter((f) => {
        const p = byFixture.get(f.id);
        return f.status === "finished" && p != null && p.scorers.length > 0;
      })
      .map((f) => f.id),
  );

  function pageHref(p: number): string {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (league) params.set("league", league);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/matchs?${qs}` : "/matchs";
  }

  return (
    <section>
      <header className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
            <MatchesIcon className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">Matchs</h1>
              {liveCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                  <span className="size-1.5 rounded-full bg-danger motion-safe:animate-pulse" />
                  {liveCount} en direct
                </span>
              )}
            </div>
            <p className="text-sm text-muted">
              <span className="capitalize">{monthLabel}</span>
              <span className="text-faint">
                {" "}
                · {all.length} match{all.length > 1 ? "s" : ""} à venir
              </span>
            </p>
          </div>
        </div>
      </header>

      <FilterBar leagues={leagues} />

      {slice.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          {all.length === 0
            ? "Aucun match à venir ce mois-ci."
            : "Aucun match ne correspond à ces filtres."}
        </p>
      ) : (
        <div className="space-y-2.5">
          {slice.map((fixture, i) => {
            const newGroup = i === 0 || slice[i - 1].status !== fixture.status;
            return (
              <Fragment key={fixture.id}>
                {newGroup && (
                  <h2
                    className={`text-xs font-medium uppercase tracking-wide text-faint ${i === 0 ? "" : "pt-3"}`}
                  >
                    {GROUP_LABELS[fixture.status]}
                  </h2>
                )}
                <FixtureCard
                  fixture={fixture}
                  prediction={byFixture.get(fixture.id)}
                  actualScorers={scorers.get(fixture.id) ?? null}
                  filtersQuery={filtersQuery}
                />
              </Fragment>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-6 flex items-center justify-between text-sm"
        >
          <PageLink href={pageHref(page - 1)} disabled={page === 1}>
            ← Précédent
          </PageLink>
          <span className="font-mono text-xs tabular-nums text-faint">
            {page} / {totalPages}
          </span>
          <PageLink href={pageHref(page + 1)} disabled={page === totalPages}>
            Suivant →
          </PageLink>
        </nav>
      )}
    </section>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-lg border border-border px-3 py-1.5 font-medium text-faint opacity-50">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      {children}
    </Link>
  );
}
