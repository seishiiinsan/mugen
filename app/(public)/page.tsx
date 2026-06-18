import type { ReactNode } from "react";
import Link from "next/link";
import { SCORING_RULES } from "@/lib/domain/scoring";
import {
  BadgeIcon,
  BellIcon,
  CrownIcon,
  FriendsIcon,
  GroupsIcon,
  LockIcon,
  PredictionsIcon,
  RankingIcon,
  ShopIcon,
} from "@/app/(app)/_components/icons";
import { BOOSTS, BOOST_TYPES } from "@/lib/domain/boosts";
import { Hero } from "./_landing/hero";
import { Reveal, RevealGroup, RevealItem, ScoreBar } from "./_landing/reveal";

const STEPS = [
  {
    Icon: PredictionsIcon,
    title: "Pronostique",
    text: "Avant le coup d'envoi, donne le score exact que tu vois tomber.",
  },
  {
    Icon: CrownIcon,
    title: "Marque des points",
    text: "Score exact, bon vainqueur, bon écart : chaque justesse rapporte.",
  },
  {
    Icon: RankingIcon,
    title: "Grimpe au classement",
    text: "Un classement mondial remis à zéro chaque mois. Le top 50 est récompensé.",
  },
];

const PODIUM = [
  { tier: 1, label: "2e", h: "h-24", color: "text-silver", bg: "bg-silver/10" },
  { tier: 0, label: "1er", h: "h-32", color: "text-gold", bg: "bg-gold/10" },
  { tier: 2, label: "3e", h: "h-20", color: "text-bronze", bg: "bg-bronze/10" },
];

const BADGES = [
  "Premier score exact",
  "25 buteurs trouvés",
  "10 amis",
  "Garde-robe garnie",
  "Podium du mois",
];

const SOCIAL = [
  {
    Icon: FriendsIcon,
    title: "Ajoute tes amis",
    text: "Cherche un joueur par pseudo, envoie une demande, et suis sa progression.",
  },
  {
    Icon: GroupsIcon,
    title: "Profils publics",
    text: "Visite un profil : niveau, statistiques, succès et pronostics à venir.",
  },
  {
    Icon: LockIcon,
    title: "Confidentialité à la carte",
    text: "Choisis qui voit tes pronos, tes stats, tes succès et ta liste d'amis.",
  },
  {
    Icon: BellIcon,
    title: "Notifications",
    text: "Une cloche t'avertit des demandes d'amis reçues et acceptées.",
  },
];

const MATCH_FEATURES = [
  {
    emoji: "⚽",
    title: "Compositions",
    text: "Le terrain à la vraie formation (4-4-2, 4-2-3-1…), titulaires et bancs des deux équipes.",
  },
  {
    emoji: "⏱️",
    title: "Faits de match",
    text: "Une frise des buts et cartons, minute par minute, des deux côtés.",
  },
  {
    emoji: "📊",
    title: "Statistiques",
    text: "Possession, tirs, xG, classement du championnat et confrontations passées.",
  },
  {
    emoji: "🎯",
    title: "Détail des points",
    text: "Score + boost + buteurs : tout est décomposé une fois le match terminé.",
  },
];

const GROUP_FEATURES = [
  {
    emoji: "🌐",
    title: "Privés ou publics",
    text: "Un code d'invitation pour les intimes, ou un groupe public que tout le monde peut rejoindre.",
  },
  {
    emoji: "🪙",
    title: "Cagnotte commune",
    text: "Chacun dépose ses pièces ; le solde est remboursé au prorata si tu quittes le groupe.",
  },
  {
    emoji: "🎨",
    title: "Cosmétiques de groupe",
    text: "Le propriétaire dépense la cagnotte en fonds, icônes et titres réservés au groupe.",
  },
];

const COMPARISON = {
  without: [
    "Des pronos éparpillés sur des groupes de messagerie",
    "Aucun classement officiel ni historique",
    "Le score exact ? Trop dur, jamais valorisé",
    "Zéro enjeu, zéro récompense",
  ],
  with: [
    "Tous tes pronostics réunis au même endroit",
    "Un classement mondial remis à zéro chaque mois",
    "Un barème qui récompense la précision",
    "Des boosts et un podium récompensé",
  ],
};

const FAQ = [
  {
    q: "C'est gratuit ?",
    a: "Oui, totalement. Tu pronostiques et tu grimpes au classement sans rien payer.",
  },
  {
    q: "Comment je marque des points ?",
    a: "Score exact = 10 pts. Le bon vainqueur ou le bon écart rapportent aussi. Tu peux en plus désigner les buteurs pour grappiller des points bonus. Plus tu es précis, plus tu marques.",
  },
  {
    q: "Quand le classement est-il remis à zéro ?",
    a: "Le 1er de chaque mois. Tout le monde repart à égalité pour viser le podium.",
  },
  {
    q: "C'est quoi les boosts ?",
    a: "Des power-ups mensuels : Points ×2, Double chance et Banco. Un de chaque par mois, à jouer au bon moment.",
  },
  {
    q: "Quels matchs puis-je pronostiquer ?",
    a: "Les grands championnats et compétitions, mis à jour chaque jour.",
  },
];

/** Full-width section band with a hairline separator + alternating fill. */
function Band({
  children,
  alt = false,
}: {
  children: ReactNode;
  alt?: boolean;
}) {
  return (
    <section
      className={`border-t border-border ${alt ? "bg-surface-2" : "bg-background"}`}
    >
      <div className="mx-auto w-full max-w-5xl px-6 py-20">{children}</div>
    </section>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-faint">
      {children}
    </div>
  );
}

function Check() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="mt-0.5 size-4 shrink-0 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 10.5l3.5 3.5L16 5.5" />
    </svg>
  );
}

function Cross() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="mt-0.5 size-4 shrink-0 text-faint"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l8 8M14 6l-8 8" />
    </svg>
  );
}

function barFor(points: number): string {
  if (points === 10) return "bg-accent";
  if (points === 6) return "bg-accent/70";
  if (points === 4) return "bg-accent/55";
  if (points === 3) return "bg-accent/45";
  if (points === 2) return "bg-accent/30";
  return "bg-border-strong";
}

export default function Home() {
  return (
    <>
      <Hero />

      {/* How it works */}
      <Band alt>
        <Reveal className="mx-auto max-w-xl text-center">
          <Eyebrow>Comment ça marche</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Trois gestes, un objectif
          </h2>
          <p className="mt-3 text-muted">
            Le plus simple des jeux de pronostics. La plus exigeante des
            précisions.
          </p>
        </Reveal>

        <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ Icon, title, text }, i) => (
            <RevealItem
              key={title}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                  <Icon className="size-5" />
                </span>
                <span className="font-mono text-sm text-faint">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {title}
              </h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </Band>

      {/* Why Mugen — without / with */}
      <Band>
        <Reveal className="mx-auto max-w-xl text-center">
          <Eyebrow>Pourquoi Mugen</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Le prono, version sérieuse
          </h2>
          <p className="mt-3 text-muted">
            La précision récompensée, le classement qui compte vraiment.
          </p>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          <Reveal className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="text-sm font-medium uppercase tracking-wide text-faint">
              Sans Mugen
            </h3>
            <ul className="mt-4 space-y-3">
              {COMPARISON.without.map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-3 text-sm text-muted"
                >
                  <Cross />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal
            delay={0.1}
            className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-6"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wide text-accent">
              Avec Mugen
            </h3>
            <ul className="mt-4 space-y-3">
              {COMPARISON.with.map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-3 text-sm text-foreground"
                >
                  <Check />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Band>

      {/* Boosts */}
      <Band alt>
        <Reveal className="mx-auto max-w-xl text-center">
          <Eyebrow>Boosts</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Des boosts pour changer la donne
          </h2>
          <p className="mt-3 text-muted">
            Un de chaque par mois. À dégainer au bon moment, sur le bon match.
          </p>
        </Reveal>

        <RevealGroup className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
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
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-faint">
                1 par mois
              </p>
            </RevealItem>
          ))}
        </RevealGroup>
      </Band>

      {/* Match experience */}
      <Band>
        <Reveal className="mx-auto max-w-xl text-center">
          <Eyebrow>Chaque match</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Vis le match en entier
          </h2>
          <p className="mt-3 text-muted">
            Compositions, faits de match, stats — et le détail de tes points une
            fois le coup de sifflet final donné.
          </p>
        </Reveal>

        <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MATCH_FEATURES.map(({ emoji, title, text }) => (
            <RevealItem
              key={title}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-xl">
                {emoji}
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {title}
              </h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </Band>

      {/* Scoring */}
      <Band alt>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <Eyebrow>Le barème</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Un barème qui récompense la justesse
            </h2>
            <p className="mt-3 max-w-md text-muted">
              Le score exact vaut le maximum. Mais même un bon vaincu ou le bon
              écart te font marquer. Rien n&apos;est jamais perdu.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <ul className="space-y-3.5 rounded-2xl border border-border bg-surface p-6">
              {SCORING_RULES.map((rule) => (
                <li key={rule.label} className="flex items-center gap-4">
                  <span className="w-40 shrink-0 truncate text-sm text-muted">
                    {rule.label}
                  </span>
                  <ScoreBar pct={(rule.points / 10) * 100} barClass={barFor(rule.points)} />
                  <span className="w-12 shrink-0 text-right font-mono text-sm font-semibold tabular-nums">
                    {rule.points}
                    <span className="ml-0.5 text-xs font-normal text-faint">
                      pt
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Band>

      {/* Podium / rewards */}
      <Band>
        <Reveal className="mx-auto max-w-xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.06] px-3 py-1 text-xs font-medium text-gold">
            <CrownIcon className="size-4" />
            Le top 50 récompensé chaque mois
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            Vise le podium mondial
          </h2>
          <p className="mt-3 text-muted">
            Chaque mois, le classement repart de zéro. Tout le monde a sa chance
            de monter sur la boîte.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mx-auto mt-12 flex max-w-md items-end gap-3">
          {PODIUM.map((p) => (
            <div key={p.label} className="flex flex-1 flex-col items-center">
              {p.tier === 0 && (
                <CrownIcon className="mb-1 size-6 text-gold" />
              )}
              <div
                className={`grid size-12 place-items-center rounded-full ${p.bg} text-lg font-bold ${p.color}`}
              >
                {p.tier + 1}
              </div>
              <div
                className={`mt-3 flex w-full ${p.h} items-start justify-center rounded-t-xl border-x border-t border-border bg-surface pt-3 text-sm font-bold ${p.color}`}
              >
                {p.label}
              </div>
            </div>
          ))}
        </Reveal>
      </Band>

      {/* Rewards · cosmetics · badges */}
      <Band alt>
        <Reveal className="mx-auto max-w-xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/[0.06] px-3 py-1 text-xs font-medium text-accent">
            <span className="size-1.5 rounded-full bg-accent" />
            Disponible maintenant
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            Bien plus que des points
          </h2>
          <p className="mt-3 text-muted">
            Pièces, niveaux, succès, boutique : chaque pronostic nourrit ta
            progression et ta collection.
          </p>
        </Reveal>

        <RevealGroup className="mt-12 grid gap-4 lg:grid-cols-3">
          {/* Badges — wide */}
          <RevealItem className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                <BadgeIcon className="size-5" />
              </span>
              <h3 className="text-lg font-semibold tracking-tight">Badges</h3>
            </div>
            <p className="mt-3 text-sm text-muted">
              Des hauts faits sur cinq thèmes — pronostics, buteurs, amis,
              cosmétiques, dépenses — chacun avec son badge et son taux de
              réussite.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {BADGES.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted"
                >
                  <BadgeIcon className="size-3.5 text-accent" />
                  {b}
                </span>
              ))}
            </div>
          </RevealItem>

          {/* Cosmetics */}
          <RevealItem className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                <ShopIcon className="size-5" />
              </span>
              <h3 className="text-lg font-semibold tracking-tight">
                Cosmétiques
              </h3>
            </div>
            <p className="mt-3 text-sm text-muted">
              Personnalise ton profil : cadres d&apos;avatar, couleurs de pseudo,
              titres et badges à débloquer dans la boutique.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <span className="size-10 rounded-full bg-surface-2 ring-2 ring-accent/40" />
              <span className="size-10 rounded-full bg-surface-2 ring-2 ring-gold/50" />
              <span className="size-10 rounded-full bg-gradient-to-br from-accent to-accent-strong" />
              <span className="grid size-10 place-items-center rounded-full border-2 border-dashed border-border-strong text-faint">
                +
              </span>
            </div>
          </RevealItem>

          {/* Rewards — wide */}
          <RevealItem className="rounded-2xl border border-gold/30 bg-gold/[0.05] p-6 lg:col-span-3">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                    <CrownIcon className="size-5" />
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight">
                    Récompenses du podium
                  </h3>
                </div>
                <p className="mt-3 max-w-md text-sm text-muted">
                  Chaque fin de mois, le top 50 mondial repart avec des pièces —
                  et le podium décroche en plus un badge exclusif. Le compteur
                  des récompenses repart à zéro avec le classement.
                </p>
              </div>
              <ul className="flex shrink-0 gap-2">
                {[
                  { r: "1er", c: "text-gold", b: "border-gold/40" },
                  { r: "2e", c: "text-silver", b: "border-silver/40" },
                  { r: "3e", c: "text-bronze", b: "border-bronze/40" },
                ].map((p) => (
                  <li
                    key={p.r}
                    className={`grid size-14 place-items-center rounded-xl border bg-surface font-bold tabular-nums ${p.b} ${p.c}`}
                  >
                    {p.r}
                  </li>
                ))}
              </ul>
            </div>
          </RevealItem>
        </RevealGroup>
      </Band>

      {/* Friends / social */}
      <Band>
        <Reveal className="mx-auto max-w-xl text-center">
          <Eyebrow>Amis</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Plus fort à plusieurs
          </h2>
          <p className="mt-3 text-muted">
            Ajoute tes potes, comparez vos pronostics et gardez un œil sur qui
            mène la danse.
          </p>
        </Reveal>

        <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SOCIAL.map(({ Icon, title, text }) => (
            <RevealItem
              key={title}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {title}
              </h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </Band>

      {/* Groups */}
      <Band alt>
        <Reveal className="mx-auto max-w-xl text-center">
          <Eyebrow>Groupes</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Formez vos équipes
          </h2>
          <p className="mt-3 text-muted">
            Un classement privé en plus du mondial, une cagnotte commune et des
            cosmétiques rien que pour le groupe.
          </p>
        </Reveal>

        <RevealGroup className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
          {GROUP_FEATURES.map(({ emoji, title, text }) => (
            <RevealItem
              key={title}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-xl">
                {emoji}
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {title}
              </h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </Band>

      {/* FAQ */}
      <Band>
        <Reveal className="mx-auto max-w-2xl">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Questions fréquentes
          </h2>
          <ul className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <li key={item.q}>
                <details className="group rounded-xl border border-border bg-surface">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span className="text-lg leading-none text-faint transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="px-4 pb-4 text-sm text-muted">{item.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </Reveal>
      </Band>

      {/* Final CTA */}
      <Band alt>
        <Reveal className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent/[0.10] via-surface to-surface p-10 text-center sm:p-16">
          <h2 className="mx-auto max-w-xl text-3xl font-bold tracking-tight sm:text-5xl">
            Le coup d&apos;envoi est imminent.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted">
            Crée ton compte en quelques secondes et place ton premier pronostic
            dès ce soir.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="press rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong"
            >
              Rejoindre la partie
            </Link>
            <Link
              href="/wiki"
              className="press rounded-lg border border-border bg-surface px-8 py-3.5 text-sm font-semibold transition-colors hover:border-border-strong"
            >
              Lire le wiki
            </Link>
          </div>
        </Reveal>
      </Band>
    </>
  );
}
