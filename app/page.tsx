import Link from "next/link";
import { SCORING_RULES } from "@/lib/domain/scoring";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-6 py-20 text-center">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">Mugen</h1>
          <p className="mx-auto max-w-md text-lg text-muted">
            Pronostiquez le <strong className="text-foreground">score exact</strong>{" "}
            de tous les matchs de football et grimpez dans le classement mondial
            mensuel.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/matchs"
            className="rounded-full bg-accent-strong px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent"
          >
            Voir les matchs
          </Link>
          <Link
            href="/classement"
            className="rounded-full border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-surface"
          >
            Classement
          </Link>
        </div>

        <section className="w-full max-w-md text-left">
          <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-muted">
            Le barème
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {SCORING_RULES.map((rule) => (
              <li
                key={rule.label}
                className="flex items-center justify-between gap-3 p-3 text-sm"
              >
                <span>{rule.label}</span>
                <span className="shrink-0 font-semibold tabular-nums text-accent">
                  {rule.points} pts
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
