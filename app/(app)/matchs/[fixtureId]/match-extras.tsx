import type {
  HeadToHead as H2H,
  Incident,
  LineupPlayer,
  Lineups as LineupsData,
  MatchExtras as Extras,
  StandingsGroup,
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
  const { lineups, stats, h2h, incidents, standings } = extras;
  if (
    !lineups &&
    stats.length === 0 &&
    !h2h &&
    incidents.length === 0 &&
    !standings
  ) {
    return null;
  }

  return (
    <>
      {incidents.length > 0 && <Timeline incidents={incidents} />}
      {lineups && <Lineups lineups={lineups} />}
      {stats.length > 0 && (
        <MatchStats stats={stats} homeName={homeName} awayName={awayName} />
      )}
      {h2h && <HeadToHead h2h={h2h} homeName={homeName} awayName={awayName} />}
      {standings && <Standings groups={standings} />}
    </>
  );
}

function minuteLabel(minute: number, addedTime: number | null): string {
  return addedTime ? `${minute}+${addedTime}'` : `${minute}'`;
}

function Timeline({ incidents }: { incidents: Incident[] }) {
  return (
    <section>
      <SectionTitle>Faits de match</SectionTitle>
      <ul className="space-y-1 rounded-xl border border-border bg-surface p-4">
        {incidents.map((inc, i) => (
          <li
            key={`${inc.minute}-${i}`}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm"
          >
            <div className="flex min-w-0 justify-end text-right">
              {inc.isHome && <IncidentLabel inc={inc} align="right" />}
            </div>
            <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-center font-mono text-xs tabular-nums text-muted">
              {minuteLabel(inc.minute, inc.addedTime)}
            </span>
            <div className="flex min-w-0 justify-start text-left">
              {!inc.isHome && <IncidentLabel inc={inc} align="left" />}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function IncidentLabel({
  inc,
  align,
}: {
  inc: Incident;
  align: "left" | "right";
}) {
  const glyph =
    inc.kind === "goal" ? (
      <span
        aria-label="But"
        className="size-2.5 shrink-0 rounded-full bg-foreground"
      />
    ) : (
      <span
        aria-label={inc.detail === "red" ? "Carton rouge" : "Carton jaune"}
        className={`h-3.5 w-2.5 shrink-0 rounded-[2px] ${
          inc.detail === "red" ? "bg-red-500" : "bg-amber-400"
        }`}
      />
    );
  return (
    <span
      className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}
    >
      {glyph}
      <span className="min-w-0">
        <span className="truncate font-medium">{inc.player}</span>
        {inc.kind === "goal" && inc.detail && (
          <span className="ml-1 text-xs text-faint">({inc.detail})</span>
        )}
      </span>
    </span>
  );
}

function Standings({ groups }: { groups: StandingsGroup[] }) {
  return (
    <section>
      <SectionTitle>Classement</SectionTitle>
      <div className="space-y-4">
        {groups.map((g) => (
          <div
            key={g.name ?? "all"}
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            {g.name && (
              <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-faint">
                {g.name}
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-faint">
                  <th className="px-3 py-1.5 text-left font-medium">#</th>
                  <th className="px-2 py-1.5 text-left font-medium">Équipe</th>
                  <th className="px-2 py-1.5 text-right font-medium">J</th>
                  <th className="px-2 py-1.5 text-right font-medium">Diff</th>
                  <th className="px-3 py-1.5 text-right font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr
                    key={r.teamId}
                    className={`border-t border-border ${r.highlight ? "bg-accent/[0.06]" : ""}`}
                  >
                    <td className="px-3 py-2 font-mono tabular-nums text-muted">
                      {r.position}
                    </td>
                    <td className="max-w-0 truncate px-2 py-2 font-medium">
                      {r.team}
                    </td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums text-muted">
                      {r.played}
                    </td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums text-muted">
                      {r.gd > 0 ? `+${r.gd}` : r.gd}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums">
                      {r.pts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <TeamPitch side={lineups.home} />
        <TeamPitch side={lineups.away} />
      </div>
    </section>
  );
}

function TeamPitch({ side }: { side: TeamLineup | null }) {
  if (!side) return null;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{side.teamName}</span>
        <span className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs tabular-nums text-muted">
          {side.formation}
        </span>
      </div>
      <Pitch players={side.players} />
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

/** Bucket a position into a pitch line: 0 GK · 1 DEF · 2 MID · 3 FWD. */
function lineIndex(position: string): number {
  const c = (position || "").trim().toUpperCase().charAt(0);
  if (c === "G") return 0;
  if (c === "D") return 1;
  if (c === "M") return 2;
  return 3;
}

function Pitch({ players }: { players: LineupPlayer[] }) {
  const lines: LineupPlayer[][] = [[], [], [], []];
  for (const p of players) lines[lineIndex(p.position)].push(p);
  const rows = lines.filter((l) => l.length > 0); // GK → FWD

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-gradient-to-b from-emerald-600 to-emerald-700">
      <svg
        aria-hidden
        viewBox="0 0 100 133"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full text-white/25"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
      >
        <rect x="3" y="3" width="94" height="127" rx="1" />
        <line x1="3" y1="66.5" x2="97" y2="66.5" />
        <circle cx="50" cy="66.5" r="11" />
        <circle cx="50" cy="66.5" r="0.7" fill="currentColor" stroke="none" />
        <rect x="28" y="3" width="44" height="20" />
        <rect x="28" y="110" width="44" height="20" />
      </svg>

      {/* GK at the bottom, forwards at the top */}
      <div className="relative flex h-full flex-col-reverse justify-around py-3">
        {rows.map((line, i) => (
          <div key={i} className="flex items-center justify-around gap-1 px-1">
            {line.map((p, j) => (
              <PlayerToken key={`${p.name}-${j}`} player={p} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerToken({ player }: { player: LineupPlayer }) {
  return (
    <div className="flex w-12 flex-col items-center gap-0.5">
      <span className="grid size-7 place-items-center rounded-full bg-white font-mono text-xs font-semibold tabular-nums text-emerald-900">
        {player.jersey ?? ""}
      </span>
      <span className="max-w-full truncate text-[10px] font-medium text-white">
        {player.shortName}
      </span>
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
