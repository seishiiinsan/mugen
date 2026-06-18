import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getAchievementRates,
  getCurrentUser,
  getMyAchievementKeys,
  getMyLevel,
} from "@/lib/data";
import { ACHIEVEMENTS } from "@/lib/domain/economy";
import { ChevronLeftIcon } from "../_components/icons";
import { AchievementsList } from "./achievements-list";

export default async function SuccesPage() {
  const [me, level, achievementKeys, rateMap] = await Promise.all([
    getCurrentUser(),
    getMyLevel(),
    getMyAchievementKeys(),
    getAchievementRates(),
  ]);
  if (!me) redirect("/login");

  const unlocked = new Set(achievementKeys);
  const pct = Math.round((level.current / level.needed) * 100);
  const done = ACHIEVEMENTS.filter((a) => unlocked.has(a.key)).length;
  const rates: Record<string, number> = {};
  for (const [key, r] of rateMap) rates[key] = r.pct;

  return (
    <section className="space-y-6">
      <Link
        href="/profil"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" />
        Profil
      </Link>

      {/* Level */}
      <header className="rounded-xl border border-border bg-gradient-to-br from-accent/[0.08] via-surface to-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-faint">
              Niveau
            </div>
            <div className="font-mono text-3xl font-bold tabular-nums">
              {level.level}
            </div>
          </div>
          <div className="text-right text-xs text-muted">
            <div className="font-mono tabular-nums">{level.total} XP au total</div>
            <div className="text-faint">
              {done}/{ACHIEVEMENTS.length} succès
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 text-right font-mono text-xs tabular-nums text-faint">
            {level.current} / {level.needed} XP → niv. {level.level + 1}
          </div>
        </div>
      </header>

      {/* Achievements — tabbed by theme */}
      <div>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
          Succès
        </h2>
        <AchievementsList unlockedKeys={achievementKeys} rates={rates} />
      </div>
    </section>
  );
}
