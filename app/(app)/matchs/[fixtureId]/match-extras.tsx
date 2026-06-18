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
  // A head-to-head with no prior meetings carries no information — treat it as
  // absent so the section is skipped entirely (rather than showing an empty card).
  const hasH2H = h2h !== null && h2h.total > 0;
  if (
    !lineups &&
    stats.length === 0 &&
    !hasH2H &&
    incidents.length === 0 &&
    !standings
  ) {
    return null;
  }

  return (
    <div className="space-y-6">
      {incidents.length > 0 && (
        <Timeline incidents={incidents} homeName={homeName} awayName={awayName} />
      )}
      {lineups && <Lineups lineups={lineups} />}
      {stats.length > 0 && (
        <MatchStats stats={stats} homeName={homeName} awayName={awayName} />
      )}
      {hasH2H && <HeadToHead h2h={h2h} homeName={homeName} awayName={awayName} />}
      {standings && <Standings groups={standings} />}
    </div>
  );
}

function minuteLabel(minute: number, addedTime: number | null): string {
  return addedTime ? `${minute}+${addedTime}'` : `${minute}'`;
}

function Timeline({
  incidents,
  homeName,
  awayName,
}: {
  incidents: Incident[];
  homeName: string;
  awayName: string;
}) {
  return (
    <section>
      <SectionTitle>Faits de match</SectionTitle>
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between text-xs font-medium text-muted">
          <span className="truncate">{homeName}</span>
          <span className="truncate text-right">{awayName}</span>
        </div>
        {/* Center spine the events hang off, alternating left/right per team. */}
        <ul className="relative space-y-2.5 before:absolute before:inset-y-1 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border">
          {incidents.map((inc, i) => (
            <li
              key={`${inc.minute}-${i}`}
              className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm"
            >
              <div className="flex min-w-0 justify-end">
                {inc.isHome && <IncidentLabel inc={inc} align="right" />}
              </div>
              <span className="z-10 shrink-0 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-center font-mono text-xs tabular-nums text-muted">
                {minuteLabel(inc.minute, inc.addedTime)}
              </span>
              <div className="flex min-w-0 justify-start">
                {!inc.isHome && <IncidentLabel inc={inc} align="left" />}
              </div>
            </li>
          ))}
        </ul>
      </div>
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
  const isGoal = inc.kind === "goal";
  const glyph = isGoal ? (
    <span aria-label="But" className="shrink-0 text-base leading-none">
      ⚽
    </span>
  ) : (
    <span
      aria-label={inc.detail === "red" ? "Carton rouge" : "Carton jaune"}
      className={`h-4 w-3 shrink-0 rounded-[2px] shadow-sm ${
        inc.detail === "red" ? "bg-red-500" : "bg-amber-400"
      }`}
    />
  );
  return (
    <span
      className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : "text-left"}`}
    >
      {glyph}
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={`truncate font-medium ${isGoal ? "" : ""}`}>
          {inc.player}
        </span>
        {isGoal && inc.detail && (
          <span className="truncate text-xs text-faint">{inc.detail}</span>
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
                <tr className="border-b border-border text-xs text-faint">
                  <th className="py-2 pl-3 pr-1 text-center font-medium">#</th>
                  <th className="px-2 py-2 text-left font-medium">Équipe</th>
                  <th className="px-2 py-2 text-right font-medium">J</th>
                  <th className="hidden px-1.5 py-2 text-right font-medium sm:table-cell">
                    V
                  </th>
                  <th className="hidden px-1.5 py-2 text-right font-medium sm:table-cell">
                    N
                  </th>
                  <th className="hidden px-1.5 py-2 text-right font-medium sm:table-cell">
                    D
                  </th>
                  <th className="px-2 py-2 text-right font-medium">Diff</th>
                  <th className="px-3 py-2 text-right font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr
                    key={r.teamId}
                    className={`border-t border-border ${
                      r.highlight ? "bg-accent/[0.07] font-medium" : ""
                    }`}
                  >
                    <td className="relative py-2 pl-3 pr-1">
                      {r.highlight && (
                        <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" />
                      )}
                      <span
                        className={`mx-auto grid size-5 place-items-center rounded-full font-mono text-xs tabular-nums ${
                          r.highlight
                            ? "bg-accent text-accent-fg"
                            : "text-muted"
                        }`}
                      >
                        {r.position}
                      </span>
                    </td>
                    <td className="max-w-0 truncate px-2 py-2 font-medium">
                      {r.team}
                    </td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums text-muted">
                      {r.played}
                    </td>
                    <td className="hidden px-1.5 py-2 text-right font-mono tabular-nums text-muted sm:table-cell">
                      {r.won}
                    </td>
                    <td className="hidden px-1.5 py-2 text-right font-mono tabular-nums text-muted sm:table-cell">
                      {r.drawn}
                    </td>
                    <td className="hidden px-1.5 py-2 text-right font-mono tabular-nums text-muted sm:table-cell">
                      {r.lost}
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
  const subTeams = [lineups.home, lineups.away].filter(
    (s): s is TeamLineup => !!s && s.substitutes.length > 0,
  );
  const subCount = subTeams.reduce((n, s) => n + s.substitutes.length, 0);

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

      {/* One toggle reveals BOTH benches at once, side by side. */}
      {subCount > 0 && (
        <details className="group mt-3 rounded-xl border border-border bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-muted [&::-webkit-details-marker]:hidden">
            <span className="text-faint transition-transform group-open:rotate-90">
              ›
            </span>
            Remplaçants ({subCount})
          </summary>
          <div className="grid gap-x-6 gap-y-4 border-t border-border p-4 sm:grid-cols-2">
            {[lineups.home, lineups.away].map((side, i) =>
              side && side.substitutes.length > 0 ? (
                <div key={i}>
                  <p className="mb-2 truncate text-xs font-semibold text-muted">
                    {side.teamName}
                  </p>
                  <ul className="space-y-1.5">
                    {side.substitutes.map((p, j) => (
                      <PlayerRow
                        key={`${p.name}-${j}`}
                        jersey={p.jersey}
                        name={p.shortName}
                        position={p.position}
                        dim
                      />
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        </details>
      )}
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
      <Pitch players={side.players} formation={side.formation} />
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

/** Parse a formation string ("4-2-3-1") into outfield line sizes [4,2,3,1]. */
function parseFormation(formation: string): number[] | null {
  const parts = (formation || "")
    .split(/[^0-9]+/)
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n > 0);
  return parts.length >= 2 ? parts : null;
}

/**
 * Lay the starters out on the pitch (bottom → top) honoring the real formation
 * template. The keeper anchors the bottom row; the remaining outfielders are
 * sorted DEF → MID → FWD and sliced into rows of the formation's sizes
 * (e.g. 4-2-3-1 → rows of 4, 2, 3, 1). Falls back to position-bucketing when
 * the formation can't be parsed or doesn't match the player count.
 */
function pitchRows(players: LineupPlayer[], formation: string): LineupPlayer[][] {
  const gk = players.filter((p) => lineIndex(p.position) === 0);
  const outfield = players
    .filter((p) => lineIndex(p.position) !== 0)
    .sort((a, b) => lineIndex(a.position) - lineIndex(b.position));

  const parts = parseFormation(formation);
  const sum = parts?.reduce((n, p) => n + p, 0) ?? 0;
  if (parts && sum === outfield.length) {
    const rows: LineupPlayer[][] = gk.length ? [gk] : [];
    let i = 0;
    for (const n of parts) {
      rows.push(outfield.slice(i, i + n));
      i += n;
    }
    return rows.filter((r) => r.length > 0); // GK → FWD
  }

  const lines: LineupPlayer[][] = [[], [], [], []];
  for (const p of players) lines[lineIndex(p.position)].push(p);
  return lines.filter((l) => l.length > 0);
}

function Pitch({
  players,
  formation,
}: {
  players: LineupPlayer[];
  formation: string;
}) {
  const rows = pitchRows(players, formation);

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
      </div>
    </section>
  );
}

function pct(n: number, total: number): number {
  return total > 0 ? (n / total) * 100 : 0;
}
