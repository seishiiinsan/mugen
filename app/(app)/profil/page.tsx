import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getFixturesByIds,
  getMyAchievementKeys,
  getMyBadges,
  getMyBoostStock,
  getMyFriends,
  getMyLevel,
  getMyMonthlyStats,
  getMyPredictions,
} from "@/lib/data";
import { SCORING_RULES, scorePrediction } from "@/lib/domain/scoring";
import {
  activeLeaderboardMonth,
  BOOSTS,
  BOOST_TYPES,
  leaderboardMonth,
  scoreBoosted,
} from "@/lib/domain/boosts";
import { SCORER_HIT_BY_ROLE, SCORER_MISS } from "@/lib/domain/markets";
import { ACHIEVEMENTS } from "@/lib/domain/economy";
import {
  BADGE_META,
  frameRing,
  nameColor,
  titleText,
} from "@/lib/domain/cosmetics";
import { signOut } from "@/app/login/actions";
import {
  ChevronLeftIcon,
  CoinIcon,
  CrownIcon,
  FriendsIcon,
  InfoIcon,
  LogoutIcon,
} from "../_components/icons";

/** Display config for each points tier, mono-accent (no rainbow per MASTER). */
const TIERS: { points: number; label: string; bar: string }[] = [
  { points: 10, label: "Score exact", bar: "bg-accent" },
  { points: 6, label: "Bon vainqueur, écart ≤ 1", bar: "bg-accent/70" },
  { points: 4, label: "Bon vainqueur, écart moyen", bar: "bg-accent/55" },
  { points: 3, label: "Nul exact", bar: "bg-accent/40" },
  { points: 2, label: "Bon vainqueur, écart éloigné", bar: "bg-accent/30" },
  { points: 0, label: "Manqué", bar: "bg-border-strong" },
];

/** Goalscorer barème — more points the rarer the role, −2 if wrong. */
const SCORER_RULES: { label: string; points: number }[] = [
  { label: "Buteur — gardien", points: SCORER_HIT_BY_ROLE.G },
  { label: "Buteur — défenseur", points: SCORER_HIT_BY_ROLE.D },
  { label: "Buteur — milieu", points: SCORER_HIT_BY_ROLE.M },
  { label: "Buteur — attaquant", points: SCORER_HIT_BY_ROLE.F },
  { label: "Buteur manqué", points: SCORER_MISS },
];

function rankMedal(rank: number | null) {
  if (rank === 1) return { color: "text-gold", ring: "ring-gold/40", crown: true };
  if (rank === 2) return { color: "text-silver", ring: "ring-silver/40", crown: false };
  if (rank === 3) return { color: "text-bronze", ring: "ring-bronze/40", crown: false };
  return null;
}

export default async function ProfilPage() {
  const [
    me,
    stats,
    predictions,
    boostStock,
    badges,
    achievementKeys,
    level,
    friends,
  ] = await Promise.all([
    getCurrentUser(),
    getMyMonthlyStats(),
    getMyPredictions(),
    getMyBoostStock(),
    getMyBadges(),
    getMyAchievementKeys(),
    getMyLevel(),
    getMyFriends(),
  ]);
  if (!me) redirect("/login");

  const unlocked = new Set(achievementKeys);
  const levelPct = Math.round((level.current / level.needed) * 100);
  const showcaseBadge = me.equippedBadge ? BADGE_META[me.equippedBadge] : null;

  const fixtures = await getFixturesByIds(predictions.map((p) => p.fixtureId));
  const byId = new Map(fixtures.map((f) => [f.id, f]));

  // Boosts actually played this month: which match, and what it brought.
  // Uses the grace-lagged active month so it matches the displayed leaderboard.
  const thisMonth = activeLeaderboardMonth();
  const boostUsage = predictions
    .filter((p) => p.boost)
    .map((p) => {
      const f = byId.get(p.fixtureId);
      if (!f || leaderboardMonth(f.kickoff) !== thisMonth) return null;
      const points =
        f.status === "finished" && f.score
          ? scoreBoosted({
              primary: { home: p.home, away: p.away },
              secondary: p.secondary,
              actual: f.score,
              boost: p.boost,
            }).points
          : p.points;
      return { boost: p.boost!, fixture: f, points };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Settle each prediction we can, to derive lived-in stats. `settled` holds the
  // base result points (drive the tier distribution + hit rate); `credited`
  // holds the actual points awarded — boost and goalscorers included — straight
  // from the DB, which is what "Meilleure perf." should reflect.
  const settled: number[] = [];
  const credited: number[] = [];
  let pending = 0;
  for (const p of predictions) {
    const f = byId.get(p.fixtureId);
    if (f && f.status === "finished" && f.score) {
      settled.push(scorePrediction({ home: p.home, away: p.away }, f.score));
      // Settled rows carry their credited total; fall back to a boosted recompute
      // for the rare finished-but-not-yet-settled case.
      credited.push(
        p.points ??
          scoreBoosted({
            primary: { home: p.home, away: p.away },
            secondary: p.secondary,
            actual: f.score,
            boost: p.boost,
          }).points,
      );
    } else {
      pending += 1;
    }
  }

  const played = predictions.length;
  const hits = settled.filter((pts) => pts > 0).length;
  const hitRate = settled.length
    ? Math.round((hits / settled.length) * 100)
    : 0;
  const best = credited.length ? Math.max(...credited) : 0;
  const counts = TIERS.map(
    (t) => settled.filter((pts) => pts === t.points).length,
  );
  const maxCount = Math.max(1, ...counts);

  const joined = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(me.joinedAt));

  const medal = rankMedal(stats.rank);

  return (
    <section className="space-y-6">
      {/* Hero identity card — subtle accent wash, podium-aware rank badge */}
      <header className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-accent/[0.08] via-surface to-surface p-5">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div
              className={`relative size-16 overflow-hidden rounded-full bg-surface ring-2 ${
                medal
                  ? medal.ring
                  : me.equippedFrame
                    ? frameRing(me.equippedFrame)
                    : "ring-accent/30"
              }`}
            >
              {me.avatarUrl ? (
                <Image
                  src={me.avatarUrl}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <span className="grid size-full place-items-center text-2xl font-bold">
                  {me.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {showcaseBadge && (
              <span
                title={showcaseBadge.label}
                className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border border-border bg-surface text-sm"
                aria-hidden
              >
                {showcaseBadge.emoji}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1
                className={`truncate text-2xl font-bold tracking-tight ${nameColor(me.equippedColor)}`}
              >
                {me.username}
              </h1>
              {titleText(me.equippedTitle) && (
                <span className="shrink-0 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  {titleText(me.equippedTitle)}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted">Membre depuis {joined}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <Link
                href="/profil/modifier"
                className="text-xs font-medium text-accent hover:underline"
              >
                Modifier le profil
              </Link>
              <Link
                href="/amis"
                className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-foreground hover:text-accent"
              >
                <FriendsIcon className="size-3.5 text-accent" />
                {friends.length}
                <span className="font-normal text-muted">
                  ami{friends.length > 1 ? "s" : ""}
                </span>
              </Link>
              <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-foreground">
                <CoinIcon className="size-3.5 text-accent" />
                {me.coins}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-accent">
                Niv. {level.level}
              </span>
            </div>
          </div>
        </div>

        {stats.rank != null && (
          <div
            className={`absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-sm font-semibold tabular-nums ${
              medal ? medal.color : "text-muted"
            }`}
          >
            {medal?.crown && <CrownIcon className="size-4" />}#{stats.rank}
          </div>
        )}
      </header>

      {/* Headline stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Points du mois" value={stats.points} accent />
        <Stat label="Scores exacts" value={stats.exactScores} />
        <Stat label="Pronos joués" value={played} />
      </div>

      {/* Performance — réussite ring + quick facts */}
      <div className="flex items-center gap-5 rounded-xl border border-border bg-surface p-5">
        <Ring pct={hitRate} />
        <div className="grid flex-1 grid-cols-3 gap-3 text-center">
          <Fact label="Réussite" value={`${hitRate}%`} />
          <Fact label="Meilleure perf." value={`${best} pts`} />
          <Fact label="En attente" value={pending} />
        </div>
      </div>

      {/* Monthly boosts */}
      <div>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
          Boosts du mois
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {BOOST_TYPES.map((t) => {
            const available = boostStock.remaining.includes(t);
            return (
              <div
                key={t}
                className={`rounded-xl border p-3 text-center ${
                  available
                    ? "border-accent/30 bg-accent/[0.05]"
                    : "border-border bg-surface"
                }`}
                title={BOOSTS[t].rule}
              >
                <div
                  className={`text-sm font-semibold ${
                    available ? "text-accent" : "text-faint"
                  }`}
                >
                  {BOOSTS[t].name}
                </div>
                <div className="mt-0.5 text-[11px] text-faint">
                  {available ? "Disponible" : "Utilisé"}
                </div>
              </div>
            );
          })}
        </div>

        {boostUsage.length > 0 && (
          <ul className="mt-3 space-y-2">
            {boostUsage.map((u) => (
              <li
                key={u.fixture.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="text-lg" aria-hidden>
                    {BOOSTS[u.boost].emoji}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {BOOSTS[u.boost].name}
                    </div>
                    <div className="truncate text-xs text-faint">
                      {u.fixture.home.name} – {u.fixture.away.name}
                    </div>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums ${
                    u.points != null
                      ? "bg-success/10 text-success"
                      : "text-faint"
                  }`}
                >
                  {u.points != null ? `+${u.points} pts` : "en attente"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Outcome breakdown */}
      <div>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
          Répartition de tes pronos
        </h2>
        {settled.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted">
              Aucun pronostic terminé pour le moment.
            </p>
            <Link
              href="/matchs"
              className="press rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong"
            >
              Pronostiquer un match
            </Link>
          </div>
        ) : (
          <ul className="space-y-2.5 rounded-xl border border-border bg-surface p-4">
            {TIERS.map((t, i) => (
              <li key={t.points} className="flex items-center gap-3">
                <span className="w-44 shrink-0 truncate text-sm text-muted">
                  {t.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full ${t.bar}`}
                    style={{ width: `${(counts[i] / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right font-mono text-sm font-semibold tabular-nums">
                  {counts[i]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Niveau & succès — résumé, détail sur /succes */}
      <Link
        href="/succes"
        className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Niveau & succès</h2>
          <span className="text-xs font-medium text-accent">Voir tout →</span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="font-mono text-2xl font-bold tabular-nums">
            {level.level}
          </span>
          <div className="flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${levelPct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[11px] tabular-nums text-faint">
              <span>{level.current} / {level.needed} XP</span>
              <span>
                {unlocked.size}/{ACHIEVEMENTS.length} succès
              </span>
            </div>
          </div>
        </div>

        {badges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {badges.map(({ key, count }) => {
              const meta = BADGE_META[key];
              if (!meta) return null;
              return (
                <span
                  key={key}
                  title={count > 1 ? `${meta.label} ×${count}` : meta.label}
                  className={`relative grid size-7 place-items-center rounded-full border text-sm ${
                    me.equippedBadge === key
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface-2"
                  }`}
                  aria-hidden
                >
                  {meta.emoji}
                  {count > 1 && (
                    <span className="absolute -right-1 -top-1 grid min-w-3.5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-accent-fg">
                      ×{count}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </Link>

      {/* Scoring reference — tucked behind a small "i" disclosure */}
      <details className="group rounded-xl border border-border bg-surface">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-sm font-medium text-muted transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
          <InfoIcon className="size-4 shrink-0 text-faint" />
          Comment les points sont calculés
          <ChevronLeftIcon className="ml-auto size-4 -rotate-90 text-faint transition-transform group-open:rotate-90" />
        </summary>
        <div className="border-t border-border">
          <p className="px-3 pt-3 text-xs font-medium uppercase tracking-wide text-faint">
            Score
          </p>
          <ul className="mt-1 divide-y divide-border">
            {SCORING_RULES.map((rule) => (
              <li
                key={rule.label}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">{rule.label}</div>
                  <div className="text-xs text-muted">{rule.example}</div>
                </div>
                <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 font-mono text-sm font-semibold tabular-nums text-accent">
                  {rule.points} pts
                </span>
              </li>
            ))}
          </ul>

          <p className="px-3 pt-4 text-xs font-medium uppercase tracking-wide text-faint">
            Buteurs <span className="normal-case text-faint">(jusqu&apos;à 5)</span>
          </p>
          <ul className="mt-1 divide-y divide-border">
            {SCORER_RULES.map((rule) => {
              const negative = rule.points < 0;
              return (
                <li
                  key={rule.label}
                  className="flex items-center justify-between gap-3 p-3"
                >
                  <div className="text-sm font-medium">{rule.label}</div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-sm font-semibold tabular-nums ${
                      negative
                        ? "bg-danger/10 text-danger"
                        : "bg-accent/10 text-accent"
                    }`}
                  >
                    {rule.points > 0 ? "+" : ""}
                    {rule.points} pts
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="px-3 py-3 text-xs text-faint">
            Les boosts s&apos;appliquent au score ; les buteurs s&apos;ajoutent
            ensuite, sans jamais faire descendre un match sous 0 point.
          </p>
        </div>
      </details>

      {/* Account footer */}
      <footer className="flex flex-col items-center gap-1 border-t border-border pt-5">
        <Link
          href="/signaler"
          className="press inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-faint transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <InfoIcon className="size-4" />
          Signaler un problème ou une idée
        </Link>
        <form action={signOut} className="flex justify-center">
          <button
            type="submit"
            className="press inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-faint transition-colors hover:bg-danger/[0.06] hover:text-danger"
          >
            <LogoutIcon className="size-4" />
            Se déconnecter
          </button>
        </form>
      </footer>
    </section>
  );
}

/** Circular progress ring for the réussite rate (single accent stroke). */
function Ring({ pct }: { pct: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <div className="relative grid size-20 shrink-0 place-items-center">
      <svg viewBox="0 0 80 80" className="size-20 -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="6"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute font-mono text-lg font-bold tabular-nums">
        {pct}
        <span className="text-xs font-normal text-faint">%</span>
      </span>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-mono text-lg font-bold tabular-nums">{value}</div>
      <div className="text-xs text-faint">{label}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div
        className={`font-mono text-2xl font-bold tabular-nums ${
          accent ? "text-accent" : ""
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-faint">{label}</div>
    </div>
  );
}
