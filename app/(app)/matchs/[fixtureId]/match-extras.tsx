import type {
  HeadToHead as H2H,
  Lineups as LineupsData,
  MatchExtras as Extras,
  StatPair,
  TeamLineup,
} from "@/lib/bzzoiro/match-extras";

export function MatchExtras({
  extras,
  homeName,
  awayName,
}: {
  extras: Extras;
  homeName: string;
  awayName: string;
}) {
  const { lineups, stats, h2h } = extras;
  if (!lineups && stats.length === 0 && !h2h) return null;

  return (
    <>
      {lineups && <Lineups lineups={lineups} />}
      {stats.length > 0 && (
        <MatchStats stats={stats} homeName={homeName} awayName={awayName} />
      )}
      {h2h && <HeadToHead h2h={h2h} homeName={homeName} awayName={awayName} />}
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-faint">
      {children}
    </h2>
  );
}

function Lineups({ lineups }: { lineups: LineupsData }) {
  return (
    <section>
      <SectionTitle>
        Compositions
        {lineups.predicted && (
          <span className="rounded-full border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-muted">
            probable
          </span>
        )}
      </SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        <TeamColumn side={lineups.home} />
        <TeamColumn side={lineups.away} />
      </div>
    </section>
  );
}

function TeamColumn({ side }: { side: TeamLineup | null }) {
  if (!side) return null;
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{side.teamName}</span>
        <span className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs tabular-nums text-muted">
          {side.formation}
        </span>
      </div>
      <ul className="space-y-1.5">
        {side.players.map((p, i) => (
          <PlayerRow key={`${p.name}-${i}`} jersey={p.jersey} name={p.shortName} position={p.position} />
        ))}
      </ul>
      {side.substitutes.length > 0 && (
        <details className="group mt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted [&::-webkit-details-marker]:hidden">
            <span className="text-faint transition-transform group-open:rotate-90">›</span>
            Remplaçants ({side.substitutes.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {side.substitutes.map((p, i) => (
              <PlayerRow key={`${p.name}-${i}`} jersey={p.jersey} name={p.shortName} position={p.position} dim />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function PlayerRow({
  jersey,
  name,
  position,
  dim = false,
}: {
  jersey: number | null;
  name: string;
  position: string;
  dim?: boolean;
}) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-xs tabular-nums text-muted">
        {jersey ?? "–"}
      </span>
      <span className={`min-w-0 flex-1 truncate ${dim ? "text-muted" : ""}`}>
        {name}
      </span>
      {position && (
        <span className="shrink-0 font-mono text-[10px] uppercase text-faint">
          {position}
        </span>
      )}
    </li>
  );
}

function MatchStats({
  stats,
  homeName,
  awayName,
}: {
  stats: StatPair[];
  homeName: string;
  awayName: string;
}) {
  return (
    <section>
      <SectionTitle>Statistiques</SectionTitle>
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center justify-between text-xs font-medium text-muted">
          <span className="truncate">{homeName}</span>
          <span className="truncate text-right">{awayName}</span>
        </div>
        <ul className="space-y-3">
          {stats.map((s) => (
            <StatRow key={s.label} stat={s} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function StatRow({ stat }: { stat: StatPair }) {
  const total = stat.home + stat.away;
  const homePct = total > 0 ? (stat.home / total) * 100 : 50;
  return (
    <li>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-mono font-semibold tabular-nums">{stat.home}</span>
        <span className="text-xs text-muted">{stat.label}</span>
        <span className="font-mono font-semibold tabular-nums">{stat.away}</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="bg-accent" style={{ width: `${homePct}%` }} />
        <div className="bg-border-strong" style={{ width: `${100 - homePct}%` }} />
      </div>
    </li>
  );
}

function HeadToHead({
  h2h,
  homeName,
  awayName,
}: {
  h2h: H2H;
  homeName: string;
  awayName: string;
}) {
  return (
    <section>
      <SectionTitle>Confrontations</SectionTitle>
      <div className="rounded-xl border border-border bg-surface p-5">
        {h2h.total === 0 ? (
          <p className="text-center text-sm text-muted">
            Première confrontation entre ces équipes.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="truncate font-medium">{homeName}</span>
              <span className="shrink-0 px-2 text-xs text-faint">
                {h2h.total} match{h2h.total > 1 ? "s" : ""}
              </span>
              <span className="truncate text-right font-medium">{awayName}</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="bg-accent" style={{ width: `${pct(h2h.homeWins, h2h.total)}%` }} />
              <div className="bg-border-strong" style={{ width: `${pct(h2h.draws, h2h.total)}%` }} />
              <div className="bg-foreground/40" style={{ width: `${pct(h2h.awayWins, h2h.total)}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-xs tabular-nums text-muted">
              <span>{h2h.homeWins} V</span>
              <span>{h2h.draws} N</span>
              <span>{h2h.awayWins} V</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function pct(n: number, total: number): number {
  return total > 0 ? (n / total) * 100 : 0;
}
