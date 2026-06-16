import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getMyAchievementKeys,
  getMyBadges,
  getMyLevel,
} from "@/lib/data";
import { ACHIEVEMENTS } from "@/lib/domain/economy";
import { BADGE_META } from "@/lib/domain/cosmetics";
import { ChevronLeftIcon, CoinIcon } from "../_components/icons";
import { BadgePicker } from "./_components/badge-picker";

export default async function SuccesPage() {
  const [me, level, badges, achievementKeys] = await Promise.all([
    getCurrentUser(),
    getMyLevel(),
    getMyBadges(),
    getMyAchievementKeys(),
  ]);
  if (!me) redirect("/login");

  const unlocked = new Set(achievementKeys);
  const pct = Math.round((level.current / level.needed) * 100);
  const done = ACHIEVEMENTS.filter((a) => unlocked.has(a.key)).length;

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

      {/* Badge showcase */}
      <div>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
          Vitrine — badge affiché sur le profil
        </h2>
        <BadgePicker owned={badges} equipped={me.equippedBadge} />
      </div>

      {/* Achievements */}
      <div>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
          Succès
        </h2>
        <ul className="space-y-2">
          {ACHIEVEMENTS.map((a) => {
            const ok = unlocked.has(a.key);
            const meta = a.badge ? BADGE_META[a.badge] : null;
            return (
              <li
                key={a.key}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  ok ? "border-accent/30 bg-accent/[0.05]" : "border-border bg-surface"
                }`}
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-full text-lg ${
                    ok ? "bg-accent/10" : "bg-surface-2 opacity-40 grayscale"
                  }`}
                  aria-hidden
                >
                  {meta?.emoji ?? "⭐"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${ok ? "" : "text-muted"}`}>
                    {a.name}
                  </div>
                  <div className="text-xs text-faint">{a.description}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
                  {ok ? (
                    <span className="font-semibold text-accent">Débloqué ✓</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums text-faint">
                      <CoinIcon className="size-3.5" />+{a.coins}
                    </span>
                  )}
                  <span className="font-mono tabular-nums text-faint">+{a.xp} XP</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
