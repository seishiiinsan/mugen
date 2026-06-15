import { redirect } from "next/navigation";
import { getCurrentUser, getMyMonthlyStats } from "@/lib/data";
import { SCORING_RULES } from "@/lib/domain/scoring";
import { signOut } from "@/app/login/actions";

export default async function ProfilPage() {
  const [me, stats] = await Promise.all([
    getCurrentUser(),
    getMyMonthlyStats(),
  ]);
  if (!me) redirect("/login");

  const joined = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(me.joinedAt));

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-surface-2 text-2xl font-bold">
          {me.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{me.username}</h1>
          <p className="text-sm text-muted capitalize">Membre depuis {joined}</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Points du mois" value={stats.points} />
        <Stat
          label="Classement"
          value={stats.rank != null ? `#${stats.rank}` : "—"}
        />
        <Stat label="Scores exacts" value={stats.exactScores} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Barème des points
        </h2>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {SCORING_RULES.map((rule) => (
            <li
              key={rule.label}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div>
                <div className="text-sm font-medium">{rule.label}</div>
                <div className="text-xs text-muted">{rule.example}</div>
              </div>
              <span className="shrink-0 font-semibold tabular-nums text-accent">
                {rule.points} pts
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs text-muted">
        Statistiques détaillées, badges et boutique cosmétique : phase 2.
      </p>

      <form action={signOut}>
        <button
          type="submit"
          className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-muted transition-colors hover:text-danger"
        >
          Se déconnecter
        </button>
      </form>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
