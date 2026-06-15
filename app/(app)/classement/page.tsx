import { redirect } from "next/navigation";
import { getCurrentUser, getMonthlyLeaderboard } from "@/lib/data";

function rankColor(rank: number, points: number): string {
  if (points <= 0) return "text-faint";
  if (rank === 1) return "text-gold";
  if (rank === 2) return "text-silver";
  if (rank === 3) return "text-bronze";
  return "text-muted";
}

export default async function ClassementPage() {
  const [leaderboard, me] = await Promise.all([
    getMonthlyLeaderboard(),
    getCurrentUser(),
  ]);
  if (!me) redirect("/login");

  const month = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <section>
      <h1 className="mb-1 text-xl font-semibold tracking-tight">
        Classement mondial
      </h1>
      <p className="mb-5 text-sm text-muted">
        <span className="capitalize">{month}</span> · remise à zéro le 1er du mois
      </p>

      {leaderboard.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          Aucun joueur pour le moment.
        </p>
      ) : (
        <ol className="space-y-2">
          {leaderboard.map((entry) => {
            const isMe = entry.userId === me.id;
            return (
              <li
                key={entry.userId}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  isMe ? "border-accent/40 bg-accent/[0.06]" : "border-border bg-surface"
                }`}
              >
                <span
                  className={`w-7 shrink-0 text-center font-mono text-sm font-semibold tabular-nums ${rankColor(entry.rank, entry.points)}`}
                >
                  {entry.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{entry.username}</span>
                    {isMe && (
                      <span className="shrink-0 text-xs text-accent">vous</span>
                    )}
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
          })}
        </ol>
      )}

      <p className="mt-6 text-center text-xs text-faint">
        Les groupes privés entre amis arriveront en phase 2.
      </p>
    </section>
  );
}
