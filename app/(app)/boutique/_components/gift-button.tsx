"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { FriendSummary } from "@/lib/domain/types";
import { CoinIcon, GiftIcon } from "../../_components/icons";
import { UserAvatar } from "../../_components/user-avatar";
import { useToast } from "../../_components/toast";
import { giftItem } from "../actions";

/** Gift a cosmetic to a friend: a popover that picks who receives it. */
export function GiftButton({
  itemKey,
  itemName,
  price,
  friends,
  friendOwned = {},
}: {
  itemKey: string;
  itemName: string;
  price: number;
  friends: FriendSummary[];
  friendOwned?: Record<string, string[]>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const gift = (friendId: string) =>
    start(async () => {
      const r = await giftItem(friendId, itemKey);
      toast({ type: r.ok ? "success" : "error", message: r.message });
      if (r.ok) setOpen(false);
    });

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Offrir « ${itemName} » à un ami`}
        aria-expanded={open}
        className={`press grid size-9 place-items-center rounded-lg border transition-colors ${
          open
            ? "border-accent bg-accent/10 text-accent"
            : "border-border text-muted hover:border-border-strong hover:text-accent"
        }`}
      >
        <GiftIcon className="size-4" />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-20 mb-2 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-xs text-muted">
            <span className="min-w-0 truncate">
              Offrir{" "}
              <span className="font-medium text-foreground">{itemName}</span>
            </span>
            <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-mono font-semibold tabular-nums text-accent">
              <CoinIcon className="size-3.5" />
              {price}
            </span>
          </div>
          <ul className="max-h-60 overflow-y-auto p-1">
            {friends.map((f) => {
              const owns = (friendOwned[f.id] ?? []).includes(itemKey);
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    disabled={pending || owns}
                    onClick={() => gift(f.id)}
                    title={owns ? "Possède déjà cet article" : undefined}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors enabled:hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <UserAvatar
                      username={f.username}
                      avatarUrl={f.avatarUrl}
                      className="size-7 rounded-full border border-border bg-surface-2 text-xs font-semibold"
                    />
                    <span className="truncate">{f.username}</span>
                    {owns && (
                      <span className="ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wide text-faint">
                        déjà possédé
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
