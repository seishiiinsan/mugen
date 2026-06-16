import { redirect } from "next/navigation";
import {
  canClaimDaily,
  getCurrentUser,
  getMyGrantedItems,
  getShopItems,
} from "@/lib/data";
import { DAILY_BONUS } from "@/lib/domain/economy";
import type { ShopItem } from "@/lib/domain/types";
import { CoinIcon, ShopIcon } from "../_components/icons";
import { DailyBonus } from "./_components/daily-bonus";
import { ShopItemCard } from "./_components/shop-item-card";

const SECTIONS: { kind: ShopItem["kind"]; label: string }[] = [
  { kind: "frame", label: "Cadres d'avatar" },
  { kind: "color", label: "Couleurs de pseudo" },
  { kind: "title", label: "Titres" },
];

export default async function BoutiquePage() {
  const [me, items, claimable, granted] = await Promise.all([
    getCurrentUser(),
    getShopItems(),
    canClaimDaily(),
    getMyGrantedItems(),
  ]);
  if (!me) redirect("/login");

  return (
    <section>
      <header className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
            <ShopIcon className="size-5" />
          </span>
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight">Boutique</h1>
            <p className="text-sm text-muted">
              Cosmétiques uniquement — aucun avantage en jeu.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-gradient-to-br from-accent/15 to-accent/5 px-3 py-1.5 font-mono text-sm font-semibold tabular-nums text-accent">
            <CoinIcon className="size-4" />
            {me.coins}
          </span>
        </div>
      </header>

      <div className="mb-6">
        <DailyBonus claimable={claimable} amount={DAILY_BONUS} />
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          Catalogue indisponible.
        </p>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map(({ kind, label }) => {
            const group = items.filter((i) => i.kind === kind);
            if (group.length === 0) return null;
            return (
              <div key={kind}>
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
                  {label}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {group.map((item) => (
                    <ShopItemCard key={item.key} item={item} balance={me.coins} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {granted.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-faint">
            Objets reçus
          </h2>
          <p className="mb-2 text-xs text-faint">
            Récompenses spéciales — non vendables, à toi de les équiper.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {granted.map((item) => (
              <ShopItemCard key={item.key} item={item} balance={me.coins} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
