"use client";

import { useState, useTransition } from "react";
import type { GroupShopItem, OwnedGroupPot } from "@/lib/domain/types";
import { groupBg, groupIcon, groupTitle } from "@/lib/domain/group-cosmetics";
import { CoinIcon, LockIcon } from "../../_components/icons";
import { useToast } from "../../_components/toast";
import { purchaseGroupItem } from "../actions";

export function GroupShopSection({
  groups,
  catalogs,
}: {
  groups: OwnedGroupPot[];
  /** Catalog (with per-group owned flags) keyed by group id. */
  catalogs: Record<string, GroupShopItem[]>;
}) {
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const group = groups.find((g) => g.id === groupId) ?? groups[0];
  const items = catalogs[group?.id ?? ""] ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Dépensés depuis la cagnotte — réservé au propriétaire.
        </p>
        <div className="flex items-center gap-2">
          <select
            value={group?.id ?? ""}
            onChange={(e) => setGroupId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-gradient-to-br from-accent/15 to-accent/5 px-3 py-1.5 font-mono text-sm font-semibold tabular-nums text-accent">
            <CoinIcon className="size-4" />
            {(group?.potBalance ?? 0).toLocaleString("fr-FR")}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          Aucun cosmétique de groupe disponible.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <GroupItemCard
              key={item.key}
              item={item}
              groupId={group!.id}
              pot={group?.potBalance ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupItemCard({
  item,
  groupId,
  pot,
}: {
  item: GroupShopItem;
  groupId: string;
  pot: number;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const affordable = pot >= item.price;
  const missing = Math.max(0, item.price - pot);

  const buy = () =>
    start(async () => {
      const r = await purchaseGroupItem(groupId, item.key);
      toast({ type: r.ok ? "success" : "error", message: r.message });
    });

  return (
    <div
      className={`flex flex-col rounded-xl border bg-surface p-4 ${
        item.owned ? "border-accent/50" : "border-border"
      }`}
    >
      <div className="mb-2 flex items-center justify-end">
        {item.owned && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">
            Possédé
          </span>
        )}
      </div>

      <GroupPreview item={item} />

      <div className="mt-3 min-w-0 flex-1">
        <div className="text-sm font-semibold">{item.name}</div>
        {item.description && (
          <p className="mt-0.5 text-xs text-muted">{item.description}</p>
        )}
      </div>

      <div className="mt-3">
        {item.owned ? (
          <div className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-center text-xs font-medium text-faint">
            Dans le groupe
          </div>
        ) : affordable ? (
          <button
            type="button"
            onClick={buy}
            disabled={pending}
            className="press flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-50"
          >
            <CoinIcon className="size-4" />
            {item.price}
          </button>
        ) : (
          <div
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-faint"
            title={`Il manque ${missing} pièces dans la cagnotte`}
          >
            <LockIcon className="size-3.5" />
            Manque {missing}
          </div>
        )}
      </div>
    </div>
  );
}

/** Small visual preview of a group cosmetic. */
function GroupPreview({ item }: { item: GroupShopItem }) {
  if (item.kind === "group_bg") {
    return (
      <div
        className={`flex h-12 items-center justify-center rounded-lg border border-border ${groupBg(item.key)}`}
      >
        <span className="text-xs font-medium text-muted">Aa</span>
      </div>
    );
  }
  if (item.kind === "group_icon") {
    return (
      <div className="flex h-12 items-center justify-center">
        <span aria-hidden className="text-3xl leading-none">
          {groupIcon(item.key) || "🏳️"}
        </span>
      </div>
    );
  }
  return (
    <div className="flex h-12 items-center justify-center">
      <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
        {groupTitle(item.key) || item.name}
      </span>
    </div>
  );
}
