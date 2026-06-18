import { redirect } from "next/navigation";
import {
  canClaimDaily,
  getCurrentUser,
  getFriendsOwnedItems,
  getGroupShopItems,
  getMyFriends,
  getMyOwnedItems,
  getOwnedGroupsWithPot,
  getShopItems,
} from "@/lib/data";
import type { GroupShopItem, ShopItem } from "@/lib/domain/types";
import { DAILY_BONUS } from "@/lib/domain/economy";
import { CoinIcon, ShopIcon } from "../_components/icons";
import { DailyBonus } from "./_components/daily-bonus";
import { GroupShopSection } from "./_components/group-shop-section";
import { OwnedTabs } from "./_components/owned-tabs";
import { ShopGrid } from "./_components/shop-grid";
import { ShopTabs, type ShopTab } from "./_components/shop-tabs";

export default async function BoutiquePage() {
  const [me, items, claimable, owned, friends, friendOwned, ownedGroups] =
    await Promise.all([
      getCurrentUser(),
      getShopItems(),
      canClaimDaily(),
      getMyOwnedItems(),
      getMyFriends(),
      getFriendsOwnedItems(),
      getOwnedGroupsWithPot(),
    ]);
  if (!me) redirect("/login");

  // Group-cosmetic catalogs (per owned group: same items, group-specific owned
  // flags). Only owners can spend a pot, so the selector lists owned groups.
  const groupCatalogs: Record<string, GroupShopItem[]> = Object.fromEntries(
    await Promise.all(
      ownedGroups.map(
        async (g) => [g.id, await getGroupShopItems(g.id)] as const,
      ),
    ),
  );

  const grid = (kind: ShopItem["kind"]) => {
    const list = items.filter((i) => i.kind === kind);
    return {
      count: list.length,
      content: (
        <ShopGrid
          items={list}
          balance={me.coins}
          friends={friends}
          friendOwned={friendOwned}
        />
      ),
    };
  };

  const tabs: ShopTab[] = [
    { id: "frame", label: "Cadres", ...grid("frame") },
    { id: "color", label: "Couleurs", ...grid("color") },
    { id: "title", label: "Titres", ...grid("title") },
    // Cosmétiques de groupe — entre « Titres » et « Possédés », owners seulement.
    ...(ownedGroups.length > 0
      ? [
          {
            id: "group",
            label: "Cosmétiques de groupes",
            content: (
              <GroupShopSection groups={ownedGroups} catalogs={groupCatalogs} />
            ),
          } satisfies ShopTab,
        ]
      : []),
    // Tout ce que le joueur possède, trié par type via des sous-onglets.
    ...(owned.length > 0
      ? [
          {
            id: "owned",
            label: "Possédés",
            count: owned.length,
            content: (
              <OwnedTabs
                items={owned}
                balance={me.coins}
                friends={friends}
                friendOwned={friendOwned}
              />
            ),
          } satisfies ShopTab,
        ]
      : []),
  ];

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

      <ShopTabs tabs={tabs} />
    </section>
  );
}
