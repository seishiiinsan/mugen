import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getMonthlyLeaderboard } from "@/lib/data";
import type { LeaderboardEntry } from "@/lib/domain/types";
import { CrownIcon } from "../_components/icons";
import { UserAvatar } from "../_components/user-avatar";

/** Link to a player's public profile. */
const profileHref = (username: string) =>
  `/joueur/${encodeURIComponent(username)}`;

/** Visual tier for a podium slot, keyed by display position (0 = top). */
const PODIUM = [
  {
    medal: "text-gold",
    ring: "ring-gold/45",
    glow: "bg-gold/10",
    pedestal: "from-gold/15",
    height: "h-24",
    label: "1er",
    reward: "Récompense or",
  },
  {
    medal: "text-silver",
    ring: "ring-silver/45",
    glow: "bg-silver/10",
    pedestal: "from-silver/15",
    height: "h-16",
    label: "2e",
    reward: "Récompense argent",
  },
  {
    medal: "text-bronze",
    ring: "ring-bronze/45",
    glow: "bg-bronze/10",
    pedestal: "from-bronze/15",
    height: "h-12",
    label: "3e",
    reward: "Récompense bronze",
  },
] as const;


function PodiumSpot({
  entry,
  tier,
  isMe,
}: {
  entry: LeaderboardEntry;
  tier: number;
  isMe: boolean;
}) {
  const t = PODIUM[tier];
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      {/* Avatar + crown for the winner */}
      <Link href={profileHref(entry.username)} className="relative mb-2 block">
        {tier === 0 && (
          <CrownIcon className="absolute -top-5 left-1/2 h-5 w-5 -translate-x-1/2 text-gold" />
        )}
        <UserAvatar
          username={entry.username}
          avatarUrl={entry.avatarUrl}
          sizes="56px"
          className={`size-14 rounded-full bg-surface-2 text-lg font-semibold ring-2 ${t.ring}`}
        />
        <span
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-border bg-surface px-1.5 text-xs font-bold tabular-nums ${t.medal}`}
        >
          {entry.rank}
        </span>
      </Link>

      <Link
        href={profileHref(entry.username)}
        className="mt-1 max-w-full truncate text-sm font-semibold hover:text-accent"
      >
        {entry.username}
      </Link>
      {isMe && <span className="text-xs text-accent">vous</span>}
      <span className="font-mono text-sm font-semibold tabular-nums">
        {entry.points}
        <span className="ml-0.5 text-xs font-normal text-faint">pts</span>
      </span>

      {/* Pedestal */}
      <div
        className={`mt-2 flex w-full ${t.height} flex-col items-center justify-start rounded-t-lg border-x border-t border-border bg-gradient-to-b ${t.pedestal} to-surface pt-2`}
      >
        <span className={`text-sm font-bold ${t.medal}`}>{t.label}</span>
        <span className="mt-0.5 text-[10px] text-faint">{t.reward}</span>
      </div>
    </div>
  );
}

function RankRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border p-3 ${
        isMe ? "border-accent/40 bg-accent/[0.06]" : "border-border bg-surface"
      }`}
    >
      <span className="w-7 shrink-0 text-center font-mono text-sm font-semibold tabular-nums text-muted">
        {entry.rank}
      </span>
      <Link href={profileHref(entry.username)} className="shrink-0">
        <UserAvatar
          username={entry.username}
          avatarUrl={entry.avatarUrl}
          sizes="36px"
          className="size-9 rounded-full border border-border bg-surface-2 text-sm font-semibold"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={profileHref(entry.username)}
            className="truncate font-medium hover:text-accent"
          >
            {entry.username}
          </Link>
          {isMe && <span className="shrink-0 text-xs text-accent">vous</span>}
        </div>
        <div className="text-xs text-faint">
          {entry.exactScores} score{entry.exactScores > 1 ? "s" : ""} exact
          {entry.exactScores > 1 ? "s" : ""}
        </div>
      </div>
      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
        {entry.points}
        <span className="ml-1 text-xs font-normal text-faint">pts</span>
      </span>
    </li>
  );
}

export default async function ClassementPage() {
  const [leaderboard, me] = await Promise.all([
    getMonthlyLeaderboard(),
    getCurrentUser(),
  ]);
  if (!me) redirect("/login");

  const month = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  const top3 = leaderboard.slice(0, 3);
  // Render order: 2nd, 1st, 3rd so the winner sits raised in the centre.
  const podiumOrder = [top3[1], top3[0], top3[2]];
  const tierOf = [1, 0, 2];

  // Always show the top 10 (podium 1-3 + this list of 4-10).
  const TOP_COUNT = 10;
  const topRest = leaderboard.slice(3, TOP_COUNT);

  // If the player sits beyond the top 10, show a "…" jump then a window of the
  // two players ahead, the player, and the two behind. The window starts no
  // earlier than the top 10 so it never duplicates rows already shown.
  const meIndex = leaderboard.findIndex((e) => e.userId === me.id);
  const isFarDown = meIndex >= TOP_COUNT;
  const windowStart = isFarDown ? Math.max(TOP_COUNT, meIndex - 2) : 0;
  const windowEntries = isFarDown
    ? leaderboard.slice(windowStart, meIndex + 3)
    : [];
  const skipped = windowStart - TOP_COUNT; // players hidden behind the "…"

  return (
    <section>
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/10 text-gold">
            <CrownIcon className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Classement mondial
            </h1>
            <p className="text-sm text-muted">
              <span className="capitalize">{month}</span>
              {leaderboard.length > 0 && (
                <span className="text-faint">
                  {" "}
                  · {leaderboard.length} joueur
                  {leaderboard.length > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-faint">
          Remise à zéro le 1er du mois.
        </p>
      </header>

      {leaderboard.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          Aucun joueur pour le moment.
        </p>
      ) : (
        <>
          {/* Reward banner — marks the top 3 as the prize zone */}
          <div className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/[0.06] px-3 py-2">
            <CrownIcon className="h-4 w-4 shrink-0 text-gold" />
            <p className="text-xs text-muted">
              <span className="font-medium text-foreground">Le top 3</span>{" "}
              remporte les récompenses du mois.
            </p>
          </div>

          {/* Podium — extra top padding so the winner's crown has room */}
          <div className="mt-10 mb-6 flex items-end gap-2 sm:gap-3">
            {podiumOrder.map((entry, i) =>
              entry ? (
                <PodiumSpot
                  key={entry.userId}
                  entry={entry}
                  tier={tierOf[i]}
                  isMe={entry.userId === me.id}
                />
              ) : (
                <div key={`empty-${i}`} className="min-w-0 flex-1" />
              ),
            )}
          </div>

          {/* The chasing pack — ranks 4 to 10 */}
          {topRest.length > 0 && (
            <>
              <div className="mb-2 flex items-center gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-faint">
                  À la poursuite du podium
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <ol className="space-y-2">
                {topRest.map((entry) => (
                  <RankRow
                    key={entry.userId}
                    entry={entry}
                    isMe={entry.userId === me.id}
                  />
                ))}
              </ol>
            </>
          )}

          {/* Window around the player when they sit beyond the top 10. The
              "…" jump only shows when players are actually skipped; if the
              window is contiguous with the top 10 it reads as one list. */}
          {windowEntries.length > 0 && (
            <>
              {skipped > 0 && (
                <div
                  className="my-3 flex flex-col items-center gap-1 text-faint"
                  aria-label={`${skipped} joueurs masqués`}
                >
                  <span className="text-lg leading-none tracking-widest">
                    ···
                  </span>
                  <span className="text-xs">
                    {skipped} joueur{skipped > 1 ? "s" : ""}
                  </span>
                </div>
              )}
              <ol className="mt-2 space-y-2">
                {windowEntries.map((entry) => (
                  <RankRow
                    key={entry.userId}
                    entry={entry}
                    isMe={entry.userId === me.id}
                  />
                ))}
              </ol>
            </>
          )}
        </>
      )}
    </section>
  );
}
