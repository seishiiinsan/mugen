import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProfileOverview, getUserUpcomingPredictions } from "@/lib/data";
import { ACHIEVEMENTS, levelFromXp, XP_PER_POINT } from "@/lib/domain/economy";
import {
  BADGE_META,
  frameRing,
  nameColor,
  titleText,
} from "@/lib/domain/cosmetics";
import type { Relation, VisibilityValue } from "@/lib/domain/types";
import { ChevronLeftIcon, LockIcon } from "../../_components/icons";
import { TeamCrest } from "../../_components/team-crest";
import { formatMatchDay, formatTime } from "@/lib/ui/format";
import {
  BlockButton,
  RelationButton,
  UnblockButton,
} from "../../amis/_components/social-buttons";

const ACH_NAME = new Map(ACHIEVEMENTS.map((a) => [a.key, a.name]));

const canSee = (v: VisibilityValue, rel: Relation) =>
  rel === "self" || v === "everyone" || (v === "friends" && rel === "friends");

export async function generateMetadata(
  props: PageProps<"/joueur/[username]">,
): Promise<Metadata> {
  const { username } = await props.params;
  const overview = await getProfileOverview(decodeURIComponent(username));
  if (!overview) return { title: "Joueur · Mugen" };

  const title = `${overview.username} · Mugen`;
  const description = `Profil de ${overview.username} sur Mugen — pronostics, succès et niveau.`;
  return {
    title,
    description,
    openGraph: {
      type: "profile",
      url: `/joueur/${overview.username}`,
      title,
      description,
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublicProfilePage(
  props: PageProps<"/joueur/[username]">,
) {
  const { username } = await props.params;
  const name = decodeURIComponent(username);

  const overview = await getProfileOverview(name);
  if (!overview) notFound();

  const isSelf = overview.relation === "self";
  const showStats = canSee(overview.visibility.stats, overview.relation);
  const showAchievements = canSee(
    overview.visibility.achievements,
    overview.relation,
  );
  const showFriends = canSee(overview.visibility.friends, overview.relation);
  const showPredictions = canSee(
    overview.visibility.predictions,
    overview.relation,
  );

  const upcoming =
    !overview.blocked && showPredictions
      ? await getUserUpcomingPredictions(overview.id)
      : [];

  const achievementKeys = overview.achievementKeys ?? [];
  const achXp = ACHIEVEMENTS.filter((a) => achievementKeys.includes(a.key)).reduce(
    (sum, a) => sum + a.xp,
    0,
  );
  const level =
    overview.lifetimePoints != null
      ? levelFromXp(overview.lifetimePoints * XP_PER_POINT + achXp).level
      : null;

  const joined = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(overview.joinedAt));

  return (
    <section className="space-y-6">
      <Link
        href="/amis"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" />
        Amis
      </Link>

      {/* Identity hero */}
      <header className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-accent/[0.08] via-surface to-surface p-5">
        <div className="flex items-center gap-4">
          <div
            className={`relative size-16 shrink-0 overflow-hidden rounded-full bg-surface ring-2 ${
              frameRing(overview.equippedFrame) || "ring-accent/30"
            }`}
          >
            {overview.avatarUrl ? (
              <Image
                src={overview.avatarUrl}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <span className="grid size-full place-items-center text-2xl font-bold">
                {overview.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1
                className={`truncate text-2xl font-bold tracking-tight ${nameColor(overview.equippedColor)}`}
              >
                {overview.username}
              </h1>
              {overview.equippedBadge && BADGE_META[overview.equippedBadge] && (
                <span
                  title={BADGE_META[overview.equippedBadge].label}
                  aria-hidden
                >
                  {BADGE_META[overview.equippedBadge].emoji}
                </span>
              )}
            </div>
            {titleText(overview.equippedTitle) && (
              <span className="mt-0.5 inline-block rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                {titleText(overview.equippedTitle)}
              </span>
            )}
            <p className="mt-1 text-sm text-muted">Membre depuis {joined}</p>
          </div>

          <div className="shrink-0 self-start">
            {isSelf ? (
              <Link
                href="/profil"
                className="press inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-2"
              >
                Mon profil
              </Link>
            ) : overview.blocked ? (
              <UnblockButton userId={overview.id} />
            ) : (
              <span className="flex items-center gap-1.5">
                <RelationButton userId={overview.id} relation={overview.relation} />
                <BlockButton userId={overview.id} />
              </span>
            )}
          </div>
        </div>
      </header>

      {overview.blocked ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-faint">
          <LockIcon className="size-4 shrink-0" />
          Tu as bloqué ce joueur. Débloque-le pour revoir son profil.
        </div>
      ) : (
        <>
        {/* Stats */}
        {showStats ? (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Points cumulés" value={overview.lifetimePoints ?? 0} accent />
            <Stat label="Scores exacts" value={overview.exactScores ?? 0} />
            <Stat label="Niveau" value={level ?? 1} />
          </div>
        ) : (
          <Private label="Statistiques privées" />
        )}

        {/* Friends count */}
        {showFriends ? (
          <div className="rounded-xl border border-border bg-surface p-4">
            <span className="font-mono text-lg font-bold tabular-nums">
              {overview.friendCount ?? 0}
            </span>{" "}
            <span className="text-sm text-muted">
              ami{(overview.friendCount ?? 0) > 1 ? "s" : ""}
            </span>
          </div>
        ) : (
          <Private label="Liste d'amis privée" />
        )}

        {/* Achievements */}
        {showAchievements ? (
          achievementKeys.length > 0 ? (
            <div>
              <SectionTitle>Succès · {achievementKeys.length}</SectionTitle>
              <ul className="flex flex-wrap gap-1.5">
                {achievementKeys.map((key) => (
                  <li
                    key={key}
                    className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted"
                  >
                    {ACH_NAME.get(key) ?? key}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div>
              <SectionTitle>Succès</SectionTitle>
              <p className="text-sm text-faint">Aucun succès débloqué.</p>
            </div>
          )
        ) : (
          <Private label="Succès privés" />
        )}

        {/* Upcoming predictions */}
        {showPredictions ? (
          <div>
            <SectionTitle>Pronostics à venir</SectionTitle>
            {upcoming.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
                Aucun pronostic à venir.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((p) => (
                  <li
                    key={p.fixtureId}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Side name={p.homeTeam} logo={p.homeLogo} />
                      <Side name={p.awayTeam} logo={p.awayLogo} />
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="rounded-md bg-accent/10 px-1.5 py-0.5 font-mono text-sm font-semibold tabular-nums text-accent">
                        {p.homeGoals}-{p.awayGoals}
                      </span>
                      <div className="mt-1 text-[11px] text-faint">
                        {formatMatchDay(p.kickoff)} · {formatTime(p.kickoff)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <Private label="Pronostics privés" />
        )}
        </>
      )}
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

function Side({ name, logo }: { name: string; logo?: string }) {
  return (
    <div className="flex items-center gap-2">
      <TeamCrest name={name} logoUrl={logo} />
      <span className="truncate text-sm">{name}</span>
    </div>
  );
}

function Private({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-faint">
      <LockIcon className="size-4 shrink-0" />
      {label}
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
        className={`font-mono text-2xl font-bold tabular-nums ${accent ? "text-accent" : ""}`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-faint">{label}</div>
    </div>
  );
}
