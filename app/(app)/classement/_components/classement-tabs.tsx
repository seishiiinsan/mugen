"use client";

import { useState } from "react";
import Link from "next/link";
import type { LeaderboardEntry, RankedPlayer } from "@/lib/domain/types";
import { CoinIcon, CrownIcon } from "../../_components/icons";
import { UserAvatar } from "../../_components/user-avatar";

const profileHref = (username: string) =>
  `/joueur/${encodeURIComponent(username)}`;

type Board = "monthly" | "coins" | "xp";

const TABS: { id: Board; label: string }[] = [
  { id: "monthly", label: "Mensuel" },
  { id: "coins", label: "Plus riches" },
  { id: "xp", label: "Plus d'XP" },
];

export function ClassementTabs({
  monthly,
  coins,
  xp,
  meId,
  monthLabel,
}: {
  monthly: LeaderboardEntry[];
  coins: RankedPlayer[];
  xp: RankedPlayer[];
  meId: string;
  monthLabel: string;
}) {
  const [tab, setTab] = useState<Board>("monthly");

  return (
    <div>
      <div
        role="tablist"
        className="mb-5 flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-accent/10 text-accent"
                : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "monthly" && (
        <MonthlyBoard entries={monthly} meId={meId} monthLabel={monthLabel} />
      )}
      {tab === "coins" && (
        <AllTimeBoard
          entries={coins}
          meId={meId}
          kind="coins"
          caption="Les plus grosses cagnottes, depuis toujours. Aucune remise à zéro, aucune récompense — juste le prestige."
        />
      )}
      {tab === "xp" && (
        <AllTimeBoard
          entries={xp}
          meId={meId}
          kind="xp"
          caption="L'expérience accumulée à vie. Elle ne retombe jamais et ne rapporte rien d'autre que la gloire."
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Monthly board — podium + reward banner + chasing pack + window.
// ---------------------------------------------------------------------------

const PODIUM = [
  { medal: "text-gold", ring: "ring-gold/45", pedestal: "from-gold/15", height: "h-24", label: "1er", reward: "Récompense or" },
  { medal: "text-silver", ring: "ring-silver/45", pedestal: "from-silver/15", height: "h-16", label: "2e", reward: "Récompense argent" },
  { medal: "text-bronze", ring: "ring-bronze/45", pedestal: "from-bronze/15", height: "h-12", label: "3e", reward: "Récompense bronze" },
] as const;

function MonthlyBoard({
  entries,
  meId,
  monthLabel,
}: {
  entries: LeaderboardEntry[];
  meId: string;
  monthLabel: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
        Aucun joueur pour le moment.
      </p>
    );
  }

  const top3 = entries.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]];
  const tierOf = [1, 0, 2];

  const TOP_COUNT = 10;
  const topRest = entries.slice(3, TOP_COUNT);

  const meIndex = entries.findIndex((e) => e.userId === meId);
  const isFarDown = meIndex >= TOP_COUNT;
  const windowStart = isFarDown ? Math.max(TOP_COUNT, meIndex - 2) : 0;
  const windowEntries = isFarDown ? entries.slice(windowStart, meIndex + 3) : [];
  const skipped = windowStart - TOP_COUNT;

  return (
    <>
      <p className="mb-3 text-xs text-faint">
        <span className="capitalize">{monthLabel}</span> · remise à zéro le 1er du mois.
      </p>

      <div className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/[0.06] px-3 py-2">
        <CrownIcon className="h-4 w-4 shrink-0 text-gold" />
        <p className="text-xs text-muted">
          <span className="font-medium text-foreground">Le top 50</span> remporte
          des pièces — et le podium un badge exclusif.
        </p>
      </div>

      <div className="mt-10 mb-6 flex items-end gap-2 sm:gap-3">
        {podiumOrder.map((entry, i) =>
          entry ? (
            <PodiumSpot
              key={entry.userId}
              entry={entry}
              tier={tierOf[i]}
              isMe={entry.userId === meId}
            />
          ) : (
            <div key={`empty-${i}`} className="min-w-0 flex-1" />
          ),
        )}
      </div>

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
              <MonthlyRow key={entry.userId} entry={entry} isMe={entry.userId === meId} />
            ))}
          </ol>
        </>
      )}

      {windowEntries.length > 0 && (
        <>
          {skipped > 0 && (
            <div className="my-3 flex flex-col items-center gap-1 text-faint">
              <span className="text-lg leading-none tracking-widest">···</span>
              <span className="text-xs">
                {skipped} joueur{skipped > 1 ? "s" : ""}
              </span>
            </div>
          )}
          <ol className="mt-2 space-y-2">
            {windowEntries.map((entry) => (
              <MonthlyRow key={entry.userId} entry={entry} isMe={entry.userId === meId} />
            ))}
          </ol>
        </>
      )}
    </>
  );
}

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

      <div
        className={`mt-2 flex w-full ${t.height} flex-col items-center justify-start rounded-t-lg border-x border-t border-border bg-gradient-to-b ${t.pedestal} to-surface pt-2`}
      >
        <span className={`text-sm font-bold ${t.medal}`}>{t.label}</span>
        <span className="mt-0.5 text-[10px] text-faint">{t.reward}</span>
      </div>
    </div>
  );
}

function MonthlyRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
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

// ---------------------------------------------------------------------------
// All-time boards — coins / XP. Simple ranked list, no podium, no rewards.
// ---------------------------------------------------------------------------

const RANK_MEDAL: Record<number, string> = {
  1: "text-gold",
  2: "text-silver",
  3: "text-bronze",
};

function AllTimeBoard({
  entries,
  meId,
  kind,
  caption,
}: {
  entries: RankedPlayer[];
  meId: string;
  kind: "coins" | "xp";
  caption: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
        Aucun joueur pour le moment.
      </p>
    );
  }

  return (
    <>
      <p className="mb-4 text-xs text-faint">{caption}</p>
      <ol className="space-y-2">
        {entries.map((e) => {
          const isMe = e.userId === meId;
          return (
            <li
              key={e.userId}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                isMe ? "border-accent/40 bg-accent/[0.06]" : "border-border bg-surface"
              }`}
            >
              <span
                className={`w-7 shrink-0 text-center font-mono text-sm font-bold tabular-nums ${
                  RANK_MEDAL[e.rank] ?? "text-muted"
                }`}
              >
                {e.rank}
              </span>
              <Link href={profileHref(e.username)} className="shrink-0">
                <UserAvatar
                  username={e.username}
                  avatarUrl={e.avatarUrl}
                  sizes="36px"
                  className="size-9 rounded-full border border-border bg-surface-2 text-sm font-semibold"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={profileHref(e.username)}
                    className="truncate font-medium hover:text-accent"
                  >
                    {e.username}
                  </Link>
                  {isMe && <span className="shrink-0 text-xs text-accent">vous</span>}
                </div>
                {kind === "xp" && e.level != null && (
                  <div className="text-xs text-faint">Niveau {e.level}</div>
                )}
              </div>
              {kind === "coins" ? (
                <span className="flex shrink-0 items-center gap-1 font-mono text-sm font-semibold tabular-nums text-accent">
                  <CoinIcon className="size-4" />
                  {e.value.toLocaleString("fr-FR")}
                </span>
              ) : (
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                  {e.value.toLocaleString("fr-FR")}
                  <span className="ml-1 text-xs font-normal text-faint">XP</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
