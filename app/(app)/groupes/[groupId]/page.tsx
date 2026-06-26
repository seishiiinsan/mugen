import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getCurrentUser,
  getGroup,
  getGroupLeaderboard,
  getGroupPot,
} from "@/lib/data";
import type { LeaderboardEntry } from "@/lib/domain/types";
import { BADGE_META, frameRing, nameColor, titleText } from "@/lib/domain/cosmetics";
import { UserAvatar } from "../../_components/user-avatar";
import { CopyCode } from "../_components/copy-code";
import { GroupActions } from "../_components/group-actions";
import { GroupPotDeposit } from "../_components/group-pot-deposit";

const MEDAL = ["text-gold", "text-silver", "text-bronze"] as const;

function MemberRow({
  entry,
  isMe,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
}) {
  const medal = entry.rank <= 3 ? MEDAL[entry.rank - 1] : "text-muted";
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border p-3 ${
        isMe ? "border-accent/40 bg-accent/[0.06]" : "border-border bg-surface"
      }`}
    >
      <span
        className={`w-7 shrink-0 text-center font-mono text-sm font-semibold tabular-nums ${medal}`}
      >
        {entry.rank}
      </span>
      <Link
        href={`/joueur/${encodeURIComponent(entry.username)}`}
        className="shrink-0"
      >
        <UserAvatar
          username={entry.username}
          avatarUrl={entry.avatarUrl}
          sizes="36px"
          className={`size-9 rounded-full border bg-surface-2 text-sm font-semibold ${
            frameRing(entry.equippedFrame) || "border-border"
          }`}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/joueur/${encodeURIComponent(entry.username)}`}
            className={`truncate font-medium hover:text-accent ${nameColor(entry.equippedColor)}`}
          >
            {entry.username}
          </Link>
          {entry.equippedBadge && BADGE_META[entry.equippedBadge] && (
            <span aria-hidden>{BADGE_META[entry.equippedBadge].emoji}</span>
          )}
          {isMe && <span className="shrink-0 text-xs text-accent">vous</span>}
        </div>
        <div className="text-xs text-faint">
          {titleText(entry.equippedTitle) && `${titleText(entry.equippedTitle)} · `}
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

export default async function GroupDetailPage(
  props: PageProps<"/groupes/[groupId]">,
) {
  const { groupId } = await props.params;

  const [me, group] = await Promise.all([getCurrentUser(), getGroup(groupId)]);
  if (!me) redirect("/login");
  if (!group) notFound();

  const [members, pot] = await Promise.all([
    getGroupLeaderboard(groupId),
    getGroupPot(groupId),
  ]);
  const isOwner = group.ownerId === me.id;

  const month = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <section>
      <Link
        href="/groupes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        ← Groupes
      </Link>

      <header className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {group.name}
            </h1>
            <p className="text-sm text-muted">
              <span className="capitalize">{month}</span>
              <span className="text-faint">
                {" "}
                · {group.memberCount} membre{group.memberCount > 1 ? "s" : ""}
              </span>
            </p>
          </div>
          <GroupActions groupId={group.id} isOwner={isOwner} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="text-xs text-faint">Code d&apos;invitation</span>
          <CopyCode code={group.inviteCode} />
          {isOwner && (
            <Link
              href={`/groupes/${group.id}/parametres`}
              className="ml-auto rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground"
            >
              Paramètres du groupe
            </Link>
          )}
        </div>
      </header>

      {pot && (
        <div className="mb-5">
          <GroupPotDeposit
            groupId={group.id}
            potBalance={pot.balance}
            myContribution={pot.myContribution}
            myBalance={me.coins}
          />
        </div>
      )}

      {members.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          Aucun membre à afficher.
        </p>
      ) : (
        <ul className="space-y-2">
          {members.map((entry) => (
            <MemberRow
              key={entry.userId}
              entry={entry}
              isMe={entry.userId === me.id}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
