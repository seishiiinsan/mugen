import { redirect } from "next/navigation";
import {
  getCoinsLeaderboard,
  getCurrentUser,
  getMonthlyChampions,
  getMonthlyLeaderboard,
  getXpLeaderboard,
} from "@/lib/data";
import { CrownIcon } from "../_components/icons";
import { ClassementTabs } from "./_components/classement-tabs";

export default async function ClassementPage() {
  const [monthly, coins, xp, champions, me] = await Promise.all([
    getMonthlyLeaderboard(),
    getCoinsLeaderboard(),
    getXpLeaderboard(),
    getMonthlyChampions(),
    getCurrentUser(),
  ]);
  if (!me) redirect("/login");

  const month = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <section>
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/10 text-gold">
            <CrownIcon className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Classement mondial
            </h1>
            <p className="text-sm text-muted">
              Plusieurs façons de viser le sommet.
            </p>
          </div>
        </div>
      </header>

      <ClassementTabs
        monthly={monthly}
        coins={coins}
        xp={xp}
        champions={champions}
        meId={me.id}
        monthLabel={month}
      />
    </section>
  );
}
