import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { POINTS, SCORING_RULES } from "@/lib/domain/scoring";
import { BOOSTS, BOOST_TYPES } from "@/lib/domain/boosts";
import {
  ACHIEVEMENTS,
  COINS_PER_POINT,
  DAILY_BONUS,
  XP_PER_POINT,
  levelFromXp,
  monthlyRewardCoins,
} from "@/lib/domain/economy";
import {
  BadgeIcon,
  CoinIcon,
  CrownIcon,
  GroupsIcon,
  PredictionsIcon,
  RankingIcon,
  ShopIcon,
} from "@/app/(app)/_components/icons";
import { Reveal, RevealGroup, RevealItem, ScoreBar } from "../_landing/reveal";
import { WikiToc } from "./_components/wiki-toc";
import { ScoringPlayground } from "./_components/scoring-playground";

export const metadata: Metadata = {
  title: "Wiki · Mugen",
  description:
    "Toutes les règles de Mugen : barème, boosts, classement mensuel, pièces, niveaux, succès et groupes privés.",
};

const SECTIONS = [
  { id: "principe", label: "Le principe" },
  { id: "pronostiquer", label: "Pronostiquer" },
  { id: "bareme", label: "Le barème" },
  { id: "boosts", label: "Les boosts" },
  { id: "classement", label: "Classement mensuel" },
  { id: "economie", label: "Pièces & boutique" },
  { id: "niveaux", label: "Niveaux & XP" },
  { id: "succes", label: "Succès & badges" },
  { id: "groupes", label: "Groupes privés" },
];

function barFor(points: number): string {
  if (points === 10) return "bg-accent";
  if (points === 6) return "bg-accent/70";
  if (points === 4) return "bg-accent/55";
  if (points === 3) return "bg-accent/45";
  if (points === 2) return "bg-accent/30";
  return "bg-border-strong";
}

function Section({
  id,
  icon,
  eyebrow,
  title,
  children,
}: {
  id: string;
  icon: ReactNode;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <Reveal>
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
            {icon}
          </span>
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-faint">
              {eyebrow}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          </div>
        </div>
        <div className="mt-5">{children}</div>
      </Reveal>
    </section>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">{children}</div>
  );
}

const LEVEL_SAMPLES = [2, 5, 10, 20].map((lvl) => {
  // XP needed to *reach* the start of `lvl` is sum_{k=1..lvl-1} 100·k.
  const total = Array.from({ length: lvl - 1 }, (_, i) => 100 * (i + 1)).reduce(
    (a, b) => a + b,
    0,
  );
  const l = levelFromXp(total);
  return { level: l.level, total, perPoint: total / XP_PER_POINT };
});

export default function WikiPage() {
  return (
    <div className="px-6 pb-20 pt-28 sm:pt-32">
      {/* Header */}
      <Reveal className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          <span className="size-1.5 rounded-full bg-accent" />
          Le guide complet
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
          Comment jouer à Mugen
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Le score exact, le barème, les boosts, le classement, l&apos;économie.
          Tout ce qu&apos;il faut pour viser le sommet.
        </p>
      </Reveal>

      <div className="mx-auto mt-16 grid w-full max-w-5xl gap-12 lg:grid-cols-[200px_1fr]">
        {/* Sticky TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <WikiToc sections={SECTIONS} />
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0 space-y-16">
          <Section
            id="principe"
            icon={<PredictionsIcon className="size-5" />}
            eyebrow="Bases"
            title="Le principe"
          >
            <Card>
              <p className="text-muted">
                Mugen est un jeu de pronostics football. Avant chaque match, tu
                annonces le <strong className="text-foreground">score exact</strong>{" "}
                que tu vois tomber. Plus ton pronostic est précis, plus tu marques
                de points. Les points alimentent un{" "}
                <strong className="text-foreground">classement mondial</strong>{" "}
                remis à zéro chaque mois, et te rapportent des{" "}
                <strong className="text-foreground">pièces</strong> à dépenser en
                cosmétiques. Aucun avantage compétitif ne s&apos;achète : tout est
                purement décoratif.
              </p>
            </Card>
          </Section>

          <Section
            id="pronostiquer"
            icon={<PredictionsIcon className="size-5" />}
            eyebrow="Règles"
            title="Pronostiquer"
          >
            <RevealGroup className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  t: "Avant le coup d'envoi",
                  d: "Un pronostic se pose tant que le match n'a pas commencé. Tu peux le modifier jusqu'au coup d'envoi.",
                },
                {
                  t: "Le mois en cours",
                  d: "Seuls les matchs du mois calendaire courant sont pronosticables. Chaque mois ouvre une nouvelle page.",
                },
                {
                  t: "Score sur 90 minutes",
                  d: "Le résultat de référence est celui à la fin du temps réglementaire — prolongations et tirs au but exclus.",
                },
              ].map((x) => (
                <RevealItem
                  key={x.t}
                  className="rounded-2xl border border-border bg-surface p-5"
                >
                  <h3 className="font-semibold">{x.t}</h3>
                  <p className="mt-1.5 text-sm text-muted">{x.d}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </Section>

          <Section
            id="bareme"
            icon={<CrownIcon className="size-5" />}
            eyebrow="Points"
            title="Le barème"
          >
            <Card>
              <ul className="space-y-3.5">
                {SCORING_RULES.map((rule) => (
                  <li key={rule.label} className="flex items-center gap-4">
                    <span className="w-44 shrink-0 text-sm text-muted">
                      {rule.label}
                      <span className="block text-xs text-faint">
                        {rule.example}
                      </span>
                    </span>
                    <ScoreBar
                      pct={(rule.points / POINTS.EXACT) * 100}
                      barClass={barFor(rule.points)}
                    />
                    <span className="w-12 shrink-0 text-right font-mono text-sm font-semibold tabular-nums">
                      {rule.points}
                      <span className="ml-0.5 text-xs font-normal text-faint">
                        pt
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="mt-6">
              <ScoringPlayground />
            </div>
          </Section>

          <Section
            id="boosts"
            icon={<span className="text-lg">⚡</span>}
            eyebrow="Power-ups"
            title="Les boosts"
          >
            <p className="-mt-2 mb-5 text-muted">
              Un de chaque par mois, jamais cumulables. À dégainer sur le bon
              match.
            </p>
            <RevealGroup className="grid gap-4 sm:grid-cols-3">
              {BOOST_TYPES.map((t) => (
                <RevealItem
                  key={t}
                  className="rounded-2xl border border-border bg-surface p-6 text-center"
                >
                  <div className="mx-auto grid size-12 place-items-center rounded-full bg-accent/10 text-2xl">
                    {BOOSTS[t].emoji}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">
                    {BOOSTS[t].name}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{BOOSTS[t].rule}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </Section>

          <Section
            id="classement"
            icon={<RankingIcon className="size-5" />}
            eyebrow="Compétition"
            title="Classement mensuel"
          >
            <Card>
              <p className="text-muted">
                Le classement mondial repart de zéro le 1ᵉʳ de chaque mois. Tout
                le monde recommence à égalité. En fin de mois, les meilleurs
                repartent avec des pièces :
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[1, 2, 3, 10, 50].map((rank) => (
                  <div
                    key={rank}
                    className="rounded-xl border border-border bg-surface-2/50 p-3 text-center"
                  >
                    <div className="text-xs font-medium uppercase tracking-wide text-faint">
                      {rank <= 3 ? `${rank}ᵉ` : `Top ${rank}`}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 font-mono text-lg font-bold tabular-nums text-accent">
                      <CoinIcon className="size-4" />
                      {monthlyRewardCoins(rank)}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-faint">
                Le podium reçoit en plus un badge exclusif (or / argent / bronze)
                qui marque le mois remporté.
              </p>
            </Card>
          </Section>

          <Section
            id="economie"
            icon={<ShopIcon className="size-5" />}
            eyebrow="Monnaie"
            title="Pièces & boutique"
          >
            <RevealGroup className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  t: "Gagne en jouant",
                  d: `Chaque point marqué rapporte ${COINS_PER_POINT} pièce${COINS_PER_POINT > 1 ? "s" : ""}. Plus tu pronostiques juste, plus ta cagnotte grossit.`,
                },
                {
                  t: "Bonus quotidien",
                  d: `Reviens chaque jour pour récupérer ${DAILY_BONUS} pièces. Une fois par jour, à ne pas oublier.`,
                },
                {
                  t: "Dépense en cosmétiques",
                  d: "Cadres d'avatar, couleurs de pseudo, titres, badges. Quatre raretés, du commun au légendaire. Zéro avantage en jeu.",
                },
              ].map((x) => (
                <RevealItem
                  key={x.t}
                  className="rounded-2xl border border-border bg-surface p-5"
                >
                  <h3 className="font-semibold">{x.t}</h3>
                  <p className="mt-1.5 text-sm text-muted">{x.d}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </Section>

          <Section
            id="niveaux"
            icon={<span className="text-lg">✦</span>}
            eyebrow="Progression"
            title="Niveaux & XP"
          >
            <Card>
              <p className="text-muted">
                Chaque point marqué te rapporte aussi{" "}
                <strong className="text-foreground">{XP_PER_POINT} XP</strong>, et
                les succès en ajoutent. Plus tu montes, plus le palier suivant
                demande d&apos;XP — la progression ralentit en douceur.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {LEVEL_SAMPLES.map((s) => (
                  <div
                    key={s.level}
                    className="rounded-xl border border-border bg-surface-2/50 p-3 text-center"
                  >
                    <div className="text-xs font-medium uppercase tracking-wide text-faint">
                      Niveau {s.level}
                    </div>
                    <div className="mt-1 font-mono text-lg font-bold tabular-nums">
                      {s.total.toLocaleString("fr")}
                      <span className="ml-1 text-xs font-normal text-faint">
                        XP
                      </span>
                    </div>
                    <div className="text-[11px] text-faint">
                      ≈ {Math.round(s.perPoint).toLocaleString("fr")} pts
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Section>

          <Section
            id="succes"
            icon={<BadgeIcon className="size-5" />}
            eyebrow="Hauts faits"
            title="Succès & badges"
          >
            <p className="-mt-2 mb-5 text-muted">
              Des objectifs débloqués automatiquement au fil de tes pronostics.
              Chacun rapporte pièces et XP, et souvent un badge à exhiber.
            </p>
            <RevealGroup className="grid gap-3 sm:grid-cols-2">
              {ACHIEVEMENTS.map((a) => (
                <RevealItem
                  key={a.key}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-semibold">
                      {a.badge && <BadgeIcon className="size-4 text-accent" />}
                      {a.name}
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{a.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums text-accent">
                      <CoinIcon className="size-3.5" />
                      {a.coins}
                    </div>
                    <div className="text-[11px] text-faint">+{a.xp} XP</div>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </Section>

          <Section
            id="groupes"
            icon={<GroupsIcon className="size-5" />}
            eyebrow="Entre amis"
            title="Groupes privés"
          >
            <Card>
              <p className="text-muted">
                Crée un groupe, partage son code d&apos;invitation, et compare-toi
                à tes amis dans un classement mensuel privé — en plus du classement
                mondial. Le créateur gère le groupe ; chacun pronostique
                normalement, les points comptent partout.
              </p>
            </Card>
          </Section>

          {/* CTA */}
          <Reveal className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent/[0.10] via-surface to-surface p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Prêt à viser le score exact ?
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/login"
                className="press rounded-lg bg-accent px-8 py-3 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong"
              >
                Créer mon compte
              </Link>
              <Link
                href="/matchs"
                className="press rounded-lg border border-border bg-surface px-8 py-3 text-sm font-semibold transition-colors hover:border-border-strong"
              >
                Voir les matchs
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
