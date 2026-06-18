import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getCurrentUser,
  getGroup,
  getGroupOwnedItems,
  getGroupPot,
} from "@/lib/data";
import { CoinIcon } from "../../../_components/icons";
import { GroupCosmeticsManager } from "../../_components/group-cosmetics-manager";

export default async function GroupSettingsPage(
  props: PageProps<"/groupes/[groupId]/parametres">,
) {
  const { groupId } = await props.params;

  const [me, group] = await Promise.all([getCurrentUser(), getGroup(groupId)]);
  if (!me) redirect("/login");
  if (!group) notFound();
  // Owner-only page.
  if (group.ownerId !== me.id) notFound();

  const [items, pot] = await Promise.all([
    getGroupOwnedItems(groupId),
    getGroupPot(groupId),
  ]);

  return (
    <section>
      <Link
        href={`/groupes/${group.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        ← {group.name}
      </Link>

      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Paramètres du groupe
          </h1>
          <p className="text-sm text-muted">
            Équipe les cosmétiques achetés avec la cagnotte.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-gradient-to-br from-accent/15 to-accent/5 px-3 py-1.5 font-mono text-sm font-semibold tabular-nums text-accent">
          <CoinIcon className="size-4" />
          {(pot?.balance ?? 0).toLocaleString("fr-FR")}
        </span>
      </header>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          Ce groupe ne possède aucun cosmétique. Rends-toi dans la boutique,
          section « Cosmétiques de groupes », pour en acheter avec la cagnotte.
        </p>
      ) : (
        <GroupCosmeticsManager
          groupId={group.id}
          groupName={group.name}
          items={items}
        />
      )}
    </section>
  );
}
