import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getPlayerStats } from "@/lib/data";
import { ChevronLeftIcon } from "../_components/icons";
import { StatsDashboard } from "./_components/stats-dashboard";

export default async function MesStatsPage() {
  const [me, stats] = await Promise.all([getCurrentUser(), getPlayerStats()]);
  if (!me) redirect("/login");

  return (
    <section className="space-y-5">
      <Link
        href="/profil"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" />
        Profil
      </Link>

      <header>
        <h1 className="text-xl font-semibold tracking-tight">
          Mon profil de pronostiqueur
        </h1>
        <p className="text-sm text-muted">Ce que tes pronostics disent de toi.</p>
      </header>

      {!stats || stats.overall.settled === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          Pas encore de pronostic réglé. Reviens ici une fois tes premiers
          matchs terminés — ton tableau de bord apparaîtra ici.
        </p>
      ) : (
        <StatsDashboard stats={stats} />
      )}
    </section>
  );
}
