import { redirect } from "next/navigation";
import { getCurrentUser, getMyMonthlyStats, getMySeason } from "@/lib/data";
import { CoinIcon, SeasonIcon } from "../_components/icons";
import { SeasonPass } from "./_components/season-pass";

export default async function SaisonPage() {
  const [me, season, stats] = await Promise.all([
    getCurrentUser(),
    getMySeason(),
    getMyMonthlyStats(),
  ]);
  if (!me) redirect("/login");

  const reached = season.tiers.filter((t) => t.reached).length;

  const monthLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <section>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
            <SeasonIcon className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Pass saisonnier
            </h1>
            <p className="text-sm text-muted">
              Joue ce mois-ci, débloque des paliers, réclame tes récompenses.
            </p>
          </div>
        </div>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-sm font-semibold tabular-nums text-accent">
          <CoinIcon className="size-4" />
          {me.coins.toLocaleString("fr-FR")}
        </span>
      </header>

      <div aria-label="Ton mois en chiffres" className="mb-5">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
          Ton mois en chiffres
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <RecapTile
            label="Points"
            value={stats.points.toLocaleString("fr-FR")}
          />
          <RecapTile label="Rang" value={stats.rank ? `#${stats.rank}` : "—"} />
          <RecapTile label="Scores exacts" value={String(stats.exactScores)} />
          <RecapTile
            label="Paliers"
            value={`${reached}/${season.tiers.length}`}
          />
        </div>
      </div>

      <SeasonPass season={season} monthLabel={monthLabel} />
    </section>
  );
}

function RecapTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 text-center">
      <div className="font-mono text-lg font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}
