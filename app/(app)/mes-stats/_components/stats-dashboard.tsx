import type { ReactNode } from "react";
import Link from "next/link";
import {
  bucketLabel,
  hitRate,
  scoreTone,
  type ScoreTone,
} from "@/lib/domain/player-stats";
import type { FavoriteTeamPerf, PlayerStats } from "@/lib/domain/types";
import { TeamCrest } from "../../_components/team-crest";

const TONE: Record<ScoreTone, { pill: string; bar: string }> = {
  exact: { pill: "bg-gold/15 text-gold", bar: "bg-gold" },
  hit: { pill: "bg-accent/15 text-accent", bar: "bg-accent" },
  miss: { pill: "bg-danger/10 text-danger", bar: "bg-danger/60" },
};

export function StatsDashboard({ stats }: { stats: PlayerStats }) {
  const { overall, form, distribution, byLeague, byTeam, favoriteTeam } = stats;
  const rate = hitRate(overall.hits, overall.settled);
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex items-center gap-5 rounded-xl border border-border bg-surface p-5">
        <Donut pct={rate} />
        <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3">
          <Metric label="Pronostics" value={String(overall.settled)} />
          <Metric label="Réussite" value={`${Math.round(rate * 100)}%`} />
          <Metric label="Scores exacts" value={String(overall.exacts)} />
          <Metric label="Moy. / prono" value={`${overall.avgBase}`} />
        </div>
      </div>

      {/* Club de cœur */}
      {favoriteTeam ? (
        <FavoriteCard fav={favoriteTeam} />
      ) : (
        <Link
          href="/profil/modifier"
          className="block rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted transition-colors hover:border-accent/40 hover:text-foreground"
        >
          Choisis ton club de cœur →
        </Link>
      )}

      {/* Recent form */}
      {form.length > 0 && (
        <Section title="Forme récente" hint="Tes 5 derniers pronostics réglés.">
          <div className="flex gap-1.5">
            {form.map((f, i) => (
              <span
                key={i}
                title={`${f.home} – ${f.away} · ${f.points} pts`}
                className={`grid size-10 place-items-center rounded-md text-sm font-bold tabular-nums ${TONE[scoreTone(f.basePoints)].pill}`}
              >
                {f.basePoints}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Points distribution */}
      <Section
        title="Répartition des points"
        hint="Comment se répartissent tes pronostics réglés."
      >
        <div className="space-y-2">
          {distribution.map((d) => (
            <div key={d.base} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs text-muted">
                {bucketLabel(d.base)}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full rounded-full ${TONE[scoreTone(d.base)].bar}`}
                  style={{ width: `${(d.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-xs tabular-nums text-muted">
                {d.count}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* By league */}
      {byLeague.length > 0 && (
        <Section
          title="Par ligue"
          hint="Classées par moyenne de points (min. 3 pronostics)."
        >
          <ol className="space-y-2">
            {byLeague.slice(0, 6).map((l) => (
              <PerfRow
                key={l.leagueId}
                name={l.leagueName}
                logo={l.leagueLogo}
                count={l.count}
                avgBase={l.avgBase}
                extra={`${Math.round(l.hitRate * 100)}% de réussite`}
              />
            ))}
          </ol>
        </Section>
      )}

      {/* By team */}
      {byTeam.length > 0 && (
        <Section
          title="Par équipe"
          hint="Tes équipes fétiches et bêtes noires (min. 3 pronostics)."
        >
          <ol className="space-y-2">
            {byTeam.slice(0, 6).map((t) => (
              <PerfRow
                key={t.teamId}
                name={t.name}
                logo={t.logo}
                count={t.count}
                avgBase={t.avgBase}
              />
            ))}
          </ol>
        </Section>
      )}
    </div>
  );
}

function Donut({ pct }: { pct: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, pct)) * c;
  return (
    <svg viewBox="0 0 80 80" className="size-20 shrink-0">
      <g transform="rotate(-90 40 40)">
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-surface-2"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="text-accent"
        />
      </g>
      <text
        x="40"
        y="41"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        className="text-foreground text-[16px] font-bold"
      >
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold">{title}</h2>
      {hint && <p className="mb-3 text-xs text-faint">{hint}</p>}
      {children}
    </section>
  );
}

function FavoriteCard({ fav }: { fav: FavoriteTeamPerf }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/[0.06] p-4">
      <TeamCrest name={fav.name} logoUrl={fav.logo} size={40} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-wide text-accent">
          Club de cœur
        </div>
        <div className="truncate font-semibold">{fav.name}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-sm font-semibold tabular-nums">
          {fav.avgBase ?? "—"}
          <span className="ml-0.5 text-xs font-normal text-faint">pts</span>
        </div>
        <div className="text-xs text-faint">
          {fav.count} prono{fav.count > 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}

function PerfRow({
  name,
  logo,
  count,
  avgBase,
  extra,
}: {
  name: string;
  logo?: string;
  count: number;
  avgBase: number;
  extra?: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
      <TeamCrest name={name} logoUrl={logo} size={24} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="text-xs text-faint">
          {count} prono{count > 1 ? "s" : ""}
          {extra ? ` · ${extra}` : ""}
        </div>
      </div>
      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
        {avgBase}
        <span className="ml-0.5 text-xs font-normal text-faint">pts</span>
      </span>
    </li>
  );
}
