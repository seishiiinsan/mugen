"use client";

import { useTransition } from "react";
import type { GroupCosmeticKind, GroupOwnedItem } from "@/lib/domain/types";
import { groupBg, groupIcon, groupTitle } from "@/lib/domain/group-cosmetics";
import { useToast } from "../../_components/toast";
import { equipGroupItem } from "../actions";

const SLOTS: { kind: GroupCosmeticKind; slot: string; label: string }[] = [
  { kind: "group_bg", slot: "bg", label: "Fonds" },
  { kind: "group_icon", slot: "icon", label: "Icônes" },
  { kind: "group_title", slot: "title", label: "Titres" },
];

export function GroupCosmeticsManager({
  groupId,
  groupName,
  items,
}: {
  groupId: string;
  groupName: string;
  items: GroupOwnedItem[];
}) {
  const equippedBg = items.find((i) => i.kind === "group_bg" && i.equipped)?.key;
  const equippedIcon = items.find(
    (i) => i.kind === "group_icon" && i.equipped,
  )?.key;
  const equippedTitle = items.find(
    (i) => i.kind === "group_title" && i.equipped,
  )?.key;

  return (
    <div className="space-y-6">
      {/* Live preview of the group's current look (owner-only surface). */}
      <div
        className={`flex items-center gap-3 rounded-xl border border-border p-4 ${groupBg(equippedBg) || "bg-surface"}`}
      >
        <span aria-hidden className="text-3xl leading-none">
          {groupIcon(equippedIcon) || "👥"}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-semibold">{groupName}</h2>
            {groupTitle(equippedTitle) && (
              <span className="shrink-0 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                {groupTitle(equippedTitle)}
              </span>
            )}
          </div>
          <p className="text-xs text-faint">Aperçu (visible par toi seul)</p>
        </div>
      </div>

      {SLOTS.map(({ kind, slot, label }) => {
        const owned = items.filter((i) => i.kind === kind);
        return (
          <div key={kind}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
              {label}
            </h3>
            {owned.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted">
                Aucun cosmétique de ce type — achète-en dans la boutique.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {owned.map((item) => (
                  <ManagerCard
                    key={item.key}
                    item={item}
                    groupId={groupId}
                    slot={slot}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ManagerCard({
  item,
  groupId,
  slot,
}: {
  item: GroupOwnedItem;
  groupId: string;
  slot: string;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();

  const toggle = () =>
    start(async () => {
      const r = await equipGroupItem(
        groupId,
        slot,
        item.equipped ? null : item.key,
      );
      toast({ type: r.ok ? "success" : "error", message: r.message });
    });

  return (
    <div
      className={`flex flex-col rounded-xl border bg-surface p-4 ${
        item.equipped ? "border-accent/50" : "border-border"
      }`}
    >
      <Preview item={item} />
      <div className="mt-3 min-w-0 flex-1">
        <div className="text-sm font-semibold">{item.name}</div>
        {item.description && (
          <p className="mt-0.5 text-xs text-muted">{item.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`press mt-3 w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
          item.equipped
            ? "border-accent bg-accent/10 text-accent"
            : "border-border hover:border-border-strong"
        }`}
      >
        {pending ? "…" : item.equipped ? "Retirer" : "Équiper"}
      </button>
    </div>
  );
}

function Preview({ item }: { item: GroupOwnedItem }) {
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
