import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getGroup, getGroupLeaderboard } from "@/lib/data";
import type { LeaderboardEntry } from "@/lib/domain/types";
import { UserAvatar } from "../../_components/user-avatar";
import { CopyCode } from "../_components/copy-code";
import { GroupActions } from "../_components/group-actions";

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
          className="size-9 rounded-full border border-border bg-surface-2 text-sm font-semibold"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/joueur/${encodeURIComponent(entry.username)}`}
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

export default async function GroupDetailPage(
  props: PageProps<"/groupes/[groupId]">,
) {
  const { groupId } = await props.params;

  const [me, group] = await Promise.all([getCurrentUser(), getGroup(groupId)]);
  if (!me) redirect("/login");
  if (!group) notFound();

  const members = await getGroupLeaderboard(groupId);
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

        <div className="mt-3 flex items-center gap-2 text-sm text-muted">
          <span className="text-xs text-faint">Code d&apos;invitation</span>
          <CopyCode code={group.inviteCode} />
        </div>
      </header>

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
