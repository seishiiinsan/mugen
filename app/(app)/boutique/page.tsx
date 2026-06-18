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
import type { GroupShopItem } from "@/lib/domain/types";
import { DAILY_BONUS } from "@/lib/domain/economy";
import { CoinIcon, ShopIcon } from "../_components/icons";
import { DailyBonus } from "./_components/daily-bonus";
import { GroupShopSection } from "./_components/group-shop-section";
import { ShopTabs } from "./_components/shop-tabs";

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

  const tabs = [
    {
      id: "frame",
      label: "Cadres",
      items: items.filter((i) => i.kind === "frame"),
    },
    {
      id: "color",
      label: "Couleurs",
      items: items.filter((i) => i.kind === "color"),
    },
    {
      id: "title",
      label: "Titres",
      items: items.filter((i) => i.kind === "title"),
    },
    // Everything the player owns, every kind included (badges, granted rewards…).
    ...(owned.length > 0
      ? [{ id: "owned", label: "Possédés", items: owned }]
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

      <ShopTabs
        tabs={tabs}
        balance={me.coins}
        friends={friends}
        friendOwned={friendOwned}
      />

      {ownedGroups.length > 0 && (
        <GroupShopSection groups={ownedGroups} catalogs={groupCatalogs} />
      )}
    </section>
  );
}
