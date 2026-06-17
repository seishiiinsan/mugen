import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getMyFriendRequests, getMyFriends } from "@/lib/data";
import { BADGE_META, frameRing, nameColor, titleText } from "@/lib/domain/cosmetics";
import type { FriendRequest, FriendSummary } from "@/lib/domain/types";
import { FriendsIcon } from "../_components/icons";
import { UserAvatar } from "../_components/user-avatar";
import { FriendSearch } from "./_components/friend-search";
import { RelationButton, RemoveButton } from "./_components/social-buttons";

export default async function AmisPage() {
  const [me, friends, requests] = await Promise.all([
    getCurrentUser(),
    getMyFriends(),
    getMyFriendRequests(),
  ]);
  if (!me) redirect("/login");

  const incoming = requests.filter((r) => r.direction === "incoming");
  const outgoing = requests.filter((r) => r.direction === "outgoing");

  return (
    <section className="space-y-6">
      <header>
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
            <FriendsIcon className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Amis</h1>
            <p className="text-sm text-muted">
              Ajoutez des joueurs et suivez leurs pronostics.
            </p>
          </div>
        </div>
      </header>

      <FriendSearch />

      {incoming.length > 0 && (
        <div>
          <SectionTitle>Demandes reçues</SectionTitle>
          <ul className="space-y-2">
            {incoming.map((r) => (
              <li key={r.id}>
                <RequestRow request={r} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <SectionTitle>Demandes envoyées</SectionTitle>
          <ul className="space-y-2">
            {outgoing.map((r) => (
              <li key={r.id}>
                <RequestRow request={r} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <SectionTitle>
          Mes amis{friends.length > 0 ? ` · ${friends.length}` : ""}
        </SectionTitle>
        {friends.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
            Vous n&apos;avez pas encore d&apos;amis. Recherchez un joueur pour
            l&apos;ajouter.
          </p>
        ) : (
          <ul className="space-y-2">
            {friends.map((f) => (
              <li key={f.id}>
                <FriendRow friend={f} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
      {children}
    </h2>
  );
}

/** Identity cell (avatar + colored name + title + badge), links to the profile. */
function IdentityCell({
  username,
  avatarUrl,
  equippedFrame,
  equippedColor,
  equippedTitle,
  equippedBadge,
  subtitle,
}: {
  username: string;
  avatarUrl?: string;
  equippedFrame?: string | null;
  equippedColor: string | null;
  equippedTitle: string | null;
  equippedBadge: string | null;
  subtitle?: string;
}) {
  return (
    <Link
      href={`/joueur/${username}`}
      className="flex min-w-0 flex-1 items-center gap-3"
    >
      <UserAvatar
        username={username}
        avatarUrl={avatarUrl}
        className={`size-10 rounded-full border bg-surface-2 text-sm font-semibold ${
          frameRing(equippedFrame) || "border-border"
        }`}
      />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className={`truncate font-medium ${nameColor(equippedColor)}`}>
            {username}
          </span>
          {equippedBadge && BADGE_META[equippedBadge] && (
            <span aria-hidden>{BADGE_META[equippedBadge].emoji}</span>
          )}
        </span>
        {subtitle ? (
          <span className="block text-xs text-faint">{subtitle}</span>
        ) : (
          titleText(equippedTitle) && (
            <span className="block text-xs text-faint">
              {titleText(equippedTitle)}
            </span>
          )
        )}
      </span>
    </Link>
  );
}

function RequestRow({ request: r }: { request: FriendRequest }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <IdentityCell
        username={r.username}
        avatarUrl={r.avatarUrl}
        equippedColor={r.equippedColor}
        equippedTitle={r.equippedTitle}
        equippedBadge={r.equippedBadge}
      />
      <RelationButton
        userId={r.id}
        relation={r.direction === "incoming" ? "pending_in" : "pending_out"}
      />
    </div>
  );
}

function FriendRow({ friend: f }: { friend: FriendSummary }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <IdentityCell
        username={f.username}
        avatarUrl={f.avatarUrl}
        equippedFrame={f.equippedFrame}
        equippedColor={f.equippedColor}
        equippedTitle={f.equippedTitle}
        equippedBadge={f.equippedBadge}
        subtitle={`Niveau ${f.level} · ${f.lifetimePoints} pts`}
      />
      <RemoveButton userId={f.id} />
    </div>
  );
}
